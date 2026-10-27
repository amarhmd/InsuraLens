/* ==========================================================================
   Notification store — one in-memory inbox shared by the whole tab.

   It is a module singleton, not React state, for two reasons the task calls
   out: notifications must survive route changes (every page renders its own
   <TopBar>, so component state would be thrown away on navigation), and any
   page can raise an event without prop-drilling through the tree.

   Read / dismissed state is mirrored to localStorage, keyed per user (the
   `sub`/`email` claim of the stored JWT, falling back to "anonymous"), so a
   reload keeps the badge honest. Every storage access is wrapped in try/catch
   because localStorage throws in private mode and during SSR.

   Dedupe: every notification carries a `dedupeKey` that becomes its id, so a
   server row and a derived row describing the same fact collapse into one, and
   re-polling never re-adds (or re-badges) something already seen.
   ========================================================================== */

import type { AppNotification, NotificationSeed } from './notifications'
import { toNotification } from './notifications'
import { markAllNotificationsRead, markNotificationRead } from '../api/notifications'

/** Newest-first cap, so the inbox cannot grow without bound. */
const MAX_ITEMS = 50

/** Bumped if the stored shape ever changes; a mismatch is discarded. */
const STORAGE_VERSION = 1

const TOKEN_KEY = 'insuralens_token'
const STORAGE_PREFIX = 'insuralens.notifications.v1:'

export interface StoreSnapshot {
  items: AppNotification[]
  unread: number
  unreadIds: string[]
}

interface PersistedState {
  version: number
  items: AppNotification[]
  readIds: string[]
  dismissedIds: string[]
  /** claimId → signature; `null`/absent means the poller has not seeded yet. */
  snapshot: Record<string, string> | null
}

/* ------------------------------------------------------------------ */
/* Module state                                                        */
/* ------------------------------------------------------------------ */

let items: AppNotification[] = []
let readIds = new Set<string>()
let dismissedIds = new Set<string>()
let claimSnapshot: Record<string, string> | null = null
let hydrated = false
let lastPollAt = 0

let cached: StoreSnapshot = { items: [], unread: 0, unreadIds: [] }
const listeners = new Set<() => void>()

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

/** The signed-in user's id, decoded from the stored JWT when possible. */
export function currentUserId(): string {
  try {
    const token = window.localStorage.getItem(TOKEN_KEY)
    const payload = token?.split('.')[1]
    if (!payload) return 'anonymous'
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return String(json.sub ?? json.email ?? 'anonymous')
  } catch {
    return 'anonymous'
  }
}

function storageKey(): string {
  return STORAGE_PREFIX + currentUserId()
}

function readStorage(): PersistedState | null {
  try {
    const raw = window.localStorage.getItem(storageKey())
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedState
    if (parsed?.version !== STORAGE_VERSION || !Array.isArray(parsed.items)) return null
    return parsed
  } catch {
    return null
  }
}

function writeStorage(): void {
  try {
    const state: PersistedState = {
      version: STORAGE_VERSION,
      items,
      readIds: [...readIds],
      dismissedIds: [...dismissedIds],
      snapshot: claimSnapshot,
    }
    window.localStorage.setItem(storageKey(), JSON.stringify(state))
  } catch {
    /* Storage is best-effort; the in-memory inbox still works this session. */
  }
}

/** Load once for the current user. Safe to call repeatedly. */
export function ensureHydrated(): void {
  if (hydrated) return
  hydrated = true
  const stored = readStorage()
  if (stored) {
    items = sortItems(stored.items.map(repair))
    readIds = new Set(stored.readIds ?? [])
    dismissedIds = new Set(stored.dismissedIds ?? [])
    claimSnapshot = stored.snapshot ?? null
  }
  recompute()
}

/* ------------------------------------------------------------------ */
/* Subscription (useSyncExternalStore)                                 */
/* ------------------------------------------------------------------ */

function recompute(): void {
  const unreadIds = items.filter((n) => !readIds.has(n.id)).map((n) => n.id)
  cached = { items, unread: unreadIds.length, unreadIds }
}

function emit(): void {
  recompute()
  for (const listener of listeners) listener()
}

export function subscribeNotifications(listener: () => void): () => void {
  ensureHydrated()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getStoreSnapshot(): StoreSnapshot {
  return cached
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

function sortItems(list: AppNotification[]): AppNotification[] {
  return [...list].sort((a, b) => b.timestamp - a.timestamp)
}

/** Tolerate rows persisted by an older/partial shape. */
function repair(row: AppNotification): AppNotification {
  return {
    id: row.id,
    dedupeKey: row.dedupeKey ?? row.id,
    type: row.type ?? 'other',
    title: row.title ?? 'Notification',
    message: row.message ?? '',
    claimId: row.claimId,
    timestamp: Number.isFinite(row.timestamp) ? row.timestamp : Date.now(),
    serverId: row.serverId,
  }
}

export function hasNotification(id: string): boolean {
  return items.some((n) => n.id === id) || dismissedIds.has(id)
}

/** Add notifications, collapsing duplicates. Already-seen keys are ignored. */
export function ingestNotifications(seeds: NotificationSeed[]): void {
  ensureHydrated()
  let changed = false
  for (const seed of seeds) {
    if (!seed.dedupeKey) continue
    if (dismissedIds.has(seed.dedupeKey)) continue
    if (items.some((n) => n.id === seed.dedupeKey)) {
      if (seed.read) markReadLocal(seed.dedupeKey)
      continue
    }
    items.push(toNotification(seed))
    changed = true
    if (seed.read) readIds.add(seed.dedupeKey)
  }
  if (!changed) {
    /* Nothing new, but a server row may have turned read since we last looked. */
    transformSeedsRead(seeds)
    return
  }
  items = sortItems(items).slice(0, MAX_ITEMS)
  writeStorage()
  emit()
}

/** Apply server-read flags to already-present rows even when nothing was added. */
function transformSeedsRead(seeds: NotificationSeed[]): void {
  let touched = false
  for (const seed of seeds) {
    if (seed.read && !readIds.has(seed.dedupeKey) && items.some((n) => n.id === seed.dedupeKey)) {
      readIds.add(seed.dedupeKey)
      touched = true
    }
  }
  if (touched) {
    writeStorage()
    emit()
  }
}

function markReadLocal(id: string): void {
  if (readIds.has(id)) return
  readIds.add(id)
  writeStorage()
  emit()
}

export function markRead(id: string): void {
  ensureHydrated()
  const row = items.find((n) => n.id === id)
  markReadLocal(id)
  if (row?.serverId) markNotificationRead(row.serverId).catch(() => {})
}

export function markAllRead(): void {
  ensureHydrated()
  let touched = false
  for (const row of items) {
    if (!readIds.has(row.id)) {
      readIds.add(row.id)
      touched = true
    }
  }
  if (touched) {
    writeStorage()
    emit()
  }
  markAllNotificationsRead().catch(() => {})
}

export function dismiss(id: string): void {
  ensureHydrated()
  const next = items.filter((n) => n.id !== id)
  if (next.length === items.length) return
  items = next
  dismissedIds.add(id)
  writeStorage()
  emit()
}

/* ------------------------------------------------------------------ */
/* Claim-activity snapshot (for the poller's diff)                     */
/* ------------------------------------------------------------------ */

export function getClaimSnapshot(): Record<string, string> | null {
  ensureHydrated()
  return claimSnapshot
}

export function setClaimSnapshot(snapshot: Record<string, string>): void {
  ensureHydrated()
  claimSnapshot = snapshot
  writeStorage()
}

export function getLastPollAt(): number {
  return lastPollAt
}

export function setLastPollAt(value: number): void {
  lastPollAt = value
}

/* ------------------------------------------------------------------ */
/* Cross-tab sync                                                      */
/* ------------------------------------------------------------------ */

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (!event.key || !event.key.startsWith(STORAGE_PREFIX)) return
    hydrated = false
    items = []
    readIds = new Set()
    dismissedIds = new Set()
    claimSnapshot = null
    ensureHydrated()
    emit()
  })
}
