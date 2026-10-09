import {
  NOTIFICATION_GROUPS,
  type NotificationKey,
  type Notifications,
} from '../../lib/settingsStore'
import {
  SectionHeader,
  SettingsGroup,
  SettingsSaveBar,
  ToggleRow,
  useDraft,
} from './settingsKit'

type Props = {
  value: Notifications
  onSave: (next: Notifications, toastMessage: string) => void
}

/**
 * Notifications — three groups of switches. Native role="switch" buttons
 * keep the whole section keyboard operable; the state reads in text
 * (aria-checked), never colour alone.
 */
export function NotificationSettings({ value, onSave }: Props) {
  const { draft, patch, dirty } = useDraft(value)

  const setFlag = (key: NotificationKey, on: boolean) =>
    patch({ [key]: on } as Partial<Notifications>)

  return (
    <>
      <SectionHeader
        title="Notifications"
        description="Choose which updates appear in your InsuraLens workspace."
      />

      {NOTIFICATION_GROUPS.map((group) => (
        <SettingsGroup key={group.key} title={group.title} hint={group.hint}>
          {group.items.map((item) => (
            <ToggleRow
              key={item.key}
              id={`notif-${item.key}`}
              label={item.label}
              hint={item.hint}
              checked={draft[item.key]}
              onChange={(on) => setFlag(item.key, on)}
            />
          ))}
        </SettingsGroup>
      ))}

      <SettingsSaveBar
        dirty={dirty}
        saveLabel="Save Notification Preferences"
        onSave={() => onSave(draft, 'Notification preferences saved in this demo')}
        onCancel={() => patch({ ...value })}
      />
    </>
  )
}
