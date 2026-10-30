import { useEffect, useState } from 'react'
import { AlertTriangleIcon } from '../../components/layout/icons'
import { SparkleIcon } from '../../components/ui/icons'
import { cx } from '../../lib/cx'
import {
  ANALYSIS_COVERAGE_LABEL,
  PROPOSED_DECISION_LABEL,
  hasAnalysisResults,
} from '../../lib/analysisResult'
import type { AnalysisResult } from '../../lib/analysisResult'

/** Characters that still fit the ~3-line clamp; longer text gets a
    "show full" toggle so a wall of backend prose never takes over. */
const CLAMP_LIMIT = 80

/** States where the backend is still working on the analysis. */
const ACTIVE_STATES = new Set(['not_started', 'queued', 'running', 'processing', 'pending'])

/** States where a result (or a failure) is final. */
const FAILED_STATES = new Set(['failed', 'error'])
const RESULT_STATES = new Set([
  'awaiting_review',
  'reviewing',
  'reviewed',
  'completed',
  'analyzed',
  'success',
])

function normalizedState(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

type AIAnalysisCardProps = {
  /** The mapped analysis, shown whenever the claim already carries results. */
  result: AnalysisResult
  /** Backend analysisState — the single driver of the card's state. */
  analysisState?: string | null
  /** A run is being followed (including a retry the backend just accepted). */
  analyzing: boolean
  /** The 5-minute safety timeout was reached. */
  timedOut: boolean
  /** The retry request is in flight. */
  retrying: boolean
  /** Non-technical retry failure text, shown under the button. */
  retryError?: string | null
  /** Raw backend error text, hidden behind the collapsed Details toggle. */
  technicalError?: string | null
  /** Re-calls the existing analyze endpoint. Only used for failed/timed-out runs. */
  onRetry?: () => void
  /** Show the AI-GENERATED · VERIFY tag (same preference as the other AI UI). */
  showBadges: boolean
  total?: number
  confirmed?: number
  reviewed?: number
  approved?: boolean
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
 * The backend starts the analysis automatically, so the card follows
 * `analysisState` rather than a local "run" action:
 *
 * - not_started / queued / running → "Analyzing evidence against the policy…"
 *   with a spinner and skeleton. No buttons.
 * - awaiting_review / completed → the persisted results. No run/re-run button.
 * - failed → a plain-language message plus a single Retry analysis button; the
 *   raw backend error stays behind a collapsed Details toggle.
 * - a run that exceeds the page's safety timeout → "Analysis is taking longer
 *   than expected" plus the same Retry button.
 *
 * Persisted results always win: a claim that already has a summary/decision/
 * inconsistency flag never shows a failure card, regardless of `analysis.error`.
 * The final decision stays with the human reviewer.
 */
export function AIAnalysisCard({
  result,
  analysisState,
  analyzing,
  timedOut,
  retrying,
  retryError = null,
  technicalError = null,
  onRetry,
  showBadges,
  total = 0,
  confirmed = 0,
  reviewed = 0,
  approved = false,
}: AIAnalysisCardProps) {
  const summary = result.damageSummary?.trim() ?? ''
  const hasPersistedResults = hasAnalysisResults(result)

  const stateNorm = normalizedState(analysisState)
  const stateIsActive = ACTIVE_STATES.has(stateNorm)
  const stateIsResult = RESULT_STATES.has(stateNorm)
  const stateIsFailed = FAILED_STATES.has(stateNorm)

  /* The analysisState drives the view. Persisted output still wins over a
     failure (never show an error when there is something to show), but an
     active run always shows its progress state. */
  const showTimeout =
    timedOut &&
    (stateIsActive || (!hasPersistedResults && !stateIsResult && !stateIsFailed))
  const showResults =
    !showTimeout &&
    (stateIsResult ||
      (!stateIsActive && hasPersistedResults) ||
      (!stateIsActive && result.status === 'success'))
  const showFailure =
    !showTimeout &&
    !showResults &&
    !analyzing &&
    (stateIsFailed || result.status === 'failed')
  const showAnalyzing = !showTimeout && !showResults && !showFailure

  const showAnalyzedBadge = showResults && Boolean(summary) && !analyzing
  const unableToEvaluate = result.coverage === 'unable_to_evaluate'
  const coverageTone =
    result.coverage === 'covered'
      ? 'cw-badge--supported'
      : result.coverage === 'not_covered'
        ? 'cw-badge--priority'
        : 'cw-badge--needs'
  const detailsText = technicalError?.trim() || result.error?.trim() || ''
  /* Hide the whole row when the analysis did not return a proposed decision. */
  const proposedDecisionLabel = result.proposedDecision
    ? PROPOSED_DECISION_LABEL[result.proposedDecision]
    : null

  const completeReviewed = total > 0 && reviewed >= total
  const pillLabel = approved
    ? 'Approved'
    : completeReviewed
      ? result.coverage === 'covered'
        ? 'Approve'
        : 'Manual review'
      : 'Pending'
  const pillClass = approved
    ? 'cw-ai-decision--approved'
    : completeReviewed
      ? result.coverage === 'covered'
        ? 'cw-ai-decision--approve'
        : 'cw-ai-decision--manual'
      : 'cw-ai-decision--pending'

  const confidenceRaw =
    60 + 25 * (total > 0 ? reviewed / total : 0) + (result.coverage === 'covered' ? 10 : 0) - (result.coverage === 'not_covered' ? 15 : 0)
  const confidence = Math.min(95, Math.max(35, Math.round(confidenceRaw)))

  const [barWidth, setBarWidth] = useState(0)
  useEffect(() => {
    const timer = window.setTimeout(() => setBarWidth(confidence), 30)
    return () => window.clearTimeout(timer)
  }, [confidence])

  return (
    <section className="cw-card cw-section cw-ai" id="cw-ai-analysis" aria-labelledby="cw-ai-title">
      <div className="cw-section__head">
        <h2 className="cw-section__title cw-ai__title" id="cw-ai-title">
          <SparkleIcon size={16} />
          AI analysis
        </h2>
        <span className="cw-ai__head-end">
          {/* Badge only when the summary it claims to describe is on screen. */}
          {showAnalyzedBadge && <span className="cw-badge cw-badge--supported">Analyzed</span>}
          {showBadges && <span className="cw-tag">AI-GENERATED · VERIFY</span>}
        </span>
      </div>

      {showTimeout ? (
        <div className="cw-ai__alert" role="status">
          <AlertTriangleIcon size={18} className="cw-ai__alert-icon" />
          <div className="cw-ai__alert-body">
            <p className="cw-ai__alert-title">Analysis is taking longer than expected</p>
            <p className="cw-ai__alert-text">
              The analysis has not finished yet. You can retry it, or check back in a moment.
            </p>
          </div>
        </div>
      ) : showAnalyzing ? (
        <div className="cw-ai__skeletons" role="status" aria-live="polite">
          <div className="cw-ai__analyzing">
            <span className="cw-ai__spinner" aria-hidden="true" />
            <span>Analyzing evidence against the policy…</span>
          </div>
          <div className="cw-ai__skeleton" aria-hidden="true" />
          <div className="cw-ai__skeleton cw-ai__skeleton--short" aria-hidden="true" />
          <div className="cw-ai__skeleton cw-ai__skeleton--short" aria-hidden="true" />
        </div>
      ) : showFailure ? (
        <>
          <div className="cw-ai__alert" role="alert">
            <AlertTriangleIcon size={18} className="cw-ai__alert-icon" />
            <div className="cw-ai__alert-body">
              <p className="cw-ai__alert-title">The analysis could not be completed</p>
              <p className="cw-ai__alert-text">
                You can retry the analysis. If the problem continues, check the evidence and try
                again later.
              </p>
            </div>
          </div>
          {detailsText && (
            <details className="cw-ai__details">
              <summary className="cw-ai__details-toggle">Details</summary>
              <pre className="cw-ai__details-text">{detailsText}</pre>
            </details>
          )}
        </>
      ) : showResults ? (
        <>
          {summary ? (
            <ClampBlock label="Damage summary" text={summary} closedLabel="Show full summary" />
          ) : (
            <div className="cw-ai__empty">
              <p>No findings returned</p>
              <p className="cw-muted">The analysis finished without a written summary.</p>
            </div>
          )}

          <div className="cw-ai__coverage">
            <span className={cx('cw-badge', coverageTone)}>
              {ANALYSIS_COVERAGE_LABEL[result.coverage]}
            </span>
            {unableToEvaluate && (
              <p className="cw-muted cw-ai__coverage-note">
                Coverage could not be evaluated from the available evidence and policy.
              </p>
            )}
          </div>

          {result.inconsistency.flagged ? (
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
          ) : unableToEvaluate ? null : (
            <p className="cw-muted cw-ai__no-inconsistency">No inconsistencies</p>
          )}

          <div className={cx('cw-ai-decision', pillClass)}>
            <div className="cw-ai-decision__head">
              <span className="cw-ai-decision__label">AI DECISION</span>
              <span className={cx('cw-ai-decision__pill', pillClass)}>{pillLabel}</span>
            </div>

            {proposedDecisionLabel && (
              <p className="cw-ai-decision__recommendation">
                AI recommendation: {proposedDecisionLabel}
              </p>
            )}

            <div className="cw-ai-decision__confidence">
              <span className="cw-ai-decision__conf-label">Confidence</span>
              <div className="cw-ai-decision__conf-bar" aria-hidden="true">
                <div
                  className="cw-ai-decision__conf-fill"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className="cw-ai-decision__conf-value">{confidence}%</span>
            </div>

            <ul className="cw-ai-decision__why">
              <li>
                <span className="cw-ai-decision__icon" aria-hidden="true">
                  {completeReviewed ? '✓' : '⚠'}
                </span>
                {confirmed}/{total} damage areas verified
              </li>
              <li>
                <span className="cw-ai-decision__icon" aria-hidden="true">
                  {result.coverage === 'covered' ? '✓' : '⚠'}
                </span>
                Coverage: {result.coverage === 'covered' ? 'covered' : 'not covered'}
              </li>
              {result.estimatedAmount && (
                <li>
                  <span className="cw-ai-decision__icon" aria-hidden="true">✓</span>
                  Estimated amount {result.estimatedAmount}
                </li>
              )}
            </ul>

            <div className="cw-ai-decision__chips">
              <span className={cx('cw-ai-decision__chip', completeReviewed ? 'cw-ai-decision__chip--ok' : 'cw-ai-decision__chip--warn')}>
                Damage: {completeReviewed ? 'verified' : 'pending'}
              </span>
              <span className={cx('cw-ai-decision__chip', result.coverage === 'covered' ? 'cw-ai-decision__chip--ok' : 'cw-ai-decision__chip--warn')}>
                Coverage: {result.coverage === 'covered' ? 'ok' : 'not covered'}
              </span>
              <span
                className={cx(
                  'cw-ai-decision__chip',
                  result.inconsistency.flagged || result.inconsistency.details
                    ? 'cw-ai-decision__chip--warn'
                    : 'cw-ai-decision__chip--ok',
                )}
              >
                Fraud risk: {result.inconsistency.flagged || result.inconsistency.details ? 'Review' : 'Low'}
              </span>
            </div>

            <p className="cw-ai-decision__foot">
              AI-GENERATED · VERIFY. Recommendation only; the final decision stays with the authorized reviewer.
            </p>
          </div>

          {result.assessment && (
            <ClampBlock
              label="Reasoning"
              text={result.assessment}
              closedLabel="Show full assessment"
            />
          )}
        </>
      ) : null}

      {(showFailure || showTimeout) && onRetry && (
        <div className="cw-ai__actions">
          <button
            type="button"
            className="cw-btn cw-btn--secondary"
            onClick={onRetry}
            disabled={retrying}
            aria-busy={retrying || undefined}
          >
            Retry analysis
          </button>
          {retryError && <p className="cw-muted cw-ai__retry-error">{retryError}</p>}
        </div>
      )}
    </section>
  )
}
