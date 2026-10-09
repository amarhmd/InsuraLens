/* Agent Chat API — conversations and the assistant reply.

   Mock mode: conversations are seeded from src/mocks/chat.ts and replies
   are the canned demonstration content built by buildDemoReply() (also
   src/mocks/chat.ts). This module is the integration seam named in the
   chat module docs: a real backend replaces sendChatMessage's body with
   POST /api/chat/messages — same input (question + claim context), same
   output shape (one assistant ChatMessage). Streaming is not simulated;
   see the open questions in docs/API_CONTRACT.md. */

import { delay } from './http'
import { buildDemoReply, claimById, clockNow, nextId, seedConversations } from '../lib/chatData'

/** The demo agent "thinks" for three quarters of a second before replying. */
const MOCK_REPLY_DELAY_MS = 750

/** Simulated latency for list round-trips (ms). */
const MOCK_LIST_DELAY_MS = 150

/**
 * GET /api/chat/conversations — the reviewer's conversation list (mock seed).
 *
 * @returns {Promise<Array<import('../lib/chatData').Conversation>>}
 */
export async function listConversations() {
  await delay(MOCK_LIST_DELAY_MS)
  /* TODO(backend): return request('/api/chat/conversations') */
  return seedConversations()
}

/**
 * POST /api/chat/messages — send a question, receive the assistant reply.
 * The claim context comes from the conversation's pinned claimId.
 *
 * @param {{ question: string, claimId?: string }} payload
 * @returns {Promise<import('../lib/chatData').ChatMessage>} the assistant message
 */
export async function sendChatMessage({ question, claimId }) {
  await delay(MOCK_REPLY_DELAY_MS)
  /* TODO(backend): return request('/api/chat/messages', {
       method: 'POST', body: { question, claim_id: claimId } }) */
  const demo = buildDemoReply(question, claimById(claimId))
  return {
    id: nextId('msg'),
    role: 'assistant',
    time: clockNow(),
    sections: demo.sections,
    activity: demo.activity,
    demo: true,
  }
}
