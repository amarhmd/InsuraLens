import { useEffect, useRef, useState } from 'react'
import { cx } from '../../lib/cx'
import type { Conversation } from '../../lib/chatData'
import { PencilIcon, PlusIcon, SearchIcon, TrashIcon } from './chatIcons'

type Props = {
  conversations: Conversation[]
  activeId: string | null
  search: string
  open: boolean
  onSearch: (value: string) => void
  onSelect: (id: string) => void
  onNew: () => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  /** Closes the panel on small viewports. */
  onClose: () => void
}

type MenuState = { id: string; top: number; left: number } | null

const GROUPS: Array<Conversation['group']> = ['Recent', 'Earlier']

export function ConversationSidebar({
  conversations,
  activeId,
  search,
  open,
  onSearch,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onClose,
}: Props) {
  const [menu, setMenu] = useState<MenuState>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const editRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId) editRef.current?.focus()
  }, [editingId])

  /* Close the row menu on outside click, Escape, or scroll. */
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null)
    }
    document.addEventListener('click', close)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [menu])

  const query = search.trim().toLowerCase()
  const visible = query
    ? conversations.filter((c) => c.title.toLowerCase().includes(query))
    : conversations

  const startRename = (conv: Conversation) => {
    setEditingId(conv.id)
    setDraft(conv.title)
    setMenu(null)
  }

  const commitRename = () => {
    if (editingId) {
      const title = draft.trim()
      if (title) onRename(editingId, title)
      setEditingId(null)
    }
  }

  const requestDelete = (id: string) => {
    setMenu(null)
    onDelete(id)
  }

  return (
    <aside
      className={cx('chat-panel chat-panel--left', open && 'chat-panel--open')}
      id="chat-conversations"
      aria-label="Conversations"
    >
      <div className="chat-panel__head">
        <div className="chat-panel__title-row">
          <h2 className="chat-panel__title">Conversations</h2>
          <button
            type="button"
            className="chat-panel__close"
            aria-label="Close conversations panel"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <button type="button" className="chat-new-btn" onClick={onNew}>
          <PlusIcon size={14} />
          New conversation
        </button>

        <div className="conv-search">
          <span className="conv-search__icon" aria-hidden="true">
            <SearchIcon size={14} />
          </span>
          <input
            type="search"
            className="conv-search__input"
            placeholder="Search conversations..."
            aria-label="Search conversations"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="conv-list">
        {conversations.length === 0 ? (
          <div className="conv-empty">
            <p className="conv-empty__title">No conversations yet</p>
            <p className="conv-empty__text">
              Start a new conversation to begin an investigation.
            </p>
            <button type="button" className="chat-new-btn chat-new-btn--center" onClick={onNew}>
              <PlusIcon size={14} />
              New conversation
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="conv-empty">
            <p className="conv-empty__title">No conversations found</p>
            <p className="conv-empty__text">Try a different search term.</p>
            <button type="button" className="conv-empty__link" onClick={() => onSearch('')}>
              Clear search
            </button>
          </div>
        ) : (
          GROUPS.map((group) => {
            const items = visible.filter((c) => c.group === group)
            if (items.length === 0) return null
            return (
              <section key={group} className="conv-group" aria-label={group}>
                <h3 className="conv-group__label">{group}</h3>
                <ul className="conv-group__list">
                  {items.map((conv) => {
                    const isActive = conv.id === activeId
                    if (editingId === conv.id) {
                      return (
                        <li key={conv.id} className="conv-item conv-item--editing">
                          <input
                            ref={editRef}
                            className="conv-item__input"
                            value={draft}
                            aria-label="Conversation title"
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename()
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                          />
                        </li>
                      )
                    }
                    return (
                      <li key={conv.id} className="conv-item-wrap">
                        <button
                          type="button"
                          className={cx('conv-item', isActive && 'conv-item--active')}
                          aria-current={isActive ? 'true' : undefined}
                          onClick={() => onSelect(conv.id)}
                        >
                          <span className="conv-item__title">{conv.title}</span>
                          <span className="conv-item__time">{conv.time}</span>
                        </button>
                        <button
                          type="button"
                          className="conv-item__menu-btn"
                          aria-label={`Options for ${conv.title}`}
                          aria-haspopup="menu"
                          aria-expanded={menu?.id === conv.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            setMenu((prev) =>
                              prev && prev.id === conv.id
                                ? null
                                : { id: conv.id, top: rect.bottom + 6, left: rect.left },
                            )
                          }}
                        >
                          <span aria-hidden="true">⋯</span>
                        </button>
                        {menu?.id === conv.id && (
                          <div
                            className="conv-menu"
                            role="menu"
                            style={{ top: menu.top, left: menu.left }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              role="menuitem"
                              className="conv-menu__item"
                              onClick={() => startRename(conv)}
                            >
                              <PencilIcon size={14} />
                              Rename
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              className="conv-menu__item conv-menu__item--danger"
                              onClick={() => requestDelete(conv.id)}
                            >
                              <TrashIcon size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })
        )}
      </div>
    </aside>
  )
}
