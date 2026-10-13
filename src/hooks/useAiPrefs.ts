import { useEffect, useState } from 'react'
import { getAiPrefs, subscribeAiPrefs, type AiPrefs } from '../lib/aiPrefs'

/** Reads the shared AI display preferences and re-renders on every save. */
export function useAiPrefs(): AiPrefs {
  const [prefs, setPrefs] = useState(getAiPrefs)
  useEffect(() => subscribeAiPrefs(() => setPrefs(getAiPrefs())), [])
  return prefs
}
