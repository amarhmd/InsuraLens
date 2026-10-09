import { AppSidebar } from '../../components/layout/AppSidebar'
import { TopHeader } from '../../components/layout/TopHeader'
import { ChatHeader } from './ChatHeader'
import { ChatMessageList } from './ChatMessageList'
import { ConversationSidebar } from './ConversationSidebar'
import { MessageComposer } from './MessageComposer'
import { ClaimContextPanel } from './ClaimContextPanel'
import { EvidencePreviewPanel } from './EvidencePreviewPanel'
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog'
import { ToastNotification } from '../../components/feedback/ToastNotification'
import { cx } from '../../lib/cx'
import { CHAT_PAGE_TITLE, incidentLabel } from '../../lib/constants'
import { useAgentChat } from './useAgentChat'

/**
 * Agent Chat — investigation workspace.
 * Three panels: conversations, chat, claim context / evidence preview.
 * Conversations and claims arrive through src/api/ (mock-backed); replies
 * come back from sendChatMessage() as the same canned demo content.
 * All state and handlers live in useAgentChat(); this is the view.
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
  } = useAgentChat()

  const context = active?.claimId && claim ? `${claim.id} · ${incidentLabel(claim.incident)}` : null

  return (
    <div className="dashboard-shell">
      <AppSidebar open={menuOpen} active="chat" />
      {menuOpen && (
        <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}

      <main className="main main--chat" id="main">
        <TopHeader
          onMenu={() => setMenuOpen((was) => !was)}
          breadcrumb="Workspace / Agent Chat"
          title={CHAT_PAGE_TITLE}
          subtitle="Explore claim evidence, understand policy context, and investigate findings with AI assistance."
          showSearch={false}
        />

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
            <>
              <ConversationSidebar
                conversations={conversations}
                activeId={activeId}
                search={search}
                open={leftOpen}
                onSearch={setSearch}
                onSelect={(id) => {
                  setActiveId(id)
                  setLeftOpen(false)
                  setRightMode({ kind: 'context' })
                }}
                onNew={startNewConversation}
                onRename={(id, title) => {
                  updateConv(id, (c) => ({ ...c, title }))
                  setToast('Conversation renamed.')
                }}
                onDelete={(id) => setConfirm({ kind: 'delete', id })}
                onClose={() => setLeftOpen(false)}
              />

              <section className="chat-center" aria-label="Chat conversation">
                <ChatHeader
                  context={context}
                  claimOptions={claimOptions}
                  selectedClaimId={active?.claimId ?? ''}
                  onClaimChange={setClaimContext}
                  onNewChat={startNewConversation}
                  onClear={() => setConfirm({ kind: 'clear' })}
                  onDeleteConversation={() =>
                    active && setConfirm({ kind: 'delete', id: active.id })
                  }
                  showPanelToggles={showPanelToggles}
                  leftOpen={leftOpen}
                  rightOpen={rightOpen}
                  onToggleLeft={() => setLeftOpen((was) => !was)}
                  onToggleRight={() => setRightOpen((was) => !was)}
                />

                <ChatMessageList
                  messages={active?.messages ?? []}
                  loading={sending}
                  busyLabel="Reviewing mock claim records…"
                  onOpenSource={openSource}
                  onRetry={retryLastUserMessage}
                  onPickSuggestion={pickSuggestion}
                  notice={
                    <p className="chat-notice">
                      Prototype notice — responses on this page are illustrative mock content
                      generated from demo records. No live AI model, retrieval tool, or backend
                      connection is present.
                    </p>
                  }
                />

                <MessageComposer
                  value={input}
                  onChange={setInput}
                  onSend={() => send(input)}
                  onAttach={attachDemo}
                  onPickSuggestion={pickSuggestion}
                  sending={sending}
                  contextLabel={active?.claimId ? `Using context: ${active.claimId}` : null}
                />

                <input
                  ref={fileRef}
                  type="file"
                  className="sr-only"
                  aria-hidden="true"
                  tabIndex={-1}
                  onChange={(e) => {
                    const name = e.target.files?.[0]?.name
                    e.target.value = ''
                    if (name) {
                      setToast(
                        `Demo attachment “${name}” selected — files are never uploaded in this prototype.`,
                      )
                    }
                  }}
                />
              </section>

              <aside
                className={cx('chat-panel chat-panel--right', rightOpen && 'chat-panel--open')}
                id="chat-context"
                aria-label="Claim context"
              >
                {rightMode.kind === 'preview' ? (
                  <EvidencePreviewPanel
                    sourceId={rightMode.sourceId}
                    claim={claim}
                    onBack={() => setRightMode({ kind: 'context' })}
                  />
                ) : (
                  <ClaimContextPanel
                    claim={claim}
                    highlightedId={highlightId}
                    onOpenSource={openSource}
                    onClose={() => setRightOpen(false)}
                  />
                )}
              </aside>
            </>
          )}
        </div>
      </main>

      {/* Drawer scrim for the two collapsible panels. */}
      {(leftOpen || rightOpen) && (
        <div
          className="chat-scrim"
          onClick={() => {
            setLeftOpen(false)
            setRightOpen(false)
          }}
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
          title="Delete conversation?"
          body={
            conversations.find((c) => c.id === confirm.id)
              ? `“${conversations.find((c) => c.id === confirm.id)?.title}” and all of its messages will be removed. This cannot be undone.`
              : 'This conversation and all of its messages will be removed. This cannot be undone.'
          }
          confirmLabel="Delete conversation"
          onConfirm={() => {
            const id = confirm.id
            setConfirm(null)
            deleteConversation(id)
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {toast && <ToastNotification message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}