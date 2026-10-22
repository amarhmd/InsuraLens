import { useEffect, useState } from 'react'
import { evidenceGroupKey, type ChatEvidenceFile } from '../../lib/chatData'
import { cx } from '../../lib/cx'
import { CloseIcon, FileIcon, ShieldIcon } from './chatIcons'

type Filter = 'all' | 'photos' | 'documents'

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'photos', label: 'Photos' },
  { key: 'documents', label: 'Documents' },
]

/** 51200 -> "50 KB". */
function formatSize(bytes?: number): string {
  if (typeof bytes !== 'number' || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function matchesFilter(file: ChatEvidenceFile, filter: Filter): boolean {
  if (filter === 'all') return true
  return evidenceGroupKey(file) === filter
}

type Props = {
  /** The pinned claim's real files (GET /api/claims/:id). */
  files: ChatEvidenceFile[]
  loading: boolean
  error: string | null
  /** File id highlighted after it was opened. */
  highlightedId: string | null
  /** Slide-over open state; closed by default. */
  open: boolean
  onOpenFile: (fileId: string) => void
  onClose: () => void
}

/**
 * Evidence drawer — a slide-over panel over the chat (see chat.css): a filter
 * and the pinned claim's real evidence files. Hidden off-canvas until opened
 * from the tabs bar or by a citation.
 */
export function EvidenceDrawer({
  files,
  loading,
  error,
  highlightedId,
  open,
  onOpenFile,
  onClose,
}: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const tiles = files.filter((file) => matchesFilter(file, filter))

  /* Escape closes the slide-over; the page also listens so the preview branch
     gets the same treatment. */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const body = () => {
    if (loading) return <p className="chat-evidence__empty">Loading evidence…</p>
    if (error) return <p className="chat-evidence__empty">{error}</p>
    if (!files.length) {
      return <p className="chat-evidence__empty">No evidence has been uploaded for this claim.</p>
    }
    if (tiles.length === 0) return <p className="chat-evidence__empty">No evidence in this group.</p>
    return (
      <ul className="chat-evidence__grid">
        {tiles.map((file) => (
          <li key={file.id}>
            <button
              type="button"
              className={cx('chat-evidence__tile', highlightedId === file.id && 'is-highlighted')}
              onClick={() => onOpenFile(file.id)}
              aria-label={`Open ${file.name}`}
            >
              <span className="chat-evidence__visual" aria-hidden="true">
                {evidenceGroupKey(file) === 'photos' ? <FileIcon size={22} /> : <ShieldIcon size={22} />}
              </span>
              <span className="chat-evidence__name">{file.name}</span>
              <span className="chat-evidence__meta">
                {evidenceGroupKey(file) === 'photos' ? 'Photo' : 'Document'}
                {formatSize(file.sizeBytes) ? ` · ${formatSize(file.sizeBytes)}` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <aside
      className={cx('chat-evidence', open && 'chat-evidence--open')}
      aria-label="Evidence"
    >
      <div className="chat-evidence__head">
        <h2 className="chat-evidence__title">Evidence</h2>
        <span className="chat-evidence__count">{files.length}</span>
        <button
          type="button"
          className="chat-evidence__close"
          aria-label="Close evidence panel"
          onClick={onClose}
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="chat-evidence__filters" role="tablist" aria-label="Evidence filter">
        {FILTERS.map((option) => (
          <button
            key={option.key}
            type="button"
            role="tab"
            aria-selected={filter === option.key}
            className={cx('chat-evidence__filter', filter === option.key && 'is-active')}
            onClick={() => setFilter(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {body()}

      <p className="chat-evidence__callout">
        <strong>Human-in-the-loop.</strong> Final claim decisions remain with an authorized
        reviewer.
      </p>
    </aside>
  )
}
