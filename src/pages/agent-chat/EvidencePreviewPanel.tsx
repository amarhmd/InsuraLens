import { getSource } from '../../lib/chatData'
import type { Claim } from '../../lib/claimsData'

type Props = {
  sourceId: string
  claim: Claim | undefined
  onBack: () => void
}

/**
 * Metadata-only evidence preview. The prototype stores no file contents,
 * so the panel says so plainly instead of faking a document viewer.
 */
export function EvidencePreviewPanel({ sourceId, claim, onBack }: Props) {
  const source = getSource(sourceId, claim)

  if (!source) {
    return (
      <div className="chat-ctx">
        <div className="chat-ctx__head">
          <h2 className="chat-ctx__title">Evidence preview</h2>
        </div>
        <div className="chat-ctx__empty">
          <p className="chat-ctx__empty-title">Source not found</p>
          <p className="chat-ctx__empty-text">This source is not part of the mock evidence set.</p>
          <button type="button" className="chat-preview__back" onClick={onBack}>
            Back to Claim Context
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-preview">
      <div className="chat-ctx__head">
        <h2 className="chat-ctx__title">Evidence preview</h2>
        <button
          type="button"
          className="chat-panel__close chat-ctx__close"
          aria-label="Close evidence preview"
          onClick={onBack}
        >
          ×
        </button>
      </div>

      <div className="chat-preview__body">
        <span className="chat-preview__icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7.5L14 3.5Z" />
            <path d="M13.75 3.7V8h4.1" />
          </svg>
        </span>
        <h3 className="chat-preview__name">{source.name}</h3>

        <dl className="chat-preview__fields">
          <div className="chat-preview__field">
            <dt>File</dt>
            <dd>{source.fileName}</dd>
          </div>
          <div className="chat-preview__field">
            <dt>Type</dt>
            <dd>{source.type}</dd>
          </div>
          <div className="chat-preview__field">
            <dt>Date added</dt>
            <dd>{source.dateAdded}</dd>
          </div>
          <div className="chat-preview__field">
            <dt>Status</dt>
            <dd>
              <span className="chat-preview__status">{source.status}</span>
            </dd>
          </div>
        </dl>

        <section className="chat-preview__section">
          <h4 className="chat-preview__label">Summary</h4>
          <p className="chat-preview__text">{source.summary}</p>
        </section>

        {source.sectionLabel && (
          <section className="chat-preview__section">
            <h4 className="chat-preview__label">Referenced section</h4>
            <p className="chat-preview__text">{source.sectionLabel}</p>
          </section>
        )}

        {source.related.length > 0 && (
          <section className="chat-preview__section">
            <h4 className="chat-preview__label">Related evidence</h4>
            <p className="chat-preview__text">{source.related.join(' · ')}</p>
          </section>
        )}

        <p className="chat-preview__notice">
          Metadata only — this prototype does not store file contents, so no document preview is
          available.
        </p>

        <div className="chat-preview__actions">
          <button type="button" className="chat-preview__back" onClick={onBack}>
            Back to Claim Context
          </button>
          {claim && (
            <a
              className="chat-preview__workspace"
              href={`#/claims/${encodeURIComponent(claim.id)}`}
            >
              View in Claim Workspace
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
