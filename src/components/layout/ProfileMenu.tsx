import { useEffect, useRef } from 'react'
import { getSettings, initials } from '../../lib/settingsStore'
import { navigate } from '../../lib/router'

type Props = {
  onClose: () => void
}

/**
 * The inline profile panel under the sidebar user card. It states the demo
 * identity from the shared settings store (name, role, email), marks the
 * session as DEMO MODE, and returns the reviewer to the sign-in screen.
 * Nothing here is real authentication — no credentials are read or stored.
 */
export function ProfileMenu({ onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const profile = getSettings().profile

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onDocClick = (e: MouseEvent) => {
      /* The panel closes itself; clicks inside it are handled by its buttons. */
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDocClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDocClick)
    }
  }, [onClose])

  const signOut = () => {
    onClose()
    navigate({ name: 'login' })
  }

  return (
    <div className="pfm" ref={panelRef}>
      <div className="pfm__identity">
        <span className="pfm__avatar" aria-hidden="true">
          {initials(profile.fullName)}
        </span>
        <div className="pfm__id">
          <p className="pfm__name">{profile.fullName}</p>
          <p className="pfm__role">{profile.role}</p>
          <p className="pfm__email">{profile.email}</p>
        </div>
        <span className="pfm__badge" title="All identity and preference changes are demo-only">
          DEMO MODE
        </span>
      </div>

      <p className="pfm__note">
        Frontend demo — no sign-in service. Identity and preference changes exist only in your
        browser and reset on refresh.
      </p>

      <div className="pfm__footer">
        <button type="button" className="pfm__link" onClick={signOut}>
          Back to sign in
        </button>
      </div>
    </div>
  )
}