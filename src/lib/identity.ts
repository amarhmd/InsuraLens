/* ==========================================================================
   Session identity — the signed-in user, read from GET /api/auth/me.

   One source for the sidebar user card and the profile menu. The last known
   identity is cached in localStorage so a reload paints instantly, then
   refreshIdentity() re-reads it from the backend. There is no fabricated
   fallback: until the backend answers, consumers see a loading state, and a
   failed read leaves `identity` null with status 'error'.
   ========================================================================== */

import { useSyncExternalStore } from 'react'
import { getCurrentUser } from '../api/auth'
import { getSettings, subscribeSettings } from './settingsStore'

export interface Identity {
  id: string
  name: string
  role: string
  email: string
}

export type IdentityStatus = 'loading' | 'ready' | 'error'

interface IdentityState {
  identity: Identity | null
  status: IdentityStatus
}

const STORAGE_KEY = 'insuralens.identity.v1'

const ROLE_LABELS: Record<string, string> = {
  reviewer: 'Claims Reviewer',
  claims_reviewer: 'Claims Reviewer',
  adjuster: 'Claims Adjuster',
  claims_adjuster: 'Claims Adjuster',
  admin: 'Administrator',
  manager: 'Claims Manager',
}

/** "claims_reviewer" -> "Claims Reviewer"; unknown tokens are title-cased. */
export function roleLabel(role: string): string {
  if (!role) return ''
  const key = role.toLowerCase()
  return (
    ROLE_LABELS[key] ??
    role.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  )
}

/** Normalise the backend user payload into the UI identity shape. */
function normalize(raw: unknown): Identity | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const email = String(r.email ?? '').trim()
  const name = String(r.name ?? r.fullName ?? r.full_name ?? '').trim() ||
    (email ? email.split('@')[0] : '')
  if (!name && !email) return null
  return {
    id: String(r.id ?? r.userId ?? r.user_id ?? ''),
    name: name || email,
    role: roleLabel(String(r.role ?? r.jobTitle ?? r.job_title ?? '')),
    email,
  }
}

function readCache(): Identity | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return normalize(JSON.parse(raw))
  } catch {
    return null
  }
}

function writeCache(identity: Identity | null): void {
  try {
    if (typeof localStorage === 'undefined') return
    if (identity) localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* Storage unavailable — in-memory state still holds. */
  }
}

const cached = readCache()
/** Raw session identity straight from the backend (or its cache). */
let session: IdentityState = { identity: cached, status: 'loading' }
/** What consumers display — see displayIdentity(). */
let state: IdentityState = { identity: null, status: 'loading' }
const listeners = new Set<() => void>()

/**
 * The session user with the locally saved profile override (Edit Profile on
 * #/settings) applied to name and email, so the sidebar, the profile menu, and
 * the Settings card all show the same person and a saved edit reaches every
 * surface at once. Signed out → null: no identity is ever fabricated.
 */
function displayIdentity(raw: Identity | null): Identity | null {
  if (!raw) return null
  const local = getSettings().profile
  const name = local.fullName || raw.name
  const email = local.email || raw.email
  if (name === raw.name && email === raw.email) return raw
  return { ...raw, name, email }
}

/** Replace the raw session identity and refresh the displayed view. */
function setSession(next: IdentityState): void {
  session = next
  state = { identity: displayIdentity(session.identity), status: session.status }
  emit()
}

state = { identity: displayIdentity(cached), status: 'loading' }

/* A saved Edit Profile override must reach every display surface immediately. */
subscribeSettings(() => setSession(session))

function emit(): void {
  listeners.forEach((listener) => listener())
}

export function getIdentityState(): IdentityState {
  return state
}

export function subscribeIdentity(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Replace the identity (also used to clear it on sign-out). */
export function setIdentity(identity: Identity | null): void {
  setSession({ identity, status: identity ? 'ready' : session.status })
  writeCache(identity)
}

let inFlight: Promise<Identity | null> | null = null

/**
 * GET /api/auth/me — read the signed-in user. Concurrent callers share one
 * request. A failure sets status 'error' and never invents an identity.
 */
export function refreshIdentity(): Promise<Identity | null> {
  if (inFlight) return inFlight
  setSession({ ...session, status: 'loading' })
  inFlight = getCurrentUser()
    .then((raw) => {
      const identity = normalize(raw)
      setSession({ identity: identity ?? session.identity, status: identity ? 'ready' : 'error' })
      writeCache(session.identity)
      return session.identity
    })
    .catch(() => {
      setSession({ identity: session.identity, status: 'error' })
      return session.identity
    })
    .finally(() => {
      inFlight = null
      emit()
    })
  return inFlight
}

/** Clear the identity on sign-out. */
export function clearIdentity(): void {
  setSession({ identity: null, status: 'loading' })
  writeCache(null)
}

export function useIdentityState(): IdentityState {
  return useSyncExternalStore(subscribeIdentity, getIdentityState, getIdentityState)
}

export function useIdentity(): Identity | null {
  return useIdentityState().identity
}
