import { BrandPanel } from './BrandPanel'
import { LoginCard } from './LoginCard'

export type LoginPageProps = {
  /** Enter the demo workspace. Credentials are never checked, stored, or sent. */
  onDemo: () => void
}

/**
 * The sign-in screen: a brand panel that states what the product is, and an
 * auth column that centres the card above a footer pinned to the bottom.
 * Everything on the right is form behaviour only — there is no authentication
 * service behind it.
 */
export function LoginPage({ onDemo }: LoginPageProps) {
  return (
    <div className="login">
      <BrandPanel />

      <main className="auth" id="main">
        <div className="auth__center">
          <div className="card">
            <LoginCard onDemo={onDemo} />
          </div>
        </div>

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
  )
}
