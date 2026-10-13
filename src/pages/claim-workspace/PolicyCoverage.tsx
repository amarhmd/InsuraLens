import { cx } from '../../lib/cx'
import type { PolicyRow } from '../../data/claim'

/** "Policy & coverage" — coverage that reads as included is marked in green. */
export function PolicyCoverage({ rows }: { rows: PolicyRow[] }) {
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
    </section>
  )
}
