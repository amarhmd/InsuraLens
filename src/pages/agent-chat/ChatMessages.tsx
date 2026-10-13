import { useState } from 'react'
import { cx } from '../../lib/cx'
import type { ChatMessage, FlagLabel, PointLabel, Section } from '../../lib/chatData'
import { ChatAvatar } from './ChatAvatar'
import { EvidenceChip, EvidenceChipRow } from './EvidenceChip'
import { FindingCard } from './FindingCard'
import { InvestigationActivity } from './InvestigationActivity'
import { MessageActions, type Feedback } from './MessageActions'
import { InfoIcon } from './chatIcons'
import { buildReport } from './reportModel'

/* -------------------------------------------------------------------------- */
/* Message text (for the copy action)                                         */
/* -------------------------------------------------------------------------- */

function plainText(message: ChatMessage): string {
  const lines: string[] = []
  for (const section of message.sections ?? []) {
    switch (section.kind) {
      case 'heading':
        lines.push(`\n${section.text}`)
        break
      case 'paragraph':
        lines.push(section.text)
        break
      case 'bullets':
      case 'numbered':
        section.items.forEach((item) => lines.push(`- ${item}`))
        break
      case 'point':
        lines.push(`${section.label}: ${section.text}`)
        break
      case 'reminder':
        lines.push(section.text)
        break
      default:
        break
    }
  }
  return lines.join('\n').trim()
}

/* -------------------------------------------------------------------------- */
/* Assistant response card                                                    */
/* -------------------------------------------------------------------------- */

const BANNER_TEXT =
  'Preliminary points, not a claim decision. A human reviewer decides.'

function AssistantReport({
  sections,
  activity,
  onOpenSource,
}: {
  sections: Section[]
  activity?: ChatMessage['activity']
  onOpenSource: (sourceId: string) => void
}) {
  const report = buildReport(sections)
  const { findings, nextSteps, extras } = report

  return (
    <div className="chat-card">
      <p className="chat-card__banner">
        <InfoIcon size={15} />
        <span>{BANNER_TEXT}</span>
      </p>

      {findings.length > 0 && (
        <section className="chat-report" aria-label="Investigation summary">
          <div className="chat-report__head">
            <h3 className="chat-report__title">Investigation summary</h3>
            <span className="chat-report__count">
              {findings.length} finding{findings.length === 1 ? '' : 's'}
            </span>
          </div>

          <ul className={`chat-finding-grid chat-finding-grid--${Math.min(findings.length, 3)}`}>
            {findings.map((finding, i) => (
              <FindingCard
                key={i}
                index={i + 1}
                status={finding.status}
                text={finding.text}
                evidence={finding.evidence}
                onOpenSource={onOpenSource}
              />
            ))}
          </ul>
        </section>
      )}

      {nextSteps.length > 0 && (
        <div className="chat-next">
          <span className="chat-next__label">Next steps</span>
          <div className="chat-next__row">
            {nextSteps.map((step, i) => (
              <span key={i} className="chat-next__pill">
                {step}
              </span>
            ))}
          </div>
        </div>
      )}

      {extras.length > 0 && (
        <div className="chat-report__extra">
          {extras.map((section, i) => (
            <SectionView key={i} section={section} onOpenSource={onOpenSource} />
          ))}
        </div>
      )}

      {activity && <InvestigationActivity steps={activity} />}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Messages                                                                   */
/* -------------------------------------------------------------------------- */

export function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <article className="chat-msg chat-msg--user chat-msg--enter" aria-label="Your message">
      <div className="chat-msg__content">
        {/* Focusable so keyboard users can reveal the timestamp too. */}
        <div className="chat-msg__bubble chat-msg__bubble--user" tabIndex={0}>
          <p className="chat-msg__text">{message.text}</p>
        </div>
        <time className="chat-msg__time">{message.time}</time>
      </div>
    </article>
  )
}

type Props = {
  message: ChatMessage
  onOpenSource: (sourceId: string) => void
  onRetry: () => void
  onRegenerate: () => void
  onSaveNote: () => void
  /** Only the latest assistant reply can be regenerated. */
  canRegenerate: boolean
  isLast: boolean
}

export function AssistantMessage({
  message,
  onOpenSource,
  onRetry,
  onRegenerate,
  onSaveNote,
  canRegenerate,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [saved, setSaved] = useState(false)

  /* The orb, author line and demo tag lead every assistant turn, including the
     failed one, so the message identity never changes between states. */
  const head = (
    <div className="chat-msg__head">
      <span className="chat-msg__author">InsuraLens Assistant</span>
      <span aria-hidden="true">·</span>
      <time>{message.time}</time>
      <span
        className="chat-demo-tag"
        title="Illustrative content generated from mock records — no live AI model processed this conversation."
      >
        Demo content
      </span>
    </div>
  )

  if (message.error) {
    return (
      <article className="chat-msg chat-msg--assistant chat-msg--enter" aria-label="Assistant error">
        <ChatAvatar role="assistant" />
        <div className="chat-msg__content">
          {head}
          <div className="chat-msg__bubble chat-msg__bubble--assistant">
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
          </div>
        </div>
      </article>
    )
  }

  const handleCopy = () => {
    const text = plainText(message)
    const done = () => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done)
    } else {
      done()
    }
  }

  return (
    <article className="chat-msg chat-msg--assistant chat-msg--enter" aria-label="Assistant response">
      <ChatAvatar role="assistant" />
      <div className="chat-msg__content">
        {head}
        <AssistantReport
          sections={message.sections ?? []}
          activity={message.activity}
          onOpenSource={onOpenSource}
        />

        <div className="chat-msg__foot">
          <MessageActions
            copied={copied}
            feedback={feedback}
            saved={saved}
            canRegenerate={canRegenerate}
            onCopy={handleCopy}
            onRegenerate={onRegenerate}
            onFeedback={(value) => setFeedback((current) => (current === value ? null : value))}
            onSave={() => {
              onSaveNote()
              setSaved(true)
            }}
          />
        </div>
      </div>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/* Section rendering                                                          */
/* -------------------------------------------------------------------------- */

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

function SectionView({
  section,
  onOpenSource,
}: {
  section: Section
  onOpenSource: (sourceId: string) => void
}) {
  switch (section.kind) {
    case 'heading':
      return <h4 className="chat-report__heading">{section.text}</h4>
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
        <div className={cx('chat-point', POINT_CLASS[section.label])}>
          <span className="chat-point__label">{section.label}</span>
          <p className="chat-point__text">{section.text}</p>
          <EvidenceChip source={section.source} onOpen={onOpenSource} />
        </div>
      )
    case 'sources':
      return <EvidenceChipRow sourceIds={section.sourceIds} onOpen={onOpenSource} />
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
