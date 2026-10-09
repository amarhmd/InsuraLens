import { Logo } from './Logo'

export type DemoWorkspacePageProps = {
  /** Return to the sign-in screen. */
  onExit: () => void
}

/**
 * A landing point for "Continue with demo" — deliberately not a dashboard.
 * The brief builds claims, analytics and review screens separately; this page
 * only confirms that the demo entry works and lets the reviewer turn around.
 */
export function DemoWorkspacePage({ onExit }: DemoWorkspacePageProps) {
  return (
    <div className="entered">
      <main className="entered__card" id="main">
        <Logo size={48} />
        <p className="entered__tag">Demo environment</p>
        <h1 className="entered__title">You&rsquo;re in the demo workspace</h1>
        <p className="entered__body">
          No account was needed and no credentials were read. Claims, evidence and review screens
          are built next; for now this is where the demo entry lands.
        </p>
        <div className="entered__actions">
          <button type="button" className="btn btn--secondary" onClick={onExit}>
            Back to sign in
          </button>
        </div>
      </main>
    </div>
  )
}
