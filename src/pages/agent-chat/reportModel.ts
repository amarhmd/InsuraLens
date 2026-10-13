import type { ChatMessage, PointLabel, SourceRef, Section } from '../../lib/chatData'

/*
 * Turns a reply's flat Section[] into the view-model the redesigned assistant
 * card renders: a set of finding cards, a row of next-step pills, and the
 * remaining sections as supporting detail. Purely presentational — the
 * underlying sections are never mutated, and nothing here touches the data
 * layer or the canned reply builder.
 */

export type FindingStatus = 'supported' | 'verify' | 'ai'

export interface Finding {
  text: string
  status: FindingStatus
  evidence: SourceRef[]
}

export interface ReportModel {
  findings: Finding[]
  nextSteps: string[]
  extras: Section[]
}

const TONE_STATUS = { check: 'supported', warning: 'verify', info: 'ai' } as const

/** Maps a point's authored label onto one of the three finding states. */
const LABEL_STATUS: Record<PointLabel, FindingStatus> = {
  Observation: 'supported',
  'Supporting material': 'supported',
  'AI interpretation': 'ai',
  'Review consideration': 'verify',
}

/**
 * Same tone heuristic the finding list already used (FindingCard.findingTone),
 * kept here so finding state is decided in one place.
 */
function toneFor(text: string): FindingStatus {
  if (
    /(missing|insufficient|not present|unavailable|unverified|not confirmed|preliminary|require)/i.test(
      text,
    )
  ) {
    return TONE_STATUS.warning
  }
  if (/(\bmay\b|commonly|if applicable|optional|subject to)/i.test(text)) return TONE_STATUS.info
  return TONE_STATUS.check
}

/**
 * Approximate evidence attribution for finding bullets that carry no explicit
 * citation — the seeded bullets reference a source by name, so the earliest
 * named source wins. Ordered by the phrase, not the source.
 */
const EVIDENCE_HINTS: Array<{ pattern: RegExp; id: string; label: string }> = [
  { pattern: /photograph|photo|image/i, id: 'vehicle-photos', label: 'Vehicle Photos' },
  { pattern: /accident report|report/i, id: 'accident-report', label: 'Accident Report' },
  { pattern: /statement/i, id: 'customer-statement', label: 'Customer Statement' },
  { pattern: /policy|clause|coverage/i, id: 'policy-documents', label: 'Policy Documents' },
]

function inferEvidence(text: string): SourceRef[] {
  let best: { index: number; ref: SourceRef } | null = null
  for (const hint of EVIDENCE_HINTS) {
    const match = hint.pattern.exec(text)
    if (match && (!best || match.index < best.index)) {
      best = { index: match.index, ref: { sourceId: hint.id, label: hint.label } }
    }
  }
  return best ? [best.ref] : []
}

export function buildReport(sections: Section[]): ReportModel {
  const findings: Finding[] = []
  const nextSteps: string[] = []
  const extras: Section[] = []

  const hasPoints = sections.some((s) => s.kind === 'point')
  const hasKeyFindings = sections.some((s) => s.kind === 'heading' && /key findings/i.test(s.text))
  /* Replies with no structured points still deserve a finding grid, so their
     top-level bullet list stands in for one. */
  const bulletsAsFindings = !hasPoints && !hasKeyFindings

  const addBulletFindings = (items: string[]) => {
    for (const text of items) {
      findings.push({ text, status: toneFor(text), evidence: inferEvidence(text) })
    }
  }

  let seenTitle = false
  let i = 0

  while (i < sections.length) {
    const section = sections[i]

    if (section.kind === 'heading') {
      /* Consumes the bullet/numbered runs directly below the heading. */
      const consume = () => {
        const items: string[] = []
        while (i + 1 < sections.length) {
          const next = sections[i + 1]
          if (next.kind === 'bullets' || next.kind === 'numbered') {
            items.push(...next.items)
            i += 1
          } else {
            break
          }
        }
        return items
      }

      if (!seenTitle) {
        /* The reply's own title is replaced by the card's "Investigation summary"
           header, so it is not repeated in the supporting detail. */
        seenTitle = true
        i += 1
        continue
      }
      if (/key findings/i.test(section.text)) {
        addBulletFindings(consume())
        i += 1
        continue
      }
      if (/needs further investigation/i.test(section.text)) {
        nextSteps.push(...consume())
        i += 1
        continue
      }
      if (/reminder/i.test(section.text)) {
        /* The preliminary-points banner carries this note. */
        i += 1
        continue
      }
      extras.push(section)
      i += 1
      continue
    }

    if (section.kind === 'point') {
      findings.push({
        text: section.text,
        status: LABEL_STATUS[section.label],
        evidence: section.source.sourceId
          ? [
              {
                sourceId: section.source.sourceId,
                label: section.source.label || section.source.sourceId,
              },
            ]
          : [],
      })
      i += 1
      continue
    }

    if (section.kind === 'reminder') {
      /* Replaced by the preliminary-points banner. */
      i += 1
      continue
    }

    if (section.kind === 'bullets' && bulletsAsFindings) {
      addBulletFindings(section.items)
      i += 1
      continue
    }

    extras.push(section)
    i += 1
  }

  return { findings, nextSteps, extras }
}

/** Counts how often each evidence source is cited across a conversation. */
export function citedSources(messages: ChatMessage[]): Record<string, number> {
  const counts: Record<string, number> = {}

  const bump = (id: string | null) => {
    if (!id) return
    counts[id] = (counts[id] ?? 0) + 1
  }

  const walk = (sections: Section[]) => {
    for (const section of sections) {
      if (section.kind === 'point') bump(section.source.sourceId)
      else if (section.kind === 'sources') section.sourceIds.forEach(bump)
      else if (section.kind === 'expand') walk(section.body)
    }
  }

  for (const message of messages) {
    if (message.role === 'assistant' && message.sections) walk(message.sections)
  }

  return counts
}
