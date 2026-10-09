import type { EvidenceSnapshot } from '../../lib/analyticsData'
import { BarList } from './chartKit'

type Props = {
  evidence: EvidenceSnapshot
  onViewAffected: () => void
}

/**
 * Four exclusive evidence buckets. The insight underneath is the point of the
 * panel: evidence that is absent (documents or customer information never
 * arrived) is a different problem from evidence that is present but not yet
 * conclusive (policy match needs a reviewer).
 */
export function EvidenceCompletenessChart({ evidence, onViewAffected }: Props) {
  return (
    <section className="panel ax-panel" aria-labelledby="ax-evidence-title">
      <div className="ax-panel__head">
        <h2 className="ax-panel__title" id="ax-evidence-title">
          Evidence completeness
        </h2>
      </div>

      <BarList rows={evidence.rows} caption="Evidence completeness by category" />

      <div className="ax-insight">
        <span className="ax-insight__icon" aria-hidden="true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11.2v5" />
            <path d="M12 7.9h.01" />
          </svg>
        </span>
        <div className="ax-insight__body">
          <p className="ax-insight__title">
            Missing evidence and inconclusive evidence are separate problems
          </p>
          <p className="ax-insight__text">{evidence.insight}</p>
        </div>
      </div>

      <button type="button" className="claims-btn ax-cta" onClick={onViewAffected}>
        View affected claims
      </button>
      <p className="ax-footnote">
        Opens the Claims page filtered to Incomplete evidence — the claims with documents or
        customer information still outstanding.
      </p>
    </section>
  )
}
