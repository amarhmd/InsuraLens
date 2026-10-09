export function AIInsights({
  damagePattern,
  missingEvidence,
  policyReview,
}: {
  damagePattern: number
  missingEvidence: number
  policyReview: number
}) {
  /* Counts arrive from getDashboardSummary() (src/api/dashboard.js), which
     derives them from the same shared demo dataset the Dashboard KPIs and
     the Analytics page read — no card here can quote a number those pages
     disagree with. Each predicate is stated in the card's description. */
  const insights = [
    {
      key: 'damage',
      title: 'Repeated damage pattern',
      count: String(damagePattern),
      countLabel: 'claims',
      desc: 'High-priority rear-end collisions sharing a similar impact profile.',
      icon: <PatternIcon />,
    },
    {
      key: 'missing',
      title: 'Missing evidence',
      count: String(missingEvidence),
      countLabel: 'claims',
      desc: 'Accident reports are missing or incomplete.',
      icon: <DocAlertIcon />,
    },
    {
      key: 'policy',
      title: 'Policy review',
      count: String(policyReview),
      countLabel: 'claims',
      desc: 'Evidence on file with a policy match needing reviewer verification.',
      icon: <ShieldIcon />,
    },
  ]

  return (
    <section className="section ai-insights">
      <div className="section__header">
        <h2 className="section__title">AI-assisted insights</h2>
        <p className="section__subtitle">
          Patterns identified across recently reviewed evidence.
        </p>
      </div>
      <div className="ai-insights__grid">
        {insights.map((insight) => (
          <div key={insight.key} className="panel ai-insights__card">
            <div className="ai-insights__icon" aria-hidden="true">
              {insight.icon}
            </div>
            <div className="ai-insights__count">{insight.count}</div>
            <div className="ai-insights__count-label">{insight.countLabel}</div>
            <h3 className="ai-insights__title">{insight.title}</h3>
            <p className="ai-insights__desc">{insight.desc}</p>
            <a
              className="ai-insights__link"
              href="#/dashboard"
              onClick={(e) => e.preventDefault()}
            >
              View claims →
            </a>
          </div>
        ))}
      </div>
    </section>
  )
}

function PatternIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M18 6a9 9 0 0 1-9 9" />
    </svg>
  )
}

function DocAlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M12 11v3M12 17h.01" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12h6" />
    </svg>
  )
}
