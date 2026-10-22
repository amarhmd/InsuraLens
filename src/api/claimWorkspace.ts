/* Claim workspace adapter — turns the backend's GET /api/claims/:id payload
   (ClaimDetail = claim + files + analysis) into the ClaimWorkspaceData view
   model the #/claims/:id page renders.

   The backend owns the facts; this module is the only place the API's field
   names and enums meet the page's shape. Everything the API does not supply is
   filled with a safe default here, so a claim with no analysis (or no damage at
   all) still renders instead of crashing. */

import { getClaim } from './claims'
import type {
  Badge,
  ClaimWorkspaceData,
  DamageZone,
  EvidenceItem,
  PolicyRow,
  SummaryItem,
} from '../lib/claimWorkspace'
import {
  emptyAnalysisResult,
  mapAnalysisResult,
  normalizeCoverage,
  normalizeDecision,
  normalizeEstimate,
} from '../lib/analysisResult'
import type { AnalysisResult, AnalysisStatus } from '../lib/analysisResult'
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
  recommendation?: string
}

interface ApiAnalysis {
  state?: string
  vision?: { damages?: ApiDamage[] } | null
  policy?: ApiPolicy | null
  decision?: ApiDecision | null
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
  /** Workflow stage word on the claim row ("failed", "running", …). */
  analysisState?: string
  /** Analysis summary text persisted on the claim row, when there is one. */
  damageSummary?: string | null
  /** Inconsistency flag persisted on the claim row. */
  inconsistencyFlag?: boolean
  status?: string
  priority?: string
  updatedLabel?: string
  files?: ApiFile[]
  /** The legacy vision/policy/decision analysis object, the n8n workflow's
      own payload (an array with one item, or an object with its keys), or
      null — narrowed by `legacyAnalysisOf` / detected by `isWorkflowPayload`. */
  analysis?: unknown
}

/* The n8n workflow's result: an array with one item whose key casing is
   inconsistent, or the same item as a plain object. These are the keys it
   carries that the legacy claim row/analysis never had (or spelled
   differently), used only to tell the two shapes apart — the actual mapping
   belongs to mapAnalysisResult in src/lib/analysisResult.ts. */
const WORKFLOW_PAYLOAD_KEYS = [
  'analysestate',
  'claimassessment',
  'proposeddecision',
  'inconsistencydetails',
  'damagesummary',
  'coveragestatus',
  'inconsistencyflag',
  'estimatedamount',
]

/* Markers that only appear once the backend persists the workflow's output
   onto the claim row itself — the legacy claim row always carries
   damageSummary/coverageStatus/inconsistencyFlag/analysisState, so those
   shared keys alone must not trigger this path. */
const WORKFLOW_ROOT_MARKERS = ['analysestate', 'claimassessment', 'proposeddecision', 'inconsistencydetails']

function hasAnyKey(raw: object, keys: string[]): boolean {
  const present = Object.keys(raw).map((key) => key.toLowerCase())
  return keys.some((key) => present.includes(key))
}

/** Is this the n8n workflow's payload rather than the legacy analysis? */
function isWorkflowPayload(raw: unknown): boolean {
  if (Array.isArray(raw)) return true
  if (typeof raw !== 'object' || raw === null) return false
  return hasAnyKey(raw, WORKFLOW_PAYLOAD_KEYS)
}

/** The legacy vision/policy/decision analysis, when the field holds one. */
function legacyAnalysisOf(detail: ApiClaimDetail): ApiAnalysis | null {
  const raw = detail.analysis
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  if (isWorkflowPayload(raw)) return null
  return raw as ApiAnalysis
}

/* ------------------------------------------------------------------ */
/* Mappings                                                            */
/* ------------------------------------------------------------------ */

/** Workflow stage → the header badge. */
const STAGE_BADGE: Record<string, Badge> = {
  human_review: { label: 'HUMAN REVIEW', tone: 'human' },
  evidence_collection: { label: 'NEEDS REVIEW', tone: 'needs' },
  completed: { label: 'SUPPORTED', tone: 'supported' },
}

/** Triage priority → the header badge. */
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

/** Vision damages → one plain sentence, e.g. "Windshield — Cracked (93% confidence)". */
function visionDamageSummary(damages: ApiDamage[]): string | undefined {
  const parts = damages.map((damage, index) => {
    const zone = titleCase((damage.part || `Damage ${index + 1}`).trim())
    const kind = (damage.description || '').trim()
    return `${zone}${kind ? ` — ${titleCase(kind)}` : ''}${confidenceNote(damage.confidence)}`
  })
  return parts.length > 0 ? parts.join('; ') : undefined
}

/**
 * Analysis payload → the AI analysis card's AnalysisResult.
 *
 * Three sources, most specific first:
 * 1. the n8n workflow's own payload attached as the claim's analysis
 *    (an array with one item, or an object with the workflow's keys);
 * 2. the workflow's output persisted onto the claim row itself (the strong
 *    markers the legacy claim row never carried);
 * 3. the legacy vision/policy/decision analysis, converted to the same
 *    clean type, with the claim row's flat fields filling any gap.
 *
 * The card renders from AnalysisResult only — raw payloads never reach it,
 * and an unusable payload degrades to the empty "Run AI analysis" state.
 */
function toAnalysisResult(detail: ApiClaimDetail, legacy: ApiAnalysis | null): AnalysisResult {
  if (isWorkflowPayload(detail.analysis)) {
    return mapAnalysisResult(detail.analysis) ?? emptyAnalysisResult()
  }
  if (hasAnyKey(detail, WORKFLOW_ROOT_MARKERS)) {
    return mapAnalysisResult(detail) ?? emptyAnalysisResult()
  }
  return legacyToAnalysisResult(detail, legacy)
}

/**
 * Legacy analysis (vision + policy + decision) → the same clean type the
 * workflow payload maps to. The state word decides the card's status; the
 * claim row's flat fields (damageSummary, coverageStatus, inconsistencyFlag,
 * estimatedAmount, analysisState) fill whatever the analysis object lacks.
 */
function legacyToAnalysisResult(detail: ApiClaimDetail, analysis: ApiAnalysis | null): AnalysisResult {
  const damages = analysis?.vision?.damages ?? []
  const inconsistencies = analysis?.decision?.inconsistencies ?? []
  const state = analysis?.state ?? detail.analysisState

  const failed = state === 'failed'
  const runningLike = state === 'running' || state === 'pending'
  const hasResult =
    state === 'awaiting_review' ||
    state === 'reviewing' ||
    state === 'reviewed' ||
    state === 'completed'

  const coverage = normalizeCoverage(analysis?.policy?.coverage_verdict ?? detail.coverageStatus)
  const status: AnalysisStatus = failed
    ? 'failed'
    : runningLike
      ? 'loading'
      : hasResult ||
          damages.length > 0 ||
          analysis?.policy?.coverage_verdict != null ||
          analysis?.decision != null ||
          detail.damageSummary
        ? 'success'
        : 'empty'

  const details = inconsistencies
    .slice(0, 3)
    .map((item) => {
      const label = INCONSISTENCY_LABEL[item.type ?? 'other'] ?? 'Inconsistency'
      return item.description ? `${label} — ${item.description}` : label
    })
    .join(' · ')
  const flagged = detail.inconsistencyFlag === true || inconsistencies.length > 0

  const result: AnalysisResult = {
    status,
    proposedDecision: normalizeDecision(analysis?.decision?.recommendation),
    coverage,
    inconsistency: details ? { flagged, details } : { flagged },
  }

  const estimatedAmount = normalizeEstimate(detail.estimatedAmount)
  if (estimatedAmount) result.estimatedAmount = estimatedAmount
  const damageSummary = visionDamageSummary(damages) ?? (detail.damageSummary?.trim() || undefined)
  if (damageSummary) result.damageSummary = damageSummary
  const assessment = analysis?.decision?.summary?.trim() || analysis?.policy?.reasoning?.trim() || undefined
  if (assessment) result.assessment = assessment

  return result
}

/** Policy/coverage → the "Policy & coverage" rows. Always non-empty. */
function toPolicy(detail: ApiClaimDetail, analysis: ApiAnalysis | null): PolicyRow[] {
  const rows: PolicyRow[] = []
  const verdict = analysis?.policy?.coverage_verdict ?? detail.coverageStatus ?? undefined

  rows.push({ label: 'Policy', value: detail.policyId || detail.policyRef || 'Not assigned' })
  rows.push({
    label: 'Coverage',
    value: COVERAGE_LABEL[verdict ?? ''] ?? 'Not evaluated',
    tone: verdict === 'covered' ? 'success' : undefined,
  })
  rows.push({ label: 'Estimated amount', value: money(detail.estimatedAmount) })

  for (const citation of (analysis?.policy?.citations ?? []).slice(0, 3)) {
    const label = [citation.section, citation.policy_name].filter(Boolean).join(' · ') || 'Policy clause'
    rows.push({ label, value: citation.clause_quote || '—' })
  }

  /* The AI recommendation row is gone on purpose: the AI analysis card is
     now the single place where AI output is shown. */

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
  const legacy = legacyAnalysisOf(detail)
  const damage = toDamage(legacy?.vision?.damages ?? [], evidence)
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
    analysis: toAnalysisResult(detail, legacy),
    policy: toPolicy(detail, legacy),
  }
}

/**
 * Load the workspace view model for a claim id.
 *
 * @returns the view model, or null when the backend has no such claim (404).
 */
export async function fetchClaimWorkspace(id: string): Promise<ClaimWorkspaceData | null> {
  const claim = await getClaim(id)
  if (!claim) return null
  return mapClaimDetail(claim as unknown as ApiClaimDetail)
}
