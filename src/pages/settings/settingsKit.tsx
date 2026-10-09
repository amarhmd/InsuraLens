import { useEffect, useId, useState, type ReactNode } from 'react'
import { cx } from '../../lib/cx'

/* ==========================================================================
   Shared building blocks for #/settings: section headers, groups, rows,
   toggles, pill/card radio groups, definition lists, and the save bar that
   closes every editable section.
   ========================================================================== */

/* -------------------------------------------------------------------------- */
/* Section header                                                              */
/* -------------------------------------------------------------------------- */

export function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="st-head">
      <h2 className="st-title">{title}</h2>
      <p className="st-desc">{description}</p>
    </header>
  )
}

/* -------------------------------------------------------------------------- */
/* Group — a titled block of related settings, separated by dividers           */
/* -------------------------------------------------------------------------- */

type GroupProps = {
  title: string
  hint?: string
  chip?: string
  action?: ReactNode
  children: ReactNode
}

export function SettingsGroup({ title, hint, chip, action, children }: GroupProps) {
  const id = useId()
  return (
    <section className="st-group" aria-labelledby={id}>
      <div className="st-group__head">
        <h3 className="st-group__title" id={id}>
          {title}
        </h3>
        {chip && <span className="st-chip st-chip--info">{chip}</span>}
        {action && <span className="st-group__action">{action}</span>}
        {hint && <p className="st-group__hint">{hint}</p>}
      </div>
      <div className="st-group__rows">{children}</div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Row — label + helper text on the left, control on the right                */
/* -------------------------------------------------------------------------- */

type RowProps = {
  label: string
  hint?: string
  /** Associates a plain <label> with the control when the control is a single input. */
  htmlFor?: string
  children: ReactNode
}

export function SettingRow({ label, hint, htmlFor, children }: RowProps) {
  return (
    <div className="st-row">
      <div className="st-row__text">
        {htmlFor ? (
          <label className="st-row__label" htmlFor={htmlFor}>
            {label}
          </label>
        ) : (
          <span className="st-row__label">{label}</span>
        )}
        {hint && <p className="st-row__hint">{hint}</p>}
      </div>
      <div className="st-row__control">{children}</div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Toggle — an accessible switch (role="switch", keyboard operable)           */
/* -------------------------------------------------------------------------- */

type ToggleProps = {
  id: string
  checked: boolean
  onChange: (next: boolean) => void
}

function Toggle({ id, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      className={cx('st-switch', checked && 'st-switch--on')}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="st-switch__knob" aria-hidden="true" />
    </button>
  )
}

type ToggleRowProps = {
  id: string
  label: string
  hint?: string
  checked: boolean
  onChange: (next: boolean) => void
}

export function ToggleRow({ id, label, hint, checked, onChange }: ToggleRowProps) {
  return (
    <div className="st-toggle">
      <div className="st-toggle__text">
        <label className="st-toggle__label" htmlFor={id}>
          {label}
        </label>
        {hint && <p className="st-toggle__hint">{hint}</p>}
      </div>
      <Toggle id={id} checked={checked} onChange={onChange} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Radio groups                                                                */
/* -------------------------------------------------------------------------- */

type PillOption = { value: string; label: string }

type PillsProps = {
  name: string
  legend: string
  hint?: string
  /** Render the legend visibly above the pills (defaults to screen-reader only). */
  visibleLegend?: boolean
  segmented?: boolean
  options: ReadonlyArray<PillOption>
  value: string
  onChange: (value: string) => void
}

/** Radio pills — native inputs underneath, so arrow-key navigation is free. */
export function RadioPills({
  name,
  legend,
  hint,
  visibleLegend,
  segmented,
  options,
  value,
  onChange,
}: PillsProps) {
  return (
    <fieldset className="st-pills">
      <legend className={cx('st-pills__legend', !visibleLegend && 'sr-only')}>{legend}</legend>
      <div className={cx('st-pills__set', segmented && 'st-pills__set--seg')}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cx('st-pill', option.value === value && 'st-pill--on')}
          >
            <input
              className="st-pill__input"
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {hint && <p className="st-pills__hint">{hint}</p>}
    </fieldset>
  )
}

type CardOption = { value: string; label: string; desc: string }

type CardsProps = {
  name: string
  legend: string
  hint?: string
  options: ReadonlyArray<CardOption>
  value: string
  onChange: (value: string) => void
}

/** Radio cards — label, description, and a visible native radio. */
export function RadioCards({ name, legend, hint, options, value, onChange }: CardsProps) {
  return (
    <fieldset className="st-cards">
      <legend className="st-legend">{legend}</legend>
      <div className="st-cards__set">
        {options.map((option) => (
          <label
            key={option.value}
            className={cx('st-card', option.value === value && 'st-card--on')}
          >
            <input
              className="st-card__input"
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span className="st-card__title">{option.label}</span>
            <span className="st-card__desc">{option.desc}</span>
          </label>
        ))}
      </div>
      {hint && <p className="st-cards__hint">{hint}</p>}
    </fieldset>
  )
}

/* -------------------------------------------------------------------------- */
/* Definition lists — read-only information rows                               */
/* -------------------------------------------------------------------------- */

export function DefList({ children }: { children: ReactNode }) {
  return <dl className="st-defs">{children}</dl>
}

export function DefRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="st-def">
      <dt className="st-def__label">{label}</dt>
      <dd className="st-def__value">{children}</dd>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Save bar — the consistent close of every editable section                   */
/* -------------------------------------------------------------------------- */

type SaveBarProps = {
  dirty: boolean
  onSave: () => void
  onCancel: () => void
  saveLabel?: string
  cancelLabel?: string
}

export function SettingsSaveBar({
  dirty,
  onSave,
  onCancel,
  saveLabel = 'Save Changes',
  cancelLabel = 'Cancel',
}: SaveBarProps) {
  return (
    <div className="st-save">
      <p className="st-save__status" role="status">
        {dirty ? (
          <>
            <span className="st-save__dot" aria-hidden="true" />
            You have unsaved changes
          </>
        ) : (
          'No unsaved changes'
        )}
      </p>
      <div className="st-save__actions">
        <button type="button" className="claims-btn" onClick={onCancel} disabled={!dirty}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className="claims-btn claims-btn--primary"
          onClick={onSave}
          disabled={!dirty}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Draft state — value in, draft + dirty out; re-syncs when the saved value     */
/* changes underneath (a reset from another action, a save that normalizes).   */
/* -------------------------------------------------------------------------- */

export function useDraft<T>(value: T) {
  const [draft, setDraft] = useState<T>(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  return {
    draft,
    setDraft,
    patch: (partial: Partial<T>) =>
      setDraft((prev) => ({ ...prev, ...partial } as T)),
    dirty: JSON.stringify(draft) !== JSON.stringify(value),
  }
}
