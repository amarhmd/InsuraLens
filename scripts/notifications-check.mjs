/* Data gate for the notification inbox — the pure logic in
   src/lib/notifications.ts and the dedupe / unread / read-state behaviour of
   src/lib/notificationsStore.ts.

   The project ships no test runner, so this follows the repo's `check:*`
   convention: load the real modules through Vite's SSR pipeline and assert on
   them. A stub window.localStorage lets the store's persistence path run.
   Run: npm run check:notifications */

import { createServer } from 'vite'

const fails = []
const eq = (label, actual, expected) => {
  if (actual !== expected) {
    fails.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}
const deep = (label, actual, expected) => {
  const a = JSON.stringify(actual)
  const b = JSON.stringify(expected)
  if (a !== b) fails.push(`${label}: expected ${b}, got ${a}`)
}
const ok = (label, cond) => {
  if (!cond) fails.push(`${label}: expected truthy`)
}

/* -------------------------------------------------- stub browser globals */

const storage = (() => {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size
    },
  }
})()

globalThis.window = {
  localStorage: storage,
  addEventListener() {},
  removeEventListener() {},
  setInterval: () => 0,
  clearInterval() {},
}

/* A token whose JWT payload resolves the per-user storage key to "42". */
const payload = Buffer.from(JSON.stringify({ sub: '42', email: 'reviewer@insuralens.app' })).toString(
  'base64',
)
storage.setItem('insuralens_token', `header.${payload}.signature`)

/* Benign fetch so best-effort backend calls never touch the network. */
globalThis.fetch = async () =>
  new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })

/* ---------------------------------------------------------------- load */

const server = await createServer({
  root: process.cwd(),
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
})

try {
  const n = await server.ssrLoadModule('/src/lib/notifications.ts')
  const store = await server.ssrLoadModule('/src/lib/notificationsStore.ts')

  /* ------------------------------------------------------------ formatting */

  const now = Date.UTC(2026, 9, 18, 12, 0, 0)
  eq('relativeTime just now', n.relativeTime(now - 30_000, now), 'Just now')
  eq('relativeTime minutes', n.relativeTime(now - 2 * 60_000, now), '2 min ago')
  eq('relativeTime hours', n.relativeTime(now - 3 * 3_600_000, now), '3 hr ago')
  eq('relativeTime days', n.relativeTime(now - 2 * 86_400_000, now), '2 days ago')

  eq('badgeCount 0 hides', n.badgeCount(0), null)
  eq('badgeCount 1', n.badgeCount(1), '1')
  eq('badgeCount 9', n.badgeCount(9), '9')
  eq('badgeCount caps at 9+', n.badgeCount(10), '9+')

  /* ----------------------------------------------------- claim derivation */

  const claims = [
    { id: 'CLM-1', stage: 'human_review', decision: 'PENDING', analysis: 'Processing', updatedAt: now },
    { id: 'CLM-2', stage: 'new', decision: 'PENDING', analysis: 'Not started', updatedAt: now },
  ]
  const first = n.deriveClaimEvents(null, claims)
  deep('first run emits nothing', first.seeds, [])
  eq('first run seeds snapshot', Object.keys(first.snapshot).length, 2)

  const approved = [
    { id: 'CLM-1', stage: 'completed', decision: 'APPROVED', analysis: 'Processing', updatedAt: now },
    { id: 'CLM-2', stage: 'new', decision: 'PENDING', analysis: 'Not started', updatedAt: now },
  ]
  const afterApprove = n.deriveClaimEvents(first.snapshot, approved)
  eq('decision change emits one', afterApprove.seeds.length, 1)
  eq('decision change type', afterApprove.seeds[0].type, 'review_completed')
  eq('decision change key', afterApprove.seeds[0].dedupeKey, 'decision:CLM-1:APPROVED')

  const failedAnalysis = [
    { id: 'CLM-1', stage: 'human_review', decision: 'PENDING', analysis: 'Incomplete', updatedAt: now },
    { id: 'CLM-2', stage: 'new', decision: 'PENDING', analysis: 'Not started', updatedAt: now },
  ]
  const afterFailure = n.deriveClaimEvents(first.snapshot, failedAnalysis)
  eq('analysis transition emits', afterFailure.seeds[0].type, 'analysis_failed')
  eq('analysis key', afterFailure.seeds[0].dedupeKey, 'analysis:CLM-1:failed')

  const withNew = [
    { id: 'CLM-1', stage: 'human_review', decision: 'PENDING', analysis: 'Processing', updatedAt: now },
    { id: 'CLM-2', stage: 'new', decision: 'PENDING', analysis: 'Not started', updatedAt: now },
    { id: 'CLM-3', stage: 'new', decision: 'PENDING', analysis: 'Not started', updatedAt: now, evidenceCount: 2 },
  ]
  const afterNew = n.deriveClaimEvents(first.snapshot, withNew)
  eq('new claim emits', afterNew.seeds.length, 1)
  eq('new claim mentions count', afterNew.seeds[0].message.includes('2 evidence items'), true)

  /* ----------------------------------------------------- server row mapping */

  const mapped = n.seedFromServer({
    id: 'uuid-1',
    claimId: 'CLM-9',
    title: 'Analysis of CLM-9 failed',
    body: 'boom',
    createdAt: '2026-10-18T12:00:00.000Z',
    read: false,
  })
  eq('server row type', mapped.type, 'analysis_failed')
  eq('server row key collapses with derived', mapped.dedupeKey, 'analysis:CLM-9:failed')
  eq('server row keeps serverId', mapped.serverId, 'uuid-1')

  /* Own-action seeds share keys with the derived / server forms. */
  eq('infoRequested key', n.infoRequested('CLM-3').dedupeKey, 'decision:CLM-3:MORE_INFO_REQUIRED')
  eq('infoRequested type', n.infoRequested('CLM-3').type, 'info_requested')
  eq('reviewCompleted key', n.reviewCompleted('CLM-3').dedupeKey, 'decision:CLM-3:APPROVED')
  eq('reviewCompleted type', n.reviewCompleted('CLM-3').type, 'review_completed')
  eq('analysisStarted type', n.analysisStarted('CLM-3', 7).type, 'analysis_started')
  eq('analysisCompleted key', n.analysisCompleted('CLM-3').dedupeKey, 'analysis:CLM-3:completed')
  eq('analysisFailed key', n.analysisFailed('CLM-3').dedupeKey, 'analysis:CLM-3:failed')
  eq('evidenceUploaded key uses file id', n.evidenceUploaded('CLM-3', 'a.jpg', 'f1').dedupeKey, 'evidence:CLM-3:f1')

  /* --------------------------------------------------------------- store */

  eq('per-user key', store.currentUserId(), '42')

  store.ingestNotifications([n.claimCreated('CLM-7', 1)])
  eq('one item after ingest', store.getStoreSnapshot().items.length, 1)
  eq('unread after ingest', store.getStoreSnapshot().unread, 1)

  /* Same fact again must not duplicate or re-badge. */
  store.ingestNotifications([n.claimCreated('CLM-7', 1)])
  eq('duplicate collapsed', store.getStoreSnapshot().items.length, 1)
  eq('duplicate keeps unread at 1', store.getStoreSnapshot().unread, 1)

  ok(
    'persisted under the user key',
    storage.getItem('insuralens.notifications.v1:42')?.includes('CLM-7'),
  )

  store.markRead('create:CLM-7')
  eq('markRead clears unread', store.getStoreSnapshot().unread, 0)

  store.ingestNotifications([n.evidenceUploaded('CLM-7', 'p.jpg', 'file-1')])
  eq('evidence event unread', store.getStoreSnapshot().unread, 1)
  store.markAllRead()
  eq('markAllRead clears unread', store.getStoreSnapshot().unread, 0)

  store.dismiss('create:CLM-7')
  eq('dismiss removes item', store.getStoreSnapshot().items.some((i) => i.id === 'create:CLM-7'), false)
  store.ingestNotifications([n.claimCreated('CLM-7', 1)])
  eq('dismissed stays dismissed', store.getStoreSnapshot().items.some((i) => i.id === 'create:CLM-7'), false)
} finally {
  await server.close()
}

if (fails.length) {
  console.log('notifications-check FAILURES:')
  fails.forEach((f) => console.log('  - ' + f))
  process.exit(1)
}
console.log('notifications-check OK — formatting, claim derivation, dedupe, unread, read/dismiss.')
