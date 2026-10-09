import { AppSidebar } from '../../components/layout/AppSidebar'
import { TopHeader } from '../../components/layout/TopHeader'
import { ClaimsToolbar } from './ClaimsToolbar'
import { ClaimsStatusTabs } from './ClaimsStatusTabs'
import { ClaimsTable } from './ClaimsTable'
import { ClaimsPagination } from './ClaimsPagination'
import { CreateClaimModal } from './CreateClaimModal'
import { EmptyState } from './EmptyState'
import { ClaimsToast } from './ClaimsToast'
import { cx } from '../../lib/cx'
import { EMPTY_FILTERS } from '../../lib/claimsData'
import { useClaimsQueue } from './useClaimsQueue'
import type { ClaimsQuery } from '../../lib/router'

type ClaimsPageProps = {
  /**
   * Deep link from Analytics — #/claims?tab=…&evidence=…&incident=….
   * Applied on arrival, cleared when the route drops back to plain #/claims.
   */
  query?: ClaimsQuery
}

/**
 * Claims — the shared work queue: search, filters, sorting, pagination, and
 * claim creation. Every metric, tab count, and row describes the same list,
 * so no part of the page can disagree with another. All state, derived data,
 * and handlers live in useClaimsQueue(); this is the view.
 */
export function ClaimsPage({ query }: ClaimsPageProps) {
  const {
    menuOpen,
    setMenuOpen,
    loading,
    error,
    load,
    search,
    setSearch,
    tab,
    setTab,
    filters,
    setFilters,
    sort,
    setSort,
    pageSize,
    setPageSize,
    visible,
    setVisible,
    modalOpen,
    setModalOpen,
    toast,
    setToast,
    searched,
    counts,
    sorted,
    chipActive,
    evidenceIncompleteCount,
    toggleEvidenceIncomplete,
    currentPage,
    pageRows,
    setPage,
    handleSortToggle,
    clearEverything,
    openClaim,
    handleRowAction,
    handleCreate,
  } = useClaimsQueue(query)

  return (
    <div className="dashboard-shell">
      <AppSidebar open={menuOpen} active="claims" />
      {menuOpen && (
        <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}

      <main className="main" id="main">
        <TopHeader
          onMenu={() => setMenuOpen((was) => !was)}
          breadcrumb="Workspace / Claims"
          title="Claims"
          subtitle="Manage, review, and track vehicle insurance claims across their lifecycle."
          showSearch={false}
        />

        <div className="dashboard-content claims-page">
          {loading && (
            <div className="page-state" role="status">
              <p className="page-state__title">Loading claims…</p>
            </div>
          )}

          {!loading && error && (
            <div className="page-state page-state--error" role="alert">
              <p className="page-state__title">Claims unavailable</p>
              <p className="page-state__text">{error}</p>
              <button type="button" className="claims-btn claims-btn--primary" onClick={load}>
                Try again
              </button>
            </div>
          )}

          {!loading && !error && (
            <section className="section claims-workspace" aria-label="Claims work queue">
              <ClaimsToolbar
                search={search}
                onSearchChange={setSearch}
                filters={filters}
                onApplyFilters={setFilters}
                onClearFilters={() => setFilters(EMPTY_FILTERS)}
                sort={sort}
                onSortChange={setSort}
                visible={visible}
                onToggleColumn={(key) => setVisible((prev) => ({ ...prev, [key]: !prev[key] }))}
                onNewClaim={() => setModalOpen(true)}
              />
              <div className="claims-toolbar-meta">
                {search.length > 0 && (
                  <span className="claims-result-count">
                    {sorted.length} of {searched.length} claims
                  </span>
                )}
              </div>

              <div className="panel claims-panel">
                <div className="claims-tabs-row">
                  <ClaimsStatusTabs counts={counts} active={tab} onSelect={setTab} />
                  <button
                    type="button"
                    className={cx('claims-chip', chipActive && 'claims-chip--active')}
                    aria-pressed={chipActive}
                    onClick={toggleEvidenceIncomplete}
                  >
                    Evidence incomplete <span className="claims-chip__count">({evidenceIncompleteCount})</span>
                  </button>
                </div>

                {sorted.length === 0 ? (
                  <EmptyState onClear={clearEverything} />
                ) : (
                  <>
                    <ClaimsTable
                      rows={pageRows}
                      visible={visible}
                      sort={sort}
                      onSortToggle={handleSortToggle}
                      onOpenClaim={openClaim}
                      onRowAction={handleRowAction}
                    />
                    <ClaimsPagination
                      page={currentPage}
                      pageSize={pageSize}
                      total={sorted.length}
                      onPageChange={setPage}
                      onPageSizeChange={setPageSize}
                    />
                  </>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {modalOpen && (
        <CreateClaimModal onClose={() => setModalOpen(false)} onCreate={handleCreate} />
      )}
      {toast && (
        <ClaimsToast
          message={toast.message}
          action={toast.action}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}