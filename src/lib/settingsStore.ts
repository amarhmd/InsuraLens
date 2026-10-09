/* ==========================================================================
   Settings — the single shared source for every control on #/settings.

   Rules this module exists to enforce:

   * Frontend only. Nothing here talks to a server. Saving updates in-memory
     state (mirrored to localStorage so a reload keeps your demo choices) and
     returns control to the page, which shows a confirmation toast only after
     the update has been applied locally.
   * Honest presentation. Preferences only change how this prototype presents
     information. No setting here configures an AI model, grants a permission,
     approves or rejects a claim, or changes account security.
   * One default set. DEFAULT_SETTINGS is the reference the data gate asserts
     (scripts/settings-check.mjs via npm run check:settings).

   The single product-level exception is "Default landing page", which the
   login flow really does read (App.tsx), and "Table density", which sets a
   data-density attribute on <html> that the claims table styling honors.
   ========================================================================== */

/* -------------------------------------------------------------------------- */
/* Option types                                                               */
/* -------------------------------------------------------------------------- */

export type ThemeChoice = 'light' | 'dark' | 'system'
export type LanguageChoice = 'English' | 'French' | 'Arabic'
export type DateFormatChoice = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
export type LandingChoice = 'dashboard' | 'claims' | 'chat'
export type DensityChoice = 'comfortable' | 'compact'
export type ResponseFormatChoice = 'concise' | 'detailed' | 'structured'
export type ResponseDetailChoice = 'brief' | 'balanced' | 'detailed'

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
  theme: ThemeChoice
  language: LanguageChoice
  timeZone: string
  dateFormat: DateFormatChoice
  landing: LandingChoice
  density: DensityChoice
}

export type AiPreferences = {
  format: ResponseFormatChoice
  showSources: boolean
  highlightUncertainty: boolean
  highlightInconsistencies: boolean
  detail: ResponseDetailChoice
}

export type WorkspaceInfo = {
  displayName: string
  description: string
}

export type Settings = {
  profile: Profile
  preferences: Preferences
  notifications: Notifications
  ai: AiPreferences
  workspace: WorkspaceInfo
}

/* -------------------------------------------------------------------------- */
/* Notifications                                                               */
/* -------------------------------------------------------------------------- */

export const NOTIFICATION_KEYS = [
  'claimAssigned',
  'evidenceAdded',
  'docsMissing',
  'statusChanged',
  'humanReview',
  'analysisDone',
  'sourceUnavailable',
  'needsVerification',
  'analysisError',
  'productNews',
  'featureUpdates',
] as const

export type NotificationKey = (typeof NOTIFICATION_KEYS)[number]
export type Notifications = Record<NotificationKey, boolean>

type NotificationItem = {
  key: NotificationKey
  label: string
  hint?: string
}

export type NotificationGroup = {
  key: 'claim' | 'ai' | 'product'
  title: string
  hint: string
  items: NotificationItem[]
}

export const NOTIFICATION_GROUPS: NotificationGroup[] = [
  {
    key: 'claim',
    title: 'Claim activity',
    hint: 'Updates about claims routed to you and the evidence they carry.',
    items: [
      { key: 'claimAssigned', label: 'New claim assigned to me' },
      {
        key: 'evidenceAdded',
        label: 'Evidence added to a claim I follow',
        hint: 'Sent when photos, documents, or statements are attached to a claim you follow.',
      },
      {
        key: 'docsMissing',
        label: 'Required documentation is missing',
        hint: 'Sent when a claim you follow is still missing required documents.',
      },
      { key: 'statusChanged', label: 'Claim status changes' },
      {
        key: 'humanReview',
        label: 'A claim requires human review',
        hint: 'Sent when a claim reaches the point where an authorized reviewer must decide.',
      },
    ],
  },
  {
    key: 'ai',
    title: 'AI-assisted analysis',
    hint: 'Status of AI-assisted analyses presented for your review.',
    items: [
      { key: 'analysisDone', label: 'Analysis completed' },
      {
        key: 'sourceUnavailable',
        label: 'Supporting source unavailable',
        hint: 'Sent when a supporting document cannot be retrieved for a finding.',
      },
      {
        key: 'needsVerification',
        label: 'Findings require verification',
        hint: 'Notify me when AI-generated findings are flagged for reviewer assessment.',
      },
      {
        key: 'analysisError',
        label: 'Analysis encountered an error',
        hint: 'Sent when an analysis stops before completing.',
      },
    ],
  },
  {
    key: 'product',
    title: 'Product updates',
    hint: 'Occasional news about the InsuraLens prototype.',
    items: [
      { key: 'productNews', label: 'Product announcements' },
      { key: 'featureUpdates', label: 'New feature updates' },
    ],
  },
]

/* -------------------------------------------------------------------------- */
/* Option lists                                                                */
/* -------------------------------------------------------------------------- */

export const THEME_OPTIONS: ReadonlyArray<{ value: ThemeChoice; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

export const LANGUAGE_OPTIONS: LanguageChoice[] = ['English', 'French', 'Arabic']

export const TIME_ZONE_OPTIONS: string[] = [
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Tokyo',
  'Australia/Sydney',
]

export const DATE_FORMAT_OPTIONS: DateFormatChoice[] = [
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'YYYY-MM-DD',
]

export const LANDING_OPTIONS: ReadonlyArray<{ value: LandingChoice; label: string }> = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'claims', label: 'Claims' },
  { value: 'chat', label: 'Agent Chat' },
]

export const DENSITY_OPTIONS: ReadonlyArray<{ value: DensityChoice; label: string }> = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
]

export const RESPONSE_FORMAT_OPTIONS: ReadonlyArray<{
  value: ResponseFormatChoice
  label: string
  desc: string
}> = [
  {
    value: 'concise',
    label: 'Concise Summary',
    desc: 'A short, high-level overview of the finding.',
  },
  {
    value: 'detailed',
    label: 'Detailed Evidence Review',
    desc: 'Evidence-by-evidence detail with source references.',
  },
  {
    value: 'structured',
    label: 'Structured Investigation Report',
    desc: 'Grouped sections: summary, evidence, and open items.',
  },
]

export const RESPONSE_DETAIL_OPTIONS: ReadonlyArray<{
  value: ResponseDetailChoice
  label: string
}> = [
  { value: 'brief', label: 'Brief' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'detailed', label: 'Detailed' },
]

/* -------------------------------------------------------------------------- */
/* Workspace & product facts (illustrative demo content)                       */
/* -------------------------------------------------------------------------- */

export const WORKSPACE_TYPE = 'Insurance Claims Review'
export const WORKSPACE_ID = 'WS-DEMO-CLAIMS-OPS'

export const WORKSPACE_MEMBERS: ReadonlyArray<{
  name: string
  role: string
  you: boolean
}> = [
  { name: 'Alex Morgan', role: 'Claims Reviewer', you: true },
  { name: 'Jamie Rivera', role: 'Claims Reviewer', you: false },
  { name: 'Dana Whitfield', role: 'Claims Manager', you: false },
]

export const DEMO_MODULES: ReadonlyArray<{ label: string; hash: string }> = [
  { label: 'Dashboard', hash: '#/dashboard' },
  { label: 'Claims', hash: '#/claims' },
  { label: 'Agent Chat', hash: '#/chat' },
  { label: 'Analytics', hash: '#/analytics' },
  { label: 'Settings', hash: '#/settings' },
]

export const PRODUCT = {
  name: 'InsuraLens',
  description: 'AI-assisted vehicle insurance claims review.',
  principle:
    'AI helps connect and explain evidence. Humans remain responsible for the final decision.',
  version: 'Demo Prototype',
  interfaceStatus: 'Frontend Demo',
}

/* -------------------------------------------------------------------------- */
/* Defaults                                                                    */
/* -------------------------------------------------------------------------- */

export const DEFAULT_NOTIFICATIONS: Notifications = {
  claimAssigned: true,
  evidenceAdded: true,
  docsMissing: true,
  statusChanged: true,
  humanReview: true,
  analysisDone: true,
  sourceUnavailable: true,
  needsVerification: true,
  analysisError: true,
  productNews: false,
  featureUpdates: false,
}

export const DEFAULT_SETTINGS: Settings = {
  profile: {
    fullName: 'Alex Morgan',
    displayName: '',
    jobTitle: 'Claims Reviewer',
    email: 'alex.morgan@example.com',
    role: 'Claims Reviewer',
    workspace: 'Claims Operations',
  },
  preferences: {
    theme: 'light',
    language: 'English',
    timeZone: 'UTC',
    dateFormat: 'DD/MM/YYYY',
    landing: 'dashboard',
    density: 'comfortable',
  },
  notifications: { ...DEFAULT_NOTIFICATIONS },
  ai: {
    format: 'detailed',
    showSources: true,
    highlightUncertainty: true,
    highlightInconsistencies: true,
    detail: 'balanced',
  },
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

export function validateWorkspaceName(name: string): string | undefined {
  const value = name.trim()
  if (!value) return 'Workspace display name is required.'
  if (value.length < 2) return 'Enter at least 2 characters.'
  return undefined
}

/** Initials for the profile avatar: "Alex Morgan" → "AM". */
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
    ai: { ...settings.ai },
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
  const a = (stored.ai ?? {}) as Partial<AiPreferences>
  const prof = (stored.profile ?? {}) as Partial<Profile>
  const ws = (stored.workspace ?? {}) as Partial<WorkspaceInfo>
  const n = (stored.notifications ?? {}) as Partial<Notifications>

  const notifications = { ...base.notifications }
  for (const key of NOTIFICATION_KEYS) {
    if (key in n) notifications[key] = bool(n[key], notifications[key])
  }

  return {
    profile: {
      fullName: str(prof.fullName, base.profile.fullName),
      displayName: str(prof.displayName, base.profile.displayName),
      jobTitle: str(prof.jobTitle, base.profile.jobTitle),
      email: str(prof.email, base.profile.email),
      role: str(prof.role, base.profile.role),
      workspace: str(prof.workspace, base.profile.workspace),
    },
    preferences: {
      theme: oneOf(p.theme, ['light', 'dark', 'system'] as const, base.preferences.theme),
      language: oneOf(p.language, LANGUAGE_OPTIONS, base.preferences.language),
      timeZone: TIME_ZONE_OPTIONS.includes(str(p.timeZone, base.preferences.timeZone))
        ? str(p.timeZone, base.preferences.timeZone)
        : base.preferences.timeZone,
      dateFormat: oneOf(p.dateFormat, DATE_FORMAT_OPTIONS, base.preferences.dateFormat),
      landing: oneOf(p.landing, ['dashboard', 'claims', 'chat'] as const, base.preferences.landing),
      density: oneOf(p.density, ['comfortable', 'compact'] as const, base.preferences.density),
    },
    notifications,
    ai: {
      format: oneOf(a.format, ['concise', 'detailed', 'structured'] as const, base.ai.format),
      showSources: bool(a.showSources, base.ai.showSources),
      highlightUncertainty: bool(a.highlightUncertainty, base.ai.highlightUncertainty),
      highlightInconsistencies: bool(a.highlightInconsistencies, base.ai.highlightInconsistencies),
      detail: oneOf(a.detail, ['brief', 'balanced', 'detailed'] as const, base.ai.detail),
    },
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

/** Merges a patch into the saved settings, persists, then notifies. */
export function saveSettings(patch: Partial<Settings>): void {
  state = { ...state, ...patch }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  } catch {
    /* Storage unavailable (private mode, quota) — in-memory state still holds. */
  }
  applyEffects(state)
  listeners.forEach((listener) => listener())
}
