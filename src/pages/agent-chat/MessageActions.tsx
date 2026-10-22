import { cx } from '../../lib/cx'
import { CheckIcon, CopyIcon, RefreshIcon, ThumbDownIcon, ThumbUpIcon } from './chatIcons'

export type Feedback = 'up' | 'down' | null

type Props = {
  copied: boolean
  feedback: Feedback
  /** Regenerate is only meaningful for the newest assistant reply. */
  canRegenerate?: boolean
  onCopy: () => void
  onRegenerate: () => void
  onFeedback: (value: 'up' | 'down') => void
}

/**
 * Response action row. Hidden until hover on pointer devices; always visible
 * on touch/narrow screens (see chat.css). Every control is a real button with
 * a text label or aria-label, so the row stays keyboard operable.
 */
export function MessageActions({
  copied,
  feedback,
  canRegenerate = true,
  onCopy,
  onRegenerate,
  onFeedback,
}: Props) {
  const up = feedback === 'up'
  const down = feedback === 'down'

  return (
    <div className="chat-actions" role="group" aria-label="Response actions">
      <button
        type="button"
        className={cx('chat-actions__btn', copied && 'chat-actions__btn--on')}
        onClick={onCopy}
        aria-label={copied ? 'Response copied' : 'Copy response'}
        title="Copy"
      >
        {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
        <span className="chat-actions__label">{copied ? 'Copied' : 'Copy'}</span>
      </button>

      <button
        type="button"
        className={cx('chat-actions__btn', !canRegenerate && 'is-disabled')}
        onClick={onRegenerate}
        disabled={!canRegenerate}
        aria-label="Regenerate response"
        title="Regenerate"
      >
        <RefreshIcon size={14} />
        <span className="chat-actions__label">Regenerate</span>
      </button>

      <span className="chat-actions__sep" aria-hidden="true" />

      <button
        type="button"
        className={cx('chat-actions__btn', 'chat-actions__btn--icon', up && 'chat-actions__btn--on')}
        onClick={() => onFeedback('up')}
        aria-label="Mark as helpful"
        aria-pressed={up}
        title="Helpful"
      >
        <ThumbUpIcon size={14} />
      </button>
      <button
        type="button"
        className={cx('chat-actions__btn', 'chat-actions__btn--icon', down && 'chat-actions__btn--on')}
        onClick={() => onFeedback('down')}
        aria-label="Mark as not helpful"
        aria-pressed={down}
        title="Not helpful"
      >
        <ThumbDownIcon size={14} />
      </button>
    </div>
  )
}
