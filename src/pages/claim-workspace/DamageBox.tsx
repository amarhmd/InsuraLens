import { cx } from '../../lib/cx'
import { DAMAGE_STATUS_LABEL, type DamageZone, type DamageStatus } from '../../lib/claimWorkspace'

type DamageBoxProps = {
  zone: DamageZone
  /** 1-based number shown in the red circle badge. */
  index: number
  status: DamageStatus
  selected: boolean
  onSelect: (id: string) => void
}

/**
 * A real <button> laid over the car illustration with percentage coordinates.
 * The number badge and the textual status mean the review state never depends
 * on colour alone.
 */
export function DamageBox({ zone, index, status, selected, onSelect }: DamageBoxProps) {
  return (
    <button
      type="button"
      className={cx(
        'cw-dmg-box',
        selected && 'cw-dmg-box--selected',
        status === 'dismissed' && 'cw-dmg-box--dismissed',
      )}
      style={{
        left: `${zone.bbox.left}%`,
        top: `${zone.bbox.top}%`,
        width: `${zone.bbox.width}%`,
        height: `${zone.bbox.height}%`,
      }}
      aria-label={`${zone.zone} damage, ${DAMAGE_STATUS_LABEL[status]}`}
      aria-pressed={selected}
      onClick={() => onSelect(zone.id)}
    >
      <span className="cw-dmg-box__num" aria-hidden="true">
        {index}
      </span>
    </button>
  )
}
