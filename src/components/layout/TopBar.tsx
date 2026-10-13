import { useEffect, useState } from 'react'
import { Breadcrumbs } from './Breadcrumbs'
import { NotificationsMenu } from './NotificationsMenu'
import { MenuIcon } from './icons'

type Props = {
  /** Opens the sidebar drawer on small viewports. */
  onMenu: () => void
  /** Slash-separated trail, e.g. "Workspace / Claims". */
  breadcrumb?: string
  /** Show the DEMO DATA marker. Defaults to true — every page runs on demo data. */
  demo?: boolean
}

/**
 * The compact global top bar (48px): breadcrumb + DEMO DATA pill at the start,
 * notifications at the end. It is sticky and translucent, and only gains a
 * shadow once the page has scrolled. Page titles live in the content area
 * (PageHeader) rather than here.
 *
 * No global search, command palette, theme toggle, or user menu — theme is a
 * Settings concern and the profile already lives in the sidebar.
 */
export function TopBar({ onMenu, breadcrumb = 'Workspace / Dashboard', demo = true }: Props) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="top-bar" data-scrolled={scrolled || undefined}>
      <div className="top-bar__start">
        <button
          type="button"
          className="top-bar__menu"
          aria-label="Open navigation"
          onClick={onMenu}
        >
          <MenuIcon />
        </button>

        <Breadcrumbs label={breadcrumb} />

        {demo && (
          <span
            className="top-bar__demo"
            title="All data, identities, and permissions are simulated for this frontend demo"
          >
            <span className="top-bar__demo-dot" aria-hidden="true" />
            Demo data
          </span>
        )}
      </div>

      <div className="top-bar__end">
        <NotificationsMenu />
      </div>
    </header>
  )
}
