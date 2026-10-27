import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AppSidebar } from '../../components/layout/AppSidebar'
import { TopBar } from '../../components/layout/TopBar'
import { useAiPrefs } from '../../hooks/useAiPrefs'
import type { AnalysisMeta, ClaimWorkspaceData, DamageStatus } from '../../lib/claimWorkspace'
import { PROPOSED_DECISION_LABEL } from '../../lib/analysisResult'
import { analysisSnapshot, fetchClaimWorkspace } from '../../api/claimWorkspace'
import { analyzeClaim, getClaim, openAnalysisStream, reviewClaim, triggerAnalysisWebhook } from '../../api/claims'
import { ApiError } from '../../api/http'
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

const ANALYSIS_POLL_START_MS = 3000
const ANALYSIS_POLL_INTERVAL_MS = 4000
const ANALYSIS_POLL_MAX_MS = 2 * 60 * 1000
const ANALYSIS_MAX_POLLS = Math.ceil(ANALYSIS_POLL_MAX_MS / ANALYSIS_POLL_INTERVAL_MS)

const ANALYSIS_TERMINAL_STATES = new Set([
  'awaiting_review',
  'reviewing',
  'reviewed',
  'completed',
  'analyzed',
  'success',
])
const ANALYSIS_FAILURE_STATES = new Set(['failed', 'error'])

type AnalysisMode = 'webhook' | 'backend'

/** Pick exactly one trigger path; never both. */
function resolveAnalysisMode(): AnalysisMode {
  const configured = String(import.meta.env.VITE_ANALYSIS_MODE ?? '').trim().toLowerCase()
  if (configured === 'webhook' || configured === 'backend') return configured
  const webhook = String(import.meta.env.VITE_ANALYSIS_WEBHOOK_URL ?? '').trim()
  return webhook ? 'webhook' : 'backend'
}

function normalizedState(value: string | null): string {
  return value?.trim().toLowerCase() ?? ''
}

function timestamp(value: string | number | null): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

/** A new row is identified by a changed analysis id or a newer updatedAt. */
function hasNewAnalysis(current: AnalysisMeta, baseline: AnalysisMeta): boolean {
  if (current.id && current.id !== baseline.id) return true
  const currentTime = timestamp(current.updatedAt)
  const baselineTime = timestamp(baseline.updatedAt)
  return currentTime > 0 && (baselineTime === 0 || currentTime > baselineTime)
}

function triggerErrorMessage(cause: unknown, mode: AnalysisMode): string {
  const fallback = 'Could not start the analysis. Check your connection and try again.'
  if (cause instanceof ApiError) {
    if (mode === 'backend' && cause.status === 409) {
      return 'An analysis is already running or this claim cannot be analyzed right now.'
    }
    if (mode === 'webhook') {
      if (cause.status >= 400) {
        return `The analysis service returned an error (status ${cause.status}).`
      }
      if (cause.code === 'network_error') return 'Could not reach the analysis service.'
      if (cause.code === 'timeout') {
        return cause.message.trim() || 'The analysis request timed out.'
      }
    }
    return cause.message.trim() || fallback
  }
  return cause instanceof Error && cause.message.trim() ? cause.message.trim() : fallback
}

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
  /* Which claim's analysis has run successfully in this session. The AI card
     shows its result only for that claim, so an already-saved summary on a
     claim nobody has analysed here is treated like a brand-new claim. Stored
     as the id (not a bare boolean) so switching claims can never leak it. */
  const [ranClaimId, setRanClaimId] = useState<string | null>(null)
  const hasRunAnalysis = ranClaimId === claimId

  const streamRef = useRef<EventSource | null>(null)
  const streamTimer = useRef<number | null>(null)
  const loadedIdRef = useRef<string | null>(null)
  /* Set when a run succeeds: the skeleton stays up until the refreshed claim
     lands, so the card never flashes the empty state in between. */
  const awaitingRefreshRef = useRef(false)

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
        /* A successful run keeps the skeleton up until the fresh claim has
           landed; end it now so the card swaps straight to the result. */
        if (awaitingRefreshRef.current) {
          awaitingRefreshRef.current = false
          setAnalyzing(false)
        }
      })
      .catch((cause: unknown) => {
        if (!active) return
        setLoadError(cause instanceof Error ? cause.message : 'Something went wrong loading this claim.')
        setState('error')
        if (awaitingRefreshRef.current) {
          awaitingRefreshRef.current = false
          setAnalyzing(false)
          setRunError('The analysis finished, but the claim could not be reloaded. Refresh the page to see it.')
        }
      })

    return () => {
      active = false
    }
  }, [claimId, reloadKey])

  const activeRunIdRef = useRef<string | null>(null)
  const pollTimerRef = useRef<number | null>(null)
  const pollAttemptsRef = useRef(0)
  const pollInFlightRef = useRef(false)

  /* Close any open stream / timer when the page unmounts or the id changes. */
  useEffect(() => () => {
    stopStream()
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
    activeRunIdRef.current = null
    pollAttemptsRef.current = 0
    pollInFlightRef.current = false
  }, [claimId, stopStream])

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
    pollAttemptsRef.current = 0
    pollInFlightRef.current = false
  }, [])

  /* When the claim changes, reset run state so nothing leaks. */
  useEffect(() => {
    setRanClaimId((prev) => (prev === claimId ? prev : null))
    setRunStatus(null)
    setRunError(null)
    setRevealAnalysis(false)
    setAnalyzing(false)
    setBusy(false)
    stopStream()
    stopPolling()
    awaitingRefreshRef.current = false
    activeRunIdRef.current = null
    pollAttemptsRef.current = 0
    pollInFlightRef.current = false
  }, [claimId, stopPolling, stopStream])

  const runAnalysis = useCallback(async () => {
    if (analyzing || busy || activeRunIdRef.current === claimId) return
    const runId = claimId
    const baseline = data?.analysisMeta ?? { id: null, updatedAt: null, state: null, error: null }
    const mode = resolveAnalysisMode()

    activeRunIdRef.current = runId
    stopPolling()
    stopStream()
    setBusy(true)
    setAnalyzing(true)
    setActionError(null)
    setRunError(null)
    setRunStatus('Starting analysis…')
    setRevealAnalysis(true)
    awaitingRefreshRef.current = false
    pollAttemptsRef.current = 0

    let settled = false

    /* Settle once: success keeps the skeleton until the refreshed claim lands;
       failure releases the buttons immediately. */
    const finish = (message: string, succeeded: boolean) => {
      if (settled) return
      if (activeRunIdRef.current !== runId) return
      settled = true
      setRunStatus(message)
      stopStream()
      stopPolling()
      activeRunIdRef.current = null
      if (succeeded) {
        setRunError(null)
        setRanClaimId(runId)
        awaitingRefreshRef.current = true
      } else {
        setAnalyzing(false)
      }
      refresh()
    }

    const startPolling = () => {
      if (activeRunIdRef.current !== runId || pollTimerRef.current !== null || settled) return

      const poll = async () => {
        pollTimerRef.current = null
        if (activeRunIdRef.current !== runId || settled) return
        pollAttemptsRef.current += 1
        if (pollAttemptsRef.current > ANALYSIS_MAX_POLLS) {
          setRunError('The analysis is taking longer than expected. Try again in a moment.')
          finish('Analysis is taking longer than expected — reloading the claim.', false)
          return
        }
        pollInFlightRef.current = true
        try {
          const raw = await getClaim(runId)
          if (activeRunIdRef.current !== runId || settled) return
          const current = analysisSnapshot(raw)
          if (hasNewAnalysis(current, baseline)) {
            const state = normalizedState(current.state)
            if (ANALYSIS_FAILURE_STATES.has(state)) {
              setRunError(
                current.error?.trim() ||
                  'The analysis did not finish. Check the evidence and run it again.',
              )
              finish('Analysis failed.', false)
              return
            }
            if (ANALYSIS_TERMINAL_STATES.has(state)) {
              ingestNotifications([analysisCompleted(runId)])
              finish('Analysis complete.', true)
              return
            }
          }
        } catch {
          /* Ignore poll errors; retry until the two-minute limit. */
        } finally {
          pollInFlightRef.current = false
        }
        if (activeRunIdRef.current === runId && !settled) {
          pollTimerRef.current = window.setTimeout(poll, ANALYSIS_POLL_INTERVAL_MS)
        }
      }

      pollTimerRef.current = window.setTimeout(poll, ANALYSIS_POLL_START_MS)
    }

    try {
      if (mode === 'webhook') {
        await triggerAnalysisWebhook(runId)
        if (activeRunIdRef.current !== runId) return
        setRunStatus('Analysis running…')
        startPolling()
        return
      }

      const run = await analyzeClaim(runId)
      if (activeRunIdRef.current !== runId) return
      ingestNotifications([analysisStarted(runId, run?.analysis_id ?? Date.now())])

      stopStream()
      const stream = openAnalysisStream(runId)
      streamRef.current = stream

      const onEvent = (event: Event) => {
        if (activeRunIdRef.current !== runId) return
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
            /* The stream is claim-wide; polling confirms this run's new row. */
            setRunStatus('Analysis complete — checking the result…')
            break
          case 'analysis_failed':
            ingestNotifications([analysisFailed(runId, frame.message)])
            setRunError(
              typeof frame.message === 'string' && frame.message.trim()
                ? frame.message.trim()
                : 'The analysis did not finish. Check the evidence and run it again.',
            )
            finish('Analysis failed.', false)
            break
          default:
            break
        }
      }

      for (const name of ['analysis_started', 'agent_status', 'awaiting_review', 'analysis_failed']) {
        stream.addEventListener(name, onEvent)
      }

      /* The stream is progress only. If it drops, polling still reaches a
         terminal result; a silent stream must not fail the run. */
      stream.onerror = () => {
        if (activeRunIdRef.current !== runId) return
        stopStream()
        setRunStatus('Checking analysis progress…')
      }
      streamTimer.current = window.setTimeout(() => {
        if (activeRunIdRef.current !== runId) return
        stopStream()
        setRunStatus('Checking analysis progress…')
      }, STREAM_TIMEOUT_MS)

      startPolling()
    } catch (cause) {
      if (activeRunIdRef.current !== runId) return
      setRunStatus(null)
      setRunError(triggerErrorMessage(cause, mode))
      setAnalyzing(false)
      stopPolling()
      stopStream()
      activeRunIdRef.current = null
    } finally {
      setBusy(false)
    }
  }, [analyzing, busy, claimId, data, refresh, stopPolling, stopStream])

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
      hasRunAnalysis={hasRunAnalysis}
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
  /** The user has run this claim's analysis in this session (card gating). */
  hasRunAnalysis: boolean
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
  hasRunAnalysis,
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
                  claimId={data.id}
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
                  hasRunAnalysis={hasRunAnalysis}
                  running={analyzing}
                  disabled={busy}
                  status={analysisStatus}
                  runError={analysisError}
                  onRun={onAnalyze}
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
