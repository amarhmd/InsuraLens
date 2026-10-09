import type { KeyboardEvent } from 'react'
import type { AttentionRow } from '../../lib/analyticsData'
import type { Claim } from '../../lib/claimsData'
import { incidentLabel, priorityLabel } from '../../lib/constants'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { cx } from '../../lib/cx'

const PRIORITY_TONE: Record<Claim['priority'], string> = {
  high: 'claims-dot--critical',
  medium: 'claims-dot--amber',
  low: 'claims-dot--gray',
}

type Props = {
  rows: AttentionRow[]
  onOpen: (claim: Claim) => void
  onViewAll: () => void
}

/**
 * The bridge from analytics back into the work queue. Every row carries the
 * claim's own fields plus a review issue derived from them — the same
 * derivation the Claims page would show — and the whole row opens the claim
 * workspace, Enter and Space included.
 */
export function PriorityClaimsTable({ rows, onOpen, onViewAll }: Props) {
  const handleRowKeyDown = (claim: Claim) => (event: KeyboardEvent<HTMLTableRowElement>) => {
    /* Let keys pressed on the Review button behave as button keys. */
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen(claim)
    }
  }

  return (
    <section className="panel ax-panel" aria-labelledby="ax-attention-title">
      <div className="ax-panel__head">
        <h2 className="ax-panel__title" id="ax-attention-title">
          Claims requiring attention
        </h2>
        <button type="button" className="claims-btn" onClick={onViewAll}>
          View All Claims
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="ax-table-empty">
          No claims in this selection need attention right now.
        </p>
      ) : (
        <div className="claims-table-wrap">
          <table className="claims-table">
            <caption className="sr-only">
              Claims requiring attention in the current selection — highest priority first,
              most recently updated first within each priority. Completed claims are excluded.
              Select a row to open the claim workspace.
            </caption>
            <thead>
              <tr>
                <th className="claims-th" scope="col">
                  Claim ID
                </th>
                <th className="claims-th" scope="col">
                  Incident Type
                </th>
                <th className="claims-th" scope="col">
                  Evidence Status
                </th>
                <th className="claims-th" scope="col">
                  Review Issue
                </th>
                <th className="claims-th" scope="col">
                  Priority
                </th>
                <th className="claims-th" scope="col">
                  Current Status
                </th>
                <th className="claims-th" scope="col">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ claim, issue }) => (
                <tr
                  key={claim.id}
                  tabIndex={0}
                  aria-label={`Open claim ${claim.id}`}
                  onClick={() => onOpen(claim)}
                  onKeyDown={handleRowKeyDown(claim)}
                >
                  <td className="claims-td claims-td--id" data-label="Claim ID">
                    {claim.id}
                  </td>
                  <td className="claims-td" data-label="Incident Type">
                    {incidentLabel(claim.incident)}
                  </td>
                  <td className="claims-td" data-label="Evidence Status">
                    <span className="claims-dotline">
                      <span
                        className={cx(
                          'claims-dot',
                          claim.evidence === 'Complete'
                            ? 'claims-dot--green'
                            : 'claims-dot--amber',
                        )}
                        aria-hidden="true"
                      />
                      {claim.evidence}
                    </span>
                  </td>
                  <td className="claims-td" data-label="Review Issue">
                    {issue}
                  </td>
                  <td className="claims-td" data-label="Priority">
                    <span className="claims-dotline claims-dotline--strong">
                      <span
                        className={cx('claims-dot', PRIORITY_TONE[claim.priority])}
                        aria-hidden="true"
                      />
                      {priorityLabel(claim.priority)}
                    </span>
                  </td>
                  <td className="claims-td" data-label="Current Status">
                    <StatusBadge status={claim.status} />
                  </td>
                  <td className="claims-td claims-td--actions" data-label="Action">
                    <button
                      type="button"
                      className="ax-rowbtn"
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpen(claim)
                      }}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
