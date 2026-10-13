import type { SummaryItem } from '../../data/claim'

/** At-a-glance claim facts, derived from the data file. */
export function SummaryStrip({ items }: { items: SummaryItem[] }) {
  return (
    <dl className="cw-card cw-summary">
      {items.map((item) => (
        <div className="cw-summary__item" key={item.label}>
          <dt className="cw-summary__label">{item.label}</dt>
          <dd className="cw-summary__value">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
