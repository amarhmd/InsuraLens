/* Evidence API — file uploads attached to a claim.

   Mock mode: simulated progress for the create-claim modal. Nothing leaves
   the browser; progress ticks advance on a setTimeout chain and larger
   files step slower so the bar behaves like a transfer rather than a
   metronome. This module is the single seam between "staged file" and
   "stored file": a real transfer replaces the body of uploadEvidence and
   keeps the (file, onProgress) => Promise<void> shape every caller speaks.

   Upload rules (enforced client-side today, must be enforced server-side
   too — see docs/API_CONTRACT.md):
     photos  image/jpeg, image/png, image/heic, image/webp — max 10 MB each,
             max 20 per claim
     documents  application/pdf, docx — max 15 MB each
*/

import { ApiError, API_BASE_URL, USE_DEMO, delay, getToken } from './http'

/** Simulated round-trip before the first progress tick (ms). */
const MOCK_DELAY_MS = 150

/**
 * POST /api/claims/:claimId/evidence — upload one evidence file
 * (multipart/form-data, field name "file").
 *
 * @param {File} file the file being transferred
 * @param {(percent: number) => void} onProgress integer 0–100; 100 means done
 * @returns {Promise<void>}
 */
export async function uploadEvidence(file, onProgress) {
  /* TODO(backend): POST multipart to `/api/claims/${claimId}/evidence`
     (e.g. via XMLHttpRequest or fetch streams for real progress events). */
  await delay(MOCK_DELAY_MS)
  return new Promise((resolve) => {
    const tickMs = Math.min(240, 110 + (file.size / (1024 * 1024)) * 14)
    let percent = 0

    onProgress(0)

    const step = () => {
      percent = Math.min(100, percent + 14 + Math.floor(Math.random() * 22))
      onProgress(percent)
      if (percent >= 100) {
        resolve(undefined)
        return
      }
      window.setTimeout(step, tickMs)
    }

    window.setTimeout(step, tickMs)
  })
}

/**
 * POST /api/claims/:id/evidence — attach one file to an existing claim
 * (multipart/form-data).
 *
 * The backend's EvidenceForm splits uploads across two parts: `images`
 * (image files) and `report` (everything else). The policy is not claim
 * evidence — it is stored once on the customer's contract — so no `policy`
 * part is ever sent here.
 *
 * Uses XMLHttpRequest rather than fetch: only XHR reports upload progress, and
 * the workspace shows a percentage while a file transfers.
 *
 * @param {string} claimId the claim the file belongs to
 * @param {File} file the file being uploaded
 * @param {(percent: number) => void} onProgress integer 0–100; 100 means done
 * @returns {Promise<any>} the server's `{ files: ClaimFile[] }` body (or null)
 */
export function uploadClaimEvidence(claimId, file, onProgress) {
  /* Demo mode keeps the browser-only progress bar: no request leaves the page. */
  if (USE_DEMO) return uploadEvidence(file, onProgress)

  const form = new FormData()
  form.append(evidenceField(file), file, file.name)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE_URL}/api/claims/${encodeURIComponent(claimId)}/evidence`)

    const token = getToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100)
        try {
          resolve(xhr.responseText ? JSON.parse(xhr.responseText) : null)
        } catch {
          resolve(null)
        }
        return
      }

      /* The server's error envelope is { error: { code, message } } (e.g. a
         CLAIM_BUSY 409 while an analysis or review is running). */
      let message = xhr.statusText || 'Upload failed'
      try {
        message = JSON.parse(xhr.responseText)?.error?.message ?? message
      } catch {
        /* Non-JSON body — status text is all we have. */
      }
      reject(new ApiError(message, { status: xhr.status, code: `http_${xhr.status}` }))
    }

    xhr.onerror = () =>
      reject(
        new ApiError(
          'Could not reach the server while uploading. It may be waking up — please try again.',
          { status: 0, code: 'network_error' },
        ),
      )

    onProgress(0)
    xhr.send(form)
  })
}

/** Pick the EvidenceForm part a file belongs in: images | report. */
function evidenceField(file) {
  const type = (file.type || '').toLowerCase()
  return type.startsWith('image/') ? 'images' : 'report'
}
