import { useEffect, useRef } from 'react'
import { CloseIcon } from '../ui/icons'

type Props = {
  /** The policy the customer's stored document belongs to. */
  policyRef: string
  onClose: () => void
}

/**
 * Read-only viewer for the customer's stored policy document.
 *
 * The policy belongs to the customer/contract and is stored once on the
 * backend, so it is never uploaded per claim. No policy-document endpoint
 * exists yet, so this dialog states that plainly rather than rendering a
 * fabricated document.
 */
export function PolicyViewer({ policyRef, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="claims-modal__backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="claims-modal policy-viewer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-viewer-title"
        aria-describedby="policy-viewer-subtitle"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="claims-modal__head">
          <div>
            <h2 className="claims-modal__title" id="policy-viewer-title">
              Policy on file
            </h2>
            <p className="claims-modal__subtitle" id="policy-viewer-subtitle">
              Stored once on the customer&rsquo;s contract — valid for every claim.
            </p>
          </div>
          <button
            type="button"
            className="claims-modal__close"
            aria-label="Close policy"
            onClick={onClose}
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="claims-modal__body">
          <dl className="policy-doc">
            <div className="policy-doc__row">
              <dt className="policy-doc__label">Policy number</dt>
              <dd className="policy-doc__value">{policyRef.trim() || 'Not assigned'}</dd>
            </div>
          </dl>

          <p className="policy-doc__notice">
            The policy document isn&rsquo;t available yet — no endpoint serves it. Once the
            backend exposes the stored file, it will open here.
          </p>
        </div>

        <div className="claims-modal__foot">
          <p className="claims-modal__note">Read-only view.</p>
          <div className="claims-modal__actions">
            <button
              ref={closeRef}
              type="button"
              className="claims-btn claims-btn--primary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
