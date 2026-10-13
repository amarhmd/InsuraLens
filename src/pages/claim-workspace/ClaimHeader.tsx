import { cx } from '../../lib/cx'
import type { ClaimWorkspaceData } from '../../data/claim'

/**
 * Page header: H1, status badges, subtitle, and the page-level actions.
 * The brief places the title inside the content area, not the top bar.
 */
export function ClaimHeader({ data }: { data: ClaimWorkspaceData }) {
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
      </div>

      {/* Back / Request / Complete are prototype stubs, but real controls. */}
      <div className="cw-header__actions">
        <a className="cw-btn cw-btn--secondary" href="#/claims">
          Back to claims
        </a>
        <button type="button" className="cw-btn cw-btn--secondary">
          Request information
        </button>
        <button type="button" className="cw-btn cw-btn--primary">
          Complete review
        </button>
      </div>
    </header>
  )
}
