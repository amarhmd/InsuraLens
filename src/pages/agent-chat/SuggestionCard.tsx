import type { ReactNode } from 'react'
import { ClockIcon, FileIcon, InfoIcon, ShieldIcon, StackIcon } from './chatIcons'

type Meta = { title: string; desc: string; icon: ReactNode }

/** Presentation only — the prompt text itself still comes from SUGGESTIONS. */
const META: Record<string, Meta> = {
  compare: {
    title: 'Compare photos & report',
    desc: 'Cross-check visible damage against the accident report.',
    icon: <StackIcon size={18} />,
  },
  policy: {
    title: 'Policy coverage',
    desc: 'Explain the coverage conditions relevant to this claim.',
    icon: <ShieldIcon size={18} />,
  },
  missing: {
    title: 'Missing evidence',
    desc: 'List the documents a collision claim usually needs.',
    icon: <FileIcon size={18} />,
  },
  timeline: {
    title: 'Timeline consistency',
    desc: 'Review whether the recorded incident timeline holds up.',
    icon: <ClockIcon size={18} />,
  },
}

const FALLBACK: Meta = { title: 'Investigate', desc: '', icon: <InfoIcon size={18} /> }

/** Large prompt card for the new-conversation empty state (2×2 grid). */
export function SuggestionCard({
  id,
  text,
  onPick,
}: {
  id: string
  text: string
  onPick: (text: string) => void
}) {
  const meta = META[id] ?? FALLBACK
  return (
    <button type="button" className="suggestion-card" onClick={() => onPick(text)}>
      <span className="suggestion-card__icon" aria-hidden="true">
        {meta.icon}
      </span>
      <span className="suggestion-card__title">{meta.title}</span>
      <span className="suggestion-card__desc">{meta.desc || text}</span>
    </button>
  )
}

/** Compact chip used above the composer once a conversation has started. */
export function SuggestionChip({ text, onPick }: { text: string; onPick: (text: string) => void }) {
  return (
    <button type="button" className="suggestion-chip" onClick={() => onPick(text)}>
      {text}
    </button>
  )
}
