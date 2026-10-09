/* Illustrative workflow-duration metrics for the "Workflow performance" panel.
   Fixed demo values — not measured from the claims dataset, and not claims
   data; the panel titles them "Illustrative" once. Re-exported from
   src/lib/analyticsData.ts, which owns the SampleMetric type. */

import type { SampleMetric } from '../lib/analyticsData'

/**
 * Four fixed durations, formatted to fit a small metric card without
 * wrapping ("12 min", "1.8 d"). The per-metric hints say what is measured,
 * not that it is sample data.
 */
export const SAMPLE_WORKFLOW_METRICS: SampleMetric[] = [
  {
    key: 'evidence',
    label: 'Evidence collection',
    value: '1.8 d',
    hint: 'Intake to complete evidence',
  },
  {
    key: 'ai',
    label: 'AI analysis',
    value: '12 min',
    hint: 'Time to draft findings',
  },
  {
    key: 'human',
    label: 'Human review',
    value: '1.4 d',
    hint: 'Reviewer time to a decision',
  },
  {
    key: 'end-to-end',
    label: 'End to end',
    value: '3.6 d',
    hint: 'Reported claim to final decision',
  },
]
