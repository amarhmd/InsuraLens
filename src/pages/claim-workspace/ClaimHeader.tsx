import { cx } from '../../lib/cx'
import type { ClaimWorkspaceData } from '../../lib/claimWorkspace'

type ClaimHeaderProps = {
  data: ClaimWorkspaceData
  /** An action (review / upload / analysis retry) is in flight — disable the controls. */
  busy?: boolean
  /** Short action status (upload / review outcomes). Analysis progress and
      failures are rendered by the AI analysis card, never here. */
  status?: string | null
  /** Message from the last failed upload/review action. */
  error?: string | null
  /* Complete review removed; approval is the only action. */
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
}: ClaimHeaderProps) {
  void busy
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
          <div className="cw-header__warning" role="alert" style={{ marginTop: '8px' }}>
            <span className="cw-badge cw-badge--needs" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span aria-hidden="true" style={{ fontSize: '14px' }}>⚠</span>
              Action failed
            </span>
            <p className="cw-header__warning-text" style={{ margin: '6px 0 0', color: '#b42318', fontWeight: 500 }}>
              {error}
            </p>
          </div>
        )}
      </div>

      <div className="cw-header__actions">
        <a className="cw-btn cw-btn--secondary" href="#/claims">
          Back to claims
        </a>

      </div>
    </header>
  )
}
