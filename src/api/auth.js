/* Authentication API backed by the deployed InsuraLens server.

   Live mode: login / getCurrentUser / logout / loginDemo call the backend and
   store the JWT via http.js. Set VITE_USE_DEMO=true to accept the built-in
   demo credentials in src/mocks/auth.ts instead. */

import { USE_DEMO, delay, request, setToken, clearToken } from './http'
import { DEMO_PASSWORD, DEMO_SESSION } from '../mocks/auth'

/** Simulated latency in demo mode (ms). */
const MOCK_DELAY_MS = 200

function unpackSession(res) {
  return res?.session ?? res?.data ?? res
}

export async function login(email, password) {
  if (USE_DEMO) {
    await delay(MOCK_DELAY_MS)
    if (password !== DEMO_PASSWORD) throw new Error('Invalid email or password.')
    setToken(DEMO_SESSION.token)
    return { ...DEMO_SESSION, user: { ...DEMO_SESSION.user, email: email || DEMO_SESSION.user.email } }
  }

  const res = unpackSession(
    await request('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  )
  const token = res?.token ?? res?.accessToken ?? res?.access_token
  if (token) setToken(token)
  return res
}

export async function getCurrentUser() {
  if (USE_DEMO) {
    await delay(MOCK_DELAY_MS)
    return DEMO_SESSION.user
  }
  const res = await request('/api/auth/me')
  return res?.user ?? res?.data ?? res
}

export async function logout() {
  if (USE_DEMO) {
    await delay(MOCK_DELAY_MS)
    clearToken()
    return
  }
  try {
    await request('/api/auth/logout', { method: 'POST' })
  } finally {
    clearToken()
  }
}

/**
 * POST /auth/demo — open a demo session without credentials. Returns the user;
 * the JWT is stored by http.js.
 */
export async function loginDemo() {
  if (USE_DEMO) {
    await delay(MOCK_DELAY_MS)
    setToken(DEMO_SESSION.token)
    return DEMO_SESSION.user
  }

  const res = unpackSession(await request('/api/auth/demo', { method: 'POST' }))
  const token = res?.token ?? res?.accessToken ?? res?.access_token
  if (token) setToken(token)
  return res?.user ?? res
}
