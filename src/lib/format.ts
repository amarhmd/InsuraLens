/* ==========================================================================
   Date formatting for the claims domain.

   A leaf module (no imports) so any part of the claims domain can format
   timestamps without pulling in a broader module graph. claimsData re-exports
   these so existing callers are unaffected.
   ========================================================================== */

export function formatAgo(minutes: number): string {
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export function formatDate(value: number): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
