import { hashFromRoute } from '../../lib/router'
import type { InsightKey } from '../../lib/insights'
import type { ReactNode } from 'react'

export function AIInsights({
  damagePattern,
  missingEvidence,
  policyReview,
}: {
  damagePattern: number | null
  missingEvidence: number | null
  policyReview: number | null
}) {
  /* Counts arrive from getDashboardSummary() (src/api/dashboard.js), which
     derives them from the live claim queue through src/lib/insights.ts — the
     same helper the #/claims insight filters use. A null count means the
     loaded data was insufficient, so the card shows "—", never a fake zero. */
  const insights: {
    key: InsightKey
    title: string
    count: number | null
    desc: string
    icon: ReactNode
  }[] = [
    {
      key: 'repeated_damage',
      title: 'Repeated damage pattern',
      count: damagePattern,
      desc: 'Claims with the same incident type and overlapping damage areas.',
      icon: <PatternIcon />,
    },
    {
      key: 'missing_evidence',
      title: 'Missing evidence',
      count: missingEvidence,
      desc: 'Claims with no accident report or document file — images only, or no files.',
      icon: <DocAlertIcon />,
    },
    {
      key: 'policy_review',
      title: 'Policy review',
      count: policyReview,
      desc: 'Coverage unable to be evaluated, a policy mismatch, or an inconsistency flag.',
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
          <a
            key={insight.key}
            className="panel ai-insights__card"
            href={hashFromRoute({ name: 'claims', query: { insight: insight.key } })}
          >
            <div className="ai-insights__icon" aria-hidden="true">
              {insight.icon}
            </div>
            <div className="ai-insights__count">
              {insight.count == null ? '—' : insight.count}
            </div>
            <div className="ai-insights__count-label">claims</div>
            <h3 className="ai-insights__title">{insight.title}</h3>
            <p className="ai-insights__desc">{insight.desc}</p>
            <span className="ai-insights__link">View claims →</span>
          </a>
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
