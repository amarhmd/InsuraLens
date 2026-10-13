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

export function CopyIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <rect x="9" y="9" width="11" height="11" rx="2.2" />
      <path d="M15 5.5A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15" />
    </svg>
  )
}

export function RefreshIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M19 12a7 7 0 1 1-2.1-5" />
      <path d="M19.5 4.5V9H15" />
    </svg>
  )
}

export function ThumbUpIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M7 10.5v9H4.6a1.1 1.1 0 0 1-1.1-1.1v-6.8A1.1 1.1 0 0 1 4.6 10.5H7Z" />
      <path d="M7 10.5 10.6 4a2 2 0 0 1 1.9 2v3h5.2a1.7 1.7 0 0 1 1.7 2l-1.1 6.2a1.7 1.7 0 0 1-1.7 1.4H7" />
    </svg>
  )
}

export function ThumbDownIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M7 13.5v-9H4.6a1.1 1.1 0 0 0-1.1 1.1v6.8a1.1 1.1 0 0 0 1.1 1.1H7Z" />
      <path d="M7 13.5 10.6 20a2 2 0 0 0 1.9-2v-3h5.2a1.7 1.7 0 0 0 1.7-2l-1.1-6.2a1.7 1.7 0 0 0-1.7-1.4H7" />
    </svg>
  )
}

export function NoteIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7.5L14 3.5Z" />
      <path d="M13.75 3.7V8h4.1M9 13h6M9 16.5h4" />
    </svg>
  )
}

export function CheckIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}

export function AlertIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 4.5 21 19.5H3L12 4.5Z" />
      <path d="M12 10v4M12 16.6v.4" />
    </svg>
  )
}

export function InfoIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.8v.4" />
    </svg>
  )
}

export function FileIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7.5L14 3.5Z" />
      <path d="M13.75 3.7V8h4.1" />
    </svg>
  )
}

export function ImageIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.4" />
      <path d="m4.5 17 4.2-4.2a1.5 1.5 0 0 1 2.1 0L15 17M13.5 15l1.9-1.9a1.5 1.5 0 0 1 2.1 0l2.5 2.5" />
    </svg>
  )
}

export function StackIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="m12 3.5 8.5 4.3L12 12 3.5 7.8 12 3.5Z" />
      <path d="m3.5 12 8.5 4.3 8.5-4.3M3.5 16.2 12 20.5l8.5-4.3" />
    </svg>
  )
}

export function ShieldIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 3.5 18.5 6v5.2c0 4-2.7 7.3-6.5 8.8-3.8-1.5-6.5-4.8-6.5-8.8V6L12 3.5Z" />
      <path d="m9.2 11.8 2 2 3.6-3.9" />
    </svg>
  )
}

export function ChevronDownIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function ArrowDownIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  )
}

export function ClockIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  )
}

export function SunIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </svg>
  )
}

export function MoonIcon({ size = 15, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  )
}