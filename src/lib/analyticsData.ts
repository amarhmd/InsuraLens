/* ==========================================================================
   Analytics — one shared mock source for every chart, KPI, table, and
   observation on #/analytics.

   Rules this module exists to enforce:

   * Single source. The page calls selectAnalytics(filters) once and hands the
     result to every component, so a KPI, a chart, and a table row can never
     disagree about the same selection.
   * Filters flow through everything. Date range, incident type, and workflow
     status narrow the claim list first; every selector then reads that list.
   * Honest numbers. KPIs are counts or floored percentages of the demo
     dataset (src/mocks/claims.ts) — no invented accuracy scores, no
     fabricated deltas. Comparisons only appear when the demo data actually
     contains a previous period to compare against (only 7/30/90-day windows
     have one, and only the 7-day window has claims in it). The claims-volume
     chart spreads each period's exact total over an illustrative weekday
     curve, so its totals still match the KPIs — only the within-period shape
     is drawn.
   * Illustrative only. Nothing here connects to a live insurance system.

   Fixed demo anchor: DEMO_TODAY = Oct 6 2026. Date windows count backwards
   from it so the demo is deterministic; the dataset itself spans
   Sep 10 – Oct 5 2026.
   ========================================================================== */

import {
  CLAIM_STATUSES,
  INCIDENT_TYPES,
  mockClaims,
  type Claim,
  type ClaimStatus,
  type IncidentType,
} from './claimsData'
import { incidentLabel, priorityRank, stageLabel } from './constants'

export { SAMPLE_WORKFLOW_METRICS } from '../mocks/analytics'

/* -------------------------------------------------------------------------- */
/* Demo anchor & date windows                                                 */
/* -------------------------------------------------------------------------- */

const DEMO_TODAY = Date.UTC(2026, 9, 6) // Oct 6 2026, 00:00 UTC
const DAY = 86_400_000

/** Half-open window [start, end) in epoch ms. */
interface DateWindow {
  start: number
  end: number
}

export type DateRangeKey = '7d' | '30d' | '90d' | 'year'

export function dateWindow(range: DateRangeKey): DateWindow {
  if (range === 'year') return { start: Date.UTC(2026, 0, 1), end: DEMO_TODAY }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  return { start: DEMO_TODAY - days * DAY, end: DEMO_TODAY }
}

/**
 * Equal-length window immediately before the current one. Returns null for
 * "This year" (there is no comparable prior span in the demo data), and the
 * caller treats an empty previous window as "no comparison supported" rather
 * than reading it as a 100% drop.
 */
export function previousWindow(range: DateRangeKey): DateWindow | null {
  if (range === 'year') return null
  const { start, end } = dateWindow(range)
  const span = end - start
  return { start: start - span, end: start }
}

/* -------------------------------------------------------------------------- */
/* Filters                                                                    */
/* -------------------------------------------------------------------------- */

export type IncidentFilterKey = 'all' | 'vehicle' | 'rear-end' | 'side' | 'other'
export type WorkflowFilterKey = 'all' | ClaimStatus

export interface AnalyticsFilters {
  dateRange: DateRangeKey
  incident: IncidentFilterKey
  workflow: WorkflowFilterKey
}

export const DEFAULT_FILTERS: AnalyticsFilters = {
  dateRange: '30d',
  incident: 'all',
  workflow: 'all',
}

export interface FilterOption<T extends string> {
  value: T
  label: string
}

export const DATE_RANGE_OPTIONS: FilterOption<DateRangeKey>[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'year', label: 'This year' },
]

export const INCIDENT_FILTER_OPTIONS: FilterOption<IncidentFilterKey>[] = [
  { value: 'all', label: 'All incidents' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'rear-end', label: 'Rear-end' },
  { value: 'side', label: 'Side' },
  { value: 'other', label: 'Other' },
]

export const WORKFLOW_FILTER_OPTIONS: FilterOption<WorkflowFilterKey>[] = [
  { value: 'all', label: 'All workflow stages' },
  ...CLAIM_STATUSES.map((status) => ({ value: status as WorkflowFilterKey, label: stageLabel(status) })),
]

/* Filter keys stay short UI vocabulary; they resolve to incident tokens. */
const INCIDENT_MATCH: Record<IncidentFilterKey, IncidentType[] | null> = {
  all: null,
  vehicle: ['vehicle_collision'],
  'rear-end': ['rear_end_collision'],
  side: ['side_collision'],
  other: ['other'],
}

function optionLabel<T extends string>(options: FilterOption<T>[], value: T): string {
  return options.find((option) => option.value === value)?.label ?? value
}

/** How many filters differ from the defaults — drives the "active" chip. */
export function activeFilterCount(filters: AnalyticsFilters): number {
  return (
    (filters.dateRange === DEFAULT_FILTERS.dateRange ? 0 : 1) +
    (filters.incident === DEFAULT_FILTERS.incident ? 0 : 1) +
    (filters.workflow === DEFAULT_FILTERS.workflow ? 0 : 1)
  )
}

function matchesNonDateFilters(claim: Claim, filters: AnalyticsFilters): boolean {
  const incidents = INCIDENT_MATCH[filters.incident]
  if (incidents && !incidents.includes(claim.incident)) return false
  if (filters.workflow !== 'all' && claim.status !== filters.workflow) return false
  return true
}

/** The selection every chart, KPI, and table on the page reads from. */
export function filterClaims(
  filters: AnalyticsFilters,
  window: DateWindow = dateWindow(filters.dateRange),
  source: ReadonlyArray<Claim> = mockClaims,
): Claim[] {
  return source.filter(
    (claim) =>
      claim.dateReportedValue >= window.start &&
      claim.dateReportedValue < window.end &&
      matchesNonDateFilters(claim, filters),
  )
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

const pct = (part: number, total: number): number =>
  total === 0 ? 0 : Math.round((part / total) * 100)

/**
 * Integer percentages that always sum to exactly 100 (largest-remainder
 * method), so a stacked breakdown never reads 99% or 101%.
 */
function percentages(counts: number[], total: number): number[] {
  if (total <= 0) return counts.map(() => 0)
  const raw = counts.map((count) => (count / total) * 100)
  const out = raw.map((value) => Math.floor(value))
  let remainder = 100 - out.reduce((sum, value) => sum + value, 0)
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) {
    out[order[k].index] += 1
  }
  return out
}

const shortDate = (ms: number): string =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

const longDate = (ms: number): string =>
  new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })

const monthShort = (ms: number): string =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })

const monthLong = (ms: number): string =>
  new Date(ms).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/* -------------------------------------------------------------------------- */
/* KPIs                                                                       */
/* -------------------------------------------------------------------------- */

export interface AnalyticsKpis {
  /** Claims reported inside the selection. */
  received: number
  /**
   * Change vs the previous equal-length window. Null unless the demo data has
   * claims in that previous window — an absent dataset is not a trend.
   */
  receivedDelta: number | null
  /** Non-completed claims: New, Evidence Collection, AI Analysis, Human Review. */
  underReview: number
  /** Claims with all required evidence on file, floored so we never overstate. */
  evidenceCompletion: number
  /** Claims sitting in the Human Review stage. */
  humanReviewPending: number
}

function selectKpis(claims: Claim[], previousClaims: Claim[] | null): AnalyticsKpis {
  const received = claims.length
  const withEvidence = claims.filter((claim) => claim.evidence === 'Complete').length
  return {
    received,
    receivedDelta:
      previousClaims && previousClaims.length > 0 ? received - previousClaims.length : null,
    underReview: claims.filter((claim) => claim.status !== 'completed').length,
    evidenceCompletion: received === 0 ? 0 : Math.floor((withEvidence / received) * 100),
    humanReviewPending: claims.filter((claim) => claim.status === 'human_review').length,
  }
}

/* -------------------------------------------------------------------------- */
/* Time-bucketed series (claims volume + AI activity share these buckets)     */
/* -------------------------------------------------------------------------- */

type BucketGranularity = 'day' | 'week' | 'month'

export interface ChartBucket {
  key: string
  /** Axis label, e.g. "Oct 4" or "Sep". */
  label: string
  /** Tooltip label, e.g. "Oct 4, 2026" or "Sep 29 – Oct 5, 2026". */
  fullLabel: string
  start: number
  end: number
}

function granularityFor(range: DateRangeKey): BucketGranularity {
  if (range === '90d') return 'week'
  if (range === 'year') return 'month'
  return 'day'
}

function bucketEdges(window: DateWindow, granularity: BucketGranularity): ChartBucket[] {
  const edges: Array<{ start: number; end: number }> = []

  if (granularity === 'day') {
    for (let t = window.start; t < window.end; t += DAY) {
      edges.push({ start: t, end: Math.min(t + DAY, window.end) })
    }
  } else if (granularity === 'week') {
    for (let t = window.start; t < window.end; t += 7 * DAY) {
      edges.push({ start: t, end: Math.min(t + 7 * DAY, window.end) })
    }
  } else {
    let cursor = window.start
    while (cursor < window.end) {
      const d = new Date(cursor)
      const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
      edges.push({ start: cursor, end: Math.min(next, window.end) })
      cursor = next
    }
  }

  return edges.map(({ start, end }, index) => {
    let label: string
    let fullLabel: string
    if (granularity === 'month') {
      label = monthShort(start)
      fullLabel = monthLong(start)
    } else if (granularity === 'week') {
      label = shortDate(start)
      fullLabel = `${shortDate(start)} – ${longDate(end - DAY)}`
    } else {
      label = shortDate(start)
      fullLabel = longDate(start)
    }
    return { key: `b${index}`, label, fullLabel, start, end }
  })
}

/** Buckets + granularity for a filter selection — shared by both line/column charts. */
function selectBuckets(filters: AnalyticsFilters): {
  granularity: BucketGranularity
  buckets: ChartBucket[]
} {
  const granularity = granularityFor(filters.dateRange)
  return { granularity, buckets: bucketEdges(dateWindow(filters.dateRange), granularity) }
}

/** Nice y-axis ceiling: multiple of 4, at least 4, above the peak value. */
function niceMax(peak: number): number {
  return Math.max(4, Math.ceil(peak / 4) * 4)
}

const GRANULARITY_WORD: Record<BucketGranularity, string> = {
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
}

export interface VolumeSeries {
  granularity: BucketGranularity
  buckets: ChartBucket[]
  /** Claims received per bucket. */
  received: number[]
  /** Reviews completed (status Completed) per bucket, by intake date. */
  completed: number[]
  peak: number
  yMax: number
  /** True when there is nothing to plot — the chart shows its fallback. */
  empty: boolean
  description: string
}

/**
 * Intra-period shape for the two demo series. The dataset is generated in
 * flat weekly runs, so bucketing raw intake dates draws a near-straight line;
 * each period total is instead spread over a believable curve — weekday-heavy
 * intake, weekday-shaped review work. Totals still equal the selection
 * exactly (largest-remainder distribution below), so the chart, its tooltip,
 * its table view, and every KPI on the page keep agreeing.
 */
function intakeShape(bucket: ChartBucket, granularity: BucketGranularity): number {
  const t = Math.floor(bucket.start / DAY)
  const wave = 1 + 0.45 * Math.sin(t * 0.9 + 1.3) + 0.3 * Math.sin(t * 0.37 + 0.6)
  if (granularity !== 'day') return Math.max(0.15, wave)
  const dow = new Date(bucket.start).getUTCDay()
  const weekend = dow === 0 || dow === 6 ? 0.4 : 1
  return Math.max(0.1, weekend * wave)
}

function reviewShape(bucket: ChartBucket, granularity: BucketGranularity): number {
  const t = Math.floor(bucket.start / DAY)
  const wave = 1 + 0.5 * Math.sin(t * 0.73 + 2.4) + 0.28 * Math.sin(t * 0.31 + 3.1)
  if (granularity !== 'day') return Math.max(0.12, wave)
  const dow = new Date(bucket.start).getUTCDay()
  const weekend = dow === 0 || dow === 6 ? 0.3 : 1
  return Math.max(0.08, weekend * wave)
}

/** Split an exact total across buckets by weight (largest remainder). */
function distribute(total: number, weights: number[]): number[] {
  if (total <= 0 || weights.length === 0) return weights.map(() => 0)
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  if (weightSum <= 0) return weights.map(() => 0)
  const raw = weights.map((weight) => (weight / weightSum) * total)
  const out = raw.map((value) => Math.floor(value))
  let remainder = total - out.reduce((sum, value) => sum + value, 0)
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) {
    out[order[k].index] += 1
  }
  return out
}

export function selectVolume(filters: AnalyticsFilters, claims: Claim[]): VolumeSeries {
  const { granularity, buckets } = selectBuckets(filters)
  const received = distribute(
    claims.length,
    buckets.map((bucket) => intakeShape(bucket, granularity)),
  )
  const completed = distribute(
    claims.filter((claim) => claim.status === 'completed').length,
    buckets.map((bucket) => reviewShape(bucket, granularity)),
  )

  const peak = buckets.reduce((max, _bucket, index) => Math.max(max, received[index], completed[index]), 0)
  const window = dateWindow(filters.dateRange)

  return {
    granularity,
    buckets,
    received,
    completed,
    peak,
    yMax: niceMax(peak),
    empty: buckets.length === 0,
    description: `${GRANULARITY_WORD[granularity]} claims received and reviews completed between ${longDate(
      window.start,
    )} and ${longDate(window.end - DAY)}.`,
  }
}

interface ActivitySeries {
  granularity: BucketGranularity
  buckets: ChartBucket[]
  /** Claims whose analysis is Available, bucketed by intake date. */
  values: number[]
  peak: number
  yMax: number
  /** True when no bucket holds a completed analysis — chart shows its fallback. */
  empty: boolean
  description: string
}

function selectAiActivity(filters: AnalyticsFilters, claims: Claim[]): ActivitySeries {
  const { granularity, buckets } = selectBuckets(filters)
  const values = buckets.map(() => 0)

  for (const claim of claims) {
    if (claim.aiAnalysis !== 'Available') continue
    const index = buckets.findIndex(
      (bucket) => claim.dateReportedValue >= bucket.start && claim.dateReportedValue < bucket.end,
    )
    if (index >= 0) values[index] += 1
  }

  const peak = buckets.reduce((max, _bucket, index) => Math.max(max, values[index]), 0)
  const window = dateWindow(filters.dateRange)

  return {
    granularity,
    buckets,
    values,
    peak,
    yMax: niceMax(peak),
    empty: buckets.length === 0 || peak === 0,
    description: `${GRANULARITY_WORD[granularity]} completed AI-assisted analyses between ${longDate(
      window.start,
    )} and ${longDate(window.end - DAY)}.`,
  }
}

/* -------------------------------------------------------------------------- */
/* Categorical distributions                                                  */
/* -------------------------------------------------------------------------- */

export interface DistributionRow {
  key: string
  label: string
  count: number
  /** Share of the selection, integers summing to 100. */
  percent: number
  /** Bar tone suffix — pairs with the count text so colour is never the only cue. */
  tone: string
}

const WORKFLOW_TONE: Record<ClaimStatus, string> = {
  new: 'slate',
  evidence_collection: 'blue',
  ai_analysis: 'teal',
  human_review: 'amber',
  completed: 'green',
}

/** Stage order (New → Completed), for the distribution bars. */
function selectWorkflow(claims: Claim[]): DistributionRow[] {
  const counts = CLAIM_STATUSES.map(
    (status) => claims.filter((claim) => claim.status === status).length,
  )
  const shares = percentages(counts, claims.length)
  return CLAIM_STATUSES.map((status, index) => ({
    key: status,
    label: stageLabel(status),
    count: counts[index],
    percent: shares[index],
    tone: WORKFLOW_TONE[status],
  }))
}

/** Incident mix, largest first so the leading category reads at a glance. */
function selectIncidents(claims: Claim[]): DistributionRow[] {
  const rows = INCIDENT_TYPES.map((incident) => ({
    key: incident,
    label: incidentLabel(incident),
    count: claims.filter((claim) => claim.incident === incident).length,
    tone: 'navy',
  }))
  const shares = percentages(
    rows.map((row) => row.count),
    claims.length,
  )
  return rows
    .map((row, index) => ({ ...row, percent: shares[index] }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

/* -------------------------------------------------------------------------- */
/* Evidence completeness                                                      */
/* -------------------------------------------------------------------------- */

export type EvidenceCategory =
  | 'Complete'
  | 'Missing Documents'
  | 'Awaiting Customer Information'
  | 'Requires Verification'

/**
 * Four mutually exclusive buckets whose counts sum to the selection:
 *
 *  * Missing Documents            — evidence still Incomplete in Evidence Collection
 *  * Awaiting Customer Information — evidence still Incomplete at intake (New)
 *  * Requires Verification        — documents on file, but the policy match
 *                                   is inconclusive and needs a reviewer
 *  * Complete                     — everything else
 *
 * The third row is the distinction the brief asks for: evidence present but
 * not yet conclusive is not the same problem as evidence that is absent.
 */
export function evidenceCategory(claim: Claim): EvidenceCategory {
  if (claim.evidence === 'Incomplete') {
    return claim.status === 'new' ? 'Awaiting Customer Information' : 'Missing Documents'
  }
  if (claim.policyMatch === 'Requires Review') return 'Requires Verification'
  return 'Complete'
}

const EVIDENCE_TONE: Record<EvidenceCategory, string> = {
  Complete: 'green',
  'Missing Documents': 'amber',
  'Awaiting Customer Information': 'blue',
  'Requires Verification': 'teal',
}

const EVIDENCE_ORDER: EvidenceCategory[] = [
  'Complete',
  'Missing Documents',
  'Awaiting Customer Information',
  'Requires Verification',
]

export interface EvidenceSnapshot {
  rows: DistributionRow[]
  /** Missing Documents + Awaiting Customer Information. */
  missing: number
  /** Documents present but inconclusive. */
  verification: number
  total: number
  /** Two-part insight: absent evidence vs present-but-inconclusive evidence. */
  insight: string
}

function selectEvidence(claims: Claim[]): EvidenceSnapshot {
  const counts = EVIDENCE_ORDER.map(
    (category) => claims.filter((claim) => evidenceCategory(claim) === category).length,
  )
  const shares = percentages(counts, claims.length)
  const rows: DistributionRow[] = EVIDENCE_ORDER.map((category, index) => ({
    key: category,
    label: category,
    count: counts[index],
    percent: shares[index],
    tone: EVIDENCE_TONE[category],
  }))

  const missing = counts[1] + counts[2]
  const verification = counts[3]
  const total = claims.length

  let insight: string
  if (missing === 0 && verification === 0) {
    insight =
      total === 0
        ? 'No claims in this selection.'
        : `All ${total} claim${total === 1 ? '' : 's'} in this selection have complete evidence and no outstanding verification.`
  } else {
    const parts: string[] = []
    if (missing > 0) {
      parts.push(
        `${missing} claim${missing === 1 ? '' : 's'} (${pct(missing, total)}%) still need documents or customer information before analysis can finish`,
      )
    }
    if (verification > 0) {
      parts.push(
        `${verification} claim${verification === 1 ? '' : 's'} (${pct(verification, total)}%) have evidence on file but a policy match that still needs reviewer verification`,
      )
    }
    insight = `${parts.join('; ')}.`
  }

  return { rows, missing, verification, total, insight }
}

/* -------------------------------------------------------------------------- */
/* AI-assisted analysis                                                       */
/* -------------------------------------------------------------------------- */

interface AiMetric {
  key: string
  label: string
  value: string
  hint: string
}

export interface AiSnapshot {
  metrics: AiMetric[]
  /** Completed analyses over time (same buckets as the volume chart). */
  activity: ActivitySeries
  /**
   * Exclusive outcome partition — every claim in the selection lands in
   * exactly one row, so the counts sum to the selection size.
   */
  outcomes: DistributionRow[]
  /**
   * One derived sentence that reconciles the "Analyses completed" metric
   * with the outcome rows and the AI Analysis stage count, so the three
   * numbers on this panel can never be read against each other.
   */
  caption: string
}

type OutcomeKey =
  | 'linked'
  | 'needs-evidence'
  | 'verification'
  | 'incomplete'
  | 'in-progress'
  | 'awaiting'

const OUTCOME_LABEL: Record<OutcomeKey, string> = {
  linked: 'Findings with linked sources',
  'needs-evidence': 'Findings requiring additional evidence',
  verification: 'Findings requiring reviewer verification',
  incomplete: 'Analyses with incomplete information',
  'in-progress': 'Analysis in progress',
  awaiting: 'Awaiting analysis',
}

const OUTCOME_TONE: Record<OutcomeKey, string> = {
  linked: 'green',
  'needs-evidence': 'amber',
  verification: 'blue',
  incomplete: 'critical',
  'in-progress': 'teal',
  awaiting: 'slate',
}

/** Spec order first, then the two states needed to cover the whole selection. */
const OUTCOME_ORDER: OutcomeKey[] = [
  'linked',
  'needs-evidence',
  'verification',
  'incomplete',
  'in-progress',
  'awaiting',
]

function outcomeKey(claim: Claim): OutcomeKey {
  if (claim.aiAnalysis === 'Incomplete') return 'incomplete'
  if (claim.evidence === 'Incomplete') return 'needs-evidence'
  if (claim.policyMatch === 'Requires Review') return 'verification'
  if (claim.aiAnalysis === 'Available') return 'linked'
  if (claim.aiAnalysis === 'Processing') return 'in-progress'
  return 'awaiting'
}

function selectAi(filters: AnalyticsFilters, claims: Claim[]): AiSnapshot {
  const counts = OUTCOME_ORDER.map(
    (key) => claims.filter((claim) => outcomeKey(claim) === key).length,
  )
  const shares = percentages(counts, claims.length)
  const outcomes: DistributionRow[] = OUTCOME_ORDER.map((key, index) => ({
    key,
    label: OUTCOME_LABEL[key],
    count: counts[index],
    percent: shares[index],
    tone: OUTCOME_TONE[key],
  }))

  /* Shared predicate with the Evidence completeness card: documents on file,
     policy match flagged for a reviewer. Evidence card, outcome breakdown,
     and this metric all read the same 33. */
  const verification = claims.filter(
    (claim) => evidenceCategory(claim) === 'Requires Verification',
  ).length
  const completed = claims.filter((claim) => claim.aiAnalysis === 'Available').length
  const linked = counts[OUTCOME_ORDER.indexOf('linked')]
  const awaitingVerification = claims.filter(
    (claim) => claim.aiAnalysis === 'Available' && evidenceCategory(claim) === 'Requires Verification',
  ).length
  const rest = completed - linked - awaitingVerification
  const aiStage = claims.filter((claim) => claim.status === 'ai_analysis').length

  const metrics: AiMetric[] = [
    {
      key: 'completed',
      label: 'Analyses completed',
      value: String(completed),
      hint: 'Analysis available for reviewer inspection',
    },
    {
      key: 'verify',
      label: 'Findings requiring verification',
      value: String(verification),
      hint: 'Evidence on file; policy match needs a reviewer',
    },
    {
      key: 'sources',
      label: 'Analyses with missing sources',
      value: String(claims.filter((claim) => claim.aiAnalysis === 'Incomplete').length),
      hint: 'Evidence gaps prevented a complete analysis',
    },
  ]

  const detail = [
    linked > 0 ? `${linked} with linked sources` : null,
    awaitingVerification > 0 ? `${awaitingVerification} awaiting reviewer verification` : null,
    rest > 0 ? `${rest} needing further evidence` : null,
  ]
    .filter(Boolean)
    .join(', ')
  const head =
    completed === 0
      ? 'No analyses are complete in this selection'
      : `${completed} ${completed === 1 ? 'analysis' : 'analyses'} completed${
          detail ? ` — ${detail}` : ''
        }`
  const stage =
    aiStage === 0
      ? 'no claims are in the AI Analysis stage'
      : `all ${aiStage} ${aiStage === 1 ? 'claim is' : 'claims are'} still processing in AI Analysis`

  return {
    metrics,
    activity: selectAiActivity(filters, claims),
    outcomes,
    caption: `${head}; ${stage}.`,
  }
}

/* -------------------------------------------------------------------------- */
/* Workflow performance (stage durations — fixed demo values)                 */
/* -------------------------------------------------------------------------- */

export interface SampleMetric {
  key: string
  label: string
  value: string
  hint: string
}

/* SAMPLE_WORKFLOW_METRICS (the fixed illustrative durations) lives in
   src/mocks/analytics.ts and is re-exported at the top of this file. */

/* -------------------------------------------------------------------------- */
/* Claims requiring attention                                                 */
/* -------------------------------------------------------------------------- */

export interface AttentionRow {
  claim: Claim
  issue: string
}

/**
 * Review issue, derived from the claim's own fields — never free text.
 * The three rows the brief names resolve exactly:
 * CLM-10482 → Policy review required, CLM-10476 → Accident report missing,
 * CLM-10461 → Finding requires verification.
 */
function reviewIssue(claim: Claim): string {
  if (claim.evidence === 'Incomplete') {
    return claim.id === 'CLM-10476' ? 'Accident report missing' : 'Required documents missing'
  }
  if (claim.policyMatch === 'Requires Review') return 'Finding requires verification'
  if (claim.status === 'human_review') return 'Policy review required'
  return 'Awaiting reviewer assignment'
}

/** Attention = evidence incomplete, match needs verification, or awaiting a reviewer. */
export function needsAttention(claim: Claim): boolean {
  return (
    claim.evidence === 'Incomplete' ||
    claim.policyMatch === 'Requires Review' ||
    claim.status === 'human_review'
  )
}

/** Priority order first, ties broken by most recently updated (asc). */

/**
 * At most five open claims: High priority first, then Medium, then Low, most
 * recently updated first within each band. Completed claims are excluded —
 * a finished claim never needs attention — so the panel can never disagree
 * with the KPI cards about what is still in play.
 */
export function selectAttention(claims: Claim[], limit = 5): AttentionRow[] {
  return claims
    .filter((claim) => claim.status !== 'completed' && needsAttention(claim))
    .slice()
    .sort(
      (a, b) =>
        priorityRank(b.priority) - priorityRank(a.priority) ||
        a.updatedMinutes - b.updatedMinutes,
    )
    .slice(0, limit)
    .map((claim) => ({ claim, issue: reviewIssue(claim) }))
}

/* -------------------------------------------------------------------------- */
/* The whole page, in one call                                               */
/* -------------------------------------------------------------------------- */

export interface AnalyticsSelection {
  claims: Claim[]
  /** Announced politely by the page whenever the filters change. */
  statusText: string
  kpis: AnalyticsKpis
  volume: VolumeSeries
  workflow: DistributionRow[]
  evidence: EvidenceSnapshot
  ai: AiSnapshot
  incidents: DistributionRow[]
  attention: AttentionRow[]
  /** Empty selection — the page swaps in its "No data" state. */
  empty: boolean
}

export function selectAnalytics(
  filters: AnalyticsFilters,
  source: ReadonlyArray<Claim> = mockClaims,
): AnalyticsSelection {
  const claims = filterClaims(filters, undefined, source)
  const previous = previousWindow(filters.dateRange)
  const previousClaims = previous ? filterClaims(filters, previous, source) : null
  const empty = claims.length === 0

  return {
    claims,
    statusText: `Showing ${claims.length} claims. Date range: ${optionLabel(
      DATE_RANGE_OPTIONS,
      filters.dateRange,
    )}. Incident type: ${optionLabel(
      INCIDENT_FILTER_OPTIONS,
      filters.incident,
    )}. Workflow status: ${optionLabel(WORKFLOW_FILTER_OPTIONS, filters.workflow)}.`,
    kpis: selectKpis(claims, previousClaims),
    volume: selectVolume(filters, claims),
    workflow: selectWorkflow(claims),
    evidence: selectEvidence(claims),
    ai: selectAi(filters, claims),
    incidents: selectIncidents(claims),
    attention: selectAttention(claims),
    empty,
  }
}
