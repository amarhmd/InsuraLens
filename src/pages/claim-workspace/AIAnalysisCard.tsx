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
  /** The mapped analysis — the only thing this card ever renders. */
  result: AnalysisResult
  /** A run is in flight — show the skeleton instead of the settled result. */
  running: boolean
  /** Live status line from the current run (kept after it settles). */
  status: string | null
  /** Cleaned failure text from the current run, when the claim's own analysis
      does not carry one yet (e.g. the run could not even start). */
  runError: string | null
  /** Retry performs the same action as the header's "Run AI analysis". */
  onRetry?: () => void
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
 * States: empty (never run), loading (skeleton while the header's Run action
 * is in flight), success ("Analyzed" badge), and failed (cleaned message +
 * Retry inside this card — any output the run did produce stays visible).
 * A denied recommendation is a red-tinted hint, never a decision: AI output
 * never approves, confirms or dismisses anything; the final call stays with
 * the reviewer.
 */
export function AIAnalysisCard({
  result,
  running,
  status,
  runError,
  onRetry,
  showBadges,
}: AIAnalysisCardProps) {
  const loading = running || result.status === 'loading'
  const failedMessage =
    runError ??
    (result.status === 'failed'
      ? 'The analysis did not finish. Check the evidence and run it again.'
      : null)
  /* A failed run may still have produced usable output (e.g. the detected
     damage text) — keep showing it above the fold; only the badge stays off. */
  const showResult =
    result.status === 'success' ||
    (result.status === 'failed' &&
      Boolean(
        result.damageSummary ||
          result.assessment ||
          result.proposedDecision ||
          result.inconsistency.flagged,
      ))
  const decision = result.proposedDecision

  return (
    <section className="cw-card cw-section cw-ai" id="cw-ai-analysis" aria-labelledby="cw-ai-title">
      <div className="cw-section__head">
        <h2 className="cw-section__title cw-ai__title" id="cw-ai-title">
          <SparkleIcon size={16} />
          AI analysis
        </h2>
        <span className="cw-ai__head-end">
          {showResult && result.status === 'success' && !loading && (
            <span className="cw-badge cw-badge--supported">Analyzed</span>
          )}
          {showBadges && <span className="cw-tag">AI-GENERATED · VERIFY</span>}
        </span>
      </div>

      {/* Live line: loading/result changes are announced politely. */}
      <p className="cw-ai__status" aria-live="polite">
        {status ?? (running ? 'Running the analysis…' : '')}
      </p>

      {/* Failure lives here, never in the page header — and always as a clean
          sentence; raw backend errors are replaced in the mapper. */}
      {failedMessage && (
        <div className="cw-ai__alert" role="alert">
          <AlertTriangleIcon size={18} className="cw-ai__alert-icon" />
          <div className="cw-ai__alert-body">
            <p className="cw-ai__alert-title">Analysis could not be completed</p>
            <p className="cw-ai__alert-text">{failedMessage}</p>
          </div>
          <button
            type="button"
            className="cw-btn cw-btn--secondary"
            onClick={onRetry}
            disabled={running}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="cw-ai__skeletons" aria-hidden="true">
          <div className="cw-ai__skeleton" />
          <div className="cw-ai__skeleton cw-ai__skeleton--short" />
          <div className="cw-ai__skeleton cw-ai__skeleton--short" />
        </div>
      ) : result.status === 'empty' ? (
        <div className="cw-ai__empty">
          <p>Run AI analysis to see findings.</p>
          <p className="cw-muted">
            The analysis reviews the uploaded evidence against the policy document.
          </p>
        </div>
      ) : showResult ? (
        <>
          {result.damageSummary && (
            <ClampBlock
              label="Damage summary"
              text={result.damageSummary}
              closedLabel="Show full summary"
            />
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
        /* Nothing usable to show — the alert above carries the message and
           the Retry button. */
        null
      )}
    </section>
  )
}
