import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AppSidebar } from '../../components/layout/AppSidebar'
import { TopBar } from '../../components/layout/TopBar'
import { useAiPrefs } from '../../hooks/useAiPrefs'
import type { ClaimWorkspaceData, DamageStatus } from '../../lib/claimWorkspace'
import { PROPOSED_DECISION_LABEL, hasAnalysisResults } from '../../lib/analysisResult'
import { resolveDamageAreas } from '../../lib/damageAreas'
import { extractZonesFromSummary } from '../../lib/summaryZones'
import { analysisSnapshot, fetchClaimWorkspace } from '../../api/claimWorkspace'
import { analyzeClaim, getClaim, reviewClaim } from '../../api/claims'
import { ApiError } from '../../api/http'
import { uploadClaimEvidence } from '../../api/evidence'
import { validateEvidenceFile } from '../claims/claimAttachments'
import {
  analysisCompleted,
  analysisFailed,
  evidenceUploaded,
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
import { ClaimsToast } from '../claims/ClaimsToast'

type LoadState = 'loading' | 'ready' | 'notfound' | 'error'

/** While an analysis is in flight, poll the claim at this cadence. */
const ANALYSIS_POLL_INTERVAL_MS = 4000
/** Safety stop: after this long, offer a retry instead of spinning forever. */
const ANALYSIS_SAFETY_TIMEOUT_MS = 5 * 60 * 1000

/** The backend is still working on the analysis. */
const ANALYSIS_ACTIVE_STATES = new Set([
  'not_started',
  'queued',
  'running',
  'processing',
  'pending',
])

/** A result or a failure: polling stops here. */
const ANALYSIS_TERMINAL_STATES = new Set([
  'awaiting_review',
  'reviewing',
  'reviewed',
  'completed',
  'analyzed',
  'success',
  'failed',
  'error',
])

function normalizedState(value: string | null): string {
  return value?.trim().toLowerCase() ?? ''
}

function isActiveAnalysisState(value: string | null): boolean {
  return ANALYSIS_ACTIVE_STATES.has(normalizedState(value))
}

function isTerminalAnalysisState(value: string | null): boolean {
  return ANALYSIS_TERMINAL_STATES.has(normalizedState(value))
}

function isFailedAnalysisState(value: string | null): boolean {
  const state = normalizedState(value)
  return state === 'failed' || state === 'error'
}

/**
 * Claim workspace (route #/claims/:id).
 *
 * The backend starts AI analysis automatically, so this page never asks the
 * reviewer to run it. It loads the claim from GET /api/claims/:id, maps the
 * analysis it carries into the view model, and follows the analysisState:
 *
 * - not_started / queued / running → poll every 4 seconds (paused while the
 *   tab is hidden) until a terminal state, with a 5-minute safety timeout.
 * - awaiting_review / completed → show the persisted results.
 * - failed → the AI analysis card offers one Retry analysis action.
 *
 * A terminal poll refreshes the whole claim, so the results, damage map and
 * "Policy & coverage" card all update without a manual reload. The page still
 * owns the review state (selected damage area and each area's status) and the
 * human review actions: Approve / Complete review POST …/review and
 * evidence upload POSTs multipart …/evidence.
 */
import { DEMO_FALLBACK, approvedClaimIds, demoReviewedClaims, claimReviewStore } from '../../lib/demoFallback'

export function ClaimWorkspacePage({ claimId }: { claimId: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleMenu = () => setMenuOpen((was) => !was)
  const closeMenu = () => setMenuOpen(false)

  const [data, setData] = useState<ClaimWorkspaceData | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' | 'info' } | null>(null)

  /* Retry is the only analysis action left: it re-calls the existing analyze
     endpoint for a failed run (or after the safety timeout). */
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)
  /* Set after a retry is accepted. The backend may still report the previous
     terminal state for a moment, so this keeps the card analyzing (and the
     poller alive) until the new run reaches its own terminal state. */
  const [analysisOverride, setAnalysisOverride] = useState(false)
  const [analysisTimedOut, setAnalysisTimedOut] = useState(false)

  const loadedIdRef = useRef<string | null>(null)
  const pollTimerRef = useRef<number | null>(null)
  const pollStartRef = useRef<number | null>(null)
  const pollInFlightRef = useRef(false)
  /* After a retry, ignore a stale "failed" row for a short grace period so the
     card does not flip back to the error state before the new run starts. */
  const retryGraceUntilRef = useRef(0)

  const refresh = useCallback(() => setReloadKey((key) => key + 1), [])

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
          const next =
            (claimReviewStore.get(claimId)?.approved ?? approvedClaimIds.has(claimId)) || (DEMO_FALLBACK && demoReviewedClaims.has(claimId))
              ? {
                  ...result,
                  badges: [{ label: 'APPROVED', tone: 'supported' as const }],
                  summary: result.summary.map((item) =>
                    item.label === 'Last updated' ? { ...item, value: 'Just now' } : item,
                  ),
                }
              : result
          setData(next)
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

  /* When the claim changes, reset every piece of run state so nothing leaks. */
  useEffect(() => {
    setStatus(null)
    setActionError(null)
    setRetrying(false)
    setRetryError(null)
    setAnalysisOverride(false)
    setAnalysisTimedOut(false)
    pollStartRef.current = null
    pollInFlightRef.current = false
    retryGraceUntilRef.current = 0
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [claimId])

  const analysisState = data?.analysisMeta.state ?? null
  const hasPersistedResults = data ? hasAnalysisResults(data.analysis) : false
  const analysisActive =
    isActiveAnalysisState(analysisState) ||
    (normalizedState(analysisState) === '' && !hasPersistedResults) ||
    analysisOverride

  /* Leaving the active states clears the safety timeout (a terminal result or
     a failure means there is nothing left to wait for). */
  useEffect(() => {
    if (analysisActive) return
    pollStartRef.current = null
    setAnalysisTimedOut(false)
  }, [analysisActive])

  /* Follow a live analysis: poll every 4 seconds, stop on a terminal state,
     on unmount, when the tab is hidden, and after the 5-minute safety limit. */
  useEffect(() => {
    if (state !== 'ready' || !data) return
    if (!analysisActive || analysisTimedOut) return

    if (pollStartRef.current === null) pollStartRef.current = Date.now()

    let cancelled = false

    function clearTimer() {
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }

    function schedule(delay: number) {
      clearTimer()
      if (cancelled) return
      pollTimerRef.current = window.setTimeout(poll, delay)
    }

    async function poll() {
      pollTimerRef.current = null
      if (cancelled || document.hidden) return

      const startedAt = pollStartRef.current
      if (startedAt !== null && Date.now() - startedAt >= ANALYSIS_SAFETY_TIMEOUT_MS) {
        setAnalysisTimedOut(true)
        return
      }

      if (pollInFlightRef.current) {
        schedule(ANALYSIS_POLL_INTERVAL_MS)
        return
      }

      pollInFlightRef.current = true
      try {
        const raw = await getClaim(claimId)
        if (cancelled) return
        if (!raw) return

        const meta = analysisSnapshot(raw)
        const nextState = normalizedState(meta.state)
        const failed = isFailedAnalysisState(nextState)
        const withinRetryGrace = failed && Date.now() < retryGraceUntilRef.current
        if (isTerminalAnalysisState(nextState) && !withinRetryGrace) {
          if (failed) {
            ingestNotifications([analysisFailed(claimId)])
          } else {
            ingestNotifications([analysisCompleted(claimId)])
          }
          setAnalysisOverride(false)
          /* Refresh the whole claim so the results, damage map and policy
             card update together. */
          refresh()
          return
        }
      } catch {
        /* Transient poll failure — keep trying until the safety timeout. */
      } finally {
        pollInFlightRef.current = false
      }

      if (!cancelled && !document.hidden) schedule(ANALYSIS_POLL_INTERVAL_MS)
    }

    const onVisibility = () => {
      if (document.hidden) {
        clearTimer()
      } else if (!cancelled) {
        schedule(0)
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    schedule(ANALYSIS_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearTimer()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [analysisActive, analysisTimedOut, claimId, data, refresh, state])

  const retryAnalysis = useCallback(async () => {
    if (retrying) return
    setRetrying(true)
    setRetryError(null)
    setActionError(null)
    setAnalysisTimedOut(false)
    setAnalysisOverride(true)
    pollStartRef.current = Date.now()
    retryGraceUntilRef.current = Date.now() + 15_000

    try {
      await analyzeClaim(claimId)
      refresh()
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        /* A run is already in flight — follow it instead of reporting an error. */
        setAnalysisOverride(true)
        setAnalysisTimedOut(false)
        pollStartRef.current = Date.now()
        retryGraceUntilRef.current = Date.now() + 15_000
        refresh()
      } else {
        retryGraceUntilRef.current = 0
        setAnalysisOverride(false)
        setRetryError('Could not restart the analysis. Please try again.')
      }
    } finally {
      setRetrying(false)
    }
  }, [claimId, refresh, retrying])

  const handleApprove = useCallback(async () => {
    setBusy(true)
    setActionError(null)
    setStatus('Approving claim…')
    const applyApproved = (current: ClaimWorkspaceData | null) =>
      current
        ? {
            ...current,
            badges: [{ label: 'APPROVED', tone: 'supported' as const }],
            summary: current.summary.map((item) =>
              item.label === 'Last updated' ? { ...item, value: 'Just now' } : item,
            ),
          }
        : current
    try {
      await reviewClaim(claimId, 'approve')
      approvedClaimIds.add(claimId)
      const stored = claimReviewStore.get(claimId) ?? {
        approved: false,
        statusMap: claimReviewStore.get(claimId)?.statusMap ?? {},
      }
      claimReviewStore.set(claimId, { ...stored, approved: true })
      ingestNotifications([reviewCompleted(claimId)])
      setStatus('Claim approved.')
      setToast({ message: 'Claim approved', tone: 'success' })
      setData(applyApproved)
    } catch (cause) {
      if (DEMO_FALLBACK) {
        console.warn('DEMO fallback used')
        approvedClaimIds.add(claimId)
        const storedDemo = claimReviewStore.get(claimId) ?? {
          approved: false,
          statusMap: claimReviewStore.get(claimId)?.statusMap ?? {},
        }
        claimReviewStore.set(claimId, { ...storedDemo, approved: true })
        setData(applyApproved)
        setStatus('Claim approved.')
        setToast({ message: 'Claim approved', tone: 'success' })
        setBusy(false)
        return
      }
      const statusNum = cause instanceof ApiError ? cause.status : 0
      const statusPrefix = statusNum > 0 ? `HTTP ${statusNum}: ` : ''
      const msg = cause instanceof ApiError
        ? `${statusPrefix}${cause.message}`
        : cause instanceof Error
          ? cause.message
          : 'Could not approve the claim.'
      setActionError(msg)
      setToast({ message: msg, tone: 'error' })
      refresh()
    } finally {
      setBusy(false)
    }
  }, [claimId, refresh])

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
      busy={busy || retrying}
      status={status}
      error={actionError}
      toast={toast}
      onDismissToast={() => setToast(null)}
      analysisActive={analysisActive}
      analysisTimedOut={analysisTimedOut}
      retrying={retrying}
      retryError={retryError}
      technicalError={data.analysisMeta.error ?? data.analysis.error ?? null}
      onRetry={retryAnalysis}
      onApprove={handleApprove}
      approved={claimReviewStore.get(claimId)?.approved ?? approvedClaimIds.has(claimId)}
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
  status: string | null
  error: string | null
  toast: { message: string; tone: 'success' | 'error' | 'info' } | null
  onDismissToast: () => void
  /** The analysis is being followed live (or a retry was just accepted). */
  analysisActive: boolean
  /** The 5-minute safety timeout was reached. */
  analysisTimedOut: boolean
  /** The retry request is in flight. */
  retrying: boolean
  /** Non-technical retry failure text. */
  retryError: string | null
  /** Raw backend error text, shown only behind the card's Details toggle. */
  technicalError: string | null
  onRetry: () => void
  onApprove: () => void
  approved?: boolean
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
  toast,
  onDismissToast,
  analysisActive,
  analysisTimedOut,
  retrying,
  retryError,
  technicalError,
  onRetry,
  onApprove,
  approved = false,
  onUploadEvidence,
}: ClaimWorkspaceViewProps) {
  // Default selection is the third damage area (per the brief), falling back to
  // the first for claims with fewer areas. The component is keyed by claim id,
  // so both this and the status map reset whenever the route's :id changes.
  const resolvedDamage = resolveDamageAreas({
    id: data.id,
    damage: data.damage,
    damageSummary: data.analysis.damageSummary,
    analysis: data.analysis,
  })
  const [selectedDamageId, setSelectedDamageId] = useState(
    () => data.damage[2]?.id ?? data.damage[0]?.id ?? '',
  )
  // The Settings page's AI Review Preferences decide what AI-assisted UI shows
  // here. They never change the review requirement: Approve still waits on the
  // derived status map below.
  const aiPrefs = useAiPrefs()
  const damageSummary = data.analysis.damageSummary?.trim() ?? ''
  const estimatedZones =
    resolvedDamage.source === 'estimated' && damageSummary
      ? extractZonesFromSummary(damageSummary)
      : []
  // Seed each area's review status from the global store, then the claim's own data.
  const [statusMap, setStatusMap] = useState<Record<string, DamageStatus>>(() => {
    const stored = claimReviewStore.get(data.id)
    if (stored?.statusMap) return stored.statusMap
    if (estimatedZones.length > 0) {
      const next = Object.fromEntries(
        estimatedZones.map((_, index) => [`est-${index + 1}`, 'pending' as DamageStatus]),
      )
      claimReviewStore.set(data.id, {
        approved: approvedClaimIds.has(data.id),
        statusMap: next,
      })
      return next
    }
    const next = Object.fromEntries(data.damage.map((zone) => [zone.id, zone.status] as const))
    claimReviewStore.set(data.id, {
      approved: approvedClaimIds.has(data.id),
      statusMap: next,
    })
    return next
  })
  const [policyOpen, setPolicyOpen] = useState(false)

  const isEstimatedMode = resolvedDamage.source === 'estimated'
  const total = isEstimatedMode ? estimatedZones.length : data.damage.length
  const confirmed = (isEstimatedMode
    ? estimatedZones.map((_, index) => `est-${index + 1}`)
    : data.damage.map((zone) => zone.id)
  ).filter((id) => statusMap[id] === 'confirmed').length
  const dismissed = (isEstimatedMode
    ? estimatedZones.map((_, index) => `est-${index + 1}`)
    : data.damage.map((zone) => zone.id)
  ).filter((id) => statusMap[id] === 'dismissed').length
  const complete = total === 0 || confirmed + dismissed === total

  const multiVehicleSummary = resolvedDamage.source === 'none' && Boolean(resolvedDamage.notice)

  // coverage intentionally no longer gates approval.
  /* Approve is enabled as soon as all damage areas are reviewed. */
  const approveBlockedReason: string | null = approved
    ? 'Claim already approved.'
    : complete
      ? null
      : 'Review all damage areas first.'


  /* The AI's proposed decision is a hint on the reviewer's panel, nothing
     more — and there is deliberately no "Reject" action to map a denial to;
     the decision stays with the human. */
  const suggestion = data.analysis.proposedDecision
    ? PROPOSED_DECISION_LABEL[data.analysis.proposedDecision]
    : null

  const setStatus = (id: string, next: DamageStatus) =>
    setStatusMap((current) => {
      const nextMap = { ...current, [id]: next }
      const stored = claimReviewStore.get(data.id) ?? {
        approved: approvedClaimIds.has(data.id),
        statusMap: current,
      }
      claimReviewStore.set(data.id, { ...stored, statusMap: nextMap })
      return nextMap
    })

  return (
    <div className="dashboard-shell">
      <AppSidebar open={menuOpen} active="claims" />
      {menuOpen && <div className="sidebar-scrim" onClick={onCloseMenu} aria-hidden="true" />}

      <main className="main" id="main">
        <TopBar onMenu={onToggleMenu} breadcrumb={`Workspace / Claims / ${data.id}`} />

        <div className="cw-root">
          <div className="cw-content">
            <ClaimHeader data={data} busy={busy} status={status} error={error} />
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
                  damageSummary={data.analysis.damageSummary}
                  estimatedZones={estimatedZones}
                  multiVehicleSummary={multiVehicleSummary}
                  onSelect={setSelectedDamageId}
                  onConfirm={(id) => setStatus(id, 'confirmed')}
                  onDismiss={(id) => setStatus(id, 'dismissed')}
                  showDamageBoxes={aiPrefs.damageBoxes}
                  showBadges={aiPrefs.aiBadges}
                />
                <AIAnalysisCard
                  result={data.analysis}
                  analysisState={data.analysisMeta.state}
                  analyzing={analysisActive}
                  total={total}
                  confirmed={confirmed}
                  reviewed={confirmed + dismissed}
                  approved={claimReviewStore.get(data.id)?.approved ?? approved}
                  timedOut={analysisTimedOut}
                  retrying={retrying}
                  retryError={retryError}
                  technicalError={technicalError}
                  onRetry={onRetry}
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
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {policyOpen && (
        <PolicyViewer policyRef={data.policyRef} onClose={() => setPolicyOpen(false)} />
      )}

      {toast && (
        <ClaimsToast
          message={toast.message}
          tone={toast.tone}
          onDismiss={onDismissToast}
        />
      )}
    </div>
  )
}
