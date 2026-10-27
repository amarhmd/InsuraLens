/* ==========================================================================
   AI Review Preferences — the three display switches on #/settings that the
   Claim workspace really reads.

   Frontend only. These flags change what the Claim workspace *shows*; they
   never change an AI analysis, a claim status, or a review requirement.
   Approve stays disabled until every damage area is confirmed or dismissed,
   whatever these values are.

   Persisted under one localStorage key with safe defaults and try/catch around
   every read and write, so a missing, blocked, or hand-edited store can never
   leave the Claim page (or Settings) in a broken state.
   ========================================================================== */

export type AiPrefs = {
  /** Draw the numbered, AI-suggested damage boxes over the vehicle illustration. */
  damageBoxes: boolean
  /** Show the chips that link an AI finding to the evidence it relies on. */
  evidenceLinks: boolean
  /** Show AI-suggested / AI-generated tags and each finding's status badge. */
  aiBadges: boolean
}

export const DEFAULT_AI_PREFS: AiPrefs = {
  damageBoxes: true,
  evidenceLinks: true,
  aiBadges: true,
}

const STORAGE_KEY = 'insuralens.aiPrefs'

function clone(prefs: AiPrefs): AiPrefs {
  return {
    damageBoxes: prefs.damageBoxes,
    evidenceLinks: prefs.evidenceLinks,
    aiBadges: prefs.aiBadges,
  }
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/** Coerces whatever comes out of localStorage into a valid AiPrefs object. */
export function sanitizeAiPrefs(raw: unknown): AiPrefs {
  const base = clone(DEFAULT_AI_PREFS)
  if (typeof raw !== 'object' || raw === null) return base
  const stored = raw as Partial<Record<keyof AiPrefs, unknown>>
  return {
    damageBoxes: bool(stored.damageBoxes, base.damageBoxes),
    evidenceLinks: bool(stored.evidenceLinks, base.evidenceLinks),
    aiBadges: bool(stored.aiBadges, base.aiBadges),
  }
}

function load(): AiPrefs {
  try {
    if (typeof localStorage === 'undefined') return clone(DEFAULT_AI_PREFS)
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return clone(DEFAULT_AI_PREFS)
    return sanitizeAiPrefs(JSON.parse(raw))
  } catch {
    return clone(DEFAULT_AI_PREFS)
  }
}

let state: AiPrefs = load()
const listeners = new Set<() => void>()

export function getAiPrefs(): AiPrefs {
  return state
}

export function subscribeAiPrefs(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Merges a patch into the saved preferences, persists, then notifies.
 * Returns false without publishing the patch when the browser refuses the
 * write, so callers never show "Saved" for a change that was not stored.
 */
export function saveAiPrefs(patch: Partial<AiPrefs>): boolean {
  const next = { ...state, ...patch }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }
  } catch {
    return false
  }
  state = next
  listeners.forEach((listener) => listener())
  return true
}
