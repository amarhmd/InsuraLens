import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { Claim } from '../../lib/claimsData'

export type RowAction = 'open' | 'details' | 'activity'

type Props = {
  claim: Claim
  onAction: (action: RowAction, claim: Claim) => void
}

const MENU_WIDTH = 184
const MENU_HEIGHT = 138

/**
 * Kebab menu for a single claim row. The menu is position: fixed from the
 * button's rect, so the table's horizontal scroll container can never clip it.
 * No approve/reject lives here — claim decisions belong to the workspace.
 */
export function ClaimRowActions({ claim, onAction }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const close = () => setOpen(false)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  const toggle = () => {
    if (open) {
      setOpen(false)
      return
    }
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      const top = rect.bottom + MENU_HEIGHT + 8 > window.innerHeight ? rect.top - MENU_HEIGHT - 6 : rect.bottom + 6
      const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8))
      setPos({ top, left })
    }
    setOpen(true)
  }

  const select = (action: RowAction) => (e: MouseEvent) => {
    e.stopPropagation()
    setOpen(false)
    onAction(action, claim)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="claims-kebab"
        aria-label={`Actions for ${claim.id}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Actions for ${claim.id}`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          toggle()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>

      {open && (
        <div
          className="claims-menu"
          role="menu"
          aria-label={`Actions for ${claim.id}`}
          style={{ top: pos.top, left: pos.left }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button type="button" role="menuitem" className="claims-menu__item" onClick={select('open')}>
            <MenuOpenIcon />
            Open Claim
          </button>
          <button type="button" role="menuitem" className="claims-menu__item" onClick={select('details')}>
            <MenuInfoIcon />
            View Details
          </button>
          <button type="button" role="menuitem" className="claims-menu__item" onClick={select('activity')}>
            <MenuListIcon />
            View Activity
          </button>
        </div>
      )}
    </>
  )
}

function MenuOpenIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4h6v6M20 4l-8.5 8.5" />
      <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </svg>
  )
}

function MenuInfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11.2v5M12 7.9h.01" />
    </svg>
  )
}

function MenuListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </svg>
  )
}
