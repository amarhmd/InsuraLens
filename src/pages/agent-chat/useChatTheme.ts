import { useCallback, useEffect, useState } from 'react'

export type ChatTheme = 'light' | 'dark'

const STORAGE_KEY = 'insuralens:chat-theme'

function readStoredTheme(): ChatTheme {
  if (typeof localStorage === 'undefined') return 'light'
  return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
}

/**
 * Chat-scoped theme preference, mirrored to localStorage. Applied as a
 * `data-theme` attribute on the chat shell only — the rest of the app keeps
 * its own light theme, so this stays a local visual preference.
 */
export function useChatTheme() {
  const [theme, setTheme] = useState<ChatTheme>(readStoredTheme)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* storage unavailable — the in-memory preference still applies */
    }
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggle }
}
