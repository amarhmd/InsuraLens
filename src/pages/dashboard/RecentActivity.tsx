import type { ActivityItem } from '../../mocks/dashboard'

/**
 * Fixed demo activity feed (an activity stream is not derived from the
 * claims dataset — timestamps like "09:42" are wall-clock demo values).
 * Rows arrive from getDashboardSummary() (src/api/dashboard.js).
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
