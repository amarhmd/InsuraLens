/* Analytics API — the one selection behind every KPI, chart, and table on
   #/analytics.

   Mock mode: runs the shared selectors in src/lib/analyticsData.ts over the
   shared claim dataset, so totals always match the Dashboard and Claims.
   When the backend exists this becomes GET /api/analytics returning the
   same AnalyticsSelection JSON shape (see docs/API_CONTRACT.md). */

import { delay } from './http'
import { selectAnalytics } from '../lib/analyticsData'
import { mockClaims } from '../mocks/claims'

/** Simulated network latency for mock responses (ms). */
const MOCK_DELAY_MS = 150

/**
 * GET /api/analytics — filtered selection for the whole page.
 *
 * @param {import('../lib/analyticsData').AnalyticsFilters} filters date range, incident, workflow stage
 * @returns {Promise<import('../lib/analyticsData').AnalyticsSelection>}
 */
export async function getAnalytics(filters) {
  await delay(MOCK_DELAY_MS)
  /* TODO(backend): return request('/api/analytics', {
       query: {
         date_range: filters.dateRange,   // 7d | 30d | 90d | year
         incident: filters.incident,      // all | vehicle | rear-end | side | other
         workflow: filters.workflow,      // all | new | evidence_collection | …
       },
     }) */
  return selectAnalytics(filters, mockClaims)
}
