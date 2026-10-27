import { useEffect, useRef } from 'react'

type Props = {
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
  error?: string | null
}

/** Confirmation dialog for destructive chat actions (delete / clear). */
export function ConfirmDialog({ title, body, confirmLabel, onConfirm, onCancel, busy = false, error = null }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!busy) confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  return (
    <div
      className="claims-modal__backdrop"
      role="presentation"
      onMouseDown={() => {
        if (!busy) onCancel()
      }}
    >
      <div
        className="claims-modal chat-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="chat-confirm-title"
        aria-describedby={error ? undefined : 'chat-confirm-body'}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="claims-modal__head">
          <h2 className="claims-modal__title" id="chat-confirm-title">
            {title}
          </h2>
        </div>
        <div className="claims-modal__body">
          <p id="chat-confirm-body" className="chat-confirm__body">
            {body}
          </p>
          {error && (
            <p className="chat-confirm__error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="claims-modal__foot">
          <button type="button" className="chat-ghost-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="chat-danger-btn"
            onClick={onConfirm}
            ref={confirmRef}
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
