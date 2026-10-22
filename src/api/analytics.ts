/* ==========================================================================
   Analytics API — GET /analytics + GET /claims, adapted into the page's
   AnalyticsSelection (src/lib/analyticsData.ts).

   The live endpoint returns aggregates only: { filters, summary, claimsPerDay,
   byIncidentType, byStage, byStatus }. It has no per-claim rows, no evidence
   or AI breakdown, and no deltas, so this module:

     * maps  summary          -> kpis (received / under review / awaiting)
     * maps  claimsPerDay     -> volume.received, bucketed to the chart's axis
     * maps  byStage          -> workflow (backend tokens -> UI lifecycle tokens)
     * maps  byIncidentType   -> incidents (token -> label)
     * reads GET /claims and lets the shared selectors compute the rest —
       evidence completeness, AI metrics, KPI deltas, the attention list, and
       every field the components read — so nothing is ever undefined.

   Date windows are anchored to the real current date, and the same window
   scopes the /analytics request, so both sources describe the same slice.

   The backend has no `workflow` filter and its byStage/claimsPerDay aggregates
   are not workflow-scoped, so when a workflow filter is active the client
   selection is left untouched (mapping it would make the charts disagree with
   the KPIs).
   ========================================================================== */

import { listClaims } from './claims'
import { request } from './http'
import {
  dateWindow,
  selectAnalytics,
  type AnalyticsFilters,
  type AnalyticsSelection,
  type ChartBucket,
  type DistributionRow,
  type IncidentFilterKey,
  type VolumeSeries,
} from '../lib/analyticsData'
import {
  INCIDENT_TYPES,
  STAGES,
  incidentLabel,
  stageLabel,
  type ClaimStatus,
  type IncidentType,
} from '../lib/constants'
import type { Claim } from '../lib/claimsData'

const DAY = 86_400_000

/** Backend stage token -> the UI's lifecycle token. */
const STAGE_TO_STATUS: Record<string, ClaimStatus> = {
  intake: 'new',
  evidence_collection: 'evidence_collection',
  ai_analysis: 'ai_analysis',
  human_review: 'human_review',
  decided: 'completed',
}

/** UI incident-filter key -> the incident token the API filters on. */
const INCIDENT_TO_API: Record<IncidentFilterKey, string | undefined> = {
  all: undefined,
  vehicle: 'vehicle_collision',
  'rear-end': 'rear_end_collision',
  side: 'side_collision',
  other: 'other',
}

const WORKFLOW_TONE: Record<ClaimStatus, string> = {
  new: 'slate',
  evidence_collection: 'blue',
  ai_analysis: 'teal',
  human_review: 'amber',
  completed: 'green',
}

interface CountRow {
  key: string
  count: number
}

interface AnalyticsApiResponse {
  summary?: {
    totalClaims?: number
    approved?: number
    awaitingReview?: number
  }
  claimsPerDay?: CountRow[]
  byIncidentType?: CountRow[]
  byStage?: CountRow[]
}

const isNum = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

/** Integer percentages that sum to exactly 100 (largest-remainder method). */
function shares(counts: number[], total: number): number[] {
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

const niceMax = (peak: number): number => Math.max(4, Math.ceil(peak / 4) * 4)

/** Query the backend with the same window + incident filter the UI applies. */
function toQuery(filters: AnalyticsFilters) {
  const { start, end } = dateWindow(filters.dateRange)
  return {
    from: new Date(start).toISOString().slice(0, 10),
    /* The window is half-open; the API's `to` is an inclusive date. */
    to: new Date(end - DAY).toISOString().slice(0, 10),
    incidentType: INCIDENT_TO_API[filters.incident],
    priority: 'all',
  }
}

function bucketIndex(buckets: ChartBucket[], ms: number): number {
  return buckets.findIndex((bucket) => ms >= bucket.start && ms < bucket.end)
}

/** CountRow.key is the bucket label; claimsPerDay labels it `date`. */
function rowLabel(row: CountRow & { date?: string }): string {
  return row.key ?? row.date ?? ''
}

/** claimsPerDay -> the volume chart's two series, aligned to its buckets. */
function mapVolume(
  base: VolumeSeries,
  perDay: CountRow[],
  claims: Claim[],
): VolumeSeries {
  const received = base.buckets.map(() => 0)
  for (const row of perDay) {
    const label = rowLabel(row)
    if (!label) continue
    const ms = Date.parse(`${label}T00:00:00Z`)
    if (Number.isNaN(ms)) continue
    const index = bucketIndex(base.buckets, ms)
    if (index >= 0) received[index] += isNum(row.count) ? row.count : 0
  }

  /* The API has no completed-per-day series; bucket the completed claims. */
  const completed = base.buckets.map(() => 0)
  for (const claim of claims) {
    if (claim.status !== 'completed') continue
    const index = bucketIndex(base.buckets, claim.dateReportedValue)
    if (index >= 0) completed[index] += 1
  }

  const peak = base.buckets.reduce(
    (max, _bucket, index) => Math.max(max, received[index], completed[index]),
    0,
  )
  return { ...base, received, completed, peak, yMax: niceMax(peak), empty: peak === 0 }
}

/** byStage -> workflow rows in lifecycle order. */
function mapWorkflow(byStage: CountRow[]): DistributionRow[] {
  const counts = STAGES.map(
    (status) => byStage.find((row) => STAGE_TO_STATUS[row.key] === status)?.count ?? 0,
  )
  const total = counts.reduce((sum, count) => sum + count, 0)
  const percents = shares(counts, total)
  return STAGES.map((status, index) => ({
    key: status,
    label: stageLabel(status),
    count: counts[index],
    percent: percents[index],
    tone: WORKFLOW_TONE[status],
  }))
}

/** byIncidentType -> incident rows (token -> label), largest first. */
function mapIncidents(byIncidentType: CountRow[]): DistributionRow[] {
  const counts = new Map<IncidentType, number>(
    byIncidentType.map((row) => [row.key as IncidentType, isNum(row.count) ? row.count : 0]),
  )
  const known = INCIDENT_TYPES.filter((type) => counts.has(type))
  const values = known.map((type) => counts.get(type) ?? 0)
  const total = values.reduce((sum, count) => sum + count, 0)
  const percents = shares(values, total)
  return known
    .map((type, index) => ({
      key: type,
      label: incidentLabel(type),
      count: values[index],
      percent: percents[index],
      tone: 'navy',
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

/** Overlay the backend aggregates onto the client-computed selection. */
function overlay(
  base: AnalyticsSelection,
  backend: AnalyticsApiResponse | null,
  filters: AnalyticsFilters,
  claims: Claim[],
): AnalyticsSelection {
  if (!backend) return base
  /* byStage/claimsPerDay are not workflow-scoped; leave the client values so
     the charts stay consistent with the KPIs when a stage filter is active. */
  if (filters.workflow !== 'all') return base

  const { summary } = backend
  const kpis = isNum(summary?.totalClaims)
    ? {
        ...base.kpis,
        received: summary.totalClaims,
        underReview: summary.totalClaims - (isNum(summary.approved) ? summary.approved : 0),
        humanReviewPending: isNum(summary.awaitingReview)
          ? summary.awaitingReview
          : base.kpis.humanReviewPending,
      }
    : base.kpis

  const volume = Array.isArray(backend.claimsPerDay)
    ? mapVolume(base.volume, backend.claimsPerDay, claims)
    : base.volume
  const workflow = Array.isArray(backend.byStage) ? mapWorkflow(backend.byStage) : base.workflow
  const incidents = Array.isArray(backend.byIncidentType)
    ? mapIncidents(backend.byIncidentType)
    : base.incidents

  return { ...base, kpis, volume, workflow, incidents }
}

/**
 * GET /analytics (+ GET /claims) — the whole analytics page in one call.
 *
 * @param {AnalyticsFilters} filters
 * @returns {Promise<AnalyticsSelection>}
 */
export async function getAnalytics(filters: AnalyticsFilters): Promise<AnalyticsSelection> {
  const claims = await listClaims()

  /* The aggregates are a bonus: if /analytics is unavailable the page still
     renders every panel from the claims list alone. */
  let backend: AnalyticsApiResponse | null = null
  try {
    backend = (await request('/api/analytics', { query: toQuery(filters) })) as AnalyticsApiResponse
  } catch {
    backend = null
  }

  return overlay(selectAnalytics(filters, claims), backend, filters, claims)
}
