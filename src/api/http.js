/* Shared HTTP helper — the single place the app talks to the InsuraLens backend.

   Base URL comes from VITE_API_URL (e.g. https://…onrender.com/api) and falls
   back to the older VITE_API_BASE_URL (origin only). The trailing `/api` is
   stripped so every call site can keep its `/api/…` path unchanged.

   Auth is automatic: with no stored token the first request opens a backend
   session (POST /auth/demo) and stores the JWT, and a 401 clears it and
   re-authenticates once. Server-sent events, <img> tags, and PDF viewers
   cannot set an Authorization header, so withToken()/fileUrl() append
   `?token=` instead.

   Error contract (docs/API_CONTRACT.md): every failure surfaced to the UI is
   an ApiError with `status` (0 for transport failures), `code`, and `message`.
   Render's free tier sleeps when idle, so requests carry a generous timeout
   and a "server is waking up" message rather than hanging forever. */

const TOKEN_KEY = 'insuralens_token'

/** Generous ceiling — a cold Render instance can need ~60s to boot. */
const REQUEST_TIMEOUT_MS = 45_000

const RAW_BASE = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? ''

/** Base URL of the backend origin — no trailing slash, no `/api`. */
export const API_BASE_URL = String(RAW_BASE)
  .replace(/\/+$/, '')
  .replace(/\/api$/, '')

/* Token storage — the backend session issues it, request() attaches it. Guarded
   so importing api modules in non-browser contexts can never throw. */
export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* Storage unavailable (private mode, SSR) — token simply won't persist. */
  }
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* See setToken. */
  }
}

/**
 * Append `?token=` to a backend URL for a request that cannot carry an
 * Authorization header (EventSource, <img>, <iframe>/<embed> PDFs).
 *
 * @param {string} url an absolute backend URL
 * @returns {string} the same URL with the JWT query parameter when one exists
 */
export function withToken(url) {
  const token = getToken()
  if (!token) return url
  return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
}

/** Absolute URL for a backend path, ready for <img src> or a PDF viewer. */
export function fileUrl(path) {
  return withToken(`${API_BASE_URL}${path}`)
}

/** Normalized error: every failure the UI sees has { status, code, message }. */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, code?: string, details?: unknown }} [info]
   */
  constructor(message, { status = 0, code = 'unknown_error', details = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

/**
 * POST /auth/demo outside of request(): this is how a session token is
 * obtained when none is stored, so it must not itself demand a token or retry
 * on 401 (that would recurse). The endpoint is a real backend route that
 * issues a browser session without credentials.
 *
 * @returns {Promise<string>} the session JWT
 */
async function fetchSessionToken() {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/demo`, { method: 'POST' })
  } catch (cause) {
    throw new ApiError(
      'Could not reach the server. If it has been idle it may be waking up — Render free instances take up to a minute.',
      { status: 0, code: 'network_error', details: cause },
    )
  }

  if (!response.ok) {
    throw new ApiError('The server could not start a session. Please try again.', {
      status: response.status,
      code: `http_${response.status}`,
    })
  }

  const data = await response.json()
  const token = data?.token ?? data?.accessToken ?? data?.access_token
  if (token) setToken(token)
  return token ?? null
}

/** Shared promise so concurrent first requests open only one session. */
let sessionAuthInFlight = null

/**
 * Make sure a token is available, opening a backend session on demand.
 *
 * @returns {Promise<string | null>} the current token
 */
export function ensureToken() {
  const existing = getToken()
  if (existing) return Promise.resolve(existing)
  if (!sessionAuthInFlight) {
    sessionAuthInFlight = fetchSessionToken().finally(() => {
      sessionAuthInFlight = null
    })
  }
  return sessionAuthInFlight
}

/** One network round-trip with a timeout; maps failures to ApiError. */
async function send(url, method, headers, payload, externalSignal, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const onAbort = () => controller.abort()

  if (externalSignal) {
    if (externalSignal.aborted) controller.abort()
    else externalSignal.addEventListener('abort', onAbort, { once: true })
  }

  try {
    return await fetch(url, { method, headers, body: payload, signal: controller.signal })
  } catch (cause) {
    /* The caller cancelled deliberately — keep the original AbortError so
       React-style cleanups stay quiet. */
    if (externalSignal?.aborted) throw cause
    if (controller.signal.aborted) {
      throw new ApiError(
        'The server is taking a while to respond. Render free instances sleep when idle and can need up to a minute to wake up — please try again.',
        { status: 0, code: 'timeout', details: cause },
      )
    }
    if (import.meta.env.DEV) {
      console.warn('[http] network_error:', cause?.name, cause?.message, cause)
    }
    throw new ApiError(
      'Could not reach the server. Check your connection and try again.',
      { status: 0, code: 'network_error', details: cause },
    )
  } finally {
    clearTimeout(timer)
    externalSignal?.removeEventListener?.('abort', onAbort)
  }
}

/** Build the request URL from the base plus any query parameters. */
function buildUrl(path, query) {
  let url = `${API_BASE_URL}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  if (qs) url += `?${qs}`
  return url
}

/**
 * JSON request with bearer auth — base URL + query building, Authorization
 * header when a token is stored, JSON bodies unless FormData is passed, and
 * non-2xx responses converted to ApiError using the server's error envelope
 * (`{ error: { code, message, details } }`, falling back to status text).
 *
 * Auth handling: a request with no stored token opens a backend session first,
 * and a 401 clears the token, re-authenticates, and retries once.
 *
 * @param {string} path e.g. '/api/claims'
 * @param {{ method?: string, body?: unknown, query?: Record<string, string | number | undefined>, headers?: Record<string, string>, signal?: AbortSignal, retries?: number, as?: 'auto' | 'blob', timeoutMs?: number }} [options]
 * @returns {Promise<any>}
 */
export async function request(
  path,
  {
    method = 'GET',
    body,
    query,
    headers = {},
    signal,
    retries = 1,
    as = 'auto',
    timeoutMs = REQUEST_TIMEOUT_MS,
  } = {},
) {
  /* Auth endpoints are excluded: they are how a token is obtained, so they must
     never auto-authenticate or retry — that would recurse. */
  const isAuthPath = path.startsWith('/api/auth/')

  if (!isAuthPath) await ensureToken()

  /** @type {Record<string, string>} */
  const requestHeaders = { ...headers }
  const token = getToken()
  if (token) requestHeaders.Authorization = `Bearer ${token}`

  let payload
  if (body instanceof FormData) {
    payload = body /* fetch sets the multipart boundary itself. */
  } else if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const response = await send(buildUrl(path, query), method, requestHeaders, payload, signal, timeoutMs)

  /* 401 → the stored token expired or was revoked. Drop it, open a fresh
     session, and retry the same request exactly once. */
  if (response.status === 401 && !isAuthPath && retries > 0) {
    clearToken()
    await ensureToken()
    return request(path, {
      method,
      body,
      query,
      headers,
      signal,
      retries: retries - 1,
      as,
      timeoutMs,
    })
  }

  if (!response.ok) {
    let envelope = null
    try {
      envelope = await response.json()
    } catch {
      /* Non-JSON error body — status text is all we have. */
    }
    throw new ApiError(envelope?.error?.message ?? response.statusText ?? 'Request failed', {
      status: response.status,
      code: envelope?.error?.code ?? `http_${response.status}`,
      details: envelope?.error?.details ?? null,
    })
  }

  if (response.status === 204) return null
  if (as === 'blob') return response.blob()
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return response.text()
  return response.json()
}
