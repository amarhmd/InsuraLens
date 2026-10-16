/* Claim workspace adapter — turns the backend's GET /api/claims/:id payload
   (ClaimDetail = claim + files + analysis) into the ClaimWorkspaceData view
   model the #/claims/:id page renders.

   The backend owns the facts; this module is the only place the API's field
   names and enums meet the page's shape. Everything the API does not supply is
   filled with a safe default here, so a claim with no analysis (or no damage at
   all) still renders instead of crashing.

   Demo mode (VITE_USE_DEMO=true) returns the rich local dataset from
   src/data/claim.ts unchanged, so the prototype keeps working offline. */

import { getClaim } from './claims'
import { USE_DEMO } from './http'
import { getClaimWorkspace } from '../data/claim'
import type {
  Badge,
  ClaimWorkspaceData,
  DamageZone,
  EvidenceItem,
  Finding,
  PolicyRow,
  SummaryItem,
} from '../data/claim'
import { incidentLabel } from '../lib/constants'
import type { IncidentType } from '../lib/constants'

/* ------------------------------------------------------------------ */
/* Raw backend shapes (only the fields the mapper reads)               */
/* ------------------------------------------------------------------ */

interface ApiFile {
  id?: string
  kind?: string
  name?: string
  mimeType?: string
  url?: string
}

interface ApiDamage {
  part?: string
  description?: string
  confidence?: number
  image_ref?: string | null
  region?: string | null
  needs_verification?: boolean
  source_id?: string
}

interface ApiEvidenceRef {
  source_id?: string
}

interface ApiCitation {
  policy_name?: string
  section?: string
  clause_quote?: string
  source_id?: string
}

interface ApiPolicy {
  coverage_verdict?: string
  citations?: ApiCitation[]
  reasoning?: string
  unmatched_damage?: string[]
}

interface ApiInconsistency {
  type?: string
  severity?: string
  description?: string
  evidence?: ApiEvidenceRef[]
}

interface ApiDecision {
  summary?: string
  coverage?: string
  inconsistencies?: ApiInconsistency[]
  missing_information?: string[]
  recommendation?: string
}

interface ApiAnalysis {
  state?: string
  vision?: { damages?: ApiDamage[] } | null
  policy?: ApiPolicy | null
  decision?: ApiDecision | null
  error?: string | null
}

/** A claim as `getClaim` returns it: the UI Claim plus the raw detail. */
interface ApiClaimDetail {
  id?: string
  customer?: string
  customerName?: string
  incident?: string
  incidentType?: string
  dateReported?: string
  policyRef?: string
  policyId?: string
  estimatedAmount?: number | null
  coverageStatus?: string | null
  status?: string
  priority?: string
  updatedLabel?: string
  files?: ApiFile[]
  analysis?: ApiAnalysis | null
}

/* ------------------------------------------------------------------ */
/* Mappings                                                            */
/* ------------------------------------------------------------------ */

/** Workflow stage → the header badge (mirrors src/data/claim.ts). */
const STAGE_BADGE: Record<string, Badge> = {
  human_review: { label: 'HUMAN REVIEW', tone: 'human' },
  evidence_collection: { label: 'NEEDS REVIEW', tone: 'needs' },
  completed: { label: 'SUPPORTED', tone: 'supported' },
}

/** Triage priority → the header badge (mirrors src/data/claim.ts). */
const PRIORITY_BADGE: Record<string, Badge> = {
  high: { label: 'HIGH PRIORITY', tone: 'priority' },
}

const COVERAGE_LABEL: Record<string, string> = {
  covered: 'Covered',
  partial: 'Partial',
  not_covered: 'Not covered',
  unclear: 'Unclear',
}

const INCONSISTENCY_LABEL: Record<string, string> = {
  date_mismatch: 'Date mismatch',
  location_mismatch: 'Location mismatch',
  damage_mismatch: 'Damage mismatch',
  missing_document: 'Missing document',
  other: 'Inconsistency',
}

/* The API carries no damage coordinates. These authored, non-overlapping slots
   give each detected area a stable place on the illustration; the map's boxes
   are hidden by the "Damage boxes" AI preference anyway. Cycled by index. */
const BOX_PRESETS = [
  { left: 27, top: 8, width: 46, height: 11 },
  { left: 14, top: 24, width: 20, height: 18 },
  { left: 66, top: 24, width: 20, height: 18 },
  { left: 27, top: 80, width: 46, height: 11 },
  { left: 14, top: 48, width: 20, height: 16 },
  { left: 66, top: 48, width: 20, height: 16 },
]

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function confidenceNote(confidence?: number): string {
  return typeof confidence === 'number' ? ` (${Math.round(confidence * 100)}% confidence)` : ''
}

function money(value?: number | null): string {
  return typeof value === 'number' ? `$${value.toLocaleString('en-US')}` : 'Not provided'
}

function evidenceCountLabel(count: number): string {
  return `${count} item${count === 1 ? '' : 's'}`
}

/**
 * Backend files → evidence tiles (image → photo, everything else → document).
 * A `policy` file is the customer's contract document, not claim evidence, so
 * it is left out here and surfaced read-only by `toPolicyDocument`.
 */
function toEvidence(files: ApiFile[]): EvidenceItem[] {
  return files
    .filter((file) => file.kind !== 'policy')
    .map((file, index) => ({
      id: file.id ?? `file-${index + 1}`,
      label: file.name?.trim() || `File ${index + 1}`,
      kind: file.kind === 'image' ? 'photo' : 'document',
    }))
}

/** The contract-level policy file on the claim, if the backend sent one. */
function toPolicyDocument(files: ApiFile[]): string | null {
  const file = files.find((candidate) => candidate.kind === 'policy')
  return file?.name?.trim() || (file ? 'Policy declaration' : null)
}

/** Vision damages → selectable damage areas (coordinates defaulted). */
function toDamage(damages: ApiDamage[], evidence: EvidenceItem[]): DamageZone[] {
  return damages.map((damage, index) => {
    const linked = damage.image_ref
      ? evidence.find((item) => item.id === damage.image_ref)
      : undefined
    const zone = titleCase((damage.part || `Damage ${index + 1}`).trim())
    const description = (damage.description || '').trim()

    return {
      id: `d${index + 1}`,
      zone,
      photo: linked?.label ?? `Photo ${index + 1}`,
      /* '' (not a matching id) makes DamageDetail fall back to the photo label. */
      evidenceId: linked?.id ?? '',
      finding: description
        ? `${titleCase(description)}${confidenceNote(damage.confidence)}`
        : `Vision agent reported damage to ${zone.toLowerCase()}${confidenceNote(damage.confidence)}.`,
      bbox: BOX_PRESETS[index % BOX_PRESETS.length],
      status: 'pending',
    }
  })
}

/** Vision + decision output → the "AI findings" cards. Empty when no analysis. */
function toFindings(detail: ApiClaimDetail, damages: DamageZone[], evidence: EvidenceItem[]): Finding[] {
  const analysis = detail.analysis
  const findings: Finding[] = []

  /* One finding per detected damage area. */
  const apiDamages = analysis?.vision?.damages ?? []
  apiDamages.forEach((damage, index) => {
    const linked = damage.image_ref && evidence.some((item) => item.id === damage.image_ref)
    findings.push({
      id: `f-v${index + 1}`,
      title: damages[index]?.zone ?? `Damage ${index + 1}`,
      status: damage.needs_verification ? 'needs_review' : 'supported',
      explanation: `${(damage.description || 'Detected in the attached photos.').trim()}${confidenceNote(
        damage.confidence,
      )}`,
      evidenceIds: linked && damage.image_ref ? [damage.image_ref] : [],
    })
  })

  /* Decision-agent inconsistencies. */
  const inconsistencies = analysis?.decision?.inconsistencies ?? []
  inconsistencies.forEach((item, index) => {
    findings.push({
      id: `f-i${index + 1}`,
      title: INCONSISTENCY_LABEL[item.type ?? 'other'] ?? 'Inconsistency',
      status: item.severity === 'high' || item.severity === 'medium' ? 'needs_review' : 'info',
      explanation: item.description || 'Flagged by the decision agent.',
      evidenceIds: (item.evidence ?? [])
        .map((ref) => ref.source_id)
        .filter((id): id is string => Boolean(id)),
    })
  })

  /* Missing information and unmatched damage both block a clean decision. */
  const missing = analysis?.decision?.missing_information ?? []
  if (missing.length > 0) {
    findings.push({
      id: 'f-missing',
      title: 'Missing information',
      status: 'needs_review',
      explanation: missing.join(' '),
      evidenceIds: [],
    })
  }

  const unmatched = analysis?.policy?.unmatched_damage ?? []
  if (unmatched.length > 0) {
    findings.push({
      id: 'f-unmatched',
      title: 'Damage not matched to policy',
      status: 'needs_review',
      explanation: unmatched.join(' '),
      evidenceIds: [],
    })
  }

  /* The narrative summary reads best last. */
  const summary = analysis?.decision?.summary
  if (summary) {
    findings.push({
      id: 'f-summary',
      title: 'Assessment summary',
      status: 'info',
      explanation: summary,
      evidenceIds: [],
    })
  }

  return findings
}

/** Policy/coverage → the "Policy & coverage" rows. Always non-empty. */
function toPolicy(detail: ApiClaimDetail): PolicyRow[] {
  const rows: PolicyRow[] = []
  const verdict = detail.analysis?.policy?.coverage_verdict ?? detail.coverageStatus ?? undefined

  rows.push({ label: 'Policy', value: detail.policyId || detail.policyRef || 'Not assigned' })
  rows.push({
    label: 'Coverage',
    value: COVERAGE_LABEL[verdict ?? ''] ?? 'Not evaluated',
    tone: verdict === 'covered' ? 'success' : undefined,
  })
  rows.push({ label: 'Estimated amount', value: money(detail.estimatedAmount) })

  for (const citation of (detail.analysis?.policy?.citations ?? []).slice(0, 3)) {
    const label = [citation.section, citation.policy_name].filter(Boolean).join(' · ') || 'Policy clause'
    rows.push({ label, value: citation.clause_quote || '—' })
  }

  const recommendation = detail.analysis?.decision?.recommendation
  if (recommendation) {
    rows.push({
      label: 'AI recommendation',
      value: recommendation === 'approve' ? 'Approve' : 'Request more information',
    })
  }

  return rows
}

function toSummary(detail: ApiClaimDetail, evidence: EvidenceItem[]): SummaryItem[] {
  return [
    { label: 'Customer', value: detail.customer || detail.customerName || 'Unknown' },
    { label: 'Policy', value: detail.policyId || detail.policyRef || 'Not assigned' },
    { label: 'Evidence', value: evidenceCountLabel(evidence.length) },
    { label: 'Last updated', value: detail.updatedLabel || 'Unknown' },
  ]
}

function buildBadges(status?: string, priority?: string): Badge[] {
  const badges: Badge[] = []
  const stageBadge = status ? STAGE_BADGE[status] : undefined
  if (stageBadge) badges.push(stageBadge)
  const priorityBadge = priority ? PRIORITY_BADGE[priority] : undefined
  if (priorityBadge) badges.push(priorityBadge)
  return badges
}

/** Map one backend ClaimDetail to the workspace view model. */
export function mapClaimDetail(detail: ApiClaimDetail): ClaimWorkspaceData {
  const files = Array.isArray(detail.files) ? detail.files : []
  const evidence = toEvidence(files)
  const damage = toDamage(detail.analysis?.vision?.damages ?? [], evidence)
  const incident = detail.incident || detail.incidentType || 'other'

  return {
    id: detail.id ?? 'Unknown claim',
    customer: detail.customer || detail.customerName || 'Unknown',
    incident: incidentLabel(incident as IncidentType),
    dateReported: detail.dateReported || 'Unknown',
    policyRef: detail.policyId || detail.policyRef || 'Not assigned',
    policyDocument: toPolicyDocument(files),
    badges: buildBadges(detail.status, detail.priority),
    summary: toSummary(detail, evidence),
    evidence,
    damage,
    findings: toFindings(detail, damage, evidence),
    policy: toPolicy(detail),
  }
}

/**
 * Load the workspace view model for a claim id.
 *
 * @returns the view model, or null when the backend has no such claim (404).
 */
export async function fetchClaimWorkspace(id: string): Promise<ClaimWorkspaceData | null> {
  if (USE_DEMO) return getClaimWorkspace(id)

  const claim = await getClaim(id)
  if (!claim) return null
  return mapClaimDetail(claim as unknown as ApiClaimDetail)
}
