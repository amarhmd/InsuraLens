import { useState } from 'react'
import { initials, validateProfile, type Profile, type ProfileErrors } from '../../lib/settingsStore'
import { SectionHeader, SettingsGroup, SettingsSaveBar, useDraft } from './settingsKit'

type Props = {
  value: Profile
  onSave: (next: Profile, toastMessage: string) => void
}

const FIELDS: Array<{
  key: 'fullName' | 'displayName' | 'jobTitle' | 'email'
  label: string
  required: boolean
  type: string
  autoComplete: string
  help?: string
}> = [
  { key: 'fullName', label: 'Full Name', required: true, type: 'text', autoComplete: 'name' },
  {
    key: 'displayName',
    label: 'Display Name',
    required: false,
    type: 'text',
    autoComplete: 'nickname',
    help: 'Optional. Shown instead of your full name where the workspace displays a nickname.',
  },
  { key: 'jobTitle', label: 'Job Title', required: true, type: 'text', autoComplete: 'organization-title' },
  {
    key: 'email',
    label: 'Work Email',
    required: true,
    type: 'email',
    autoComplete: 'email',
    help: 'Displayed in this demo only — editing it does not change any sign-in or account credentials.',
  },
]

/**
 * My Profile — default settings section. The summary reads saved values;
 * the edit form works on a draft that only reaches the store on Save, so
 * Cancel genuinely discards.
 */
export function ProfileSettings({ value, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [errors, setErrors] = useState<ProfileErrors>({})
  const { draft, setDraft, patch, dirty } = useDraft(value)

  const cancel = () => {
    setErrors({})
    setDraft(value)
    setEditing(false)
  }

  const save = () => {
    const found = validateProfile(draft)
    setErrors(found)
    const firstInvalid = (Object.keys(found) as Array<keyof ProfileErrors>)[0]
    if (firstInvalid) {
      document.getElementById(`profile-${firstInvalid}`)?.focus()
      return
    }
    onSave(
      {
        ...draft,
        fullName: draft.fullName.trim(),
        displayName: draft.displayName.trim(),
        jobTitle: draft.jobTitle.trim(),
        email: draft.email.trim(),
      },
      'Profile updated in this demo',
    )
    setEditing(false)
  }

  const aka = draft.displayName.trim()

  return (
    <>
      <SectionHeader
        title="My Profile"
        description="Manage the personal information associated with your InsuraLens workspace."
      />

      <div className="st-profile">
        <span className="st-avatar" aria-hidden="true">
          {initials(value.fullName)}
        </span>
        <div className="st-profile__id">
          <p className="st-profile__name">{value.fullName}</p>
          <p className="st-profile__email">{value.email}</p>
          {aka && aka !== value.fullName && (
            <p className="st-profile__aka">Display name: {aka}</p>
          )}
        </div>
        <div className="st-profile__chips">
          <span className="st-chip">{value.role}</span>
          <span className="st-chip">{value.workspace}</span>
        </div>
        {!editing && (
          <div className="st-profile__action">
            <button type="button" className="claims-btn" onClick={() => setEditing(true)}>
              Edit Profile
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <>
          <SettingsGroup
            title="Personal information"
            hint="Changes apply to this demo workspace only. Nothing is sent to a server."
          >
            <div className="st-form">
              {FIELDS.map((field) => {
                const error = errors[field.key]
                const helpId = `profile-${field.key}-help`
                const errorId = `profile-${field.key}-error`
                return (
                  <div key={field.key}>
                    <label className="claims-field__label" htmlFor={`profile-${field.key}`}>
                      {field.label}
                      <span className="claims-field__req">
                        {field.required ? 'Required' : 'Optional'}
                      </span>
                    </label>
                    <input
                      id={`profile-${field.key}`}
                      className="claims-field__control"
                      type={field.type}
                      autoComplete={field.autoComplete}
                      value={draft[field.key]}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? errorId : field.help ? helpId : undefined}
                      onChange={(event) => {
                        setErrors((prev) => ({ ...prev, [field.key]: undefined }))
                        patch({ [field.key]: event.target.value } as Partial<Profile>)
                      }}
                    />
                    {error ? (
                      <p className="claims-field__error" id={errorId}>
                        {error}
                      </p>
                    ) : field.help ? (
                      <p className="claims-field__help" id={helpId}>
                        {field.help}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </SettingsGroup>
          <SettingsSaveBar dirty={dirty} onSave={save} onCancel={cancel} />
        </>
      ) : (
        <p className="st-hint">
          Use Edit Profile to change how your name and details appear in this demo workspace.
          Changes are stored locally in this browser.
        </p>
      )}
    </>
  )
}
