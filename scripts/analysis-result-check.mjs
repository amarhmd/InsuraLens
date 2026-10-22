/* Data gate for the n8n workflow's analysis payload adapter
   (src/lib/analysisResult.ts).

   The workflow returns an ARRAY with one item and its key casing is
   inconsistent, so this script pins what the card's mapper promises: the
   real payload shape maps to the clean AnalysisResult, object input works,
   mixed-case keys are read, missing fields degrade to the empty state,
   unknown enum values never render as confident ones, and null/garbage
   input returns null (so the caller can show "Run AI analysis" instead of
   crashing). Run via `npm run check:analysis` (stages the .ts module first —
   Node 24 type-stripping needs the explicit extension). */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = 'C:/Users/DESKTOP/Desktop/InsuraLens1'
const OUT = join(ROOT, '.lib-check-cache')

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
/* The module has no relative imports, so it copies across verbatim. */
writeFileSync(
  join(OUT, 'analysisResult.ts'),
  readFileSync(join(ROOT, 'src/lib/analysisResult.ts'), 'utf8'),
)

const {
  mapAnalysisResult,
  emptyAnalysisResult,
  normalizeDecision,
  normalizeCoverage,
  normalizeEstimate,
  PROPOSED_DECISION_LABEL,
  ANALYSIS_COVERAGE_LABEL,
} = await import(pathToFileURL(join(OUT, 'analysisResult.ts')).href)

const fails = []
const ok = (cond, msg) => {
  if (!cond) fails.push(msg)
}
const eq = (label, actual, expected) => {
  if (actual !== expected) {
    fails.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}
const deep = (label, actual, expected) => {
  const a = JSON.stringify(actual)
  const b = JSON.stringify(expected)
  if (a !== b) fails.push(`${label}: expected ${b}, got ${a}`)
}

/* ------------------------------------------------- the real payload shape */

const REAL = [
  {
    damageSummary: 'Stone chipping across the windshield.',
    coverageStatus: 'insufficient_information',
    analyseState: 'completed',
    inconsistencyFlag: true,
    ClaimAssessment: 'The damage matches the reported incident; the policy could not be verified.',
    inconsistencyDetails: 'Two dates differ.',
    ProposedDecision: 'deny',
  },
]
deep('array input: the workflow example', mapAnalysisResult(REAL), {
  status: 'success',
  proposedDecision: 'deny',
  coverage: 'unable_to_evaluate',
  inconsistency: { flagged: true, details: 'Two dates differ.' },
  damageSummary: 'Stone chipping across the windshield.',
  assessment: 'The damage matches the reported incident; the policy could not be verified.',
})
eq(
  'array input: takes the first item',
  mapAnalysisResult([{ analyseState: 'completed' }, { analyseState: 'failed' }])?.status,
  'success',
)

/* ------------------------------------------------------------- object input */

deep('object input with mixed-case keys', mapAnalysisResult({
  ANALYSESTATE: 'FAILED',
  ProposedDECISION: 'Request_Information',
  COVERAGESTATUS: 'NOT COVERED',
  INCONSISTENCYFLAG: 'True',
  inconsistencyDetails: '  Two dates differ.  ',
}), {
  status: 'failed',
  proposedDecision: 'request_information',
  coverage: 'not_covered',
  inconsistency: { flagged: true, details: 'Two dates differ.' },
})

/* -------------------------------------------------------------- missing fields */

deep('object with no fields at all', mapAnalysisResult({}), {
  status: 'empty',
  proposedDecision: null,
  coverage: 'unable_to_evaluate',
  inconsistency: { flagged: false },
})
const settled = mapAnalysisResult({ analyseState: 'completed' })
ok(settled !== null, 'object payload maps')
ok(settled !== null && !('estimatedAmount' in settled), 'missing estimatedAmount stays absent')
ok(settled !== null && !('damageSummary' in settled), 'missing damageSummary stays absent')
ok(settled !== null && !('assessment' in settled), 'missing assessment stays absent')
ok(
  settled !== null && !('details' in settled.inconsistency),
  'missing inconsistency details stay absent',
)

/* -------------------------------------------------------- unknown enum values */

deep('unknown enum values fall back safely', mapAnalysisResult({
  analyseState: 'weird',
  ProposedDecision: 'maybe',
  coverageStatus: 'sometimes',
  inconsistencyFlag: 'perhaps',
}), {
  status: 'empty',
  proposedDecision: null,
  coverage: 'unable_to_evaluate',
  inconsistency: { flagged: false },
})

/* ------------------------------------------------------------ null/garbage input */

const GARBAGE = [
  ['null', null],
  ['undefined', undefined],
  ['number', 42],
  ['string', 'done'],
  ['boolean', true],
  ['empty array', []],
  ['array of garbage', [123]],
  ['array of array', [[]]],
]
for (const [label, input] of GARBAGE) {
  eq(`garbage input: ${label}`, mapAnalysisResult(input), null)
}

/* ------------------------------------------------------------------- aliases */

const statusOf = (analyseState) => mapAnalysisResult({ analyseState })?.status
eq("analyseState 'completed'", statusOf('completed'), 'success')
eq("analyseState 'analyzed'", statusOf('analyzed'), 'success')
eq("analyseState 'failed'", statusOf('failed'), 'failed')
eq("analyseState 'error'", statusOf('error'), 'failed')
eq("analyseState 'running'", statusOf('running'), 'loading')
eq("analyseState 'processing'", statusOf('processing'), 'loading')
eq("analyseState 'pending'", statusOf('pending'), 'loading')
eq('analyseState missing', statusOf(undefined), 'empty')
eq("claim-row spelling 'analysisState'", mapAnalysisResult({ analysisState: 'completed' })?.status, 'success')

eq("decision 'deny'", normalizeDecision('deny'), 'deny')
eq("decision 'reject' → deny", normalizeDecision('reject'), 'deny')
eq("decision 'Approve'", normalizeDecision('Approve'), 'approve')
eq("decision 'request information'", normalizeDecision('Request Information'), 'request_information')
eq("decision 'request_info' (legacy alias)", normalizeDecision('request_info'), 'request_information')
eq("decision ' ESCALATE '", normalizeDecision(' ESCALATE '), 'escalate')
eq("decision 'hold' → hidden", normalizeDecision('hold'), null)

eq("coverage 'covered'", normalizeCoverage('covered'), 'covered')
eq("coverage 'Not Covered'", normalizeCoverage('Not Covered'), 'not_covered')
eq("coverage 'partially_covered'", normalizeCoverage('partially_covered'), 'partial')
eq("coverage 'partial' (legacy alias)", normalizeCoverage('partial'), 'partial')
eq("coverage 'unclear' (legacy)", normalizeCoverage('unclear'), 'unable_to_evaluate')
eq("coverage 'insufficient_information'", normalizeCoverage('insufficient_information'), 'unable_to_evaluate')
eq('coverage absent', normalizeCoverage(undefined), 'unable_to_evaluate')

/* ----------------------------------------------------------- inconsistency flags */

eq('flag boolean true', mapAnalysisResult({ inconsistencyFlag: true }).inconsistency.flagged, true)
eq('flag string "true"', mapAnalysisResult({ inconsistencyFlag: 'true' }).inconsistency.flagged, true)
eq('flag string " TRUE " (trimmed)', mapAnalysisResult({ inconsistencyFlag: ' TRUE ' }).inconsistency.flagged, true)
eq('flag false', mapAnalysisResult({ inconsistencyFlag: false }).inconsistency.flagged, false)
eq('flag absent', mapAnalysisResult({}).inconsistency.flagged, false)

/* --------------------------------------------------------- money + text handling */

eq('estimate: number in money style', normalizeEstimate(1250), '$1,250')
eq('estimate: zero', normalizeEstimate(0), '$0')
eq('estimate: string passes through trimmed', normalizeEstimate('  $4,000 USD  '), '$4,000 USD')
eq('estimate: absent', normalizeEstimate(null), undefined)
eq('estimate: NaN', normalizeEstimate(Number.NaN), undefined)

const messy = mapAnalysisResult({ damageSummary: '   ', ClaimAssessment: 42, EstimatedAmount: '  $4,000  ' })
eq('blank damage summary hidden', messy?.damageSummary, undefined)
eq('non-string assessment hidden', messy?.assessment, undefined)
eq('estimate trimmed on the payload', messy?.estimatedAmount, '$4,000')
eq('details trimmed', mapAnalysisResult({ inconsistencyDetails: '  X  ' }).inconsistency.details, 'X')
eq('summary trimmed', mapAnalysisResult({ damageSummary: '  X  ' }).damageSummary, 'X')

/* --------------------------------------------------------------------- labels */

eq('deny label', PROPOSED_DECISION_LABEL.deny, 'Deny')
eq('request_information label', PROPOSED_DECISION_LABEL.request_information, 'Request information')
eq('partial coverage label', ANALYSIS_COVERAGE_LABEL.partial, 'Partially covered')
eq('unable coverage label', ANALYSIS_COVERAGE_LABEL.unable_to_evaluate, 'Unable to evaluate')

deep('emptyAnalysisResult defaults', emptyAnalysisResult(), {
  status: 'empty',
  proposedDecision: null,
  coverage: 'unable_to_evaluate',
  inconsistency: { flagged: false },
})

/* ---------------------------------------------------------------------- report */

if (fails.length > 0) {
  console.error(`analysis-result-check: ${fails.length} failure(s)`)
  for (const fail of fails) console.error(`- ${fail}`)
  process.exit(1)
}
console.log('analysis-result-check: ok')
