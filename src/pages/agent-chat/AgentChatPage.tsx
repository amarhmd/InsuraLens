import { useEffect, useRef, useState } from 'react'
import { AppSidebar } from '../../components/layout/AppSidebar'
import { TopBar } from '../../components/layout/TopBar'
import { ChatTabsBar } from './ChatTabsBar'
import { ChatMessageList } from './ChatMessageList'
import { MessageComposer } from './MessageComposer'
import { EvidenceDrawer } from './EvidenceDrawer'
import { EvidencePreviewPanel } from './EvidencePreviewPanel'
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog'
import { ToastNotification } from '../../components/feedback/ToastNotification'
import { cx } from '../../lib/cx'
import { useAgentChat } from './useAgentChat'
import { useChatTheme } from './useChatTheme'
import { readNoticeDismissed, writeNoticeDismissed } from './noticeStore'
import { CloseIcon } from './chatIcons'

/**
 * Agent Chat — investigation workspace.
 *
 * A single chat card filling the content area below the top bar: conversation
 * tabs, the message stream, and the composer. Conversations, claims and replies
 * are real (src/api/chat.js). Evidence lives in a slide-over opened from the
 * tabs bar, and the claim context is switched from the composer chip. All state
 * and handlers live in useAgentChat(); this is the view.
 */
export function AgentChatPage() {
  const {
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
    rightOpen,
    setRightOpen,
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
    deleteConversation,
    confirmDelete,
    clearConversation,
    setClaimContext,
    send,
    retryLastUserMessage,
    regenerateLast,
    openSource,
  } = useAgentChat() as any

  const { theme, toggle: toggleTheme } = useChatTheme()

  /* One-line data notice: shown until dismissed, then remembered. */
  const [noticeDismissed, setNoticeDismissed] = useState(readNoticeDismissed)
  const dismissNotice = () => {
    setNoticeDismissed(true)
    writeNoticeDismissed(true)
  }

  /* A brief skeleton pulse when switching conversation or claim context. */
  const [switching, setSwitching] = useState(false)
  const switchTimer = useRef<number | undefined>(undefined)
  const pulseSwitch = () => {
    setSwitching(true)
    window.clearTimeout(switchTimer.current)
    switchTimer.current = window.setTimeout(() => setSwitching(false), 320)
  }
  useEffect(() => () => window.clearTimeout(switchTimer.current), [])

  /* Escape closes the evidence slide-over (the drawer handles its own too; this
     covers the preview branch as well). */
  useEffect(() => {
    if (!rightOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRightOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [rightOpen, setRightOpen])

  const workspaceHref = claim ? `#/claims/${encodeURIComponent(claim.id)}` : null

  return (
    <div className="dashboard-shell" data-theme={theme}>
      <AppSidebar open={menuOpen} active="chat" />
      {menuOpen && (
        <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}

      <main className="main main--chat" id="main">
        <TopBar onMenu={() => setMenuOpen((was: boolean) => !was)} breadcrumb="Workspace / Agent Chat" />

        <div className="chat-layout">
          {loading && (
            <div className="page-state" role="status">
              <p className="page-state__title">Loading conversations…</p>
            </div>
          )}

          {!loading && loadError && (
            <div className="page-state page-state--error" role="alert">
              <p className="page-state__title">Agent Chat unavailable</p>
              <p className="page-state__text">{loadError}</p>
              <button type="button" className="claims-btn claims-btn--primary" onClick={load}>
                Try again
              </button>
            </div>
          )}

          {!loading && !loadError && (
            <section className="chat-surface" aria-label="Chat conversation">
              <ChatTabsBar
                conversations={conversations}
                activeId={activeId}
                search={search}
                onSearch={setSearch}
                onSelect={(id) => {
                  setActiveId(id)
                  pulseSwitch()
                  setRightMode({ kind: 'context' })
                }}
                onNew={startNewConversation}
                onClear={() => setConfirm({ kind: 'clear' })}
                onDelete={deleteConversation}
                deletingId={deletingId}
                onRename={(id, title) => {
                  updateConv(id, (c: any) => ({ ...c, title }))
                  setToast('Conversation renamed.')
                }}
                theme={theme}
                onToggleTheme={toggleTheme}
                onOpenEvidence={() => {
                  setRightMode({ kind: 'context' })
                  setRightOpen(true)
                }}
                workspaceHref={workspaceHref}
              />

              {messagesError ? (
                <div className="page-state page-state--error" role="alert">
                  <p className="page-state__title">Could not load this conversation</p>
                  <p className="page-state__text">{messagesError}</p>
                  <button
                    type="button"
                    className="claims-btn claims-btn--primary"
                    onClick={retryMessages}
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <ChatMessageList
                  messages={active?.messages ?? []}
                  loading={sending}
                  skeleton={switching || messagesLoading}
                  busyLabel="Analyzing evidence…"
                  onOpenSource={openSource}
                  onRetry={retryLastUserMessage}
                  onRegenerate={regenerateLast}
                  notice={
                    noticeDismissed ? null : (
                      <div className="chat-notice" role="note">
                        <span className="chat-notice__text">
                          Responses are generated by the configured AI assistant and may be
                          incomplete — always verify against the claim records.
                        </span>
                        <button
                          type="button"
                          className="chat-notice__dismiss"
                          aria-label="Dismiss notice"
                          title="Dismiss"
                          onClick={dismissNotice}
                        >
                          <CloseIcon size={14} />
                        </button>
                      </div>
                    )
                  }
                />
              )}

              <MessageComposer
                value={input}
                onChange={setInput}
                onSend={() => send(input)}
                sending={sending || messagesLoading}
                claimId={active?.claimId ?? null}
                claimOptions={claimOptions}
                onClaimChange={(id) => {
                  setClaimContext(id)
                  pulseSwitch()
                }}
              />
            </section>
          )}
        </div>
      </main>

      {/* Evidence slide-over: the list, or a source preview when a citation opened. */}
      {!loading && !loadError && rightMode.kind === 'preview' && (
        <aside
          className={cx('chat-evidence', rightOpen && 'chat-evidence--open')}
          aria-label="Evidence preview"
          aria-hidden={!rightOpen}
        >
          <EvidencePreviewPanel
            fileId={rightMode.sourceId}
            files={evidenceFiles}
            claim={claim}
            onBack={() => setRightMode({ kind: 'context' })}
          />
        </aside>
      )}

      {!loading && !loadError && rightMode.kind === 'context' && (
        <EvidenceDrawer
          files={evidenceFiles}
          loading={evidenceLoading}
          error={evidenceError}
          highlightedId={highlightId}
          open={rightOpen}
          onOpenFile={openSource}
          onClose={() => {
            setRightOpen(false)
            setRightMode({ kind: 'context' })
          }}
        />
      )}

      {rightOpen && (
        <div
          className="chat-evidence-scrim"
          onClick={() => setRightOpen(false)}
          aria-hidden="true"
        />
      )}

      {confirm?.kind === 'clear' && (
        <ConfirmDialog
          title="Clear conversation?"
          body="All messages in this conversation will be removed. Claim context and the conversation itself are kept. This cannot be undone."
          confirmLabel="Clear conversation"
          onConfirm={() => {
            setConfirm(null)
            clearConversation()
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete this conversation?"
          body="This cannot be undone."
          confirmLabel="Delete"
          busy={deletingId !== null}
          error={deleteError}
          onConfirm={() => {
            ;(confirmDelete as any)?.()
          }}
          onCancel={() => {
            if (deletingId) return
            setConfirm(null)
            setDeleteError?.(null)
          }}
        />
      )}

      {toast && <ToastNotification message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
