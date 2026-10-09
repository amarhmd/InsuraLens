/* Export control for the analytics toolbar. It renders at the right end of
   the filter bar (passed in as AnalyticsFilters' trailing child), so it sits
   on the same line as, and aligned with, the filters that define what would
   be exported — and it stays disabled with a tooltip, because this prototype
   has nothing to export to. */

export function AnalyticsHeader() {
  return (
    <div className="ax-export">
      <button
        type="button"
        className="claims-btn ax-export__btn"
        aria-disabled="true"
        title="Export is not available in this prototype"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M4 21h16" />
        </svg>
        Export report
      </button>
    </div>
  )
}
