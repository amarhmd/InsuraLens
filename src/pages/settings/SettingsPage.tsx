import { useCallback, useEffect, useRef, useState } from 'react'
import { AppSidebar } from '../../components/layout/AppSidebar'
import { TopHeader } from '../../components/layout/TopHeader'
import { ToastNotification } from '../../components/feedback/ToastNotification'
import {
  SettingsNavigation,
  type SettingsSectionKey,
} from './SettingsNavigation'
import { ProfileSettings } from './ProfileSettings'
import { PreferencesSettings } from './PreferencesSettings'
import { NotificationSettings } from './NotificationSettings'
import { AIReviewSettings } from './AIReviewSettings'
import { WorkspaceSettings } from './WorkspaceSettings'
import { PrivacySecuritySettings } from './PrivacySecuritySettings'
import { AboutSettings } from './AboutSettings'
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  subscribeSettings,
  type Settings,
} from '../../lib/settingsStore'

/** Reads the shared settings store and re-renders on every save. */
function useSettings(): Settings {
  const [settings, setSettings] = useState(getSettings)
  useEffect(() => subscribeSettings(() => setSettings(getSettings())), [])
  return settings
}

/**
 * #/settings — profile, preferences, notifications, AI review presentation,
 * workspace, privacy, and about. Every save goes through the shared store so
 * the login landing page, the claims table density, and the sidebar workspace
 * name pick changes up without any page reaching into another page's state.
 */
export function SettingsPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [section, setSection] = useState<SettingsSectionKey>('profile')
  const [toast, setToast] = useState<string | null>(null)
  const settings = useSettings()

  const panelRef = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    panelRef.current?.focus()
  }, [section])

  const notify = useCallback((message: string) => setToast(message), [])

  const persist = useCallback(
    (patch: Partial<Settings>, message: string) => {
      saveSettings(patch)
      notify(message)
    },
    [notify],
  )

  return (
    <div className="dashboard-shell">
      <AppSidebar open={menuOpen} active="settings" />
      {menuOpen && (
        <div
          className="sidebar-scrim"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="main" id="main">
        <TopHeader
          onMenu={() => setMenuOpen((open) => !open)}
          breadcrumb="Workspace / Settings"
          title="Settings"
          subtitle="Manage your profile, workspace preferences, and review experience."
          showSearch={false}
        />

        <div className="dashboard-content settings-page">
          <div className="st-layout">
            <SettingsNavigation active={section} onChange={setSection} />

            <section
              className="st-panel"
              aria-label="Settings section"
              tabIndex={-1}
              ref={panelRef}
            >
              {section === 'profile' && (
                <ProfileSettings
                  value={settings.profile}
                  onSave={(next, message) => persist({ profile: next }, message)}
                />
              )}

              {section === 'preferences' && (
                <PreferencesSettings
                  value={settings.preferences}
                  onSave={(next, message) => persist({ preferences: next }, message)}
                  onReset={() =>
                    persist(
                      { preferences: { ...DEFAULT_SETTINGS.preferences } },
                      'Preferences reset to defaults',
                    )
                  }
                />
              )}

              {section === 'notifications' && (
                <NotificationSettings
                  value={settings.notifications}
                  onSave={(next, message) => persist({ notifications: next }, message)}
                />
              )}

              {section === 'ai' && (
                <AIReviewSettings
                  value={settings.ai}
                  onSave={(next, message) => persist({ ai: next }, message)}
                />
              )}

              {section === 'workspace' && (
                <WorkspaceSettings
                  value={settings.workspace}
                  role={settings.profile.role}
                  onSave={(next, message) => persist({ workspace: next }, message)}
                />
              )}

              {section === 'privacy' && (
                <PrivacySecuritySettings
                  profile={settings.profile}
                  workspace={settings.workspace}
                />
              )}

              {section === 'about' && <AboutSettings />}
            </section>
          </div>

          <p className="st-principle">
            <span className="st-principle__icon" aria-hidden="true">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                focusable="false"
              >
                <path d="M12 3l7 3v5.5c0 4-3 7.4-7 8.5-4-1.1-7-4.5-7-8.5V6z" />
              </svg>
            </span>
            AI helps connect and explain evidence. Humans remain responsible for the final
            decision.
          </p>
        </div>
      </main>

      {toast && (
        <ToastNotification key={toast} message={toast} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
