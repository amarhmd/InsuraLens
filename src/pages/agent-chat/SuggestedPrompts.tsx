import { SparkIcon } from './chatIcons'

/**
 * New-conversation welcome state: a greeting and a short description. There is
 * no fixed prompt list — the reviewer types their own question, optionally
 * pinning a claim context from the composer.
 */
export function SuggestedPrompts() {
  return (
    <div className="chat-welcome">
      <div className="chat-welcome__mark" aria-hidden="true">
        <SparkIcon size={22} />
      </div>
      <h2 className="chat-welcome__title">How can I help with this investigation?</h2>
      <p className="chat-welcome__text">
        Ask about claim evidence, policy coverage, document inconsistencies, or the next steps in
        a review. Pin a claim from the “Using context” control below to ground the answer in that
        claim’s records.
      </p>
    </div>
  )
}
