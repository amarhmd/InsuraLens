/* Mock notification items — future home of the inbox behind the TopHeader
   bell. The bell is decorative in the prototype; the shape below is what
   GET /api/notifications is expected to return. */

export interface Notification {
  id: string
  title: string
  body: string
  time: string
  read: boolean
  /** Optional deep link into the app, e.g. '#/claims/CLM-10482'. */
  link?: string
}

export const mockNotifications: Notification[] = [
  {
    id: 'ntf-003',
    title: 'AI analysis completed',
    body: 'Findings are ready for reviewer inspection on CLM-10482.',
    time: '12 min ago',
    read: false,
    link: '#/claims/CLM-10482',
  },
  {
    id: 'ntf-002',
    title: 'Evidence still incomplete',
    body: 'CLM-10476 is waiting on the accident report.',
    time: '34 min ago',
    read: false,
    link: '#/claims/CLM-10476',
  },
  {
    id: 'ntf-001',
    title: 'Policy match flagged',
    body: 'CLM-10461 needs reviewer verification of the policy match.',
    time: '1 hr ago',
    read: true,
    link: '#/claims/CLM-10461',
  },
]
