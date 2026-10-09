type Props = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function ClaimsPagination({ page, pageSize, total, onPageChange, onPageSizeChange }: Props) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="claims-pagination">
      <span className="claims-pagination__info" aria-live="polite">
        Showing {start}–{end} of {total} claims
      </span>

      <div className="claims-pagination__group">
        <label className="claims-pagination__size-label" htmlFor="claims-page-size">
          Rows
        </label>
        <select
          id="claims-page-size"
          className="claims-select claims-select--sm"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          aria-label="Claims per page"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>

      <div className="claims-pagination__group">
        <button
          type="button"
          className="claims-page-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 6-6 6 6 6" />
          </svg>
          Previous
        </button>
        <span className="claims-pagination__indicator">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          className="claims-page-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
        >
          Next
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
