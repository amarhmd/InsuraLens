import { cx } from '../../lib/cx'
import { COLUMNS, type ColumnKey } from './claimsColumns'

type Props = {
  visible: Record<ColumnKey, boolean>
  onToggle: (key: ColumnKey) => void
}

/** The columns popover body — a checkbox per non-locked column. */
export function ColumnsMenu({ visible, onToggle }: Props) {
  const activeColumns = COLUMNS.filter((c) => !c.locked)
  return (
    <div className="claims-popover claims-popover--columns" role="menu" aria-label="Visible columns">
      <div className="claims-columns__title">Visible columns</div>
      {activeColumns.map((col) => (
        <label
          key={col.key}
          className={cx('claims-check', 'claims-check--row', visible[col.key] && 'claims-check--on')}
        >
          <input type="checkbox" checked={visible[col.key]} onChange={() => onToggle(col.key)} />
          <span className="claims-check__box" aria-hidden="true">
            {visible[col.key] && (
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m5 12.5 5 5 9-10" />
              </svg>
            )}
          </span>
          <span>{col.label}</span>
        </label>
      ))}
      <p className="claims-columns__note">Claim ID, Customer, Status, and Actions are always shown.</p>
    </div>
  )
}