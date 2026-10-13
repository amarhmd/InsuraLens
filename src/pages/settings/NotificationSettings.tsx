import { useSettingsValue } from '../../hooks/useSettingsValue'
import { NOTIFICATION_ITEMS, saveSettings, type NotificationKey } from '../../lib/settingsStore'
import { SavedStatus, SectionHeader, SettingsGroup, ToggleRow, useSavedFlash } from './settingsKit'

/**
 * Notifications — the two switches for the top bar bell. Changes save
 * immediately and persist in this browser only; nothing is sent to a server.
 */
export function NotificationSettings() {
  const notifications = useSettingsValue().notifications
  const { saved, flash } = useSavedFlash()

  const setFlag = (key: NotificationKey, on: boolean) => {
    saveSettings({ notifications: { ...notifications, [key]: on } })
    flash()
  }

  return (
    <>
      <SectionHeader
        title="Notifications"
        description="Choose which claim updates the notification bell surfaces."
      />

      <SettingsGroup
        title="Claim notifications"
        hint="Stored in this browser only. Nothing is sent to a server."
      >
        {NOTIFICATION_ITEMS.map((item) => (
          <ToggleRow
            key={item.key}
            id={`notif-${item.key}`}
            label={item.label}
            hint={item.hint}
            checked={notifications[item.key]}
            onChange={(on) => setFlag(item.key, on)}
          />
        ))}
      </SettingsGroup>

      <SavedStatus visible={saved} />
    </>
  )
}
