/* ==========================================================================
   "Remember me" — one boolean preference, and nothing else.

   The control starts unchecked. This module stores the reviewer's choice and
   only that: no email, no password, no token ever reaches storage. Reads and
   writes are guarded, so a blocked or hand-edited store falls back to the
   default instead of breaking the form.
   ========================================================================== */

const STORAGE_KEY = 'insuralens.rememberMe'

/** Default is false — an absent or unreadable value means "don't remember". */
export function readRememberMe(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** Persists the choice. Unchecking removes the key rather than storing "off". */
export function writeRememberMe(value: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return
    if (value) localStorage.setItem(STORAGE_KEY, '1')
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* Storage unavailable (private mode, quota) — the choice just isn't kept. */
  }
}
