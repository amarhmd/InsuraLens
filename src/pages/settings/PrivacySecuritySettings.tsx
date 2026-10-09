import type { Profile, WorkspaceInfo } from '../../lib/settingsStore'
import { DefList, DefRow, SectionHeader, SettingsGroup } from './settingsKit'

type Props = {
  profile: Profile
  workspace: WorkspaceInfo
}

/**
 * Privacy & Security — informational only. The prototype has no
 * authentication, sessions, or audit trail, and says so rather than
 * inventing controls that do not exist.
 */
export function PrivacySecuritySettings({ profile, workspace }: Props) {
  return (
    <>
      <SectionHeader
        title="Privacy & Security"
        description="Review the account and privacy controls available in this prototype."
      />

      <SettingsGroup title="Account information">
        <DefList>
          <DefRow label="Signed-in demo user">
            {profile.fullName} · {profile.email}
          </DefRow>
          <DefRow label="Current workspace">{workspace.displayName}</DefRow>
          <DefRow label="Session status">
            <span className="st-badge st-badge--info">Demo session</span>
          </DefRow>
        </DefList>
      </SettingsGroup>

      <SettingsGroup title="Password">
        <p className="st-placeholder">
          Password management is unavailable in this frontend demo. There is no reset flow here,
          because nothing on this page can change a real credential.
        </p>
      </SettingsGroup>

      <SettingsGroup title="Session management">
        <p className="st-placeholder">
          No live sessions exist in this prototype. Sign-in, login history, and session controls
          are not connected to an authentication service.
        </p>
      </SettingsGroup>

      <SettingsGroup title="Data handling">
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
            <path d="M12 3l7 3v5.5c0 4-3 7.4-7 8.5-4-1.1-7-4.5-7-8.5V6z" />
            <path d="M12 9.5V13M12 16.3h.01" />
          </svg>
          <div>
            <p className="st-note__body">
              This prototype uses illustrative data and frontend state. It is not connected to a
              live insurance claims system.
            </p>
            <p className="st-note__body">
              Settings you save are stored in this browser only, and no compliance, certification,
              or enterprise security control is claimed or enforced here.
            </p>
          </div>
        </div>
      </SettingsGroup>
    </>
  )
}
