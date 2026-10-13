import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ChatMessage } from '../../lib/chatData'
import { AssistantMessage, UserMessage } from './ChatMessages'
import { ChatAvatar } from './ChatAvatar'
import { SuggestedPrompts } from './SuggestedPrompts'
import { TypingIndicator } from './TypingIndicator'
import { ArrowDownIcon } from './chatIcons'

type Props = {
  messages: ChatMessage[]
  loading: boolean
  /** Brief skeleton while a conversation/claim switch settles. */
  skeleton?: boolean
  busyLabel: string
  onOpenSource: (sourceId: string) => void
  onRetry: () => void
  onRegenerate: () => void
  onSaveNote: () => void
  onPickSuggestion: (text: string) => void
  /** Rendered above the welcome state (e.g. prototype notice). */
  notice?: ReactNode
}

/**
 * Scrollable conversation body. Auto-scrolls to the latest message, but stops
 * following once the reviewer scrolls up and offers a "Jump to latest" affordance.
 */
export function ChatMessageList({
  messages,
  loading,
  skeleton,
  busyLabel,
  onOpenSource,
  onRetry,
  onRegenerate,
  onSaveNote,
  onPickSuggestion,
  notice,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(true)
  const [atBottom, setAtBottom] = useState(true)

  /* Only the newest assistant reply can be regenerated. */
  const lastAssistantId =
    [...messages].reverse().find((m) => m.role === 'assistant')?.id ?? null

  const scrollToEnd = (behavior: ScrollBehavior) => {
    endRef.current?.scrollIntoView({ block: 'end', behavior })
  }

  useEffect(() => {
    const last = messages[messages.length - 1]
    if (stickRef.current || last?.role === 'user' || loading) {
      stickRef.current = true
      scrollToEnd('smooth')
    }
  }, [messages.length, loading])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 96
    stickRef.current = near
    setAtBottom(near)
  }

  if (skeleton) {
    return (
      <div className="chat-scroll">
        <div className="chat-scroll__inner" aria-hidden="true">
          <div className="chat-skeleton chat-skeleton--user" />
          <div className="chat-skeleton chat-skeleton--ai" />
          <div className="chat-skeleton chat-skeleton--ai chat-skeleton--short" />
        </div>
      </div>
    )
  }

  if (messages.length === 0 && !loading) {
    return (
      <div className="chat-scroll">
        <div className="chat-scroll__inner">
          {notice}
          <SuggestedPrompts onPick={onPickSuggestion} />
        </div>
      </div>
    )
  }

  return (
    <div className="chat-scroll-wrap">
      <div className="chat-scroll" ref={scrollRef} onScroll={onScroll} aria-live="polite">
        <div className="chat-scroll__inner">
          {notice}
          {messages.map((message) =>
            message.role === 'user' ? (
              <UserMessage key={message.id} message={message} />
            ) : (
              <AssistantMessage
                key={message.id}
                message={message}
                onOpenSource={onOpenSource}
                onRetry={onRetry}
                onRegenerate={onRegenerate}
                onSaveNote={onSaveNote}
                canRegenerate={message.id === lastAssistantId && !loading}
                isLast={message.id === lastAssistantId}
              />
            ),
          )}

          {loading && (
            <article
              className="chat-msg chat-msg--assistant chat-msg--loading"
              aria-label="Assistant is analyzing evidence"
            >
              <ChatAvatar role="assistant" />
              <div className="chat-msg__content">
                <TypingIndicator label={busyLabel} />
              </div>
            </article>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {!atBottom && (
        <button
          type="button"
          className="chat-jump"
          onClick={() => {
            stickRef.current = true
            scrollToEnd('smooth')
          }}
        >
          <ArrowDownIcon size={14} />
          Jump to latest
        </button>
      )}
    </div>
  )
}
