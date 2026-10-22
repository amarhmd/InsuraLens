/* React binding for the notification store.

   `useSyncExternalStore` reads the module singleton so the badge stays in sync
   no matter which page raised the event. The action functions are stable module
   references, safe to pass straight into handlers. */

import { useSyncExternalStore } from 'react'
import {
  dismiss,
  getStoreSnapshot,
  markAllRead,
  markRead,
  subscribeNotifications,
} from '../lib/notificationsStore'
import type { AppNotification } from '../lib/notifications'

export interface UseNotifications {
  items: AppNotification[]
  unread: number
  unreadIds: string[]
  markRead: (id: string) => void
  markAllRead: () => void
  dismiss: (id: string) => void
}

export function useNotifications(): UseNotifications {
  const snapshot = useSyncExternalStore(
    subscribeNotifications,
    getStoreSnapshot,
    getStoreSnapshot,
  )
  return {
    items: snapshot.items,
    unread: snapshot.unread,
    unreadIds: snapshot.unreadIds,
    markRead,
    markAllRead,
    dismiss,
  }
}
