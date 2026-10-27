import { BellIcon, ClockIcon, InboxIcon } from '../../components/layout/icons'
import { useSettingsValue } from '../../hooks/useSettingsValue'
import { NOTIFICATION_ITEMS, type NotificationKey } from '../../lib/settingsStore'
import { SectionHeader, SettingsGroup, ToggleRow } from './settingsKit'

/** Decorative row icon per notification switch. */
function iconFor(key: NotificationKey) {
  return key === 'claimAssigned' ? <InboxIcon size={18} /> : <ClockIcon size={18} />
}

/**
 * Notifications — the two switches for the top bar bell. They stay disabled
 * until the notification feed carries the assignment/review ownership they
 * describe, so a switch can never filter the wrong rows.
 */
export function NotificationSettings() {
  const notifications = useSettingsValue().notifications

  return (
    <>
      <SectionHeader
        icon={<BellIcon size={20} />}
        title="Notifications"
        description="Choose which claim updates the notification bell surfaces."
      />

      <SettingsGroup
        title="Claim notifications"
        hint="Not available yet. The notification feed does not include assignment or review-owner data."
      >
        {NOTIFICATION_ITEMS.map((item) => (
          <ToggleRow
            key={item.key}
            id={`notif-${item.key}`}
            icon={iconFor(item.key)}
            label={item.label}
            hint={item.hint}
            checked={notifications[item.key]}
            onChange={() => undefined}
            disabled
            unavailable
          />
        ))}
      </SettingsGroup>
    </>
  )
}
