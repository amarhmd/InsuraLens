import type { ReactNode } from 'react'
import { AlertIcon } from '../../components/ui/icons'

/**
 * A validation message. The wording is the non-colour channel: it says what is
 * wrong in plain language, so the state never depends on the reviewer seeing
 * red. The icon is decorative and hidden from assistive tech for the same
 * reason.
 */
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p className="field__error" id={id}>
      <AlertIcon size={14} className="field__error-icon" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}
