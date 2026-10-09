import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

export type SettingsSectionKey =
  | 'profile'
  | 'preferences'
  | 'notifications'
  | 'ai'
  | 'workspace'
  | 'privacy'
  | 'about'

type SectionMeta = { key: SettingsSectionKey; label: string }

const SETTINGS_SECTIONS: SectionMeta[] = [
  { key: 'profile', label: 'My Profile' },
  { key: 'preferences', label: 'Preferences' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'ai', label: 'AI Review Preferences' },
  { key: 'workspace', label: 'Workspace' },
  { key: 'privacy', label: 'Privacy & Security' },
  { key: 'about', label: 'About InsuraLens' },
]

type Props = {
  active: SettingsSectionKey
  onChange: (key: SettingsSectionKey) => void
}

/**
 * Compact settings navigation: a vertical list on desktop, a labelled
 * dropdown above the content on small screens (the list is display:none
 * there, so only one control is ever exposed to assistive technology).
 */
export function SettingsNavigation({ active, onChange }: Props) {
  const sections = SETTINGS_SECTIONS

  return (
    <>
      <nav className="st-nav" aria-label="Settings sections">
        <ul className="st-nav__list">
          {sections.map((section) => {
            const isActive = section.key === active
            return (
              <li key={section.key} className="st-nav__item">
                <button
                  type="button"
                  className={cx('st-nav__btn', isActive && 'st-nav__btn--active')}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onChange(section.key)}
                >
                  <span className="st-nav__icon" aria-hidden="true">
                    <SectionIcon name={section.key} />
                  </span>
                  <span>{section.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="st-mobile">
        <label className="st-mobile__label" htmlFor="settings-section-select">
          Settings section
        </label>
        <select
          id="settings-section-select"
          className="claims-select"
          value={active}
          onChange={(event) => onChange(event.target.value as SettingsSectionKey)}
        >
          {sections.map((section) => (
            <option key={section.key} value={section.key}>
              {section.label}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

/* Same 1.5px line-icon language as the sidebar nav; decorative only — every
   icon sits beside visible text. */
function SectionIcon({ name }: { name: SettingsSectionKey }) {
  const paths: Record<SettingsSectionKey, ReactNode> = {
    profile: (
      <>
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5.5 19c1.4-3 3.8-4.5 6.5-4.5s5.1 1.5 6.5 4.5" />
      </>
    ),
    preferences: (
      <>
        <path d="M4 7h9M17.5 7H20M4 17h3.5M12 17h8" />
        <circle cx="15.5" cy="7" r="2" />
        <circle cx="10" cy="17" r="2" />
      </>
    ),
    notifications: (
      <>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>
    ),
    ai: (
      <>
        <rect x="7" y="7" width="10" height="10" rx="2" />
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      </>
    ),
    workspace: (
      <>
        <path d="M4 20V7l7-3 7 3v13" />
        <path d="M9 20v-5h6v5M8.5 10h.01M12 10h.01M15.5 10h.01" />
      </>
    ),
    privacy: (
      <>
        <path d="M12 3l7 3v5.5c0 4-3 7.4-7 8.5-4-1.1-7-4.5-7-8.5V6z" />
        <path d="M12 9.5V13M12 16.3h.01" />
      </>
    ),
    about: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11.2v5M12 7.9h.01" />
      </>
    ),
  }
  return (
    <svg
      width="16"
      height="16"
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
