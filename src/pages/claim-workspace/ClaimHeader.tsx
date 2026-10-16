import { cx } from '../../lib/cx'
import type { ClaimWorkspaceData } from '../../data/claim'

type ClaimHeaderProps = {
  data: ClaimWorkspaceData
  /** An action (analyze / review / upload) is in flight — disable the controls. */
  busy?: boolean
  /** Live agent status line (e.g. "Agent: vision (running)"). */
  status?: string | null
  /** Message from the last failed action. */
  error?: string | null
  onAnalyze?: () => void
  onApprove?: () => void
  onRequestInfo?: () => void
}

/**
 * Page header: H1, status badges, subtitle, and the page-level actions.
 * The brief places the title inside the content area, not the top bar.
 */
export function ClaimHeader({
  data,
  busy = false,
  status = null,
  error = null,
  onAnalyze,
  onApprove,
  onRequestInfo,
}: ClaimHeaderProps) {
  return (
    <header className="cw-header">
      <div className="cw-header__main">
        <div className="cw-header__title-row">
          <h1 className="cw-header__title">{data.id}</h1>
          <span className="cw-header__badges">
            {data.badges.map((badge) => (
              <span key={badge.label} className={cx('cw-badge', `cw-badge--${badge.tone}`)}>
                {badge.label}
              </span>
            ))}
          </span>
        </div>
        <p className="cw-header__sub">
          {data.customer} — {data.incident}, reported {data.dateReported}
        </p>
        {status && <p className="cw-muted">{status}</p>}
        {error && (
          <p className="cw-muted" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="cw-header__actions">
        <a className="cw-btn cw-btn--secondary" href="#/claims">
          Back to claims
        </a>
        <button
          type="button"
          className="cw-btn cw-btn--secondary"
          onClick={onAnalyze}
          disabled={busy}
        >
          Run AI analysis
        </button>
        <button
          type="button"
          className="cw-btn cw-btn--secondary"
          onClick={onRequestInfo}
          disabled={busy}
        >
          Request information
        </button>
        <button
          type="button"
          className="cw-btn cw-btn--primary"
          onClick={onApprove}
          disabled={busy}
        >
          Complete review
        </button>
      </div>
    </header>
  )
}
