import { useMemo } from 'react'
import type { Route } from '../lib/router'

const routeTitles: Record<Route['name'], string> = {
  login: 'Login',
  dashboard: 'Dashboard',
  claims: 'Claims',
  claim: 'Claim',
  chat: 'Agent Chat',
  analytics: 'Analytics',
  settings: 'Settings',
  demo: 'Demo',
}

export function useRouteTitle(route: Route): string {
  return useMemo(() => {
    const page = routeTitles[route.name] ?? 'InsuraLens'
    return `${page} · InsuraLens`
  }, [route.name])
}
