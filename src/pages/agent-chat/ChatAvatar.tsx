import { getSettings, initials } from '../../lib/settingsStore'
import { SparkIcon } from './chatIcons'

type Props = {
  role: 'user' | 'assistant'
  size?: 'sm' | 'md'
}

/**
 * Message avatar. The assistant gets the InsuraLens mark on a soft teal
 * gradient; the reviewer gets their demo initials. Decorative only — the
 * speaker is always named in the message meta, so this is aria-hidden.
 */
export function ChatAvatar({ role, size = 'md' }: Props) {
  if (role === 'assistant') {
    return (
      <span className={`chat-avatar chat-avatar--ai chat-avatar--${size}`} aria-hidden="true">
        <SparkIcon size={size === 'sm' ? 13 : 16} />
      </span>
    )
  }

  const profile = getSettings().profile
  return (
    <span className={`chat-avatar chat-avatar--user chat-avatar--${size}`} aria-hidden="true">
      {initials(profile.fullName)}
    </span>
  )
}
