import { useEffect, useMemo, useRef, useState } from 'react'
import { cx } from '../../lib/cx'
import { navigate } from '../../lib/router'
import { useNotifications } from '../../hooks/useNotifications'
import { useNotificationFeed } from '../../hooks/useNotificationFeed'
import { badgeCount, relativeTime } from '../../lib/notifications'
import type { AppNotification, NotificationType } from '../../lib/notifications'
import {
  AlertTriangleIcon,
  BellIcon,
  CheckCircleIcon,
  ClockIcon,
  CloseIcon,
  HelpCircleIcon,
  InboxIcon,
  PaperclipIcon,
  ShieldIcon,
} from './icons'

/**
 * Icon for a notification, chosen from its own `type` (set by the producer —
 * the server row's type is inferred from its title in lib/notifications). No
 * category is ever invented.
 */
function NotificationIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case 'claim_created':
      return <InboxIcon size={16} />
    case 'evidence_uploaded':
      return <PaperclipIcon size={16} />
    case 'analysis_started':
    case 'status_changed':
      return <ClockIcon size={16} />
    case 'analysis_completed':
      return <CheckCircleIcon size={16} />
    case 'analysis_failed':
      return <AlertTriangleIcon size={16} />
    case 'info_requested':
      return <HelpCircleIcon size={16} />
    case 'review_completed':
      return <ShieldIcon size={16} />
    default:
      return <BellIcon size={16} />
  }
}

/**
 * Notification bell for the compact top bar. The badge, the list, and the read
 * state all come from the shared notification store (fed by real backend events
 * and the user's own actions — see src/hooks/useNotificationFeed.ts); nothing
 * here is invented.
 */
export function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const { items, unread, unreadIds, markRead, markAllRead, dismiss } = useNotifications()
  const { loading, error, refresh } = useNotificationFeed()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const unreadSet = useMemo(() => new Set(unreadIds), [unreadIds])
  const badge = badgeCount(unread)

  /* Close on Escape (returning focus to the bell) or a click outside. */
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

  const select = (item: AppNotification) => {
    markRead(item.id)
    setOpen(false)
    if (item.claimId) navigate({ name: 'claim', id: item.claimId })
  }

  const toggle = () => {
    setOpen((was) => {
      if (!was) refresh()
      return !was
    })
  }

  return (
    <div className="notif" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="notif__trigger"
        aria-label={badge ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="notifications-menu"
        onClick={toggle}
      >
        <BellIcon />
        {badge && (
          <span className="notif__count" aria-hidden="true">
            {badge}
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

          {error && items.length > 0 && (
            <p className="notif__state notif__state--error">{error}</p>
          )}

          {items.length === 0 ? (
            loading ? (
              <p className="notif__state">Loading notifications…</p>
            ) : error ? (
              <div className="notif__empty" role="alert">
                <p className="notif__state notif__state--error">Could not load notifications.</p>
                <button type="button" className="notif__mark" onClick={refresh}>
                  Retry
                </button>
              </div>
            ) : (
              <p className="notif__empty">
                <InboxIcon size={22} />
                You&rsquo;re all caught up.
              </p>
            )
          ) : (
            <ul className="notif__list">
              {items.map((item) => {
                const isUnread = unreadSet.has(item.id)
                return (
                  <li className="notif__item" key={item.id}>
                    <button
                      type="button"
                      className="notif__main"
                      onClick={() => select(item)}
                      aria-label={`${item.title}. ${item.message}${
                        item.claimId ? ` Open ${item.claimId}.` : ''
                      }`}
                    >
                      <span
                        className={cx('notif__icon', isUnread && 'notif__icon--unread')}
                        aria-hidden="true"
                      >
                        <NotificationIcon type={item.type} />
                      </span>
                      <span className="notif__body">
                        <span className="notif__item-title">
                          {item.title}
                          {isUnread && <span className="notif__dot" aria-hidden="true" />}
                        </span>
                        <span className="notif__item-text">{item.message}</span>
                        <span className="notif__meta">
                          {item.claimId && <span className="notif__claim">{item.claimId}</span>}
                          <span className="notif__time">
                            <ClockIcon size={12} />
                            {relativeTime(item.timestamp)}
                          </span>
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="notif__dismiss"
                      onClick={() => dismiss(item.id)}
                      aria-label={`Dismiss notification: ${item.title}`}
                    >
                      <CloseIcon size={14} />
                    </button>
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
