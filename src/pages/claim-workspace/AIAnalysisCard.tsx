import { useState } from 'react'
import { AlertTriangleIcon } from '../../components/layout/icons'
import { SparkleIcon } from '../../components/ui/icons'
import { cx } from '../../lib/cx'
import { ANALYSIS_COVERAGE_LABEL, PROPOSED_DECISION_LABEL } from '../../lib/analysisResult'
import type { AnalysisCoverage, AnalysisResult } from '../../lib/analysisResult'
import type { BadgeTone } from '../../lib/claimWorkspace'

/** Coverage verdict → badge tone (never colour alone: the label says it too). */
const COVERAGE_TONE: Record<AnalysisCoverage, BadgeTone> = {
  covered: 'supported',
  partial: 'needs',
  not_covered: 'priority',
  unable_to_evaluate: 'needs',
}

/** Characters that still fit the ~3-line clamp; longer text gets a
    "show full" toggle so a wall of backend prose never takes over. */
const CLAMP_LIMIT = 80

type AIAnalysisCardProps = {
  /** The mapped analysis, shown only once this claim's analysis has run. */
  result: AnalysisResult
  /**
   * Whether the user has run the analysis for THIS claim (local, per-claim
   * state). Until it is true the card shows the empty state — even when the API
   * already carries a summary saved by an earlier, out-of-band run.
   */
  hasRunAnalysis: boolean
  /** A run started from this page is in flight — show the skeleton. */
  running: boolean
  /** Disable Run while any page action is in flight (same condition as header). */
  disabled: boolean
  /** Live status line from the current run (kept after it settles). */
  status: string | null
  /** Failure text from the current run (includes the server message when it
      sent one). */
  runError: string | null
  /** Starts the analysis — the same action as the header's Run button. */
  onRun?: () => void
  /** Show the AI-GENERATED · VERIFY tag (same preference as the other AI UI). */
  showBadges: boolean
}

/**
 * A backend paragraph clamped to ~3 lines with an explicit, keyboard-friendly
 * toggle. Text is plain — React escapes it, so no raw HTML ever renders.
 */
function ClampBlock({
  label,
  text,
  closedLabel,
}: {
  label: string
  text: string
  closedLabel: string
}) {
  const [open, setOpen] = useState(false)
  const long = text.length > CLAMP_LIMIT
  return (
    <div>
      <p className="cw-ai__label">{label}</p>
      <p className={cx('cw-ai__prose', long && !open && 'cw-ai__prose--clamped')}>{text}</p>
      {long && (
        <button
          type="button"
          className="cw-ai__clamp-toggle"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? 'Show less' : closedLabel}
        </button>
      )}
    </div>
  )
}

/**
 * "AI analysis" — the single place the claim's AI output is shown.
 *
 * The card renders from AnalysisResult only (mapped from the n8n workflow's
 * payload, or from the legacy analysis, by src/lib/analysisResult.ts and
 * src/api/claimWorkspace.ts) — the raw payload never reaches this component.
 *
 * Output is gated by `hasRunAnalysis`: a claim that already carries a saved
 * summary but has not been analysed here still shows the empty state, exactly
 * like a brand-new claim. Only after a run succeeds does the result appear.
 *
 * States: empty (never run), loading (skeleton while the run is in flight),
 * success ("Analyzed" badge, only when a summary is visible), and failed (the
 * error — including the server message — plus the Run/Re-run button, so a
 * retry is always one click away). A denied recommendation is a red-tinted
 * hint, never a decision: AI output never approves, confirms or dismisses
 * anything; the final call stays with the reviewer.
 */
export function AIAnalysisCard({
  result,
  hasRunAnalysis,
  running,
  disabled,
  status,
  runError,
  onRun,
  showBadges,
}: AIAnalysisCardProps) {
  /* A saved `running` state is not a run started here: only `running` (this
     page's active run) may show the skeleton. */
  const loading = running
  /* A stored backend error is safe, plain text and should be visible even
     before this session starts a run. A bare old `failed` state stays hidden
     until the user actually runs it. */
  const failedMessage =
    runError ??
    (!running && result.status === 'failed'
      ? result.error ?? (hasRunAnalysis ? 'The analysis did not finish. Check the evidence and run it again.' : null)
      : null)
  /* Only output from a run started here is shown. The summary is trimmed so
     blank strings never render as an empty paragraph. */
  const summary = hasRunAnalysis ? (result.damageSummary?.trim() ?? '') : ''
  const hasOutput =
    Boolean(summary) ||
    Boolean(result.assessment) ||
    Boolean(result.proposedDecision) ||
    result.inconsistency.flagged
  /* A failed run may still have produced usable output — keep showing it;
     only the badge stays off. */
  const showResult =
    hasRunAnalysis && (result.status === 'success' || (result.status === 'failed' && hasOutput))
  const decision = showResult ? result.proposedDecision : null

  return (
    <section className="cw-card cw-section cw-ai" id="cw-ai-analysis" aria-labelledby="cw-ai-title">
      <div className="cw-section__head">
        <h2 className="cw-section__title cw-ai__title" id="cw-ai-title">
          <SparkleIcon size={16} />
          AI analysis
        </h2>
        <span className="cw-ai__head-end">
          {/* Badge only when the summary it claims to describe is on screen. */}
          {showResult && Boolean(summary) && !loading && (
            <span className="cw-badge cw-badge--supported">Analyzed</span>
          )}
          {showBadges && <span className="cw-tag">AI-GENERATED · VERIFY</span>}
        </span>
      </div>

      {/* Live line: loading/result changes are announced politely. */}
      <p className="cw-ai__status" aria-live="polite">
        {status ?? (running ? 'Running the analysis…' : '')}
      </p>

      {/* Failure lives here, never in the page header. The Run button below
          stays enabled, so the retry never depends on a second control. */}
      {failedMessage && (
        <div className="cw-ai__alert" role="alert">
          <AlertTriangleIcon size={18} className="cw-ai__alert-icon" />
          <div className="cw-ai__alert-body">
            <p className="cw-ai__alert-title">Analysis could not be completed</p>
            <p className="cw-ai__alert-text">{failedMessage}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="cw-ai__skeletons" aria-hidden="true">
          <div className="cw-ai__skeleton" />
          <div className="cw-ai__skeleton cw-ai__skeleton--short" />
          <div className="cw-ai__skeleton cw-ai__skeleton--short" />
        </div>
      ) : showResult ? (
        <>
          {summary ? (
            <ClampBlock
              label="Damage summary"
              text={summary}
              closedLabel="Show full summary"
            />
          ) : (
            <div className="cw-ai__empty">
              <p>No findings returned</p>
              <p className="cw-muted">
                The analysis finished without a written summary. You can run it again.
              </p>
            </div>
          )}

          {result.inconsistency.flagged && (
            <div className="cw-ai__alert">
              <AlertTriangleIcon size={18} className="cw-ai__alert-icon" />
              <div className="cw-ai__alert-body">
                <p className="cw-ai__alert-title">Inconsistency flagged</p>
                <p className="cw-ai__alert-text">
                  {result.inconsistency.details ??
                    'The analysis found information that does not line up across the claim.'}
                </p>
              </div>
            </div>
          )}

          <div className="cw-ai__grid">
            <div>
              <p className="cw-ai__label">Policy coverage</p>
              <span className={cx('cw-badge', `cw-badge--${COVERAGE_TONE[result.coverage]}`)}>
                {ANALYSIS_COVERAGE_LABEL[result.coverage]}
              </span>
            </div>
            {result.estimatedAmount && (
              <div>
                <p className="cw-ai__label">Estimated amount</p>
                <p className="cw-ai__value">{result.estimatedAmount}</p>
              </div>
            )}
          </div>

          {decision && (
            <div className={cx('cw-ai__reco', decision === 'deny' && 'cw-ai__reco--deny')}>
              <p className="cw-ai__reco-label">AI recommends</p>
              <p className="cw-ai__reco-value">{PROPOSED_DECISION_LABEL[decision]}</p>
            </div>
          )}

          {result.assessment && (
            <ClampBlock
              label="Reasoning"
              text={result.assessment}
              closedLabel="Show full assessment"
            />
          )}
        </>
      ) : (
        <div className="cw-ai__empty">
          <p>Run AI analysis to see findings.</p>
          <p className="cw-muted">
            The analysis reviews the uploaded evidence against the policy document.
          </p>
        </div>
      )}

      {/* One Run/Re-run control for the card, disabled for the whole run just
          like the header's button. */}
      {onRun && (
        <div className="cw-ai__actions">
          <button
            type="button"
            className="cw-btn cw-btn--secondary"
            onClick={onRun}
            disabled={disabled || running}
          >
            {showResult ? 'Re-run analysis' : 'Run AI analysis'}
          </button>
        </div>
      )}
    </section>
  )
}
