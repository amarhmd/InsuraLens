import { useState } from 'react'
import { cx } from '../../lib/cx'
import { getSettings, initials } from '../../lib/settingsStore'
import { ProfileMenu } from './ProfileMenu'

type SidebarKey = 'dashboard' | 'claims' | 'chat' | 'analytics' | 'settings'

type SidebarProps = {
  open?: boolean
  /** Which main nav item reads as active. Defaults to Dashboard. */
  active?: SidebarKey
}

const NAV: Array<{ key: SidebarKey; label: string; href: string }> = [
  { key: 'dashboard', label: 'Dashboard', href: '#/dashboard' },
  { key: 'claims', label: 'Claims', href: '#/claims' },
  { key: 'chat', label: 'Agent Chat', href: '#/chat' },
  { key: 'analytics', label: 'Analytics', href: '#/analytics' },
  { key: 'settings', label: 'Settings', href: '#/settings' },
]

export function AppSidebar({ open, active = 'dashboard' }: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const profile = getSettings().profile

  return (
    <aside className={cx('sidebar', open && 'sidebar--open')}>
      <div className="sidebar__top">
        <img src="/insuralens-logo.png" alt="InsuraLens" className="sidebar__logo" />
        <div className="sidebar__workspace">{getSettings().workspace.displayName}</div>
      </div>

      <nav className="sidebar__nav" aria-label="Main navigation">
        <ul className="sidebar__nav-list">
          {NAV.map((item) => {
            const isActive = item.key === active
            return (
              <li key={item.key} className="sidebar__nav-item">
                <a
                  href={item.href}
                  className={cx('sidebar__nav-link', isActive && 'sidebar__nav-link--active')}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <NavIcon name={item.key} />
                  <span>{item.label}</span>
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="sidebar__bottom">
        <span className="sidebar__avatar" aria-hidden="true">
          {initials(profile.fullName)}
        </span>
        <div className="sidebar__user-info">
          <div className="sidebar__user-name">{profile.fullName}</div>
          <div className="sidebar__user-role">{profile.role}</div>
        </div>
        <button
          className="sidebar__user-menu"
          aria-label={menuOpen ? 'Close user menu' : 'Open user menu'}
          aria-expanded={menuOpen}
          title="User menu"
          onClick={() => setMenuOpen((was) => !was)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d={menuOpen ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
          </svg>
        </button>
      </div>

      {menuOpen && <ProfileMenu onClose={() => setMenuOpen(false)} />}
    </aside>
  )
}

/* Minimal 24x24 line icons — one consistent 1.5px stroke set. */
function NavIcon({ name }: { name: SidebarKey }) {
  const paths = {
    dashboard: <path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 9h8V3h-8z" />,
    claims: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h5" />
      </>
    ),
    chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    analytics: <path d="M18 20V10M12 20V4M6 20v-6" />,
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.34.4.62.73.79" />
      </>
    ),
  }
  return (
    <svg
      className="sidebar__nav-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  )
}