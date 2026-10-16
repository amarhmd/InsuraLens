/* Notifications API — the inbox behind the TopBar bell.

   The backend returns id/claimId/title/body/read/createdAt; the bell renders
   the UI shape from src/mocks/notifications.ts (id/title/body/time/read/link),
   so rows are mapped here. Set VITE_USE_DEMO=true to serve the mock list. */

import { USE_DEMO, delay, request } from './http'
import { mockNotifications } from '../mocks/notifications'

/** Simulated latency in demo mode (ms). */
const MOCK_DELAY_MS = 150

/** "2026-10-13T09:42:10Z" -> "2h ago" / "Oct 13". */
function relativeTime(iso) {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ''
  const hours = (Date.now() - ms) / 3_600_000
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${Math.max(1, Math.floor(hours))}h ago`
  if (hours < 24 * 7) return `${Math.floor(hours / 24)}d ago`
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Map one backend notification to the bell's Notification shape. */
function toNotification(row) {
  return {
    id: row.id,
    title: row.title ?? 'Notification',
    body: row.body ?? '',
    time: relativeTime(row.createdAt),
    read: Boolean(row.read),
    link: row.claimId ? `#/claims/${row.claimId}` : undefined,
  }
}

/**
 * GET /api/notifications — newest first.
 *
 * @returns {Promise<Array<import('../mocks/notifications').Notification>>}
 */
export async function listNotifications() {
  if (USE_DEMO) {
    await delay(MOCK_DELAY_MS)
    return mockNotifications
  }
  const res = await request('/api/notifications')
  const rows = Array.isArray(res) ? res : (res.items ?? res.notifications ?? res.data ?? [])
  return rows.map(toNotification)
}

/**
 * POST /api/notifications/:id/read — mark one notification read.
 *
 * @param {string} id
 */
export async function markNotificationRead(id) {
  if (USE_DEMO) {
    await delay(MOCK_DELAY_MS)
    return null
  }
  return request(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' })
}

/** POST /api/notifications/read-all — mark the whole inbox read. */
export async function markAllNotificationsRead() {
  if (USE_DEMO) {
    await delay(MOCK_DELAY_MS)
    return null
  }
  return request('/api/notifications/read-all', { method: 'POST' })
}
