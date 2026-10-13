/* Dashboard API — the organization-wide overview behind #/dashboard.

   Live mode: card totals, stage counts, priority counts and the recent
   activity feed come from GET /api/dashboard/summary. Still demo data:
   `insights` only (computed from src/mocks/claims.ts, the backend has no
   equivalent yet). */

import { request } from './http'
import { evidenceCategory } from '../lib/analyticsData'
import { mockClaims } from '../mocks/claims'

/** How many recent-activity rows the card shows. */
const ACTIVITY_LIMIT = 4

/** "2026-10-13T09:42:10.000Z" -> "09:42" in the viewer's local time. */
function formatTime(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

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

  /* Newest first, then map the backend row to the card's { time, action, claim }. */
  const recentActivity = (data.recentActivity ?? [])
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, ACTIVITY_LIMIT)
    .map((item) => ({
      time: formatTime(item.createdAt),
      action: item.message || item.action || '',
      claim: item.claimId ?? '',
    }))

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

    recentActivity,
  }
}