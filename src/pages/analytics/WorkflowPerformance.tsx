import { SAMPLE_WORKFLOW_METRICS } from '../../lib/analyticsData'

/**
 * Stage timings only. The four durations are fixed demo values — the demo
 * dataset records intake dates, not per-stage timestamps — so the panel says
 * that once, in its title, instead of repeating a badge on every metric, and
 * the values are formatted short ("12 min", "1.8 d") so no card has to wrap
 * them. The live stage counts belong to the workflow distribution chart.
 */
export function WorkflowPerformance() {
  return (
    <section className="panel ax-panel" aria-labelledby="ax-perf-title">
      <div className="ax-panel__head">
        <h2 className="ax-panel__title" id="ax-perf-title">
          Workflow performance
          <span className="ax-tag">Illustrative</span>
        </h2>
      </div>

      <div className="ax-metrics">
        {SAMPLE_WORKFLOW_METRICS.map((metric) => (
          <div key={metric.key} className="ax-metric">
            <span className="ax-metric__value">{metric.value}</span>
            <span className="ax-metric__label">{metric.label}</span>
            <span className="ax-metric__hint">{metric.hint}</span>
          </div>
        ))}
      </div>

      <p className="ax-footnote">
        The demo dataset records no per-stage timestamps.
      </p>
    </section>
  )
}
