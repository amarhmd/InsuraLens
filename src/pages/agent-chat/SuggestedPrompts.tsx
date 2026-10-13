import { SUGGESTIONS } from '../../lib/chatData'
import { SuggestionCard } from './SuggestionCard'
import { SparkIcon } from './chatIcons'

/**
 * New-conversation welcome state: greeting, a short description, and the
 * suggested prompts as large cards. Suggestions submit immediately on click.
 */
export function SuggestedPrompts({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="chat-welcome">
      <div className="chat-welcome__mark" aria-hidden="true">
        <SparkIcon size={22} />
      </div>
      <h2 className="chat-welcome__title">How can I help with this investigation?</h2>
      <p className="chat-welcome__text">
        Ask about claim evidence, policy coverage, document inconsistencies, or the next steps in
        a review. Every answer stays grounded in the selected claim’s demo records.
      </p>

      <div className="chat-welcome__grid">
        {SUGGESTIONS.map((s) => (
          <SuggestionCard key={s.id} id={s.id} text={s.text} onPick={onPick} />
        ))}
      </div>

      <p className="chat-welcome__note">
        Prototype: responses are illustrative mock content, not live AI analysis.
      </p>
    </div>
  )
}
