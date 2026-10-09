import { cx } from '../../lib/cx'
import type { SortDir, SortKey } from '../../lib/claimsData'

/**
 * `label` is the full text shown inside the menu; `short` is the compact text
 * on the closed trigger (the default reads "Most recent").
 */
export const SORT_OPTIONS: Array<{ value: string; label: string; short: string; key: SortKey; dir: SortDir }> = [
  { value: 'updated|asc', label: 'Last updated — most recent first', short: 'Most recent', key: 'updated', dir: 'asc' },
  { value: 'updated|desc', label: 'Last updated — oldest first', short: 'Oldest first', key: 'updated', dir: 'desc' },
  { value: 'date|desc', label: 'Date reported — newest first', short: 'Newest reported', key: 'date', dir: 'desc' },
  { value: 'date|asc', label: 'Date reported — oldest first', short: 'Oldest reported', key: 'date', dir: 'asc' },
  { value: 'priority|desc', label: 'Priority — high to low', short: 'High to low', key: 'priority', dir: 'desc' },
  { value: 'priority|asc', label: 'Priority — low to high', short: 'Low to high', key: 'priority', dir: 'asc' },
  { value: 'id|desc', label: 'Claim ID — high to low', short: 'ID high to low', key: 'id', dir: 'desc' },
  { value: 'id|asc', label: 'Claim ID — low to high', short: 'ID low to high', key: 'id', dir: 'asc' },
]

type Props = {
  /** The active sort serialized as `key|dir`; the matching option is checked. */
  sortValue: string
  onSelect: (key: SortKey, dir: SortDir) => void
}

/** The sort popover body — one menuitemradio per sort option. */
export function SortMenu({ sortValue, onSelect }: Props) {
  return (
    <div className="claims-popover claims-popover--sort" role="menu" aria-label="Sort claims by">
      <div className="claims-columns__title">Sort by</div>
      {SORT_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="menuitemradio"
          aria-checked={o.value === sortValue}
          className={cx('claims-sort__item', o.value === sortValue && 'claims-sort__item--on')}
          onClick={() => onSelect(o.key, o.dir)}
        >
          <span>{o.label}</span>
          {o.value === sortValue && (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m5 12.5 5 5 9-10" />
            </svg>
          )}
        </button>
      ))}
    </div>
  )
}