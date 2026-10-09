import { useEffect, useId, useRef } from 'react'
import { CloseIcon } from '../../components/ui/icons'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export type PasswordRecoveryDialogProps = {
  open: boolean
  onClose: () => void
}

/**
 * Placeholder for password recovery. Nothing is sent anywhere: the dialog
 * exists so the "Forgot password?" link has somewhere honest to go until
 * authentication is implemented.
 */
export function PasswordRecoveryDialog({ open, onClose }: PasswordRecoveryDialogProps) {
  const titleId = useId()
  const bodyId = useId()
  const cardRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)

  /* onClose identity changes every render of the parent. Reading it through a
     ref keeps the mount effect from re-running — which would yank focus back
     to the close button mid-interaction. */
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return

    returnFocusTo.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const card = cardRef.current
      if (!card) return
      const items = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return

      const active = document.activeElement
      const inside = active instanceof Node && card.contains(active)

      if (!inside || (event.shiftKey && active === items[0])) {
        event.preventDefault()
        items[items.length - 1].focus()
      } else if (!event.shiftKey && active === items[items.length - 1]) {
        event.preventDefault()
        items[0].focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      returnFocusTo.current?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="dialog__scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        ref={cardRef}
      >
        <div className="dialog__head">
          <h2 className="dialog__title" id={titleId}>
            Password recovery
          </h2>
          <button
            type="button"
            className="dialog__close"
            onClick={onClose}
            aria-label="Close password recovery"
            ref={closeRef}
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <p className="dialog__body" id={bodyId}>
          Password recovery will be connected when authentication is implemented.
        </p>
      </div>
    </div>
  )
}
