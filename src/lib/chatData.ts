/* ==========================================================================
   Agent Chat domain library — message/conversation types, ID + clock
   helpers, and the evidence model.

   Conversations and replies are real: src/api/chat.js talks to the backend and
   maps its payloads into these types. Evidence comes from the claim's own file
   list (GET /api/claims/:id).
   ========================================================================== */

/* -------------------------------------------------------------------------- */
/* Message model                                                               */
/* -------------------------------------------------------------------------- */

export type PointLabel =
  | 'Observation'
  | 'Supporting material'
  | 'AI interpretation'
  | 'Review consideration'

export type FlagLabel =
  | 'Requires reviewer verification'
  | 'Insufficient evidence to conclude'
  | 'Supporting source unavailable'

/** A citation. `sourceId: null` means the statement has no linked document. */
export interface SourceRef {
  sourceId: string | null
  label: string
}

export type Section =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'numbered'; items: string[] }
  | { kind: 'point'; label: PointLabel; text: string; source: SourceRef }
  | { kind: 'sources'; sourceIds: string[] }
  | { kind: 'flags'; items: FlagLabel[] }
  | { kind: 'reminder'; text: string }
  /** Collapsed-by-default detail block (e.g. "View evidence"). */
  | { kind: 'expand'; title: string; body: Section[] }

export interface ActivityStep {
  text: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  time: string
  /** Plain text — used by user messages and error messages. */
  text?: string
  /** Structured report body — used by assistant responses. */
  sections?: Section[]
  /** Tool activity (user-facing summaries only). */
  activity?: ActivityStep[]
  /** Failed-response state with a retry option. */
  error?: boolean
}

export interface Conversation {
  id: string
  title: string
  group: 'Recent' | 'Earlier'
  time: string
  /** Active claim context; undefined = general assistant. */
  claimId?: string
  messages: ChatMessage[]
}

/* -------------------------------------------------------------------------- */
/* Evidence model                                                              */
/* -------------------------------------------------------------------------- */

/** One backend evidence file (GET /api/claims/:id → files[]), normalised. */
export interface ChatEvidenceFile {
  id: string
  name: string
  /** Backend kind token, e.g. 'image' | 'report' | 'policy'. */
  kind: string
  mimeType?: string
  sizeBytes?: number
  /** Authenticated backend path (needs a token). */
  url?: string
  /** CDN URL, when the backend publishes one. */
  publicUrl?: string
  createdAt?: string
}

export type EvidenceGroupKey = 'photos' | 'documents'

export interface EvidenceGroup {
  key: EvidenceGroupKey
  label: string
  files: ChatEvidenceFile[]
}

const PHOTO_KINDS = new Set(['image', 'photo', 'picture'])

export function evidenceGroupKey(file: ChatEvidenceFile): EvidenceGroupKey {
  return PHOTO_KINDS.has(String(file.kind).toLowerCase()) ? 'photos' : 'documents'
}

/** Group a claim's real files into the two buckets the drawer renders. */
export function groupEvidence(files: ChatEvidenceFile[]): EvidenceGroup[] {
  const photos = files.filter((file) => evidenceGroupKey(file) === 'photos')
  const documents = files.filter((file) => evidenceGroupKey(file) === 'documents')
  const groups: EvidenceGroup[] = [
    { key: 'photos', label: 'Photos', files: photos },
    { key: 'documents', label: 'Documents', files: documents },
  ]
  return groups.filter((group) => group.files.length > 0)
}

/** Normalise a raw backend file row into the chat evidence shape. */
export function toEvidenceFile(raw: unknown): ChatEvidenceFile | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!r.id) return null
  const num = (a: unknown, b: unknown) =>
    typeof a === 'number' ? a : typeof b === 'number' ? b : undefined
  return {
    id: String(r.id),
    name: String(r.name ?? r.fileName ?? 'Evidence file'),
    kind: String(r.kind ?? 'document'),
    mimeType: (r.mimeType ?? r.mime_type) as string | undefined,
    sizeBytes: num(r.sizeBytes, r.size_bytes),
    url: (r.url as string | undefined) ?? undefined,
    publicUrl: ((r.publicUrl ?? r.public_url) as string | undefined) ?? undefined,
    createdAt: ((r.createdAt ?? r.created_at) as string | undefined) ?? undefined,
  }
}

/* -------------------------------------------------------------------------- */
/* IDs + clock                                                                 */
/* -------------------------------------------------------------------------- */

let seq = 0

export function nextId(prefix: string): string {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}-${seq}`
}

export function clockNow(): string {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
