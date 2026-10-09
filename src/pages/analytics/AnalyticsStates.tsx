/* Loading and empty states for #/analytics.

   Both are announced with role="status": the skeleton while the demo data
   resolves, the empty panel when a filter combination matches no claims.
   Motion inside the skeleton is removed under prefers-reduced-motion. */

export function AnalyticsSkeleton() {
  return (
    <div className="ax-loading" role="status">
      <span className="sr-only">Loading analytics data…</span>

      <div className="ax-skel-row">
        <div className="ax-skel ax-skel--kpi" />
        <div className="ax-skel ax-skel--kpi" />
        <div className="ax-skel ax-skel--kpi" />
        <div className="ax-skel ax-skel--kpi" />
      </div>

      <div className="ax-skel-row ax-skel-row--split">
        <div className="ax-skel ax-skel--chart" />
        <div className="ax-skel ax-skel--chart" />
      </div>

      <div className="ax-skel-row ax-skel-row--thirds">
        <div className="ax-skel ax-skel--chart ax-skel--short" />
        <div className="ax-skel ax-skel--chart ax-skel--short" />
        <div className="ax-skel ax-skel--chart ax-skel--short" />
      </div>

      <div className="ax-skel ax-skel--panel" />
    </div>
  )
}

export function AnalyticsEmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="ax-empty" role="status">
      <span className="ax-empty__icon" aria-hidden="true">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3v18h18" />
          <path d="M8 16l4-5 3 2.5 3.5-5.5" />
          <path d="M4 4l16 16" />
        </svg>
      </span>
      <h2 className="ax-empty__title">No data for this selection</h2>
      <p className="ax-empty__text">
        No demo claims match this date range, incident type, and workflow status. Widen the
        filters to bring the picture back.
      </p>
      <button type="button" className="claims-btn claims-btn--primary" onClick={onReset}>
        Reset Filters
      </button>
    </div>
  )
}
