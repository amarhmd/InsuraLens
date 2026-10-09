import { getSettings } from './settingsStore'
import type { Route } from './router'

/**
 * The one preference Settings applies outside its own page: "Default landing
 * page" decides where Sign in and Continue with demo go.
 */
export function landingRoute(): Route {
  const landing = getSettings().preferences.landing
  if (landing === 'claims') return { name: 'claims' }
  if (landing === 'chat') return { name: 'chat' }
  return { name: 'dashboard' }
}