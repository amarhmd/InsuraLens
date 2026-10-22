/* Evidence API — file uploads attached to a claim.

   This module is the single seam between "staged file" and "stored file".
   uploadClaimEvidence() posts one file to the backend and reports real
   transfer progress from XHR.

   Upload rules (enforced client-side today, must be enforced server-side
   too — see docs/API_CONTRACT.md):
     photos  image/jpeg, image/png, image/webp — max 10 MB each,
             max 20 per claim
     documents  application/pdf — max 15 MB each
*/

import { ApiError, API_BASE_URL, getToken } from './http'

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
      reject(new ApiError(httpError(xhr), { status: xhr.status, code: `http_${xhr.status}` }))
    }

    xhr.onerror = () => {
      reject(
        new ApiError(
          'Could not reach the server. If it has just started, it may still be waking up — please try again in a moment.',
          { status: 0, code: 'network_error' },
        ),
      )
    }

    xhr.send(form)
  })
}

/** Best-effort message from an XHR error body, falling back to the status. */
function httpError(xhr) {
  try {
    const body = JSON.parse(xhr.responseText)
    return body?.error?.message ?? body?.message ?? xhr.statusText
  } catch {
    return xhr.statusText || 'Upload failed'
  }
}

/** Pick the EvidenceForm part a file belongs in: images | report. */
export function evidenceField(file) {
  const type = (file.type || '').toLowerCase()
  return type.startsWith('image/') ? 'images' : 'report'
}
