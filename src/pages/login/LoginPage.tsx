import { BrandPanel } from './BrandPanel'
import { LoginCard } from './LoginCard'

export type LoginPageProps = {
  /** Called after a successful sign-in. */
  onSuccess: () => void
  /** Called after a credential-less guest session starts. */
  onGuest: () => void
}

/**
 * The sign-in screen: a centred shell holding a dark brand panel and, sitting
 * over its right edge, the white auth card. Credentials go to the backend
 * through src/api/auth.js.
 */
export function LoginPage({ onSuccess, onGuest }: LoginPageProps) {
  return (
    <div className="login">
      <div className="login__shell">
        <BrandPanel />

        <main className="auth" id="main">
          <LoginCard onSuccess={onSuccess} onGuest={onGuest} />

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
