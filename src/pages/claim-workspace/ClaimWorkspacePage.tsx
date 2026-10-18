import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AppSidebar } from '../../components/layout/AppSidebar'
import { TopBar } from '../../components/layout/TopBar'
import { useAiPrefs } from '../../hooks/useAiPrefs'
import type { ClaimWorkspaceData, DamageStatus } from '../../data/claim'
import { fetchClaimWorkspace } from '../../api/claimWorkspace'
import { analyzeClaim, openAnalysisStream, reviewClaim } from '../../api/claims'
import { uploadClaimEvidence } from '../../api/evidence'
import { USE_DEMO } from '../../api/http'
import { validateEvidenceFile } from '../claims/claimAttachments'
import { PolicyViewer } from '../../components/feedback/PolicyViewer'
import { AIFindings } from './AIFindings'
import { ClaimHeader } from './ClaimHeader'
import { DamageMap } from './DamageMap'
import { DecisionPanel } from './DecisionPanel'
import { EvidenceGrid } from './EvidenceGrid'
import { PolicyCoverage } from './PolicyCoverage'
import { ReviewProgress } from './ReviewProgress'
import { SummaryStrip } from './SummaryStrip'

type LoadState = 'loading' | 'ready' | 'notfound' | 'error'

/** Stop waiting on a silent stream after this long (ms). */
const STREAM_TIMEOUT_MS = 3 * 60 * 1000

/**
 * Claim workspace (route #/claims/:id).
 *
 * The page loads the claim from the backend (GET /api/claims/:id), maps the
 * analysis it carries into the view model, and owns the two pieces of review
 * state — which damage area is selected and each area's status. The counter,
 * progress bar, tallies, and the Approve button all derive from those, so they
 * can never disagree.
 *
 * Actions talk to the real routes: Analyze starts POST …/analyze and follows
 * GET …/stream (SSE) for live progress; Approve / Request information POST
 * …/review; evidence upload POSTs multipart …/evidence. Every action refreshes
 * the claim afterwards. Demo mode (VITE_USE_DEMO=true) reads the local dataset
 * and simulates the actions, so the prototype keeps working offline.
 */
export function ClaimWorkspacePage({ claimId }: { claimId: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleMenu = () => setMenuOpen((was) => !was)
  const closeMenu = () => setMenuOpen(false)

  const [data, setData] = useState<ClaimWorkspaceData | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [busy, setBusy] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const streamRef = useRef<EventSource | null>(null)
  const streamTimer = useRef<number | null>(null)
  const loadedIdRef = useRef<string | null>(null)

  const refresh = useCallback(() => setReloadKey((key) => key + 1), [])

  const stopStream = useCallback(() => {
    streamRef.current?.close()
    streamRef.current = null
    if (streamTimer.current !== null) {
      window.clearTimeout(streamTimer.current)
      streamTimer.current = null
    }
  }, [])

  /* Load (and reload) the claim. A reload keeps the current view on screen and
     swaps in the fresh data; only a first load or an id change shows the
     full-page loading state. */
  useEffect(() => {
    let active = true
    const firstLoad = loadedIdRef.current !== claimId
    if (firstLoad) {
      setState('loading')
      setData(null)
    }
    setLoadError(null)

    fetchClaimWorkspace(claimId)
      .then((result) => {
        if (!active) return
        loadedIdRef.current = claimId
        if (result) {
          setData(result)
          setState('ready')
        } else {
          setData(null)
          setState('notfound')
        }
      })
      .catch((cause: unknown) => {
        if (!active) return
        setLoadError(cause instanceof Error ? cause.message : 'Something went wrong loading this claim.')
        setState('error')
      })

    return () => {
      active = false
    }
  }, [claimId, reloadKey])

  /* Close any open stream / timer when the page unmounts or the id changes. */
  useEffect(() => () => stopStream(), [claimId, stopStream])

  const runAnalysis = useCallback(async () => {
    setBusy(true)
    setAnalyzing(true)
    setActionError(null)
    setStatus('Starting analysis…')
    try {
      await analyzeClaim(claimId)

      if (USE_DEMO) {
        setStatus('Demo mode — analysis simulated. No request left the browser.')
        setAnalyzing(false)
        refresh()
        return
      }

      stopStream()
      const stream = openAnalysisStream(claimId)
      streamRef.current = stream

      /* Settle once: a terminal event, a dropped connection, or the timeout
         must not race each other into repeated refreshes. */
      let settled = false
      const finish = (message: string) => {
        if (settled) return
        settled = true
        setStatus(message)
        stopStream()
        setAnalyzing(false)
        refresh()
      }

      const onEvent = (event: Event) => {
        type Frame = { agent?: string; status?: string; message?: string }
        let frame: Frame = {}
        try {
          frame = JSON.parse((event as MessageEvent).data || '{}') as Frame
        } catch {
          frame = {}
        }

        switch (event.type) {
          case 'analysis_started':
            setStatus('Analysis started…')
            break
          case 'agent_status':
            setStatus(`Agent: ${frame.agent ?? 'working'} (${frame.status ?? 'running'})`)
            break
          case 'awaiting_review':
            finish('Analysis complete — awaiting your review.')
            break
          case 'analysis_failed':
            finish(frame.message ? `Analysis failed: ${frame.message}` : 'Analysis failed.')
            break
          default:
            break
        }
      }

      for (const name of ['analysis_started', 'agent_status', 'awaiting_review', 'analysis_failed']) {
        stream.addEventListener(name, onEvent)
      }
      /* A dropped connection (or a silent end) should not leave the buttons
         disabled forever: settle and reload. */
      stream.onerror = () => finish('Analysis stream ended — reloading the claim.')
      streamTimer.current = window.setTimeout(
        () => finish('Analysis is taking longer than expected — reloading the claim.'),
        STREAM_TIMEOUT_MS,
      )
    } catch (cause) {
      setStatus(null)
      setActionError(cause instanceof Error ? cause.message : 'Could not start the analysis.')
      setAnalyzing(false)
    } finally {
      setBusy(false)
    }
  }, [claimId, refresh, stopStream])

  const submitReview = useCallback(
    async (action: 'approve' | 'request_info') => {
      setBusy(true)
      setActionError(null)
      try {
        await reviewClaim(claimId, action)
        setStatus(action === 'approve' ? 'Claim approved.' : 'More information requested.')
        refresh()
      } catch (cause) {
        setActionError(cause instanceof Error ? cause.message : 'Could not record the decision.')
      } finally {
        setBusy(false)
      }
    },
    [claimId, refresh],
  )

  const uploadEvidence = useCallback(
    async (file: File) => {
      /* Reject unsupported types and oversized files before a request is made,
         so the user gets an immediate message instead of a server error. */
      const problem = validateEvidenceFile(file)
      if (problem) {
        setStatus(null)
        setActionError(problem)
        return
      }
      setBusy(true)
      setActionError(null)
      setStatus('Uploading evidence…')
      try {
        await uploadClaimEvidence(claimId, file, (percent) =>
          setStatus(`Uploading evidence… ${percent}%`),
        )
        setStatus('Evidence uploaded.')
        refresh()
      } catch (cause) {
        setStatus(null)
        setActionError(cause instanceof Error ? cause.message : 'The upload failed.')
      } finally {
        setBusy(false)
      }
    },
    [claimId, refresh],
  )

  if (state === 'loading') {
    return (
      <WorkspaceShell claimId={claimId} menuOpen={menuOpen} onMenu={toggleMenu} onClose={closeMenu}>
        <StatusCard title="Loading claim…" body={`Fetching ${claimId} from the server.`} />
      </WorkspaceShell>
    )
  }

  if (state === 'notfound') {
    return (
      <WorkspaceShell claimId={claimId} menuOpen={menuOpen} onMenu={toggleMenu} onClose={closeMenu}>
        <StatusCard title="Claim not found" body="No claim with ID " code={claimId} />
      </WorkspaceShell>
    )
  }

  if (state === 'error' || !data) {
    return (
      <WorkspaceShell claimId={claimId} menuOpen={menuOpen} onMenu={toggleMenu} onClose={closeMenu}>
        <div className="cw-card cw-notfound">
          <h1 className="cw-notfound__title">Could not load this claim</h1>
          <p className="cw-muted">{loadError ?? 'The claim could not be loaded.'}</p>
          <div className="cw-header__actions">
            <button type="button" className="cw-btn cw-btn--primary" onClick={refresh}>
              Try again
            </button>
            <a className="cw-btn cw-btn--secondary" href="#/claims">
              Back to claims
            </a>
          </div>
        </div>
      </WorkspaceShell>
    )
  }

  // Key on the id and reload counter so a refresh re-seeds the selection and
  // status map from the freshly loaded claim.
  return (
    <ClaimWorkspaceView
      key={`${data.id}:${reloadKey}`}
      data={data}
      menuOpen={menuOpen}
      onToggleMenu={toggleMenu}
      onCloseMenu={closeMenu}
      busy={busy || analyzing}
      status={status}
      error={actionError}
      onAnalyze={runAnalysis}
      onApprove={() => submitReview('approve')}
      onRequestInfo={() => submitReview('request_info')}
      onUploadEvidence={uploadEvidence}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Shell + fallbacks                                                   */
/* ------------------------------------------------------------------ */

type ShellProps = {
  claimId: string
  menuOpen: boolean
  onMenu: () => void
  onClose: () => void
  children: ReactNode
}

/** The shared page chrome (sidebar + top bar) around any content state. */
function WorkspaceShell({ claimId, menuOpen, onMenu, onClose, children }: ShellProps) {
  return (
    <div className="dashboard-shell">
      <AppSidebar open={menuOpen} active="claims" />
      {menuOpen && <div className="sidebar-scrim" onClick={onClose} aria-hidden="true" />}

      <main className="main" id="main">
        <TopBar onMenu={onMenu} breadcrumb={`Workspace / Claims / ${claimId}`} />
        <div className="cw-root">
          <div className="cw-content">{children}</div>
        </div>
      </main>
    </div>
  )
}

/** Shared card used by the loading and not-found states. */
function StatusCard({ title, body, code }: { title: string; body: string; code?: string }) {
  return (
    <div className="cw-card cw-notfound">
      <h1 className="cw-notfound__title">{title}</h1>
      <p className="cw-muted">
        {body}
        {code && <strong>{code}</strong>}
        {code && ' exists on the server.'}
      </p>
      {code && (
        <a className="cw-btn cw-btn--primary" href="#/claims">
          Back to claims
        </a>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Loaded workspace                                                    */
/* ------------------------------------------------------------------ */

type ClaimWorkspaceViewProps = {
  data: ClaimWorkspaceData
  menuOpen: boolean
  onToggleMenu: () => void
  onCloseMenu: () => void
  busy: boolean
  status: string | null
  error: string | null
  onAnalyze: () => void
  onApprove: () => void
  onRequestInfo: () => void
  onUploadEvidence: (file: File) => void
}

function ClaimWorkspaceView({
  data,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  busy,
  status,
  error,
  onAnalyze,
  onApprove,
  onRequestInfo,
  onUploadEvidence,
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
  const [policyOpen, setPolicyOpen] = useState(false)
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

  const setStatus = (id: string, next: DamageStatus) =>
    setStatusMap((current) => ({ ...current, [id]: next }))

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
      {menuOpen && <div className="sidebar-scrim" onClick={onCloseMenu} aria-hidden="true" />}

      <main className="main" id="main">
        <TopBar onMenu={onToggleMenu} breadcrumb={`Workspace / Claims / ${data.id}`} />

        <div className="cw-root">
          <div className="cw-content">
            <ClaimHeader
              data={data}
              busy={busy}
              status={status}
              error={error}
              onAnalyze={onAnalyze}
              onApprove={onApprove}
              onRequestInfo={onRequestInfo}
            />
            <SummaryStrip items={data.summary} />

            <div className="cw-grid">
              <div className="cw-grid__main">
                <EvidenceGrid
                  items={data.evidence}
                  highlightedId={highlightedEvidenceId}
                  onUpload={onUploadEvidence}
                />
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
                <PolicyCoverage
                  rows={data.policy}
                  documentName={data.policyDocument}
                  onViewPolicy={() => setPolicyOpen(true)}
                />
                <DecisionPanel
                  complete={complete}
                  busy={busy}
                  onApprove={onApprove}
                  onRequestInfo={onRequestInfo}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {policyOpen && (
        <PolicyViewer policyRef={data.policyRef} onClose={() => setPolicyOpen(false)} />
      )}
    </div>
  )
}
