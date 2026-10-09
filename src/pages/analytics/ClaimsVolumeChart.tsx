import { useState } from 'react'
import { cx } from '../../lib/cx'
import type { VolumeSeries } from '../../lib/analyticsData'
import { ChartLegend, LineChart } from './chartKit'

/**
 * Two-series line chart against reviews completed, with an equivalent table
 * view of the same numbers. Hover or keyboard-focus a point for the date and
 * both values, or flip the toggle to read the period rows directly — the two
 * views are fed from one array, so they can never disagree.
 */
export function ClaimsVolumeChart({ series }: { series: VolumeSeries }) {
  const [view, setView] = useState<'chart' | 'table'>('chart')

  return (
    <section className="panel ax-panel" aria-labelledby="ax-volume-title">
      <div className="ax-panel__head">
        <h2 className="ax-panel__title" id="ax-volume-title">
          Claims volume over time
        </h2>
        <div className="ax-panel__tools">
          <ChartLegend
            items={[
              { label: 'Claims Received', tone: 'navy' },
              { label: 'Reviews Completed', tone: 'teal', dashed: true },
            ]}
          />
          <div className="ax-seg" role="group" aria-label="Claims volume display">
            <button
              type="button"
              className={cx('ax-seg__btn', view === 'chart' && 'ax-seg__btn--on')}
              aria-pressed={view === 'chart'}
              onClick={() => setView('chart')}
            >
              Chart
            </button>
            <button
              type="button"
              className={cx('ax-seg__btn', view === 'table' && 'ax-seg__btn--on')}
              aria-pressed={view === 'table'}
              onClick={() => setView('table')}
            >
              Table view
            </button>
          </div>
        </div>
      </div>

      {view === 'chart' ? (
        <LineChart
          buckets={series.buckets}
          yMax={series.yMax}
          description={series.description}
          emptyMessage="No volume data is available for this selection."
          series={[
            { key: 'received', label: 'Claims Received', values: series.received, tone: 'navy' },
            {
              key: 'completed',
              label: 'Reviews Completed',
              values: series.completed,
              tone: 'teal',
              dashed: true,
            },
          ]}
        />
      ) : (
        <div className="ax-tableview">
          <div className="claims-table-wrap">
            <table className="claims-table">
              <caption className="sr-only">
                Claims received and reviews completed, by period.
              </caption>
              <thead>
                <tr>
                  <th className="claims-th" scope="col">
                    Period
                  </th>
                  <th className="claims-th" scope="col">
                    Claims Received
                  </th>
                  <th className="claims-th" scope="col">
                    Reviews Completed
                  </th>
                </tr>
              </thead>
              <tbody>
                {series.buckets.map((bucket, index) => (
                  <tr key={bucket.key}>
                    <td className="claims-td" data-label="Period">
                      {bucket.fullLabel}
                    </td>
                    <td className="claims-td" data-label="Claims Received">
                      {series.received[index]}
                    </td>
                    <td className="claims-td" data-label="Reviews Completed">
                      {series.completed[index]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="ax-footnote">
        Reviews Completed counts claims now in the Completed stage; the day-to-day shape is
        illustrative.
      </p>
    </section>
  )
}
