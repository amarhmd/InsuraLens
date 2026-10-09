/* Mock recent-activity rows for the Dashboard's "Recent activity" card.

   The card's rows are a fixed demo feed (an activity stream is not derived
   from the claims dataset — timestamps like "09:42" are wall-clock demo
   values). KPI counts on the Dashboard come from src/mocks/claims.ts so
   they always match Claims and Analytics; only this feed is static. */

export interface ActivityItem {
  time: string
  action: string
  claim: string
}

export const mockRecentActivity: ActivityItem[] = [
  { time: '09:42', action: 'AI analysis completed', claim: 'CLM-10482' },
  { time: '09:31', action: 'New accident report uploaded', claim: 'CLM-10476' },
  { time: '09:18', action: 'Reviewer opened claim', claim: 'CLM-10461' },
  { time: '08:54', action: 'Customer statement added', claim: 'CLM-10455' },
]
