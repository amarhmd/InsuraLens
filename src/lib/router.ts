/* Hash routing for the prototype. No library. */

/** Deep-link parameters the Claims page understands (analytics passes them). */
export type ClaimsQuery = Partial<Record<'tab' | 'evidence' | 'incident', string>>

export type Route =
  | { name: 'login' }
  | { name: 'demo' }
  | { name: 'dashboard' }
  | { name: 'claims'; query?: ClaimsQuery }
  | { name: 'claim'; id: string }
  | { name: 'chat' }
  | { name: 'analytics' }
  | { name: 'settings' }

const CLAIMS_KEYS = ['tab', 'evidence', 'incident'] as const

function parseClaimsQuery(search: string): ClaimsQuery | undefined {
  const params = new URLSearchParams(search)
  const query: ClaimsQuery = {}
  for (const key of CLAIMS_KEYS) {
    const value = params.get(key)
    if (value) query[key] = value
  }
  return Object.keys(query).length > 0 ? query : undefined
}

export function routeFromHash(hash: string): Route {
  const cleaned = hash.replace(/^#\/?/, '')
  /* `claims?tab=Human%20Review` — split the path off its parameters first. */
  const qIndex = cleaned.indexOf('?')
  const path = qIndex === -1 ? cleaned : cleaned.slice(0, qIndex)
  const search = qIndex === -1 ? '' : cleaned.slice(qIndex + 1)

  if (path === 'demo') return { name: 'demo' }
  if (path === 'dashboard') return { name: 'dashboard' }
  if (path === 'claims') return { name: 'claims', query: parseClaimsQuery(search) }
  if (path === 'chat') return { name: 'chat' }
  if (path === 'analytics') return { name: 'analytics' }
  if (path === 'settings') return { name: 'settings' }
  if (path.startsWith('claims/')) {
    const id = decodeURIComponent(path.slice('claims/'.length))
    if (id) return { name: 'claim', id }
  }
  return { name: 'login' }
}

export function hashFromRoute(route: Route): string {
  if (route.name === 'demo') return '#/demo'
  if (route.name === 'dashboard') return '#/dashboard'
  if (route.name === 'chat') return '#/chat'
  if (route.name === 'analytics') return '#/analytics'
  if (route.name === 'settings') return '#/settings'
  if (route.name === 'claims') {
    if (!route.query) return '#/claims'
    const params = new URLSearchParams()
    if (route.query.tab) params.set('tab', route.query.tab)
    if (route.query.evidence) params.set('evidence', route.query.evidence)
    if (route.query.incident) params.set('incident', route.query.incident)
    const search = params.toString()
    return search ? `#/claims?${search}` : '#/claims'
  }
  if (route.name === 'claim') return `#/claims/${encodeURIComponent(route.id)}`
  return '#/'
}

export function navigate(route: Route): void {
  const next = hashFromRoute(route)
  if (window.location.hash !== next) window.location.hash = next
}
