import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AppSidebar } from '../../components/layout/AppSidebar'
import { TopBar } from '../../components/layout/TopBar'
import { useAiPrefs } from '../../hooks/useAiPrefs'
import type { ClaimWorkspaceData, DamageStatus } from '../../lib/claimWorkspace'
import { PROPOSED_DECISION_LABEL } from '../../lib/analysisResult'
import { fetchClaimWorkspace } from '../../api/claimWorkspace'
import { analyzeClaim, openAnalysisStream, reviewClaim } from '../../api/claims'
import { uploadClaimEvidence } from '../../api/evidence'
import { validateEvidenceFile } from '../claims/claimAttachments'
import {
  analysisCompleted,
  analysisFailed,
  analysisStarted,
  evidenceUploaded,
  infoRequested,
  reviewCompleted,
} from '../../lib/notifications'
import { ingestNotifications } from '../../lib/notificationsStore'
import { PolicyViewer } from '../../components/feedback/PolicyViewer'
import { AIAnalysisCard } from './AIAnalysisCard'
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
 * the claim afterwards.
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
  /* The analysis run narrates itself inside the AI analysis card — its
     progress line and failures never appear under the page title. */
  const [runStatus, setRunStatus] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  /* True from the moment Run is clicked until the card settles: the view
     scrolls the AI analysis card into view when results (or a failure)
     arrive. */
  const [revealAnalysis, setRevealAnalysis] = useState(false)

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

  /* A settled result replaces any transient run failure: once the refreshed
     claim carries a successful analysis, that is the story the card tells. */
  useEffect(() => {
    if (data?.analysis.status === 'success') {
      setRunError(null)
    }
  }, [data])

  const runAnalysis = useCallback(async () => {
    setBusy(true)
    setAnalyzing(true)
    setActionError(null)
    setRunError(null)
    setRunStatus('Starting analysis…')
    setRevealAnalysis(true)
    try {
      const run = await analyzeClaim(claimId)
      /* Real event → notification bell, immediately. */
      ingestNotifications([analysisStarted(claimId, run?.analysis_id ?? Date.now())])

      stopStream()
      const stream = openAnalysisStream(claimId)
      streamRef.current = stream

      /* Settle once: a terminal event, a dropped connection, or the timeout
         must not race each other into repeated refreshes. */
      let settled = false
      const finish = (message: string) => {
        if (settled) return
        settled = true
        setRunStatus(message)
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
            setRunStatus('Analysis started…')
            break
          case 'agent_status':
            setRunStatus(`Agent: ${frame.agent ?? 'working'} (${frame.status ?? 'running'})`)
            break
          case 'awaiting_review':
            ingestNotifications([analysisCompleted(claimId)])
            finish('Analysis complete — awaiting your review.')
            break
          case 'analysis_failed':
            ingestNotifications([analysisFailed(claimId, frame.message)])
            /* The card shows a clean sentence; the claim's own (also cleaned)
               analysis error explains the cause once the refresh lands. Raw
               backend text (frame.message) never reaches the screen. */
            setRunError('The analysis did not finish. Check the evidence and run it again.')
            finish('Analysis failed.')
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
      stream.onerror = () => {
        setRunError(
          'The connection to the analysis was interrupted. The claim was reloaded — if no result appears, run the analysis again.',
        )
        finish('Analysis stream ended — reloading the claim.')
      }
      streamTimer.current = window.setTimeout(() => {
        setRunError(
          'The analysis is taking longer than expected. The claim was reloaded — if no result appears, run the analysis again.',
        )
        finish('Analysis is taking longer than expected — reloading the claim.')
      }, STREAM_TIMEOUT_MS)
    } catch {
      setRunStatus(null)
      setRunError('Could not start the analysis. Check your connection and try again.')
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
        /* Real event → notification bell, immediately. */
        ingestNotifications([action === 'approve' ? reviewCompleted(claimId) : infoRequested(claimId)])
        setStatus(action === 'approve' ? 'Claim approved.' : 'More information requested.')
        refresh()
      } catch (cause) {
        /* A review rejection the card already explains (analysis never ran or
           failed) must not repeat a long backend line under the title — the
           AI analysis card owns that story. Anything else still surfaces. */
        const analysisState = data?.analysis.status
        if (analysisState !== 'failed' && analysisState !== 'empty') {
          setActionError(cause instanceof Error ? cause.message : 'Could not record the decision.')
        }
      } finally {
        setBusy(false)
      }
    },
    [claimId, data, refresh],
  )

  const handleEvidenceUpload = useCallback(
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
        const uploaded = await uploadClaimEvidence(claimId, file, (percent) =>
          setStatus(`Uploading evidence… ${percent}%`),
        )
        /* Real event → notification bell, immediately. */
        const newFile = uploaded?.files?.at?.(-1)
        ingestNotifications([evidenceUploaded(claimId, file.name, newFile?.id)])
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
      analyzing={analyzing}
      status={status}
      error={actionError}
      analysisStatus={runStatus}
      analysisError={runError}
      revealAnalysis={revealAnalysis}
      onAnalyze={runAnalysis}
      onApprove={() => submitReview('approve')}
      onRequestInfo={() => submitReview('request_info')}
      onUploadEvidence={handleEvidenceUpload}
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
  /** An analysis run is in flight (part of `busy`, but the card needs it). */
  analyzing: boolean
  status: string | null
  error: string | null
  /** Live status line of the current analysis run (card only). */
  analysisStatus: string | null
  /** Cleaned failure text of the current run (card only). */
  analysisError: string | null
  /** Scroll the AI analysis card into view once results (or a failure) land. */
  revealAnalysis: boolean
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
  analyzing,
  status,
  error,
  analysisStatus,
  analysisError,
  revealAnalysis,
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
  const [policyOpen, setPolicyOpen] = useState(false)

  /* A run has settled (or just failed to start): bring the AI analysis card
     into view — minimally and without motion for users who ask for none. */
  useEffect(() => {
    if (!revealAnalysis) return
    const node = document.getElementById('cw-ai-analysis')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    node?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [revealAnalysis])

  const total = data.damage.length
  const confirmed = data.damage.filter((zone) => statusMap[zone.id] === 'confirmed').length
  const dismissed = data.damage.filter((zone) => statusMap[zone.id] === 'dismissed').length
  const complete = confirmed + dismissed === total

  /* The single source of truth for "may this claim be approved right now":
     every damage area reviewed AND the policy coverage evaluated. Both the
     panel and the header's Complete review read it, and the AI's suggestion
     never enters into it — the server re-validates regardless. */
  const coverage = data.analysis.coverage
  const approveBlockedReason = !complete
    ? 'Confirm or dismiss every damage area to enable approval.'
    : coverage === 'unable_to_evaluate'
      ? 'Coverage could not be evaluated — request the missing information instead.'
      : coverage === 'not_covered'
        ? 'This damage is not covered by the policy — request information or escalate instead.'
        : null
  /* The AI's proposed decision is a hint on the reviewer's panel, nothing
     more — and there is deliberately no "Reject" action to map a denial to;
     the decision stays with the human. */
  const suggestion = data.analysis.proposedDecision
    ? PROPOSED_DECISION_LABEL[data.analysis.proposedDecision]
    : null

  const setStatus = (id: string, next: DamageStatus) =>
    setStatusMap((current) => ({ ...current, [id]: next }))

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
              approveBlockedReason={approveBlockedReason}
              onAnalyze={onAnalyze}
              onApprove={onApprove}
              onRequestInfo={onRequestInfo}
            />
            <SummaryStrip items={data.summary} />

            <div className="cw-grid">
              <div className="cw-grid__main">
                <EvidenceGrid
                  items={data.evidence}
                  highlightedId={null}
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
                <AIAnalysisCard
                  result={data.analysis}
                  running={analyzing}
                  status={analysisStatus}
                  runError={analysisError}
                  onRetry={onAnalyze}
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
                  suggestion={suggestion}
                  approveBlockedReason={approveBlockedReason}
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
