import { useEffect, useRef } from 'react'

type Props = {
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** Confirmation dialog for destructive chat actions (delete / clear). */
export function ConfirmDialog({ title, body, confirmLabel, onConfirm, onCancel }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="claims-modal__backdrop" role="presentation" onMouseDown={onCancel}>
      <div
        className="claims-modal chat-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="chat-confirm-title"
        aria-describedby="chat-confirm-body"
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
        </div>
        <div className="claims-modal__foot">
          <button type="button" className="chat-ghost-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="chat-danger-btn" onClick={onConfirm} ref={confirmRef}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
