import type { ActivityItem } from '../../lib/dashboard'

/**
 * The Dashboard's "Recent activity" feed. Rows are real backend activity
 * (analysis runs, uploads, stage changes), newest first; the card shows the
 * last few. Arrives from getDashboardSummary() (src/api/dashboard.js).
 */
export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <div className="recent-activity">
      <h2 className="recent-activity__title">Recent activity</h2>
      <div className="recent-activity__list">
        {items.map((activity, idx) => (
          <div key={idx} className="recent-activity__item">
            <div className="recent-activity__icon" />
            <div className="recent-activity__content">
              <div className="recent-activity__time">{activity.time}</div>
              <div className="recent-activity__action">{activity.action}</div>
              <div className="recent-activity__claim">{activity.claim}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
