import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { cx } from '../../lib/cx'
import { PaperclipIcon, SendIcon, SparkIcon } from './chatIcons'
import { SUGGESTIONS } from '../../lib/chatData'

type ClaimOption = { id: string; label: string }

type Props = {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onAttach: () => void
  onPickSuggestion: (text: string) => void
  sending: boolean
  /** The claim pinned to the active conversation, or null in general mode. */
  claimId: string | null
  claimOptions: ClaimOption[]
  onClaimChange: (claimId: string) => void
}

/**
 * Bottom composer. Enter sends, Shift + Enter inserts a newline, sending is
 * disabled while the input is empty or a reply is pending. Suggested prompts
 * live behind the sparkle button; the "Using context" chip is a button that
 * opens the claim picker. A one-line AI disclaimer sits underneath.
 */
export function MessageComposer({
  value,
  onChange,
  onSend,
  onAttach,
  onPickSuggestion,
  sending,
  claimId,
  claimOptions,
  onClaimChange,
}: Props) {
  const suggestRef = useRef<HTMLDivElement>(null)
  const [suggestOpen, setSuggestOpen] = useState(false)

  const ctxRef = useRef<HTMLDivElement>(null)
  const ctxBtnRef = useRef<HTMLButtonElement>(null)
  const ctxMenuRef = useRef<HTMLDivElement>(null)
  const [ctxOpen, setCtxOpen] = useState(false)

  const resize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!sending && value.trim()) onSend()
    }
  }

  /* Close the suggestions popover on Escape or an outside click. */
  useEffect(() => {
    if (!suggestOpen) return
    const onDown = (e: MouseEvent) => {
      if (!suggestRef.current?.contains(e.target as Node)) setSuggestOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSuggestOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [suggestOpen])

  /* Claim picker: close on Escape (returning focus) or an outside click. */
  useEffect(() => {
    if (!ctxOpen) return
    const onDown = (e: MouseEvent) => {
      if (!ctxRef.current?.contains(e.target as Node)) setCtxOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCtxOpen(false)
        ctxBtnRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [ctxOpen])

  /* Move focus into the picker (the checked option) when it opens. */
  useEffect(() => {
    if (!ctxOpen) return
    const menu = ctxMenuRef.current
    if (!menu) return
    const target = menu.querySelector<HTMLButtonElement>('.is-active') ?? menu.querySelector('button')
    target?.focus()
  }, [ctxOpen])

  const onMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      ctxMenuRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [],
    )
    if (items.length === 0) return
    const current = items.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(current + 1 + items.length) % items.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(current - 1 + items.length) % items.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      items[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      items[items.length - 1]?.focus()
    }
  }

  const selectClaim = (id: string) => {
    onClaimChange(id)
    setCtxOpen(false)
    ctxBtnRef.current?.focus()
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
          <PaperclipIcon size={17} />
        </button>

        <div className="composer__suggest-wrap" ref={suggestRef}>
          <button
            type="button"
            className={cx('composer__spark', suggestOpen && 'is-open')}
            aria-label="Suggested questions"
            aria-haspopup="dialog"
            aria-expanded={suggestOpen}
            title="Suggested questions"
            onClick={() => setSuggestOpen((was) => !was)}
          >
            <SparkIcon size={17} />
          </button>

          {suggestOpen && (
            <div
              className="composer__suggest"
              role="dialog"
              aria-label="Suggested questions"
            >
              <span className="composer__suggest-label">Suggested questions</span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="composer__suggest-item"
                  onClick={() => {
                    onPickSuggestion(s.text)
                    setSuggestOpen(false)
                  }}
                >
                  {s.text}
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="sr-only" htmlFor="composer-input">
          Message the InsuraLens assistant
        </label>
        <textarea
          id="composer-input"
          className="composer__input"
          rows={1}
          placeholder="Ask a question about this claim…"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            resize(e.target)
          }}
          onKeyDown={handleKeyDown}
        />

        <div className="composer__ctx-wrap" ref={ctxRef}>
          <button
            ref={ctxBtnRef}
            type="button"
            className={cx(
              'composer__ctx',
              !claimId && 'composer__ctx--muted',
              ctxOpen && 'is-open',
            )}
            aria-haspopup="menu"
            aria-expanded={ctxOpen}
            title="Change claim context"
            onClick={() => setCtxOpen((was) => !was)}
          >
            {claimId ? `Using context: ${claimId}` : 'Using context: general assistant'}
          </button>

          {ctxOpen && (
            <div
              ref={ctxMenuRef}
              className="composer__ctx-menu"
              role="menu"
              aria-label="Claim context"
              onKeyDown={onMenuKeyDown}
            >
              <button
                type="button"
                role="menuitemradio"
                aria-checked={!claimId}
                className={cx('composer__ctx-item', !claimId && 'is-active')}
                onClick={() => selectClaim('')}
              >
                General assistant
              </button>
              {claimOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={claimId === option.id}
                  className={cx('composer__ctx-item', claimId === option.id && 'is-active')}
                  title={option.label}
                  onClick={() => selectClaim(option.id)}
                >
                  {option.id}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className={canSend ? 'composer__send is-ready' : 'composer__send'}
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

      <p className="composer__disclaimer">
        AI helps connect and explain evidence. Humans remain responsible for the final decision.
      </p>
    </div>
  )
}
