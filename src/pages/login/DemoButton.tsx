import { cx } from '../../lib/cx'
import { Spinner, CompassIcon } from '../../components/ui/icons'

export type DemoButtonProps = {
  /** Enter the demo workspace. No credentials are read or checked. */
  onClick: () => void
  disabled?: boolean
  className?: string
  loading?: boolean
}

/**
 * The secondary "get in without an account" path. It stays clearly below the
 * primary Sign in — outlined, not filled — but earns its place with an icon,
 * a one-line explanation, and the app's own Demo environment marker.
 */
export function DemoButton({ onClick, disabled, className, loading }: DemoButtonProps) {
  return (
    <div className={cx('demo', className)}>
      <button
        type="button"
        className="btn btn--secondary demo__btn"
        onClick={onClick}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
      >
        {loading ? (
          <>
            <Spinner size={16} />
            <span>Opening demo…</span>
          </>
        ) : (
          <>
            <CompassIcon size={18} className="demo__icon" />
            <span>Continue with demo</span>
          </>
        )}
      </button>

      <p className="demo__help">Explore with sample data, no account needed</p>

      {/* Labelled as what it is: an alternative entry that runs on fictional
          sample data, not real insurance claims. */}
      <span
        className="demo-pill"
        title="All data, identities, and permissions are simulated for this frontend demo"
      >
        <span className="demo-pill__dot" aria-hidden="true" />
        Demo environment
      </span>
    </div>
  )
}
