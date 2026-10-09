type TopHeaderProps = {
  onMenu: () => void
  breadcrumb?: string
  title?: string
  subtitle?: string
  /** Show the DEMO MODE marker. Defaults to true — every page runs on demo data. */
  demo?: boolean
  /** Show search box in header. Defaults to false. */
  showSearch?: boolean
  onSearch?: (value: string) => void
  searchValue?: string
  searchPlaceholder?: string
}

const DEFAULTS = {
  breadcrumb: 'Workspace / Dashboard',
  title: 'Claims Overview',
  subtitle: 'Monitor your claims workload, review priorities, and recent activity.',
}

export function TopHeader({
  onMenu,
  breadcrumb,
  title,
  subtitle,
  demo = true,
  showSearch = false,
  onSearch,
  searchValue,
  searchPlaceholder = 'Search claims...',
}: TopHeaderProps) {
  const crumb = breadcrumb ?? DEFAULTS.breadcrumb
  const heading = title ?? DEFAULTS.title
  const sub = subtitle ?? DEFAULTS.subtitle

  return (
    <header className="top-header">
      <div className="top-header__bar">
        <button className="top-header__menu-btn" aria-label="Open navigation" onClick={onMenu}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <div className="top-header__breadcrumb">{crumb}</div>
        {demo && (
          <span className="top-header__demo" title="All data, identities, and permissions are simulated for this frontend demo">
            Demo data
          </span>
        )}
      </div>

      <div className="top-header__title-row">
        <div className="top-header__titles">
          <h1 className="top-header__title">{heading}</h1>
          <p className="top-header__subtitle">{sub}</p>
        </div>

        <div className="top-header__actions">
          {showSearch && (
            <label className="top-header__search">
              <SearchIcon />
              <input
                type="search"
                placeholder={searchPlaceholder}
                aria-label="Search claims"
                value={searchValue}
                onChange={(e) => onSearch?.(e.target.value)}
              />
            </label>
          )}
          <button className="top-header__icon-btn" aria-label="Notifications" title="Notifications">
            <BellIcon />
            <span className="top-header__dot" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  )
}
