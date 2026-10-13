/* Dashboard API — the organization-wide overview behind #/dashboard.

   Live mode: the card totals, stage counts and priority counts come from
   GET /api/dashboard/summary. Still demo data for now: `insights` (computed
   from src/mocks/claims.ts, the backend has no equivalent) and
   `recentActivity` (src/mocks/dashboard.ts, mapped in the next step). */

import { request } from './http'
import { evidenceCategory } from '../lib/analyticsData'
import { mockClaims } from '../mocks/claims'
import { mockRecentActivity } from '../mocks/dashboard'

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
  const data = await request('/api/dashboard/summary')
  const totals = data.totals ?? {}
  const byStage = data.byStage ?? []
  const byPriority = data.byPriority ?? []

  const stageCount = (stage) => byStage.find((s) => s.stage === stage)?.count ?? 0
  const priorityCount = (priority) =>
    byPriority.find((p) => p.priority === priority)?.count ?? 0

  const all = mockClaims
  return {
    total: totals.claims ?? 0,
    open: totals.open ?? 0,
    needsReview: totals.highPriorityOpen ?? 0,
    inAnalysis: stageCount('ai_analysis'),
    awaitingDecision: stageCount('human_review'),

    /* The backend names the first and last stages "intake" and "decided". */
    stages: {
      new: stageCount('intake'),
      evidence_collection: stageCount('evidence_collection'),
      ai_analysis: stageCount('ai_analysis'),
      human_review: stageCount('human_review'),
      completed: stageCount('decided'),
    },
    priorities: {
      high: priorityCount('high'),
      medium: priorityCount('medium'),
      low: priorityCount('low'),
    },

    /* TODO(backend): demo data until the backend exposes insights. */
    insights: {
      damagePattern: all.filter(
        (c) => c.incident === 'rear_end_collision' && c.priority === 'high',
      ).length,
      missingEvidence: all.filter((c) => evidenceCategory(c) === 'Missing Documents').length,
      policyReview: all.filter((c) => evidenceCategory(c) === 'Requires Verification').length,
    },

    /* TODO: map data.recentActivity to the ActivityItem shape (next step). */
    recentActivity: mockRecentActivity.map((item) => ({ ...item })),
  }
}