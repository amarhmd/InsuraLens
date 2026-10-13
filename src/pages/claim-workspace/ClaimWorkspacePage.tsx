import { useEffect, useMemo, useRef, useState } from 'react'
import { AppSidebar } from '../../components/layout/AppSidebar'
import { TopBar } from '../../components/layout/TopBar'
import { useAiPrefs } from '../../hooks/useAiPrefs'
import { getClaimWorkspace, type ClaimWorkspaceData, type DamageStatus } from '../../data/claim'
import { AIFindings } from './AIFindings'
import { ClaimHeader } from './ClaimHeader'
import { DamageMap } from './DamageMap'
import { DecisionPanel } from './DecisionPanel'
import { EvidenceGrid } from './EvidenceGrid'
import { PolicyCoverage } from './PolicyCoverage'
import { ReviewProgress } from './ReviewProgress'
import { SummaryStrip } from './SummaryStrip'

/**
 * Claim workspace (route #/claims/:id).
 *
 * The page owns exactly two pieces of state — which damage area is selected and
 * each area's review status. The counter, progress bar, confirmed/dismissed
 * tallies, and the Approve button's availability are all derived from those, so
 * they can never disagree.
 *
 * Chrome (sidebar, top bar) is the app's shared shell, so this page matches the
 * rest of InsuraLens; only the content area carries the workspace treatment.
 */
export function ClaimWorkspacePage({ claimId }: { claimId: string }) {
  const data = useMemo(() => getClaimWorkspace(claimId), [claimId])
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleMenu = () => setMenuOpen((was) => !was)
  const closeMenu = () => setMenuOpen(false)

  if (!data) {
    return (
      <div className="dashboard-shell">
        <AppSidebar open={menuOpen} active="claims" />
        {menuOpen && (
          <div className="sidebar-scrim" onClick={closeMenu} aria-hidden="true" />
        )}

        <main className="main" id="main">
          <TopBar onMenu={toggleMenu} breadcrumb={`Workspace / Claims / ${claimId}`} />

          <div className="cw-root">
            <div className="cw-content">
              <div className="cw-card cw-notfound">
                <h1 className="cw-notfound__title">Claim not found</h1>
                <p className="cw-muted">
                  No claim with ID <strong>{claimId}</strong> exists in this prototype&rsquo;s mock
                  dataset.
                </p>
                <a className="cw-btn cw-btn--primary" href="#/claims">
                  Back to claims
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Key on the id so switching claims resets the selection and statuses.
  return (
    <ClaimWorkspaceView
      key={data.id}
      data={data}
      menuOpen={menuOpen}
      onToggleMenu={toggleMenu}
      onCloseMenu={closeMenu}
    />
  )
}

type ClaimWorkspaceViewProps = {
  data: ClaimWorkspaceData
  menuOpen: boolean
  onToggleMenu: () => void
  onCloseMenu: () => void
}

function ClaimWorkspaceView({
  data,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
}: ClaimWorkspaceViewProps) {
  // Default selection is the third damage area (per the brief), falling back to
  // the first for claims with fewer areas. The component is keyed by claim id,
  // so both this and the status map reset whenever the route's :id changes.
  const [selectedDamageId, setSelectedDamageId] = useState(
    () => data.damage[2]?.id ?? data.damage[0]?.id ?? '',
  )
  // The Settings page's AI Review Preferences decide what AI-assisted UI shows
  // here. They never change the review requirement: Approve still waits on the
  // derived status map below.
  const aiPrefs = useAiPrefs()
  // Seed each area's review status from the claim's own data.
  const [statusMap, setStatusMap] = useState<Record<string, DamageStatus>>(() =>
    Object.fromEntries(data.damage.map((zone) => [zone.id, zone.status] as const)),
  )
  const [highlightedEvidenceId, setHighlightedEvidenceId] = useState<string | null>(null)
  const highlightTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (highlightTimer.current !== null) window.clearTimeout(highlightTimer.current)
    },
    [],
  )

  const total = data.damage.length
  const confirmed = data.damage.filter((zone) => statusMap[zone.id] === 'confirmed').length
  const dismissed = data.damage.filter((zone) => statusMap[zone.id] === 'dismissed').length
  const complete = confirmed + dismissed === total

  const setStatus = (id: string, status: DamageStatus) =>
    setStatusMap((current) => ({ ...current, [id]: status }))

  /** Point at an evidence tile when a finding chip is activated. */
  const focusEvidence = (evidenceId: string) => {
    setHighlightedEvidenceId(evidenceId)
    const node = document.getElementById(`evidence-${evidenceId}`)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    node?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' })

    if (highlightTimer.current !== null) window.clearTimeout(highlightTimer.current)
    highlightTimer.current = window.setTimeout(() => {
      setHighlightedEvidenceId((current) => (current === evidenceId ? null : current))
    }, 1600)
  }

  return (
    <div className="dashboard-shell">
      <AppSidebar open={menuOpen} active="claims" />
      {menuOpen && (
        <div className="sidebar-scrim" onClick={onCloseMenu} aria-hidden="true" />
      )}

      <main className="main" id="main">
        <TopBar onMenu={onToggleMenu} breadcrumb={`Workspace / Claims / ${data.id}`} />

        <div className="cw-root">
          <div className="cw-content">
            <ClaimHeader data={data} />
            <SummaryStrip items={data.summary} />

            <div className="cw-grid">
              <div className="cw-grid__main">
                <EvidenceGrid items={data.evidence} highlightedId={highlightedEvidenceId} />
                <DamageMap
                  damage={data.damage}
                  statusMap={statusMap}
                  selectedId={selectedDamageId}
                  evidence={data.evidence}
                  onSelect={setSelectedDamageId}
                  onConfirm={(id) => setStatus(id, 'confirmed')}
                  onDismiss={(id) => setStatus(id, 'dismissed')}
                  showDamageBoxes={aiPrefs.damageBoxes}
                  showBadges={aiPrefs.aiBadges}
                />
                <AIFindings
                  findings={data.findings}
                  evidence={data.evidence}
                  onEvidenceRef={focusEvidence}
                  showEvidenceLinks={aiPrefs.evidenceLinks}
                  showBadges={aiPrefs.aiBadges}
                />
              </div>

              <div className="cw-grid__side">
                <ReviewProgress
                  total={total}
                  confirmed={confirmed}
                  dismissed={dismissed}
                  complete={complete}
                />
                <PolicyCoverage rows={data.policy} />
                <DecisionPanel complete={complete} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
