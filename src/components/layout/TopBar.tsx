import { useEffect, useState } from 'react'
import { cx } from '../../lib/cx'
import { Breadcrumbs } from './Breadcrumbs'
import { NotificationsMenu } from './NotificationsMenu'
import { MenuIcon } from './icons'

type Props = {
  /** Opens the sidebar drawer on small viewports. */
  onMenu: () => void
  /** Slash-separated trail, e.g. "Workspace / Claims". */
  breadcrumb?: string
}

/**
 * The floating global top bar (76px): breadcrumb at the start, notifications
 * bell at the end. It carries the same navy→teal brand recipe as the sidebar —
 * mirrored on a shallower axis and with the teal glow in the top-right corner —
 * floats 16px in from the content area's top/left/right edges, and is sticky so
 * it stays visible on scroll, gaining a stronger shadow once the page has moved.
 *
 * Identity has a single interactive home in the sidebar user block, so this bar
 * carries no avatar or user menu — it adds no routing, data or behaviour. Page
 * titles live in the content area (PageHeader) rather than here.
 *
 * No global search, command palette, or theme toggle — theme is a Settings
 * concern.
 */
export function TopBar({ onMenu, breadcrumb = 'Workspace / Dashboard' }: Props) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={cx('top-bar', scrolled && 'top-bar--scrolled')}>
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
      </div>

      <div className="top-bar__end">
        <NotificationsMenu />
      </div>
    </header>
  )
}
