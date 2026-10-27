import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Claim } from '../../lib/claimsData'
import { incidentLabel } from '../../lib/constants'
import {
  clockNow,
  nextId,
  toEvidenceFile,
  type ChatEvidenceFile,
  type ChatMessage,
  type Conversation,
} from '../../lib/chatData'
import { getClaim, listClaims } from '../../api/claims'
import {
  deleteConversation as deleteConversationApi,
  getConversation,
  listConversations,
  sendChatMessage,
  sendChatWebhookMessage,
} from '../../api/chat'
import { ApiError } from '../../api/http'

export type ConfirmState = { kind: 'clear' } | { kind: 'delete'; id: string } | null
export type RightMode = { kind: 'context' } | { kind: 'preview'; sourceId: string }

/** Conversation titles truncate past this many characters. */
const MAX_TITLE_CHARS = 42

/** Remember which backend conversation was open across reloads/logins. */
const ACTIVE_CONVERSATION_KEY = 'insuralens_chat_active_id'

/**
 * Agent Chat page logic — conversations, claims, sending, and the collapsible
 * panel state. Kept separate from the JSX so AgentChatPage stays a thin view
 * over the workspace.
 */
export function useAgentChat() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(() => null)
  const [search, setSearch] = useState('')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [rightMode, setRightMode] = useState<RightMode>({ kind: 'context' })
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [showPanelToggles, setShowPanelToggles] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [evidenceFiles, setEvidenceFiles] = useState<ChatEvidenceFile[]>([])
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const pendingRequestRef = useRef<{ controller: AbortController; convId: string } | null>(null)
  /* Backend conversation ids: list rows, loaded details and adopted new ids. */
  const backendIds = useRef<Set<string>>(new Set())
  const loadedIds = useRef<Set<string>>(new Set())
  const inFlightIds = useRef<Set<string>>(new Set())
  const persistedUserMsgIds = useRef<Set<string>>(new Set())
  const messagesRequestRef = useRef<AbortController | null>(null)

  /* Load one conversation's saved transcript from the backend. */
  const loadMessages = useCallback(async (id: string) => {
    if (!id || loadedIds.current.has(id) || inFlightIds.current.has(id)) return
    messagesRequestRef.current?.abort()
    const controller = new AbortController()
    messagesRequestRef.current = controller
    inFlightIds.current.add(id)
    setMessagesLoading(true)
    setMessagesError(null)
    try {
      const detail = await getConversation(id)
      if (controller.signal.aborted) return
      loadedIds.current.add(id)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                title: c.title === 'Conversation' ? detail.title : c.title,
                claimId: detail.claimId ?? c.claimId,
                messages: detail.messages,
              }
            : c,
        ),
      )
    } catch (cause: unknown) {
      if (controller.signal.aborted) return
      setMessagesError(
        cause instanceof Error ? cause.message : 'Could not load this conversation.',
      )
    } finally {
      inFlightIds.current.delete(id)
      if (!controller.signal.aborted) setMessagesLoading(false)
    }
  }, [])

  /* Load conversations + claims through the API. Retry re-runs the call. */
  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    setMessagesError(null)
    messagesRequestRef.current?.abort()
    messagesRequestRef.current = null
    backendIds.current.clear()
    loadedIds.current.clear()
    inFlightIds.current.clear()
    persistedUserMsgIds.current.clear()
    Promise.all([listConversations(), listClaims()])
      .then(([seeded, rows]) => {
        seeded.forEach((conv) => backendIds.current.add(conv.id))
        setConversations(seeded)
        setClaims(rows)
        setLoading(false)
        let stored: string | null = null
        try {
          stored = window.localStorage.getItem(ACTIVE_CONVERSATION_KEY)
        } catch {
          stored = null
        }
        const next = stored && seeded.some((c) => c.id === stored) ? stored : (seeded[0]?.id ?? null)
        setActiveId(next)
        if (next) void loadMessages(next)
      })
      .catch((cause: unknown) => {
        setLoadError(cause instanceof Error ? cause.message : 'Could not load Agent Chat.')
        setLoading(false)
      })
  }, [loadMessages])

  useEffect(load, [load])

  /* Remember the open conversation, and fetch its transcript when it changes. */
  useEffect(() => {
    if (activeId === null) return
    try {
      window.localStorage.setItem(ACTIVE_CONVERSATION_KEY, activeId)
    } catch {
      /* Storage unavailable — selection simply isn't remembered. */
    }
    if (backendIds.current.has(activeId)) {
      void loadMessages(activeId)
    } else {
      /* New, not-yet-saved conversation — nothing to fetch yet. */
      messagesRequestRef.current?.abort()
      messagesRequestRef.current = null
      setMessagesLoading(false)
      setMessagesError(null)
    }
  }, [activeId, loadMessages])

  const retryMessages = useCallback(() => {
    if (!activeId || !backendIds.current.has(activeId)) return
    loadedIds.current.delete(activeId)
    setMessagesError(null)
    void loadMessages(activeId)
  }, [activeId, loadMessages])

  /* Panel toggles — collapse at 1280px (right), 1440px (left) */
  useEffect(() => {
    const mqLeft = window.matchMedia('(max-width: 1439px)')
    const mqRight = window.matchMedia('(max-width: 1279px)')
    const sync = () => {
      setShowPanelToggles(mqLeft.matches || mqRight.matches)
    }
    sync()
    mqLeft.addEventListener('change', sync)
    mqRight.addEventListener('change', sync)
    return () => {
      mqLeft.removeEventListener('change', sync)
      mqRight.removeEventListener('change', sync)
    }
  }, [])

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  )

  /* The pinned claim this conversation investigates. */
  const claim: Claim | undefined = useMemo(
    () => claims.find((c) => c.id === active?.claimId),
    [claims, active?.claimId],
  )

  /* Load the pinned claim's real evidence files for the drawer/preview. */
  useEffect(() => {
    const claimId = active?.claimId
    if (!claimId) {
      setEvidenceFiles([])
      setEvidenceError(null)
      setEvidenceLoading(false)
      return
    }
    let cancelled = false
    setEvidenceLoading(true)
    setEvidenceError(null)
    getClaim(claimId)
      .then((detail) => {
        if (cancelled) return
        const files = (detail?.files ?? [])
          .map(toEvidenceFile)
          .filter((file): file is ChatEvidenceFile => file !== null)
        setEvidenceFiles(files)
        setEvidenceLoading(false)
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setEvidenceError(
          cause instanceof Error ? cause.message : 'Could not load this claim’s evidence.',
        )
        setEvidenceFiles([])
        setEvidenceLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [active?.claimId])

  /* Claim switcher options: recent claims plus the active one if rare. */
  const claimOptions = useMemo(() => {
    const opts = claims.slice(0, 8).map((c) => ({
      id: c.id,
      label: `${c.id} · ${incidentLabel(c.incident)}`,
    }))
    if (active?.claimId && claim && !opts.some((o) => o.id === claim.id)) {
      opts.unshift({ id: claim.id, label: `${claim.id} · ${incidentLabel(claim.incident)}` })
    }
    return opts
  }, [active?.claimId, claim, claims])

  /* ---------------------------------------------------------------------- */
  /* Conversation mutations                                                 */
  /* ---------------------------------------------------------------------- */

  const updateConv = useCallback((id: string, fn: (c: Conversation) => Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)))
  }, [])

  const startNewConversation = useCallback(() => {
    const conv: Conversation = {
      id: nextId('conv'),
      title: 'New conversation',
      group: 'Recent',
      time: 'Just now',
      messages: [],
    }
    setConversations((prev) => [conv, ...prev])
    setActiveId(conv.id)
    setInput('')
    setRightMode({ kind: 'context' })
    setLeftOpen(false)
  }, [])

  const requestDeleteConversation = useCallback((id: string) => {
    if (pendingRequestRef.current?.convId === id) {
      pendingRequestRef.current.controller.abort()
      pendingRequestRef.current = null
    }
    setDeleteError(null)
    setConfirm({ kind: 'delete', id })
  }, [])

  const confirmDeleteConversation = useCallback(async () => {
    const id = confirm?.kind === 'delete' ? confirm.id : null
    if (!id || deletingId) return
    if (pendingRequestRef.current?.convId === id) {
      pendingRequestRef.current.controller.abort()
      pendingRequestRef.current = null
    }
    setDeletingId(id)
    setDeleteError(null)
    try {
      /* Unsaved/new conversations exist only in the UI. */
      if (backendIds.current.has(id)) await deleteConversationApi(id)
      const remaining = conversations.filter((c) => c.id !== id)
      setConversations(remaining)
      if (activeId === id) {
        setActiveId(remaining[0]?.id ?? null)
        setInput('')
        setRightMode({ kind: 'context' })
        setRightOpen(false)
        setHighlightId(null)
      }
      setToast('Conversation deleted.')
    } catch (cause: unknown) {
      if (cause instanceof ApiError && cause.status === 404) {
        const remaining = conversations.filter((c) => c.id !== id)
        setConversations(remaining)
        if (activeId === id) {
          setActiveId(remaining[0]?.id ?? null)
          setInput('')
          setRightMode({ kind: 'context' })
          setRightOpen(false)
          setHighlightId(null)
        }
        setToast('Conversation was already deleted.')
      } else {
        setDeleteError(cause instanceof Error ? cause.message : 'Could not delete the conversation.')
        setDeletingId(null)
        return
      }
    } finally {
      backendIds.current.delete(id)
      loadedIds.current.delete(id)
      setDeletingId(null)
    }
    setConfirm(null)
  }, [activeId, confirm, conversations, deletingId])

  const clearConversation = useCallback(() => {
    if (active) updateConv(active.id, (c) => ({ ...c, messages: [] }))
    setRightMode({ kind: 'context' })
    setToast('Conversation cleared.')
  }, [active, updateConv])

  const setClaimContext = useCallback(
    (claimId: string) => {
      if (!active) return
      updateConv(active.id, (c) => ({
        ...c,
        claimId: claimId || undefined,
        title:
          c.title === 'New conversation' && claimId ? `Review ${claimId}` : c.title,
      }))
      setRightMode({ kind: 'context' })
      setHighlightId(null)
    },
    [active, updateConv],
  )

  /* ---------------------------------------------------------------------- */
  /* Sending                                                                */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    return () => {
      if (pendingRequestRef.current) {
        pendingRequestRef.current.controller.abort()
        pendingRequestRef.current = null
      }
      messagesRequestRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (pendingRequestRef.current && pendingRequestRef.current.convId !== activeId) {
      pendingRequestRef.current.controller.abort()
      pendingRequestRef.current = null
      setSending(false)
    }
  }, [activeId])

  /**
   * Persist the user message (when the backend hasn't stored it yet), then ask
   * the webhook and append exactly its `output`. The backend conversation id is
   * adopted as the tab id so loading, retry, delete and the n8n sessionId all
   * use the same value.
   */
  const scheduleReply = useCallback(
    (convId: string, claimId: string | undefined, text: string, userMsgId: string) => {
      const controller = new AbortController()
      if (pendingRequestRef.current) pendingRequestRef.current.controller.abort()
      pendingRequestRef.current = { controller, convId }
      setSending(true)

      const isCurrent = (id: string) =>
        !controller.signal.aborted && pendingRequestRef.current?.convId === id

      const append = (id: string, message: ChatMessage) => {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, messages: [...c.messages, message] } : c)),
        )
      }

      const fail = (id: string) => {
        append(id, {
          id: nextId('msg'),
          role: 'assistant',
          time: clockNow(),
          error: true,
          text: 'The assistant is unavailable right now. Please try again.',
        } as ChatMessage)
      }

      ;(async () => {
        let currentId = convId
        try {
          let assistantId: string | undefined
          if (!persistedUserMsgIds.current.has(userMsgId)) {
            const knownId = backendIds.current.has(currentId)
            let persisted: Awaited<ReturnType<typeof sendChatMessage>> | null = null
            try {
              persisted = await sendChatMessage({
                question: text,
                claimId,
                conversationId: knownId ? currentId : undefined,
              })
            } catch (persistCause: unknown) {
              /* With a known conversation id the reply can still be shown. */
              if (!knownId) throw persistCause
              if (typeof console !== 'undefined') console.log('chat_persist_error')
            }
            if (controller.signal.aborted) return
            if (persisted) persistedUserMsgIds.current.add(userMsgId)

            const savedId = persisted?.conversationId
            if (savedId && savedId !== currentId) {
              const previousId = currentId
              currentId = savedId
              if (pendingRequestRef.current?.convId === previousId) {
                pendingRequestRef.current.convId = savedId
              }
              setConversations((prev) =>
                prev.map((c) => (c.id === previousId ? { ...c, id: savedId } : c)),
              )
              setActiveId((current) => (current === previousId ? savedId : current))
            }
            if (savedId) {
              backendIds.current.add(savedId)
              loadedIds.current.add(savedId)
            }
            assistantId = persisted?.assistant?.id
          }

          const replyText = await sendChatWebhookMessage(currentId, text, {
            signal: controller.signal,
          })
          if (!isCurrent(currentId)) return
          if (typeof replyText !== 'string' || replyText.trim() === '') {
            if (typeof console !== 'undefined') console.log('chat_webhook_error')
            fail(currentId)
            return
          }
          append(currentId, {
            id: assistantId ?? nextId('msg'),
            role: 'assistant',
            time: clockNow(),
            sections: [{ kind: 'paragraph', text: replyText.trim() }],
            activity: [],
          } as ChatMessage)
        } catch (cause: unknown) {
          if (controller.signal.aborted) return
          if (typeof console !== 'undefined') {
            const status = (cause as { status?: number })?.status
            if (typeof status === 'number') console.log('chat_error_status', status)
            else console.log('chat_error')
          }
          if (!isCurrent(currentId)) return
          fail(currentId)
        }
      })()
        .catch(() => {
          /* Swallow unexpected errors */
        })
        .finally(() => {
          if (pendingRequestRef.current?.controller === controller) {
            pendingRequestRef.current = null
          }
          setSending(false)
        })
    },
    [],
  )

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (!text) return
      if (sending || messagesLoading) return

      const userMsg: ChatMessage = {
        id: nextId('msg'),
        role: 'user',
        text,
        time: clockNow(),
      }

      /* No conversation left — start one so the empty state stays useful. */
      if (!active) {
        const conv: Conversation = {
          id: nextId('conv'),
          title: text.length > MAX_TITLE_CHARS ? `${text.slice(0, MAX_TITLE_CHARS)}…` : text,
          group: 'Recent',
          time: 'Just now',
          messages: [userMsg],
        }
        setConversations((prev) => [conv, ...prev])
        setActiveId(conv.id)
        setInput('')
        scheduleReply(conv.id, undefined, text, userMsg.id)
        return
      }

      const conv = active
      updateConv(conv.id, (c) => {
        const firstUser = c.messages.every((m) => m.role !== 'user')
        const title =
          c.title === 'New conversation' && firstUser
            ? text.length > MAX_TITLE_CHARS
              ? `${text.slice(0, MAX_TITLE_CHARS)}…`
              : text
            : c.title
        return { ...c, title, messages: [...c.messages, userMsg] }
      })

      setInput('')
      scheduleReply(conv.id, active.claimId, text, userMsg.id)
    },
    [active, messagesLoading, scheduleReply, sending, updateConv],
  )

  const retryLastUserMessage = useCallback(() => {
    const conv = active
    if (!conv || sending) return
    const lastUser = [...conv.messages].reverse().find((m) => m.role === 'user')
    if (!lastUser?.text) return

    /* Drop the error bubble, then re-send. The user bubble stays single. */
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conv.id
          ? { ...c, messages: c.messages.filter((m) => !m.error) }
          : c,
      ),
    )
    scheduleReply(conv.id, conv.claimId, lastUser.text, lastUser.id)
  }, [active, scheduleReply, sending])

  /* ---------------------------------------------------------------------- */
  /* Regenerate                                                             */
  /* ---------------------------------------------------------------------- */

  /* Drops the trailing assistant reply for the last question and re-sends it. */
  const regenerateLast = useCallback(() => {
    const conv = active
    if (!conv || sending) return
    const lastUserIndex = conv.messages.map((m) => m.role).lastIndexOf('user')
    if (lastUserIndex < 0) return
    const lastUser = conv.messages[lastUserIndex]
    if (!lastUser.text) return

    const kept = conv.messages.slice(0, lastUserIndex + 1)
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, messages: kept } : c)),
    )
    scheduleReply(conv.id, conv.claimId, lastUser.text, lastUser.id)
  }, [active, scheduleReply, sending])

  /* ---------------------------------------------------------------------- */
  /* Evidence preview                                                       */
  /* ---------------------------------------------------------------------- */

  const openSource = useCallback((sourceId: string) => {
    setRightMode({ kind: 'preview', sourceId })
    setHighlightId(sourceId)
    setRightOpen(true)
  }, [])

  /* Close both drawers when the viewport grows back to three panels. */
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1200px)')
    const sync = () => {
      if (mq.matches) {
        setLeftOpen(false)
        setRightOpen(false)
      }
    }
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return {
    menuOpen,
    setMenuOpen,
    conversations,
    loading,
    loadError,
    load,
    activeId,
    setActiveId,
    search,
    setSearch,
    input,
    setInput,
    sending,
    rightMode,
    setRightMode,
    highlightId,
    setHighlightId,
    leftOpen,
    setLeftOpen,
    rightOpen,
    setRightOpen,
    showPanelToggles,
    confirm,
    setConfirm,
    deleteError,
    setDeleteError,
    deletingId,
    messagesLoading,
    messagesError,
    retryMessages,
    toast,
    setToast,
    active,
    claim,
    claimOptions,
    evidenceFiles,
    evidenceLoading,
    evidenceError,
    updateConv,
    startNewConversation,
    deleteConversation: requestDeleteConversation,
    confirmDelete: confirmDeleteConversation,
    clearConversation,
    setClaimContext,
    send,
    retryLastUserMessage,
    regenerateLast,
    openSource,
  }
}