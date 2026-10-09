import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Claim } from '../../lib/claimsData'
import { incidentLabel } from '../../lib/constants'
import { clockNow, nextId, type ChatMessage, type Conversation } from '../../lib/chatData'
import { listClaims } from '../../api/claims'
import { listConversations, sendChatMessage } from '../../api/chat'

export type ConfirmState = { kind: 'clear' } | { kind: 'delete'; id: string } | null
export type RightMode = { kind: 'context' } | { kind: 'preview'; sourceId: string }

/** Conversation titles truncate past this many characters. */
const MAX_TITLE_CHARS = 42

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
  const fileRef = useRef<HTMLInputElement>(null)

  /* Load conversations + claims through the API. Retry re-runs the call. */
  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    Promise.all([listConversations(), listClaims()])
      .then(([seeded, rows]) => {
        setConversations(seeded)
        setClaims(rows)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        setLoadError(cause instanceof Error ? cause.message : 'Could not load Agent Chat.')
        setLoading(false)
      })
  }, [])

  useEffect(load, [load])

  /* Default to the first conversation once the seed arrives. */
  useEffect(() => {
    if (activeId === null && conversations.length > 0) setActiveId(conversations[0].id)
  }, [activeId, conversations])

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

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    setActiveId((current) => {
      if (current !== id) return current
      const remaining = conversations.filter((c) => c.id !== id)
      return remaining[0]?.id ?? null
    })
    setToast('Conversation deleted.')
  }, [conversations])

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

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (!text || sending) return

      /* Appends the API's reply for `text` to conversation `convId`. The
         claim context comes from the active conversation's pinned claim. */
      const scheduleReply = (convId: string, claimId: string | undefined) => {
        setSending(true)
        sendChatMessage({ question: text, claimId })
          .then((reply) => {
            setConversations((prev) =>
              prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, reply] } : c)),
            )
          })
          .catch((cause: unknown) => {
            const failed: ChatMessage = {
              id: nextId('msg'),
              role: 'assistant',
              time: clockNow(),
              error: true,
              text:
                cause instanceof Error
                  ? cause.message
                  : 'The assistant could not respond. Try again.',
            }
            setConversations((prev) =>
              prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, failed] } : c)),
            )
          })
          .finally(() => setSending(false))
      }

      /* No conversation left — start one so the empty state stays useful. */
      if (!active) {
        const conv: Conversation = {
          id: nextId('conv'),
          title: text.length > MAX_TITLE_CHARS ? `${text.slice(0, MAX_TITLE_CHARS)}…` : text,
          group: 'Recent',
          time: 'Just now',
          messages: [],
        }
        setConversations((prev) => [conv, ...prev])
        setActiveId(conv.id)
        setInput('')
        scheduleReply(conv.id, undefined)
        return
      }

      const conv = active
      const userMsg: ChatMessage = {
        id: nextId('msg'),
        role: 'user',
        text,
        time: clockNow(),
      }

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
      scheduleReply(conv.id, active.claimId)
    },
    [active, sending, updateConv],
  )

  const retryLastUserMessage = useCallback(() => {
    const conv = active
    if (!conv || sending) return
    const lastUser = [...conv.messages].reverse().find((m) => m.role === 'user')
    if (!lastUser?.text) return

    /* Drop the error bubble, then re-run the demo reply for that question. */
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conv.id
          ? { ...c, messages: c.messages.filter((m) => !m.error) }
          : c,
      ),
    )
    setSending(true)
    const question = lastUser.text
    sendChatMessage({ question, claimId: conv.claimId })
      .then((reply) => {
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, messages: [...c.messages, reply] } : c)),
        )
      })
      .catch((cause: unknown) => {
        const failed: ChatMessage = {
          id: nextId('msg'),
          role: 'assistant',
          time: clockNow(),
          error: true,
          text:
            cause instanceof Error
              ? cause.message
              : 'The assistant could not respond. Try again.',
        }
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, messages: [...c.messages, failed] } : c)),
        )
      })
      .finally(() => setSending(false))
  }, [active, sending])

  /* ---------------------------------------------------------------------- */
  /* Evidence preview                                                       */
  /* ---------------------------------------------------------------------- */

  const openSource = useCallback((sourceId: string) => {
    setRightMode({ kind: 'preview', sourceId })
    setHighlightId(sourceId)
    setRightOpen(true)
  }, [])

  const pickSuggestion = useCallback(
    (text: string) => {
      send(text)
    },
    [send],
  )

  const attachDemo = useCallback(() => {
    fileRef.current?.click()
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
    toast,
    setToast,
    fileRef,
    active,
    claim,
    claimOptions,
    updateConv,
    startNewConversation,
    deleteConversation,
    clearConversation,
    setClaimContext,
    send,
    retryLastUserMessage,
    openSource,
    pickSuggestion,
    attachDemo,
  }
}