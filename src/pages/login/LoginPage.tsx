import { BrandPanel } from './BrandPanel'
import { LoginCard } from './LoginCard'

export type LoginPageProps = {
  /** Enter the demo workspace. Credentials are never checked, stored, or sent. */
  onDemo: () => void
}

/**
 * The sign-in screen: a centred shell holding a dark brand panel and, sitting
 * over its right edge, the white auth card. Everything on the right is form
 * behaviour only — there is no authentication service behind it.
 */
export function LoginPage({ onDemo }: LoginPageProps) {
  return (
    <div className="login">
      <div className="login__shell">
        <BrandPanel />

        <main className="auth" id="main">
          <LoginCard onDemo={onDemo} />

          <footer className="pagefoot">
            <p>© 2026 InsuraLens</p>
            <nav className="pagefoot__links" aria-label="Footer">
              {/* Placeholder destinations: the pages do not exist yet, but the
                  links are honest about where they would go. */}
              <a href="#/">Privacy</a>
              <a href="#/">Terms</a>
              <a href="#/">Help</a>
            </nav>
          </footer>
        </main>
      </div>
    </div>
  )
}
