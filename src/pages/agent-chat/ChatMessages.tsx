import { useState } from 'react'
import { cx } from '../../lib/cx'
import type { ChatMessage, FlagLabel, PointLabel, Section } from '../../lib/chatData'
import { ChatAvatar } from './ChatAvatar'
import { EvidenceChip, EvidenceChipRow } from './EvidenceChip'
import { FindingCard, findingTone } from './FindingCard'
import { InvestigationActivity } from './InvestigationActivity'
import { MessageActions, type Feedback } from './MessageActions'

/* -------------------------------------------------------------------------- */
/* Grouping — turns the flat Section[] into a readable report outline.         */
/* Presentational only: the underlying sections are never mutated.             */
/* -------------------------------------------------------------------------- */

type Block =
  | { kind: 'title'; text: string }
  | { kind: 'lead'; text: string }
  | { kind: 'findings'; items: string[] }
  | { kind: 'callout'; title: string; items: string[] }
  | { kind: 'section'; section: Section }

function buildBlocks(sections: Section[]): Block[] {
  const blocks: Block[] = []
  let sawLead = false

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]

    if (section.kind === 'heading') {
      const consumeItems = () => {
        const items: string[] = []
        while (
          i + 1 < sections.length &&
          (sections[i + 1].kind === 'bullets' || sections[i + 1].kind === 'numbered')
        ) {
          items.push(...(sections[i + 1] as { items: string[] }).items)
          i++
        }
        return items
      }

      if (/key findings/i.test(section.text)) {
        blocks.push({ kind: 'findings', items: consumeItems() })
        continue
      }
      if (/needs further investigation/i.test(section.text)) {
        blocks.push({ kind: 'callout', title: section.text, items: consumeItems() })
        continue
      }
      if (!blocks.some((b) => b.kind === 'title')) {
        blocks.push({ kind: 'title', text: section.text })
        continue
      }
    }

    if (section.kind === 'paragraph' && !sawLead) {
      sawLead = true
      blocks.push({ kind: 'lead', text: section.text })
      continue
    }

    blocks.push({ kind: 'section', section })
  }

  return blocks
}

function Report({ sections, onOpenSource }: { sections: Section[]; onOpenSource: (id: string) => void }) {
  const blocks = buildBlocks(sections)
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'title':
            return (
              <h3 key={i} className="chat-report__title">
                {block.text}
              </h3>
            )
          case 'lead':
            return (
              <p key={i} className="chat-report__lead">
                {block.text}
              </p>
            )
          case 'findings':
            return (
              <div key={i} className="chat-findings">
                <span className="chat-findings__label">Key findings</span>
                <ul className="chat-findings__list">
                  {block.items.map((item, j) => (
                    <FindingCard key={j} tone={findingTone(item)}>
                      {item}
                    </FindingCard>
                  ))}
                </ul>
              </div>
            )
          case 'callout':
            return (
              <div key={i} className="chat-callout">
                <p className="chat-callout__title">{block.title}</p>
                <ul className="chat-callout__list">
                  {block.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              </div>
            )
          default:
            return <SectionView key={i} section={block.section} onOpenSource={onOpenSource} />
        }
      })}
    </>
  )
}

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
/* Messages                                                                   */
/* -------------------------------------------------------------------------- */

export function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <article className="chat-msg chat-msg--user chat-msg--enter" aria-label="Your message">
      <div className="chat-msg__content">
        <div className="chat-msg__bubble chat-msg__bubble--user">
          <p className="chat-msg__text">{message.text}</p>
        </div>
        <div className="chat-msg__meta chat-msg__meta--user">
          <span>You</span>
          <span aria-hidden="true">·</span>
          <time>{message.time}</time>
        </div>
      </div>
      <ChatAvatar role="user" />
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

  if (message.error) {
    return (
      <article className="chat-msg chat-msg--assistant chat-msg--enter" aria-label="Assistant error">
        <ChatAvatar role="assistant" />
        <div className="chat-msg__content">
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
          <div className="chat-msg__meta">
            <span className="chat-msg__author">InsuraLens Assistant</span>
            <span aria-hidden="true">·</span>
            <time>{message.time}</time>
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
        <div className="chat-msg__bubble chat-msg__bubble--assistant">
          <Report sections={message.sections ?? []} onOpenSource={onOpenSource} />
          {message.activity && <InvestigationActivity steps={message.activity} />}
        </div>

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
          <div className="chat-msg__meta">
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
