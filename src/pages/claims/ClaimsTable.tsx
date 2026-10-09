import { Fragment, useState, type KeyboardEvent } from 'react'
import type { Claim, SortDir, SortKey, SortState } from '../../lib/claimsData'
import { incidentLabel, priorityLabel } from '../../lib/constants'
import { cx } from '../../lib/cx'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ClaimRowActions, type RowAction } from './ClaimRowActions'
import { COLUMNS, type ColumnKey } from './claimsColumns'

type Props = {
  rows: Claim[]
  visible: Record<ColumnKey, boolean>
  sort: SortState
  onSortToggle: (key: SortKey) => void
  onOpenClaim: (claim: Claim) => void
  onRowAction: (action: RowAction, claim: Claim) => void
}

/** Tone modifier for the small AI badge inside the Evidence column. */
const AI_TONE: Record<Claim['aiAnalysis'], 'green' | 'blue' | 'amber' | 'gray'> = {
  Available: 'green',
  Processing: 'blue',
  Incomplete: 'amber',
  'Not started': 'gray',
}

const PRIORITY_TONE: Record<Claim['priority'], string> = {
  high: 'claims-dot--critical',
  medium: 'claims-dot--amber',
  low: 'claims-dot--gray',
}

/**
 * The work queue. Compact, dense, one line per claim — horizontal dividers
 * only, hover highlight, whole row clickable (Enter/Space too). Status and
 * priority always pair colour with a text label. Evidence and AI analysis
 * share one column; policy match lives in the expandable row detail so all
 * nine columns fit a 1366px container without horizontal scroll.
 */
export function ClaimsTable({ rows, visible, sort, onSortToggle, onOpenClaim, onRowAction }: Props) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const rowKeyDown = (claim: Claim) => (e: KeyboardEvent<HTMLTableRowElement>) => {
    /* Inner controls (detail chevron, kebab menu) own their own keys. */
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpenClaim(claim)
    }
  }

  const renderHeader = (col: (typeof COLUMNS)[number]) => {
    if (!visible[col.key]) return null

    if (col.sortable) {
      const active = sort.key === col.key
      const dir: SortDir | null = active ? sort.dir : null
      return (
        <th
          key={col.key}
          scope="col"
          className="claims-th claims-th--sortable"
          aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        >
          <button type="button" className="claims-th__btn" onClick={() => onSortToggle(col.key as SortKey)}>
            {col.label}
            <span className={cx('claims-th__caret', active && 'claims-th__caret--on')} aria-hidden="true">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d={active && dir === 'asc' ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
              </svg>
            </span>
          </button>
        </th>
      )
    }

    return (
      <th key={col.key} scope="col" className="claims-th">
        {col.label}
      </th>
    )
  }

  const visibleCount = COLUMNS.filter((col) => visible[col.key]).length

  return (
    <div className="claims-table-wrap">
      <table className="claims-table">
        <caption className="sr-only">
          Claims work queue. Select a row to open the claim workspace.
        </caption>
        <thead>
          <tr>{COLUMNS.map((col) => renderHeader(col))}</tr>
        </thead>
        <tbody>
          {rows.map((claim) => {
            const open = expanded.has(claim.id)
            return (
              <Fragment key={claim.id}>
                <tr
                  tabIndex={0}
                  onClick={() => onOpenClaim(claim)}
                  onKeyDown={rowKeyDown(claim)}
                  aria-label={`Open claim ${claim.id}, ${claim.customer}`}
                >
                  {visible.id && (
                    <td className="claims-td claims-td--id" data-label="Claim ID">
                      {claim.id}
                      <span className="claims-cell-sub">{claim.policyRef}</span>
                    </td>
                  )}
                  {visible.customer && (
                    <td className="claims-td" data-label="Customer">
                      {claim.customer}
                    </td>
                  )}
                  {visible.incident && (
                    <td className="claims-td" data-label="Incident Type">
                      {incidentLabel(claim.incident)}
                    </td>
                  )}
                  {visible.date && (
                    <td className="claims-td claims-td--num" data-label="Date Reported">
                      {claim.dateReported}
                    </td>
                  )}
                  {visible.evidence && (
                    <td className="claims-td" data-label="Evidence">
                      <span className="claims-cell-evidence">
                        {claim.evidenceItems} item{claim.evidenceItems === 1 ? '' : 's'}
                        <span
                          className={cx(
                            claim.evidence === 'Incomplete' && 'claims-cell-evidence__state--warn',
                          )}
                        >
                          {' · '}
                          {claim.evidence}
                        </span>
                      </span>
                      <span className="claims-cell-sub">
                        <span
                          className={cx('claims-ai-badge', `claims-ai-badge--${AI_TONE[claim.aiAnalysis]}`)}
                          title={`AI analysis: ${claim.aiAnalysis}`}
                        >
                          <span className="claims-ai-badge__dot" aria-hidden="true" />
                          AI: {claim.aiAnalysis}
                        </span>
                      </span>
                    </td>
                  )}
                  {visible.priority && (
                    <td className="claims-td" data-label="Priority">
                      <span className="claims-dotline claims-dotline--strong">
                        <span className={cx('claims-dot', PRIORITY_TONE[claim.priority])} aria-hidden="true" />
                        {priorityLabel(claim.priority)}
                      </span>
                    </td>
                  )}
                  {visible.status && (
                    <td className="claims-td" data-label="Status">
                      <StatusBadge status={claim.status} />
                    </td>
                  )}
                  {visible.updated && (
                    <td className="claims-td claims-td--muted" data-label="Last Updated">
                      {claim.updatedLabel}
                    </td>
                  )}
                  {visible.actions && (
                    <td className="claims-td claims-td--actions" data-label="Actions">
                      <span className="claims-row-actions">
                        <button
                          type="button"
                          className={cx('claims-expand', open && 'claims-expand--open')}
                          aria-expanded={open}
                          aria-controls={`claim-detail-${claim.id}`}
                          aria-label={`${open ? 'Hide' : 'Show'} details for ${claim.id}`}
                          title={`${open ? 'Hide' : 'Show'} details for ${claim.id}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleExpanded(claim.id)
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                        <ClaimRowActions claim={claim} onAction={onRowAction} />
                      </span>
                    </td>
                  )}
                </tr>

                {open && (
                  <tr className="claims-detail-row" id={`claim-detail-${claim.id}`}>
                    <td className="claims-detail" colSpan={visibleCount}>
                      <div className="claims-detail__grid">
                        <div>
                          <div className="claims-detail__label">Policy match</div>
                          <StatusBadge status={claim.policyMatch} />
                        </div>
                        <div>
                          <div className="claims-detail__label">AI analysis</div>
                          <span className="claims-dotline">
                            <span
                              className={cx('claims-dot', `claims-dot--${AI_TONE[claim.aiAnalysis]}`)}
                              aria-hidden="true"
                            />
                            {claim.aiAnalysis}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
