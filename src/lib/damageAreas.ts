import type { DamageStatus } from './claimWorkspace'
import { extractZonesFromSummary, isMultiVehicleSummary } from './summaryZones'

export type DamageAreaSource = 'ai' | 'estimated' | 'none'

export interface ResolvedDamageArea {
  id: string
  label: string
  zone?: string
  source: 'analysis' | 'summary_estimate'
  imageId?: string
  description?: string
  confidence: number | null
  status: DamageStatus
  photo?: string
  finding?: string
  estimated?: boolean
  matchedText?: string
}

export interface ResolveDamageAreasResult {
  areas: ResolvedDamageArea[]
  source: DamageAreaSource
  notice?: string
}

const cache = new Map<string, ResolveDamageAreasResult>()

function hashId(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}

function claimIdOf(claim: any): string {
  return String(claim?.id ?? claim?.claimId ?? claim?.claim_id ?? '')
}

function summaryOf(claim: any): string {
  const analysis = claim?.analysis ?? claim?.analysisResult
  const direct =
    typeof claim?.damageSummary === 'string'
      ? claim.damageSummary
      : typeof claim?.damage_summary === 'string'
        ? claim.damage_summary
        : ''
  const analyzed =
    typeof analysis?.damageSummary === 'string'
      ? analysis.damageSummary
      : typeof analysis?.damage_summary === 'string'
        ? analysis.damage_summary
        : ''
  return (direct || analyzed || '').trim()
}

function structuredSignature(claim: any): string {
  const analysis = claim?.analysis ?? claim?.analysisResult
  const sources = [
    claim?.damage,
    claim?.damageAreas,
    claim?.damage_areas,
    analysis?.damageAreas,
    analysis?.damage_areas,
    analysis?.findings,
    analysis?.damages,
    claim?.findings,
    claim?.damages,
  ]
  return sources.map((item) => (Array.isArray(item) ? item.length : 0)).join(',')
}

function normalizeStructured(source: unknown): ResolvedDamageArea[] {
  if (!Array.isArray(source) || source.length === 0) return []
  if (source.length > 0 && typeof source[0] === 'object' && source[0] !== null && ('zone' in (source[0] as any) || 'status' in (source[0] as any))) {
    return source.map((item: any, index: number) => ({
      id: String(item.id ?? `d${index + 1}`),
      label: String(item.zone ?? item.label ?? item.part ?? `Damage ${index + 1}`),
      zone: String(item.zone ?? item.label ?? item.part ?? `Damage ${index + 1}`),
      source: 'analysis',
      imageId: item.evidenceId ?? item.imageId ?? item.image_ref ?? '',
      description: item.finding ?? item.description ?? item.matchedText,
      confidence: typeof item.confidence === 'number' ? item.confidence : null,
      status: (item.status ?? 'pending') as DamageStatus,
      photo: item.photo ?? '',
      finding: item.finding ?? '',
      estimated: false,
      matchedText: item.matchedText,
    }))
  }
  return source
    .map((item: unknown) => {
      if (typeof item === 'string') {
        const value = item.trim()
        return value ? value : ''
      }
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>
        const value = record.part ?? record.zone ?? record.area ?? record.description ?? record.name ?? record.label
        return typeof value === 'string' ? value.trim() : ''
      }
      return ''
    })
    .filter(Boolean)
    .map((value: string, index: number) => ({
      id: `d${index + 1}`,
      label: value,
      zone: value,
      source: 'analysis' as const,
      imageId: '',
      description: value,
      confidence: null,
      status: 'pending' as DamageStatus,
    }))
}

function firstStructuredAreas(claim: any): ResolvedDamageArea[] {
  const analysis = claim?.analysis ?? claim?.analysisResult
  const sources = [
    claim?.damage,
    claim?.damageAreas,
    claim?.damage_areas,
    analysis?.damageAreas,
    analysis?.damage_areas,
    analysis?.vision?.damages,
    analysis?.damages,
    claim?.findings,
    analysis?.findings,
    claim?.damages,
  ]
  for (const source of sources) {
    if (Array.isArray(source) && source.length > 0) {
      const normalized = normalizeStructured(source)
      if (normalized.length > 0) return normalized
    }
  }
  return []
}

export function resolveDamageAreas(claim: any): ResolveDamageAreasResult {
  try {
    const id = claimIdOf(claim)
    const summary = summaryOf(claim)
    const cacheKey = `${id}::${summary}::${structuredSignature(claim)}`
    const cached = cache.get(cacheKey)
    if (cached) return cached

    const structured = firstStructuredAreas(claim)
    if (structured.length > 0) {
      const result: ResolveDamageAreasResult = { areas: structured, source: 'ai' }
      cache.set(cacheKey, result)
      return result
    }

    if (summary) {
      if (isMultiVehicleSummary(summary)) {
        const result: ResolveDamageAreasResult = {
          areas: [],
          source: 'none',
          notice: 'The summary describes more than one vehicle. Damage areas cannot be estimated reliably.',
        }
        cache.set(cacheKey, result)
        return result
      }
      const zones = extractZonesFromSummary(summary)
      if (zones.length > 0) {
        const result: ResolveDamageAreasResult = {
          areas: zones.map((zone) => ({
            id: `est-${hashId(`${id}:${zone.label.toLowerCase()}`)}`,
            label: zone.label,
            zone: zone.label,
            source: 'summary_estimate',
            imageId: '',
            description: `The summary mentions “${zone.matchedText}”. Estimated from the AI summary; verify against the photos.`,
            confidence: null,
            status: 'pending',
            photo: 'AI summary',
            finding: `The summary mentions “${zone.matchedText}”. Estimated from the AI summary; verify against the photos.`,
            estimated: true,
            matchedText: zone.matchedText,
          })),
          source: 'estimated',
        }
        cache.set(cacheKey, result)
        return result
      }
    }

    const result: ResolveDamageAreasResult = { areas: [], source: 'none' }
    cache.set(cacheKey, result)
    return result
  } catch {
    return { areas: [], source: 'none' }
  }
}

export function clearDamageAreasCache(): void {
  cache.clear()
}