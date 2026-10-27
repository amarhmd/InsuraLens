/* Claims API — the work queue behind #/claims and #/claims/:id, plus the
   human-review and agent-pipeline routes.

   listClaims, getClaim and createClaim talk to the real backend and map its
   field names and values to the shape the UI already uses (see Claim in
   src/lib/claimsData.ts). reviewClaim / analyzeClaim / openAnalysisStream
   expose the review and agent-run routes.

   Evidence count: GET /api/claims (the list) omits each claim's `files`, so the
   per-row "N items" would otherwise read 0 for every claim. Counts are derived
   by fetching each claim's detail with limited concurrency and are cached for
   the session; `evidenceCount` / `fileCount` on the row (if the backend adds
   them) is preferred and skips the extra fetch entirely. */

import { ApiError, API_BASE_URL, request, withToken } from './http'
import { evidenceField } from './evidence'
import { formatAgo, formatDate } from '../lib/claimsData'

/** The backend caps a page at 100 claims; the queue reads client-side filters. */
const MAX_PAGE_SIZE = 100

/** How many detail fetches run at once while deriving evidence counts. */
const EVIDENCE_CONCURRENCY = 5

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

/* ------------------------------------------------------------------ */
/* Evidence counts (cached, derived)                                   */
/* ------------------------------------------------------------------ */

/** claim id -> evidence file count (excludes the contract-level policy file). */
const evidenceCountCache = new Map()

/** A backend file list -> the claim's evidence count. */
function countEvidenceFiles(files) {
  if (!Array.isArray(files)) return null
  return files.filter((file) => file?.kind !== 'policy').length
}

/** An inline count from the list row, if the backend ever supplies one. */
function inlineEvidenceCount(row) {
  if (typeof row.evidenceCount === 'number') return row.evidenceCount
  if (typeof row.fileCount === 'number') return row.fileCount
  if (Array.isArray(row.files)) return countEvidenceFiles(row.files)
  return null
}

/**
 * Fetch the detail of each id and cache its evidence count. Runs a small pool
 * so a full queue never opens a hundred sockets at once. Best-effort: a failed
 * fetch is skipped (that row keeps whatever count the cache already holds).
 */
async function deriveEvidenceCounts(ids) {
  if (ids.length === 0) return
  let cursor = 0
  const workers = Array.from(
    { length: Math.min(EVIDENCE_CONCURRENCY, ids.length) },
    async () => {
      while (cursor < ids.length) {
        const id = ids[cursor]
        cursor += 1
        try {
          const data = await request(`/api/claims/${encodeURIComponent(id)}`)
          const claim = data.claim ?? data
          const files = data.files ?? claim.files
          const count = countEvidenceFiles(files)
          if (count !== null) evidenceCountCache.set(id, count)
        } catch {
          /* Leave unknown — the row falls back to its cached value. */
        }
      }
    },
  )
  await Promise.all(workers)
}

/** Map one backend claim to the UI's Claim shape. */
function fromApi(c, evidenceItems = 0) {
  const dateReportedValue = Date.parse(c.createdAt)
  const updatedMinutes = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(c.updatedAt ?? c.createdAt)) / 60000),
  )
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
    updatedAt: c.updatedAt ?? c.updated_at ?? null,
    description: c.description ?? '',
    /* Extra backend fields the UI may use later. */
    vehicle: c.vehicle,
    estimatedAmount: c.estimatedAmount ?? null,
    inconsistencyFlag: Boolean(c.inconsistencyFlag),
    decision: c.status, // PENDING | APPROVED | MORE_INFO_REQUIRED
    /* Claim-level AI fields used by the workspace mapper/card. */
    damageSummary: c.damageSummary ?? null,
    analysisState: c.analysisState ?? null,
    analysisId: c.analysisId ?? c.analysis_id ?? null,
    analysisError: c.analysisError ?? c.analysis_error ?? c.errorMessage ?? c.error_message ?? null,
    coverageStatus: c.coverageStatus ?? null,
  }
}

/**
 * GET /api/claims — the full work-queue list (one page of up to 100; the
 * page filters, sorts and paginates client-side). The request asks for
 * page_size=100 so the client-side tab counts and totals are exact.
 *
 * @param {Record<string, string | number | undefined>} [params]
 * @returns {Promise<Array<import('../lib/claimsData').Claim>>}
 */
export async function listClaims(params) {
  const res = await request('/api/claims', { query: toQuery(params) })
  const rows = Array.isArray(res) ? res : (res.items ?? res.claims ?? res.data ?? [])

  /* Seed what the list already gives us, collect the rows still missing a
     count, then derive those in one bounded pass. */
  const missing = []
  for (const row of rows) {
    const inline = inlineEvidenceCount(row)
    if (inline !== null) evidenceCountCache.set(row.id, inline)
    else if (!evidenceCountCache.has(row.id)) missing.push(row.id)
  }
  await deriveEvidenceCounts(missing)

  return rows.map((claim) => {
    const inline = inlineEvidenceCount(claim)
    const count = inline ?? evidenceCountCache.get(claim.id) ?? 0
    return fromApi(claim, count)
  })
}

/**
 * Normalize caller params to the backend's vocabulary: drop empties, clamp the
 * page size, and translate the few names that differ.
 *
 * @param {Record<string, string | number | undefined>} [params]
 */
function toQuery(params) {
  const { sort, ...rest } = { ...params }
  /* The backend reads `page_size` (snake_case) and returns the paged envelope
     with it, so the client can request every claim in one capped page. */
  const query = { ...rest, page: 1, page_size: MAX_PAGE_SIZE }

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
 *
 * @param {string} id
 * @returns {Promise<(import('../lib/claimsData').Claim & { files: any[], analysis: any }) | null>}
 *   null when no claim has this id (404)
 */
export async function getClaim(id) {
  try {
    const data = await request(`/api/claims/${encodeURIComponent(id)}`)
    const claim = data.claim ?? data
    const files = data.files ?? claim.files ?? []
    const analysis = data.analysis ?? claim.analysis ?? null
    const safeFiles = Array.isArray(files) ? files : []
    /* The detail is authoritative — keep the derived count cache warm. */
    const count = countEvidenceFiles(safeFiles)
    if (count !== null) evidenceCountCache.set(claim.id, count)
    return { ...fromApi(claim, count ?? 0), files: safeFiles, analysis }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

/**
 * POST /api/claims — create a claim. The request is multipart/form-data so
 * evidence files can ride along with the text fields.
 *
 * @param {import('../pages/claims/CreateClaimModal').ClaimDraft} draft
 * @returns {Promise<import('../lib/claimsData').Claim>}
 */
export async function createClaim(draft) {
  const form = new FormData()
  form.append('customerName', draft.customer)
  /* The backend requires `vehicle`, which the create modal does not collect. */
  form.append('vehicle', 'Not provided')
  form.append('description', draft.description || '')
  form.append('priority', draft.priority)
  form.append('incidentType', draft.incident || 'other')
  if (draft.policyRef) form.append('policyId', draft.policyRef)

  /* Staged evidence rides along with the create request, routed to the part
     the backend's EvidenceForm expects (`images` for photos, `report` for
     documents), so the claim has its files the moment it exists. */
  for (const file of draft.files ?? []) form.append(evidenceField(file), file, file.name)

  const res = await request('/api/claims', { method: 'POST', body: form })
  const claim = res?.claim ?? res?.data ?? res
  const count = inlineEvidenceCount(claim) ?? countEvidenceFiles(claim?.files) ?? 0
  if (typeof count === 'number') evidenceCountCache.set(claim.id, count)
  return fromApi(claim, count ?? 0)
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
  return request(`/api/claims/${encodeURIComponent(id)}/analyze`, { method: 'POST' })
}

/**
 * Trigger AI analysis via a direct n8n webhook (frontend-initiated).
 * Reads URL/method from Vite env vars. Never logs the URL.
 *
 * @param {string} claimId
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<any>}
 */
export async function triggerAnalysisWebhook(claimId, options = {}) {
  const webhookUrl = import.meta.env.VITE_ANALYSIS_WEBHOOK_URL
  if (!webhookUrl || String(webhookUrl).trim() === '') {
    throw new ApiError('Analysis is not configured', { status: 0, code: 'analysis_not_configured' })
  }

  const method = String(import.meta.env.VITE_ANALYSIS_WEBHOOK_METHOD || 'POST').toUpperCase()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000)
  const signal = options.signal || controller.signal

  try {
    if (method === 'GET') {
      const url = new URL(webhookUrl)
      url.searchParams.set('claimId', claimId)
      const res = await fetch(url.toString(), { method: 'GET', signal })
      if (!res.ok) {
        throw new ApiError(`Webhook request failed (${res.status})`, { status: res.status, code: `http_${res.status}` })
      }
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        try {
          return await res.json()
        } catch {
          return null
        }
      }
      try {
        return await res.text()
      } catch {
        return null
      }
    } else {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId }),
        signal,
      })
      if (!res.ok) {
        throw new ApiError(`Webhook request failed (${res.status})`, { status: res.status, code: `http_${res.status}` })
      }
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        try {
          return await res.json()
        } catch {
          return null
        }
      }
      try {
        return await res.text()
      } catch {
        return null
      }
    }
  } catch (cause) {
    if (cause instanceof ApiError) throw cause
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw new ApiError('The analysis request timed out.', { status: 0, code: 'timeout', details: cause })
    }
    throw new ApiError('Could not reach the analysis service.', { status: 0, code: 'network_error', details: cause })
  } finally {
    clearTimeout(timeout)
  }
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
