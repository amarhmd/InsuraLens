import { useEffect, useRef } from 'react'
import { initials } from '../../lib/settingsStore'
import { clearIdentity, useIdentityState } from '../../lib/identity'
import { logout } from '../../api/auth'
import { navigate } from '../../lib/router'

type Props = {
  onClose: () => void
}

/**
 * The inline profile panel under the sidebar user card. It shows the signed-in
 * identity read from GET /api/auth/me (name, role, email) and signs the user
 * out through the real backend session.
 */
export function ProfileMenu({ onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { identity, status } = useIdentityState()

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

  const signOut = async () => {
    onClose()
    try {
      await logout()
    } catch {
      /* The local token is still cleared by logout(); just return to sign-in. */
    }
    clearIdentity()
    navigate({ name: 'login' })
  }

  const goSettings = () => {
    onClose()
    navigate({ name: 'settings' })
  }

  const name = identity?.name ?? ''
  const nameLabel =
    name ||
    (status === 'loading'
      ? 'Loading account…'
      : status === 'error'
        ? 'Account unavailable'
        : 'Not signed in')

  return (
    <div className="pfm" ref={panelRef}>
      <div className="pfm__identity">
        <span className="pfm__avatar" aria-hidden="true">
          {name ? initials(name) : '·'}
        </span>
        <div className="pfm__id">
          <p className="pfm__name">{nameLabel}</p>
          {identity?.role && <p className="pfm__role">{identity.role}</p>}
          {identity?.email && <p className="pfm__email">{identity.email}</p>}
        </div>
      </div>

      <div className="pfm__footer">
        <button type="button" className="pfm__link" onClick={goSettings}>
          Settings
        </button>
        <button type="button" className="pfm__link" onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  )
}
