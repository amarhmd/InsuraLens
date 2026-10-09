/* ==========================================================================
   Shared vocabulary — the one place stages, priorities, and incident types
   are defined. The token values (new, evidence_collection, …) are exactly
   what the backend API will send and receive; the label maps are the only
   place the human-readable text ("Evidence Collection") lives.

   Everything in the app reads these lists: the mock dataset stores tokens,
   filters and option lists iterate these arrays, and any string rendered on
   screen goes through a label helper — so the data model and the contract
   can never drift apart.
   ========================================================================== */

/* -------------------------------------------------------------------------- */
/* Workflow stages                                                             */
/* -------------------------------------------------------------------------- */

export const STAGES = [
  'new',
  'evidence_collection',
  'ai_analysis',
  'human_review',
  'completed',
] as const

export type ClaimStatus = (typeof STAGES)[number]

const STAGE_LABELS: Record<ClaimStatus, string> = {
  new: 'New',
  evidence_collection: 'Evidence Collection',
  ai_analysis: 'AI Analysis',
  human_review: 'Human Review',
  completed: 'Completed',
}

export function stageLabel(value: ClaimStatus): string {
  return STAGE_LABELS[value] ?? value
}

/* -------------------------------------------------------------------------- */
/* Priorities                                                                  */
/* -------------------------------------------------------------------------- */

export const PRIORITIES = ['high', 'medium', 'low'] as const

export type Priority = (typeof PRIORITIES)[number]

const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export function priorityLabel(value: Priority): string {
  return PRIORITY_LABELS[value] ?? value
}

/**
 * Relative sort weight for priorities — larger sorts ahead when a caller
 * wants "high first". Only the ordering matters (low < medium < high), so
 * claimsData and analyticsData both derive their comparators from this one
 * source instead of each keeping a private rank map.
 */
export function priorityRank(value: Priority): number {
  switch (value) {
    case 'low':
      return 1
    case 'medium':
      return 2
    case 'high':
      return 3
  }
}

/* -------------------------------------------------------------------------- */
/* Workspace titles                                                            */
/* -------------------------------------------------------------------------- */

/** The Agent Chat workspace title — shared by the page header and panel. */
export const CHAT_PAGE_TITLE = 'AI Investigation Assistant'

/* -------------------------------------------------------------------------- */
/* Incident types                                                              */
/* -------------------------------------------------------------------------- */

export const INCIDENT_TYPES = [
  'rear_end_collision',
  'side_collision',
  'vehicle_collision',
  'other',
] as const

export type IncidentType = (typeof INCIDENT_TYPES)[number]

const INCIDENT_LABELS: Record<IncidentType, string> = {
  rear_end_collision: 'Rear-end Collision',
  side_collision: 'Side Collision',
  vehicle_collision: 'Vehicle Collision',
  other: 'Other',
}

export function incidentLabel(value: IncidentType): string {
  return INCIDENT_LABELS[value] ?? value
}

/* -------------------------------------------------------------------------- */
/* Option lists for selects, tabs, and filter pills                            */
/* -------------------------------------------------------------------------- */

export interface LabeledOption<T extends string> {
  value: T
  label: string
}

export const PRIORITY_OPTIONS: LabeledOption<Priority>[] = PRIORITIES.map((value) => ({
  value,
  label: PRIORITY_LABELS[value],
}))

export const INCIDENT_TYPE_OPTIONS: LabeledOption<IncidentType>[] = INCIDENT_TYPES.map(
  (value) => ({ value, label: INCIDENT_LABELS[value] }),
)

/* -------------------------------------------------------------------------- */
/* Generic lookup                                                              */
/* -------------------------------------------------------------------------- */

const TOKEN_LABELS: Record<string, string> = {
  ...STAGE_LABELS,
  ...PRIORITY_LABELS,
  ...INCIDENT_LABELS,
}

/**
 * Maps any known token to its display label; unknown strings (already
 * display values such as "Matched" or "Incomplete") pass through unchanged.
 * Used by shared presentational pieces like StatusBadge.
 */
export function displayLabel(value: string): string {
  return TOKEN_LABELS[value] ?? value
}
