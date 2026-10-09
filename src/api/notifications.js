/* Notifications API — future inbox behind the TopHeader bell.

   The bell is decorative in the prototype; these functions document the
   shape the backend should provide so wiring the inbox is a UI-only task. */

import { delay } from './http'
import { mockNotifications } from '../mocks/notifications'

/** Simulated network latency for mock responses (ms). */
const MOCK_DELAY_MS = 150

/**
 * GET /api/notifications — the reviewer's notification list.
 *
 * @returns {Promise<Array<import('../mocks/notifications').Notification>>}
 */
export async function listNotifications() {
  await delay(MOCK_DELAY_MS)
  /* TODO(backend): return request('/api/notifications') */
  return mockNotifications.map((item) => ({ ...item }))
}

/**
 * POST /api/notifications/:id/read — mark one notification as read.
 *
 * @param {string} id
 * @returns {Promise<import('../mocks/notifications').Notification | null>}
 */
export async function markNotificationRead(id) {
  await delay(MOCK_DELAY_MS)
  /* TODO(backend): return request(`/api/notifications/${id}/read`, { method: 'POST' }) */
  const item = mockNotifications.find((n) => n.id === id)
  if (item) item.read = true
  return item ? { ...item } : null
}
