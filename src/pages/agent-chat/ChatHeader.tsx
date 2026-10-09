import { useEffect, useRef, useState } from 'react'
import { cx } from '../../lib/cx'
import { CHAT_PAGE_TITLE } from '../../lib/constants'
import { PlusIcon, SparkIcon } from './chatIcons'

type Props = {
  /** e.g. "CLM-10482 · Vehicle Collision", or null in general mode. */
  context: string | null
  /** Claim IDs offered by the context switcher. */
  claimOptions: Array<{ id: string; label: string }>
  selectedClaimId: string
  onClaimChange: (claimId: string) => void
  onNewChat: () => void
  onClear: () => void
  onDeleteConversation: () => void
  /** Toggles the conversation panel (small viewports). */
  showPanelToggles: boolean
  leftOpen: boolean
  rightOpen: boolean
  onToggleLeft: () => void
  onToggleRight: () => void
}

export function ChatHeader({
  context,
  claimOptions,
  selectedClaimId,
  onClaimChange,
  onNewChat,
  onClear,
  onDeleteConversation,
  showPanelToggles,
  leftOpen,
  rightOpen,
  onToggleLeft,
  onToggleRight,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <header className="chat-header chat-header--sticky">
      <div className="chat-header__left">
        {showPanelToggles && (
          <button
            type="button"
            className={cx('chat-icon-btn chat-header__toggle', leftOpen && 'is-on')}
            aria-label="Toggle conversations panel"
            aria-expanded={leftOpen}
            aria-controls="chat-conversations"
            title="Conversations"
            onClick={onToggleLeft}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <rect x="4" y="5" width="16" height="14" rx="1.6" />
              <path d="M9.5 5v14" />
            </svg>
          </button>
        )}

        <div className="chat-header__titles">
          <div className="chat-header__title-row">
            <h1 className="chat-header__title">{CHAT_PAGE_TITLE}</h1>
          </div>
          <div className="chat-header__meta">
            <div className="chat-claim-switch">
              <label className="sr-only" htmlFor="chat-claim-switch">
                Switch claim context
              </label>
              <select
                id="chat-claim-switch"
                className="chat-claim-switch__select"
                value={selectedClaimId}
                onChange={(e) => onClaimChange(e.target.value)}
              >
                <option value="">General Claims Assistant</option>
                {claimOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <svg
                className="chat-claim-switch__chevron"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
            {context && (
              <>
                <span className="chat-context-meta">
                  <span className="chat-context-meta__item">{selectedClaimId}</span>
                  {selectedClaimId && claimOptions.length > 0 && (
                    <span className="chat-context-meta__item">
                      {claimOptions.find((o) => o.id === selectedClaimId)?.label.split(' · ')[1] || ''}
                    </span>
                  )}
                </span>
                {selectedClaimId && (
                  <a className="chat-header__workspace-link" href={`#/claims/${encodeURIComponent(selectedClaimId)}`}>
                    Open Claim Workspace
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="chat-header__actions">
        <button type="button" className="chat-ghost-btn" onClick={onNewChat}>
          <PlusIcon size={14} />
          <span className="chat-ghost-btn__label">New chat</span>
        </button>
        <button type="button" className="chat-ghost-btn" onClick={onClear}>
          <span className="chat-ghost-btn__label">Clear conversation</span>
        </button>

        <div className="chat-header__menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="chat-icon-btn"
            aria-label="Conversation menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((was) => !was)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none" />
              <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
              <circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none" />
            </svg>
          </button>
          {menuOpen && (
            <div className="chat-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="chat-menu__item"
                onClick={() => {
                  setMenuOpen(false)
                  onClear()
                }}
              >
                Clear conversation
              </button>
              <button
                type="button"
                role="menuitem"
                className="chat-menu__item chat-menu__item--danger"
                onClick={() => {
                  setMenuOpen(false)
                  onDeleteConversation()
                }}
              >
                Delete conversation
              </button>
            </div>
          )}
        </div>

        {showPanelToggles && (
          <button
            type="button"
            className={cx('chat-icon-btn chat-header__toggle', rightOpen && 'is-on')}
            aria-label="Toggle claim context panel"
            aria-expanded={rightOpen}
            aria-controls="chat-context"
            title="Claim context"
            onClick={onToggleRight}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <rect x="4" y="5" width="16" height="14" rx="1.6" />
              <path d="M14.5 5v14" />
            </svg>
          </button>
        )}
      </div>
    </header>
  )
}

/** Small icon-only assistant mark used beside AI responses. */
export function AssistantMark() {
  return (
    <span className="chat-assistant-mark" aria-hidden="true">
      <SparkIcon size={14} />
    </span>
  )
}
