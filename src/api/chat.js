/* Agent Chat API — conversations and the assistant reply.

   sendChatMessage talks to POST /api/chat/messages and converts the plain-text
   reply into the page's `sections`. The backend thread (conversationId) is
   remembered per claim so follow-up questions stay connected.

   listConversations maps GET /api/chat/conversations into the page's
   Conversation shape. The list endpoint returns headers only — the messages
   live in the conversation detail endpoint — so each row starts with an empty
   `messages` array that sendChatMessage() appends to.

   Set VITE_USE_DEMO=true to serve src/mocks/chat.ts instead. */

import { USE_DEMO, request } from './http'
import { clockNow, nextId, seedConversations } from '../lib/chatData'

/** Simulated latency for the mock conversation list (ms). */
const MOCK_LIST_DELAY_MS = 150

/** Conversations updated within this many hours are grouped as "Recent". */
const RECENT_HOURS = 48

/** Backend conversation ids, keyed by claim id ('general' = no claim). */
const threads = new Map()

/** "2026-10-13T09:42:10Z" -> "2h ago" / "Oct 13" for the list's time column. */
function relativeTime(iso) {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ''
  const hours = (Date.now() - ms) / 3_600_000
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${Math.max(1, Math.floor(hours))}h ago`
  if (hours < 24 * 7) return `${Math.floor(hours / 24)}d ago`
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Map one backend conversation to the page's Conversation shape. */
function toConversation(row) {
  const updated = row.updatedAt ?? row.createdAt
  const hours = (Date.now() - Date.parse(updated)) / 3_600_000
  return {
    id: row.id,
    title: row.title || 'Conversation',
    group: hours < RECENT_HOURS ? 'Recent' : 'Earlier',
    time: relativeTime(updated),
    claimId: row.claimId ?? undefined,
    /* Messages are fetched with the conversation detail route when a thread is
       opened; the list carries headers only, so start empty. */
    messages: [],
  }
}

/**
 * GET /api/chat/conversations — the thread list behind the left panel.
 *
 * @returns {Promise<Array<import('../lib/chatData').Conversation>>}
 */
export async function listConversations() {
  if (USE_DEMO) return seedConversations()

  const res = await request('/api/chat/conversations')
  const rows = Array.isArray(res) ? res : (res.items ?? res.conversations ?? res.data ?? [])
  return rows.map(toConversation)
}

/** Plain text -> page sections: paragraphs, bullet lists, numbered lists. */
function toSections(content, sources) {
  const sections = []
  const blocks = String(content ?? '').split(/\n{2,}/)
  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    if (lines.length === 0) continue
    if (lines.every((line) => /^[-*•]\s+/.test(line))) {
      sections.push({ kind: 'bullets', items: lines.map((l) => l.replace(/^[-*•]\s+/, '')) })
    } else if (lines.every((line) => /^\d+[.)]\s+/.test(line))) {
      sections.push({ kind: 'numbered', items: lines.map((l) => l.replace(/^\d+[.)]\s+/, '')) })
    } else {
      sections.push({ kind: 'paragraph', text: lines.join(' ') })
    }
  }
  const titles = (sources ?? []).map((s) => s.title).filter(Boolean)
  if (titles.length > 0) {
    sections.push({ kind: 'paragraph', text: `Sources: ${titles.join(' · ')}` })
  }
  return sections
}

/**
 * POST /api/chat/messages — send a question, receive the assistant reply.
 * The claim context comes from the conversation's pinned claimId.
 *
 * @param {{ question: string, claimId?: string }} payload
 * @returns {Promise<import('../lib/chatData').ChatMessage>} the assistant message
 */
export async function sendChatMessage({ question, claimId }) {
  const key = claimId ?? 'general'
  const res = await request('/api/chat/messages', {
    method: 'POST',
    body: {
      content: question,
      ...(claimId && { claimId }),
      ...(threads.has(key) && { conversationId: threads.get(key) }),
    },
  })
  if (res.conversationId) threads.set(key, res.conversationId)

  const reply = [...(res.messages ?? [])].reverse().find((m) => m.role === 'assistant')
  return {
    id: reply?.id ?? nextId('msg'),
    role: 'assistant',
    time: clockNow(),
    sections: toSections(reply?.content ?? '', reply?.sources),
    activity: [],
  }
}