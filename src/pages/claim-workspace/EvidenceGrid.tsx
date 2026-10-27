import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { request } from '../../api/http'
import { cx } from '../../lib/cx'
import type { EvidenceItem } from '../../lib/claimWorkspace'
import { EVIDENCE_ACCEPT } from '../claims/claimAttachments'
import { DocGlyph, PhotoGlyph } from './glyphs'

type EvidenceGridProps = {
  claimId: string
  items: EvidenceItem[]
  /** Tile to pulse briefly, when a finding chip points at it. */
  highlightedId: string | null
  /** When provided, show an "Add evidence" control that uploads the chosen file. */
  onUpload?: (file: File) => void
}

type EvidenceImageSource = {
  src: string | null
  loading: boolean
  failed: boolean
  markFailed: () => void
}

type LightboxState = {
  claimId: string
  index: number
}

function isImageFile(item: EvidenceItem): boolean {
  return Boolean(item.mimeType?.toLowerCase().startsWith('image/'))
}

/**
 * Image tiles use the public CDN URL when the backend publishes one. Otherwise
 * the protected API file is fetched through the authenticated HTTP client and
 * exposed as a short-lived object URL — the token never enters the page URL.
 */
function useEvidenceImage(item: EvidenceItem | null, enabled = true): EvidenceImageSource {
  const isImage = Boolean(item && isImageFile(item))
  const publicUrl = item?.publicUrl
  const protectedPath = item?.url
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setObjectUrl(null)
    setFailed(false)
    if (!enabled || !isImage || publicUrl || !protectedPath) return

    const controller = new AbortController()
    let createdUrl: string | null = null

    request(protectedPath, { as: 'blob', signal: controller.signal })
      .then((blob: unknown) => {
        if (controller.signal.aborted) return
        if (!(blob instanceof Blob)) throw new Error('Evidence response was not a file.')
        createdUrl = URL.createObjectURL(blob)
        setObjectUrl(createdUrl)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })

    return () => {
      controller.abort()
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [enabled, isImage, item?.id, protectedPath, publicUrl])

  const src = publicUrl ?? objectUrl
  return {
    src: isImage ? src : null,
    loading: enabled && isImage && !publicUrl && Boolean(protectedPath) && !src && !failed,
    failed,
    markFailed: () => setFailed(true),
  }
}

function EvidenceThumbnail({
  item,
  onOpen,
}: {
  item: EvidenceItem
  onOpen: (item: EvidenceItem, trigger: HTMLButtonElement) => void
}) {
  const image = useEvidenceImage(item)
  const isImage = isImageFile(item)
  const showImage = Boolean(isImage && image.src && !image.failed)

  const thumb = showImage ? (
    <img
      src={image.src ?? undefined}
      alt={item.label}
      loading="lazy"
      onError={image.markFailed}
    />
  ) : isImage ? (
    <PhotoGlyph />
  ) : (
    <DocGlyph />
  )

  const className = cx('cw-evidence__thumb', showImage && 'cw-evidence__thumb--image')

  if (!isImage) return <span className={className}>{thumb}</span>

  return (
    <button
      type="button"
      id={`evidence-open-${item.id}`}
      className={cx(className, 'cw-evidence__thumb--button')}
      aria-label={`View image: ${item.label}`}
      aria-haspopup="dialog"
      onClick={(event) => onOpen(item, event.currentTarget)}
    >
      {thumb}
    </button>
  )
}

function LightboxImage({ item }: { item: EvidenceItem }) {
  const image = useEvidenceImage(item)
  const [loaded, setLoaded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imageRef.current
    if (img?.complete && img.naturalWidth > 0) setLoaded(true)
  }, [image.src])

  const failed = image.failed || imageFailed || (!image.src && !image.loading)
  const loading = !failed && (image.loading || !loaded)

  if (failed) {
    return (
      <p className="cw-lightbox__error" role="alert">
        Could not load {item.label}.
      </p>
    )
  }

  return (
    <div className="cw-lightbox__frame" aria-busy={loading}>
      {loading && (
        <div className="cw-lightbox__loading" role="status">
          Loading image…
        </div>
      )}
      {image.src && (
        <img
          ref={imageRef}
          className={cx('cw-lightbox__image', loading && 'is-loading')}
          src={image.src}
          alt={item.label}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setImageFailed(true)
            image.markFailed()
          }}
        />
      )}
    </div>
  )
}

function EvidenceLightbox({
  images,
  index,
  onClose,
  onPrevious,
  onNext,
}: {
  images: EvidenceItem[]
  index: number
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
}) {
  const item = images[index]
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowLeft' && images.length > 1) {
        event.preventDefault()
        onPrevious()
      } else if (event.key === 'ArrowRight' && images.length > 1) {
        event.preventDefault()
        onNext()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [images.length, onClose, onNext, onPrevious])

  const handleTab = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const dialog = dialogRef.current
    if (!dialog) return

    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.offsetParent !== null)

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) return

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!item) return null

  return (
    <div
      className="claims-modal__backdrop cw-lightbox__backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="cw-lightbox"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cw-lightbox-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleTab}
      >
        <button
          ref={closeRef}
          type="button"
          className="cw-lightbox__close"
          aria-label="Close image viewer"
          onClick={onClose}
        >
          ×
        </button>

        <div className="cw-lightbox__stage">
          {images.length > 1 && (
            <button
              type="button"
              className="cw-lightbox__nav cw-lightbox__nav--prev"
              aria-label="Previous image"
              onClick={onPrevious}
            >
              ‹
            </button>
          )}
          <LightboxImage
            key={`${item.id}:${item.publicUrl ?? item.url ?? ''}`}
            item={item}
          />
          {images.length > 1 && (
            <button
              type="button"
              className="cw-lightbox__nav cw-lightbox__nav--next"
              aria-label="Next image"
              onClick={onNext}
            >
              ›
            </button>
          )}
        </div>

        <div className="cw-lightbox__meta">
          <h2 className="cw-lightbox__caption" id="cw-lightbox-title">
            {item.label}
          </h2>
          {images.length > 1 && (
            <span className="cw-lightbox__counter" aria-live="polite">
              {index + 1} / {images.length}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/** "Evidence & documents" — photos as gradient tiles, documents as dashed tiles. */
export function EvidenceGrid({ claimId, items, highlightedId, onUpload }: EvidenceGridProps) {
  const [lightbox, setLightbox] = useState<LightboxState | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const imageItems = items.filter(isImageFile)
  const activeImage = lightbox?.claimId === claimId ? imageItems[lightbox.index] : null

  useEffect(() => {
    setLightbox((current) => {
      if (!current) return current
      if (current.claimId !== claimId || current.index >= imageItems.length) return null
      return current
    })
  }, [claimId, imageItems.length])

  const closeLightbox = useCallback(() => {
    setLightbox(null)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }, [])

  const openLightbox = (item: EvidenceItem, trigger: HTMLButtonElement) => {
    const index = imageItems.findIndex((image) => image.id === item.id)
    if (index === -1) return
    triggerRef.current = trigger
    setLightbox({ claimId, index })
  }

  const moveLightbox = useCallback(
    (delta: number) => {
      setLightbox((current) => {
        if (!current || imageItems.length < 2) return current
        return { ...current, index: (current.index + delta + imageItems.length) % imageItems.length }
      })
    },
    [imageItems.length],
  )

  const showPrevious = useCallback(() => moveLightbox(-1), [moveLightbox])
  const showNext = useCallback(() => moveLightbox(1), [moveLightbox])

  return (
    <section className="cw-card cw-section" aria-labelledby="cw-evidence-title">
      <div className="cw-section__head">
        <h2 className="cw-section__title" id="cw-evidence-title">
          Evidence &amp; documents
        </h2>
        {onUpload && (
          <label className="cw-btn cw-btn--secondary">
            Add evidence
            <input
              type="file"
              hidden
              accept={EVIDENCE_ACCEPT}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                if (file) onUpload(file)
                /* Reset so picking the same file again still fires a change. */
                event.currentTarget.value = ''
              }}
            />
          </label>
        )}
      </div>

      <ul className="cw-evidence">
        {items.map((item) => (
          <li
            key={item.id}
            id={`evidence-${item.id}`}
            className={cx(
              'cw-evidence__tile',
              item.kind === 'photo' ? 'cw-evidence__tile--photo' : 'cw-evidence__tile--doc',
              highlightedId === item.id && 'cw-evidence__tile--highlight',
            )}
          >
            <EvidenceThumbnail item={item} onOpen={openLightbox} />
            <span className="cw-evidence__caption">{item.label}</span>
          </li>
        ))}
      </ul>

      {activeImage && lightbox && (
        <EvidenceLightbox
          images={imageItems}
          index={lightbox.index}
          onClose={closeLightbox}
          onPrevious={showPrevious}
          onNext={showNext}
        />
      )}
    </section>
  )
}
