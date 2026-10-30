import { useEffect, useState } from 'react'
import { CloseIcon } from '../../components/ui/icons'

export type ClaimsToastAction = { label: string; onClick: () => void }
export type ClaimsToastTone = 'success' | 'error' | 'info'

export function ClaimsToast({
  message,
  action,
  tone = 'success',
  onDismiss,
}: {
  message: string
  action?: ClaimsToastAction
  tone?: ClaimsToastTone
  onDismiss: () => void
}) {
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const timer = window.setTimeout(onDismiss, 4200)
    return () => window.clearTimeout(timer)
  }, [paused, onDismiss])

  const iconColor =
    tone === 'error' ? '#b42318' : tone === 'info' ? '#0c6e70' : undefined

  return (
    <div
      className={`claims-toast claims-toast--${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span
        className="claims-toast__icon"
        style={iconColor ? { color: iconColor } : undefined}
        aria-hidden="true"
      >
        {tone === 'error' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v6" />
            <path d="M12 16.5h.01" />
          </svg>
        ) : tone === 'info' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5" />
            <path d="M12 8h.01" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
          </svg>
        )}
      </span>
      <span className="claims-toast__text">{message}</span>
      {action && (
        <button type="button" className="claims-toast__action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
      <button type="button" className="claims-toast__close" aria-label="Dismiss notification" onClick={onDismiss}>
        <CloseIcon size={14} />
      </button>
    </div>
  )
}
