/* Data gate for the Analytics page.

   Every KPI, chart, and table row on #/analytics is derived from
   selectAnalytics(), so this script asserts the invariants the UI
   promises: counts that partition the selection exactly, percentages that
   sum to 100, honest comparisons (null when there is no previous period),
   one verification number shared by the evidence card, the AI metrics, and
   the outcome breakdown, the five named attention rows in priority order,
   and the reachable empty/fallback states.

   Run via `npm run check:analytics` (stages the .ts modules first). */
import { mockClaims } from '../.lib-check-cache/claimsData.ts'
import {
  DEFAULT_FILTERS,
  DATE_RANGE_OPTIONS,
  INCIDENT_FILTER_OPTIONS,
  WORKFLOW_FILTER_OPTIONS,
  SAMPLE_WORKFLOW_METRICS,
  activeFilterCount,
  dateWindow,
  filterClaims,
  needsAttention,
  previousWindow,
  selectAnalytics,
  selectAttention,
  selectVolume,
} from '../.lib-check-cache/analyticsData.ts'

const fails = []
const ok = (cond, msg) => {
  if (!cond) fails.push(msg)
}
const eq = (label, actual, expected) => {
  if (actual !== expected) fails.push(`${label}: expected ${expected}, got ${actual}`)
}
const sum = (xs) => xs.reduce((total, x) => total + x, 0)
const countsBy = (rows, labelOf) =>
  Object.fromEntries(rows.map((row) => [labelOf(row), row.count]))

/* ---------------------------------------------------------------- dataset */

eq('dataset size', mockClaims.length, 128)

/* --------------------------------------------------- default selection */

const base = selectAnalytics(DEFAULT_FILTERS)

eq('default selection size', base.claims.length, 128)
ok(!base.empty, 'default selection must not read as empty')
ok(base.statusText.includes('Showing 128 claims'), `statusText: ${base.statusText}`)

eq('kpis.received', base.kpis.received, 128)
eq('kpis.underReview', base.kpis.underReview, 98)
eq('kpis.evidenceCompletion', base.kpis.evidenceCompletion, 82)
eq('kpis.humanReviewPending', base.kpis.humanReviewPending, 11)
/* 30-day previous window (Aug 7 – Sep 6) holds no demo claims: no
   comparison is supported, and the KPI must not invent one. */
eq('kpis.receivedDelta (no previous data)', base.kpis.receivedDelta, null)

/* --------------------------------------------------- workflow partition */

const workflowCounts = countsBy(base.workflow, (r) => r.label)
eq('workflow New', workflowCounts.New, 30)
eq('workflow Evidence Collection', workflowCounts['Evidence Collection'], 12)
eq('workflow AI Analysis', workflowCounts['AI Analysis'], 45)
eq('workflow Human Review', workflowCounts['Human Review'], 11)
eq('workflow Completed', workflowCounts.Completed, 30)
eq('workflow rows sum to selection', sum(base.workflow.map((r) => r.count)), 128)
eq('workflow percents sum to 100', sum(base.workflow.map((r) => r.percent)), 100)
eq(
  'workflow stays in lifecycle order',
  base.workflow.map((r) => r.label).join('|'),
  'New|Evidence Collection|AI Analysis|Human Review|Completed',
)

/* -------------------------------------------------- incident partition */

const incidentCounts = countsBy(base.incidents, (r) => r.label)
eq('incident Rear-end', incidentCounts['Rear-end Collision'], 48)
eq('incident Vehicle', incidentCounts['Vehicle Collision'], 33)
eq('incident Side', incidentCounts['Side Collision'], 32)
eq('incident Other', incidentCounts.Other, 15)
eq('incident rows sum to selection', sum(base.incidents.map((r) => r.count)), 128)
eq('incident percents sum to 100', sum(base.incidents.map((r) => r.percent)), 100)
const incidentOrder = base.incidents.map((r) => r.count)
eq(
  'incidents sorted largest first',
  incidentOrder.join(','),
  [...incidentOrder].sort((a, b) => b - a).join(','),
)

/* ------------------------------------------------ evidence 4-way split */

const evidenceCounts = countsBy(base.evidence.rows, (r) => r.label)
eq('evidence Complete', evidenceCounts.Complete, 73)
eq('evidence Missing Documents', evidenceCounts['Missing Documents'], 12)
eq('evidence Awaiting Customer Information', evidenceCounts['Awaiting Customer Information'], 10)
eq('evidence Requires Verification', evidenceCounts['Requires Verification'], 33)
eq('evidence rows sum to selection', sum(base.evidence.rows.map((r) => r.count)), 128)
eq('evidence percents sum to 100', sum(base.evidence.rows.map((r) => r.percent)), 100)
eq('evidence.missing', base.evidence.missing, 22)
eq('evidence.verification', base.evidence.verification, 33)
ok(
  /still need documents or customer information/.test(base.evidence.insight) &&
    /still needs reviewer verification/.test(base.evidence.insight),
  `insight must separate absent evidence from inconclusive evidence: ${base.evidence.insight}`,
)

/* ------------------------------------------------------ AI outcomes */

const outcomeCounts = countsBy(base.ai.outcomes, (r) => r.key)
eq('outcome linked', outcomeCounts.linked, 30)
eq('outcome needs-evidence', outcomeCounts['needs-evidence'], 10)
eq('outcome verification', outcomeCounts.verification, 33)
eq('outcome incomplete', outcomeCounts.incomplete, 12)
eq('outcome in-progress', outcomeCounts['in-progress'], 23)
eq('outcome awaiting', outcomeCounts.awaiting, 20)
eq('outcome partition sums to selection', sum(base.ai.outcomes.map((r) => r.count)), 128)
eq('outcome percents sum to 100', sum(base.ai.outcomes.map((r) => r.percent)), 100)

const aiMetricValues = Object.fromEntries(base.ai.metrics.map((m) => [m.key, m.value]))
eq('AI analyses completed metric', aiMetricValues.completed, '41')
eq('AI verification metric', aiMetricValues.verify, '33')
eq('AI missing-sources metric', aiMetricValues.sources, '12')
/* One shared predicate: the evidence card, the outcome breakdown, and the
   AI metric must print the same verification count. */
eq('verification agrees with evidence card', aiMetricValues.verify, String(base.evidence.verification))
eq('verification agrees with outcome row', aiMetricValues.verify, String(outcomeCounts.verification))
/* The caption reconciles "Analyses completed" with those outcome rows and
   with the AI Analysis stage count. */
ok(!/accuracy/i.test(base.ai.caption), 'AI caption must not claim an accuracy score')
ok(
  base.ai.caption.includes('41 analyses completed'),
  `caption must restate the metric: ${base.ai.caption}`,
)
ok(
  base.ai.caption.includes('30 with linked sources') &&
    base.ai.caption.includes('11 awaiting reviewer verification'),
  `caption must split the metric along the outcome rows: ${base.ai.caption}`,
)
ok(
  base.ai.caption.includes('all 45 claims are still processing in AI Analysis'),
  `caption must reconcile with the AI Analysis stage: ${base.ai.caption}`,
)
eq(
  'analyses completed = Human Review + Completed stage',
  Number(aiMetricValues.completed),
  workflowCounts['Human Review'] + workflowCounts.Completed,
)

/* ------------------------------------------------- attention queue */

const attention = selectAttention(base.claims)
ok(attention.length === 5, `expected 5 attention rows, got ${attention.length}`)
ok(
  attention.every((row) => needsAttention(row.claim)),
  'every attention row must actually need attention',
)
ok(
  attention.every((row) => row.claim.status !== 'completed'),
  'a completed claim must never appear in the attention queue',
)
const priorityRank = { high: 0, medium: 1, low: 2 }
const orderKeys = attention.map(
  (row) => priorityRank[row.claim.priority] * 1e6 + row.claim.updatedMinutes,
)
eq(
  'attention sorted by priority, then most recently updated',
  orderKeys.join(','),
  [...orderKeys].sort((a, b) => a - b).join(','),
)

const top5 = attention
eq('attention row 1', top5[0].claim.id, 'CLM-10482')
eq('attention row 2', top5[1].claim.id, 'CLM-10450')
eq('attention row 3', top5[2].claim.id, 'CLM-10417')
eq('attention row 4', top5[3].claim.id, 'CLM-10389')
eq('attention row 5', top5[4].claim.id, 'CLM-10375')
eq('issue CLM-10482', top5[0].issue, 'Policy review required')
eq('issue CLM-10450', top5[1].issue, 'Policy review required')
eq('issue CLM-10417', top5[2].issue, 'Finding requires verification')
eq('issue CLM-10389', top5[3].issue, 'Required documents missing')
eq('issue CLM-10375', top5[4].issue, 'Finding requires verification')

/* -------------------------------------------------- buckets per range */

const bucketCount = (filters) => selectVolume(filters, filterClaims(filters)).buckets.length
eq('7d buckets', bucketCount({ ...DEFAULT_FILTERS, dateRange: '7d' }), 7)
eq('30d buckets', bucketCount({ ...DEFAULT_FILTERS, dateRange: '30d' }), 30)
eq('90d buckets', bucketCount({ ...DEFAULT_FILTERS, dateRange: '90d' }), 13)
eq('year buckets', bucketCount({ ...DEFAULT_FILTERS, dateRange: 'year' }), 10)

/* volume.series are consistent with the selection they describe */
eq('volume.received sums to selection', sum(base.volume.received), base.claims.length)
eq(
  'volume.completed sums to Completed stage count',
  sum(base.volume.completed),
  workflowCounts.Completed,
)
/* …and the two series must not draw a flat line. */
ok(
  Math.max(...base.volume.received) > Math.min(...base.volume.received),
  'received series must vary across the period',
)
ok(
  sum(base.volume.completed) === 0 ||
    Math.max(...base.volume.completed) > Math.min(...base.volume.completed),
  'completed series must vary across the period',
)

/* ------------------------------------------------------- 7-day window */

const seven = selectAnalytics({ ...DEFAULT_FILTERS, dateRange: '7d' })
eq('7d received', seven.kpis.received, 34)
eq('7d under review', seven.kpis.underReview, 26)
eq('7d evidence completion', seven.kpis.evidenceCompletion, 85)
eq('7d human review pending', seven.kpis.humanReviewPending, 5)
/* previous 7-day window (Sep 22 – Sep 29) holds 35 claims → a real delta. */
eq('7d receivedDelta', seven.kpis.receivedDelta, -1)

/* ------------------------------------------------- window boundaries */

ok(previousWindow('year') === null, 'This year has no comparable previous window')
eq('30d window end', dateWindow('30d').end, Date.UTC(2026, 9, 6))
ok(dateWindow('30d').start < Date.UTC(2026, 8, 10), '30d window must reach the dataset')

/* -------------------------------------------------- reachable states */

/* No claims in the window → the page swaps in its empty state. */
const emptyCombo = selectAnalytics({
  dateRange: '7d',
  incident: 'vehicle',
  workflow: 'new',
})
ok(emptyCombo.empty, '7d + Vehicle + New should produce the empty state')

/* New claims have no analysis yet → the activity chart's fallback. */
const newOnly = selectAnalytics({ ...DEFAULT_FILTERS, workflow: 'new' })
eq('workflow=New selection', newOnly.claims.length, 30)
ok(newOnly.ai.activity.empty, 'workflow=New must expose the chart-unavailable state')
eq('workflow=New activity peak', newOnly.ai.activity.peak, 0)

/* ------------------------------------------------------- filter counts */

eq('default active filter count', activeFilterCount(DEFAULT_FILTERS), 0)
eq(
  'all filters changed',
  activeFilterCount({ dateRange: 'year', incident: 'side', workflow: 'completed' }),
  3,
)
eq('date range options', DATE_RANGE_OPTIONS.length, 4)
eq('incident options', INCIDENT_FILTER_OPTIONS.length, 5)
eq('workflow options', WORKFLOW_FILTER_OPTIONS.length, 6)

/* -------------------------------------------------- sample metrics */

eq('sample metric count', SAMPLE_WORKFLOW_METRICS.length, 4)
eq(
  'sample metric values',
  SAMPLE_WORKFLOW_METRICS.map((m) => m.value).join(','),
  '1.8 d,12 min,1.4 d,3.6 d',
)
ok(
  SAMPLE_WORKFLOW_METRICS.every((m) => m.hint.length > 0 && !/sample|illustrative/i.test(m.hint)),
  'hints say what is measured — the card title carries the single Illustrative label',
)

/* ------------------------------------------------- KPI honesty rules */

for (const range of ['7d', '30d', '90d', 'year']) {
  const selection = selectAnalytics({ ...DEFAULT_FILTERS, dateRange: range })
  const k = selection.kpis
  ok(k.received >= 0 && k.underReview >= k.humanReviewPending, `${range}: KPI ordering`)
  ok(k.evidenceCompletion >= 0 && k.evidenceCompletion <= 100, `${range}: evidence % in range`)
  const withEvidence = selection.claims.filter((c) => c.evidence === 'Complete').length
  eq(
    `${range}: evidence completion is floored, never rounded up`,
    k.evidenceCompletion,
    selection.claims.length === 0 ? 0 : Math.floor((withEvidence / selection.claims.length) * 100),
  )
  if (k.receivedDelta !== null) {
    eq(
      `${range}: delta equals current minus previous window`,
      k.receivedDelta,
      k.received - (previousWindow(range) ? filterClaims({ ...DEFAULT_FILTERS, dateRange: range }, previousWindow(range)).length : 0),
    )
  }
}

/* every distribution on every range partitions its selection */
for (const range of ['7d', '30d', '90d', 'year']) {
  const selection = selectAnalytics({ ...DEFAULT_FILTERS, dateRange: range })
  if (selection.empty) continue
  for (const [name, rows] of [
    ['workflow', selection.workflow],
    ['incidents', selection.incidents],
    ['evidence', selection.evidence.rows],
    ['outcomes', selection.ai.outcomes],
  ]) {
    eq(`${range}: ${name} counts sum`, sum(rows.map((r) => r.count)), selection.claims.length)
    eq(`${range}: ${name} percents sum`, sum(rows.map((r) => r.percent)), 100)
  }
}

/* --------------------------------------------------------------- report */

if (fails.length) {
  console.log('analytics-check FAILURES:')
  for (const f of fails) console.log('  - ' + f)
  process.exit(1)
}
console.log('analytics-check OK — selection, KPIs, partitions, attention queue, states')
