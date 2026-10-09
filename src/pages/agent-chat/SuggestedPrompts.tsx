import { SUGGESTIONS } from '../../lib/chatData'

/**
 * Welcome state shown when a conversation has no messages.
 * Suggestions submit immediately on click.
 */
export function SuggestedPrompts({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="chat-welcome">
      <div className="chat-welcome__mark" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3.5 13.6 9l5.4 1.6L13.6 12l-1.6 5.4L10.4 12 5 10.4 10.4 9 12 3.5Z" />
          <path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
        </svg>
      </div>
      <h2 className="chat-welcome__title">What would you like to investigate?</h2>
      <p className="chat-welcome__text">
        Ask questions about claim evidence, policy coverage, document inconsistencies, or the
        next steps in a review.
      </p>

      <div className="chat-suggestions" role="list">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="listitem"
            className="chat-suggestion"
            onClick={() => onPick(s.text)}
          >
            <span className="chat-suggestion__icon" aria-hidden="true">
              {s.id === 'summarize' && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                  <path d="M8.5 6.5h11M8.5 12h11M8.5 17.5h11" />
                  <circle cx="4.7" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  <circle cx="4.7" cy="12" r="1" fill="currentColor" stroke="none" />
                  <circle cx="4.7" cy="17.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              )}
              {s.id === 'inconsistencies' && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H5.5A1.5 1.5 0 0 0 4 6.5v11A1.5 1.5 0 0 0 5.5 19H9M15 5h3.5A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5H15" />
                  <path d="M12 3.5v17M8 9l-2 2 2 2M16 15l2-2-2-2" />
                </svg>
              )}
              {s.id === 'policy' && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3.5 18.5 6v5.2c0 4-2.7 7.3-6.5 8.8-3.8-1.5-6.5-4.8-6.5-8.8V6L12 3.5Z" />
                  <path d="m9.2 11.8 2 2 3.6-3.9" />
                </svg>
              )}
              {s.id === 'missing' && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7.5L14 3.5Z" />
                  <path d="M13.75 3.7V8h4.1M12 11.5v4M10 13.5h4" />
                </svg>
              )}
            </span>
            <span className="chat-suggestion__text">{s.text}</span>
          </button>
        ))}
      </div>

      <p className="chat-welcome__note">
        Prototype: responses are illustrative mock content, not live AI analysis.
      </p>
    </div>
  )
}
