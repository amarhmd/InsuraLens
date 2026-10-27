/* ==========================================================================
   Analysis result — the clean view-model behind the AI analysis card.

   The n8n workflow returns its result as an ARRAY with one item, and its key
   casing is inconsistent ("ProposedDecision", "proposedDecision" and
   "proposeddecision" all occur in the wild). This module is the only place
   that payload meets the app: `mapAnalysisResult` accepts unknown input and
   returns either a fully normalized AnalysisResult or null when the input is
   not an object at all. The UI renders from AnalysisResult only — never from
   the raw payload.

   The module is deliberately dependency-free (like settingsStore) so the
   data gate can stage and test it directly — see
   scripts/analysis-result-check.mjs (`npm run check:analysis`).
   ========================================================================== */

/** What the analysis currently is, from the UI's point of view. */
export type AnalysisStatus = 'empty' | 'loading' | 'success' | 'failed'

/** The workflow's proposed decision, normalized. Null = nothing usable. */
export type ProposedDecision = 'approve' | 'deny' | 'request_information' | 'escalate'

/** Policy coverage as the card renders it. */
export type AnalysisCoverage = 'covered' | 'not_covered' | 'partial' | 'unable_to_evaluate'

/** Everything the AI analysis card shows. All text is plain — the card never
    renders raw HTML, so the backend's curly quotes and apostrophes pass
    through React's escaping untouched. */
export interface AnalysisResult {
  status: AnalysisStatus
  proposedDecision: ProposedDecision | null
  coverage: AnalysisCoverage
  inconsistency: { flagged: boolean; details?: string }
  /** Display string, e.g. "$1,250"; absent when the payload had none. */
  estimatedAmount?: string
  damageSummary?: string
  assessment?: string
  /** Persisted backend failure text. Plain text; never a URL. */
  error?: string
}

/** Human labels for the proposed decision — shared by the card and the
    "AI suggests:" hint on the Reviewer decision panel. */
export const PROPOSED_DECISION_LABEL: Record<ProposedDecision, string> = {
  approve: 'Approve',
  deny: 'Deny',
  request_information: 'Request information',
  escalate: 'Escalate',
}

/** Human labels for the coverage verdict. */
export const ANALYSIS_COVERAGE_LABEL: Record<AnalysisCoverage, string> = {
  covered: 'Covered',
  not_covered: 'Not covered',
  partial: 'Partially covered',
  unable_to_evaluate: 'Unable to evaluate',
}

/** The result to show when a claim carries no analysis at all. */
export function emptyAnalysisResult(): AnalysisResult {
  return {
    status: 'empty',
    proposedDecision: null,
    coverage: 'unable_to_evaluate',
    inconsistency: { flagged: false },
  }
}

/* ------------------------------------------------------------------ */
/* Normalizers (unknown in, clean value out)                           */
/* ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Trimmed display text, or undefined when there is nothing to show. */
function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

/**
 * The workflow's proposed decision → one of the four known values.
 * Anything unrecognized maps to null (the card hides the recommendation
 * rather than inventing one). `request_info` is accepted as an alias because
 * the legacy pipeline spells it that way.
 */
export function normalizeDecision(value: unknown): ProposedDecision | null {
  const raw = text(value)?.toLowerCase()
  if (raw === 'deny' || raw === 'reject') return 'deny'
  if (raw === 'approve') return 'approve'
  if (raw === 'request_information' || raw === 'request information' || raw === 'request_info') {
    return 'request_information'
  }
  if (raw === 'escalate') return 'escalate'
  return null
}

/**
 * The workflow's coverage status → the card's coverage enum. Everything not
 * explicitly recognized becomes "unable_to_evaluate" — an unknown verdict is
 * never shown as a confident one. `partial` is accepted as an alias because
 * the legacy pipeline spells it that way.
 */
export function normalizeCoverage(value: unknown): AnalysisCoverage {
  const raw = text(value)?.toLowerCase()
  if (raw === 'covered') return 'covered'
  if (raw === 'not_covered' || raw === 'not covered') return 'not_covered'
  if (raw === 'partially_covered' || raw === 'partial') return 'partial'
  return 'unable_to_evaluate'
}

/** Estimated amount → display string: numbers in the app's money style
    ("$1,250"), a bare numeric string converted to the same style, and any
    other string passed through trimmed; anything else is absent. */
export function normalizeEstimate(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `$${value.toLocaleString('en-US')}`
  }
  const raw = text(value)
  if (!raw) return undefined
  /* Edge case: the workflow sometimes sends the amount as a plain number in
     a string ("1200" or "1,200"). Render it as money too. */
  const digits = raw.replace(/[$,\s]/g, '')
  if (/^\d+(\.\d+)?$/.test(digits)) {
    const amount = Number(digits)
    if (Number.isFinite(amount)) return `$${amount.toLocaleString('en-US')}`
  }
  return raw
}

/* ------------------------------------------------------------------ */
/* The adapter                                                         */
/* ------------------------------------------------------------------ */

/**
 * Map the workflow's payload to the card's view model.
 *
 * - An array input contributes its first item (the workflow returns one).
 * - An object input is used as-is.
 * - Anything else (null, a string, a number, an empty array) returns null —
 *   callers fall back to `emptyAnalysisResult()`.
 *
 * Keys are read case-insensitively, and the workflow's "analyseState" is
 * accepted under the claim row's "analysisState" spelling as well.
 */
export function mapAnalysisResult(raw: unknown): AnalysisResult | null {
  let item: unknown = raw
  if (Array.isArray(item)) item = item[0]
  if (!isRecord(item)) return null

  const fields: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(item)) {
    fields[key.toLowerCase()] = value
  }

  const statusRaw = fields.analysestate ?? fields.analysisstate
  const status: AnalysisStatus = (() => {
    const value = text(statusRaw)?.toLowerCase()
    if (value === 'completed' || value === 'analyzed') return 'success'
    if (value === 'failed' || value === 'error') return 'failed'
    if (value === 'running' || value === 'processing' || value === 'pending') return 'loading'
    /* Missing or unrecognized: nothing to show — invite a run. */
    return 'empty'
  })()

  const flag = fields.inconsistencyflag
  const flagged = flag === true || (typeof flag === 'string' && flag.trim().toLowerCase() === 'true')
  const details = text(fields.inconsistencydetails)

  const result: AnalysisResult = {
    status,
    proposedDecision: normalizeDecision(fields.proposeddecision),
    coverage: normalizeCoverage(fields.coveragestatus),
    inconsistency: details ? { flagged, details } : { flagged },
  }

  const estimatedAmount = normalizeEstimate(fields.estimatedamount)
  if (estimatedAmount) result.estimatedAmount = estimatedAmount
  const damageSummary = text(fields.damagesummary)
  if (damageSummary) result.damageSummary = damageSummary
  const assessment = text(fields.claimassessment)
  if (assessment) result.assessment = assessment
  const error = text(fields.analysiserror ?? fields.error ?? fields.errormessage)
  if (error) result.error = error

  return result
}
