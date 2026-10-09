import { useEffect, useRef, useState } from 'react'
import { navigate } from '../../lib/router'
import { PRIORITIES, STAGES, priorityLabel, stageLabel } from '../../lib/constants'

/**
 * The claim-mix panel. Counts arrive from getDashboardSummary()
 * (src/api/dashboard.js) — the same shared dataset the rest of the app
 * reads — and are split by stage or priority tab. Bar keys are the API
 * tokens, so the "By stage" rows deep-link into #/claims with the token
 * query values the Claims page validates.
 */
export function ClaimStatus({
  total,
  stageCounts,
  priorityCounts,
}: {
  total: number
  stageCounts: Record<string, number>
  priorityCounts: Record<string, number>
}) {
  const [tab, setTab] = useState<'stage' | 'priority'>('stage')
  const tablistRef = useRef<HTMLDivElement>(null)

  const STAGE_TONE: Record<string, string> = {
    new: 'slate',
    evidence_collection: 'blue',
    ai_analysis: 'teal',
    human_review: 'amber',
    completed: 'green',
  }
  const PRIORITY_TONE: Record<string, string> = {
    high: 'critical',
    medium: 'amber',
    low: 'pending',
  }

  const stageData = STAGES.map((stage) => ({
    label: stageLabel(stage),
    count: stageCounts[stage] ?? 0,
    tone: STAGE_TONE[stage],
    key: stage,
  })).map((s) => ({ ...s, percent: total > 0 ? Math.round((s.count / total) * 100) : 0 }))

  const pTotal = PRIORITIES.reduce((sum, p) => sum + (priorityCounts[p] ?? 0), 0)

  const priorityData = PRIORITIES.map((p) => ({
    label: priorityLabel(p),
    count: priorityCounts[p] ?? 0,
    tone: PRIORITY_TONE[p],
    key: p,
  })).map((s) => ({ ...s, percent: pTotal > 0 ? Math.round((s.count / pTotal) * 100) : 0 }))

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!tablistRef.current?.contains(document.activeElement)) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        setTab((prev) => (prev === 'stage' ? 'priority' : 'stage'))
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <section className="section section--status">
      <div className="panel claim-status">
        <div className="claim-status__header">
          <h2 className="section__title">Claim status</h2>
          <div
            ref={tablistRef}
            className="claim-status__tabs"
            role="tablist"
            aria-label="Claim status view"
            aria-orientation="horizontal"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'stage'}
              className={`claim-status__tab ${tab === 'stage' ? 'claim-status__tab--active' : ''}`}
              onClick={() => setTab('stage')}
              tabIndex={tab === 'stage' ? 0 : -1}
            >
              By stage
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'priority'}
              className={`claim-status__tab ${tab === 'priority' ? 'claim-status__tab--active' : ''}`}
              onClick={() => setTab('priority')}
              tabIndex={tab === 'priority' ? 0 : -1}
            >
              By priority
            </button>
          </div>
        </div>
        <div className="claim-status__content">
          {tab === 'stage' && (
            <div className="claim-status__bars">
              {stageData.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  className="claim-status__bar-row"
                  onClick={() => navigate({ name: 'claims', query: { tab: item.key } })}
                  aria-label={`View claims in ${item.label}: ${item.count} claims, ${item.percent}%`}
                >
                  <div className="claim-status__label">{item.label}</div>
                  <div className="claim-status__bar-container">
                    <div
                      className={`claim-status__bar claim-status__bar--${item.tone}`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <div className="claim-status__value">
                    <strong>{item.count}</strong> · <span className="claim-status__pct">{item.percent}%</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          {tab === 'priority' && (
            <div className="claim-status__bars">
              {priorityData.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  className="claim-status__bar-row"
                  onClick={() => navigate({ name: 'claims' })}
                  aria-label={`View claims with ${item.label} priority: ${item.count} claims, ${item.percent}%`}
                >
                  <div className="claim-status__label">{item.label} priority</div>
                  <div className="claim-status__bar-container">
                    <div
                      className={`claim-status__bar claim-status__bar--${item.tone}`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <div className="claim-status__value">
                    <strong>{item.count}</strong> · <span className="claim-status__pct">{item.percent}%</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
