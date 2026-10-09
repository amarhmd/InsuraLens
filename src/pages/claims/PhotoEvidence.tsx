import { useRef } from 'react'
import { CloseIcon } from '../../components/ui/icons'
import { cx } from '../../lib/cx'
import {
  MAX_PHOTO_MB,
  MAX_PHOTOS,
  PHOTO_ACCEPT,
  formatBytes,
  type StagedPhoto,
} from './claimAttachments'

type Props = {
  photos: StagedPhoto[]
  photoError: string
  dragging: boolean
  isMobile: boolean
  onDraggingChange: (dragging: boolean) => void
  onAddFiles: (files: FileList | File[]) => void
  onCaptionChange: (id: string, caption: string) => void
  onRemove: (id: string) => void
}

/**
 * Photo staging for the create-claim form: the dropzone (mouse, keyboard,
 * and drag-and-drop paths all funnel into onAddFiles) plus the thumbnails
 * list with per-photo progress, caption, and remove actions. State and
 * uploads stay in the modal; this component owns only its file input.
 */
export function PhotoEvidence({
  photos,
  photoError,
  dragging,
  isMobile,
  onDraggingChange,
  onAddFiles,
  onCaptionChange,
  onRemove,
}: Props) {
  const photoInput = useRef<HTMLInputElement>(null)

  return (
    <div className="claims-evidence__group">
      <div className="claims-evidence__row">
        <span className="claims-evidence__label">Photos</span>
        <span className="claims-evidence__count">
          {photos.length} of {MAX_PHOTOS}
        </span>
      </div>

      <div
        className={cx('claims-dropzone', dragging && 'claims-dropzone--over')}
        role="button"
        tabIndex={0}
        aria-label={`Add photos — ${photos.length} of ${MAX_PHOTOS} chosen. JPG, PNG, HEIC or WebP, up to ${MAX_PHOTO_MB} MB each.`}
        onClick={() => photoInput.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            photoInput.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          onDraggingChange(true)
        }}
        onDragLeave={() => onDraggingChange(false)}
        onDrop={(e) => {
          e.preventDefault()
          onDraggingChange(false)
          onAddFiles(e.dataTransfer.files)
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 16V4" />
          <path d="m7 9 5-5 5 5" />
          <path d="M4 20h16" />
        </svg>
        <p className="claims-dropzone__text">Drag &amp; drop photos here</p>
        {/* Mouse-only affordance: the zone above owns the keyboard
            interaction, so this stays out of the tab order. */}
        <span className="claims-btn claims-dropzone__browse" aria-hidden="true">
          Browse files
        </span>
        <p className="claims-dropzone__hint">
          JPG, PNG, HEIC or WebP · up to {MAX_PHOTO_MB} MB each
        </p>
        <input
          ref={photoInput}
          className="sr-only"
          type="file"
          multiple
          accept={PHOTO_ACCEPT}
          capture={isMobile ? 'environment' : undefined}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            if (e.target.files) onAddFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {photos.length === 0 && (
        <p className="claims-evidence__hint">
          No photos yet. You can add evidence later from the claim workspace.
        </p>
      )}
      {photoError && <p className="claims-field__error">{photoError}</p>}

      {photos.length > 0 && (
        <ul className="claims-photos">
          {photos.map((photo) => (
            <li key={photo.id} className="claims-photo">
              <img className="claims-photo__thumb" src={photo.url} alt="" />
              <div className="claims-photo__meta">
                <span className="claims-photo__name" title={photo.name}>
                  {photo.name}
                </span>
                <span className="claims-photo__size">{formatBytes(photo.size)}</span>
              </div>
              <div
                className="claims-upload__progress"
                role="progressbar"
                aria-label={`Uploading ${photo.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={photo.progress}
              >
                <span className="claims-upload__bar" style={{ width: `${photo.progress}%` }} />
              </div>
              <input
                className="claims-photo__caption"
                type="text"
                placeholder="Caption (optional)"
                aria-label={`Caption for ${photo.name}`}
                value={photo.caption}
                onChange={(e) => onCaptionChange(photo.id, e.target.value)}
              />
              <button
                type="button"
                className="claims-photo__remove"
                aria-label={`Remove ${photo.name}`}
                onClick={() => onRemove(photo.id)}
              >
                <CloseIcon size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}