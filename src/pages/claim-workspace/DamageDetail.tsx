import { DAMAGE_STATUS_LABEL, type DamageStatus, type DamageZone } from '../../lib/claimWorkspace'
import { PhotoGlyph } from './glyphs'

type DamageDetailProps = {
  zone: DamageZone
  status: DamageStatus
  /** Caption of the photo tile this damage is documented by. */
  evidenceLabel: string
  onConfirm: (id: string) => void
  onDismiss: (id: string) => void
}

/** "Selected damage" card: zone, linked photo, related finding, and decisions. */
export function DamageDetail({
  zone,
  status,
  evidenceLabel,
  onConfirm,
  onDismiss,
}: DamageDetailProps) {
  return (
    <div className="cw-dmg-detail">
      <p className="cw-dmg-detail__eyebrow">Selected damage</p>
      <h3 className="cw-dmg-detail__title">{zone.zone}</h3>

      {!zone.estimated && (
        <div className="cw-dmg-detail__photo">
          <span className="cw-dmg-detail__thumb">
            <PhotoGlyph />
          </span>
          <span className="cw-dmg-detail__photo-label">
            {evidenceLabel && zone.photo && evidenceLabel === zone.photo
              ? evidenceLabel
              : evidenceLabel && zone.photo
                ? `${zone.photo} · ${evidenceLabel}`
                : evidenceLabel || zone.photo}
          </span>
        </div>
      )}

      {!zone.estimated && <p className="cw-dmg-detail__finding">{zone.finding}</p>}

      <p className="cw-dmg-detail__status">
        Status: <strong>{DAMAGE_STATUS_LABEL[status]}</strong>
      </p>

      <div className="cw-dmg-detail__actions">
        <button
          type="button"
          className="cw-btn cw-btn--primary"
          aria-pressed={status === 'confirmed'}
          onClick={() => onConfirm(zone.id)}
        >
          Confirm damage
        </button>
        <button
          type="button"
          className="cw-btn cw-btn--secondary"
          aria-pressed={status === 'dismissed'}
          onClick={() => onDismiss(zone.id)}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
