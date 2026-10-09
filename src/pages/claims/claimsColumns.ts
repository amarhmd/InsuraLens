/** Columns of the claims table — metadata shared by the toolbar's column
 * picker (ClaimsToolbar) and the table header it renders (ClaimsTable). */
export type ColumnKey =
  | 'id'
  | 'customer'
  | 'incident'
  | 'date'
  | 'evidence'
  | 'priority'
  | 'status'
  | 'updated'
  | 'actions'

export const COLUMNS: Array<{ key: ColumnKey; label: string; sortable?: boolean; locked?: boolean }> = [
  { key: 'id', label: 'Claim ID', sortable: true, locked: true },
  { key: 'customer', label: 'Customer', locked: true },
  { key: 'incident', label: 'Incident Type' },
  { key: 'date', label: 'Date Reported', sortable: true },
  { key: 'evidence', label: 'Evidence' },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'status', label: 'Status', locked: true },
  { key: 'updated', label: 'Last Updated', sortable: true },
  { key: 'actions', label: 'Actions', locked: true },
]