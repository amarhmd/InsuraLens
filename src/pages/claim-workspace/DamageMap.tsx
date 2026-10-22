import type { DamageStatus, DamageZone, EvidenceItem } from '../../lib/claimWorkspace'
import { DamageBox } from './DamageBox'
import { DamageDetail } from './DamageDetail'
import { DamageList } from './DamageList'

type DamageMapProps = {
  damage: DamageZone[]
  statusMap: Record<string, DamageStatus>
  selectedId: string
  evidence: EvidenceItem[]
  onSelect: (id: string) => void
  onConfirm: (id: string) => void
  onDismiss: (id: string) => void
  /** Draw the AI-suggested damage boxes (Settings → AI Review Preferences). */
  showDamageBoxes: boolean
  /** Show the AI-SUGGESTED tag (Settings → AI Review Preferences). */
  showBadges: boolean
}

const CAR_LABEL =
  'Top-down view of the vehicle. Numbered markers show the damage areas under review.'

/**
 * "Damage map" — a top-down car with selectable damage areas, beside a list of
 * the same areas and a detail card for the current selection.
 */
export function DamageMap({
  damage,
  statusMap,
  selectedId,
  evidence,
  onSelect,
  onConfirm,
  onDismiss,
  showDamageBoxes,
  showBadges,
}: DamageMapProps) {
  const selected = damage.find((zone) => zone.id === selectedId) ?? damage[0] ?? null
  const evidenceLabel = selected
    ? (evidence.find((item) => item.id === selected.evidenceId)?.label ?? selected.photo)
    : ''

  return (
    <section className="cw-card cw-section" aria-labelledby="cw-damage-title">
      <div className="cw-section__head">
        <h2 className="cw-section__title" id="cw-damage-title">
          Damage map
        </h2>
        {showBadges && <span className="cw-tag">AI-SUGGESTED</span>}
      </div>

      <div className="cw-damage__layout">
        <div className="cw-damage__canvas">
          <CarIllustration />
          {showDamageBoxes &&
            damage.map((zone, index) => (
              <DamageBox
                key={zone.id}
                zone={zone}
                index={index + 1}
                status={statusMap[zone.id]}
                selected={zone.id === selectedId}
                onSelect={onSelect}
              />
            ))}
        </div>

        <div className="cw-damage__side">
          <DamageList
            damage={damage}
            statusMap={statusMap}
            selectedId={selectedId}
            onSelect={onSelect}
          />
          {selected ? (
            <DamageDetail
              zone={selected}
              status={statusMap[selected.id]}
              evidenceLabel={evidenceLabel}
              onConfirm={onConfirm}
              onDismiss={onDismiss}
            />
          ) : (
            <p className="cw-muted">
              No damage areas were reported for this claim. Run the AI analysis to look for damage.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

/* Decorative illustration — the interactive parts are the DamageBox buttons
   layered on top of this canvas, so the whole drawing is aria-hidden. */
function CarIllustration() {
  return (
    <svg className="cw-car" viewBox="0 0 220 430" role="img" aria-label={CAR_LABEL}>
      <g aria-hidden="true">
        <rect x="20" y="86" width="24" height="54" rx="10" fill="#33465a" />
        <rect x="176" y="86" width="24" height="54" rx="10" fill="#33465a" />
        <rect x="20" y="296" width="24" height="54" rx="10" fill="#33465a" />
        <rect x="176" y="296" width="24" height="54" rx="10" fill="#33465a" />

        <rect
          x="42"
          y="36"
          width="136"
          height="358"
          rx="50"
          fill="#e2e9f0"
          stroke="#c2cfdb"
          strokeWidth="2"
        />

        <path d="M60 92 Q110 66 160 92 L150 138 Q110 126 70 138 Z" fill="#c6d4e1" />
        <rect x="66" y="164" width="88" height="104" rx="16" fill="#eef3f8" stroke="#c6d4e1" />
        <path d="M70 316 Q110 328 150 316 L160 352 Q110 374 60 352 Z" fill="#c6d4e1" />
      </g>
      <text className="cw-car__label" x="110" y="18" textAnchor="middle">
        FRONT
      </text>
      <text className="cw-car__label" x="110" y="424" textAnchor="middle">
        REAR
      </text>
    </svg>
  )
}
