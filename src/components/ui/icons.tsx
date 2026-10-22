import { cx } from '../../lib/cx'

type IconProps = {
  size?: number
  className?: string
}

/* All icons are decorative: they are always paired with visible text or an
   aria-label on the control that owns them, so they never carry meaning on
   their own. */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: 'false' as const,
}

export function EyeIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className}>
      <path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function EyeOffIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className}>
      <path d="M9.9 5.7A10 10 0 0 1 12 5.5c7 0 10.5 6.5 10.5 6.5a18.7 18.7 0 0 1-3.2 4.1" />
      <path d="M6.6 7.3A18.4 18.4 0 0 0 1.5 12S5 18.5 12 18.5a9.7 9.7 0 0 0 4.4-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </svg>
  )
}

/* Circle-plus-exclamation. The shape distinguishes it from the info icon even
   for a reviewer who cannot separate the two colours. */
export function AlertIcon({ size = 15, className }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16.3h.01" />
    </svg>
  )
}

export function CloseIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function Spinner({ size = 16, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cx('spinner', className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.5" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/* Adding to the product's hand-written icon set rather than pulling in a
   dependency: every glyph is a few strokes in a 24-box, stroked in the
   current colour so it inherits the control's state. */

export function MailIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M4 7.6l7.2 5.1a1.5 1.5 0 0 0 1.6 0L20 7.6" />
    </svg>
  )
}

export function LockIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className}>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 14.2v2.4" />
    </svg>
  )
}

/* Explore: a compass needle. */
export function CompassIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z" />
    </svg>
  )
}

/* Evidence-linked: two chain links, opened at the join. */
export function LinkIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className}>
      <path d="M10.2 13.8a3.4 3.4 0 0 0 4.9 0l2.4-2.4a3.5 3.5 0 0 0-4.9-5l-.9.9" />
      <path d="M13.8 10.2a3.4 3.4 0 0 0-4.9 0l-2.4 2.4a3.5 3.5 0 0 0 4.9 5l.9-.9" />
    </svg>
  )
}

/* Explainable analysis: a spark. */
export function SparkleIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className}>
      <path d="M11 3.5l1.6 4.4 4.4 1.6-4.4 1.6L11 15.5 9.4 11.1 5 9.5l4.4-1.6z" />
      <path d="M18 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </svg>
  )
}

/* Human-in-the-loop: a person with a confirmation tick. */
export function UserCheckIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className}>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.8 19.5a6.3 6.3 0 0 1 12.4 0" />
      <path d="M16.2 12.3l1.9 1.9 3.4-3.5" />
    </svg>
  )
}

/* Account / profile: a single person, used for the Profile settings section. */
export function UserIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5.4 19.6a6.6 6.6 0 0 1 13.2 0" />
    </svg>
  )
}
