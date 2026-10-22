import { cx } from '../../lib/cx'
import type { PolicyRow } from '../../lib/claimWorkspace'

type Props = {
  rows: PolicyRow[]
  /** Name of the customer's stored policy document, or null when none is on file. */
  documentName?: string | null
  /** Opens the read-only policy viewer. */
  onViewPolicy?: () => void
}

/** "Policy & coverage" — coverage that reads as included is marked in green. */
export function PolicyCoverage({ rows, documentName, onViewPolicy }: Props) {
  return (
    <section className="cw-card cw-section" aria-labelledby="cw-policy-title">
      <div className="cw-section__head">
        <h2 className="cw-section__title" id="cw-policy-title">
          Policy &amp; coverage
        </h2>
      </div>

      <dl className="cw-policy">
        {rows.map((row) => (
          <div className="cw-policy__row" key={row.label}>
            <dt className="cw-policy__label">{row.label}</dt>
            <dd
              className={cx('cw-policy__value', row.tone === 'success' && 'cw-policy__value--success')}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Read-only: the policy document is stored once on the customer's
          contract and is never uploaded per claim. */}
      {documentName && (
        <div className="cw-policy__doc">
          <div className="cw-policy__doc-head">
            <span className="cw-policy__doc-title">Policy on file</span>
            {onViewPolicy && (
              <button type="button" className="cw-policy__doc-link" onClick={onViewPolicy}>
                View policy
              </button>
            )}
          </div>
          <span className="cw-policy__doc-name">{documentName}</span>
        </div>
      )}
    </section>
  )
}
