import { useEffect, useRef, useState } from 'react'
import { activeFilterCount, type ClaimsFilterState, type SortDir, type SortKey } from '../../lib/claimsData'
import { ClaimsFilterPanel } from './ClaimsFilterPanel'
import { ColumnsMenu } from './ColumnsMenu'
import { SortMenu, SORT_OPTIONS } from './SortMenu'
import type { ColumnKey } from './claimsColumns'

type Props = {
  search: string
  onSearchChange: (value: string) => void
  filters: ClaimsFilterState
  onApplyFilters: (filters: ClaimsFilterState) => void
  onClearFilters: () => void
  sort: { key: SortKey; dir: SortDir }
  onSortChange: (sort: { key: SortKey; dir: SortDir }) => void
  visible: Record<ColumnKey, boolean>
  onToggleColumn: (key: ColumnKey) => void
  onNewClaim: () => void
}

/**
 * The claims toolbar — search, filter / sort / columns controls, and the
 * "New Claim" action. Each control owns its trigger here; the popover bodies
 * (ClaimsFilterPanel, SortMenu, ColumnsMenu) live in their own files.
 */
export function ClaimsToolbar({
  search,
  onSearchChange,
  filters,
  onApplyFilters,
  onClearFilters,
  sort,
  onSortChange,
  visible,
  onToggleColumn,
  onNewClaim,
}: Props) {
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)
  const columnsRef = useRef<HTMLDivElement>(null)

  /* One outside-click / Escape handler owns all three popovers. */
  useEffect(() => {
    if (!filterOpen && !sortOpen && !columnsOpen) return
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (filterOpen && !filterRef.current?.contains(target)) setFilterOpen(false)
      if (sortOpen && !sortRef.current?.contains(target)) setSortOpen(false)
      if (columnsOpen && !columnsRef.current?.contains(target)) setColumnsOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFilterOpen(false)
        setSortOpen(false)
        setColumnsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [filterOpen, sortOpen, columnsOpen])

  const filterCount = activeFilterCount(filters)
  const sortValue = `${sort.key}|${sort.dir}`
  const currentSort = SORT_OPTIONS.find((o) => o.value === sortValue) ?? SORT_OPTIONS[0]

  return (
    <div className="claims-toolbar">
      <div className="claims-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          placeholder="Search by claim ID or customer…"
          aria-label="Search claims"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {search.length > 0 && (
          <button
            type="button"
            className="claims-search__clear"
            aria-label="Clear search"
            title="Clear search"
            onClick={() => onSearchChange('')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </div>

      <div className="claims-control-wrap" ref={filterRef}>
        <button
          type="button"
          className="claims-btn"
          aria-expanded={filterOpen}
          aria-haspopup="dialog"
          onClick={() => {
            setFilterOpen((v) => !v)
            setSortOpen(false)
            setColumnsOpen(false)
          }}
        >
          <FilterIcon />
          Filter
          {filterCount > 0 && <span className="claims-filter-count">{filterCount}</span>}
        </button>

        {filterOpen && (
          <ClaimsFilterPanel
            filters={filters}
            onApply={onApplyFilters}
            onClear={onClearFilters}
            onClose={() => setFilterOpen(false)}
          />
        )}
      </div>

      <div className="claims-sort claims-control-wrap" ref={sortRef}>
        <button
          type="button"
          className="claims-btn"
          aria-expanded={sortOpen}
          aria-haspopup="menu"
          aria-label={`Sort: ${currentSort.short}`}
          onClick={() => {
            setSortOpen((v) => !v)
            setFilterOpen(false)
            setColumnsOpen(false)
          }}
        >
          {currentSort.short}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {sortOpen && (
          <SortMenu
            sortValue={sortValue}
            onSelect={(key, dir) => {
              onSortChange({ key, dir })
              setSortOpen(false)
            }}
          />
        )}
      </div>

      <div className="claims-control-wrap" ref={columnsRef}>
        <button
          type="button"
          className="claims-btn claims-btn--icon"
          aria-label="Choose visible columns"
          aria-expanded={columnsOpen}
          aria-haspopup="menu"
          title="Columns"
          onClick={() => {
            setColumnsOpen((v) => !v)
            setFilterOpen(false)
            setSortOpen(false)
          }}
        >
          <ColumnsIcon />
        </button>

        {columnsOpen && <ColumnsMenu visible={visible} onToggle={onToggleColumn} />}
      </div>

      <div className="claims-toolbar__spacer" />

      <button
        type="button"
        id="claims-new-claim"
        className="claims-btn claims-btn--primary"
        onClick={onNewClaim}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New Claim
      </button>
    </div>
  )
}

function FilterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h16l-6.2 7.4V19l-3.6-2v-4.6z" />
    </svg>
  )
}

function ColumnsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M9.5 4.5v15M15 4.5v15" />
    </svg>
  )
}