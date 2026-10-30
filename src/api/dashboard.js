/* Dashboard API — the organization-wide overview behind #/dashboard.

   Card totals, stage counts, priority counts and the recent activity feed come
   from GET /api/dashboard/summary.

   `insights` is the one card the backend does not aggregate, so it is derived
   from the live claim queue (GET /api/claims) through src/lib/insights.ts —
   the same rules the #/claims filters use. The queue fetch is best-effort:
   if it fails the summary cards still render and the insight counts are null,
   which the cards render as "—" rather than a misleading zero. */

import { request } from './http'
import { listClaims } from './claims'
import { countInsights } from '../lib/insights'

/** How many recent-activity rows the card shows. */
const ACTIVITY_LIMIT = 4

/** "2026-10-13T09:42:10.000Z" -> "09:42" in the viewer's local time. */
function formatTime(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/**
 * GET /api/dashboard/summary (+ GET /api/claims for the insight counts) —
 * everything the Dashboard cards read in one payload.
 *
 * @returns {Promise<import('../lib/dashboard').DashboardSummary>}
 */
export async function getDashboardSummary() {
  const [data, claims] = await Promise.all([
    request('/api/dashboard/summary'),
    /* Best-effort: insight counts must never take the summary cards down. */
    listClaims().catch(() => null),
  ])

  const insightCounts = claims ? countInsights(claims) : null

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

    /* Derived from the live queue — the same rules the Claims filters use. */
    insights: {
      damagePattern: insightCounts?.repeatedDamage ?? null,
      missingEvidence: insightCounts?.missingEvidence ?? null,
      policyReview: insightCounts?.policyReview ?? null,
    },

    recentActivity,
  }
}
