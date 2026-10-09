import { cx } from '../../lib/cx'

/**
 * Legend for multi-series charts — one labelled swatch per tone, with an
 * optional dashed style for secondary series.
 */
export function ChartLegend({
  items,
}: {
  items: Array<{ label: string; tone: string; dashed?: boolean }>
}) {
  return (
    <ul className="ax-legend">
      {items.map((item) => (
        <li key={item.label} className="ax-legend__item">
          <span
            className={cx(
              'ax-legend__swatch',
              `ax-legend__swatch--${item.tone}`,
              item.dashed && 'ax-legend__swatch--dashed',
            )}
            aria-hidden="true"
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}