import type { DistributionRow } from '../../lib/analyticsData'
import { BarList } from './chartKit'

type Props = {
  rows: DistributionRow[]
  onSelect: (row: DistributionRow) => void
}

/**
 * Stage mix as horizontal bars in lifecycle order. Each row is a button that
 * opens the Claims page with that stage preselected, so the chart doubles as
 * a way into the underlying records rather than a dead end.
 */
export function WorkflowDistributionChart({ rows, onSelect }: Props) {
  return (
    <section className="panel ax-panel" aria-labelledby="ax-workflow-title">
      <div className="ax-panel__head">
        <h2 className="ax-panel__title" id="ax-workflow-title">
          Claims by workflow stage
        </h2>
      </div>

      <BarList
        rows={rows}
        caption="Claims by workflow stage"
        onSelect={onSelect}
        tip={(row) =>
          `${row.label}: ${row.count} claim${row.count === 1 ? '' : 's'}, ${row.percent}% of the selection. Select to open the Claims page with this stage selected.`
        }
      />

      <p className="ax-footnote">
        Counts and shares reflect the current filters. Select a stage to open the Claims page
        with that status applied.
      </p>
    </section>
  )
}
