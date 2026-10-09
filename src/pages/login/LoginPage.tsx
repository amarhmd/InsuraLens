import { BrandVisual } from './BrandVisual'
import { LoginForm } from './LoginForm'

export type LoginPageProps = {
  /** Enter the demo workspace. Credentials are never checked, stored, or sent. */
  onDemo: () => void
}

/**
 * The sign-in screen: a brand panel that states what the product is, and an
 * auth card that gets a returning reviewer to work. Everything on the right
 * is form behaviour only — there is no authentication service behind it.
 */
export function LoginPage({ onDemo }: LoginPageProps) {
  return (
    <div className="login">
      <aside className="brand" aria-labelledby="brand-statement">
        <BrandVisual className="brand__visual" />

        <div className="brand__inner">
          <div className="brand__logo">
            <img src="/insuralens-logo-white.png" alt="InsuraLens" className="login-logo login-logo--navy" />
          </div>

          <div className="brand__copy">
            <p className="brand__statement" id="brand-statement">
              Bring complex claims evidence into focus.
            </p>
            <p className="brand__support">
              AI-assisted claims review that connects evidence, explains findings, and keeps final
              decisions in human hands.
            </p>
          </div>
        </div>
      </aside>

      <main className="auth" id="main">
        <div className="auth__inner">
          <div className="auth__center">
            <div className="card">
              <LoginForm onDemo={onDemo} />
            </div>
          </div>

          <footer className="pagefoot">
            <p>© 2026 InsuraLens</p>
            <nav className="pagefoot__links" aria-label="Footer">
              {/* Placeholder destinations: the product has no legal or help
                  pages in this prototype. */}
              <a href="#/">Privacy</a>
              <a href="#/">Terms</a>
              <a href="#/">Help</a>
            </nav>
          </footer>
        </div>
      </main>
    </div>
  )
}