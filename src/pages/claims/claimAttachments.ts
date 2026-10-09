/* ==========================================================================
   Create-claim attachment rules — the file types, size limits, document
   slots, and format helpers shared by the modal's photo and document
   staging. Everything here is pure; upload state stays in CreateClaimModal.
   ========================================================================== */

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
export const PHOTO_EXTENSIONS = /\.(jpe?g|png|heic|heif|webp)$/i
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,image/webp,.heic,.heif'
export const MAX_PHOTO_MB = 10
export const MAX_PHOTOS = 20

export const DOC_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
export const DOC_EXTENSIONS = /\.(pdf|docx)$/i
export const DOC_ACCEPT = 'application/pdf,.pdf,.docx'
export const MAX_DOC_MB = 15

export const DOC_SLOTS = [
  { key: 'accident', label: 'Accident report' },
  { key: 'statement', label: 'Customer statement' },
  { key: 'policy', label: 'Policy document' },
] as const

export type DocSlotKey = (typeof DOC_SLOTS)[number]['key']

export interface StagedPhoto {
  id: string
  file: File
  name: string
  size: number
  url: string
  caption: string
  progress: number
}

export interface StagedDoc {
  name: string
  size: number
  progress: number
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