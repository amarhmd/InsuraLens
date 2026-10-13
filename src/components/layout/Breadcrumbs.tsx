type Props = {
  /** A slash-separated trail, e.g. "Workspace / Claims / CLM-10482". */
  label: string
}

/**
 * Breadcrumb trail for the compact top bar. Segments are rendered as plain
 * text (the prototype has no separate "Workspace" route, so linking a segment
 * would invent navigation that does not exist). The final segment is marked
 * `aria-current="page"`.
 */
export function Breadcrumbs({ label }: Props) {
  const parts = label
    .split(/\s*\/\s*/)
    .map((part) => part.trim())
    .filter(Boolean)

  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <ol className="crumbs__list">
        {parts.map((part, index) => {
          const current = index === parts.length - 1
          return (
            <li className="crumbs__item" key={`${part}-${index}`}>
              <span className="crumbs__text" aria-current={current ? 'page' : undefined}>
                {part}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
