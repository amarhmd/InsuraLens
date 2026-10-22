/* The live feed behind the bell.

   Mounted once by <NotificationsMenu>, it is the only thing that talks to the
   network on the bell's behalf:

   * GET /api/notifications  — server-emitted events (the AI-analysis lifecycle
     the backend runs itself). Merged straight into the store.
   * GET /api/claims         — diffed against the previous per-claim signature
     snapshot to derive the events the backend never emits (new claims, decision
     changes, analysis transitions). The first run only seeds the snapshot, so a
     fresh install is not flooded with a notice per existing claim.

   It polls every 45s, pauses while the tab is hidden, and re-polls the moment
   the tab comes back. Remounting on navigation is throttled so switching pages
   does not hammer the backend. */

import { useCallback, useEffect, useRef, useState } from 'react'
import { getClaim, listClaims } from '../api/claims'
import { listNotifications } from '../api/notifications'
import { deriveClaimEvents, type ClaimActivity } from '../lib/notifications'
import {
  getClaimSnapshot,
  getLastPollAt,
  hasNotification,
  ingestNotifications,
  setClaimSnapshot,
  setLastPollAt,
} from '../lib/notificationsStore'
import type { Claim } from '../lib/claimsData'

const POLL_MS = 45_000
/** Skip the immediate poll when we polled this recently (navigation remount). */
const REVISIT_THROTTLE_MS = 15_000
/** Bound the extra detail lookups a burst of new claims can trigger. */
const MAX_DETAIL_FETCHES = 5

function toActivity(claim: Claim): ClaimActivity {
  return {
    id: claim.id,
    stage: claim.status,
    decision: claim.decision,
    analysis: claim.aiAnalysis,
    updatedAt: Date.now() - Math.max(0, claim.updatedMinutes) * 60_000,
  }
}

/** The list endpoint omits files, so a new claim's evidence count needs a detail read. */
async function enrichNewClaims(
  previous: Record<string, string>,
  activities: ClaimActivity[],
): Promise<void> {
  let fetched = 0
  for (const activity of activities) {
    if (fetched >= MAX_DETAIL_FETCHES) break
    if (activity.id in previous) continue
    if (hasNotification(`create:${activity.id}`)) continue
    fetched += 1
    try {
      const detail = await getClaim(activity.id)
      const files = (detail as { files?: Array<{ kind?: string }> } | null)?.files
      if (Array.isArray(files)) {
        activity.evidenceCount = files.filter((f) => f.kind !== 'policy').length
      }
    } catch {
      /* The count is a nicety; a failed lookup just yields the plain message. */
    }
  }
}

export interface NotificationFeed {
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useNotificationFeed(): NotificationFeed {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const poll = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const [inbox, claims] = await Promise.allSettled([listNotifications(), listClaims()])

      if (inbox.status === 'fulfilled') {
        if (inbox.value.length) ingestNotifications(inbox.value)
        setError(null)
      } else {
        /* Server inbox failed — surface it, but keep whatever we already have. */
        setError(
          inbox.reason instanceof Error
            ? inbox.reason.message
            : 'Could not refresh notifications.',
        )
      }

      if (claims.status === 'fulfilled') {
        const activities = claims.value.map(toActivity)
        const previous = getClaimSnapshot()
        if (previous) await enrichNewClaims(previous, activities)
        const { seeds, snapshot } = deriveClaimEvents(previous, activities)
        if (seeds.length) ingestNotifications(seeds)
        setClaimSnapshot(snapshot)
      }
    } finally {
      setLastPollAt(Date.now())
      inFlight.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let timer: number | null = null
    const start = () => {
      if (timer === null) timer = window.setInterval(() => void poll(), POLL_MS)
    }
    const stop = () => {
      if (timer !== null) {
        window.clearInterval(timer)
        timer = null
      }
    }
    const onVisibility = () => {
      if (document.hidden) {
        stop()
      } else {
        void poll()
        start()
      }
    }

    if (Date.now() - getLastPollAt() > REVISIT_THROTTLE_MS) void poll()
    else setLoading(false)
    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [poll])

  return { loading, error, refresh: () => void poll() }
}
