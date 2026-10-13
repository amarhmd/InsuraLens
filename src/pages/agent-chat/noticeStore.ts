/* ==========================================================================
   Prototype-notice dismissal — one boolean preference, and nothing else.

   The one-line prototype notice at the top of the chat starts visible so a
   first-time reviewer sees it. Dismissing it is remembered across reloads.
   Reads and writes are guarded so a blocked or hand-edited store falls back
   to the default (shown) instead of breaking the page.
   ========================================================================== */

const STORAGE_KEY = 'insuralens:chat-prototype-notice-dismissed'

/** Default is false — an absent or unreadable value means "still show it". */
export function readNoticeDismissed(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** Persists the choice. Clearing it removes the key rather than storing "off". */
export function writeNoticeDismissed(dismissed: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return
    if (dismissed) localStorage.setItem(STORAGE_KEY, '1')
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* Storage unavailable (private mode, quota) — the notice just reappears. */
  }
}
