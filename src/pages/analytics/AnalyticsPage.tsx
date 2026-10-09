import { useEffect, useRef, useState } from 'react'
import { AppSidebar } from '../../components/layout/AppSidebar'
import { TopHeader } from '../../components/layout/TopHeader'
import { AnalyticsHeader } from './AnalyticsHeader'
import { AnalyticsFilters } from './AnalyticsFilters'
import { AnalyticsKPIs } from './AnalyticsKPIs'
import { AnalyticsEmptyState, AnalyticsSkeleton } from './AnalyticsStates'
import { ClaimsVolumeChart } from './ClaimsVolumeChart'
import { WorkflowDistributionChart } from './WorkflowDistributionChart'
import { EvidenceCompletenessChart } from './EvidenceCompletenessChart'
import { IncidentTypeChart } from './IncidentTypeChart'
import { AIAnalysisMetrics } from './AIAnalysisMetrics'
import { WorkflowPerformance } from './WorkflowPerformance'
import { PriorityClaimsTable } from './PriorityClaimsTable'
import {
  DEFAULT_FILTERS,
  type AnalyticsFilters as FilterState,
  type AnalyticsSelection,
  type DistributionRow,
} from '../../lib/analyticsData'
import { getAnalytics } from '../../api/analytics'
import type { Claim } from '../../lib/claimsData'
import { navigate, type ClaimsQuery } from '../../lib/router'

const LOADING_MS = 450

/**
 * #/analytics — one shared selection feeding every card, chart, and table.
 * The three filters narrow the claim list first; the selection returned by
 * getAnalytics() (src/api/analytics.js) then drives every panel, so no two
 * panels on the page can disagree about what is on screen.
 *
 * First paint holds the skeleton for at least 450 ms; filter changes
 * refresh silently (~150 ms) and a stale-response guard drops answers from
 * superseded selections. Failures surface as a retryable error panel.
 *
 * Rows stretch to equal height, and every row carries a 24px gap above and
 * below: KPIs → volume + stage mix → evidence + incident + workflow
 * performance → AI analysis → attention table → one muted footer line with
 * the demo/AI framing, in place of the disclaimer banners this page used to
 * repeat.
 */
export function AnalyticsPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [selection, setSelection] = useState<AnalyticsSelection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  /* Only the newest request may land — rapid filter changes must not let an
     older answer overwrite a newer one. */
  const requestSeq = useRef(0)
  const firstLoad = useRef(true)

  useEffect(() => {
    const id = ++requestSeq.current
    const startedAt = Date.now()
    let holdTimer: number | undefined

    getAnalytics(filters)
      .then((data) => {
        if (id !== requestSeq.current) return
        /* First paint holds the skeleton for the full demo loading state;
           later refreshes land silently behind the data already on screen. */
        const hold = firstLoad.current
          ? Math.max(0, LOADING_MS - (Date.now() - startedAt))
          : 0
        holdTimer = window.setTimeout(() => {
          if (id !== requestSeq.current) return
          firstLoad.current = false
          setSelection(data)
          setError(null)
          setLoading(false)
        }, hold)
      })
      .catch((cause: unknown) => {
        if (id !== requestSeq.current) return
        setError(cause instanceof Error ? cause.message : 'Could not load analytics.')
        setLoading(false)
      })

    return () => {
      if (holdTimer !== undefined) window.clearTimeout(holdTimer)
    }
  }, [filters, reloadTick])

  const retry = () => {
    setError(null)
    setLoading(true)
    setReloadTick((n) => n + 1)
  }

  const gotoClaims = (query?: ClaimsQuery) =>
    navigate(query ? { name: 'claims', query } : { name: 'claims' })

  const openStage = (row: DistributionRow) => gotoClaims({ tab: row.key })
  const openIncident = (row: DistributionRow) => gotoClaims({ incident: row.key })
  const openAffected = () => gotoClaims({ evidence: 'Incomplete' })
  const openClaim = (claim: Claim) => navigate({ name: 'claim', id: claim.id })

  return (
    <div className="dashboard-shell">
      <AppSidebar open={menuOpen} active="analytics" />
      {menuOpen && (
        <div
          className="sidebar-scrim"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="main" id="main">
        <TopHeader
          onMenu={() => setMenuOpen((was) => !was)}
          breadcrumb="Workspace / Analytics"
          title="Claims Analytics"
          subtitle="Understand claims trends, workflow performance, and evidence review activity."
          showSearch={false}
        />

        <div className="dashboard-content analytics-page">
          <AnalyticsFilters
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
            count={selection?.claims.length ?? 0}
            statusText={selection?.statusText ?? 'Loading analytics data…'}
          >
            <AnalyticsHeader />
          </AnalyticsFilters>

          {loading ? (
            <AnalyticsSkeleton />
          ) : error ? (
            <div className="page-state page-state--error" role="alert">
              <p className="page-state__title">Analytics unavailable</p>
              <p className="page-state__text">{error}</p>
              <button type="button" className="claims-btn claims-btn--primary" onClick={retry}>
                Try again
              </button>
            </div>
          ) : selection?.empty ? (
            <AnalyticsEmptyState onReset={() => setFilters(DEFAULT_FILTERS)} />
          ) : selection ? (
            <>
              <AnalyticsKPIs kpis={selection.kpis} />

              <div className="ax-grid ax-grid--split">
                <ClaimsVolumeChart series={selection.volume} />
                <WorkflowDistributionChart rows={selection.workflow} onSelect={openStage} />
              </div>

              {/* One row, equal heights: the incident and workflow cards fill
                  what used to be empty space beside Evidence completeness. */}
              <div className="ax-grid ax-grid--thirds">
                <EvidenceCompletenessChart
                  evidence={selection.evidence}
                  onViewAffected={openAffected}
                />
                <IncidentTypeChart rows={selection.incidents} onSelect={openIncident} />
                <WorkflowPerformance />
              </div>

              <div className="ax-grid">
                <AIAnalysisMetrics ai={selection.ai} />
              </div>

              <PriorityClaimsTable
                rows={selection.attention}
                onOpen={openClaim}
                onViewAll={() => gotoClaims()}
              />
            </>
          ) : null}

          <p className="ax-footer">
            Demo data. Durations are illustrative. AI findings support reviewers; final
            decisions remain with authorized reviewers.
          </p>
        </div>
      </main>
    </div>
  )
}
