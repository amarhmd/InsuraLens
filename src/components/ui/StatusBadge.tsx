import { displayLabel } from '../../lib/constants'

interface StatusBadgeProps {
  status: string
}

/**
 * Renders any claim vocabulary value — a stage token ('human_review'), a
 * priority token ('high'), or a display-style value ('Matched', 'Complete').
 * The label comes from the shared constants file, and the CSS class is
 * derived from that label, so tokens and display strings land on the same
 * badge styling as before.
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const label = displayLabel(status)
  const normalized = label.toLowerCase().replace(/\s+/g, '-')
  
  let className = 'status-badge'
  if (normalized === 'needs-review') className += ' status-badge--needs-review'
  else if (normalized === 'evidence-incomplete') className += ' status-badge--evidence-incomplete'
  else if (normalized === 'human-review') className += ' status-badge--human-review'
  else if (normalized === 'in-ai-analysis' || normalized === 'ai-analysis') className += ' status-badge--in-ai-analysis'
  else if (normalized === 'new') className += ' status-badge--new'
  else if (normalized === 'evidence-collection') className += ' status-badge--evidence-collection'
  else if (normalized === 'decision-complete' || normalized === 'completed') className += ' status-badge--completed'
  else if (normalized === 'awaiting-decision') className += ' status-badge--awaiting-decision'
  else if (normalized === 'matched') className += ' status-badge--matched'
  else if (normalized === 'partial') className += ' status-badge--partial'
  else if (normalized === 'requires-review') className += ' status-badge--requires-review'
  else if (normalized === 'high') className += ' status-badge--high'
  else if (normalized === 'medium') className += ' status-badge--medium'
  else if (normalized === 'low') className += ' status-badge--low'
  else className += ' status-badge--pending'
  
  return <span className={className}>{label}</span>
}
