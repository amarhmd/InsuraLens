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
import { ApiError } from '../../api/http'
import { navigate, type ClaimsQuery } from '../../lib/router'
import {
  filterClaimsByInsight,
  insightFromQuery,
  type InsightKey,
} from '../../lib/insights'
import { claimCreated } from '../../lib/notifications'
import { ingestNotifications } from '../../lib/notificationsStore'
import type { ClaimsToastTone } from './ClaimsToast'
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

const CREATE_TIMEOUT_MESSAGE =
  'The server is still processing your claim. Checking whether it was created...'
const CREATE_NETWORK_ERROR_MESSAGE =
  'Could not reach the server. Checking whether the claim was created...'
const CREATE_TIMEOUT_FINAL_MESSAGE =
  'The server is still processing your claim. We could not confirm it was created — check the claims list before retrying.'
const CREATE_NETWORK_ERROR_FINAL_MESSAGE =
  'Could not reach the server. We could not confirm the claim was created — check the claims list before retrying.'
const CLAIM_LOOKUP_ATTEMPTS = 6
const CLAIM_LOOKUP_INTERVAL_MS = 5_000
const CLAIM_LOOKUP_WINDOW_MS = 3 * 60_000
const CLAIM_LOOKUP_TIMEOUT_MS = 10_000

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

function normalizedCustomer(value: string) {
  return value.trim().toLowerCase()
}

/** A recently created claim for the same customer, within the 3-minute window. */
function isRecentClaimFor(claim: Claim, customer: string) {
  if (normalizedCustomer(claim.customer) !== normalizedCustomer(customer)) return false
  if (!Number.isFinite(claim.dateReportedValue)) return false
  const age = Date.now() - claim.dateReportedValue
  return age >= -60_000 && age <= CLAIM_LOOKUP_WINDOW_MS
}

/** Keep the ApiError message, status, and code visible in the toast. */
function createErrorToast(cause: unknown): ClaimsToastState {
  if (cause instanceof ApiError) {
    const labels = [
      cause.status > 0 ? `HTTP ${cause.status}` : '',
      cause.code || '',
    ].filter(Boolean)
    const suffix = labels.length > 0 ? ` (${labels.join(', ')})` : ''
    const prefix = cause.code === 'network_error' ? '' : 'Could not create the claim — '
    const message = cause.message || 'Request failed'
    return { message: `${prefix}${message}${suffix}`, tone: 'error' }
  }
  if (cause instanceof Error) {
    return { message: `Could not create the claim — ${cause.message}`, tone: 'error' }
  }
  return { message: 'Could not create the claim.', tone: 'error' }
}

export interface ClaimsToastState {
  message: string
  action?: { label: string; onClick: () => void }
  tone?: ClaimsToastTone
}

/**
 * Claims work queue logic — loading, search, tab, filters, sorting,
 * pagination, column visibility, claim creation, and the Analytics /
 * Dashboard insight deep links. Kept separate from ClaimsPage so the page
 * stays a thin view.
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
  const insight: InsightKey | null = insightFromQuery(query?.insight)

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

  /* Analytics / insight deep link. Values are validated against the real
     option lists so a hand-edited URL can only select options that exist. */
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

  /* Insight deep link (#/claims?insight=…). The rule lives in
     src/lib/insights.ts, the same helper behind the Dashboard counts. */
  const insightMatches = useMemo(() => {
    if (!insight) return null
    return new Set(filterClaimsByInsight(claims, insight).map((claim) => claim.id))
  }, [claims, insight])

  /* Search + filters first — the tab counts describe this same population. */
  const searched = useMemo(
    () =>
      claims.filter(
        (c) =>
          matchesSearch(c, search) &&
          matchesFilters(c, filters) &&
          (!insightMatches || insightMatches.has(c.id)),
      ),
    [claims, search, filters, insightMatches],
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
        (!insightMatches || insightMatches.has(c.id)) &&
        c.evidence === 'Incomplete',
    ).length
  }, [claims, search, filters, tab, insightMatches])

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

  const clearInsightFilter = useCallback(() => {
    if (!query?.insight) return
    const next: ClaimsQuery = { ...query }
    delete next.insight
    navigate({
      name: 'claims',
      query: Object.keys(next).length > 0 ? next : undefined,
    })
  }, [query])

  const clearEverything = useCallback(() => {
    setSearch('')
    setTab('All')
    setFilters(EMPTY_FILTERS)
    if (query?.insight) {
      const next: ClaimsQuery = { ...query }
      delete next.insight
      navigate({
        name: 'claims',
        query: Object.keys(next).length > 0 ? next : undefined,
      })
    }
  }, [query])

  const openClaim = useCallback((claim: Claim) => {
    navigate({ name: 'claim', id: claim.id })
  }, [])

  const handleRowAction = useCallback(
    (action: RowAction, claim: Claim) => {
      if (action === 'activity') {
        setToast({
          message: `The activity timeline for ${claim.id} isn't available yet.`,
          tone: 'info',
        })
        return
      }
      navigate({ name: 'claim', id: claim.id })
    },
    [],
  )

  const handleCreate = useCallback(
    async (draft: ClaimDraft, _idempotencyKey: string): Promise<boolean> => {
      /* Persist through the API first: the modal keeps its "Creating…" state on
         screen while the claim and any evidence files are stored, then we close
         it and refresh the queue from the server. */
      const finishSuccess = async (created: Claim) => {
        setModalOpen(false)
        /* Real event → notification bell, immediately. */
        ingestNotifications([claimCreated(created.id, created.evidenceItems)])

        /* Clear the view so the new row is visible immediately. */
        setSearch('')
        setTab('All')
        setFilters(EMPTY_FILTERS)
        setSort({ key: 'updated', dir: 'asc' })
        setPage(1)
        setToast({
          message:
            created.evidenceItems > 0
              ? `${created.id} created with ${created.evidenceItems} evidence item${created.evidenceItems === 1 ? '' : 's'}.`
              : `${created.id} created.`,
          action: {
            label: 'Open claim',
            onClick: () => navigate({ name: 'claim', id: created.id }),
          },
          tone: 'success',
        })

        try {
          const rows = await listClaims()
          setClaims(rows)
        } catch {
          /* The create succeeded even if the follow-up refresh failed. */
          setClaims((prev) =>
            prev.some((claim) => claim.id === created.id) ? prev : [created, ...prev],
          )
        }
      }

      /* A timed-out POST may still have created the claim. Poll a small
         newest-first page for the submitted customer before declaring failure. */
      const findCreatedClaim = async (): Promise<Claim | null> => {
        for (let attempt = 0; attempt < CLAIM_LOOKUP_ATTEMPTS; attempt += 1) {
          await delay(CLAIM_LOOKUP_INTERVAL_MS)
          try {
            const rows = await listClaims(
              { page_size: 5, sort: 'date' },
              { deriveEvidence: false, timeoutMs: CLAIM_LOOKUP_TIMEOUT_MS },
            )
            const found = rows
              .filter((claim) => isRecentClaimFor(claim, draft.customer))
              .sort((a, b) => b.dateReportedValue - a.dateReportedValue)[0]
            if (found) return found
          } catch {
            /* Keep checking; the create request may still be completing. */
          }
        }
        return null
      }

      try {
        const created = await createClaim(draft)
        await finishSuccess(created)
        return true
      } catch (cause) {
        const isTimeout = cause instanceof ApiError && cause.code === 'timeout'
        const isNetworkError = cause instanceof ApiError && cause.code === 'network_error'

        if (isTimeout || isNetworkError) {
          setToast({
            message: isTimeout ? CREATE_TIMEOUT_MESSAGE : CREATE_NETWORK_ERROR_MESSAGE,
            tone: 'info',
          })
          const found = await findCreatedClaim()
          if (found) {
            await finishSuccess(found)
            return true
          }
          setToast({
            message: isTimeout ? CREATE_TIMEOUT_FINAL_MESSAGE : CREATE_NETWORK_ERROR_FINAL_MESSAGE,
            tone: 'error',
          })
          return false
        }

        setToast(createErrorToast(cause))
        return false
      }
    },
    [],
  )

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
    insight,
    clearInsightFilter,
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