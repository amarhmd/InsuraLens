/* Notifications API — the real inbox behind the TopBar bell.

   The backend returns `{ items, unreadCount }`; each item is
   `{ id, claimId, title, body, read, createdAt }`. Rows are normalised to
   notification seeds by src/lib/notifications.ts, which also gives them the
   stable dedupe key the store collapses duplicates by (so a server row and a
   locally derived row for the same fact never double up). */

import { request } from './http'
import { seedFromServer } from '../lib/notifications'

/**
 * GET /api/notifications — newest first.
 *
 * @returns {Promise<Array<import('../lib/notifications').NotificationSeed>>}
 */
export async function listNotifications() {
  const res = await request('/api/notifications')
  const rows = Array.isArray(res) ? res : (res.items ?? res.notifications ?? res.data ?? [])
  return rows.map(seedFromServer)
}

/**
 * POST /api/notifications/:id/read — mark one server notification read.
 * Best-effort: the store keeps its own read overlay, so a failure here is
 * harmless and never surfaces to the UI.
 */
export async function markNotificationRead(id) {
  return request(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' })
}

/** POST /api/notifications/read-all — mark the whole server inbox read. */
export async function markAllNotificationsRead() {
  return request('/api/notifications/read-all', { method: 'POST' })
}
