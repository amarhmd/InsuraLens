/* Shared HTTP helper — the single place the app will talk to the backend.

   NOT WIRED UP YET: VITE_API_BASE_URL is empty in the prototype and every
   function in src/api/ currently resolves mock data from src/mocks/ with a
   small simulated delay. `request()` below is the seam the backend engineer
   switches on: point VITE_API_BASE_URL at the server (see .env.example),
   replace the mock bodies with `await request('/api/…')`, and token handling
   plus the error envelope apply everywhere at once.

   Error contract (also documented in docs/API_CONTRACT.md): every failure
   surfaced to the UI is an ApiError with `status` (HTTP status, 0 for
   transport failures), `code` (stable machine-readable string), and
   `message` (human-readable). */

const TOKEN_KEY = 'insuralens_token'

/** Base URL of the backend, e.g. https://api.insuralens.example (no /api). */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/* Token storage — kept unused until a real backend issues tokens. Guarded
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
 * JSON request with bearer auth — base URL + query building, Authorization
 * header when a token is stored, JSON bodies unless FormData is passed, and
 * non-2xx responses converted to ApiError using the server's error envelope
 * (`{ error: { code, message, details } }`, falling back to status text).
 *
 * @param {string} path e.g. '/api/claims'
 * @param {{ method?: string, body?: unknown, query?: Record<string, string | number | undefined>, headers?: Record<string, string>, signal?: AbortSignal }} [options]
 * @returns {Promise<any>}
 */
export async function request(path, { method = 'GET', body, query, headers = {}, signal } = {}) {
  let url = `${API_BASE_URL}${path}`
  if (query) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params.set(key, String(value))
    }
    const qs = params.toString()
    if (qs) url += `?${qs}`
  }

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

  let response
  try {
    response = await fetch(url, { method, headers: requestHeaders, body: payload, signal })
  } catch (cause) {
    throw new ApiError('Could not reach the server. Check your connection and try again.', {
      status: 0,
      code: 'network_error',
      details: cause,
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
  return response.json()
}

/** Small pause used by the mock-backed api functions (simulated latency). */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
