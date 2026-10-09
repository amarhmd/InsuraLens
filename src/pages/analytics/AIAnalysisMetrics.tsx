import type { AiSnapshot } from '../../lib/analyticsData'
import { BarList, ColumnChart } from './chartKit'

/**
 * What the AI-assisted layer produced, stated as counts of claims and their
 * outcome — never as an accuracy score. Every row of the outcome breakdown is
 * an exclusive slice of the current selection, so the six rows sum to the
 * claim count, and the caption under the three metrics reconciles
 * "Analyses completed" with those rows and with the AI Analysis stage count
 * so the three figures can never be read against each other.
 */
export function AIAnalysisMetrics({ ai }: { ai: AiSnapshot }) {
  return (
    <section className="panel ax-panel" aria-labelledby="ax-ai-title">
      <div className="ax-panel__head">
        <h2 className="ax-panel__title" id="ax-ai-title">
          AI-assisted analysis
        </h2>
      </div>

      <div className="ax-mini-grid">
        {ai.metrics.map((metric) => (
          <div key={metric.key} className="ax-mini">
            <span className="ax-mini__label">{metric.label}</span>
            <span className="ax-mini__value">{metric.value}</span>
            <span className="ax-mini__hint">{metric.hint}</span>
          </div>
        ))}
      </div>

      <p className="ax-footnote">{ai.caption}</p>

      <h3 className="ax-subhead">Analyses completed over time</h3>
      <ColumnChart
        buckets={ai.activity.buckets}
        values={ai.activity.values}
        yMax={ai.activity.yMax}
        tone="teal"
        valueLabel="Analyses completed"
        description={ai.activity.description}
        emptyMessage="No completed analyses are recorded for this selection."
      />

      <h3 className="ax-subhead">Outcome breakdown</h3>
      <BarList rows={ai.outcomes} caption="Outcomes of AI-assisted analysis" />
    </section>
  )
}
