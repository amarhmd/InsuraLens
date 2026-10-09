/* Claims API — the work queue behind #/claims and #/claims/:id.

   Mock mode: reads and mutates the single dataset in src/mocks/claims.ts
   (the same array the Dashboard and Analytics compute from, so a created
   claim shows up in every count immediately) after a small simulated delay.
   Each function names the backend endpoint it will become; swap the mock
   body for `await request(...)` from ./http.js when the server exists. */

import { delay } from './http'
import { formatDate, nextClaimId } from '../lib/claimsData'
import { mockClaims } from '../mocks/claims'

/** Simulated network latency for mock responses (ms). */
const MOCK_DELAY_MS = 200

/**
 * GET /api/claims — the full work-queue list.
 * Future query params: status, priority, incident, q, page, page_size
 * (see docs/API_CONTRACT.md for the pagination envelope).
 *
 * @param {Record<string, string | number | undefined>} [params]
 * @returns {Promise<Array<import('../lib/claimsData').Claim>>}
 */
export async function listClaims(params) {
  await delay(MOCK_DELAY_MS)
  void params /* mock returns the whole dataset; the server will filter. */
  /* TODO(backend): return request('/api/claims', { query: params })
     — if the caller sends ?page=, unwrap the envelope first:
       (await request('/api/claims', { query: params })).items
     (see docs/API_CONTRACT.md → Pagination format). */
  return mockClaims.map((claim) => ({ ...claim }))
}

/**
 * GET /api/claims/:id — one claim for the workspace page.
 *
 * @param {string} id
 * @returns {Promise<import('../lib/claimsData').Claim | null>} null when no claim has this id (404)
 */
export async function getClaim(id) {
  await delay(MOCK_DELAY_MS)
  /* TODO(backend): return request(`/api/claims/${id}`) — map 404 to null */
  const claim = mockClaims.find((c) => c.id === id)
  return claim ? { ...claim } : null
}

/**
 * POST /api/claims — create a claim from the create-claim modal draft.
 * The new record joins the shared dataset, so every page's counts update.
 *
 * @param {import('../pages/claims/CreateClaimModal').ClaimDraft} draft
 * @returns {Promise<import('../lib/claimsData').Claim>}
 */
export async function createClaim(draft) {
  await delay(MOCK_DELAY_MS)
  /* TODO(backend): return request('/api/claims', { method: 'POST', body: … }) */
  const id = nextClaimId(mockClaims)
  const dateReportedValue = Date.parse(`${draft.date}T00:00:00Z`)
  const evidenceItems = draft.photos.length + draft.documents.length
  const claim = {
    id,
    customer: draft.customer,
    incident: draft.incident || 'other',
    dateReported: formatDate(dateReportedValue),
    dateReportedValue,
    policyRef: draft.policyRef || 'Not assigned',
    evidenceItems,
    /* Evidence reads "Complete" only once all three document slots are
       filled — photos alone still leave the claim waiting on paperwork. */
    evidence: draft.documents.length >= 3 ? 'Complete' : 'Incomplete',
    aiAnalysis: 'Not started',
    policyMatch: 'Not Evaluated',
    priority: draft.priority,
    status: 'new',
    updatedLabel: 'Just now',
    updatedMinutes: 0,
    description: draft.description,
    ...(draft.photos.length > 0 && { photos: draft.photos }),
  }

  mockClaims.unshift(claim)
  return { ...claim }
}
