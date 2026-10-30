/* ==========================================================================
   AI-assisted insight rules.

   One typed definition for the three Dashboard cards and the matching
   #/claims filters. Both callers pass the same loaded Claim[] through the
   helpers below, so a card count and the filtered queue can never disagree.

   Rules:
   * missing_evidence — no accident report / document file. Images alone or
     no files count; unknown document data does not count.
   * repeated_damage  — 2+ claims with the same incidentType and overlapping
     damage tokens. Only claims with a damageSummary or damageAreas are
     eligible; missing damage data never invents a match.
   * policy_review    — coverageStatus is unable_to_evaluate, the policy
     match requires review / is a mismatch, or inconsistencyFlag is true.

   A null count means the loaded claims do not carry enough data for that
   rule; the UI renders "—" rather than a misleading zero.
   ========================================================================== */

import type { Claim } from './claimsData'
import { resolveDamageAreas } from './damageAreas'

export type InsightKey = 'repeated_damage' | 'missing_evidence' | 'policy_review'

export const INSIGHT_KEYS: readonly InsightKey[] = [
  'repeated_damage',
  'missing_evidence',
  'policy_review',
]

export const INSIGHT_LABEL: Record<InsightKey, string> = {
  repeated_damage: 'Repeated damage pattern',
  missing_evidence: 'Missing evidence',
  policy_review: 'Policy review',
}

export function isInsightKey(value: string | null | undefined): value is InsightKey {
  return value != null && (INSIGHT_KEYS as readonly string[]).includes(value)
}

export function insightFromQuery(value: string | null | undefined): InsightKey | null {
  return isInsightKey(value) ? value : null
}

export interface InsightCounts {
  repeatedDamage: number | null
  missingEvidence: number | null
  policyReview: number | null
}

/* -------------------------------------------------------------------------- */
/* Damage tokens                                                              */
/* -------------------------------------------------------------------------- */

/* Words that carry no damage-location signal. Keeping front/rear/left/right
   and part names means "rear bumper" and "rear-left bumper" overlap. */
const DAMAGE_STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'these', 'those',
  'was', 'were', 'are', 'has', 'have', 'had', 'not', 'but', 'its', 'into',
  'over', 'under', 'near', 'onto', 'than', 'then', 'there', 'their',
  'claim', 'claims', 'vehicle', 'vehicles', 'damage', 'damaged', 'damages',
  'area', 'areas', 'zone', 'zones', 'part', 'parts', 'panel', 'panels',
  'reported', 'visible', 'appears', 'likely', 'possible', 'minor', 'major',
  'severe', 'moderate', 'collision', 'accident', 'impact', 'end', 'front-end',
  'specific', 'summary', 'analysis', 'returned', 'identified', 'shows',
  'shown', 'evidence', 'policy', 'review', 'repair', 'replace', 'replacement',
])

function tokenizeDamage(value: string | null | undefined): string[] {
  if (typeof value !== 'string' || value.trim() === '') return []
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !DAMAGE_STOP_WORDS.has(token))
}

function claimDamageTokens(claim: Claim): Set<string> {
  const tokens = new Set<string>()
  // Estimated areas are never treated as confirmed damage patterns.
  if (resolveDamageAreas(claim).source !== 'ai') return tokens
  const areas = Array.isArray(claim.damageAreas) ? claim.damageAreas : []
  for (const area of areas) {
    for (const token of tokenizeDamage(area)) tokens.add(token)
  }
  for (const token of tokenizeDamage(claim.damageSummary)) tokens.add(token)
  return tokens
}

function overlaps(a: Set<string>, b: Set<string>): boolean {
  for (const token of a) {
    if (b.has(token)) return true
  }
  return false
}

/**
 * IDs of claims that belong to a repeated-damage cluster. Returns null when
 * no loaded claim has usable damage data, so the card can show "—".
 */
function repeatedDamageIds(claims: readonly Claim[]): Set<string> | null {
  const candidates = claims
    .map((claim) => ({ claim, tokens: claimDamageTokens(claim) }))
    .filter(({ claim, tokens }) => Boolean(claim.incident) && tokens.size > 0)

  if (candidates.length === 0) return null

  const byIncident = new Map<string, { id: string; tokens: Set<string> }[]>()
  for (const { claim, tokens } of candidates) {
    const group = byIncident.get(claim.incident) ?? []
    group.push({ id: claim.id, tokens })
    byIncident.set(claim.incident, group)
  }

  const matched = new Set<string>()
  for (const group of byIncident.values()) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        if (overlaps(group[i].tokens, group[j].tokens)) {
          matched.add(group[i].id)
          matched.add(group[j].id)
        }
      }
    }
  }
  return matched
}

/* -------------------------------------------------------------------------- */
/* Missing evidence                                                           */
/* -------------------------------------------------------------------------- */

function hasKnownDocumentStatus(claim: Claim): boolean {
  return typeof claim.hasDocumentEvidence === 'boolean'
}

/* -------------------------------------------------------------------------- */
/* Policy review                                                              */
/* -------------------------------------------------------------------------- */

function coverageToken(claim: Claim): string {
  const raw = claim.coverageStatus
  if (typeof raw !== 'string') return ''
  return raw.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function isPolicyReviewClaim(claim: Claim): boolean {
  const coverage = coverageToken(claim)
  if (coverage === 'unable_to_evaluate') return true
  if (coverage === 'not_covered' || coverage === 'unclear' || coverage === 'mismatch') {
    return true
  }
  if (claim.policyMismatch === true) return true
  if (claim.policyMatch === 'Requires Review') return true
  return claim.inconsistencyFlag === true
}

function hasPolicyData(claim: Claim): boolean {
  if (typeof claim.coverageStatus === 'string' && claim.coverageStatus.trim() !== '') return true
  if (claim.inconsistencyFlag != null || claim.policyMismatch != null) return true
  return (
    claim.policyMatch === 'Matched' ||
    claim.policyMatch === 'Partial' ||
    claim.policyMatch === 'Requires Review'
  )
}

/* -------------------------------------------------------------------------- */
/* Public selectors                                                           */
/* -------------------------------------------------------------------------- */

/** Filter a claim list by one insight. Used by the Claims page. */
export function filterClaimsByInsight(
  claims: readonly Claim[],
  insight: InsightKey,
): Claim[] {
  if (insight === 'missing_evidence') {
    return claims.filter((claim) => claim.hasDocumentEvidence === false)
  }
  if (insight === 'policy_review') {
    return claims.filter(isPolicyReviewClaim)
  }

  const ids = repeatedDamageIds(claims)
  return ids ? claims.filter((claim) => ids.has(claim.id)) : []
}

/** Counts for the three Dashboard cards. Null = insufficient loaded data. */
export function countInsights(claims: readonly Claim[]): InsightCounts {
  if (claims.length === 0) {
    return { repeatedDamage: 0, missingEvidence: 0, policyReview: 0 }
  }

  const repeated = repeatedDamageIds(claims)
  const withDocumentData = claims.filter(hasKnownDocumentStatus)

  return {
    repeatedDamage: repeated ? repeated.size : null,
    missingEvidence:
      withDocumentData.length > 0
        ? withDocumentData.filter((claim) => claim.hasDocumentEvidence === false).length
        : null,
    policyReview: claims.some(hasPolicyData)
      ? claims.filter(isPolicyReviewClaim).length
      : null,
  }
}
