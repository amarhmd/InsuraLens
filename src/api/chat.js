/* Agent Chat API — conversations and the assistant reply.

   sendChatMessage talks to POST /api/chat/messages and converts the plain-text
   reply into the page's `sections`. The backend thread (conversationId) is
   remembered per claim so follow-up questions stay connected.

   listConversations maps GET /api/chat/conversations into the page's
   Conversation shape. The list endpoint returns headers only — the messages
   live in the conversation detail endpoint — so each row starts with an empty
   `messages` array that sendChatMessage() appends to. */

import { request } from './http'
import { clockNow, nextId } from '../lib/chatData'

/** Conversations updated within this many hours are grouped as "Recent". */
const RECENT_HOURS = 48

/* Conversations deleted in this session: never attach their ids to new
   requests and ignore any late replies that would recreate them. */
const deletedConversationIds = new Set()

/**
 * Call the n8n chat webhook directly from the frontend.
 * Never logs the webhook URL.
 */
export async function sendChatWebhookMessage(conversationId, text, options = {}) {
  const webhookUrl = import.meta.env.VITE_CHAT_WEBHOOK_URL
  if (!webhookUrl || String(webhookUrl).trim() === '') {
    throw new Error('Chat is not configured')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000)
  const signal = options.signal || controller.signal

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatInput: text, sessionId: conversationId }),
      signal,
    })

    if (!res.ok) {
      const err = new Error('Webhook request failed')
      err.status = res.status
      throw err
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const textBody = await res.text()
      if (!textBody || textBody.trim() === '') {
        throw new Error('Empty response from chat service')
      }
      return textBody.trim()
    }

    try {
      const data = await res.json()
      const reply = data?.output ?? data?.text ?? data?.message ?? data?.response ?? data?.answer
      if (typeof reply === 'string' && reply.trim() !== '') {
        return reply.trim()
      }
      if (typeof reply === 'object' && reply !== null) {
        const nested = reply?.output ?? reply?.text ?? reply?.message
        if (typeof nested === 'string' && nested.trim() !== '') {
          return nested.trim()
        }
      }
      throw new Error('Empty response from chat service')
    } catch (cause) {
      if (cause instanceof Error && cause.message.startsWith('Webhook') === false && cause.message.startsWith('Chat is not') === false && cause.message.startsWith('Empty') === false && cause.name !== 'SyntaxError') {
        throw cause
      }
      if (cause instanceof SyntaxError) {
        throw new Error('Invalid response from chat service')
      }
      throw cause
    }
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw new Error('The request timed out.')
    }
    if (cause instanceof Error) {
      throw cause
    }
    throw new Error('Could not reach the chat service.')
  } finally {
    clearTimeout(timeout)
  }
}

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
  const res = await request('/api/chat/conversations')
  const rows = Array.isArray(res) ? res : (res.items ?? res.conversations ?? res.data ?? [])
  return rows
    .map(toConversation)
    .filter((conv) => !deletedConversationIds.has(conv.id))
}

/**
 * DELETE /api/chat/conversations/:id — permanently delete a conversation
 * and its messages on the backend. Returns true on success or 404 (already
 * deleted).
 */
export async function deleteConversation(id) {
  if (!id) return
  try {
    await request(`/api/chat/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' })
  } catch (cause) {
    const err = cause
    if (err?.status === 404 || err?.code === 'http_404') {
      /* Already removed on the server — treat as success. */
    } else {
      throw cause
    }
  } finally {
    deletedConversationIds.add(id)
  }
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
 * GET /api/chat/conversations/:id — one conversation with its messages.
 * The list route only returns headers, so this is what fills the transcript.
 *
 * @param {string} id backend conversation id
 * @returns {Promise<{ id: string, title: string, claimId?: string, messages: import('../lib/chatData').ChatMessage[] }>}
 */
export async function getConversation(id) {
  if (!id) throw new Error('Missing conversation id')
  const res = await request(`/api/chat/conversations/${encodeURIComponent(id)}`)
  const row = res?.conversation ?? res ?? {}
  const rows = Array.isArray(row.messages) ? row.messages : []
  return {
    id: row.id ?? id,
    title: row.title || 'Conversation',
    claimId: row.claimId ?? row.claim_id ?? undefined,
    messages: rows.map(mapMessage).filter((m) => m.text || (m.sections && m.sections.length > 0)),
  }
}

/** "09:41" for a backend timestamp; falls back to the current clock. */
function formatTime(iso) {
  const ms = Date.parse(iso ?? '')
  if (Number.isNaN(ms)) return clockNow()
  return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** Map one backend message row into the page's ChatMessage shape. */
function mapMessage(row) {
  const role = row?.role === 'user' ? 'user' : 'assistant'
  const content = String(row?.content ?? row?.text ?? '')
  const id = row?.id != null ? String(row.id) : nextId('msg')
  const time = formatTime(row?.createdAt ?? row?.created_at ?? row?.time)
  if (role === 'user') return { id, role, time, text: content }
  const sections =
    Array.isArray(row?.sections) && row.sections.length > 0
      ? row.sections
      : toSections(content, row?.sources)
  return { id, role, time, sections, activity: [] }
}

/**
 * POST /api/chat/messages — persist the question and receive the backend's
 * own assistant row (ids/timestamps only; the UI shows the webhook reply).
 * When `conversationId` is known the backend appends to that conversation
 * instead of creating a new one.
 *
 * @param {{ question: string, claimId?: string, conversationId?: string }} payload
 * @returns {Promise<{ conversationId: string | undefined, assistant: import('../lib/chatData').ChatMessage | null }>}
 */
export async function sendChatMessage({ question, claimId, conversationId }) {
  const res = await request('/api/chat/messages', {
    method: 'POST',
    body: {
      content: question,
      ...(claimId && { claimId }),
      ...(conversationId && { conversationId }),
    },
  })
  const rows = Array.isArray(res?.messages) ? res.messages : []
  const assistantRow = [...rows].reverse().find((m) => m?.role === 'assistant')
  return {
    conversationId: res?.conversationId ?? conversationId,
    assistant: assistantRow ? mapMessage(assistantRow) : null,
  }
}
