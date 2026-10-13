import { useEffect, useRef, useState } from 'react'
import { cx } from '../../lib/cx'
import type { Conversation } from '../../lib/chatData'
import { ThemeToggle } from './ThemeToggle'
import { CloseIcon, MoreIcon, PlusIcon, SearchIcon, TrashIcon, PencilIcon } from './chatIcons'
import type { ChatTheme } from './useChatTheme'

type Props = {
  conversations: Conversation[]
  activeId: string | null
  search: string
  onSearch: (value: string) => void
  onSelect: (id: string) => void
  onNew: () => void
  onClear: () => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  theme: ChatTheme
  onToggleTheme: () => void
  /** Opens the evidence list as a slide-over over the chat. */
  onOpenEvidence: () => void
  /** Claim workspace link for the active conversation, or null in general mode. */
  workspaceHref: string | null
}

/** How many conversation tabs are shown before the rest live in History. */
const MAX_TABS = 3

const GROUPS: Array<Conversation['group']> = ['Recent', 'Earlier']

type RowMenu = { id: string } | null

/**
 * Conversation tabs bar — the chrome strip on top of the chat card. Up to three
 * recent conversations appear as tabs (the active one carries a close button);
 * everything else lives in the History popover, alongside rename and delete.
 * History, the Evidence slide-over toggle, and the overflow menu (Open workspace,
 * New chat, Clear conversation, theme) sit on the right so the primary bar stays
 * quiet.
 */
export function ChatTabsBar({
  conversations,
  activeId,
  search,
  onSearch,
  onSelect,
  onNew,
  onClear,
  onDelete,
  onRename,
  theme,
  onToggleTheme,
  onOpenEvidence,
  workspaceHref,
}: Props) {
  const [closed, setClosed] = useState<string[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [rowMenu, setRowMenu] = useState<RowMenu>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const rootRef = useRef<HTMLDivElement>(null)
  const historyBtnRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)

  /* Visible tabs: the three most recent, always keeping the active one. */
  const recent = conversations.filter((c) => !closed.includes(c.id)).slice(0, MAX_TABS + 1)
  const active = conversations.find((c) => c.id === activeId) ?? null
  const tabs = (() => {
    if (!active || closed.includes(active.id)) return recent.slice(0, MAX_TABS)
    if (recent.some((c) => c.id === active.id)) return recent.slice(0, MAX_TABS)
    return [active, ...recent].slice(0, MAX_TABS)
  })()

  const closeTab = (id: string) => {
    setClosed((prev) => [...prev, id])
    if (id === activeId) {
      const next = conversations.find((c) => c.id !== id && !closed.includes(c.id))
      if (next) onSelect(next.id)
    }
  }

  /* Focus the search field when History opens; return focus to its button. */
  useEffect(() => {
    if (historyOpen) searchRef.current?.focus()
  }, [historyOpen])

  useEffect(() => {
    if (editingId) editRef.current?.focus()
  }, [editingId])

  /* Outside click + Escape close the popover and the overflow menu. */
  useEffect(() => {
    if (!historyOpen && !menuOpen && !rowMenu) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setHistoryOpen(false)
        setMenuOpen(false)
        setRowMenu(null)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (historyOpen) {
        setHistoryOpen(false)
        historyBtnRef.current?.focus()
      }
      setMenuOpen(false)
      setRowMenu(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [historyOpen, menuOpen, rowMenu])

  const term = search.trim().toLowerCase()
  const matches = (c: Conversation) =>
    !term || c.title.toLowerCase().includes(term) || (c.claimId ?? '').toLowerCase().includes(term)

  const commitRename = (id: string) => {
    const title = draft.trim()
    if (title) onRename(id, title)
    setEditingId(null)
  }

  return (
    <div className="chat-tabs" ref={rootRef}>
      <div className="chat-tabs__list" role="tablist" aria-label="Conversations">
        {tabs.map((conv) => {
          const isActive = conv.id === activeId
          return (
            <div
              key={conv.id}
              className={cx('chat-tab', isActive && 'chat-tab--active')}
            >
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                className="chat-tab__open"
                onClick={() => onSelect(conv.id)}
                title={conv.title}
              >
                <span className="chat-tab__dot" aria-hidden="true" />
                <span className="chat-tab__label">{conv.title}</span>
              </button>
              {isActive && (
                <button
                  type="button"
                  className="chat-tab__close"
                  aria-label={`Close ${conv.title} tab`}
                  onClick={() => closeTab(conv.id)}
                >
                  <CloseIcon size={13} />
                </button>
              )}
            </div>
          )
        })}

        <button
          type="button"
          className="chat-tabs__icon"
          aria-label="New chat"
          title="New chat"
          onClick={onNew}
        >
          <PlusIcon size={16} />
        </button>
      </div>

      <div className="chat-tabs__actions">
        <button
          ref={historyBtnRef}
          type="button"
          className={cx('chat-tabs__text', historyOpen && 'is-open')}
          aria-expanded={historyOpen}
          aria-haspopup="dialog"
          onClick={() => setHistoryOpen((was) => !was)}
        >
          History
        </button>

        <button
          type="button"
          className="chat-tabs__text"
          aria-label="Open evidence panel"
          title="Open evidence panel"
          onClick={onOpenEvidence}
        >
          <EvidenceIcon />
          Evidence
        </button>

        <div className="chat-tabs__menu-wrap">
          <button
            type="button"
            className="chat-tabs__icon"
            aria-label="Conversation options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((was) => !was)}
          >
            <MoreIcon size={17} />
          </button>
          {menuOpen && (
            <div className="chat-menu" role="menu">
              {workspaceHref ? (
                <a
                  role="menuitem"
                  className="chat-menu__item"
                  href={workspaceHref}
                  onClick={() => setMenuOpen(false)}
                >
                  Open workspace
                </a>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className="chat-menu__item"
                  disabled
                >
                  Open workspace
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                className="chat-menu__item"
                onClick={() => {
                  setMenuOpen(false)
                  onNew()
                }}
              >
                New chat
              </button>
              <button
                type="button"
                role="menuitem"
                className="chat-menu__item"
                disabled={!active}
                onClick={() => {
                  setMenuOpen(false)
                  onClear()
                }}
              >
                Clear conversation
              </button>
              <div className="chat-menu__divider" role="separator" />
              <div className="chat-menu__row">
                <span className="chat-menu__row-label">Theme</span>
                <ThemeToggle theme={theme} onToggle={onToggleTheme} />
              </div>
            </div>
          )}
        </div>
      </div>

      {historyOpen && (
        <div className="chat-history" role="dialog" aria-label="Conversation history">
          <div className="chat-history__search">
            <SearchIcon size={15} className="chat-history__search-icon" />
            <input
              ref={searchRef}
              type="search"
              className="chat-history__input"
              placeholder="Search conversations"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              aria-label="Search conversations"
            />
          </div>

          {conversations.filter(matches).length === 0 ? (
            <p className="chat-history__empty">No conversations match “{search.trim()}”.</p>
          ) : (
            GROUPS.map((group) => {
              const rows = conversations.filter((c) => c.group === group && matches(c))
              if (rows.length === 0) return null
              return (
                <div className="chat-history__group" key={group}>
                  <p className="chat-history__group-label">{group}</p>
                  <ul className="chat-history__list">
                    {rows.map((conv) => (
                      <li key={conv.id} className="chat-history__row">
                        {editingId === conv.id ? (
                          <input
                            ref={editRef}
                            className="chat-history__rename"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={() => commitRename(conv.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename(conv.id)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            aria-label={`Rename ${conv.title}`}
                          />
                        ) : (
                          <button
                            type="button"
                            className={cx(
                              'chat-history__item',
                              conv.id === activeId && 'is-active',
                            )}
                            onClick={() => {
                              onSelect(conv.id)
                              setHistoryOpen(false)
                            }}
                          >
                            <span className="chat-history__title">{conv.title}</span>
                            <span className="chat-history__meta">
                              {conv.claimId && (
                                <span className="chat-history__claim">{conv.claimId}</span>
                              )}
                              <span className="chat-history__time">{conv.time}</span>
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="chat-history__more"
                          aria-label={`Options for ${conv.title}`}
                          aria-haspopup="menu"
                          aria-expanded={rowMenu?.id === conv.id}
                          onClick={() =>
                            setRowMenu((current) =>
                              current?.id === conv.id ? null : { id: conv.id },
                            )
                          }
                        >
                          <MoreIcon size={16} />
                        </button>

                        {rowMenu?.id === conv.id && (
                          <div className="chat-menu chat-menu--row" role="menu">
                            <button
                              type="button"
                              role="menuitem"
                              className="chat-menu__item"
                              onClick={() => {
                                setRowMenu(null)
                                setEditingId(conv.id)
                                setDraft(conv.title)
                              }}
                            >
                              <PencilIcon size={14} /> Rename
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              className="chat-menu__item chat-menu__item--danger"
                              onClick={() => {
                                setRowMenu(null)
                                onDelete(conv.id)
                              }}
                            >
                              <TrashIcon size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function EvidenceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7.5L14 3.5Z" />
      <path d="M13.75 3.7V8h4.1M9 14l1.6 1.6L14 12" />
    </svg>
  )
}
