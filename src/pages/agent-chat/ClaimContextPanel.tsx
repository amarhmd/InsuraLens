import type { ReactNode } from 'react'
import { evidenceBreakdown, type EvidenceRow } from '../../lib/chatData'
import type { Claim } from '../../lib/claimsData'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { cx } from '../../lib/cx'
import { StatusStepper, type Step } from './StatusStepper'
import { FileIcon, ImageIcon, InfoIcon, NoteIcon, ShieldIcon } from './chatIcons'

type Props = {
  claim: Claim | undefined
  highlightedId: string | null
  onOpenSource: (sourceId: string) => void
  onClose: () => void
}

const FILE_LABEL: Record<string, [singular: string, plural: string]> = {
  'accident-report': ['file', 'files'],
  'vehicle-photos': ['file', 'files'],
  'customer-statement': ['item', 'items'],
  'policy-documents': ['file', 'files'],
}

const SOURCE: Record<string, { name: string; icon: ReactNode }> = {
  'accident-report': { name: 'Accident Report', icon: <FileIcon size={16} /> },
  'vehicle-photos': { name: 'Vehicle Photos', icon: <ImageIcon size={16} /> },
  'customer-statement': { name: 'Customer Statement', icon: <NoteIcon size={16} /> },
  'policy-documents': { name: 'Policy Documents', icon: <ShieldIcon size={16} /> },
}

/* Illustrative review sequence — read from the same mock claim, not live data. */
const STEPS: Step[] = [
  { state: 'complete', label: 'Evidence collection', value: 'Complete' },
  { state: 'complete', label: 'AI analysis', value: 'Available' },
  { state: 'attention', label: 'Policy review', value: 'Needs reviewer attention' },
  { state: 'pending', label: 'Final decision', value: 'Pending human review' },
]

const rowLabel = (row: EvidenceRow) => {
  const [one, many] = FILE_LABEL[row.sourceId] ?? ['file', 'files']
  return `${row.count} ${row.count === 1 ? one : many}`
}

export function ClaimContextPanel({ claim, highlightedId, onOpenSource, onClose }: Props) {
  const breakdown = evidenceBreakdown(claim)
  const total = breakdown.reduce((sum, row) => sum + row.count, 0)

  return (
    <div className="chat-ctx">
      <div className="chat-ctx__head">
        <h2 className="chat-ctx__title">Claim context</h2>
        <button
          type="button"
          className="chat-panel__close chat-ctx__close"
          aria-label="Close claim context panel"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {!claim ? (
        <div className="chat-ctx__empty">
          <p className="chat-ctx__empty-title">No claim selected</p>
          <p className="chat-ctx__empty-text">
            Select a claim from the Claims page, or open one through a conversation, to ground
            the investigation in claim evidence.
          </p>
        </div>
      ) : (
        <>
          <section className="chat-ctx__summary" aria-label="Claim summary">
            <div className="chat-ctx__summary-head">
              <span className="chat-ctx__claim-id">{claim.id}</span>
              <div className="chat-ctx__badges">
                <StatusBadge status={claim.status} />
                <StatusBadge status={claim.priority} />
              </div>
            </div>
            <dl className="chat-ctx__fields">
              <div className="chat-ctx__field">
                <dt>Incident</dt>
                <dd>{claim.incident}</dd>
              </div>
              <div className="chat-ctx__field">
                <dt>Reported</dt>
                <dd>{claim.dateReported}</dd>
              </div>
            </dl>
          </section>

          <section className="chat-ctx__section" aria-label="Evidence available">
            <div className="chat-ctx__section-head">
              <h3 className="chat-ctx__section-title">Evidence available</h3>
              <span className="chat-ctx__total">
                {total} evidence item{total === 1 ? '' : 's'}
              </span>
            </div>
            <ul className="chat-ctx__evidence">
              {breakdown.map((row) => {
                const meta = SOURCE[row.sourceId] ?? { name: row.sourceId, icon: <FileIcon size={16} /> }
                const isHi = highlightedId === row.sourceId
                return (
                  <li key={row.sourceId} className="chat-ctx__evidence-item">
                    <button
                      type="button"
                      className={cx('chat-ctx__evidence-btn', isHi && 'is-highlighted')}
                      onClick={() => onOpenSource(row.sourceId)}
                      aria-label={`Preview ${meta.name}`}
                    >
                      <span className="chat-ctx__evidence-icon" aria-hidden="true">
                        {meta.icon}
                      </span>
                      <span className="chat-ctx__evidence-main">
                        <span className="chat-ctx__evidence-name">{meta.name}</span>
                        <span className="chat-ctx__evidence-count">{rowLabel(row)}</span>
                      </span>
                      {row.sourceId === 'vehicle-photos' && (
                        <span className="chat-ctx__thumbs" aria-hidden="true">
                          {Array.from({ length: Math.min(row.count, 3) }).map((_, i) => (
                            <span key={i} className="chat-ctx__thumb">
                              <ImageIcon size={14} />
                            </span>
                          ))}
                        </span>
                      )}
                    </button>
                    {isHi && <span className="chat-ctx__evidence-flag">Last previewed</span>}
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="chat-ctx__section" aria-label="Investigation status">
            <h3 className="chat-ctx__section-title">Investigation status</h3>
            <StatusStepper steps={STEPS} />
          </section>

          <p className="chat-ctx__disclaimer">
            <InfoIcon size={15} />
            <span>AI analysis is not an approval — final decisions remain with a human reviewer.</span>
          </p>

          <a className="chat-ctx__workspace-btn" href={`#/claims/${encodeURIComponent(claim.id)}`}>
            Open Claim Workspace
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </>
      )}
    </div>
  )
}
