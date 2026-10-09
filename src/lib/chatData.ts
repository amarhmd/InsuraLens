/* ==========================================================================
   Agent Chat domain library — message/conversation types, ID + clock
   helpers, the evidence breakdown, and the claim lookup.

   The mock content itself (conversation seeds, evidence source metadata,
   suggestions, and the canned demonstration response builder) lives in
   src/mocks/chat.ts and is re-exported here, so components and the data
   gate keep importing from one module.
   ========================================================================== */

import { mockClaims } from './claimsData'
import type { Claim } from './claimsData'

export { buildDemoReply, getSource, seedConversations, SUGGESTIONS } from '../mocks/chat'

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
  /** Illustrative tool activity (user-facing summaries only). */
  activity?: ActivityStep[]
  /** Marks canned demo content as such. */
  demo?: boolean
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
/* Evidence source metadata shape (values assembled in src/mocks/chat.ts)      */
/* -------------------------------------------------------------------------- */

export interface EvidenceSource {
  id: string
  name: string
  chipLabel: string
  type: string
  fileName: string
  dateAdded: string
  status: string
  summary: string
  sectionLabel?: string
  related: string[]
}

/** What a (canned or real) agent reply consists of. */
export interface DemoReply {
  sections: Section[]
  activity: ActivityStep[]
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

/* -------------------------------------------------------------------------- */
/* Evidence breakdown                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Splits a claim's evidence count into source groups. The parts always add
 * back up to `claim.evidenceItems`, so the right panel totals stay honest:
 * CLM-10482 (8 items) → 1 report + 4 photos + 1 statement + 2 policy files.
 */
export interface EvidenceRow {
  sourceId: string
  count: number
}

export function evidenceBreakdown(claim?: Claim): EvidenceRow[] {
  if (!claim || claim.evidenceItems <= 0) return []
  const items = claim.evidenceItems
  let rows: EvidenceRow[]
  if (items >= 4) {
    rows = [
      { sourceId: 'accident-report', count: 1 },
      { sourceId: 'vehicle-photos', count: items - 4 },
      { sourceId: 'customer-statement', count: 1 },
      { sourceId: 'policy-documents', count: 2 },
    ]
  } else {
    rows = [{ sourceId: 'accident-report', count: 1 }]
    let left = items - 1
    if (left > 0) {
      rows.push({ sourceId: 'customer-statement', count: 1 })
      left -= 1
    }
    if (left > 0) rows.push({ sourceId: 'vehicle-photos', count: left })
  }
  return rows.filter((r) => r.count > 0)
}

/** Claim lookup over the shared mock dataset. */
export function claimById(id?: string): Claim | undefined {
  if (!id) return undefined
  return mockClaims.find((c) => c.id === id)
}
