export function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="claims-empty">
      <div className="claims-empty__icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5M8.5 11h5" />
        </svg>
      </div>
      <h3 className="claims-empty__title">No claims match your search</h3>
      <p className="claims-empty__text">Try a different search or clear your filters.</p>
      <button type="button" className="claims-btn claims-btn--primary" onClick={onClear}>
        Clear filters
      </button>
    </div>
  )
}
