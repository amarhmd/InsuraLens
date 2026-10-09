import { useEffect, useState } from 'react'
import { CloseIcon } from '../../components/ui/icons'

/**
 * ToastNotification — generic confirmations for the chat workspace.
 * Reuses the existing `.claims-toast` styles (already contrast-verified).
 */
export function ToastNotification({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const timer = window.setTimeout(onDismiss, 4200)
    return () => window.clearTimeout(timer)
  }, [paused, onDismiss])

  return (
    <div
      className="claims-toast"
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="claims-toast__icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
        </svg>
      </span>
      <span className="claims-toast__text">{message}</span>
      <button type="button" className="claims-toast__close" aria-label="Dismiss notification" onClick={onDismiss}>
        <CloseIcon size={14} />
      </button>
    </div>
  )
}
