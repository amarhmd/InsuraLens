import type {
  DamageBBox,
  DamageStatus,
  DamageZone,
  EvidenceItem,
} from '../../lib/claimWorkspace'
import type { EstimatedZone, ZoneCode } from '../../lib/summaryZones'
import { DamageBox } from './DamageBox'
import { DamageDetail } from './DamageDetail'
import { DamageList } from './DamageList'

type DamageMapProps = {
  damage: DamageZone[]
  statusMap: Record<string, DamageStatus>
  selectedId: string
  evidence: EvidenceItem[]
  /** Persisted analysis summary, when the analysis returned one. */
  damageSummary?: string | null
  /** Zones estimated from the summary when no structured areas came back. */
  estimatedZones: EstimatedZone[]
  /** The summary names more than one vehicle, so no estimate is drawn. */
  multiVehicleSummary: boolean
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
  damageSummary,
  estimatedZones,
  multiVehicleSummary,
  onSelect,
  onConfirm,
  onDismiss,
  showDamageBoxes,
  showBadges,
}: DamageMapProps) {
  const estimatedDamage = estimatedZones.map(toEstimatedDamageZone)
  /* Real structured areas always win; estimated markers are only a fallback. */
  const displayDamage = damage.length > 0 ? damage : estimatedDamage
  const estimatedMode = damage.length === 0 && estimatedDamage.length > 0
  const activeId = displayDamage.some((zone) => zone.id === selectedId)
    ? selectedId
    : (displayDamage[0]?.id ?? '')
  const selected = displayDamage.find((zone) => zone.id === activeId) ?? displayDamage[0] ?? null
  const evidenceLabel = selected
    ? (evidence.find((item) => item.id === selected.evidenceId)?.label ?? selected.photo)
    : ''
  const hasSummary = Boolean(damageSummary?.trim())

  return (
    <section className="cw-card cw-section" aria-labelledby="cw-damage-title">
      <div className="cw-section__head">
        <h2 className="cw-section__title" id="cw-damage-title">
          Damage map
        </h2>
        {showBadges && (
          <div className="cw-damage__head-badges">
            <span className="cw-tag">AI-SUGGESTED</span>
          </div>
        )}
      </div>

      <div className="cw-damage__layout">
        <div className="cw-damage__canvas">
          <CarIllustration estimated={estimatedMode} />
          {showDamageBoxes &&
            displayDamage.map((zone, index) => (
              <DamageBox
                key={zone.id}
                zone={zone}
                index={index + 1}
                status={statusMap[zone.id] ?? 'pending'}
                selected={zone.id === activeId}
                onSelect={onSelect}
              />
            ))}
        </div>

        <div className="cw-damage__side">
          <DamageList
            damage={displayDamage}
            statusMap={statusMap}
            selectedId={activeId}
            onSelect={onSelect}
          />
          {selected ? (
            <DamageDetail
              zone={selected}
              status={statusMap[selected.id] ?? 'pending'}
              evidenceLabel={evidenceLabel}
              onConfirm={onConfirm}
              onDismiss={onDismiss}
            />
          ) : (
            <p className="cw-muted">
              {multiVehicleSummary
                ? 'The summary describes more than one vehicle. Damage areas cannot be estimated reliably.'
                : hasSummary
                  ? 'The analysis did not return specific damage areas. See the AI summary below.'
                  : 'No damage areas were reported for this claim.'}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

type EstimatedBBox = {
  center: DamageBBox
  left?: DamageBBox
  right?: DamageBBox
}

/**
 * Approximate positions on the same 220×430 canvas as the car illustration.
 * FRONT is at the top, so the vehicle's right side is on the viewer's right.
 */
const ESTIMATED_BBOX: Record<ZoneCode, EstimatedBBox> = {
  hood: { center: { left: 28, top: 8, width: 44, height: 10 } },
  front_bumper: { center: { left: 20, top: 1, width: 60, height: 6 } },
  rear_bumper: { center: { left: 20, top: 93, width: 60, height: 6 } },
  grille: { center: { left: 38, top: 4, width: 24, height: 5 } },
  headlight: {
    center: { left: 42, top: 15, width: 16, height: 6 },
    left: { left: 15, top: 15, width: 16, height: 6 },
    right: { left: 69, top: 15, width: 16, height: 6 },
  },
  taillight: {
    center: { left: 42, top: 84, width: 16, height: 6 },
    left: { left: 15, top: 84, width: 16, height: 6 },
    right: { left: 69, top: 84, width: 16, height: 6 },
  },
  front_fender: {
    center: { left: 42, top: 25, width: 16, height: 13 },
    left: { left: 9, top: 25, width: 17, height: 13 },
    right: { left: 74, top: 25, width: 17, height: 13 },
  },
  rear_fender: {
    center: { left: 42, top: 65, width: 16, height: 13 },
    left: { left: 9, top: 65, width: 17, height: 13 },
    right: { left: 74, top: 65, width: 17, height: 13 },
  },
  trunk_lid: { center: { left: 32, top: 78, width: 36, height: 8 } },
  windshield: { center: { left: 30, top: 22, width: 40, height: 9 } },
  rear_window: { center: { left: 30, top: 69, width: 40, height: 9 } },
  door: {
    center: { left: 42, top: 40, width: 16, height: 20 },
    left: { left: 11, top: 40, width: 17, height: 20 },
    right: { left: 72, top: 40, width: 17, height: 20 },
  },
  mirror: {
    center: { left: 45, top: 31, width: 10, height: 5 },
    left: { left: 7, top: 31, width: 10, height: 5 },
    right: { left: 83, top: 31, width: 10, height: 5 },
  },
  roof: { center: { left: 32, top: 36, width: 36, height: 24 } },
  wheel: {
    center: { left: 45, top: 22, width: 10, height: 8 },
    left: { left: 7, top: 22, width: 10, height: 8 },
    right: { left: 83, top: 22, width: 10, height: 8 },
  },
  fog_light: {
    center: { left: 44, top: 11, width: 12, height: 4 },
    left: { left: 22, top: 11, width: 12, height: 4 },
    right: { left: 66, top: 11, width: 12, height: 4 },
  },
}

function bboxForEstimated(zone: EstimatedZone): DamageBBox {
  const box = ESTIMATED_BBOX[zone.zone]
  if (zone.side === 'left' && box.left) return box.left
  if (zone.side === 'right' && box.right) return box.right
  return box.center
}

function toEstimatedDamageZone(zone: EstimatedZone, index: number): DamageZone {
  return {
    id: `est-${index + 1}`,
    zone: zone.label,
    photo: 'AI summary',
    evidenceId: '',
    finding: `The summary mentions “${zone.matchedText}”. Estimated from the AI summary; verify against the photos.`,
    bbox: bboxForEstimated(zone),
    status: 'pending',
    estimated: true,
    matchedText: zone.matchedText,
  }
}

/* Decorative illustration — the interactive parts are the DamageBox buttons
   layered on top of this canvas, so the whole drawing is aria-hidden. */
function CarIllustration({ estimated }: { estimated: boolean }) {
  return (
    <svg
      className="cw-car"
      viewBox="0 0 220 430"
      role="img"
      aria-label={
        estimated
          ? 'Top-down view of the vehicle. Numbered markers show areas estimated from the summary.'
          : CAR_LABEL
      }
    >
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
