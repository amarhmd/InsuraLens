import { useEffect, useRef, useState } from 'react'
import { cx } from '../../lib/cx'
import { mockNotifications } from '../../mocks/notifications'
import type { Notification } from '../../mocks/notifications'
import { AlertTriangleIcon, BellIcon, CheckCircleIcon, ClockIcon, InboxIcon, ShieldIcon } from './icons'

/**
 * Presentational icon for a notification, chosen from its own title. The mock
 * shape has no explicit category field, so nothing is invented: unknown titles
 * fall back to the bell.
 */
function NotificationIcon({ title }: { title: string }) {
  const text = title.toLowerCase()
  if (text.includes('complete')) return <CheckCircleIcon size={16} />
  if (text.includes('incomplete') || text.includes('missing') || text.includes('waiting')) {
    return <AlertTriangleIcon size={16} />
  }
  if (text.includes('policy')) return <ShieldIcon size={16} />
  return <BellIcon size={16} />
}

/** Claim id pulled from a deep link like "#/claims/CLM-10482" — never invented. */
function claimIdFromLink(link?: string): string | null {
  if (!link) return null
  const last = link.split('/').filter(Boolean).pop() ?? ''
  return /^[A-Z]+-\d+$/.test(last) ? last : null
}

/**
 * Notification bell for the compact top bar: a count badge on the trigger and
 * a dropdown listing the latest mock activity (icon, text, claim id, time),
 * a "Mark all as read" action, and an empty state.
 *
 * Read state is kept locally — the prototype never persists an inbox, and the
 * shared mock array is copied on mount so marking items read cannot leak into
 * other surfaces.
 */
export function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>(() =>
    mockNotifications.map((item) => ({ ...item })),
  )
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const unread = items.reduce((count, item) => (item.read ? count : count + 1), 0)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const markAllRead = () => {
    setItems((previous) => previous.map((item) => ({ ...item, read: true })))
  }

  return (
    <div className="notif" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="notif__trigger"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="notifications-menu"
        onClick={() => setOpen((was) => !was)}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="notif__count" aria-hidden="true">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="notif__panel"
          id="notifications-menu"
          role="dialog"
          aria-label="Notifications"
          aria-modal="false"
        >
          <div className="notif__head">
            <p className="notif__title">Notifications</p>
            {unread > 0 && (
              <button type="button" className="notif__mark" onClick={markAllRead}>
                Mark all as read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="notif__empty">
              <InboxIcon size={22} />
              You&rsquo;re all caught up.
            </p>
          ) : (
            <ul className="notif__list">
              {items.map((item) => {
                const claimId = claimIdFromLink(item.link)
                return (
                  <li className="notif__item" key={item.id}>
                    <span
                      className={cx('notif__icon', !item.read && 'notif__icon--unread')}
                      aria-hidden="true"
                    >
                      <NotificationIcon title={item.title} />
                    </span>
                    <span className="notif__body">
                      <span className="notif__item-title">
                        {item.title}
                        {!item.read && <span className="notif__dot" aria-hidden="true" />}
                      </span>
                      <span className="notif__item-text">{item.body}</span>
                      <span className="notif__meta">
                        {claimId && <span className="notif__claim">{claimId}</span>}
                        <span className="notif__time">
                          <ClockIcon size={12} />
                          {item.time}
                        </span>
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
