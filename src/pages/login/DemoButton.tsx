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
 * primary Sign in — outlined, not filled — and sits above the amber demo marker
 * and the one-line reminder that a human keeps the final call.
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

      {/* Labelled as what it is: an alternative entry that runs on fictional
          sample data, not real insurance claims. */}
      <div className="auth__demo">
        <span
          className="auth__demo-badge"
          title="All data, identities, and permissions are simulated for this frontend demo"
        >
          Demo environment
        </span>
        <p className="auth__demo-note">Final claim decisions remain with a human reviewer.</p>
      </div>
    </div>
  )
}
