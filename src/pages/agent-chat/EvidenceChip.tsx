import type { SourceRef } from '../../lib/chatData'
import { FileIcon } from './chatIcons'

type Props = {
  source: SourceRef
  onOpen: (sourceId: string) => void
}

/**
 * Inline evidence citation. The chip text always names the source, so the
 * reference never relies on colour alone. Clicking highlights/open the
 * matching item in the Claim context panel.
 */
export function EvidenceChip({ source, onOpen }: Props) {
  const sourceId = source.sourceId

  if (!sourceId) {
    return (
      <span className="chat-cite chat-cite--none">
        <FileIcon size={12} />
        No linked source available
      </span>
    )
  }

  return (
    <button
      type="button"
      className="chat-cite"
      onClick={() => onOpen(sourceId)}
      aria-label={`Open evidence source: ${source.label}`}
    >
      <FileIcon size={12} />
      <span className="chat-cite__label">{source.label}</span>
    </button>
  )
}

/** Row of evidence chips under an assistant answer. */
export function EvidenceChipRow({
  sourceIds,
  onOpen,
}: {
  sourceIds: string[]
  onOpen: (sourceId: string) => void
}) {
  return (
    <div className="chat-sources">
      <span className="chat-sources__label">Evidence reviewed</span>
      <div className="chat-sources__row">
        {sourceIds.map((id, i) => (
          <button
            key={`${id}-${i}`}
            type="button"
            className="chat-source-chip"
            onClick={() => onOpen(id)}
            aria-label={`Open evidence source: ${id}`}
          >
            <FileIcon size={13} />
            {id}
          </button>
        ))}
      </div>
    </div>
  )
}
