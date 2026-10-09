import { useCallback, useEffect, useState } from 'react'
import type { Claim } from '../../lib/claimsData'
import { incidentLabel } from '../../lib/constants'
import { getClaim } from '../../api/claims'
import { AppSidebar } from '../../components/layout/AppSidebar'
import { TopHeader } from '../../components/layout/TopHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'

/**
 * Claim workspace — a placeholder in the current build. The full review flow
 * (evidence documents, AI findings, policy coverage, and the human review
 * checklist) arrives in the next milestone; this page confirms the deep link
 * and holds the space for it.
 *
 * The record arrives through getClaim() (src/api/claims.js) with loading,
 * not-found, and failure states — the API maps a missing claim to null.
 */
export function ClaimWorkspacePage({ claimId }: { claimId: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [claim, setClaim] = useState<Claim | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getClaim(claimId)
      .then((found) => {
        setClaim(found)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Could not load this claim.')
        setLoading(false)
      })
  }, [claimId])

  useEffect(load, [load])

  return (
    <div className="dashboard-shell">
      <AppSidebar open={menuOpen} active="claims" />
      {menuOpen && (
        <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}

      <main className="main" id="main">
        <TopHeader
          onMenu={() => setMenuOpen((was) => !was)}
          breadcrumb={`Workspace / Claims / ${claimId}`}
          title={claim ? claim.id : 'Claim workspace'}
          subtitle={
            claim
              ? `${claim.customer} — ${incidentLabel(claim.incident)}, reported ${claim.dateReported}.`
              : 'Review evidence, AI findings, and policy information.'
          }
        />

        <div className="dashboard-content claims-page">
          <section className="panel claims-workspace-panel" aria-labelledby="workspace-title">
            {loading && (
              <div className="page-state" role="status">
                <p className="page-state__title">Loading claim…</p>
              </div>
            )}

            {!loading && error && (
              <div className="page-state page-state--error" role="alert">
                <p className="page-state__title">Claim unavailable</p>
                <p className="page-state__text">{error}</p>
                <button type="button" className="claims-btn claims-btn--primary" onClick={load}>
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && !claim && (
              <>
                <h2 className="claims-workspace-title" id="workspace-title">
                  Claim not found
                </h2>
                <p className="claims-workspace-text">
                  No claim with ID <strong>{claimId}</strong> exists in this prototype&apos;s mock
                  dataset.
                </p>
                <a className="claims-btn claims-btn--primary claims-workspace-back" href="#/claims">
                  Back to claims
                </a>
              </>
            )}

            {!loading && !error && claim && (
              <>
                <div className="claims-workspace-head">
                  <span className="claims-workspace-id">{claim.id}</span>
                  <StatusBadge status={claim.status} />
                  <StatusBadge status={claim.priority} />
                </div>

                <div className="claims-workspace-meta">
                  <span>Customer: {claim.customer}</span>
                  <span>Policy: {claim.policyRef}</span>
                  <span>Evidence: {claim.evidenceItems} items</span>
                  <span>Last updated: {claim.updatedLabel}</span>
                </div>

                <h2 className="claims-workspace-title" id="workspace-title">
                  Claim workspace
                </h2>
                <p className="claims-workspace-text">
                  This workspace is a placeholder in the current build. The full review flow —
                  accident photographs, the accident report, AI-generated findings, evidence
                  relationships, policy coverage, and the human review checklist — arrives in the
                  next milestone. Final claim decisions always remain with an authorized reviewer.
                </p>

                <ul className="claims-workspace-list">
                  <li className="claims-workspace-item">Evidence &amp; documents</li>
                  <li className="claims-workspace-item">AI findings &amp; evidence relationships</li>
                  <li className="claims-workspace-item">Policy &amp; coverage details</li>
                  <li className="claims-workspace-item">Human review checklist</li>
                </ul>

                <a className="claims-btn claims-btn--primary claims-workspace-back" href="#/claims">
                  Back to claims
                </a>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
