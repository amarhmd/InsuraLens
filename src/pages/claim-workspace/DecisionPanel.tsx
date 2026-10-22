type DecisionPanelProps = {
  /** Every damage area has been confirmed or dismissed. */
  complete: boolean
  /** An action is in flight — disable the controls. */
  busy?: boolean
  /** "AI suggests: <recommendation>" line — rendered only when an analysis
      result exists. It is a hint and triggers nothing by itself. */
  suggestion?: string | null
  /** Why Approve is unavailable right now (null = it is allowed). Derived by
      the page from the existing rules, so this panel can never contradict
      the rest of the claim workspace. */
  approveBlockedReason?: string | null
  onApprove?: () => void
  onRequestInfo?: () => void
}

/**
 * "Reviewer decision" — the dark panel that keeps the human in the loop.
 *
 * The Approve button is gated only in the UI: this is a presentation-layer
 * guard, not enforcement. The server MUST re-validate that every damage area
 * is reviewed before it accepts an approval. The AI's suggestion never
 * approves, confirms or dismisses anything on its own.
 */
export function DecisionPanel({
  complete,
  busy = false,
  suggestion = null,
  approveBlockedReason = null,
  onApprove,
  onRequestInfo,
}: DecisionPanelProps) {
  return (
    <section className="cw-decision" aria-labelledby="cw-decision-title">
      <h2 className="cw-decision__title" id="cw-decision-title">
        Reviewer decision
      </h2>
      <p className="cw-decision__text">
        Final claim decisions always remain with an authorized reviewer.
      </p>
      {suggestion && <p className="cw-decision__hint">AI suggests: {suggestion}</p>}

      <div className="cw-decision__actions">
        <button
          type="button"
          className="cw-btn cw-btn--primary cw-btn--block"
          aria-disabled={!complete || Boolean(approveBlockedReason) || busy}
          aria-describedby={approveBlockedReason ? 'cw-approve-reason' : undefined}
          disabled={busy}
          onClick={(event) => {
            if (!complete || approveBlockedReason) {
              event.preventDefault()
              return
            }
            onApprove?.()
          }}
        >
          Approve claim
        </button>
        {approveBlockedReason && (
          <p className="cw-decision__helper" id="cw-approve-reason">
            {approveBlockedReason}
          </p>
        )}
        <button
          type="button"
          className="cw-btn cw-btn--light cw-btn--block"
          onClick={onRequestInfo}
          disabled={busy}
        >
          Request more information
        </button>
        <button type="button" className="cw-btn cw-btn--ghost cw-btn--block">
          Escalate
        </button>
      </div>
    </section>
  )
}
