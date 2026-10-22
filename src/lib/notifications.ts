/* ==========================================================================
   Notifications — the inbox behind the top-bar bell.

   The backend exposes `GET /api/notifications` (a real list, but only for the
   AI-analysis lifecycle it runs) plus `POST /api/notifications/:id/read` and
   `POST /api/notifications/read-all`. It emits nothing for the other review
   events (claim created, evidence uploaded, decision changed), so those are
   *derived* here from real claim data rather than invented.

   This module is pure: types, relative-time formatting, and the two functions
   that turn real claim activity into notification seeds. No React, no I/O, so
   it can be unit-tested with a plain Node script.

   Conventions:
   * `dedupeKey` is the notification's stable id. Two events that describe the
     same fact (e.g. the backend's "Analysis of CLM-1 failed" and a derived
     failure) share a key, so the store can collapse them.
   * Timestamps are epoch ms; the human string ("2 min ago") is rendered at
     render time so it never goes stale in storage.
   ========================================================================== */

import { stageLabel } from './constants'
import type { ClaimStatus } from './constants'

/** Every kind of thing the bell can announce. Icons map from this. */
export type NotificationType =
  | 'claim_created'
  | 'evidence_uploaded'
  | 'analysis_started'
  | 'analysis_completed'
  | 'analysis_failed'
  | 'status_changed'
  | 'info_requested'
  | 'review_completed'
  | 'other'

export interface AppNotification {
  /** Stable identity — always equal to `dedupeKey`. */
  id: string
  /** Canonical key two events describing the same fact share. */
  dedupeKey: string
  type: NotificationType
  title: string
  /** Short, one-line body. */
  message: string
  /** Related claim (e.g. "CLM-1113"), when the event belongs to one. */
  claimId?: string
  /** Epoch ms the event happened. */
  timestamp: number
  /**
   * Backend notification id, present only when the row came from the server
   * inbox. Used to best-effort mirror "read" back to the backend.
   */
  serverId?: string
}

/** What a producer hands the store. `timestamp` defaults to "now". */
export interface NotificationSeed {
  dedupeKey: string
  type: NotificationType
  title: string
  message: string
  claimId?: string
  timestamp?: number
  serverId?: string
  /** Marks a server row already read server-side. */
  read?: boolean
}

/** Backend row → seed. `read` rides along so the store can honour it. */
export function seedFromServer(row: {
  id?: string
  claimId?: string
  title?: string
  body?: string
  createdAt?: string
  read?: boolean
}): NotificationSeed {
  const type = inferType(row.title ?? '')
  const claimId = row.claimId
  return {
    dedupeKey: serverDedupeKey(type, row.id, claimId),
    type,
    title: row.title || 'Notification',
    message: row.body || '',
    claimId,
    timestamp: row.createdAt ? Date.parse(row.createdAt) : Date.now(),
    serverId: row.id,
    read: Boolean(row.read),
  }
}

/** Best-effort type for a server notification, read from its own title. */
function inferType(title: string): NotificationType {
  const t = title.toLowerCase()
  if (t.includes('fail') || t.includes('error')) return 'analysis_failed'
  if (t.includes('complete') || t.includes('ready') || t.includes('awaiting')) {
    return 'analysis_completed'
  }
  if (t.includes('evidence')) return 'evidence_uploaded'
  if (t.includes('information') || t.includes('more info')) return 'info_requested'
  if (t.includes('review') || t.includes('approve') || t.includes('decision')) {
    return 'review_completed'
  }
  if (t.includes('claim')) return 'claim_created'
  return 'other'
}

/**
 * Shared key for the analysis lifecycle so the backend row and a derived row
 * for the same claim+outcome collapse into one notification.
 */
function serverDedupeKey(type: NotificationType, id?: string, claimId?: string): string {
  if (claimId && type === 'analysis_failed') return `analysis:${claimId}:failed`
  if (claimId && type === 'analysis_completed') return `analysis:${claimId}:completed`
  return `server:${id ?? Math.random().toString(36).slice(2)}`
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/** "Just now" / "2 min ago" / "5 hr ago" / "3 days ago" / "Oct 5". */
export function relativeTime(ms: number, now: number = Date.now()): string {
  if (!Number.isFinite(ms)) return ''
  const minutes = Math.floor((now - ms) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Badge text: `null` when there is nothing unread (hide it), the count up to 9,
 * then "9+" for anything above.
 */
export function badgeCount(unread: number): string | null {
  if (unread <= 0) return null
  return unread > 9 ? '9+' : String(unread)
}

/* ------------------------------------------------------------------ */
/* Real claim activity → seeds                                         */
/* ------------------------------------------------------------------ */

/** The minimal per-claim slice the poller compares between fetches. */
export interface ClaimActivity {
  id: string
  /** UI stage token ('new', 'human_review', …). */
  stage: string
  /** Raw backend decision ('PENDING' | 'APPROVED' | 'MORE_INFO_REQUIRED'). */
  decision?: string
  /** UI analysis label ('Not started' | 'Processing' | 'Available' | 'Incomplete'). */
  analysis: string
  /** Epoch ms of the last backend update. */
  updatedAt: number
  /** Evidence file count, when known (new claims only). */
  evidenceCount?: number
}

/** Compact, storable per-claim signature used to spot changes. */
export function activitySignature(claim: ClaimActivity): string {
  return `${claim.stage}\u0001${claim.decision ?? ''}\u0001${claim.analysis}`
}

function analysisIsTerminal(label: string): boolean {
  return label === 'Available' || label === 'Incomplete'
}

function claimCreatedSeed(claim: ClaimActivity): NotificationSeed {
  const count = claim.evidenceCount
  const message =
    typeof count === 'number' && count > 0
      ? `${claim.id} was created with ${count} evidence item${count === 1 ? '' : 's'}.`
      : `${claim.id} was created.`
  return {
    dedupeKey: `create:${claim.id}`,
    type: 'claim_created',
    title: 'New claim created',
    message,
    claimId: claim.id,
    timestamp: claim.updatedAt,
  }
}

/**
 * Compare the current claim list against the previous signature snapshot and
 * return the notifications for whatever changed. Pure: pass `previous: null`
 * for a first run, which only seeds the snapshot and emits nothing (so a fresh
 * install does not fire one notification per existing claim).
 */
export function deriveClaimEvents(
  previous: Record<string, string> | null,
  claims: ClaimActivity[],
): { seeds: NotificationSeed[]; snapshot: Record<string, string> } {
  const snapshot: Record<string, string> = {}
  const seeds: NotificationSeed[] = []

  for (const claim of claims) {
    snapshot[claim.id] = activitySignature(claim)
    if (!previous) continue

    const prev = previous[claim.id]
    if (!prev) {
      seeds.push(claimCreatedSeed(claim))
      continue
    }

    const [prevStage, prevDecision, prevAnalysis] = prev.split('\u0001')

    if ((claim.decision ?? '') !== prevDecision) {
      seeds.push(decisionSeed(claim, claim.decision ?? ''))
      continue
    }

    if (claim.stage !== prevStage) {
      seeds.push({
        dedupeKey: `stage:${claim.id}:${claim.stage}`,
        type: 'status_changed',
        title: 'Claim status changed',
        message: `${claim.id} moved to ${stageLabel(claim.stage as ClaimStatus)}.`,
        claimId: claim.id,
        timestamp: claim.updatedAt,
      })
    }

    if (analysisIsTerminal(claim.analysis) && !analysisIsTerminal(prevAnalysis)) {
      seeds.push(
        claim.analysis === 'Incomplete'
          ? {
              dedupeKey: `analysis:${claim.id}:failed`,
              type: 'analysis_failed',
              title: 'AI analysis failed',
              message: `The analysis for ${claim.id} could not be completed.`,
              claimId: claim.id,
              timestamp: claim.updatedAt,
            }
          : {
              dedupeKey: `analysis:${claim.id}:completed`,
              type: 'analysis_completed',
              title: 'AI analysis completed',
              message: `Findings are ready for ${claim.id}.`,
              claimId: claim.id,
              timestamp: claim.updatedAt,
            },
      )
    }
  }

  return { seeds, snapshot }
}

function decisionSeed(claim: ClaimActivity, decision: string): NotificationSeed {
  const base = { claimId: claim.id, timestamp: claim.updatedAt }
  if (decision === 'APPROVED') {
    return {
      ...base,
      dedupeKey: `decision:${claim.id}:APPROVED`,
      type: 'review_completed',
      title: 'Review completed',
      message: `${claim.id} was approved.`,
    }
  }
  if (decision === 'MORE_INFO_REQUIRED') {
    return {
      ...base,
      dedupeKey: `decision:${claim.id}:MORE_INFO_REQUIRED`,
      type: 'info_requested',
      title: 'Information requested',
      message: `${claim.id} is waiting on the customer for more information.`,
    }
  }
  return {
    ...base,
    dedupeKey: `decision:${claim.id}:${decision}`,
    type: 'status_changed',
    title: 'Claim decision updated',
    message: `${claim.id} is now ${decision || 'pending'}.`,
  }
}

/* ------------------------------------------------------------------ */
/* Own-action seeds                                                    */
/* ------------------------------------------------------------------ */

export function claimCreated(
  claimId: string,
  evidenceCount?: number,
  timestamp: number = Date.now(),
): NotificationSeed {
  const message =
    typeof evidenceCount === 'number' && evidenceCount > 0
      ? `${claimId} was created with ${evidenceCount} evidence item${evidenceCount === 1 ? '' : 's'}.`
      : `${claimId} was created.`
  return {
    dedupeKey: `create:${claimId}`,
    type: 'claim_created',
    title: 'New claim created',
    message,
    claimId,
    timestamp,
  }
}

export function evidenceUploaded(
  claimId: string,
  fileName: string,
  fileId?: string,
  timestamp: number = Date.now(),
): NotificationSeed {
  return {
    dedupeKey: `evidence:${claimId}:${fileId ?? timestamp}`,
    type: 'evidence_uploaded',
    title: 'Evidence uploaded',
    message: `${fileName} was added to ${claimId}.`,
    claimId,
    timestamp,
  }
}

export function analysisStarted(claimId: string, runId?: number | string, timestamp: number = Date.now()): NotificationSeed {
  return {
    dedupeKey: `analysis-started:${claimId}:${runId ?? timestamp}`,
    type: 'analysis_started',
    title: 'AI analysis started',
    message: `Analysis is running for ${claimId}.`,
    claimId,
    timestamp,
  }
}

export function analysisCompleted(claimId: string, timestamp: number = Date.now()): NotificationSeed {
  return {
    dedupeKey: `analysis:${claimId}:completed`,
    type: 'analysis_completed',
    title: 'AI analysis completed',
    message: `Findings are ready for ${claimId}.`,
    claimId,
    timestamp,
  }
}

export function analysisFailed(
  claimId: string,
  detail?: string,
  timestamp: number = Date.now(),
): NotificationSeed {
  return {
    dedupeKey: `analysis:${claimId}:failed`,
    type: 'analysis_failed',
    title: 'AI analysis failed',
    message: detail || `The analysis for ${claimId} could not be completed.`,
    claimId,
    timestamp,
  }
}

export function infoRequested(claimId: string, timestamp: number = Date.now()): NotificationSeed {
  return {
    dedupeKey: `decision:${claimId}:MORE_INFO_REQUIRED`,
    type: 'info_requested',
    title: 'Information requested',
    message: `${claimId} is waiting on the customer for more information.`,
    claimId,
    timestamp,
  }
}

export function reviewCompleted(claimId: string, timestamp: number = Date.now()): NotificationSeed {
  return {
    dedupeKey: `decision:${claimId}:APPROVED`,
    type: 'review_completed',
    title: 'Review completed',
    message: `${claimId} was approved.`,
    claimId,
    timestamp,
  }
}

/** Seed → stored shape. */
export function toNotification(seed: NotificationSeed): AppNotification {
  return {
    id: seed.dedupeKey,
    dedupeKey: seed.dedupeKey,
    type: seed.type,
    title: seed.title,
    message: seed.message,
    claimId: seed.claimId,
    timestamp: seed.timestamp ?? Date.now(),
    serverId: seed.serverId,
  }
}
