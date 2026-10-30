/* ==========================================================================
   Summary → estimated damage zones.

   Some analyses return a written damage summary without structured damage
   areas. This module is the pure fallback: it reads the summary text and
   returns a small, de-duplicated set of likely zones. It never replaces real
   structured data — callers only run it when `damageAreas`/`damages` are empty.

   The matcher is deliberately conservative:
   - whole-word English matching where possible;
   - basic French/Arabic terms;
   - negation is removed before matching;
   - a multi-vehicle summary returns no zones (the UI shows a notice instead);
   - the result is capped at 8 zones.

   No React or API imports: the check script stages this module directly.
   ========================================================================== */

export type ZoneCode =
  | 'hood'
  | 'front_bumper'
  | 'rear_bumper'
  | 'grille'
  | 'headlight'
  | 'taillight'
  | 'front_fender'
  | 'rear_fender'
  | 'trunk_lid'
  | 'windshield'
  | 'rear_window'
  | 'door'
  | 'mirror'
  | 'roof'
  | 'wheel'
  | 'fog_light'

export type ZoneSide = 'left' | 'right' | 'center'

export interface EstimatedZone {
  zone: ZoneCode
  label: string
  matchedText: string
  side?: ZoneSide
}

type Orientation = 'front' | 'rear'

type Pattern = {
  re?: RegExp
  terms?: string[]
}

type Match = {
  text: string
  index: number
}

const MAX_ZONES = 8

const ZONE_LABELS: Record<ZoneCode, string> = {
  hood: 'Hood',
  front_bumper: 'Front bumper',
  rear_bumper: 'Rear bumper',
  grille: 'Grille',
  headlight: 'Headlight',
  taillight: 'Taillight',
  front_fender: 'Front fender',
  rear_fender: 'Rear fender',
  trunk_lid: 'Trunk lid',
  windshield: 'Windshield',
  rear_window: 'Rear window',
  door: 'Door',
  mirror: 'Mirror',
  roof: 'Roof',
  wheel: 'Wheel',
  fog_light: 'Fog light',
}

/* ------------------------------------------------------------------ */
/* Small text helpers                                                  */
/* ------------------------------------------------------------------ */

function findMatch(text: string, pattern: Pattern): Match | null {
  if (pattern.re) {
    const match = pattern.re.exec(text)
    if (match && match.index !== undefined) return { text: match[0], index: match.index }
  }
  const lower = text.toLowerCase()
  for (const term of pattern.terms ?? []) {
    const index = lower.indexOf(term.toLowerCase())
    if (index >= 0) return { text: text.slice(index, index + term.length), index }
  }
  return null
}

function findAllMatches(text: string, pattern: Pattern): Match[] {
  const matches: Match[] = []
  if (pattern.re) {
    const flags = pattern.re.flags.includes('g') ? pattern.re.flags : `${pattern.re.flags}g`
    const re = new RegExp(pattern.re.source, flags)
    for (const match of text.matchAll(re)) {
      if (match.index !== undefined) matches.push({ text: match[0], index: match.index })
    }
  }
  const lower = text.toLowerCase()
  for (const term of pattern.terms ?? []) {
    const needle = term.toLowerCase()
    let from = 0
    while (from <= lower.length) {
      const index = lower.indexOf(needle, from)
      if (index < 0) break
      matches.push({ text: text.slice(index, index + term.length), index })
      from = index + Math.max(1, term.length)
    }
  }
  return matches.sort((a, b) => a.index - b.index)
}

function splitSentences(text: string): string[] {
  return text
    .replace(/([.!?])\s+/g, '$1\n')
    .split(/\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

/* ------------------------------------------------------------------ */
/* Negation / damage cues                                              */
/* ------------------------------------------------------------------ */

const NEGATION_RE =
  /\b(?:no|zero)\s+(?:\w+\s+){0,2}(?:damage|dents?|scratches?|cracks?|impact|issues?)\b|\b(?:not|isn't|aren't|wasn't|weren't)\s+(?:damaged|dented|scratched|cracked|broken|affected|hit)\b|\bundamaged\b|\bintact\b|\bwithout\s+(?:any\s+)?(?:damage|dents?|scratches?|cracks?)\b|\bfree\s+(?:of|from)\s+(?:damage|dents?|scratches?|cracks?)\b|aucun\s+dommage|pas\s+de\s+dommage|non\s+endommagé|لا\s+يوجد\s+ضرر|غير\s+متضرر/i

const DAMAGE_CUE_RE =
  /\b(?:damage|damaged|dents?|dented|scratches?|scratched|cracks?|cracked|broken|impact|hit|collision|smashed|struck|rear-ended|front-ended|repair)\b/i

/* ------------------------------------------------------------------ */
/* Side / front-rear cues                                              */
/* ------------------------------------------------------------------ */

const LEFT_CUES: RegExp[] = [
  /\bleft\b/gi,
  /\bleft[- ]hand\b/gi,
  /\bdriver(?:'s)?\s+side\b/gi,
  /gauche/gi,
  /اليسار|الأيسر/g,
]

const RIGHT_CUES: RegExp[] = [
  /\bright\b/gi,
  /\bright[- ]hand\b/gi,
  /\bpassenger(?:'s)?\s+side\b/gi,
  /droite|droit/gi,
  /اليمين|الأيمن/g,
]

const FRONT_CUES: RegExp[] = [
  /\bfront\b/gi,
  /\bfore\b/gi,
  /avant/gi,
  /الأمامي|الأمام/g,
]

const REAR_CUES: RegExp[] = [
  /\brear\b/gi,
  /\bback\b/gi,
  /\btail\b/gi,
  /\bbehind\b/gi,
  /arrière/gi,
  /الخلفي|الخلف/g,
]

function cuePositions(text: string, patterns: RegExp[]): number[] {
  const positions: number[] = []
  for (const pattern of patterns) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
    const re = new RegExp(pattern.source, flags)
    for (const match of text.matchAll(re)) {
      if (match.index !== undefined) positions.push(match.index)
    }
  }
  return positions
}

function nearestPosition(positions: number[], focus: number): number {
  return positions.reduce(
    (best, position) =>
      Math.abs(position - focus) < Math.abs(best - focus) ? position : best,
    Number.POSITIVE_INFINITY,
  )
}

function sideOf(text: string): ZoneSide | null {
  const left = cuePositions(text, LEFT_CUES).length > 0
  const right = cuePositions(text, RIGHT_CUES).length > 0
  if (left && right) return 'center'
  if (left) return 'left'
  if (right) return 'right'
  return null
}

/** Prefer a side cue before the matched word, then one after, then the clause. */
function sideNear(text: string, match: Match, fallback: ZoneSide): ZoneSide {
  const beforeStart = Math.max(0, match.index - 80)
  const before = text.slice(beforeStart, match.index)
  const beforeLeft = cuePositions(before, LEFT_CUES).map((position) => position + beforeStart)
  const beforeRight = cuePositions(before, RIGHT_CUES).map((position) => position + beforeStart)

  const afterStart = match.index + match.text.length
  const afterEnd = Math.min(text.length, afterStart + 24)
  const after = text.slice(afterStart, afterEnd)
  const afterLeft = cuePositions(after, LEFT_CUES).map((position) => position + afterStart)
  const afterRight = cuePositions(after, RIGHT_CUES).map((position) => position + afterStart)

  const pick = (leftPositions: number[], rightPositions: number[]): ZoneSide | null => {
    if (leftPositions.length === 0 && rightPositions.length === 0) return null
    const left = nearestPosition(leftPositions, match.index)
    const right = nearestPosition(rightPositions, match.index)
    if (left === Number.POSITIVE_INFINITY) return 'right'
    if (right === Number.POSITIVE_INFINITY) return 'left'
    const leftDistance = Math.abs(left - match.index)
    const rightDistance = Math.abs(right - match.index)
    if (leftDistance === rightDistance) return 'center'
    return leftDistance < rightDistance ? 'left' : 'right'
  }

  return pick(beforeLeft, beforeRight) ?? pick(afterLeft, afterRight) ?? fallback
}

function orientationsOf(text: string): Set<Orientation> {
  const result = new Set<Orientation>()
  if (cuePositions(text, FRONT_CUES).length > 0) result.add('front')
  if (cuePositions(text, REAR_CUES).length > 0) result.add('rear')
  return result
}

function orientationsNear(
  text: string,
  match: Match,
  fallback: Set<Orientation>,
): Set<Orientation> {
  const start = Math.max(0, match.index - 80)
  const end = Math.min(text.length, match.index + match.text.length + 24)
  const window = text.slice(start, end)
  const result = new Set<Orientation>()
  if (cuePositions(window, FRONT_CUES).length > 0) result.add('front')
  if (cuePositions(window, REAR_CUES).length > 0) result.add('rear')
  if (result.size === 0) {
    for (const orientation of fallback) result.add(orientation)
  }
  return result
}

/* ------------------------------------------------------------------ */
/* Multi-vehicle detection                                             */
/* ------------------------------------------------------------------ */

const VEHICLE_NOUN_RE =
  /\b(?:suv|sedan|truck|van|pickup|hatchback|coupe|wagon|minivan|bus|motorcycle)\b/gi
const MULTI_VEHICLE_PHRASE_RE = /\b(?:second|third|other|another)\s+vehicle\b/i

/**
 * True when the summary describes damage to more than one vehicle. A single
 * vehicle named with several parts ("the SUV's hood and bumper") is not enough:
 * the nouns must appear in damage sentences, or a "second/other vehicle"
 * phrase must be present.
 */
export function isMultiVehicleSummary(summary: string): boolean {
  if (typeof summary !== 'string') return false
  const text = summary.trim()
  if (!text) return false

  const nouns = new Set<string>()
  for (const sentence of splitSentences(text)) {
    if (!DAMAGE_CUE_RE.test(sentence)) continue
    if (MULTI_VEHICLE_PHRASE_RE.test(sentence)) return true
    for (const match of sentence.matchAll(VEHICLE_NOUN_RE)) {
      nouns.add(match[0].toLowerCase())
    }
  }
  return nouns.size >= 2
}

/* ------------------------------------------------------------------ */
/* Zone rules                                                          */
/* ------------------------------------------------------------------ */

const BUMPER_PATTERN: Pattern = {
  re: /\b(?:bumpers?|fascia)\b/i,
  terms: ['pare-chocs', 'pare-choc', 'المصد'],
}
const FRONT_BUMPER_PATTERN: Pattern = {
  re: /\bfront\s+(?:bumper|fascia)\b/i,
  terms: ['pare-chocs avant', 'pare-choc avant', 'المصد الأمامي'],
}
const REAR_BUMPER_PATTERN: Pattern = {
  re: /\brear\s+(?:bumper|fascia)\b/i,
  terms: ['pare-chocs arrière', 'pare-choc arrière', 'المصد الخلفي'],
}

const FENDER_PATTERN: Pattern = {
  re: /\b(?:fenders?|wings?|quarter\s+panels?)\b(?!\s+mirror)/i,
  terms: ['aile', 'ailes', 'الرفرف'],
}
const FRONT_FENDER_PATTERN: Pattern = {
  re: /\bfront\s+(?:fender|wing|quarter\s+panel)\b/i,
  terms: ['aile avant', 'الرفرف الأمامي'],
}
const REAR_FENDER_PATTERN: Pattern = {
  re: /\brear\s+(?:fender|wing|quarter\s+panel)\b/i,
  terms: ['aile arrière', 'الرفرف الخلفي'],
}

const RULES: Array<{
  zone: ZoneCode
  pattern: Pattern
  sideSensitive?: boolean
}> = [
  {
    zone: 'hood',
    pattern: { re: /\b(?:hood|bonnet)\b/i, terms: ['capot', 'غطاء المحرك'] },
  },
  {
    zone: 'grille',
    pattern: { re: /\bgrille?\b/i, terms: ['calandre', 'الشبك'] },
  },
  {
    zone: 'headlight',
    sideSensitive: true,
    pattern: {
      re: /\b(?:head\s?lights?|headlamps?|head\s?lamps?)\b/i,
      terms: ['phare', 'phares', 'المصابيح الأمامية', 'مصباح أمامي'],
    },
  },
  {
    zone: 'taillight',
    sideSensitive: true,
    pattern: {
      re: /\b(?:tail\s?lights?|tail\s?lamps?|taillamps?)\b/i,
      terms: ['feu arrière', 'feux arrière', 'المصابيح الخلفية', 'مصباح خلفي'],
    },
  },
  {
    zone: 'trunk_lid',
    pattern: { re: /\b(?:trunk|boot|tailgate)\b/i, terms: ['coffre', 'الصندوق'] },
  },
  {
    zone: 'windshield',
    pattern: { re: /\b(?:windshield|windscreen)\b/i, terms: ['pare-brise', 'الزجاج الأمامي'] },
  },
  {
    zone: 'rear_window',
    pattern: {
      re: /\b(?:rear\s+window|back\s+glass|rear\s+glass)\b/i,
      terms: ['lunette arrière', 'الزجاج الخلفي'],
    },
  },
  {
    zone: 'door',
    sideSensitive: true,
    pattern: { re: /\bdoors?\b/i, terms: ['portière', 'portes', 'الباب'] },
  },
  {
    zone: 'mirror',
    sideSensitive: true,
    pattern: { re: /\b(?:mirror|wing\s+mirror)\b/i, terms: ['rétroviseur', 'المرآة'] },
  },
  {
    zone: 'roof',
    pattern: { re: /\broof\b/i, terms: ['toit', 'السقف'] },
  },
  {
    zone: 'wheel',
    sideSensitive: true,
    pattern: {
      re: /\b(?:wheel|tire|tyre)\b/i,
      terms: ['roue', 'pneu', 'الإطار', 'العجلة'],
    },
  },
  {
    zone: 'fog_light',
    sideSensitive: true,
    pattern: {
      re: /\b(?:fog\s?lights?|fog\s?lamps?)\b/i,
      terms: ['feu de brouillard', 'مصباح الضباب'],
    },
  },
]

function labelFor(zone: ZoneCode, side: ZoneSide, sideSensitive: boolean): string {
  const base = ZONE_LABELS[zone]
  if (!sideSensitive) return base
  if (side === 'left') return `Left ${base.toLowerCase()}`
  if (side === 'right') return `Right ${base.toLowerCase()}`
  return `${base} (side not specified)`
}

/**
 * Estimate the likely damage zones mentioned by a written summary.
 *
 * Real structured areas always take precedence at the call site; this function
 * only runs when those are absent. Multi-vehicle summaries intentionally return
 * an empty list — use `isMultiVehicleSummary` to show the notice.
 */
export function extractZonesFromSummary(summary: string): EstimatedZone[] {
  if (typeof summary !== 'string') return []
  const text = summary.trim()
  if (!text || isMultiVehicleSummary(text)) return []

  const zones: EstimatedZone[] = []
  const seen = new Set<string>()

  const add = (
    zone: ZoneCode,
    matchedText: string,
    side: ZoneSide,
    sideSensitive: boolean,
  ) => {
    const key = sideSensitive ? `${zone}:${side}` : zone
    if (seen.has(key)) return
    seen.add(key)
    zones.push({
      zone,
      label: labelFor(zone, side, sideSensitive),
      matchedText,
      side,
    })
  }

  for (const sentence of splitSentences(text)) {
    const sentenceHasNegation = NEGATION_RE.test(sentence)
    const sentenceSide = sideOf(sentence) ?? 'center'
    const sentenceOrientations = orientationsOf(sentence)
    const clauseSplitter = sentenceHasNegation
      ? /[,;]|\b(?:but|however|while|whereas|although|yet|and)\b/gi
      : /[,;]|\b(?:but|however|while|whereas|although|yet)\b/gi

    for (const clause of sentence.split(clauseSplitter).map((part) => part.trim()).filter(Boolean)) {
      if (NEGATION_RE.test(clause)) continue
      /* In a sentence with negation, a bare list item ("bumper") is too
         ambiguous; only clauses with their own positive damage cue count. */
      if (sentenceHasNegation && !DAMAGE_CUE_RE.test(clause)) continue

      const clauseSide = sideOf(clause) ?? sentenceSide

      /* Bumper / rear fascia. */
      for (const bumperMatch of findAllMatches(clause, BUMPER_PATTERN)) {
        const explicitFront = findMatch(clause, FRONT_BUMPER_PATTERN)
        const explicitRear = findMatch(clause, REAR_BUMPER_PATTERN)
        const orientations = new Set<Orientation>()
        if (explicitFront) orientations.add('front')
        if (explicitRear) orientations.add('rear')
        if (orientations.size === 0) {
          for (const orientation of orientationsNear(clause, bumperMatch, sentenceOrientations)) {
            orientations.add(orientation)
          }
        }
        if (orientations.size === 0) orientations.add('front')

        const side = sideNear(clause, bumperMatch, clauseSide)
        const matchedText = explicitFront?.text ?? explicitRear?.text ?? bumperMatch.text
        for (const orientation of orientations) {
          add(
            orientation === 'rear' ? 'rear_bumper' : 'front_bumper',
            matchedText,
            side,
            false,
          )
        }
      }

      /* Fender / wing / quarter panel. */
      for (const fenderMatch of findAllMatches(clause, FENDER_PATTERN)) {
        const explicitFront = findMatch(clause, FRONT_FENDER_PATTERN)
        const explicitRear = findMatch(clause, REAR_FENDER_PATTERN)
        const orientations = new Set<Orientation>()
        if (explicitFront) orientations.add('front')
        if (explicitRear) orientations.add('rear')
        if (orientations.size === 0) {
          for (const orientation of orientationsNear(clause, fenderMatch, sentenceOrientations)) {
            orientations.add(orientation)
          }
        }
        if (orientations.size === 0) orientations.add('front')

        const side = sideNear(clause, fenderMatch, clauseSide)
        const matchedText = explicitFront?.text ?? explicitRear?.text ?? fenderMatch.text
        for (const orientation of orientations) {
          add(
            orientation === 'rear' ? 'rear_fender' : 'front_fender',
            matchedText,
            side,
            true,
          )
        }
      }

      /* Every other zone. */
      for (const rule of RULES) {
        for (const match of findAllMatches(clause, rule.pattern)) {
          add(
            rule.zone,
            match.text,
            sideNear(clause, match, clauseSide),
            Boolean(rule.sideSensitive),
          )
        }
      }
    }
  }

  return zones.slice(0, MAX_ZONES)
}
