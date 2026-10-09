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

import { delay } from './http'

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
