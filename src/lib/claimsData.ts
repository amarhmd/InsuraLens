/* ==========================================================================
   Claims domain library — types, formatting, and search / filter / sort
   helpers for the work queue.

   The dataset itself lives in src/mocks/claims.ts — the single source of
   truth every page reads through src/api/. It is re-exported here so
   library code (and the data-check scripts) can import it from one place.

   Stage, priority, and incident values are the API tokens defined in
   src/lib/constants.ts ('new', 'rear_end_collision', …). Display labels
   are applied at render time only; the one exception below is search,
   which also matches the label a human would type ("rear-end").
   ========================================================================== */

import { STAGES, incidentLabel, priorityRank } from './constants'
import type { ClaimStatus, IncidentType, Priority } from './constants'
import { mockClaims } from '../mocks/claims'

export type { ClaimStatus, IncidentType, Priority } from './constants'
export { INCIDENT_TYPES, PRIORITIES, STAGES as CLAIM_STATUSES } from './constants'
export { mockClaims }

export type EvidenceState = 'Complete' | 'Incomplete'

export type PolicyMatch = 'Matched' | 'Partial' | 'Requires Review' | 'Not Evaluated'

export type AiAnalysis = 'Available' | 'Incomplete' | 'Processing' | 'Not started'

/** A photo thumbnail the create-claim modal attaches to a new claim. */
interface ClaimPhoto {
  name: string
  /** Object URL preview — valid for this browser session only. */
  url: string
  caption?: string
}

export interface Claim {
  id: string
  customer: string
  incident: IncidentType
  /** Display date, e.g. "Oct 5, 2026". */
  dateReported: string
  /** Epoch ms for sorting. */
  dateReportedValue: number
  policyRef: string
  evidenceItems: number
  evidence: EvidenceState
  aiAnalysis: AiAnalysis
  policyMatch: PolicyMatch
  priority: Priority
  status: ClaimStatus
  updatedLabel: string
  /** Minutes since last update — sort key for "Last Updated". */
  updatedMinutes: number
  description?: string
  /** Photo thumbnails staged at intake (session-scoped object URLs). */
  photos?: ClaimPhoto[]
}

/* -------------------------------------------------------------------------- */
/* Option lists (drive filters, tabs, and the create form)                     */
/* -------------------------------------------------------------------------- */

export type TabKey = 'All' | ClaimStatus

export const TABS: TabKey[] = ['All', ...STAGES]

export const EVIDENCE_OPTIONS: EvidenceState[] = ['Complete', 'Incomplete']

export const POLICY_MATCH_OPTIONS: PolicyMatch[] = ['Matched', 'Partial', 'Requires Review']

/* -------------------------------------------------------------------------- */
/* Formatting helpers                                                          */
/* -------------------------------------------------------------------------- */

export function formatAgo(minutes: number): string {
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export function formatDate(value: number): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Next frontend-generated ID: CLM-10483, CLM-10484, … */
export function nextClaimId(claims: Claim[]): string {
  const max = claims.reduce((acc, claim) => {
    const n = Number.parseInt(claim.id.replace('CLM-', ''), 10)
    return Number.isNaN(n) ? acc : Math.max(acc, n)
  }, 10_482)
  return `CLM-${max + 1}`
}

/* -------------------------------------------------------------------------- */
/* Search / filter / sort                                                      */
/* -------------------------------------------------------------------------- */

export interface ClaimsFilterState {
  statuses: ClaimStatus[]
  priorities: Priority[]
  incidents: IncidentType[]
  evidence: EvidenceState[]
  policyMatches: PolicyMatch[]
}

export const EMPTY_FILTERS: ClaimsFilterState = {
  statuses: [],
  priorities: [],
  incidents: [],
  evidence: [],
  policyMatches: [],
}

export function activeFilterCount(filters: ClaimsFilterState): number {
  return (
    filters.statuses.length +
    filters.priorities.length +
    filters.incidents.length +
    filters.evidence.length +
    filters.policyMatches.length
  )
}

export function matchesSearch(claim: Claim, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return true
  return (
    claim.id.toLowerCase().includes(query) ||
    claim.customer.toLowerCase().includes(query) ||
    /* Match the incident label a human would type ("rear-end"), not just
       the API token stored on the record. */
    incidentLabel(claim.incident).toLowerCase().includes(query) ||
    claim.policyRef.toLowerCase().includes(query)
  )
}

export function matchesFilters(claim: Claim, filters: ClaimsFilterState): boolean {
  if (filters.statuses.length > 0 && !filters.statuses.includes(claim.status)) return false
  if (filters.priorities.length > 0 && !filters.priorities.includes(claim.priority)) return false
  if (filters.incidents.length > 0 && !filters.incidents.includes(claim.incident)) return false
  if (filters.evidence.length > 0 && !filters.evidence.includes(claim.evidence)) return false
  if (filters.policyMatches.length > 0 && !filters.policyMatches.includes(claim.policyMatch)) {
    return false
  }
  return true
}

export type SortKey = 'updated' | 'date' | 'priority' | 'id'
export type SortDir = 'asc' | 'desc'
export interface SortState {
  key: SortKey
  dir: SortDir
}

export function sortClaims(claims: Claim[], sort: SortState): Claim[] {
  const sign = sort.dir === 'asc' ? 1 : -1
  const sorted = [...claims].sort((a, b) => {
    switch (sort.key) {
      case 'updated':
        return sign * (a.updatedMinutes - b.updatedMinutes)
      case 'date':
        return sign * (a.dateReportedValue - b.dateReportedValue)
      case 'priority':
        return sign * (priorityRank(a.priority) - priorityRank(b.priority))
      case 'id':
        return sign * a.id.localeCompare(b.id)
    }
  })
  return sorted
}

/** Counts for every status tab, derived from the data after search + filters. */
export function statusCounts(claims: Claim[]): Record<TabKey, number> {
  /* Seeded from the stage tokens so the record always covers every tab. */
  const counts = { All: claims.length } as Record<TabKey, number>
  for (const stage of STAGES) counts[stage] = 0
  for (const claim of claims) counts[claim.status] += 1
  return counts
}
