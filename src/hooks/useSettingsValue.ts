import { useEffect, useState } from 'react'
import { getSettings, subscribeSettings, type Settings } from '../lib/settingsStore'

/** Reads the shared settings store and re-renders on every save. */
export function useSettingsValue(): Settings {
  const [settings, setSettings] = useState(getSettings)
  useEffect(() => subscribeSettings(() => setSettings(getSettings())), [])
  return settings
}
