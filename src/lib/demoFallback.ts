import type { DamageStatus } from './claimWorkspace'

export const DEMO_FALLBACK = true

export const approvedClaimIds = new Set<string>()
export const demoReviewedClaims = new Set<string>()
export const claimReviewStore = new Map<
  string,
  { approved: boolean; statusMap: Record<string, DamageStatus> }
>()