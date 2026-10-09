import { useEffect, useState } from 'react'
import { LoginPage } from './pages/login/LoginPage'
import { DemoWorkspacePage } from './pages/demo/DemoWorkspacePage'
import { Dashboard } from './pages/dashboard/Dashboard'
import { ClaimsPage } from './pages/claims/ClaimsPage'
import { ClaimWorkspacePage } from './pages/claim-workspace/ClaimWorkspacePage'
import { AgentChatPage } from './pages/agent-chat/AgentChatPage'
import { AnalyticsPage } from './pages/analytics/AnalyticsPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { landingRoute } from './lib/landing'
import { navigate, routeFromHash, type Route } from './lib/router'
import { useDocumentTitle } from './hooks/useDocumentTitle'
import { useRouteTitle } from './hooks/useRouteTitle'

/**
 * Hash routes keep deep links working on a static host. The demo entry
 * ("Continue with demo" or a valid form submission) simply lands on the
 * settings-chosen landing page — there is no session or authentication
 * service behind it, and direct links to any surface work on their own.
 */
export function App() {
  const [route, setRoute] = useState<Route>(() => routeFromHash(window.location.hash))
  const title = useRouteTitle(route)
  useDocumentTitle(title)

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  let body: React.ReactNode
  if (route.name === 'dashboard') {
    body = <Dashboard />
  } else if (route.name === 'claims') {
    body = <ClaimsPage query={route.query} />
  } else if (route.name === 'claim') {
    body = <ClaimWorkspacePage claimId={route.id} />
  } else if (route.name === 'chat') {
    body = <AgentChatPage />
  } else if (route.name === 'analytics') {
    body = <AnalyticsPage />
  } else if (route.name === 'settings') {
    body = <SettingsPage />
  } else if (route.name === 'demo') {
    body = <DemoWorkspacePage onExit={() => navigate({ name: 'login' })} />
  } else {
    body = <LoginPage onDemo={() => navigate(landingRoute())} />
  }

  return (
    <>
      {/* preventDefault keeps the hash route intact — a literal #main href would
          re-route to the login page. Focus lands on <main> instead. */}
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          const main = document.getElementById('main')
          if (main) {
            main.setAttribute('tabindex', '-1')
            main.focus()
            main.scrollIntoView()
          }
        }}
      >
        Skip to main content
      </a>

      {body}
    </>
  )
}