import { useState } from 'react'
import type { ActivityStep } from '../../lib/chatData'

/**
 * Collapsible, user-facing tool activity. Shows step summaries only —
 * never hidden chain-of-thought — and is labelled illustrative because
 * no backend tools are connected in this prototype.
 */
export function InvestigationActivity({ steps }: { steps: ActivityStep[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="chat-activity">
      <button
        type="button"
        className="chat-activity__toggle"
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
          className={open ? 'chat-activity__chevron is-open' : 'chat-activity__chevron'}
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
        Investigation activity
        <span className="chat-activity__tag">Illustrative</span>
      </button>

      {open && (
        <div className="chat-activity__body">
          <ol className="chat-activity__steps">
            {steps.map((step, i) => (
              <li key={i} className="chat-activity__step">
                <span className="chat-activity__dot" aria-hidden="true" />
                {step.text}
              </li>
            ))}
          </ol>
          <p className="chat-activity__note">
            Illustrative tool activity — no live tools are connected to this prototype.
          </p>
        </div>
      )}
    </div>
  )
}
