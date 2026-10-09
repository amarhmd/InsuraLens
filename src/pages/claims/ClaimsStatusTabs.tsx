import { TABS, type TabKey } from '../../lib/claimsData'
import { stageLabel } from '../../lib/constants'
import { cx } from '../../lib/cx'

type Props = {
  counts: Record<TabKey, number>
  active: TabKey
  onSelect: (tab: TabKey) => void
}

/**
 * Compact status tabs. Counts are derived from the dataset after search and
 * filters, so the numbers always describe what the table can actually show.
 */
export function ClaimsStatusTabs({ counts, active, onSelect }: Props) {
  return (
    <div className="claims-tabs" role="group" aria-label="Filter claims by status">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          className={cx('claims-tab', tab === active && 'claims-tab--active')}
          aria-pressed={tab === active}
          onClick={() => onSelect(tab)}
        >
          <span>{tab === 'All' ? 'All Claims' : stageLabel(tab)}</span>
          <span className="claims-tab__count">{counts[tab]}</span>
        </button>
      ))}
    </div>
  )
}
