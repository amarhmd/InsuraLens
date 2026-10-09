/* ==========================================================================
   Mock claims dataset — the single source of truth for the prototype.

   Nothing here is a live insurance record. Dashboard, Claims, Analytics, the
   claim workspace, and Agent Chat all read this one array (directly or
   through src/api/), so totals can never disagree between pages. The first
   four claims mirror the brief's example records exactly; the remainder are
   generated deterministically (no randomness) so totals, tab counts,
   sorting, and pagination stay stable across reloads:

     128 total claims
      24 high priority        → "Needs Review" metric
      12 evidence collection  → "Evidence Incomplete" metric
      11 human review         → "Awaiting Decision" metric

   Stage, priority, and incident values are the API tokens defined in
   src/lib/constants.ts; display labels are applied only when rendered.
   ========================================================================== */

import { formatDate, formatAgo } from '../lib/claimsData'
import type { AiAnalysis, Claim, ClaimStatus, EvidenceState, IncidentType, PolicyMatch, Priority } from '../lib/claimsData'

/* -------------------------------------------------------------------------- */
/* The four example records from the brief                                     */
/* -------------------------------------------------------------------------- */

const seedClaims: Claim[] = [
  {
    id: 'CLM-10482',
    customer: 'Sarah Mitchell',
    incident: 'vehicle_collision',
    dateReported: 'Oct 5, 2026',
    dateReportedValue: Date.UTC(2026, 9, 5),
    policyRef: 'POL-88214',
    evidenceItems: 8,
    evidence: 'Complete',
    aiAnalysis: 'Available',
    policyMatch: 'Matched',
    priority: 'high',
    status: 'human_review',
    updatedLabel: '12 min ago',
    updatedMinutes: 12,
  },
  {
    id: 'CLM-10476',
    customer: 'Daniel Carter',
    incident: 'rear_end_collision',
    dateReported: 'Oct 5, 2026',
    dateReportedValue: Date.UTC(2026, 9, 5),
    policyRef: 'POL-77190',
    evidenceItems: 5,
    evidence: 'Incomplete',
    aiAnalysis: 'Incomplete',
    policyMatch: 'Partial',
    priority: 'medium',
    status: 'evidence_collection',
    updatedLabel: '34 min ago',
    updatedMinutes: 34,
  },
  {
    id: 'CLM-10461',
    customer: 'Emma Wilson',
    incident: 'side_collision',
    dateReported: 'Oct 4, 2026',
    dateReportedValue: Date.UTC(2026, 9, 4),
    policyRef: 'POL-64028',
    evidenceItems: 12,
    evidence: 'Complete',
    aiAnalysis: 'Available',
    policyMatch: 'Requires Review',
    priority: 'medium',
    status: 'human_review',
    updatedLabel: '1 hr ago',
    updatedMinutes: 60,
  },
  {
    id: 'CLM-10455',
    customer: 'James Anderson',
    incident: 'vehicle_collision',
    dateReported: 'Oct 4, 2026',
    dateReportedValue: Date.UTC(2026, 9, 4),
    policyRef: 'POL-59377',
    evidenceItems: 6,
    evidence: 'Complete',
    aiAnalysis: 'Processing',
    policyMatch: 'Not Evaluated',
    priority: 'low',
    status: 'ai_analysis',
    updatedLabel: '2 hrs ago',
    updatedMinutes: 120,
  },
]

/* -------------------------------------------------------------------------- */
/* Deterministic generator for the remaining 124 records                        */
/* -------------------------------------------------------------------------- */

const FIRST_NAMES = [
  'Olivia', 'Liam', 'Noah', 'Ava', 'Ethan', 'Mia', 'Lucas', 'Sophia', 'Mason', 'Isabella',
  'Logan', 'Chloe', 'Elijah', 'Harper', 'Caleb', 'Amelia', 'Ryan', 'Ella', 'Nathan', 'Grace',
  'Aaron', 'Zoe', 'Owen', 'Lily', 'Dylan', 'Hannah', 'Justin', 'Nora', 'Victor', 'Renee',
]

const LAST_NAMES = [
  'Nguyen', 'Brooks', 'Patel', 'Hayes', 'Foster', 'Coleman', 'Powell', 'Russell', 'Bennett', 'Hughes',
  'Cooper', 'Richardson', 'Cox', 'Howard', 'Ward', 'Torres', 'Peterson', 'Gray', 'Ramirez', 'Ramos',
  'Flores', 'Greene', 'Sanders', 'Price', 'Long', 'Patterson', 'Bryant', 'Hoffman', 'Saunders', 'Bailey',
]

/* Weighted incident pool — repeats encode frequency. */
const INCIDENT_POOL: IncidentType[] = [
  'vehicle_collision', 'rear_end_collision', 'side_collision', 'rear_end_collision',
  'vehicle_collision', 'other', 'side_collision', 'rear_end_collision',
]

/** Exact status mix for the 124 generated rows (seed rows add 2 HR, 1 EC, 1 AI). */
function statusPlan(): ClaimStatus[] {
  const plan: ClaimStatus[] = []
  plan.push(...Array.from({ length: 9 }, (): ClaimStatus => 'human_review'))
  plan.push(...Array.from({ length: 11 }, (): ClaimStatus => 'evidence_collection'))
  plan.push(...Array.from({ length: 30 }, (): ClaimStatus => 'new'))
  plan.push(...Array.from({ length: 44 }, (): ClaimStatus => 'ai_analysis'))
  plan.push(...Array.from({ length: 30 }, (): ClaimStatus => 'completed'))
  return plan
}

/** Exact priority mix: 23 High (1 seed row is High) + 51 Medium + 50 Low = 124. */
function priorityPlan(): Priority[] {
  const plan: Priority[] = []
  plan.push(...Array.from({ length: 23 }, (): Priority => 'high'))
  plan.push(...Array.from({ length: 51 }, (): Priority => 'medium'))
  plan.push(...Array.from({ length: 50 }, (): Priority => 'low'))
  return plan
}

/**
 * Two coprime strides (47 and 53 are both prime, so multiplying by them mod 124
 * is a permutation) scatter the two plans across the rows independently —
 * high-priority claims are not clustered into one workflow stage.
 */
function generateClaims(): Claim[] {
  const statuses = statusPlan()
  const priorities = priorityPlan()
  const rows: Claim[] = []
  const count = 124

  for (let k = 0; k < count; k += 1) {
    const status = statuses[(k * 47) % count]
    const priority = priorities[(k * 53) % count]
    const incident = INCIDENT_POOL[k % INCIDENT_POOL.length]

    const customer = `${FIRST_NAMES[k % FIRST_NAMES.length]} ${
      LAST_NAMES[(Math.floor(k / FIRST_NAMES.length) * 7 + (k % FIRST_NAMES.length)) % LAST_NAMES.length]
    }`

    const dateReportedValue = Date.UTC(2026, 9, 4) - Math.floor(k / 5) * 86_400_000
    const updatedMinutes = 140 + k * 31 + (k % 7) * 3

    let evidenceItems: number
    if (status === 'evidence_collection') evidenceItems = 2 + (k % 4) // 2–5
    else if (status === 'new') evidenceItems = 1 + (k % 3) // 1–3
    else evidenceItems = 4 + ((k * 5) % 11) // 4–14

    const evidence: EvidenceState =
      status === 'evidence_collection' || (status === 'new' && k % 3 === 0)
        ? 'Incomplete'
        : 'Complete'

    let aiAnalysis: AiAnalysis
    if (status === 'new') aiAnalysis = 'Not started'
    else if (status === 'evidence_collection') aiAnalysis = 'Incomplete'
    else if (status === 'ai_analysis') aiAnalysis = 'Processing'
    else aiAnalysis = 'Available'

    let policyMatch: PolicyMatch
    if (status === 'new') policyMatch = 'Not Evaluated'
    else if (status === 'ai_analysis') policyMatch = k % 2 === 0 ? 'Not Evaluated' : 'Requires Review'
    else policyMatch = (['Matched', 'Partial', 'Requires Review', 'Matched'] as PolicyMatch[])[k % 4]

    rows.push({
      id: `CLM-${10450 - k}`,
      customer,
      incident,
      dateReported: formatDate(dateReportedValue),
      dateReportedValue,
      policyRef: `POL-${40000 + ((k * 3571) % 50_000)}`,
      evidenceItems,
      evidence,
      aiAnalysis,
      policyMatch,
      priority,
      status,
      updatedLabel: formatAgo(updatedMinutes),
      updatedMinutes,
    })
  }

  return rows
}

/**
 * The shared dataset. `createClaim` unshifts into this array so a claim
 * created on #/claims shows up in every page's counts immediately.
 */
export const mockClaims: Claim[] = [...seedClaims, ...generateClaims()]
