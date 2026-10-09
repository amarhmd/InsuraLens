/* Mock authentication records for the demo sign-in flow.

   The prototype has no real identity provider: `src/api/auth.js` accepts
   the demo password and returns this session. A backend replaces the
   check inside auth.js — the session shape below is what the frontend
   expects back from POST /api/auth/login. */

const DEMO_EMAIL = 'alex.morgan@insuralens.demo'

/** The password the mock login accepts (the UI never displays it). */
export const DEMO_PASSWORD = 'demo123'

export interface DemoUser {
  id: string
  name: string
  email: string
  /** Future role permission checks hang off this field. */
  role: 'claims_reviewer'
}

export interface DemoSession {
  user: DemoUser
  /** Bearer token the real API would issue; http.js will send it once set. */
  token: string
}

export const DEMO_SESSION: DemoSession = {
  user: {
    id: 'usr-demo-001',
    name: 'Alex Morgan',
    email: DEMO_EMAIL,
    role: 'claims_reviewer',
  },
  token: 'demo-token-not-a-real-credential',
}
