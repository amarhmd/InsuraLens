import { useEffect, useState, type ReactNode } from 'react'
import { cx } from '../../lib/cx'

export type NavSection = {
  /** DOM id of the section this item scrolls to and spies on. */
  id: string
  label: string
  icon: ReactNode
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Section navigation for #/settings. On desktop it is a sticky vertical list
 * beside the cards; below 900px the stylesheet turns it into a horizontal,
 * scrollable tab bar. The active item tracks the section nearest the top of
 * the viewport through an IntersectionObserver, and clicking an item scrolls
 * that section under the sticky top bar (instantly when the visitor prefers
 * reduced motion).
 */
export function SettingsNav({ sections }: { sections: ReadonlyArray<NavSection> }) {
  const [active, setActive] = useState(() => sections[0]?.id ?? '')

  useEffect(() => {
    /* Scroll-spy is browser-only; the effect never runs during SSR. */
    if (typeof window === 'undefined') return
    const nodes = sections
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => node !== null)
    if (nodes.length === 0) return

    /* Offsets clear the floating top bar (bottom edge 92px desktop / 72px
       compact) and, on the compact layout, the horizontal section tabs — see
       .st-panel scroll-margin-top in settings.css. Must stay above the settle
       line so the jumped-to section reads as current. */
    const OFFSET = window.innerWidth <= 900 ? 168 : 128

    /* Recompute from live geometry rather than an observer's partial entries:
       the section whose top has passed the offset line is the current one, and
       the last section wins once the page is scrolled to the bottom. */
    const pick = () => {
      const doc = document.documentElement
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 2) {
        setActive(nodes[nodes.length - 1].id)
        return
      }
      let current = nodes[0].id
      for (const node of nodes) {
        if (node.getBoundingClientRect().top - OFFSET <= 0) current = node.id
        else break
      }
      setActive(current)
    }

    /* IntersectionObserver fires when a card crosses the band under the top
       bar. A rAF-throttled scroll pass backs it up, because a card taller than
       the band can cross the line without crossing a ratio threshold. */
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        pick()
      })
    }

    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(pick, {
            rootMargin: `-${OFFSET}px 0px -55% 0px`,
            threshold: [0, 0.25, 0.5, 1],
          })
    if (observer) nodes.forEach((node) => observer.observe(node))
    window.addEventListener('scroll', onScroll, { passive: true })
    pick()

    return () => {
      observer?.disconnect()
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [sections])

  const jump = (id: string) => {
    const node = document.getElementById(id)
    if (!node) return
    setActive(id)
    node.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  return (
    <nav className="st-nav" aria-label="Settings sections">
      <ul className="st-nav__list">
        {sections.map((section) => {
          const current = section.id === active
          return (
            <li className="st-nav__item" key={section.id}>
              <button
                type="button"
                className={cx('st-nav__btn', current && 'st-nav__btn--active')}
                aria-current={current ? 'true' : undefined}
                onClick={() => jump(section.id)}
              >
                <span className="st-nav__icon" aria-hidden="true">
                  {section.icon}
                </span>
                {section.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
