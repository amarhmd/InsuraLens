/* ==========================================================================
   Claim workspace view model — the shape the #/claims/:id page renders.

   These types are presentation-only. They are produced from the real backend
   claim detail by src/api/claimWorkspace.ts (mapClaimDetail); nothing here is
   data. Keeping them in a leaf module lets the presentational components import
   the shape without pulling in the API layer.

   The view model is the only thing left; the claim data itself always comes
   from the backend.

   The AI analysis card's data shape (AnalysisResult) lives next door in
   src/lib/analysisResult.ts, together with the adapter that turns the n8n
   workflow's payload into it; this module only references the type.
   ========================================================================== */

import type { AnalysisResult } from './analysisResult'

/** Review state of a single damage area. */
export type DamageStatus = 'pending' | 'confirmed' | 'dismissed'

/** Badge tones available to the page (each maps to one CSS modifier). */
export type BadgeTone = 'human' | 'priority' | 'supported' | 'needs' | 'info'

export type EvidenceKind = 'photo' | 'document'

/** Triage priority carried by a claim. */
export type ClaimPriority = 'high' | 'medium' | 'low'

/** Workflow stage a claim sits in. */
export type ClaimStage =
  | 'new'
  | 'evidence_collection'
  | 'ai_analysis'
  | 'human_review'
  | 'completed'

/** Position of a damage area over the illustration, in percentages of its box. */
export interface DamageBBox {
  left: number
  top: number
  width: number
  height: number
}

export interface EvidenceItem {
  id: string
  label: string
  kind: EvidenceKind
}

export interface PolicyRow {
  label: string
  value: string
  tone?: 'default' | 'success'
}

export interface SummaryItem {
  label: string
  value: string
}

export interface Badge {
  label: string
  tone: BadgeTone
}

/** A damage area as the page renders it. */
export interface DamageZone {
  id: string
  zone: string
  photo: string
  /** Evidence item id this damage is documented by. */
  evidenceId: string
  finding: string
  bbox: DamageBBox
  /** Initial review state; the page seeds its status map from this. */
  status: DamageStatus
}

export interface ClaimWorkspaceData {
  id: string
  customer: string
  incident: string
  dateReported: string
  /** The customer's contract policy reference (shown read-only, never uploaded). */
  policyRef: string
  /** Name of the customer's stored policy document, or null when none is on file. */
  policyDocument: string | null
  badges: Badge[]
  summary: SummaryItem[]
  evidence: EvidenceItem[]
  damage: DamageZone[]
  /** Everything the AI analysis card renders — see AnalysisResult. */
  analysis: AnalysisResult
  policy: PolicyRow[]
}

/** Human labels for a damage area's review state — never colour alone. */
export const DAMAGE_STATUS_LABEL: Record<DamageStatus, string> = {
  pending: 'Awaiting review',
  confirmed: 'Confirmed',
  dismissed: 'Dismissed',
}
