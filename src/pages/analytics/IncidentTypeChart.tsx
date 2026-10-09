import type { DistributionRow } from '../../lib/analyticsData'
import { BarList } from './chartKit'

type Props = {
  rows: DistributionRow[]
  onSelect: (row: DistributionRow) => void
}

/**
 * Incident mix, largest first. Hover or keyboard focus on a row shows the
 * category, count, and share; selecting a row opens the Claims page filtered
 * to that incident type.
 */
export function IncidentTypeChart({ rows, onSelect }: Props) {
  return (
    <section className="panel ax-panel" aria-labelledby="ax-incident-title">
      <div className="ax-panel__head">
        <h2 className="ax-panel__title" id="ax-incident-title">
          Claims by incident type
        </h2>
      </div>

      <BarList
        rows={rows}
        caption="Claims by incident type"
        onSelect={onSelect}
        tip={(row) =>
          `${row.label} — ${row.count} claim${row.count === 1 ? '' : 's'} · ${row.percent}% of the selection. Select to open the Claims page with this incident type.`
        }
      />

      <p className="ax-footnote">
        Shares are of the current selection and always total 100%.
      </p>
    </section>
  )
}
