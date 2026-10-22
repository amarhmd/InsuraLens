import { ChartUnavailable } from './chartPrimitives'

/**
 * Stage timings. The backend records claim intake and decision timestamps but
 * no per-stage timestamps, so the four stage durations the panel was designed
 * for cannot be computed. Rather than invent numbers, the panel states
 * honestly that the data is not available yet. The live stage counts live in
 * the workflow distribution chart.
 */
export function WorkflowPerformance() {
  return (
    <section className="panel ax-panel" aria-labelledby="ax-perf-title">
      <div className="ax-panel__head">
        <h2 className="ax-panel__title" id="ax-perf-title">
          Workflow performance
        </h2>
      </div>

      <ChartUnavailable message="Per-stage timings are not available yet — the backend records only intake and decision times, not the time spent in each stage." />
    </section>
  )
}
