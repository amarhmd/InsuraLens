/**
 * "Analyzing evidence…" state shown while a reply is pending. The three dots
 * and the staged step list are decorative motion; the live label carries the
 * meaning for assistive tech. The steps are UI copy, not data.
 */
const STEPS = ['Reading accident report', 'Comparing vehicle photos', 'Checking policy coverage']

export function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="chat-typing" role="status" aria-live="polite">
      <div className="chat-typing__head">
        <span className="chat-typing__dots" aria-hidden="true">
          <span className="chat-typing__dot" />
          <span className="chat-typing__dot" />
          <span className="chat-typing__dot" />
        </span>
        <span className="chat-typing__label">{label}</span>
      </div>
      <ul className="chat-typing__steps" aria-hidden="true">
        {STEPS.map((step, i) => (
          <li key={step} className="chat-typing__step" style={{ animationDelay: `${i * 0.4}s` }}>
            {step}
          </li>
        ))}
      </ul>
      <span className="chat-typing__shimmer" aria-hidden="true" />
    </div>
  )
}
