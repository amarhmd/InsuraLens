import { useRef, type KeyboardEvent } from 'react'
import { PaperclipIcon, SendIcon } from './chatIcons'
import { SUGGESTIONS } from '../../lib/chatData'

type Props = {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onAttach: () => void
  onPickSuggestion: (text: string) => void
  sending: boolean
  /** e.g. "Using context: CLM-10482", or null in general mode. */
  contextLabel: string | null
}

/**
 * Bottom composer. Enter sends, Shift + Enter inserts a newline,
 * sending is disabled while the input is empty or a reply is pending.
 */
export function MessageComposer({
  value,
  onChange,
  onSend,
  onAttach,
  onPickSuggestion,
  sending,
  contextLabel,
}: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const resize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!sending && value.trim()) onSend()
    }
  }

  const canSend = !sending && value.trim().length > 0

  return (
    <div className="composer">
      <div className="composer__row">
        <button
          type="button"
          className="composer__attach"
          aria-label="Attach a file (demo only)"
          title="Attach a file (demo — nothing is uploaded)"
          onClick={onAttach}
          disabled={sending}
        >
          <PaperclipIcon size={16} />
        </button>

        <label className="sr-only" htmlFor="composer-input">
          Message the InsuraLens assistant
        </label>
        <textarea
          id="composer-input"
          ref={inputRef}
          className="composer__input"
          rows={1}
          placeholder="Ask a question about this claim..."
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            resize(e.target)
          }}
          onKeyDown={handleKeyDown}
        />

        <button
          type="button"
          className="composer__send"
          aria-label="Send message"
          disabled={!canSend}
          onClick={onSend}
        >
          {sending ? (
            <span className="composer__spinner" aria-hidden="true" />
          ) : (
            <SendIcon size={16} />
          )}
        </button>
      </div>

      {value.trim().length === 0 && !sending && (
        <div className="composer__suggestions">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="composer__suggestion"
              onClick={() => onPickSuggestion(s.text)}
            >
              {s.text}
            </button>
          ))}
        </div>
      )}

      <div className="composer__foot">
        <span className="composer__hint">
          Enter to send · Shift + Enter for a new line
        </span>
        {contextLabel ? (
          <span className="composer__context">{contextLabel}</span>
        ) : (
          <span className="composer__context composer__context--muted">
            Using context: general assistant
          </span>
        )}
      </div>
    </div>
  )
}
