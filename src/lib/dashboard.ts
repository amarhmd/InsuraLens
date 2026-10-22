/* Dashboard view model — the shape src/api/dashboard.js returns and the
   Dashboard components render. Presentation-only types; the data itself comes
   from GET /api/dashboard/summary plus the live claim queue. */

/** One row in the Dashboard's "Recent activity" card. */
export interface ActivityItem {
  time: string
  action: string
  claim: string
}

export interface DashboardStageCounts {
  [stage: string]: number
  new: number
  evidence_collection: number
  ai_analysis: number
  human_review: number
  completed: number
}

export interface DashboardPriorityCounts {
  [priority: string]: number
  high: number
  medium: number
  low: number
}

/** Counts behind the "AI-assisted insights" cards, derived from the queue. */
export interface DashboardInsights {
  damagePattern: number
  missingEvidence: number
  policyReview: number
}

/** Everything the Dashboard cards read in one payload. */
export interface DashboardSummary {
  /** All claims in the dataset. */
  total: number
  /** Claims not yet completed. */
  open: number
  /** High-priority open claims. */
  needsReview: number
  /** Claims in the AI-analysis stage. */
  inAnalysis: number
  /** Claims in human review. */
  awaitingDecision: number
  /** Counts keyed by UI lifecycle token. */
  stages: DashboardStageCounts
  /** Counts keyed by priority token. */
  priorities: DashboardPriorityCounts
  insights: DashboardInsights
  recentActivity: ActivityItem[]
}
