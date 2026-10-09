import { useEffect, useState } from 'react'
import { AppSidebar } from '../../components/layout/AppSidebar'
import { TopHeader } from '../../components/layout/TopHeader'
import { ClaimMetrics } from './ClaimMetrics'
import { ClaimStatus } from './ClaimStatus'
import { RecentActivity } from './RecentActivity'
import { AIInsights } from './AIInsights'
import { getDashboardSummary } from '../../api/dashboard'
import type { DashboardSummary } from '../../api/dashboard'

/**
 * Landing route — the organization-wide claims overview: metrics, attention
 * items, claim status mix, priority claims and recent activity.
 *
 * All data arrives through getDashboardSummary() (src/api/dashboard.js),
 * which computes every count from the shared mock dataset, so this page can
 * never disagree with Claims or Analytics. Loading and failure states are
 * announced with role="status" and reuse the shared .page-state panel.
 */
export function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    getDashboardSummary()
      .then((data) => {
        setSummary(data)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Could not load the dashboard.')
        setLoading(false)
      })
  }

  useEffect(load, [])

  return (
    <div className="dashboard-shell">
      <AppSidebar open={menuOpen} />
      {menuOpen && (
        <div
          className="sidebar-scrim"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="main" id="main">
        <TopHeader onMenu={() => setMenuOpen((was) => !was)} showSearch={false} />

        <div className="dashboard-content">
          <p className="human-review-note">
            AI findings support reviewers. Final decisions remain with authorized reviewers.
          </p>

          {loading && (
            <div className="page-state" role="status">
              <p className="page-state__title">Loading dashboard…</p>
            </div>
          )}

          {!loading && error && (
            <div className="page-state page-state--error" role="alert">
              <p className="page-state__title">Dashboard unavailable</p>
              <p className="page-state__text">{error}</p>
              <button type="button" className="claims-btn claims-btn--primary" onClick={load}>
                Try again
              </button>
            </div>
          )}

          {!loading && !error && summary && (
            <>
              <ClaimMetrics
                open={summary.open}
                needsReview={summary.needsReview}
                inAI={summary.inAnalysis}
                awaiting={summary.awaitingDecision}
              />
              <div className="dashboard-grid">
                <ClaimStatus
                  total={summary.total}
                  stageCounts={summary.stages}
                  priorityCounts={summary.priorities}
                />
                <RecentActivity items={summary.recentActivity} />
              </div>

              <AIInsights
                damagePattern={summary.insights.damagePattern}
                missingEvidence={summary.insights.missingEvidence}
                policyReview={summary.insights.policyReview}
              />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
