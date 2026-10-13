import { cx } from '../../lib/cx'
import { DAMAGE_STATUS_LABEL, type DamageStatus, type DamageZone } from '../../data/claim'

type DamageListProps = {
  damage: DamageZone[]
  statusMap: Record<string, DamageStatus>
  selectedId: string
  onSelect: (id: string) => void
}

/** Numbered damage rows that mirror the boxes on the illustration. */
export function DamageList({ damage, statusMap, selectedId, onSelect }: DamageListProps) {
  return (
    <ul className="cw-dmg-list" aria-label="Damage areas">
      {damage.map((zone, index) => {
        const status = statusMap[zone.id]
        const selected = zone.id === selectedId
        return (
          <li key={zone.id}>
            <button
              type="button"
              className={cx('cw-dmg-row', selected && 'cw-dmg-row--selected')}
              aria-pressed={selected}
              onClick={() => onSelect(zone.id)}
            >
              <span className="cw-dmg-row__num" aria-hidden="true">
                {index + 1}
              </span>
              <span className="cw-dmg-row__body">
                <span className="cw-dmg-row__zone">{zone.zone}</span>
                <span className="cw-dmg-row__meta">
                  {zone.photo} · {DAMAGE_STATUS_LABEL[status]}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
