/* Auth API — the sign-in call behind the login form.

   Mock mode: any work email is accepted, the password must be the demo
   password from src/mocks/auth.ts; a wrong password rejects with a 401
   ApiError so the form can show "Incorrect email or password", exactly as
   the prototype behaves today. Nothing is stored — the token helpers in
   ./http.js stay unused until a real backend issues credentials. */

import { ApiError, delay } from './http'
import { DEMO_PASSWORD, DEMO_SESSION } from '../mocks/auth'

/** Simulated network latency for mock responses (ms). */
const MOCK_DELAY_MS = 150

/**
 * POST /api/auth/login — exchange credentials for a session.
 *
 * @param {string} email work email (mock accepts any well-formed address)
 * @param {string} password
 * @returns {Promise<import('../mocks/auth').DemoSession>}
 * @throws {ApiError} 401 invalid_credentials when the password is wrong
 */
export async function login(email, password) {
  await delay(MOCK_DELAY_MS)
  /* TODO(backend): return request('/api/auth/login', {
       method: 'POST', body: { email, password } })
     — then persist the returned token with setToken() from ./http.js. */
  void email /* no identity provider behind the demo. */
  if (password !== DEMO_PASSWORD) {
    throw new ApiError('Incorrect email or password', {
      status: 401,
      code: 'invalid_credentials',
    })
  }
  return DEMO_SESSION
}

/**
 * GET /api/auth/me — the current session's user, for headers and
 * role-gated UI once sessions exist.
 *
 * @returns {Promise<import('../mocks/auth').DemoUser>}
 */
export async function getCurrentUser() {
  await delay(MOCK_DELAY_MS)
  /* TODO(backend): return request('/api/auth/me') with the bearer token */
  return DEMO_SESSION.user
}

/**
 * POST /api/auth/logout — end the session and clear the stored token.
 *
 * @returns {Promise<void>}
 */
export async function logout() {
  await delay(MOCK_DELAY_MS)
  /* TODO(backend): await request('/api/auth/logout', { method: 'POST' }) */
  return undefined
}
