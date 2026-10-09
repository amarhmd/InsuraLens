import type { SourceRef } from '../../lib/chatData'

type Props = {
  source: SourceRef
  onOpen: (sourceId: string) => void
}

/**
 * Inline evidence citation. Chip text carries the reference — colour alone
 * never identifies a citation. Sample references are labelled as demo.
 */
export function SourceCitation({ source, onOpen }: Props) {
  const sourceId = source.sourceId
  if (!sourceId) {
    return (
      <span className="chat-cite chat-cite--none">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16.2v.3" />
        </svg>
        No linked source available
      </span>
    )
  }

  return (
    <button
      type="button"
      className="chat-cite"
      onClick={() => onOpen(sourceId)}
      aria-label={`Open evidence source: ${source.label} (demo reference)`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7.5L14 3.5Z" />
        <path d="M13.75 3.7V8h4.1" />
      </svg>
      <span className="chat-cite__label">{source.label}</span>
      <span className="chat-cite__tag">demo ref</span>
    </button>
  )
}

/** Row of source chips under an assistant answer. */
export function SourceChips({
  sourceIds,
  onOpen,
}: {
  sourceIds: string[]
  onOpen: (sourceId: string) => void
}) {
  return (
    <div className="chat-sources">
      <span className="chat-sources__label">Sources</span>
      <div className="chat-sources__row">
        {sourceIds.map((id, i) => (
          <button key={`${id}-${i}`} type="button" className="chat-source-chip" onClick={() => onOpen(id)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7.5L14 3.5Z" />
              <path d="M13.75 3.7V8h4.1" />
            </svg>
            {chipLabel(id)}
          </button>
        ))}
      </div>
    </div>
  )
}

const LABELS: Record<string, string> = {
  'accident-report': 'Accident Report',
  'vehicle-photos': 'Vehicle Photos',
  'customer-statement': 'Customer Statement',
  'policy-documents': 'Policy Document',
}

function chipLabel(id: string): string {
  return LABELS[id] ?? id
}
