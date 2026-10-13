/**
 * "Reviewer decision" — the dark panel that keeps the human in the loop.
 *
 * The Approve button is gated only for the demo: this is a presentation-layer
 * guard, not enforcement. A real system MUST re-validate, server-side, that
 * every damage area is reviewed before it accepts an approval.
 */
export function DecisionPanel({ complete }: { complete: boolean }) {
  return (
    <section className="cw-decision" aria-labelledby="cw-decision-title">
      <h2 className="cw-decision__title" id="cw-decision-title">
        Reviewer decision
      </h2>
      <p className="cw-decision__text">
        Final claim decisions always remain with an authorized reviewer.
      </p>

      <div className="cw-decision__actions">
        <button
          type="button"
          className="cw-btn cw-btn--primary cw-btn--block"
          aria-disabled={!complete}
          onClick={(event) => {
            if (!complete) event.preventDefault()
          }}
        >
          Approve claim
        </button>
        <button type="button" className="cw-btn cw-btn--light cw-btn--block">
          Request more information
        </button>
        <button type="button" className="cw-btn cw-btn--ghost cw-btn--block">
          Escalate
        </button>
      </div>
    </section>
  )
}
