import type { ReactNode } from 'react'
import type { AnalyticsKpis } from '../../lib/analyticsData'
import { cx } from '../../lib/cx'

type CardKey = 'received' | 'underReview' | 'evidence' | 'humanReview'

const CARDS: Array<{
  key: CardKey
  label: string
  tone: 'navy' | 'blue' | 'teal' | 'amber'
  hint: string
  icon: ReactNode
}> = [
  {
    key: 'received',
    label: 'Claims Received',
    tone: 'navy',
    hint: 'Reported in the selected period',
    icon: (
      <>
        <path d="M4 13h4l1.5 3h5L16 13h4" />
        <path d="M6 5h12l2 8v6H4v-6z" />
      </>
    ),
  },
  {
    key: 'underReview',
    label: 'Under Review',
    tone: 'blue',
    hint: 'Across active workflow stages',
    icon: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-4.5-4.5" />
      </>
    ),
  },
  {
    key: 'evidence',
    label: 'Evidence Completion',
    tone: 'teal',
    hint: 'Claims with required evidence on file',
    icon: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="m9 14 2 2 4-4" />
      </>
    ),
  },
  {
    key: 'humanReview',
    label: 'Human Review Pending',
    tone: 'amber',
    hint: 'Awaiting reviewer assessment',
    icon: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 10.5-6" />
        <path d="m15.5 18.5 1.7 1.7 3.3-3.4" />
      </>
    ),
  },
]

/**
 * Four KPIs read straight off the shared selection. Percentages are floored
 * from the demo counts (never rounded up), and the comparison line only
 * appears when the dataset actually holds a previous period to compare with —
 * there is no baseline here, there is no arrow, no colour, no implied trend.
 */
export function AnalyticsKPIs({ kpis }: { kpis: AnalyticsKpis }) {
  const valueFor = (key: CardKey): string => {
    switch (key) {
      case 'received':
        return String(kpis.received)
      case 'underReview':
        return String(kpis.underReview)
      case 'evidence':
        return `${kpis.evidenceCompletion}%`
      case 'humanReview':
        return String(kpis.humanReviewPending)
    }
  }

  const comparison =
    kpis.receivedDelta === null
      ? null
      : kpis.receivedDelta === 0
        ? 'Level with previous period'
        : `${kpis.receivedDelta > 0 ? '+' : ''}${kpis.receivedDelta} vs previous period`

  return (
    <section className="ax-kpis" aria-label="Key metrics">
      {CARDS.map((card) => (
        <article key={card.key} className={cx('metric-card', `metric-card--${card.tone}`)}>
          <span className="metric-card__icon" aria-hidden="true">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {card.icon}
            </svg>
          </span>
          <span className="metric-card__label">{card.label}</span>
          <span className="metric-card__value">{valueFor(card.key)}</span>
          <span className="ax-kpi__hint">{card.hint}</span>
          {card.key === 'received' && comparison && (
            <span className="ax-kpi__delta">{comparison}</span>
          )}
        </article>
      ))}
    </section>
  )
}
