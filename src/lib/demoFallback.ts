import type { DamageStatus } from './claimWorkspace'

export const DEMO_FALLBACK = true

const STORAGE_KEY = 'insuralens_demo_overrides'

export interface DemoOverride {
  status: string
  approvedAt?: number
  updatedAt?: number
  statusMap?: Record<string, DamageStatus>
}

export const approvedClaimIds = new Set<string>()
export const demoReviewedClaims = new Set<string>()
export const claimReviewStore = new Map<
  string,
  { approved: boolean; statusMap: Record<string, DamageStatus> }
>()

export function loadDemoOverrides(): Record<string, DemoOverride> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as Record<string, DemoOverride>
  } catch {
    return {}
  }
}

export function getDemoOverride(id: string): DemoOverride | undefined {
  return loadDemoOverrides()[id]
}

export function saveDemoOverride(id: string, data: Partial<DemoOverride>): void {
  try {
    const all = loadDemoOverrides()
    all[id] = { ...(all[id] ?? { status: 'APPROVED', approvedAt: Date.now() }), ...data } as DemoOverride
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

export function clearDemoOverrides(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  approvedClaimIds.clear()
  demoReviewedClaims.clear()
  claimReviewStore.clear()
}

export function relativeDemoTime(approvedAt?: number): string {
  if (!approvedAt) return 'Just now'
  const diffMs = Date.now() - approvedAt
  const mins = Math.floor(diffMs / 60000)
  if (mins <= 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.floor(hours / 24)} d ago`
}

// Hydrate in-memory state from persisted overrides on load.
try {
  const overrides = loadDemoOverrides()
  for (const [id, override] of Object.entries(overrides)) {
    if (override?.approvedAt) {
      approvedClaimIds.add(id)
      demoReviewedClaims.add(id)
    }
    if (override?.statusMap) {
      claimReviewStore.set(id, {
        approved: Boolean(override.approvedAt),
        statusMap: override.statusMap,
      })
    }
  }
} catch {
  /* ignore */
}
import type { Claim } from './claimsData'
export function applyDemoOverridesToClaims(rows: Claim[]): Claim[] {
  try {
    const overrides = loadDemoOverrides()
    return rows.map((claim) => {
      const override = overrides[claim.id]
      if (!override?.approvedAt) return claim
      return {
        ...claim,
        status: 'completed',
        updatedLabel: relativeDemoTime(override.updatedAt ?? override.approvedAt),
      }
    })
  } catch {
    return rows
  }
}

