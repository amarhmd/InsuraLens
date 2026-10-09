import { cx } from '../../lib/cx'
import { Spinner } from '../../components/ui/icons'

export type DemoButtonProps = {
  /** Enter the demo workspace. No credentials are read or checked. */
  onClick: () => void
  disabled?: boolean
  className?: string
  loading?: boolean
}

export function DemoButton({ onClick, disabled, className, loading }: DemoButtonProps) {
  return (
    <div className={cx('demo', className)}>
      <button
        type="button"
        className="btn btn--secondary"
        onClick={onClick}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
      >
        {loading ? (
          <>
            <Spinner size={16} />
            <span>Signing in…</span>
          </>
        ) : (
          'Continue with demo'
        )}
      </button>

      {/* Labelled as what it is: an alternative entry, not a sign-in. */}
      <p className="demo__label">
        <span className="demo__dot" aria-hidden="true" />
        Demo environment
      </p>
    </div>
  )
}
