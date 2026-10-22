import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppSidebar } from '../../components/layout/AppSidebar'
import { TopBar } from '../../components/layout/TopBar'
import { PageHeader } from '../../components/layout/PageHeader'
import { ToastNotification } from '../../components/feedback/ToastNotification'
import { BellIcon } from '../../components/layout/icons'
import { SparkleIcon, UserIcon } from '../../components/ui/icons'
import { useSettingsValue } from '../../hooks/useSettingsValue'
import { saveSettings, type Settings } from '../../lib/settingsStore'
import { useIdentity } from '../../lib/identity'
import { SettingsNav, type NavSection } from './SettingsNav'
import { ProfileSettings } from './ProfileSettings'
import { NotificationSettings } from './NotificationSettings'
import { AIReviewSettings } from './AIReviewSettings'

/* The three cards on the page, in order. Ids match the <section> ids below and
   the targets the section nav scrolls to. Defined once so the array identity is
   stable across renders (the nav's IntersectionObserver depends on it). */
const SECTIONS: ReadonlyArray<NavSection> = [
  { id: 'settings-profile', label: 'Profile', icon: <UserIcon size={16} /> },
  { id: 'settings-ai', label: 'AI review', icon: <SparkleIcon size={16} /> },
  { id: 'settings-notifications', label: 'Notifications', icon: <BellIcon size={16} /> },
]

/**
 * #/settings — My Profile, AI Review Preferences, and Notifications, stacked as
 * cards on one page. Every save goes through the shared store so the login
 * landing page, the claims table density, and the sidebar workspace name pick
 * changes up without any page reaching into another page's state.
 */
export function SettingsPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const settings = useSettingsValue()
  const identity = useIdentity()

  /* The session user (GET /api/auth/me), already carrying any locally saved
     Edit Profile override, is the base; the stored profile only fills the
     fields while the identity is still loading — so the card, the sidebar and
     the profile menu can never drift apart, and no fabricated identity shows. */
  const profileValue = useMemo(
    () => ({
      ...settings.profile,
      fullName: identity?.name || settings.profile.fullName || '',
      email: identity?.email || settings.profile.email || '',
      role: identity?.role || settings.profile.role || '',
    }),
    [settings.profile, identity],
  )

  /* Settings used to live behind a sub-menu. Anything still pointing at a
     sub-route — a deep link, or a same-document hash change — lands on the
     single page instead. */
  useEffect(() => {
    const normalize = () => {
      if (window.location.hash.startsWith('#/settings/')) {
        window.location.hash = '#/settings'
      }
    }
    normalize()
    window.addEventListener('hashchange', normalize)
    return () => window.removeEventListener('hashchange', normalize)
  }, [])

  const persist = useCallback((patch: Partial<Settings>, message: string) => {
    saveSettings(patch)
    setToast(message)
  }, [])

  return (
    <div className="dashboard-shell">
      <AppSidebar open={menuOpen} active="settings" />
      {menuOpen && (
        <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}

      <main className="main" id="main">
        <TopBar onMenu={() => setMenuOpen((open) => !open)} breadcrumb="Workspace / Settings" />

        <div className="dashboard-content settings-page">
          <div className="st-layout">
            <SettingsNav sections={SECTIONS} />

            <div className="st-content">
              <PageHeader
                title="Settings"
                subtitle="Manage your profile and how AI assists your review."
              />

              <div className="st-stack">
                <section id="settings-profile" className="st-panel" aria-label="My Profile">
                  <ProfileSettings
                    value={profileValue}
                    onSave={(next, message) => persist({ profile: next }, message)}
                  />
                </section>

                <section id="settings-ai" className="st-panel" aria-label="AI Review Preferences">
                  <AIReviewSettings />
                </section>

                <section
                  id="settings-notifications"
                  className="st-panel"
                  aria-label="Notifications"
                >
                  <NotificationSettings />
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
                AI helps connect and explain evidence. Humans remain responsible for the final decision.
              </p>
            </div>
          </div>
        </div>
      </main>

      {toast && (
        <ToastNotification key={toast} message={toast} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
