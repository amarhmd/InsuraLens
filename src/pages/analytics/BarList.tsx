import { cx } from '../../lib/cx'
import type { DistributionRow } from '../../lib/analyticsData'

type BarListProps = {
  rows: DistributionRow[]
  /** Names the list for screen readers. */
  caption: string
  /** Makes each row a button. Omit for read-only breakdowns. */
  onSelect?: (row: DistributionRow) => void
  /** Tooltip + accessible name for each row. Required with onSelect. */
  tip?: (row: DistributionRow) => string
}

/**
 * Label · track · count + percent. The number is always written out beside
 * the bar, so the colour of the fill is never the only way to read a value.
 */
export function BarList({ rows, caption, onSelect, tip }: BarListProps) {
  return (
    <ul className="ax-bars" aria-label={caption}>
      {rows.map((row) => {
        const label = onSelect && tip ? tip(row) : undefined
        const body = (
          <>
            <span className="ax-bar__label">{row.label}</span>
            <span className="ax-bar__track">
              <span
                className={cx('ax-bar__fill', `ax-bar__fill--${row.tone}`)}
                style={{ width: `${row.count === 0 ? 0 : Math.max(row.percent, 2)}%` }}
              />
            </span>
            <span className="ax-bar__value">
              {row.count}
              <span className="ax-bar__pct">{row.percent}%</span>
            </span>
            {label && <span className="ax-bar__tip">{label}</span>}
          </>
        )

        if (onSelect) {
          return (
            <li key={row.key} className={cx('ax-bar', label && 'ax-bar--tip')}>
              <button
                type="button"
                className="ax-bar__row ax-bar__btn"
                aria-label={label}
                onClick={() => onSelect(row)}
              >
                {body}
              </button>
            </li>
          )
        }

        return (
          <li key={row.key} className="ax-bar">
            <div className="ax-bar__row">{body}</div>
          </li>
        )
      })}
    </ul>
  )
}