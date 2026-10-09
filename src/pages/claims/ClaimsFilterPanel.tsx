import { useState } from 'react'
import {
  CLAIM_STATUSES,
  EMPTY_FILTERS,
  EVIDENCE_OPTIONS,
  INCIDENT_TYPES,
  POLICY_MATCH_OPTIONS,
  PRIORITIES,
  type ClaimsFilterState,
  type ClaimStatus,
  type EvidenceState,
  type IncidentType,
  type PolicyMatch,
  type Priority,
} from '../../lib/claimsData'
import { cx } from '../../lib/cx'
import { incidentLabel, priorityLabel, stageLabel } from '../../lib/constants'

type Props = {
  filters: ClaimsFilterState
  onApply: (filters: ClaimsFilterState) => void
  onClear: () => void
  onClose: () => void
}

type Group = keyof ClaimsFilterState

function toggleIn<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

/**
 * Filter popover. Edits a draft copy — nothing touches the table until
 * "Apply Filters"; "Clear All" empties the draft and applies immediately.
 */
export function ClaimsFilterPanel({ filters, onApply, onClear, onClose }: Props) {
  const [draft, setDraft] = useState<ClaimsFilterState>(filters)

  const toggle = (group: Group, value: string) => {
    setDraft((prev) => {
      const next: ClaimsFilterState = { ...prev }
      switch (group) {
        case 'statuses':
          next.statuses = toggleIn(next.statuses, value as ClaimStatus)
          break
        case 'priorities':
          next.priorities = toggleIn(next.priorities, value as Priority)
          break
        case 'incidents':
          next.incidents = toggleIn(next.incidents, value as IncidentType)
          break
        case 'evidence':
          next.evidence = toggleIn(next.evidence, value as EvidenceState)
          break
        case 'policyMatches':
          next.policyMatches = toggleIn(next.policyMatches, value as PolicyMatch)
          break
      }
      return next
    })
  }

  return (
    <div
      className="claims-popover claims-popover--filter"
      role="dialog"
      aria-label="Filter claims"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
    >
      <div className="claims-filter__group">
        <fieldset className="claims-filter__fieldset">
          <legend className="claims-filter__legend">Claim Status</legend>
          <div className="claims-filter__options">
            {CLAIM_STATUSES.map((value) => (
              <CheckPill
                key={value}
                label={stageLabel(value)}
                checked={draft.statuses.includes(value)}
                onChange={() => toggle('statuses', value)}
              />
            ))}
          </div>
        </fieldset>
      </div>

      <div className="claims-filter__group">
        <fieldset className="claims-filter__fieldset">
          <legend className="claims-filter__legend">Priority</legend>
          <div className="claims-filter__options">
            {PRIORITIES.map((value) => (
              <CheckPill
                key={value}
                label={priorityLabel(value)}
                checked={draft.priorities.includes(value)}
                onChange={() => toggle('priorities', value)}
              />
            ))}
          </div>
        </fieldset>
      </div>

      <div className="claims-filter__group">
        <fieldset className="claims-filter__fieldset">
          <legend className="claims-filter__legend">Incident Type</legend>
          <div className="claims-filter__options">
            {INCIDENT_TYPES.map((value) => (
              <CheckPill
                key={value}
                label={incidentLabel(value)}
                checked={draft.incidents.includes(value)}
                onChange={() => toggle('incidents', value)}
              />
            ))}
          </div>
        </fieldset>
      </div>

      <div className="claims-filter__group">
        <fieldset className="claims-filter__fieldset">
          <legend className="claims-filter__legend">Evidence Completeness</legend>
          <div className="claims-filter__options">
            {EVIDENCE_OPTIONS.map((value) => (
              <CheckPill
                key={value}
                label={value}
                checked={draft.evidence.includes(value)}
                onChange={() => toggle('evidence', value)}
              />
            ))}
          </div>
        </fieldset>
      </div>

      <div className="claims-filter__group">
        <fieldset className="claims-filter__fieldset">
          <legend className="claims-filter__legend">Policy Match</legend>
          <div className="claims-filter__options">
            {POLICY_MATCH_OPTIONS.map((value) => (
              <CheckPill
                key={value}
                label={value}
                checked={draft.policyMatches.includes(value)}
                onChange={() => toggle('policyMatches', value)}
              />
            ))}
          </div>
        </fieldset>
      </div>

      <div className="claims-popover__footer">
        <button
          type="button"
          className="claims-btn claims-btn--ghost"
          onClick={() => {
            setDraft(EMPTY_FILTERS)
            onClear()
          }}
        >
          Clear All
        </button>
        <button
          type="button"
          className="claims-btn claims-btn--primary"
          onClick={() => {
            onApply(draft)
            onClose()
          }}
        >
          Apply Filters
        </button>
      </div>
    </div>
  )
}

function CheckPill({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className={cx('claims-check', checked && 'claims-check--on')}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="claims-check__box" aria-hidden="true">
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 5 5 9-10" />
          </svg>
        )}
      </span>
      <span>{label}</span>
    </label>
  )
}
