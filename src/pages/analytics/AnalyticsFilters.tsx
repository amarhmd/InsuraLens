import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import {
  DATE_RANGE_OPTIONS,
  DEFAULT_FILTERS,
  INCIDENT_FILTER_OPTIONS,
  WORKFLOW_FILTER_OPTIONS,
  activeFilterCount,
  type AnalyticsFilters as FilterState,
  type DateRangeKey,
  type IncidentFilterKey,
  type WorkflowFilterKey,
} from '../../lib/analyticsData'

type Props = {
  filters: FilterState
  onChange: (filters: FilterState) => void
  onReset: () => void
  /** Claims currently in the selection — mirrored into the status live region. */
  count: number
  /** Full sentence describing the selection, announced on change. */
  statusText: string
  /** Trailing controls (the Export button) — right-aligned with the toolbar. */
  children?: ReactNode
}

/**
 * Date range first, then incident type, then workflow status. A changed
 * control is marked three ways so colour is never the only signal: a thicker
 * border, the "N filters active" chip, and a Reset button that is only
 * enabled when there is something to reset.
 */
export function AnalyticsFilters({ filters, onChange, onReset, count, statusText, children }: Props) {
  const active = activeFilterCount(filters)

  return (
    <section className="ax-filters" aria-label="Analytics filters">
      <div className="ax-filters__field">
        <label className="ax-filters__label" htmlFor="ax-filter-date">
          Date Range
        </label>
        <select
          id="ax-filter-date"
          className={cx('claims-select', filters.dateRange !== DEFAULT_FILTERS.dateRange && 'ax-select--on')}
          value={filters.dateRange}
          onChange={(event) =>
            onChange({ ...filters, dateRange: event.target.value as DateRangeKey })
          }
        >
          {DATE_RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="ax-filters__field">
        <label className="ax-filters__label" htmlFor="ax-filter-incident">
          Incident Type
        </label>
        <select
          id="ax-filter-incident"
          className={cx('claims-select', filters.incident !== 'all' && 'ax-select--on')}
          value={filters.incident}
          onChange={(event) =>
            onChange({ ...filters, incident: event.target.value as IncidentFilterKey })
          }
        >
          {INCIDENT_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="ax-filters__field">
        <label className="ax-filters__label" htmlFor="ax-filter-workflow">
          Workflow Status
        </label>
        <select
          id="ax-filter-workflow"
          className={cx('claims-select', filters.workflow !== 'all' && 'ax-select--on')}
          value={filters.workflow}
          onChange={(event) =>
            onChange({ ...filters, workflow: event.target.value as WorkflowFilterKey })
          }
        >
          {WORKFLOW_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="ax-filters__end">
        {active > 0 && (
          <span className="ax-chip ax-chip--on">
            {active} filter{active === 1 ? '' : 's'} active
          </span>
        )}

        <div className="ax-filters__status" role="status">
          <span className="ax-chip">
            {count} claim{count === 1 ? '' : 's'} in view
          </span>
          <span className="sr-only">{statusText}</span>
        </div>

        <button
          type="button"
          className="claims-btn ax-reset"
          onClick={onReset}
          disabled={active === 0}
        >
          Reset Filters
        </button>

        {children}
      </div>
    </section>
  )
}
