/* Small line-icon set for the Agent Chat workspace. Stroke inherits color. */

type Props = { size?: number; className?: string }

function base(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true as const,
  }
}

export function PlusIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function SearchIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  )
}

export function SendIcon({ size = 16, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M4.5 12 20 4.5 14 20l-3-6.5-6.5-1.5Z" />
    </svg>
  )
}

export function PaperclipIcon({ size = 16, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M16.5 6.5v8a4.5 4.5 0 0 1-9 0V6a2.75 2.75 0 0 1 5.5 0v8a1 1 0 0 1-2 0V7.5" />
    </svg>
  )
}

export function SparkIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 3.5 13.6 9l5.4 1.6L13.6 12l-1.6 5.4L10.4 12 5 10.4 10.4 9 12 3.5Z" />
      <path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
    </svg>
  )
}

export function TrashIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 7h14M10 7V5.5A1.5 1.5 0 0 1 11.5 4h1A1.5 1.5 0 0 1 14 5.5V7M6.5 7l.7 11.2A1.5 1.5 0 0 0 8.7 19.6h6.6a1.5 1.5 0 0 0 1.5-1.4L17.5 7M10 10.5v6M14 10.5v6" />
    </svg>
  )
}

export function PencilIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M4.5 19.5h4L19 9a1.9 1.9 0 0 0-2.7-2.7L5.8 16.7l-1.3 2.8Z" />
      <path d="m14.8 7.2 2.6 2.6" />
    </svg>
  )
}