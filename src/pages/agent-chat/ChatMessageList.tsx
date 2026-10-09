import { useEffect, useRef, type ReactNode } from 'react'
import type { ChatMessage } from '../../lib/chatData'
import { AssistantMessage, UserMessage } from './ChatMessages'
import { SuggestedPrompts } from './SuggestedPrompts'

type Props = {
  messages: ChatMessage[]
  loading: boolean
  busyLabel: string
  onOpenSource: (sourceId: string) => void
  onRetry: () => void
  onPickSuggestion: (text: string) => void
  /** Rendered above the welcome state (e.g. prototype notice). */
  notice?: ReactNode
}

/** Scrollable conversation body. Auto-scrolls to the latest message. */
export function ChatMessageList({
  messages,
  loading,
  busyLabel,
  onOpenSource,
  onRetry,
  onPickSuggestion,
  notice,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, loading])

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
    <div className="chat-scroll" aria-live="polite">
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
            />
          ),
        )}

        {loading && (
          <article className="chat-msg chat-msg--assistant chat-msg--loading" aria-label="Assistant is responding">
            <span className="chat-assistant-mark" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3.5 13.6 9l5.4 1.6L13.6 12l-1.6 5.4L10.4 12 5 10.4 10.4 9 12 3.5Z" />
              </svg>
            </span>
            <div className="chat-msg__content">
              <div className="chat-typing" role="status">
                <span className="chat-typing__dot" />
                <span className="chat-typing__dot" />
                <span className="chat-typing__dot" />
                <span className="chat-typing__label">{busyLabel}</span>
              </div>
            </div>
          </article>
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}
