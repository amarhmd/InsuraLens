import type { ReactNode } from 'react'
import { AlertIcon, CheckIcon, InfoIcon } from './chatIcons'

export type FindingTone = 'check' | 'warning' | 'info'

/**
 * Reads a finding's wording and picks an icon tone. Purely presentational —
 * it never changes the text, only which status glyph sits beside it.
 */
export function findingTone(text: string): FindingTone {
  if (/(missing|insufficient|not present|unavailable|unverified|not confirmed|preliminary|requires? )/i.test(text)) {
    return 'warning'
  }
  if (/(\bmay\b|commonly|if applicable|optional|subject to)/i.test(text)) {
    return 'info'
  }
  return 'check'
}

const ICON: Record<FindingTone, ReactNode> = {
  check: <CheckIcon size={13} />,
  warning: <AlertIcon size={13} />,
  info: <InfoIcon size={13} />,
}

/** One "Key finding" row: status glyph + text. */
export function FindingCard({ tone, children }: { tone: FindingTone; children: ReactNode }) {
  return (
    <li className={`chat-finding chat-finding--${tone}`}>
      <span className="chat-finding__icon" aria-hidden="true">
        {ICON[tone]}
      </span>
      <span className="chat-finding__text">{children}</span>
    </li>
  )
}
