/* Dashboard API — the organization-wide overview behind #/dashboard.

   Mock mode: every number is computed from the shared claim dataset in
   src/mocks/claims.ts (the same array the Claims and Analytics pages read),
   so the three surfaces can never disagree. Only the recent-activity feed
   is a fixed demo list from src/mocks/dashboard.ts. */

import { delay } from './http'
import { evidenceCategory } from '../lib/analyticsData'
import { mockClaims } from '../mocks/claims'
import { mockRecentActivity } from '../mocks/dashboard'

/** Simulated network latency for mock responses (ms). */
const MOCK_DELAY_MS = 250

/**
 * Everything the Dashboard cards read in one payload.
 *
 * @typedef {Object} DashboardSummary
 * @property {number} total all claims in the dataset
 * @property {number} open claims not yet completed
 * @property {number} needsReview high-priority claims
 * @property {number} inAnalysis claims in the AI-analysis stage
 * @property {number} awaitingDecision claims in human review
 * @property {Record<string, number>} stages counts keyed by stage token
 * @property {Record<string, number>} priorities counts keyed by priority token
 * @property {{ damagePattern: number, missingEvidence: number, policyReview: number }} insights
 * @property {Array<import('../mocks/dashboard').ActivityItem>} recentActivity
 */

/**
 * GET /api/dashboard/summary — all Dashboard cards in one payload.
 *
 * @returns {Promise<DashboardSummary>}
 */
export async function getDashboardSummary() {
  await delay(MOCK_DELAY_MS)
  /* TODO(backend): return request('/api/dashboard/summary') */

  const all = mockClaims
  return {
    total: all.length,
    open: all.filter((c) => c.status !== 'completed').length,
    needsReview: all.filter((c) => c.priority === 'high').length,
    inAnalysis: all.filter((c) => c.status === 'ai_analysis').length,
    awaitingDecision: all.filter((c) => c.status === 'human_review').length,

    stages: {
      new: all.filter((c) => c.status === 'new').length,
      evidence_collection: all.filter((c) => c.status === 'evidence_collection').length,
      ai_analysis: all.filter((c) => c.status === 'ai_analysis').length,
      human_review: all.filter((c) => c.status === 'human_review').length,
      completed: all.filter((c) => c.status === 'completed').length,
    },
    priorities: {
      high: all.filter((c) => c.priority === 'high').length,
      medium: all.filter((c) => c.priority === 'medium').length,
      low: all.filter((c) => c.priority === 'low').length,
    },

    /* Each insight states its predicate in the card copy — keep them in
       sync with AIInsights.tsx when the backend defines its own. */
    insights: {
      damagePattern: all.filter(
        (c) => c.incident === 'rear_end_collision' && c.priority === 'high',
      ).length,
      missingEvidence: all.filter((c) => evidenceCategory(c) === 'Missing Documents').length,
      policyReview: all.filter((c) => evidenceCategory(c) === 'Requires Verification').length,
    },

    recentActivity: mockRecentActivity.map((item) => ({ ...item })),
  }
}
