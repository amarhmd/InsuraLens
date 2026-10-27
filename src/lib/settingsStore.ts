/* ==========================================================================
   Settings — the single shared source for the remaining #/settings sections
   (My Profile, AI Review Preferences, Notifications).

   Rules this module exists to enforce:

   * Frontend only. Nothing here talks to a server. Saving updates in-memory
     state (mirrored to localStorage so a reload keeps your choices) and
     returns control to the page, which shows a confirmation toast only after
     the update has been applied locally.
   * Honest presentation. Preferences only change how this workspace presents
     information. No setting here configures an AI model, grants a permission,
     approves or rejects a claim, or changes account security.
   * One default set. DEFAULT_SETTINGS is the reference the data gate asserts
     (scripts/settings-check.mjs via npm run check:settings).

   The one product-level exception left is "Default landing page", which the
   login flow really does read (App.tsx), and "Table density", which sets a
   data-density attribute on <html> that the claims table styling honors. The
   AI display switches that the Claim workspace reads live in src/lib/aiPrefs.ts
   under their own key.
   ========================================================================== */

/* -------------------------------------------------------------------------- */
/* Option types                                                               */
/* -------------------------------------------------------------------------- */

export type LandingChoice = 'dashboard' | 'claims' | 'chat'
export type DensityChoice = 'comfortable' | 'compact'

/* -------------------------------------------------------------------------- */
/* Sections of data                                                            */
/* -------------------------------------------------------------------------- */

export type Profile = {
  fullName: string
  displayName: string
  jobTitle: string
  email: string
  role: string
  workspace: string
}

export type Preferences = {
  landing: LandingChoice
  density: DensityChoice
}

export type WorkspaceInfo = {
  displayName: string
  description: string
}

export type Settings = {
  profile: Profile
  preferences: Preferences
  notifications: Notifications
  workspace: WorkspaceInfo
}

/* -------------------------------------------------------------------------- */
/* Notifications                                                               */
/* -------------------------------------------------------------------------- */

export const NOTIFICATION_KEYS = ['claimAssigned', 'needsReview'] as const

export type NotificationKey = (typeof NOTIFICATION_KEYS)[number]
export type Notifications = Record<NotificationKey, boolean>

export type NotificationItem = {
  key: NotificationKey
  label: string
  hint: string
}

/** The two notification switches the Settings page renders, in order. */
export const NOTIFICATION_ITEMS: NotificationItem[] = [
  {
    key: 'claimAssigned',
    label: 'Claims assigned to me',
    hint: 'Sent when a new claim is routed to you.',
  },
  {
    key: 'needsReview',
    label: 'Claims needing my review',
    hint: 'Sent when a claim you own needs your decision.',
  },
]

/* -------------------------------------------------------------------------- */
/* Defaults                                                                    */
/* -------------------------------------------------------------------------- */

export const DEFAULT_NOTIFICATIONS: Notifications = {
  claimAssigned: true,
  needsReview: true,
}

export const DEFAULT_SETTINGS: Settings = {
  profile: {
    /* No fabricated identity. The signed-in user comes from GET /api/auth/me
       (src/lib/identity.ts) and fills these fields in the Settings UI; a saved
       edit persists in this browser only. */
    fullName: '',
    displayName: '',
    jobTitle: '',
    email: '',
    role: '',
    workspace: 'Claims Operations',
  },
  preferences: {
    landing: 'dashboard',
    density: 'comfortable',
  },
  notifications: { ...DEFAULT_NOTIFICATIONS },
  workspace: {
    displayName: 'Claims Operations',
    description: 'A shared environment for reviewing claims evidence and AI-assisted findings.',
  },
}

/* -------------------------------------------------------------------------- */
/* Validation — plain functions so the data gate can assert them               */
/* -------------------------------------------------------------------------- */

export type ProfileErrors = Partial<Record<'fullName' | 'displayName' | 'jobTitle' | 'email', string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Validation for the four editable profile fields. */
export function validateProfile(profile: Profile): ProfileErrors {
  const errors: ProfileErrors = {}

  const name = profile.fullName.trim()
  if (!name) errors.fullName = 'Full name is required.'
  else if (name.length < 2) errors.fullName = 'Enter at least 2 characters.'

  const title = profile.jobTitle.trim()
  if (!title) errors.jobTitle = 'Job title is required.'

  const email = profile.email.trim()
  if (!email) errors.email = 'Work email is required.'
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.'

  const display = profile.displayName.trim()
  if (display && display.length < 2) errors.displayName = 'Enter at least 2 characters.'

  return errors
}

/** Initials for an avatar: "Dana Ellery" → "DE". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return (first + last).toUpperCase()
}

/* -------------------------------------------------------------------------- */
/* Store                                                                       */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = 'insuralens.settings.v1'

function clone(settings: Settings): Settings {
  return {
    profile: { ...settings.profile },
    preferences: { ...settings.preferences },
    notifications: { ...settings.notifications },
    workspace: { ...settings.workspace },
  }
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/* The build that shipped before session identity existed had a fabricated
   default profile ("Alex Morgan / alex.morgan@example.com"). A browser that
   still has those exact values persisted must not shadow the signed-in user,
   so the sanitizer treats them as empty. */
const LEGACY_PROFILE_VALUES: Partial<Record<keyof Profile, string>> = {
  fullName: 'Alex Morgan',
  email: 'alex.morgan@example.com',
}

function legacyAwareStr(key: keyof Profile, value: unknown, fallback: string): string {
  const next = str(value, fallback)
  return next === LEGACY_PROFILE_VALUES[key] ? fallback : next
}

/**
 * Coerces whatever comes out of localStorage into a valid Settings object.
 * Unknown enum values fall back to defaults, so a stale or hand-edited value
 * can never leave the UI in a broken state.
 */
export function sanitizeSettings(raw: unknown): Settings {
  const base = clone(DEFAULT_SETTINGS)
  if (typeof raw !== 'object' || raw === null) return base
  const stored = raw as Partial<Record<keyof Settings, unknown>>

  const p = (stored.preferences ?? {}) as Partial<Preferences>
  const prof = (stored.profile ?? {}) as Partial<Profile>
  const ws = (stored.workspace ?? {}) as Partial<WorkspaceInfo>
  const n = (stored.notifications ?? {}) as Partial<Notifications>

  const notifications = { ...base.notifications }
  for (const key of NOTIFICATION_KEYS) {
    if (key in n) notifications[key] = bool(n[key], notifications[key])
  }

  return {
    profile: {
      fullName: legacyAwareStr('fullName', prof.fullName, base.profile.fullName),
      displayName: str(prof.displayName, base.profile.displayName),
      jobTitle: str(prof.jobTitle, base.profile.jobTitle),
      email: legacyAwareStr('email', prof.email, base.profile.email),
      role: str(prof.role, base.profile.role),
      workspace: str(prof.workspace, base.profile.workspace),
    },
    preferences: {
      landing: oneOf(p.landing, ['dashboard', 'claims', 'chat'] as const, base.preferences.landing),
      density: oneOf(p.density, ['comfortable', 'compact'] as const, base.preferences.density),
    },
    notifications,
    workspace: {
      displayName: str(ws.displayName, base.workspace.displayName),
      description: str(ws.description, base.workspace.description),
    },
  }
}

function load(): Settings {
  try {
    if (typeof localStorage === 'undefined') return clone(DEFAULT_SETTINGS)
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return clone(DEFAULT_SETTINGS)
    return sanitizeSettings(JSON.parse(raw))
  } catch {
    return clone(DEFAULT_SETTINGS)
  }
}

let state: Settings = load()
const listeners = new Set<() => void>()

/* Side effects other parts of the app read. The density preference is the one
   setting with a visible effect outside the Settings page. */
function applyEffects(settings: Settings): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.density = settings.preferences.density
}

applyEffects(state)

export function getSettings(): Settings {
  return state
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Merges a patch into the saved settings, persists, then notifies.
 * Returns false without publishing the patch when the browser refuses the
 * write, so callers never show "Saved" for a change that was not stored.
 */
export function saveSettings(patch: Partial<Settings>): boolean {
  const next = { ...state, ...patch }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }
  } catch {
    return false
  }
  state = next
  applyEffects(state)
  listeners.forEach((listener) => listener())
  return true
}
