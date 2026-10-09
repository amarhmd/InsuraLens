import { useRef } from 'react'
import { CloseIcon } from '../../components/ui/icons'
import { cx } from '../../lib/cx'
import {
  DOC_ACCEPT,
  DOC_SLOTS,
  MAX_DOC_MB,
  formatBytes,
  type DocSlotKey,
  type StagedDoc,
} from './claimAttachments'

type Props = {
  docFiles: Record<DocSlotKey, StagedDoc | null>
  docErrors: Record<DocSlotKey, string>
  onAdd: (slot: DocSlotKey, file: File) => void
  onRemove: (slot: DocSlotKey) => void
}

/**
 * Document staging for the create-claim form — one slot per document type
 * (accident report, customer statement, policy document), each with its own
 * sr-only file input, filled-chip with progress, and per-slot error message.
 * State and uploads stay in the modal; this component owns the input refs.
 */
export function DocEvidence({ docFiles, docErrors, onAdd, onRemove }: Props) {
  const docInputs = useRef<Record<DocSlotKey, HTMLInputElement | null>>({
    accident: null,
    statement: null,
    policy: null,
  })

  return (
    <div className="claims-evidence__group">
      <div className="claims-evidence__row">
        <span className="claims-evidence__label">Documents</span>
        <span className="claims-evidence__count">PDF or DOCX · up to {MAX_DOC_MB} MB each</span>
      </div>

      <div className="claims-docs">
        {DOC_SLOTS.map((slot) => {
          const staged = docFiles[slot.key]
          const error = docErrors[slot.key]
          return (
            <div
              key={slot.key}
              className={cx('claims-doc', staged && 'claims-doc--filled')}
              role="group"
              aria-labelledby={`claim-doc-${slot.key}-label`}
            >
              <span className="claims-doc__label" id={`claim-doc-${slot.key}-label`}>
                {slot.label}
              </span>
              <input
                ref={(el) => {
                  docInputs.current[slot.key] = el
                }}
                id={`claim-doc-${slot.key}`}
                className="sr-only"
                type="file"
                accept={DOC_ACCEPT}
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) onAdd(slot.key, file)
                  e.target.value = ''
                }}
              />
              {staged ? (
                <>
                  <div className="claims-doc__chip">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                    <span className="claims-doc__name" title={staged.name}>
                      {staged.name}
                    </span>
                    <span className="claims-doc__size">{formatBytes(staged.size)}</span>
                    <button
                      type="button"
                      className="claims-doc__remove"
                      aria-label={`Remove ${slot.label} file ${staged.name}`}
                      onClick={() => onRemove(slot.key)}
                    >
                      <CloseIcon size={13} />
                    </button>
                  </div>
                  <div
                    className="claims-upload__progress"
                    role="progressbar"
                    aria-label={`Uploading ${staged.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={staged.progress}
                  >
                    <span
                      className="claims-upload__bar"
                      style={{ width: `${staged.progress}%` }}
                    />
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className="claims-btn claims-doc__pick"
                  aria-describedby={error ? `claim-doc-${slot.key}-error` : undefined}
                  onClick={() => docInputs.current[slot.key]?.click()}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 16V4" />
                    <path d="m7 9 5-5 5 5" />
                    <path d="M4 20h16" />
                  </svg>
                  Upload file
                </button>
              )}
              {error && (
                <p className="claims-field__error" id={`claim-doc-${slot.key}-error`}>
                  {error}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}