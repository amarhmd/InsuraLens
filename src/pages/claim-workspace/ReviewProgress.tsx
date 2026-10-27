import { cx } from '../../lib/cx'

type ReviewProgressProps = {
  total: number
  confirmed: number
  dismissed: number
  complete: boolean
}

/**
 * Everything here is derived from the damage statuses the page owns — the
 * counter, the bar width, and the hint all follow from `confirmed`/`dismissed`.
 */
export function ReviewProgress({ total, confirmed, dismissed, complete }: ReviewProgressProps) {
  const reviewed = confirmed + dismissed
  const percent = total > 0 ? Math.round((reviewed / total) * 100) : 0

  return (
    <section className="cw-card cw-section" aria-labelledby="cw-progress-title">
      <div className="cw-section__head">
        <h2 className="cw-section__title" id="cw-progress-title">
          Review progress
        </h2>
        <span className="cw-progress__count" aria-hidden="true">
          {reviewed} / {total}
        </span>
      </div>

      <div
        className="cw-progress__track"
        role="progressbar"
        aria-label="Damage areas reviewed"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={reviewed}
      >
        <div className="cw-progress__bar" style={{ width: `${percent}%` }} />
      </div>

      <p className="cw-progress__line">
        Damage areas: {confirmed} confirmed, {dismissed} dismissed
      </p>
      <p className={cx('cw-progress__hint', total > 0 && complete && 'cw-progress__hint--done')}>
        {total === 0
          ? 'No damage areas to review yet. Run AI analysis or add evidence.'
          : complete
            ? 'All damage areas reviewed. Approval is now available.'
            : 'Confirm or dismiss each damage area to finish the review.'}
      </p>
    </section>
  )
}
