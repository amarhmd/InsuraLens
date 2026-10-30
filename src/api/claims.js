/* Claims API — the work queue behind #/claims and #/claims/:id, plus the
   human-review and agent-pipeline routes.

   listClaims, getClaim and createClaim talk to the real backend and map its
   field names and values to the shape the UI already uses (see Claim in
   src/lib/claimsData.ts). reviewClaim / analyzeClaim expose the review and
   retry-analysis routes.

   Evidence count: GET /api/claims (the list) omits each claim's `files`, so the
   per-row "N items" would otherwise read 0 for every claim. Counts are derived
   by fetching each claim's detail with limited concurrency and are cached for
   the session; `evidenceCount` / `fileCount` on the row (if the backend adds
   them) is preferred and skips the extra fetch entirely. */

import { ApiError, request } from './http'
import { evidenceField } from './evidence'
import { formatAgo, formatDate } from '../lib/claimsData'

/** The backend caps a page at 100 claims; the queue reads client-side filters. */
const MAX_PAGE_SIZE = 100

/** Create-claim carries evidence uploads, so it gets a longer ceiling. */
const CREATE_CLAIM_TIMEOUT_MS = 120_000

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

/** claim id -> whether the claim has at least one non-image evidence document. */
const evidenceDocumentCache = new Map()

/** A backend file list -> the claim's evidence count. */
function countEvidenceFiles(files) {
  if (!Array.isArray(files)) return null
  return files.filter((file) => file?.kind !== 'policy').length
}

/** A backend file is an image when its MIME type or kind says so. */
function isImageFile(file) {
  const mimeType = String(file?.mimeType ?? file?.mime_type ?? '').toLowerCase()
  return (
    mimeType.startsWith('image/') ||
    file?.kind === 'image' ||
    file?.kind === 'photo' ||
    file?.kind === 'images'
  )
}

/**
 * A backend file list -> whether it contains a non-image evidence document
 * (accident report / PDF). Images alone or no files are false; an unknown
 * list is null so insight rules never turn missing data into a match.
 */
function hasDocumentFile(files) {
  if (!Array.isArray(files)) return null
  return files
    .filter((file) => file?.kind !== 'policy')
    .some((file) => !isImageFile(file))
}

/** An inline count from the list row, if the backend ever supplies one. */
function inlineEvidenceCount(row) {
  if (typeof row.evidenceCount === 'number') return row.evidenceCount
  if (typeof row.fileCount === 'number') return row.fileCount
  if (Array.isArray(row.files)) return countEvidenceFiles(row.files)
  return null
}

/** A list row's inline files, when the backend includes them. */
function inlineFiles(row) {
  return Array.isArray(row.files) ? row.files : null
}

/**
 * Fetch the detail of each id and cache its evidence count and document flag.
 * Runs a small pool so a full queue never opens a hundred sockets at once.
 * Best-effort: a failed fetch is skipped (that row keeps whatever data the
 * cache already holds).
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
          const hasDocument = hasDocumentFile(files)
          if (hasDocument !== null) evidenceDocumentCache.set(id, hasDocument)
        } catch {
          /* Leave unknown — the row falls back to its cached value. */
        }
      }
    },
  )
  await Promise.all(workers)
}

/** A boolean-ish backend field -> true/false, or null when it was not sent. */
function booleanOrNull(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return null
}

/** One backend damage-area source -> plain zone labels. */
function damageAreaLabels(raw) {
  if (typeof raw === 'string') {
    const value = raw.trim()
    return value ? [value] : []
  }
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (typeof item === 'string') return item
      if (!item || typeof item !== 'object') return ''
      return item.part ?? item.zone ?? item.area ?? item.description ?? item.name ?? ''
    })
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
}

/**
 * Backend damage areas / vision damages -> plain zone labels. Real structured
 * areas win over inferred ones, so the first non-empty source is returned.
 */
function damageAreasFrom(c) {
  const sources = [
    c.damageAreas,
    c.damage_areas,
    c.analysis?.damageAreas,
    c.analysis?.damage_areas,
    c.analysis?.vision?.damages,
    c.analysis?.damages,
    c.findings,
    c.damages,
    c.analysis?.findings,
  ]
  for (const raw of sources) {
    const areas = damageAreaLabels(raw)
    if (areas.length > 0) return areas
  }
  return null
}

/** Map one backend claim to the UI's Claim shape. */
function fromApi(c, evidenceItems = 0, hasDocumentEvidence = null) {
  const dateReportedValue = Date.parse(c.createdAt)
  const updatedMinutes = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(c.updatedAt ?? c.createdAt)) / 60000),
  )
  const coverageStatus = c.coverageStatus ?? c.coverage_status ?? null
  const inconsistencyFlag = booleanOrNull(
    c.inconsistencyFlag ?? c.inconsistency_flag ?? c.analysis?.inconsistencyFlag,
  )
  const policyMismatch = booleanOrNull(
    c.policyMismatch ??
      c.policy_mismatch ??
      c.analysis?.policy?.mismatch ??
      c.analysis?.policy?.policy_mismatch,
  )
  const damageSummary =
    typeof c.damageSummary === 'string'
      ? c.damageSummary.trim() || null
      : typeof c.damage_summary === 'string'
        ? c.damage_summary.trim() || null
        : null

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
    policyMatch: COVERAGE_TO_LABEL[coverageStatus] ?? 'Not Evaluated',
    priority: c.priority,
    status: STAGE_TO_STATUS[c.stage] ?? 'new',
    updatedLabel: formatAgo(updatedMinutes),
    updatedMinutes,
    updatedAt: c.updatedAt ?? c.updated_at ?? null,
    description: c.description ?? '',
    /* Extra backend fields the UI may use later. */
    vehicle: c.vehicle,
    estimatedAmount: c.estimatedAmount ?? null,
    inconsistencyFlag,
    decision: c.status, // PENDING | APPROVED | MORE_INFO_REQUIRED
    /* Claim-level AI fields used by the workspace mapper/card and insights. */
    damageSummary,
    damageAreas: damageAreasFrom(c),
    analysisState: c.analysisState ?? null,
    analysisId: c.analysisId ?? c.analysis_id ?? null,
    analysisError: c.analysisError ?? c.analysis_error ?? c.errorMessage ?? c.error_message ?? null,
    coverageStatus,
    policyMismatch,
    hasDocumentEvidence,
  }
}

/**
 * GET /api/claims — the full work-queue list (one page of up to 100; the
 * page filters, sorts and paginates client-side). The request asks for
 * page_size=100 so the client-side tab counts and totals are exact.
 *
 * @param {Record<string, string | number | undefined>} [params]
 * @param {{ deriveEvidence?: boolean, timeoutMs?: number }} [options]
 * @returns {Promise<Array<import('../lib/claimsData').Claim>>}
 */
export async function listClaims(params, { deriveEvidence = true, timeoutMs } = {}) {
  const res = await request('/api/claims', { query: toQuery(params), timeoutMs })
  const rows = Array.isArray(res) ? res : (res.items ?? res.claims ?? res.data ?? [])

  /* Seed what the list already gives us, collect the rows still missing a
     count or document flag, then derive those in one bounded pass. */
  const missing = new Set()
  for (const row of rows) {
    const inline = inlineEvidenceCount(row)
    if (inline !== null) evidenceCountCache.set(row.id, inline)
    else if (!evidenceCountCache.has(row.id)) missing.add(row.id)

    const files = inlineFiles(row)
    if (files) evidenceDocumentCache.set(row.id, hasDocumentFile(files))
    else if (!evidenceDocumentCache.has(row.id)) missing.add(row.id)
  }
  if (deriveEvidence) await deriveEvidenceCounts([...missing])

  return rows.map((claim) => {
    const inline = inlineEvidenceCount(claim)
    const count = inline ?? evidenceCountCache.get(claim.id) ?? 0
    const hasDocument = evidenceDocumentCache.get(claim.id)
    return fromApi(claim, count, typeof hasDocument === 'boolean' ? hasDocument : null)
  })
}

/**
 * Normalize caller params to the backend's vocabulary: drop empties, clamp the
 * page size, and translate the few names that differ.
 *
 * @param {Record<string, string | number | undefined>} [params]
 */
function toQuery(params) {
  const { sort, page_size, pageSize, ...rest } = { ...params }
  /* The backend reads `page_size` (snake_case). The queue asks for the maximum
     page; timeout lookups ask for a small newest-first page. */
  const requestedSize = Number(page_size ?? pageSize)
  const size =
    Number.isFinite(requestedSize) && requestedSize > 0
      ? Math.min(Math.floor(requestedSize), MAX_PAGE_SIZE)
      : MAX_PAGE_SIZE
  const query = { ...rest, page: 1, page_size: size }

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
    const hasDocument = hasDocumentFile(safeFiles)
    if (hasDocument !== null) evidenceDocumentCache.set(claim.id, hasDocument)
    return { ...fromApi(claim, count ?? 0, hasDocument), files: safeFiles, analysis }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

/**
 * POST /api/claims — create a claim. The request is multipart/form-data so
 * evidence files can ride along with the text fields.
 *
 * Duplicate protection is client-side only (submit button disabled while
 * in flight). The per-draft UUID is kept by the caller for post-timeout
 * verification but is never sent as a header.
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
  /* Existing create fields are camelCase; `incidentDate` follows that shape. */
  form.append('incidentDate', draft.date)
  if (draft.policyRef) form.append('policyId', draft.policyRef)

  /* Staged evidence rides along with the create request, routed to the part
     the backend's EvidenceForm expects (`images` for photos, `report` for
     documents), so the claim has its files the moment it exists. */
  for (const file of draft.files ?? []) form.append(evidenceField(file), file, file.name)

  const res = await request('/api/claims', {
    method: 'POST',
    body: form,
    timeoutMs: CREATE_CLAIM_TIMEOUT_MS,
  })
  const claim = res?.claim ?? res?.data ?? res
  const count = inlineEvidenceCount(claim) ?? countEvidenceFiles(claim?.files) ?? 0
  if (typeof count === 'number') evidenceCountCache.set(claim.id, count)
  const hasDocument =
    hasDocumentFile(claim?.files) ??
    (Array.isArray(draft.files)
      ? draft.files.some((file) => evidenceField(file) === 'report')
      : null)
  if (hasDocument !== null) evidenceDocumentCache.set(claim.id, hasDocument)
  return fromApi(claim, count ?? 0, hasDocument)
}

/**
 * POST /api/claims/:id/review — the only route that reaches the guarded
 * `update_claim` tool, so the single place a claim's status can change.
 *
 * @param {string} id
 * @param {'approve'} action
 * @returns {Promise<any>} { claim_id, old_status, new_status, tool_call, … }
 */
import { DEMO_FALLBACK } from '../lib/demoFallback'

export async function reviewClaim(id, action = 'approve') {
  try {
    return await request(`/api/claims/${encodeURIComponent(id)}/review`, {
      method: 'POST',
      body: { action },
    })
  } catch (cause) {
    if (DEMO_FALLBACK) {
      console.warn('DEMO fallback used')
      return { claim_id: id, old_status: 'PENDING', new_status: 'APPROVED', demo: true }
    }
    throw cause
  }
}

/**
 * POST /api/claims/:id/analyze — start an agent run (202 Accepted). The
 * workspace polls GET /api/claims/:id until the run reaches a terminal state.
 * The status column is never changed by it.
 *
 * @param {string} id
 * @returns {Promise<any>}
 */
export async function analyzeClaim(id) {
  return request(`/api/claims/${encodeURIComponent(id)}/analyze`, { method: 'POST' })
}
