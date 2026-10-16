/* Claims API — the work queue behind #/claims and #/claims/:id, plus the
   human-review and agent-pipeline routes.

   Live mode: listClaims, getClaim and createClaim talk to the real backend
   and map its field names and values to the shape the UI already uses (see
   Claim in src/lib/claimsData.ts). reviewClaim / analyzeClaim /
   openAnalysisStream expose the review and agent-run routes.

   Set VITE_USE_DEMO=true to keep serving src/mocks/claims.ts instead. */

import { ApiError, API_BASE_URL, USE_DEMO, delay, request, withToken } from './http'
import { formatAgo, formatDate, mockClaims } from '../lib/claimsData'

/** The backend caps a page at 100 claims; the queue reads client-side filters. */
const MAX_PAGE_SIZE = 100

/** Simulated latency in demo mode (ms). */
const MOCK_DELAY_MS = 150

/** Backend stage -> UI status token (same mapping as the Dashboard). */
const STAGE_TO_STATUS = {
  intake: 'new',
  evidence_collection: 'evidence_collection',
  ai_analysis: 'ai_analysis',
  human_review: 'human_review',
  decided: 'completed',
}

/* Backend analysisState -> AiAnalysis ('Available' | 'Incomplete' | 'Processing' | 'Not started'). */
const AI_STATE_TO_LABEL = {
  not_started: 'Not started',
  running: 'Processing',
  awaiting_review: 'Available',
  reviewing: 'Available',
  reviewed: 'Available',
  failed: 'Incomplete',
}

/* Backend coverageStatus -> PolicyMatch ('Matched' | 'Partial' | 'Requires Review' | 'Not Evaluated'). */
const COVERAGE_TO_LABEL = {
  covered: 'Matched',
  partial: 'Partial',
  not_covered: 'Requires Review',
  unclear: 'Requires Review',
}

/** Map one backend claim to the UI's Claim shape. */
function fromApi(c, files) {
  const dateReportedValue = Date.parse(c.createdAt)
  const updatedMinutes = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(c.updatedAt ?? c.createdAt)) / 60000),
  )
  const evidenceItems = Array.isArray(files) ? files.length : 0
  return {
    id: c.id,
    customer: c.customerName,
    incident: c.incidentType ?? 'other',
    dateReported: formatDate(dateReportedValue),
    dateReportedValue,
    policyRef: c.policyId || 'Not assigned',
    evidenceItems,
    evidence: evidenceItems >= 3 ? 'Complete' : 'Incomplete',
    aiAnalysis: AI_STATE_TO_LABEL[c.analysisState] ?? 'Not started',
    policyMatch: COVERAGE_TO_LABEL[c.coverageStatus] ?? 'Not Evaluated',
    priority: c.priority,
    status: STAGE_TO_STATUS[c.stage] ?? 'new',
    updatedLabel: formatAgo(updatedMinutes),
    updatedMinutes,
    description: c.description ?? '',
    /* Extra backend fields the UI may use later. */
    vehicle: c.vehicle,
    estimatedAmount: c.estimatedAmount ?? null,
    inconsistencyFlag: Boolean(c.inconsistencyFlag),
    decision: c.status, // PENDING | APPROVED | MORE_INFO_REQUIRED
  }
}

/**
 * GET /api/claims — the full work-queue list (one page of up to 100; the
 * page filters, sorts and paginates client-side, as it did with the mock).
 *
 * Tab badges are derived on the page from this same list, so no second round
 * trip is needed: the backend reports 26 claims in total, which fits inside a
 * single capped page and therefore makes the client-side counts exact.
 *
 * @param {Record<string, string | number | undefined>} [params]
 * @returns {Promise<Array<import('../lib/claimsData').Claim>>}
 */
export async function listClaims(params) {
  if (USE_DEMO) {
    await delay(MOCK_DELAY_MS)
    return mockClaims
  }

  const res = await request('/api/claims', { query: toQuery(params) })
  const rows = Array.isArray(res) ? res : (res.items ?? res.claims ?? res.data ?? [])
  return rows.map((claim) => fromApi(claim, claim.files))
}

/**
 * Normalize caller params to the backend's vocabulary: drop empties, clamp the
 * page size, and translate the few names that differ.
 *
 * @param {Record<string, string | number | undefined>} [params]
 */
function toQuery(params) {
  const { sort, ...rest } = { ...params }
  const query = { ...rest, pageSize: MAX_PAGE_SIZE }

  /* The UI sorts by 'date'/'updated'; the API expects its own tokens. */
  const SORT_MAP = { date: 'created_at', updated: 'updated_at', priority: 'priority' }
  if (sort) query.sort = SORT_MAP[sort] ?? sort

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') delete query[key]
  }
  return query
}

/**
 * GET /api/claims/:id — one claim for the workspace page.
 *
 * The workspace needs more than the queue's view model, so the mapped Claim is
 * returned with the backend's raw `files` and `analysis` attached (the mapper in
 * src/api/claimWorkspace.ts reads analysis.vision/policy/decision from them).
 * In demo mode the mock entry has neither; the mapper supplies safe defaults.
 *
 * @param {string} id
 * @returns {Promise<(import('../lib/claimsData').Claim & { files: any[], analysis: any }) | null>}
 *   null when no claim has this id (404)
 */
export async function getClaim(id) {
  if (USE_DEMO) {
    await delay(MOCK_DELAY_MS)
    return mockClaims.find((claim) => claim.id === id) ?? null
  }

  try {
    const data = await request(`/api/claims/${encodeURIComponent(id)}`)
    const claim = data.claim ?? data
    const files = data.files ?? claim.files ?? []
    const analysis = data.analysis ?? claim.analysis ?? null
    return { ...fromApi(claim, files), files: Array.isArray(files) ? files : [], analysis }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

/** Demo-mode id sequence for locally created claims. */
let demoSeq = 0

/**
 * POST /api/claims — create a claim. The request is multipart/form-data so
 * evidence files can ride along with the text fields.
 *
 * @param {import('../pages/claims/CreateClaimModal').ClaimDraft} draft
 * @returns {Promise<import('../lib/claimsData').Claim>}
 */
export async function createClaim(draft) {
  if (USE_DEMO) {
    await delay(MOCK_DELAY_MS)
    demoSeq += 1
    const now = Date.now()
    const items = (draft.photos?.length ?? 0) + (draft.documents?.length ?? 0)
    return {
      id: `CLM-${1050 + demoSeq}`,
      customer: draft.customer,
      incident: draft.incident || 'other',
      dateReported: formatDate(now),
      dateReportedValue: now,
      policyRef: draft.policyRef || 'Not assigned',
      evidenceItems: items,
      evidence: items >= 3 ? 'Complete' : 'Incomplete',
      aiAnalysis: 'Not started',
      policyMatch: 'Not Evaluated',
      priority: draft.priority,
      status: 'new',
      updatedLabel: formatAgo(0),
      updatedMinutes: 0,
      description: draft.description ?? '',
    }
  }

  const form = new FormData()
  form.append('customerName', draft.customer)
  /* The backend requires `vehicle`, which the create modal does not collect. */
  form.append('vehicle', 'Not provided')
  form.append('description', draft.description || '')
  form.append('priority', draft.priority)
  form.append('incidentType', draft.incident || 'other')
  if (draft.policyRef) form.append('policyId', draft.policyRef)

  /* The modal hands back object URLs rather than File objects, so photos
     normally reach the server through POST /api/claims/:id/evidence after the
     claim exists. Files supplied by a caller are forwarded here. */
  for (const file of draft.files ?? []) form.append('images', file)

  const res = await request('/api/claims', { method: 'POST', body: form })
  const claim = res?.claim ?? res?.data ?? res
  return fromApi(claim, claim?.files)
}

/**
 * POST /api/claims/:id/review — the only route that reaches the guarded
 * `update_claim` tool, so the single place a claim's status can change.
 *
 * @param {string} id
 * @param {'approve' | 'request_info'} action
 * @returns {Promise<any>} { claim_id, old_status, new_status, tool_call, … }
 */
export async function reviewClaim(id, action) {
  if (USE_DEMO) {
    await delay(MOCK_DELAY_MS)
    return {
      claim_id: id,
      old_status: 'PENDING',
      new_status: action === 'approve' ? 'APPROVED' : 'MORE_INFO_REQUIRED',
    }
  }
  return request(`/api/claims/${encodeURIComponent(id)}/review`, {
    method: 'POST',
    body: { action },
  })
}

/**
 * POST /api/claims/:id/analyze — start an agent run (202 Accepted). Progress
 * arrives over openAnalysisStream(); the status column is never changed by it.
 *
 * @param {string} id
 * @returns {Promise<any>}
 */
export async function analyzeClaim(id) {
  if (USE_DEMO) {
    await delay(MOCK_DELAY_MS)
    return { claim_id: id, analysis_id: 0, state: 'running' }
  }
  return request(`/api/claims/${encodeURIComponent(id)}/analyze`, { method: 'POST' })
}

/**
 * GET /api/claims/:id/stream — live agent progress as Server-Sent Events.
 * EventSource cannot set an Authorization header, so the JWT is passed as
 * `?token=` instead. Frames arrive as `<analysis_id>-<seq>` with the event
 * name (`analysis_started` | `agent_status` | `awaiting_review` |
 * `analysis_failed`) and a JSON payload.
 *
 * @param {string} id
 * @returns {EventSource} the open stream — the caller closes it
 */
export function openAnalysisStream(id) {
  return new EventSource(
    withToken(`${API_BASE_URL}/api/claims/${encodeURIComponent(id)}/stream`),
  )
}