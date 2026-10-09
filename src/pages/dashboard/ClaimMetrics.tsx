const ICONS = {
  folder: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  ),
  eye: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  spark: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8" />
    </svg>
  ),
  usercheck: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="m16 11 2 2 4-4" />
    </svg>
  ),
}

/**
 * Four workload metrics. The page passes counts computed by
 * getDashboardSummary() (src/api/dashboard.js), which reads the same shared
 * dataset as Claims and Analytics — so no metric can drift from those pages.
 * Deep-link filters use the API stage/priority tokens both ends understand.
 */
export function ClaimMetrics({
  open,
  needsReview,
  inAI,
  awaiting,
}: {
  open: number
  needsReview: number
  inAI: number
  awaiting: number
}) {
  const metrics = [
    {
      key: 'open',
      label: 'Open Claims',
      value: String(open),
      trend: '+8 this week',
      trendTone: 'up' as const,
      accent: 'navy' as const,
      icon: ICONS.folder,
      filter: null,
    },
    {
      key: 'review',
      label: 'Needs Review',
      value: String(needsReview),
      trend: '6 high priority',
      trendTone: 'warn' as const,
      accent: 'amber' as const,
      icon: ICONS.eye,
      filter: 'priority=high',
    },
    {
      key: 'analysis',
      label: 'In AI Analysis',
      value: String(inAI),
      trend: 'Processing evidence',
      trendTone: 'neutral' as const,
      accent: 'teal' as const,
      icon: ICONS.spark,
      filter: 'tab=ai_analysis',
    },
    {
      key: 'awaiting',
      label: 'Awaiting Decision',
      value: String(awaiting),
      trend: 'Human review required',
      trendTone: 'info' as const,
      accent: 'blue' as const,
      icon: ICONS.usercheck,
      filter: 'tab=human_review',
    },
  ]

  return (
    <section className="section">
      <div className="metrics-grid">
        {metrics.map((m) => (
          <button
            type="button"
            key={m.key}
            className={`metric-card metric-card--${m.accent}`}
            onClick={() => {
              if (m.filter) {
                window.location.hash = `#/claims?${m.filter}`
              } else {
                window.location.hash = '#/claims'
              }
            }}
            aria-label={`${m.label}: ${m.value}. ${m.trend}`}
          >
            <div className="metric-card__icon" aria-hidden="true">
              {m.icon}
            </div>
            <div className="metric-card__label">{m.label}</div>
            <div className="metric-card__value">{m.value}</div>
            <div className={`metric-card__trend metric-card__trend--${m.trendTone}`}>{m.trend}</div>
          </button>
        ))}
      </div>
    </section>
  )
}
