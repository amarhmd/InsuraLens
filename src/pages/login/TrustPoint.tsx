import type { ReactNode } from 'react'

export type TrustPointProps = {
  /** A small, decorative mark that echoes the point without carrying meaning. */
  icon: ReactNode
  children: ReactNode
}

/**
 * One reassurance under the brand headline. The words carry the meaning; the
 * icon is hidden from assistive tech so the list reads as three plain lines.
 */
export function TrustPoint({ icon, children }: TrustPointProps) {
  return (
    <li className="trust-point">
      <span className="trust-point__icon" aria-hidden="true">
        {icon}
      </span>
      <span>{children}</span>
    </li>
  )
}
