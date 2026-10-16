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
 * backend, so it is never uploaded per claim — this dialog is the single
 * place the demo "opens" it. The body is placeholder copy for the prototype;
 * a real build would stream the stored PDF here.
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
            <div className="policy-doc__row">
              <dt className="policy-doc__label">Document</dt>
              <dd className="policy-doc__value">Policy declaration</dd>
            </div>
            <div className="policy-doc__row">
              <dt className="policy-doc__label">Status</dt>
              <dd className="policy-doc__value policy-doc__value--ok">Active</dd>
            </div>
          </dl>

          <div className="policy-doc__page" aria-hidden="true">
            <span className="policy-doc__page-title">Motor insurance policy schedule</span>
            <span className="policy-doc__line" />
            <span className="policy-doc__line" />
            <span className="policy-doc__line policy-doc__line--short" />
            <span className="policy-doc__line" />
            <span className="policy-doc__line policy-doc__line--short" />
          </div>
        </div>

        <div className="claims-modal__foot">
          <p className="claims-modal__demo">Demo only. Placeholder policy document.</p>
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
