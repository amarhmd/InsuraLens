/* ==========================================================================
   Attachment rules — the file types, size limits, document slots, and format
   helpers shared by the create-claim modal's photo/document staging and by the
   claim workspace's "Add evidence" control. Everything here is pure; upload
   state stays in the components.
   ========================================================================== */

/* The accepted types mirror what the backend's evidence endpoint actually
   stores (images: JPEG/PNG/WebP, documents: PDF). A HEIC or DOCX picked here
   would be rejected by the server, so it is rejected up front instead. */
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const PHOTO_EXTENSIONS = /\.(jpe?g|png|webp)$/i
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'
export const MAX_PHOTO_MB = 10
export const MAX_PHOTOS = 20

export const DOC_TYPES = ['application/pdf']
export const DOC_EXTENSIONS = /\.pdf$/i
export const DOC_ACCEPT = 'application/pdf,.pdf'
export const MAX_DOC_MB = 15

/** `accept` for the workspace's single "Add evidence" input. */
export const EVIDENCE_ACCEPT =
  'image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf'

/* Only claim-specific documents live here. The policy is a contract-level
   document stored once against the customer, so it is never uploaded per claim. */
export const DOC_SLOTS = [
  { key: 'accident', label: 'Accident report' },
  { key: 'statement', label: 'Customer statement' },
] as const

export type DocSlotKey = (typeof DOC_SLOTS)[number]['key']

export interface StagedPhoto {
  id: string
  file: File
  name: string
  size: number
  url: string
  caption: string
}

export interface StagedDoc {
  file: File
  name: string
  size: number
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  const mb = bytes / (1024 * 1024)
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`
}

export function matchesType(file: File, types: string[], extensions: RegExp): boolean {
  /* Some browsers hand over an empty MIME type (HEIC on Windows, for one) —
     fall back to the file name so those files still count. */
  if (file.type) return types.includes(file.type)
  return extensions.test(file.name)
}

/**
 * Reject a file the evidence endpoint cannot store before it is uploaded or
 * attached to a new claim. Returns a human-readable problem, or null when the
 * file is acceptable. Images must be JPEG/PNG/WebP; documents must be PDF.
 */
export function validateEvidenceFile(file: File): string | null {
  const image = matchesType(file, PHOTO_TYPES, PHOTO_EXTENSIONS)
  const document = matchesType(file, DOC_TYPES, DOC_EXTENSIONS)
  if (!image && !document) {
    return `"${file.name}" isn't a supported file — use JPG, PNG, WebP, or PDF.`
  }
  const limitMb = image ? MAX_PHOTO_MB : MAX_DOC_MB
  if (file.size > limitMb * 1024 * 1024) {
    return `"${file.name}" is ${formatBytes(file.size)} — the limit is ${limitMb} MB.`
  }
  return null
}