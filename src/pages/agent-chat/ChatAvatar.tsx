import { initials } from '../../lib/settingsStore'
import { useIdentity } from '../../lib/identity'
import { SparkIcon } from './chatIcons'

type Props = {
  role: 'user' | 'assistant'
  size?: 'sm' | 'md'
}

/**
 * Message avatar. The assistant gets the InsuraLens mark on a soft teal
 * gradient; the signed-in reviewer gets their own initials (GET /api/auth/me).
 * Decorative only — the speaker is always named in the message meta, so this
 * is aria-hidden.
 */
export function ChatAvatar({ role, size = 'md' }: Props) {
  const identity = useIdentity()

  if (role === 'assistant') {
    return (
      <span className={`chat-avatar chat-avatar--ai chat-avatar--${size}`} aria-hidden="true">
        <SparkIcon size={size === 'sm' ? 13 : 16} />
      </span>
    )
  }

  return (
    <span className={`chat-avatar chat-avatar--user chat-avatar--${size}`} aria-hidden="true">
      {initials(identity?.name ?? '') || '?'}
    </span>
  )
}
