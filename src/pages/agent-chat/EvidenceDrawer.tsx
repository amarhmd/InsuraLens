import { useEffect, useState } from 'react'
import type { ChatMessage } from '../../lib/chatData'
import { evidenceBreakdown, type EvidenceRow } from '../../lib/chatData'
import type { Claim } from '../../lib/claimsData'
import { cx } from '../../lib/cx'
import { citedSources } from './reportModel'
import { ChatIcon, CloseIcon, FileIcon, ShieldIcon } from './chatIcons'

type Filter = 'all' | 'photos' | 'documents'

type Tile = {
  sourceId: string
  name: string
  kind: 'document' | 'photos' | 'statement' | 'policy'
  unit: [singular: string, plural: string]
}

const TILES: Record<string, Tile> = {
  'accident-report': { sourceId: 'accident-report', name: 'Accident Report', kind: 'document', unit: ['file', 'files'] },
  'vehicle-photos': { sourceId: 'vehicle-photos', name: 'Vehicle Photos', kind: 'photos', unit: ['photo', 'photos'] },
  'customer-statement': { sourceId: 'customer-statement', name: 'Customer Statement', kind: 'statement', unit: ['item', 'items'] },
  'policy-documents': { sourceId: 'policy-documents', name: 'Policy Documents', kind: 'policy', unit: ['file', 'files'] },
}

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'photos', label: 'Photos' },
  { key: 'documents', label: 'Documents' },
]

function matchesFilter(tile: Tile, filter: Filter): boolean {
  if (filter === 'all') return true
  if (filter === 'photos') return tile.kind === 'photos'
  return tile.kind !== 'photos'
}

function tileIcon(tile: Tile) {
  const size = 22
  if (tile.kind === 'document') return <FileIcon size={size} />
  if (tile.kind === 'statement') return <ChatIcon size={size} />
  return <ShieldIcon size={size} />
}

type Props = {
  claim: Claim | undefined
  messages: ChatMessage[]
  /** Highlighted after a citation was opened from a message. */
  highlightedId: string | null
  /** Slide-over open state; closed by default. */
  open: boolean
  onOpenSource: (sourceId: string) => void
  onClose: () => void
}

/**
 * Evidence drawer — a slide-over panel over the chat (see chat.css): a filter, a
 * tile grid of the claim's evidence groups, and the sources cited in the active
 * chat. Hidden off-canvas until opened from the tabs bar.
 */
export function EvidenceDrawer({
  claim,
  messages,
  highlightedId,
  open,
  onOpenSource,
  onClose,
}: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const rows: EvidenceRow[] = evidenceBreakdown(claim)
  const cited = citedSources(messages)

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

  const tiles = rows
    .map((row) => ({ row, tile: TILES[row.sourceId] }))
    .filter((entry): entry is { row: EvidenceRow; tile: Tile } => Boolean(entry.tile))
    .filter((entry) => matchesFilter(entry.tile, filter))

  const citedTiles = rows
    .map((row) => ({ row, tile: TILES[row.sourceId] }))
    .filter((entry): entry is { row: EvidenceRow; tile: Tile } => Boolean(entry.tile))
    .filter((entry) => (cited[entry.row.sourceId] ?? 0) > 0)

  const total = rows.reduce((sum, row) => sum + row.count, 0)
  const unit = (tile: Tile, count: number) => (count === 1 ? tile.unit[0] : tile.unit[1])

  return (
    <aside
      className={cx('chat-evidence', open && 'chat-evidence--open')}
      aria-label="Evidence"
    >
      <div className="chat-evidence__head">
        <h2 className="chat-evidence__title">Evidence</h2>
        <span className="chat-evidence__count">{total}</span>
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

      {tiles.length === 0 ? (
        <p className="chat-evidence__empty">No evidence in this group.</p>
      ) : (
        <ul className="chat-evidence__grid">
          {tiles.map(({ row, tile }) => (
            <li key={tile.sourceId}>
              <button
                type="button"
                className={cx(
                  'chat-evidence__tile',
                  highlightedId === tile.sourceId && 'is-highlighted',
                )}
                onClick={() => onOpenSource(tile.sourceId)}
                aria-label={`Open ${tile.name} evidence (demo reference)`}
              >
                {tile.kind === 'photos' ? (
                  <span className="chat-evidence__mosaic" aria-hidden="true">
                    <span className="chat-evidence__thumb" />
                    <span className="chat-evidence__thumb" />
                    <span className="chat-evidence__thumb" />
                    <span className="chat-evidence__thumb" />
                  </span>
                ) : (
                  <span className="chat-evidence__visual" aria-hidden="true">
                    {tileIcon(tile)}
                  </span>
                )}
                <span className="chat-evidence__name">{tile.name}</span>
                <span className="chat-evidence__meta">
                  {row.count} {unit(tile, row.count)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="chat-evidence__cited">
        <h3 className="chat-evidence__label">Cited in this chat</h3>
        {citedTiles.length === 0 ? (
          <p className="chat-evidence__note">No evidence has been cited in this conversation yet.</p>
        ) : (
          <ul className="chat-evidence__cited-list">
            {citedTiles.map(({ row, tile }) => (
              <li key={tile.sourceId} className="chat-evidence__cited-row">
                <button
                  type="button"
                  className="chat-evidence__cited-link"
                  onClick={() => onOpenSource(tile.sourceId)}
                >
                  {tile.name}
                </button>
                <span className="chat-evidence__cited-count">
                  {cited[row.sourceId]} finding{cited[row.sourceId] === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="chat-evidence__callout">
        <strong>Human-in-the-loop.</strong> Final claim decisions remain with an authorized
        reviewer.
      </p>
    </aside>
  )
}
