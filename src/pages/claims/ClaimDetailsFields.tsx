import type { Ref } from 'react'
import { INCIDENT_TYPE_OPTIONS, PRIORITY_OPTIONS } from '../../lib/constants'
import { cx } from '../../lib/cx'
import type { ClaimDraft } from './CreateClaimModal'

/** Max characters for the incident-description textarea. */
const DESCRIPTION_MAX = 2000

/** Latest pickable incident date — the demo anchor (Oct 6 2026). */
const INCIDENT_DATE_MAX = '2026-10-06'

export type ClaimField = Exclude<keyof ClaimDraft, 'photos' | 'documents'>
export type ClaimRequiredField = 'customer' | 'date' | 'incident'
export type ClaimFieldErrors = Partial<Record<keyof ClaimDraft, string>>

type Props = {
  values: Pick<
    ClaimDraft,
    'customer' | 'date' | 'incident' | 'description' | 'policyRef' | 'priority'
  >
  errors: ClaimFieldErrors
  firstFieldRef: Ref<HTMLInputElement>
  onChange: (key: ClaimField, value: string) => void
  onBlurField: (key: ClaimRequiredField) => void
}

/**
 * The top of the create-claim form — the six detail fields (customer,
 * incident date, incident type, description, policy reference, initial
 * priority) with their inline validation messaging. Field values, errors,
 * and blur validation stay owned by the modal; this component only renders.
 */
export function ClaimDetailsFields({
  values,
  errors,
  firstFieldRef,
  onChange,
  onBlurField,
}: Props) {
  return (
    <div className="claims-form__grid">
      <div className="claims-field claims-field--full">
        <label className="claims-field__label" htmlFor="claim-customer">
          Customer Name <span className="claims-field__req">Required</span>
        </label>
        <input
          ref={firstFieldRef}
          id="claim-customer"
          className="claims-field__control"
          type="text"
          autoComplete="off"
          placeholder="e.g. Priya Raman"
          value={values.customer}
          aria-invalid={errors.customer ? true : undefined}
          aria-describedby={errors.customer ? 'claim-customer-error' : undefined}
          onChange={(e) => onChange('customer', e.target.value)}
          onBlur={() => onBlurField('customer')}
        />
        {errors.customer && (
          <p className="claims-field__error" id="claim-customer-error">
            {errors.customer}
          </p>
        )}
      </div>

      <div className="claims-field">
        <label className="claims-field__label" htmlFor="claim-date">
          Incident Date <span className="claims-field__req">Required</span>
        </label>
        <input
          id="claim-date"
          className="claims-field__control"
          type="date"
          max={INCIDENT_DATE_MAX}
          value={values.date}
          aria-invalid={errors.date ? true : undefined}
          aria-describedby={errors.date ? 'claim-date-error' : undefined}
          onChange={(e) => onChange('date', e.target.value)}
          onBlur={() => onBlurField('date')}
        />
        {errors.date && (
          <p className="claims-field__error" id="claim-date-error">
            {errors.date}
          </p>
        )}
      </div>

      <div className="claims-field">
        <label className="claims-field__label" htmlFor="claim-incident">
          Incident Type <span className="claims-field__req">Required</span>
        </label>
        <select
          id="claim-incident"
          className="claims-field__control"
          value={values.incident}
          aria-invalid={errors.incident ? true : undefined}
          aria-describedby={errors.incident ? 'claim-incident-error' : undefined}
          onChange={(e) => onChange('incident', e.target.value)}
          onBlur={() => onBlurField('incident')}
        >
          <option value="">Select incident type</option>
          {INCIDENT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.incident && (
          <p className="claims-field__error" id="claim-incident-error">
            {errors.incident}
          </p>
        )}
      </div>

      <div className="claims-field claims-field--full">
        <label className="claims-field__label" htmlFor="claim-description">
          Incident description
          <span
            className={cx(
              'claims-field__count',
              values.description.length >= DESCRIPTION_MAX && 'claims-field__count--max',
            )}
            id="claim-description-count"
          >
            {values.description.length} / {DESCRIPTION_MAX}
          </span>
        </label>
        <textarea
          id="claim-description"
          className="claims-field__control"
          rows={5}
          maxLength={DESCRIPTION_MAX}
          placeholder="What happened? A few sentences is enough."
          value={values.description}
          aria-describedby="claim-description-help claim-description-count"
          onChange={(e) => onChange('description', e.target.value)}
        />
        <p className="claims-field__help" id="claim-description-help">
          Optional — visible to reviewers.
        </p>
      </div>

      <div className="claims-field">
        <label className="claims-field__label" htmlFor="claim-policy">
          Policy Number or Reference
        </label>
        <input
          id="claim-policy"
          className="claims-field__control"
          type="text"
          autoComplete="off"
          placeholder="e.g. POL-48291"
          value={values.policyRef}
          onChange={(e) => onChange('policyRef', e.target.value)}
        />
        <p className="claims-field__help">Optional — assign later if not yet known.</p>
      </div>

      <div className="claims-field">
        <label className="claims-field__label" htmlFor="claim-priority">
          Initial Priority
        </label>
        <select
          id="claim-priority"
          className="claims-field__control"
          value={values.priority}
          onChange={(e) => onChange('priority', e.target.value)}
        >
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="claims-field__help">Reviewers can adjust this at any time.</p>
      </div>
    </div>
  )
}