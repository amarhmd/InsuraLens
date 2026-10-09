import { evidenceBreakdown, type EvidenceRow } from '../../lib/chatData'
import type { Claim } from '../../lib/claimsData'
import { StatusBadge } from '../../components/ui/StatusBadge'

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

const SOURCE_NAME: Record<string, string> = {
  'accident-report': 'Accident Report',
  'vehicle-photos': 'Vehicle Photos',
  'customer-statement': 'Customer Statement',
  'policy-documents': 'Policy Documents',
}

const rowLabel = (row: EvidenceRow) => {
  const [one, many] = FILE_LABEL[row.sourceId] ?? ['file', 'files']
  return `${row.count} ${row.count === 1 ? one : many}`
}

export function ClaimContextPanel({
  claim,
  highlightedId,
  onOpenSource,
  onClose,
}: Props) {
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
            <span className="chat-ctx__claim-id">{claim.id}</span>
            <dl className="chat-ctx__fields">
              <div className="chat-ctx__field">
                <dt>Incident</dt>
                <dd>{claim.incident}</dd>
              </div>
              <div className="chat-ctx__field">
                <dt>Reported</dt>
                <dd>{claim.dateReported}</dd>
              </div>
              <div className="chat-ctx__field">
                <dt>Current status</dt>
                <dd>
                  <StatusBadge status={claim.status} />
                </dd>
              </div>
              <div className="chat-ctx__field">
                <dt>Priority</dt>
                <dd>
                  <StatusBadge status={claim.priority} />
                </dd>
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
                const isHi = highlightedId === row.sourceId
                return (
                  <li key={row.sourceId}>
                    <button
                      type="button"
                      className={`chat-ctx__evidence-btn${isHi ? ' is-highlighted' : ''}`}
                      onClick={() => onOpenSource(row.sourceId)}
                      aria-label={`Preview ${SOURCE_NAME[row.sourceId] ?? row.sourceId}`}
                    >
                      <span className="chat-ctx__evidence-name">
                        {SOURCE_NAME[row.sourceId] ?? row.sourceId}
                      </span>
                      <span className="chat-ctx__evidence-count">{rowLabel(row)}</span>
                    </button>
                    {isHi && (
                      <span className="chat-ctx__evidence-flag">Last previewed</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="chat-ctx__section" aria-label="Investigation status">
            <h3 className="chat-ctx__section-title">Investigation status</h3>
            <ul className="chat-ctx__status-list">
              <StatusRow state="complete" label="Evidence collection" value="Complete" />
              <StatusRow state="complete" label="AI analysis" value="Available" />
              <StatusRow state="attention" label="Policy review" value="Requires reviewer attention" />
              <StatusRow state="pending" label="Final decision" value="Pending human review" />
            </ul>
            <p className="chat-ctx__status-note">
              An available AI analysis is not an approval — final decisions remain with an
              authorized reviewer.
            </p>
          </section>

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

function StatusRow({
  state,
  label,
  value,
}: {
  state: 'complete' | 'attention' | 'pending'
  label: string
  value: string
}) {
  return (
    <li className={`chat-ctx__status chat-ctx__status--${state}`}>
      <span className="chat-ctx__status-dot" aria-hidden="true" />
      <span className="chat-ctx__status-label">{label}</span>
      <span className="chat-ctx__status-value">{value}</span>
    </li>
  )
}


