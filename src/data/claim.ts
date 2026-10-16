/* ==========================================================================
   Claim workspace mock data.

   This file is the *only* place the Claim workspace page reads its content
   from, so the whole page can be pointed at a real claim API later without
   touching a single component. `CLAIMS` is the mock collection (keyed by id
   below); each entry carries its own customer, policy, incident, dates,
   priority/status, evidence, damages, AI findings, and coverage.

   No value here is a live insurance record. Unknown-at-authoring-time values
   are written as [AMOUNT] / [DATES] rather than invented.

   The page renders a small view model (`ClaimWorkspaceData`). `toWorkspace`
   derives that view model — the header badges and the summary strip — from the
   collection so the raw records stay free of presentation concerns.
   ========================================================================== */

/** Review state of a single damage area. */
export type DamageStatus = 'pending' | 'confirmed' | 'dismissed'

/** Status of an AI finding. */
export type FindingStatus = 'supported' | 'needs_review' | 'info'

/** Badge tones available to the page (each maps to one CSS modifier). */
export type BadgeTone = 'human' | 'priority' | 'demo' | 'supported' | 'needs' | 'info'

export type EvidenceKind = 'photo' | 'document'

/** Triage priority carried by a claim. */
export type ClaimPriority = 'high' | 'medium' | 'low'

/** Workflow stage a claim sits in. */
export type ClaimStage =
  | 'new'
  | 'evidence_collection'
  | 'ai_analysis'
  | 'human_review'
  | 'completed'

/** Position of a damage area over the illustration, in percentages of its box. */
export interface DamageBBox {
  left: number
  top: number
  width: number
  height: number
}

/** A damage area as it appears in the raw collection. */
export interface ClaimDamage {
  id: string
  /** Human zone name, e.g. "Front bumper". */
  zone: string
  /** Display label for the photo tile, e.g. "Photo 1". */
  photo: string
  /** Evidence item id this damage is documented by (its photo). */
  photoId: string
  /** One-line description shown in the "Selected damage" card. */
  finding: string
  bbox: DamageBBox
  /** Review state the section opens in; the page seeds its map from this. */
  status: DamageStatus
}

export interface EvidenceItem {
  id: string
  label: string
  kind: EvidenceKind
}

export interface Finding {
  id: string
  title: string
  status: FindingStatus
  explanation: string
  /** Evidence item ids this finding relies on — rendered as teal chips. */
  evidenceIds: string[]
}

export interface PolicyRow {
  label: string
  value: string
  tone?: 'default' | 'success'
}

export interface SummaryItem {
  label: string
  value: string
}

export interface Badge {
  label: string
  tone: BadgeTone
}

/** One claim in the mock collection. */
export interface Claim {
  id: string
  customer: string
  policy: string
  /** Name of the customer's stored policy document — contract-level, not claim-specific. */
  policyDocument: string
  incidentType: string
  reportedDate: string
  priority: ClaimPriority
  status: ClaimStage
  lastUpdated: string
  evidence: EvidenceItem[]
  damages: ClaimDamage[]
  aiFindings: Finding[]
  coverage: PolicyRow[]
}

/* ------------------------------------------------------------------ */
/* View model consumed by the page's presentational components         */
/* ------------------------------------------------------------------ */

/** A damage area as the page renders it. */
export interface DamageZone {
  id: string
  zone: string
  photo: string
  /** Evidence item id (the collection's `photoId`). */
  evidenceId: string
  finding: string
  bbox: DamageBBox
  /** Initial review state; the page seeds its status map from this. */
  status: DamageStatus
}

export interface ClaimWorkspaceData {
  id: string
  customer: string
  incident: string
  dateReported: string
  /** The customer's contract policy reference (shown read-only, never uploaded). */
  policyRef: string
  /** Name of the customer's stored policy document, or null when none is on file. */
  policyDocument: string | null
  badges: Badge[]
  summary: SummaryItem[]
  evidence: EvidenceItem[]
  damage: DamageZone[]
  findings: Finding[]
  policy: PolicyRow[]
}

/** Human labels for a damage area's review state — never colour alone. */
export const DAMAGE_STATUS_LABEL: Record<DamageStatus, string> = {
  pending: 'Awaiting review',
  confirmed: 'Confirmed',
  dismissed: 'Dismissed',
}

/* ------------------------------------------------------------------ */
/* Collection                                                          */
/* ------------------------------------------------------------------ */

/**
 * The mock claim collection. Four claims, each fully self-contained and each
 * with its own set of damage areas (3, 2, 4 and 1 respectively) over different
 * zones. Ids match the shared claims queue (src/mocks/claims.ts) so the list's
 * top rows open a real workspace.
 */
export const CLAIMS: Claim[] = [
  {
    id: 'CLM-10482',
    customer: 'Sarah Mitchell',
    policy: 'POL-88214',
    policyDocument: 'Policy declaration',
    incidentType: 'Vehicle Collision',
    reportedDate: 'Oct 5, 2026',
    priority: 'high',
    status: 'human_review',
    lastUpdated: '12 min ago',
    evidence: [
      { id: 'photo-1', label: 'Front bumper', kind: 'photo' },
      { id: 'photo-2', label: 'Left fender', kind: 'photo' },
      { id: 'photo-3', label: 'Rear view', kind: 'photo' },
      { id: 'photo-4', label: 'Scene', kind: 'photo' },
      { id: 'photo-5', label: 'Plate', kind: 'photo' },
      { id: 'doc-report', label: 'Accident report', kind: 'document' },
      { id: 'doc-estimate', label: 'Repair estimate', kind: 'document' },
    ],
    damages: [
      {
        id: 'd1',
        zone: 'Front bumper',
        photo: 'Photo 1',
        photoId: 'photo-1',
        finding: 'Front bumper shows impact deformation consistent with a frontal collision.',
        bbox: { left: 27, top: 9, width: 46, height: 11 },
        status: 'pending',
      },
      {
        id: 'd2',
        zone: 'Left front fender',
        photo: 'Photo 2',
        photoId: 'photo-2',
        finding: 'Left front fender is bent; the panel gap along the door edge needs a closer look.',
        bbox: { left: 15, top: 20, width: 20, height: 20 },
        status: 'pending',
      },
      {
        id: 'd3',
        zone: 'Rear bumper',
        photo: 'Photo 3',
        photoId: 'photo-3',
        finding: 'Rear bumper shows scuffing and a possible crack along the lower edge.',
        bbox: { left: 27, top: 81, width: 46, height: 11 },
        status: 'pending',
      },
    ],
    aiFindings: [
      {
        id: 'f1',
        title: 'Front-end impact',
        status: 'supported',
        explanation: 'Photo 1 and the accident report describe the same frontal impact.',
        evidenceIds: ['photo-1', 'doc-report'],
      },
      {
        id: 'f2',
        title: 'Left fender alignment',
        status: 'needs_review',
        explanation: 'Photo 2 may show panel misalignment; a clearer angle would confirm it.',
        evidenceIds: ['photo-2'],
      },
      {
        id: 'f3',
        title: 'Rear bumper scuffing',
        status: 'info',
        explanation: 'Photo 3 shows surface scuffing consistent with the reported incident.',
        evidenceIds: ['photo-3', 'doc-estimate'],
      },
    ],
    coverage: [
      { label: 'Policy', value: 'POL-88214' },
      { label: 'Collision coverage', value: 'Included', tone: 'success' },
      { label: 'Deductible', value: '[AMOUNT]' },
      { label: 'Policy period', value: '[DATES]' },
    ],
  },
  {
    id: 'CLM-10476',
    customer: 'Daniel Carter',
    policy: 'POL-77190',
    policyDocument: 'Policy declaration',
    incidentType: 'Rear-End Collision',
    reportedDate: 'Oct 5, 2026',
    priority: 'medium',
    status: 'evidence_collection',
    lastUpdated: '34 min ago',
    evidence: [
      { id: 'photo-1', label: 'Rear bumper', kind: 'photo' },
      { id: 'photo-2', label: 'Boot lid', kind: 'photo' },
      { id: 'photo-3', label: 'Scene', kind: 'photo' },
      { id: 'doc-report', label: 'Accident report', kind: 'document' },
      { id: 'doc-estimate', label: 'Repair estimate', kind: 'document' },
    ],
    damages: [
      {
        id: 'd1',
        zone: 'Rear bumper',
        photo: 'Photo 1',
        photoId: 'photo-1',
        finding: 'Rear bumper is pushed in along the centre and its mounting clips are exposed.',
        bbox: { left: 27, top: 84, width: 46, height: 12 },
        status: 'pending',
      },
      {
        id: 'd2',
        zone: 'Boot lid',
        photo: 'Photo 2',
        photoId: 'photo-2',
        finding: 'Boot lid sits proud of the rear quarter and a seam is visible along the left edge.',
        bbox: { left: 31, top: 70, width: 38, height: 12 },
        status: 'pending',
      },
    ],
    aiFindings: [
      {
        id: 'f1',
        title: 'Rear impact',
        status: 'supported',
        explanation: 'Photo 1 and the accident report describe the same low-speed rear impact.',
        evidenceIds: ['photo-1', 'doc-report'],
      },
      {
        id: 'f2',
        title: 'Boot lid alignment',
        status: 'needs_review',
        explanation: 'Photo 2 suggests the boot lid is misaligned; a straight-on rear photo would confirm it.',
        evidenceIds: ['photo-2'],
      },
    ],
    coverage: [
      { label: 'Policy', value: 'POL-77190' },
      { label: 'Collision coverage', value: 'Included', tone: 'success' },
      { label: 'Deductible', value: '[AMOUNT]' },
      { label: 'Policy period', value: '[DATES]' },
    ],
  },
  {
    id: 'CLM-10461',
    customer: 'Emma Wilson',
    policy: 'POL-64028',
    policyDocument: 'Policy declaration',
    incidentType: 'Side Collision',
    reportedDate: 'Oct 4, 2026',
    priority: 'medium',
    status: 'human_review',
    lastUpdated: '1 hr ago',
    evidence: [
      { id: 'photo-1', label: 'Front view', kind: 'photo' },
      { id: 'photo-2', label: 'Left front fender', kind: 'photo' },
      { id: 'photo-3', label: 'Left front door', kind: 'photo' },
      { id: 'photo-4', label: 'Left rear door', kind: 'photo' },
      { id: 'photo-5', label: 'Left rear quarter', kind: 'photo' },
      { id: 'photo-6', label: 'Left mirror', kind: 'photo' },
      { id: 'photo-7', label: 'Scene 1', kind: 'photo' },
      { id: 'photo-8', label: 'Scene 2', kind: 'photo' },
      { id: 'photo-9', label: 'Plate', kind: 'photo' },
      { id: 'doc-report', label: 'Accident report', kind: 'document' },
      { id: 'doc-estimate', label: 'Repair estimate', kind: 'document' },
    ],
    damages: [
      {
        id: 'd1',
        zone: 'Left front fender',
        photo: 'Photo 2',
        photoId: 'photo-2',
        finding: 'Left front fender is scraped and slightly creased above the wheel arch.',
        bbox: { left: 15, top: 22, width: 20, height: 20 },
        status: 'pending',
      },
      {
        id: 'd2',
        zone: 'Left front door',
        photo: 'Photo 3',
        photoId: 'photo-3',
        finding: 'Left front door shows a shallow dent and paint transfer along its length.',
        bbox: { left: 15, top: 44, width: 20, height: 20 },
        status: 'pending',
      },
      {
        id: 'd3',
        zone: 'Left rear door',
        photo: 'Photo 4',
        photoId: 'photo-4',
        finding: 'Left rear door is dented near the handle; the window still seals cleanly.',
        bbox: { left: 15, top: 66, width: 20, height: 20 },
        status: 'pending',
      },
      {
        id: 'd4',
        zone: 'Left rear quarter panel',
        photo: 'Photo 5',
        photoId: 'photo-5',
        finding: 'Left rear quarter panel shows scuffing that continues toward the tail light.',
        bbox: { left: 16, top: 82, width: 20, height: 14 },
        status: 'pending',
      },
    ],
    aiFindings: [
      {
        id: 'f1',
        title: 'Left-side impact',
        status: 'supported',
        explanation: 'Photos 2–4 and the accident report describe one continuous scrape down the left side.',
        evidenceIds: ['photo-2', 'doc-report'],
      },
      {
        id: 'f2',
        title: 'Door panel alignment',
        status: 'needs_review',
        explanation: 'Photo 3 may show the front door standing proud; a level, straight-on shot would confirm it.',
        evidenceIds: ['photo-3'],
      },
      {
        id: 'f3',
        title: 'Rear quarter scuffing',
        status: 'info',
        explanation: 'Photo 5 shows surface scuffing consistent with the reported side collision.',
        evidenceIds: ['photo-5', 'doc-estimate'],
      },
    ],
    coverage: [
      { label: 'Policy', value: 'POL-64028' },
      { label: 'Collision coverage', value: 'Under review' },
      { label: 'Deductible', value: '[AMOUNT]' },
      { label: 'Policy period', value: '[DATES]' },
    ],
  },
  {
    id: 'CLM-10455',
    customer: 'James Anderson',
    policy: 'POL-59377',
    policyDocument: 'Policy declaration',
    incidentType: 'Vehicle Collision',
    reportedDate: 'Oct 4, 2026',
    priority: 'low',
    status: 'ai_analysis',
    lastUpdated: '2 hrs ago',
    evidence: [
      { id: 'photo-1', label: 'Windscreen', kind: 'photo' },
      { id: 'photo-2', label: 'Bonnet', kind: 'photo' },
      { id: 'photo-3', label: 'Scene', kind: 'photo' },
      { id: 'photo-4', label: 'Plate', kind: 'photo' },
      { id: 'doc-report', label: 'Accident report', kind: 'document' },
      { id: 'doc-estimate', label: 'Repair estimate', kind: 'document' },
    ],
    damages: [
      {
        id: 'd1',
        zone: 'Front windscreen',
        photo: 'Photo 1',
        photoId: 'photo-1',
        finding: 'Front windscreen has a star chip on the passenger side with a short crack toward the edge.',
        bbox: { left: 32, top: 14, width: 36, height: 10 },
        status: 'pending',
      },
    ],
    aiFindings: [
      {
        id: 'f1',
        title: 'Windscreen chip',
        status: 'info',
        explanation: 'Photo 1 shows a chip consistent with a small road-stone strike; no body damage is visible.',
        evidenceIds: ['photo-1', 'doc-estimate'],
      },
    ],
    coverage: [
      { label: 'Policy', value: 'POL-59377' },
      { label: 'Collision coverage', value: 'Included', tone: 'success' },
      { label: 'Deductible', value: '[AMOUNT]' },
      { label: 'Policy period', value: '[DATES]' },
    ],
  },
]

/** Lookup by id — O(1) resolution for the route. */
const BY_ID = new Map(CLAIMS.map((claim) => [claim.id, claim]))

/* ------------------------------------------------------------------ */
/* View-model derivation                                               */
/* ------------------------------------------------------------------ */

/** Workflow stage → the badge shown in the page header (if any). */
const STAGE_BADGE: Partial<Record<ClaimStage, Badge>> = {
  human_review: { label: 'HUMAN REVIEW', tone: 'human' },
  evidence_collection: { label: 'NEEDS REVIEW', tone: 'needs' },
  completed: { label: 'SUPPORTED', tone: 'supported' },
}

/** Triage priority → the badge shown in the page header (if any). */
const PRIORITY_BADGE: Partial<Record<ClaimPriority, Badge>> = {
  high: { label: 'HIGH PRIORITY', tone: 'priority' },
}

function evidenceCountLabel(count: number): string {
  return `${count} item${count === 1 ? '' : 's'}`
}

/**
 * Adapts a raw collection record into the shape the page's components render.
 * Badges and the summary strip are derived here rather than stored, so the
 * collection stays a plain description of the claim.
 */
function toWorkspace(claim: Claim): ClaimWorkspaceData {
  const badges: Badge[] = []
  const stageBadge = STAGE_BADGE[claim.status]
  if (stageBadge) badges.push(stageBadge)
  const priorityBadge = PRIORITY_BADGE[claim.priority]
  if (priorityBadge) badges.push(priorityBadge)

  return {
    id: claim.id,
    customer: claim.customer,
    incident: claim.incidentType,
    dateReported: claim.reportedDate,
    policyRef: claim.policy,
    policyDocument: claim.policyDocument,
    badges,
    summary: [
      { label: 'Customer', value: claim.customer },
      { label: 'Policy', value: claim.policy },
      { label: 'Evidence', value: evidenceCountLabel(claim.evidence.length) },
      { label: 'Last updated', value: claim.lastUpdated },
    ],
    evidence: claim.evidence,
    damage: claim.damages.map((damage) => ({
      id: damage.id,
      zone: damage.zone,
      photo: damage.photo,
      evidenceId: damage.photoId,
      finding: damage.finding,
      bbox: damage.bbox,
      status: damage.status,
    })),
    findings: claim.aiFindings,
    policy: claim.coverage,
  }
}

/** Resolves a claim id from the route to its workspace data, or null. */
export function getClaimWorkspace(id: string): ClaimWorkspaceData | null {
  const claim = BY_ID.get(id)
  return claim ? toWorkspace(claim) : null
}
