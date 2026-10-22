import type { PointLabel, SourceRef, Section } from '../../lib/chatData'

/*
 * Turns a reply's flat Section[] into the view-model the redesigned assistant
 * card renders: a set of finding cards, a row of next-step pills, and the
 * remaining sections as supporting detail. Purely presentational — the
 * underlying sections are never mutated, and nothing here touches the data
 * layer.
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
 * Approximate evidence attribution was removed: the backend reply is prose and
 * carried no structured citations, so attributing bullets to a fixed set of
 * evidence groups would have invented links that do not exist in the claim.
 */

export function buildReport(sections: Section[]): ReportModel {
  const findings: Finding[] = []
  const nextSteps: string[] = []
  const extras: Section[] = []

  const hasPoints = sections.some((s) => s.kind === 'point')
  const hasKeyFindings = sections.some((s) => s.kind === 'heading' && /key findings/i.test(s.text))
  /* Replies with no structured points still deserve a finding grid, so their
     top-level bullet list stands in for one. */
  const bulletsAsFindings = !hasPoints && !hasKeyFindings

  /* Bubble findings carry no citation: the backend reply is prose, and nothing
     here fabricates a source link. Explicit citations only arrive as `point`
     sections, which the backend does not currently emit. */
  const addBulletFindings = (items: string[]) => {
    for (const text of items) {
      findings.push({ text, status: toneFor(text), evidence: [] })
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
