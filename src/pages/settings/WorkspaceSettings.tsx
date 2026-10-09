import { useEffect, useRef, useState } from 'react'
import {
  DEMO_MODULES,
  WORKSPACE_ID,
  WORKSPACE_MEMBERS,
  WORKSPACE_TYPE,
  initials,
  validateWorkspaceName,
  type WorkspaceInfo,
} from '../../lib/settingsStore'
import { CloseIcon } from '../../components/ui/icons'
import {
  DefList,
  DefRow,
  SectionHeader,
  SettingsGroup,
} from './settingsKit'

type Props = {
  value: WorkspaceInfo
  /** The signed-in demo user's role, read live so a profile edit shows up here. */
  role: string
  onSave: (next: WorkspaceInfo, toastMessage: string) => void
}

/**
 * Workspace — read-only configuration plus a working edit modal for the two
 * editable fields. Members are clearly labelled illustrative: this prototype
 * has no member management.
 */
export function WorkspaceSettings({ value, role, onSave }: Props) {
  const [editing, setEditing] = useState(false)

  return (
    <>
      <SectionHeader
        title="Workspace"
        description="View the configuration and basic information for your current workspace."
      />

      <SettingsGroup title="Workspace overview">
        <DefList>
          <DefRow label="Workspace name">{value.displayName}</DefRow>
          <DefRow label="Workspace type">{WORKSPACE_TYPE}</DefRow>
          <DefRow label="Workspace description">{value.description}</DefRow>
        </DefList>
      </SettingsGroup>

      <SettingsGroup
        title="Workspace details"
        action={
          <button type="button" className="claims-btn" onClick={() => setEditing(true)}>
            Edit Workspace Details
          </button>
        }
      >
        <DefList>
          <DefRow label="Current workspace">{value.displayName}</DefRow>
          <DefRow label="Your role">{role}</DefRow>
          <DefRow label="Available demo modules">
            <ul className="st-links">
              {DEMO_MODULES.map((module) => (
                <li key={module.label}>
                  <a className="st-link" href={module.hash}>
                    {module.label}
                  </a>
                </li>
              ))}
            </ul>
          </DefRow>
          <DefRow label="Workspace identifier">
            <code className="st-code">{WORKSPACE_ID}</code>
          </DefRow>
        </DefList>
      </SettingsGroup>

      <SettingsGroup
        title="Members"
        chip="Illustrative demo data"
        hint="Member management is not part of this prototype — this list is sample content only."
      >
        <div className="st-members">
          {WORKSPACE_MEMBERS.map((member) => (
            <div className="st-member" key={member.name}>
              <span className="st-avatar st-avatar--sm" aria-hidden="true">
                {initials(member.name)}
              </span>
              <span className="st-member__name">{member.name}</span>
              <span className="st-member__role">{member.role}</span>
              {member.you && <span className="st-chip st-chip--info">You</span>}
            </div>
          ))}
        </div>
      </SettingsGroup>

      {editing && (
        <WorkspaceEditDialog
          value={value}
          onClose={() => setEditing(false)}
          onSave={(next) => {
            setEditing(false)
            onSave(next, 'Workspace details updated in this demo')
          }}
        />
      )}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Edit modal — local state only, mirrors the CreateClaimModal interaction     */
/* -------------------------------------------------------------------------- */

type DialogProps = {
  value: WorkspaceInfo
  onClose: () => void
  onSave: (next: WorkspaceInfo) => void
}

function WorkspaceEditDialog({ value, onClose, onSave }: DialogProps) {
  const [displayName, setDisplayName] = useState(value.displayName)
  const [description, setDescription] = useState(value.description)
  const [error, setError] = useState<string | undefined>(undefined)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = () => {
    const nameError = validateWorkspaceName(displayName)
    if (nameError) {
      setError(nameError)
      firstFieldRef.current?.focus()
      return
    }
    onSave({
      displayName: displayName.trim(),
      description: description.trim() || value.description,
    })
  }

  return (
    <div className="claims-modal__backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="claims-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ws-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="claims-modal__head">
          <h2 className="claims-modal__title" id="ws-dialog-title">
            Edit Workspace Details
          </h2>
          <button
            type="button"
            className="claims-modal__close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="claims-modal__body">
          <div className="claims-form__grid">
            <div className="claims-field--full">
              <label className="claims-field__label" htmlFor="ws-display-name">
                Workspace Display Name
                <span className="claims-field__req">Required</span>
              </label>
              <input
                id="ws-display-name"
                ref={firstFieldRef}
                className="claims-field__control"
                type="text"
                value={displayName}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'ws-display-name-error' : undefined}
                onChange={(event) => {
                  setDisplayName(event.target.value)
                  setError(undefined)
                }}
              />
              {error && (
                <p className="claims-field__error" id="ws-display-name-error">
                  {error}
                </p>
              )}
            </div>

            <div className="claims-field--full">
              <label className="claims-field__label" htmlFor="ws-description">
                Workspace Description
                <span className="claims-field__req">Optional</span>
              </label>
              <textarea
                id="ws-description"
                className="claims-field__control"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>

          <p className="claims-modal__note">
            Saved locally in this demo. The sidebar picks the name up when the page next renders.
          </p>
        </div>

        <div className="claims-modal__foot">
          <button type="button" className="claims-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="claims-btn claims-btn--primary" onClick={submit}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
