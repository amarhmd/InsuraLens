import { useState } from 'react'
import {
  DATE_FORMAT_OPTIONS,
  DENSITY_OPTIONS,
  LANDING_OPTIONS,
  LANGUAGE_OPTIONS,
  THEME_OPTIONS,
  TIME_ZONE_OPTIONS,
  type Preferences,
} from '../../lib/settingsStore'
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog'
import {
  RadioPills,
  SectionHeader,
  SettingRow,
  SettingsGroup,
  SettingsSaveBar,
  useDraft,
} from './settingsKit'

type Props = {
  value: Preferences
  onSave: (next: Preferences, toastMessage: string) => void
  onReset: () => void
}

/**
 * Preferences — appearance, language, time zone, date format, landing page,
 * and table density. Two of these really do affect the prototype (landing
 * page is read by the login flow; density drives a data attribute the claims
 * table honors); the rest are honest prototype preferences and say so.
 */
export function PreferencesSettings({ value, onSave, onReset }: Props) {
  const [confirming, setConfirming] = useState(false)
  const { draft, patch, dirty } = useDraft(value)

  return (
    <>
      <SectionHeader
        title="Preferences"
        description="Customize how InsuraLens looks and behaves during your daily work."
      />

      <SettingsGroup title="Appearance">
        <SettingRow
          label="Theme"
          hint="This prototype ships one light theme — your choice is stored as a demo preference only."
        >
          <RadioPills
            name="pref-theme"
            legend="Theme"
            options={THEME_OPTIONS}
            value={draft.theme}
            onChange={(theme) => patch({ theme: theme as Preferences['theme'] })}
          />
        </SettingRow>

        <SettingRow
          label="Language"
          htmlFor="pref-language"
          hint="Interface text stays English in this prototype; this stores your language preference."
        >
          <select
            id="pref-language"
            className="claims-select"
            value={draft.language}
            onChange={(event) => patch({ language: event.target.value as Preferences['language'] })}
          >
            {LANGUAGE_OPTIONS.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </SettingRow>

        <SettingRow label="Time zone" htmlFor="pref-timezone" hint="Select your working time zone.">
          <select
            id="pref-timezone"
            className="claims-select"
            value={draft.timeZone}
            onChange={(event) => patch({ timeZone: event.target.value })}
          >
            {TIME_ZONE_OPTIONS.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="Format and layout">
        <SettingRow label="Date format">
          <RadioPills
            name="pref-date"
            legend="Date format"
            options={DATE_FORMAT_OPTIONS.map((value) => ({ value, label: value }))}
            value={draft.dateFormat}
            onChange={(dateFormat) => patch({ dateFormat: dateFormat as Preferences['dateFormat'] })}
          />
        </SettingRow>

        <SettingRow
          label="Default landing page"
          hint="Page shown after signing in to the demo."
        >
          <RadioPills
            name="pref-landing"
            legend="Default landing page"
            options={LANDING_OPTIONS}
            value={draft.landing}
            onChange={(landing) => patch({ landing: landing as Preferences['landing'] })}
          />
        </SettingRow>

        <SettingRow label="Table density" hint="Row height in the Claims table.">
          <RadioPills
            name="pref-density"
            legend="Table density"
            segmented
            options={DENSITY_OPTIONS}
            value={draft.density}
            onChange={(density) => patch({ density: density as Preferences['density'] })}
          />
        </SettingRow>
      </SettingsGroup>

      <SettingsSaveBar
        dirty={dirty}
        onSave={() => onSave(draft, 'Preferences saved in this demo')}
        onCancel={() => patch({ ...value })}
      />

      <div className="st-danger">
        <div className="st-danger__text">
          <p className="st-danger__title">Reset preferences</p>
          <p className="st-danger__hint">
            Restore the default demo preferences in this section. Other sections are not affected.
          </p>
        </div>
        <button type="button" className="claims-btn" onClick={() => setConfirming(true)}>
          Reset to defaults
        </button>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Reset preferences?"
          body="This restores the default demo preferences in this section. Saved profile, notification, and AI review settings are not affected."
          confirmLabel="Reset preferences"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false)
            onReset()
          }}
        />
      )}
    </>
  )
}
