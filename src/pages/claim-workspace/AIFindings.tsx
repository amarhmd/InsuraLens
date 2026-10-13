import { cx } from '../../lib/cx'
import type { BadgeTone, EvidenceItem, Finding, FindingStatus } from '../../data/claim'

const STATUS_BADGE: Record<FindingStatus, { label: string; tone: BadgeTone }> = {
  supported: { label: 'SUPPORTED', tone: 'supported' },
  needs_review: { label: 'NEEDS REVIEW', tone: 'needs' },
  info: { label: 'INFO', tone: 'info' },
}

type AIFindingsProps = {
  findings: Finding[]
  evidence: EvidenceItem[]
  /** Called when a chip is activated, to point at the evidence tile. */
  onEvidenceRef: (evidenceId: string) => void
  /** Show the chips that link a finding to its evidence (Settings → AI Review Preferences). */
  showEvidenceLinks: boolean
  /** Show the AI-GENERATED · VERIFY tag and per-finding status badges. */
  showBadges: boolean
}

/**
 * "AI findings & evidence relationships". Each finding carries its status and
 * chips that link back to the evidence it relies on. The "needs review" card is
 * visually warmed so it reads as the one requiring attention.
 */
export function AIFindings({
  findings,
  evidence,
  onEvidenceRef,
  showEvidenceLinks,
  showBadges,
}: AIFindingsProps) {
  const labelOf = (id: string) => evidence.find((item) => item.id === id)?.label ?? id

  return (
    <section className="cw-card cw-section" aria-labelledby="cw-findings-title">
      <div className="cw-section__head">
        <h2 className="cw-section__title" id="cw-findings-title">
          AI findings &amp; evidence relationships
        </h2>
        {showBadges && <span className="cw-tag">AI-GENERATED · VERIFY</span>}
      </div>

      <ul className="cw-findings">
        {findings.map((finding) => {
          const badge = STATUS_BADGE[finding.status]
          return (
            <li
              key={finding.id}
              className={cx(
                'cw-finding',
                showBadges && finding.status === 'needs_review' && 'cw-finding--needs',
              )}
            >
              <div className="cw-finding__head">
                <h3 className="cw-finding__title">{finding.title}</h3>
                {showBadges && (
                  <span className={cx('cw-badge', `cw-badge--${badge.tone}`)}>{badge.label}</span>
                )}
              </div>

              <p className="cw-finding__text">{finding.explanation}</p>

              {showEvidenceLinks && (
                <ul className="cw-chips" aria-label="Evidence this finding relies on">
                  {finding.evidenceIds.map((id) => (
                    <li key={id}>
                      <button type="button" className="cw-chip" onClick={() => onEvidenceRef(id)}>
                        {labelOf(id)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
