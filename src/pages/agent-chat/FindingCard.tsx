import type { SourceRef } from '../../lib/chatData'
import { EvidenceChip } from './EvidenceChip'
import type { FindingStatus } from './reportModel'

const STATUS_LABEL: Record<FindingStatus, string> = {
  supported: 'Supported',
  verify: 'Needs verification',
  ai: 'AI-suggested',
}

type Props = {
  /** 1-based position in the finding grid. */
  index: number
  status: FindingStatus
  text: string
  evidence: SourceRef[]
  onOpenSource: (sourceId: string) => void
}

/**
 * One finding in the assistant card's grid: a numbered disc, a status badge,
 * the finding text, and the evidence it draws on pinned to the foot of the
 * card. Status colours: Supported = green, Needs verification = amber,
 * AI-suggested = blue (see chat.css).
 */
export function FindingCard({ index, status, text, evidence, onOpenSource }: Props) {
  return (
    <li className={`chat-finding-card chat-finding-card--${status}`}>
      <div className="chat-finding-card__head">
        <span className="chat-finding-card__num" aria-hidden="true">
          {index}
        </span>
        <span className="chat-finding-card__status">{STATUS_LABEL[status]}</span>
      </div>

      <p className="chat-finding-card__text">{text}</p>

      {evidence.length > 0 && (
        <div className="chat-finding-card__evidence">
          {evidence.map((source) => (
            <EvidenceChip
              key={source.sourceId ?? source.label}
              source={source}
              onOpen={onOpenSource}
            />
          ))}
        </div>
      )}
    </li>
  )
}
