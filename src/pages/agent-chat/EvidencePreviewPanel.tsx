import type { Claim } from '../../lib/claimsData'
import type { ChatEvidenceFile } from '../../lib/chatData'
import { fileUrl } from '../../api/http'

type Props = {
  fileId: string
  files: ChatEvidenceFile[]
  claim: Claim | undefined
  onBack: () => void
}

/** 51200 -> "50 KB". */
function formatSize(bytes?: number): string {
  if (typeof bytes !== 'number' || bytes <= 0) return 'Unknown'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Prefer the CDN URL; fall back to the authenticated backend path. */
function openUrl(file: ChatEvidenceFile): string | null {
  if (file.publicUrl) return file.publicUrl
  if (file.url) return fileUrl(file.url)
  return null
}

/**
 * Evidence preview for one real backend file. The file's metadata is always
 * shown; when the backend publishes a URL (public or token-authenticated) the
 * panel links to the original file. When no URL is available it says so instead
 * of faking a viewer.
 */
export function EvidencePreviewPanel({ fileId, files, claim, onBack }: Props) {
  const file = files.find((f) => f.id === fileId)

  if (!file) {
    return (
      <div className="chat-ctx">
        <div className="chat-ctx__head">
          <h2 className="chat-ctx__title">Evidence preview</h2>
        </div>
        <div className="chat-ctx__empty">
          <p className="chat-ctx__empty-title">File not found</p>
          <p className="chat-ctx__empty-text">This file is not part of the claim's evidence.</p>
          <button type="button" className="chat-preview__back" onClick={onBack}>
            Back to Evidence
          </button>
        </div>
      </div>
    )
  }

  const href = openUrl(file)
  const added = file.createdAt
    ? new Date(file.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown'

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
        <h3 className="chat-preview__name">{file.name}</h3>

        <dl className="chat-preview__fields">
          <div className="chat-preview__field">
            <dt>File</dt>
            <dd>{file.name}</dd>
          </div>
          <div className="chat-preview__field">
            <dt>Type</dt>
            <dd>{file.mimeType || file.kind || 'Unknown'}</dd>
          </div>
          <div className="chat-preview__field">
            <dt>Size</dt>
            <dd>{formatSize(file.sizeBytes)}</dd>
          </div>
          <div className="chat-preview__field">
            <dt>Date added</dt>
            <dd>{added}</dd>
          </div>
        </dl>

        {href ? (
          <div className="chat-preview__actions">
            <a className="chat-preview__back" href={href} target="_blank" rel="noreferrer">
              Open original file
            </a>
            {claim && (
              <a
                className="chat-preview__workspace"
                href={`#/claims/${encodeURIComponent(claim.id)}`}
              >
                View in Claim Workspace
              </a>
            )}
          </div>
        ) : (
          <>
            <p className="chat-preview__notice">
              Metadata only — the backend returned no fetchable URL for this file.
            </p>
            <div className="chat-preview__actions">
              <button type="button" className="chat-preview__back" onClick={onBack}>
                Back to Evidence
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
          </>
        )}
      </div>
    </div>
  )
}
