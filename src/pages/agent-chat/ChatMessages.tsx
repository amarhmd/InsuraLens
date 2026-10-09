import { useState } from 'react'
import type { ChatMessage, FlagLabel, PointLabel, Section } from '../../lib/chatData'
import { AssistantMark } from './ChatHeader'
import { InvestigationActivity } from './InvestigationActivity'
import { SourceChips, SourceCitation } from './SourceCitation'

function ExpandBlock({
  title,
  body,
  onOpenSource,
}: {
  title: string
  body: Section[]
  onOpenSource: (sourceId: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="chat-expand">
      <button
        type="button"
        className="chat-expand__toggle"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
          className={open ? 'chat-expand__chevron is-open' : 'chat-expand__chevron'}
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
        {title}
      </button>
      {open && (
        <div className="chat-expand__body">
          {body.map((section, i) => (
            <SectionView key={i} section={section} onOpenSource={onOpenSource} />
          ))}
        </div>
      )}
    </div>
  )
}

export function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <article className="chat-msg chat-msg--user" aria-label="Your message">
      <div className="chat-msg__bubble-user">
        <p className="chat-msg__text">{message.text}</p>
      </div>
      <div className="chat-msg__meta">
        <span>You</span>
        <span aria-hidden="true">·</span>
        <time>{message.time}</time>
      </div>
    </article>
  )
}

type Props = {
  message: ChatMessage
  onOpenSource: (sourceId: string) => void
  onRetry: () => void
}

export function AssistantMessage({ message, onOpenSource, onRetry }: Props) {
  if (message.error) {
    return (
      <article className="chat-msg chat-msg--assistant" aria-label="Assistant error">
        <AssistantMark />
        <div className="chat-msg__content">
          <div className="chat-msg__error" role="alert">
            <p className="chat-msg__error-text">{message.text}</p>
            <button type="button" className="chat-retry-btn" onClick={onRetry}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12a7 7 0 1 1-2.1-5" />
                <path d="M19.5 4.5V9H15" />
              </svg>
              Retry
            </button>
          </div>
          <div className="chat-msg__meta">
            <span>InsuraLens Assistant</span>
            <span aria-hidden="true">·</span>
            <time>{message.time}</time>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="chat-msg chat-msg--assistant" aria-label="Assistant response">
      <AssistantMark />
      <div className="chat-msg__content">
        <div className="chat-msg__report chat-msg__report--structured">
          {message.sections?.map((section, i) => (
            <SectionView key={i} section={section} onOpenSource={onOpenSource} />
          ))}
        </div>

        {message.activity && <InvestigationActivity steps={message.activity} />}

        <div className="chat-msg__meta">
          <span>InsuraLens Assistant</span>
          <span aria-hidden="true">·</span>
          <time>{message.time}</time>
          <span className="chat-demo-tag" title="Illustrative content generated from mock records — no live AI model processed this conversation.">
            Demo content
          </span>
        </div>
      </div>
    </article>
  )
}

const POINT_CLASS: Record<PointLabel, string> = {
  Observation: 'is-observation',
  'Supporting material': 'is-supporting',
  'AI interpretation': 'is-interpretation',
  'Review consideration': 'is-review',
}

const FLAG_TEXT: Record<FlagLabel, string> = {
  'Requires reviewer verification': 'Requires reviewer verification',
  'Insufficient evidence to conclude': 'Insufficient evidence to conclude',
  'Supporting source unavailable': 'Supporting source unavailable',
}

function SectionView({
  section,
  onOpenSource,
}: {
  section: Section
  onOpenSource: (sourceId: string) => void
}) {
  switch (section.kind) {
    case 'heading':
      return <h3 className="chat-report__heading">{section.text}</h3>
    case 'paragraph':
      return <p className="chat-report__para">{section.text}</p>
    case 'bullets':
      return (
        <ul className="chat-report__bullets">
          {section.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
    case 'numbered':
      return (
        <ol className="chat-report__numbered">
          {section.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      )
    case 'point':
      return (
        <div className={`chat-point ${POINT_CLASS[section.label]}`}>
          <span className="chat-point__label">{section.label}</span>
          <p className="chat-point__text">{section.text}</p>
          <SourceCitation source={section.source} onOpen={onOpenSource} />
        </div>
      )
    case 'sources':
      return <SourceChips sourceIds={section.sourceIds} onOpen={onOpenSource} />
    case 'flags':
      return (
        <div className="chat-flags">
          {section.items.map((flag, i) => (
            <span key={i} className="chat-flag">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 4.5 21 19.5H3L12 4.5Z" />
                <path d="M12 10v4M12 16.6v.4" />
              </svg>
              {FLAG_TEXT[flag]}
            </span>
          ))}
        </div>
      )
    case 'reminder':
      return (
        <p className="chat-reminder">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 7.8v.4" />
          </svg>
          <span>{section.text}</span>
        </p>
      )
    case 'expand':
      return <ExpandBlock title={section.title} body={section.body} onOpenSource={onOpenSource} />
    default:
      return null
  }
}
