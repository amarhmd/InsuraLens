import {
  RESPONSE_FORMAT_OPTIONS,
  RESPONSE_DETAIL_OPTIONS,
  type AiPreferences,
} from '../../lib/settingsStore'
import {
  RadioCards,
  RadioPills,
  SectionHeader,
  SettingsGroup,
  SettingsSaveBar,
  ToggleRow,
  useDraft,
} from './settingsKit'

type Props = {
  value: AiPreferences
  onSave: (next: AiPreferences, toastMessage: string) => void
}

const SUMMARY_SENTENCES = [
  'Photos, the repair estimate, and the driver statement are linked to this claim.',
  'One item still needs reviewer verification before it can be relied on.',
  'Nothing here is decided automatically — a reviewer makes the final call.',
]

const EVIDENCE_ITEMS = [
  { text: 'Damage photos are consistent with the reported rear impact.', source: 'Photos 1–4' },
  {
    text: 'Repair estimate includes line items not present in the initial photos.',
    source: 'Repair estimate',
  },
  { text: 'Driver statement timing matches the incident record.', source: 'Statement p. 1' },
]

function detailCount(detail: AiPreferences['detail']): number {
  return detail === 'brief' ? 1 : detail === 'balanced' ? 2 : 3
}

/**
 * AI Review Preferences — presentation only. Everything here changes how the
 * demo shows findings; the preview panel below makes that concrete without
 * touching any model, and the reminder states plainly that humans decide.
 */
export function AIReviewSettings({ value, onSave }: Props) {
  const { draft, patch, dirty } = useDraft(value)

  const count = detailCount(draft.detail)
  const sentences = SUMMARY_SENTENCES.slice(0, count)
  const items = EVIDENCE_ITEMS.slice(0, count)
  const formatLabel =
    RESPONSE_FORMAT_OPTIONS.find((option) => option.value === draft.format)?.label ?? ''
  const detailLabel =
    RESPONSE_DETAIL_OPTIONS.find((option) => option.value === draft.detail)?.label ?? ''

  return (
    <>
      <SectionHeader
        title="AI Review Preferences"
        description="Configure how AI-assisted findings are presented during claim investigations."
      />

      <SettingsGroup
        title="Finding presentation"
        hint="Presentation only — these preferences do not change any model or its capabilities."
      >
        <RadioCards
          name="ai-format"
          legend="Preferred response format"
          options={RESPONSE_FORMAT_OPTIONS}
          value={draft.format}
          onChange={(format) => patch({ format: format as AiPreferences['format'] })}
        />
      </SettingsGroup>

      <SettingsGroup
        title="Display options"
        hint="Control what is emphasised around a finding during review."
      >
        <ToggleRow
          id="ai-show-sources"
          label="Show source references whenever available"
          hint="Make it easier to trace AI-generated findings back to supporting claim documents."
          checked={draft.showSources}
          onChange={(showSources) => patch({ showSources })}
        />
        <ToggleRow
          id="ai-uncertainty"
          label="Highlight uncertainty and missing evidence"
          hint="Make incomplete information and findings requiring verification more visible."
          checked={draft.highlightUncertainty}
          onChange={(highlightUncertainty) => patch({ highlightUncertainty })}
        />
        <ToggleRow
          id="ai-inconsistencies"
          label="Highlight potential inconsistencies between sources"
          hint="Help reviewers identify items that may warrant further investigation."
          checked={draft.highlightInconsistencies}
          onChange={(highlightInconsistencies) => patch({ highlightInconsistencies })}
        />
      </SettingsGroup>

      <SettingsGroup title="Response detail">
        <RadioPills
          name="ai-detail"
          legend="Response detail"
          visibleLegend
          segmented
          options={RESPONSE_DETAIL_OPTIONS}
          value={draft.detail}
          onChange={(detail) => patch({ detail: detail as AiPreferences['detail'] })}
          hint="How much detail demo responses show when they follow this preference."
        />
      </SettingsGroup>

      <div className="st-note">
        <svg
          className="st-note__icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11.2v5M12 7.9h.01" />
        </svg>
        <div>
          <p className="st-note__title">Human review remains essential</p>
          <p className="st-note__body">
            AI-generated findings support investigation. They do not independently approve or
            reject insurance claims.
          </p>
        </div>
      </div>

      {/* Preview — the same setting, applied. Sample content, presentation only. */}
      <div className="st-preview" aria-label="Presentation preview">
        <div className="st-preview__head">
          <span className="st-preview__label">Presentation preview</span>
          <span className="st-chip st-chip--info">
            {formatLabel} · {detailLabel}
          </span>
        </div>
        <div className="st-preview__body">
          {draft.format === 'concise' && <p className="st-preview__p">{sentences.join(' ')}</p>}

          {draft.format === 'detailed' && (
            <ul className="st-preview__list">
              {items.map((item) => (
                <li key={item.text}>
                  {item.text}
                  {draft.showSources && <span className="st-preview__src"> ({item.source})</span>}
                </li>
              ))}
            </ul>
          )}

          {draft.format === 'structured' && (
            <>
              <p className="st-preview__h">Summary</p>
              <p className="st-preview__p">{sentences[0]}</p>
              <p className="st-preview__h">Evidence considered</p>
              <ul className="st-preview__list">
                {items.map((item) => (
                  <li key={item.text}>
                    {item.text}
                    {draft.showSources && (
                      <span className="st-preview__src"> ({item.source})</span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="st-preview__h">Open items</p>
              <p className="st-preview__p">
                {draft.highlightUncertainty
                  ? sentences[1] ?? sentences[0]
                  : 'No open items surfaced at this detail level.'}
              </p>
            </>
          )}

          {draft.highlightUncertainty && (
            <span className="st-flag">Requires verification — evidence incomplete</span>
          )}

          {draft.highlightInconsistencies && (
            <p className="st-preview__flag">
              Potential inconsistency: the repair estimate lists work beyond the initially
              documented damage.
            </p>
          )}

          {draft.showSources && (
            <p className="st-preview__src st-preview__src--block">
              Sources: Police report · Damage photos · Repair estimate
            </p>
          )}

          <p className="st-preview__note">
            Sample content shown for demonstration — presentation only.
          </p>
        </div>
      </div>

      <SettingsSaveBar
        dirty={dirty}
        saveLabel="Save AI Preferences"
        onSave={() => onSave(draft, 'AI preferences saved in this demo')}
        onCancel={() => patch({ ...value })}
      />
    </>
  )
}
