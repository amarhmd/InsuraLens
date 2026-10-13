import { MoonIcon, SunIcon } from './chatIcons'
import type { ChatTheme } from './useChatTheme'

/**
 * Light/dark toggle for the chat workspace. Reuses the shared icon-button
 * chrome so it drops straight into the chat header.
 */
export function ThemeToggle({ theme, onToggle }: { theme: ChatTheme; onToggle: () => void }) {
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className="chat-icon-btn theme-toggle"
      aria-label={`Switch to ${next} theme`}
      aria-pressed={theme === 'dark'}
      title={`Switch to ${next} theme`}
      onClick={onToggle}
    >
      {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
    </button>
  )
}
