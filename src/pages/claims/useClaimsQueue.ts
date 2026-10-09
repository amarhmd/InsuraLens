import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  EMPTY_FILTERS,
  EVIDENCE_OPTIONS,
  INCIDENT_TYPES,
  TABS,
  matchesFilters,
  matchesSearch,
  sortClaims,
  statusCounts,
  type Claim,
  type ClaimsFilterState,
  type EvidenceState,
  type IncidentType,
  type SortDir,
  type SortKey,
  type TabKey,
} from '../../lib/claimsData'
import { createClaim, listClaims } from '../../api/claims'
import { navigate, type ClaimsQuery } from '../../lib/router'
import type { ColumnKey } from './claimsColumns'
import type { RowAction } from './ClaimRowActions'
import type { ClaimDraft } from './CreateClaimModal'

const ALL_COLUMNS: Record<ColumnKey, boolean> = {
  id: true,
  customer: true,
  incident: true,
  date: true,
  evidence: true,
  priority: true,
  status: true,
  updated: true,
  actions: true,
}

export interface ClaimsToastState {
  message: string
  action?: { label: string; onClick: () => void }
}

/**
 * Claims work queue logic — loading, search, tab, filters, sorting,
 * pagination, column visibility, claim creation, and the analytics deep
 * link. Kept separate from ClaimsPage so the page stays a thin view.
 */
export function useClaimsQueue(query?: ClaimsQuery) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabKey>('All')
  const [filters, setFilters] = useState<ClaimsFilterState>(EMPTY_FILTERS)
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'updated', dir: 'asc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>(ALL_COLUMNS)
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState<ClaimsToastState | null>(null)
  const deepLinked = useRef(false)

  /* Load the queue through the API. Retry re-runs the same call. */
  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    listClaims()
      .then((rows) => {
        setClaims(rows)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Could not load claims.')
        setLoading(false)
      })
  }, [])

  useEffect(load, [load])

  /* Any change to search / tab / filters / page size returns to page one. */
  useEffect(() => {
    setPage(1)
  }, [search, tab, filters, pageSize])

  /* Analytics deep link. Values are validated against the real option lists
     so a hand-edited URL can only select options that exist. */
  useEffect(() => {
    if (query) {
      deepLinked.current = true
      setSearch('')
      setTab(query.tab && (TABS as string[]).includes(query.tab) ? (query.tab as TabKey) : 'All')
      setFilters({
        ...EMPTY_FILTERS,
        evidence:
          query.evidence && (EVIDENCE_OPTIONS as string[]).includes(query.evidence)
            ? [query.evidence as EvidenceState]
            : [],
        incidents:
          query.incident && (INCIDENT_TYPES as readonly string[]).includes(query.incident)
            ? [query.incident as IncidentType]
            : [],
      })
      setPage(1)
    } else if (deepLinked.current) {
      deepLinked.current = false
      setSearch('')
      setTab('All')
      setFilters(EMPTY_FILTERS)
      setPage(1)
    }
  }, [query])

  /* Search + filters first — the tab counts describe this same population. */
  const searched = useMemo(
    () => claims.filter((c) => matchesSearch(c, search) && matchesFilters(c, filters)),
    [claims, search, filters],
  )

  const counts = useMemo(() => statusCounts(searched), [searched])

  const visibleClaims = useMemo(
    () => (tab === 'All' ? searched : searched.filter((c) => c.status === tab)),
    [searched, tab],
  )

  const sorted = useMemo(() => sortClaims(visibleClaims, sort), [visibleClaims, sort])

  /* "Evidence incomplete" quick filter — the same evidence token the deep
     link and the filter panel use. The count is computed over the population
     one click would reveal (search + other filters + current tab, ignoring
     any evidence filter already applied), so the number never jumps. */
  const evidenceIncompleteCount = useMemo(() => {
    const withoutEvidence: ClaimsFilterState = { ...filters, evidence: [] }
    return claims.filter(
      (c) =>
        matchesSearch(c, search) &&
        matchesFilters(c, withoutEvidence) &&
        (tab === 'All' || c.status === tab) &&
        c.evidence === 'Incomplete',
    ).length
  }, [claims, search, filters, tab])

  const chipActive = filters.evidence.includes('Incomplete')

  const toggleEvidenceIncomplete = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      evidence: prev.evidence.includes('Incomplete') ? [] : ['Incomplete'],
    }))
  }, [])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSortToggle = useCallback((key: SortKey) => {
    setSort((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      /* Sensible default direction when a new column is chosen. */
      return { key, dir: key === 'updated' ? 'asc' : 'desc' }
    })
  }, [])

  const clearEverything = useCallback(() => {
    setSearch('')
    setTab('All')
    setFilters(EMPTY_FILTERS)
  }, [])

  const openClaim = useCallback((claim: Claim) => {
    navigate({ name: 'claim', id: claim.id })
  }, [])

  const handleRowAction = useCallback(
    (action: RowAction, claim: Claim) => {
      if (action === 'activity') {
        setToast({
          message: `Activity timeline for ${claim.id} is not part of this prototype yet.`,
        })
        return
      }
      navigate({ name: 'claim', id: claim.id })
    },
    [],
  )

  const handleCreate = useCallback(async (draft: ClaimDraft) => {
    /* Close right away — same visible timing as before the API layer — then
       persist through the API and refresh the queue from it. */
    setModalOpen(false)
    try {
      const created = await createClaim(draft)
      const rows = await listClaims()
      setClaims(rows)

      /* Clear the view so the new row is visible immediately. */
      setSearch('')
      setTab('All')
      setFilters(EMPTY_FILTERS)
      setSort({ key: 'updated', dir: 'asc' })
      setPage(1)
      setToast({
        message:
          created.evidenceItems > 0
            ? `${created.id} created with ${created.evidenceItems} evidence item${created.evidenceItems === 1 ? '' : 's'} — saved in this browser session.`
            : `${created.id} created — saved in this browser session.`,
        action: { label: 'Open claim', onClick: () => navigate({ name: 'claim', id: created.id }) },
      })
    } catch (cause) {
      setToast({
        message:
          cause instanceof Error
            ? `Could not create the claim — ${cause.message}`
            : 'Could not create the claim.',
      })
    }
  }, [])

  return {
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
    page,
    setPage,
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
    handleSortToggle,
    clearEverything,
    openClaim,
    handleRowAction,
    handleCreate,
  }
}