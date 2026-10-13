import type { ReactNode } from 'react'

type Props = {
  title: string
  /** Optional per-page supporting line; omitted pages render title only. */
  subtitle?: string
  /** Page-specific controls, rendered on the same row as the title. */
  actions?: ReactNode
}

/**
 * Page header for the content area. The global top bar is intentionally
 * minimal, so the page title (24px/600) and its optional subtitle (14px,
 * secondary) live here, beside any page-specific actions.
 */
export function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="page-head">
      <div className="page-head__text">
        <h1 className="page-head__title">{title}</h1>
        {subtitle && <p className="page-head__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </div>
  )
}
