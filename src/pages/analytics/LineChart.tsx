import type { PointerEvent as ReactPointerEvent } from 'react'
import { cx } from '../../lib/cx'
import type { ChartBucket } from '../../lib/analyticsData'
import {
  ChartTooltip,
  ChartUnavailable,
  PLOT,
  SrTable,
  TipRow,
  useChartCursor,
  useElementWidth,
  xStride,
  yTicks,
} from './chartPrimitives'

type LineSeriesDef = {
  key: string
  label: string
  values: number[]
  tone: string
  dashed?: boolean
}

type LineChartProps = {
  buckets: ChartBucket[]
  series: LineSeriesDef[]
  yMax: number
  description: string
  emptyMessage: string
}

/**
 * Line chart — Claims volume over time (two series). Pointer and keyboard
 * share the axis-cursor interaction model from chartPrimitives.
 */
export function LineChart({ buckets, series, yMax, description, emptyMessage }: LineChartProps) {
  const { ref, width } = useElementWidth<HTMLElement>()
  const n = buckets.length
  const cursorState = useChartCursor(n)

  if (n === 0) return <ChartUnavailable message={emptyMessage} />

  const { left: padLeft, right: padRight, top: padTop, bottom: padBottom, height: H } = PLOT
  const plotW = Math.max(width - padLeft - padRight, 80)
  const plotH = H - padTop - padBottom
  const step = plotW / n
  const xAt = (i: number) => padLeft + step * (i + 0.5)
  const yAt = (v: number) => padTop + plotH - (v / yMax) * plotH
  const stride = xStride(n, plotW)
  /* Snapshot: narrowing `cursorState.cursor` does not survive into the JSX
     callbacks below, a plain local does. */
  const active = cursorState.cursor

  const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const raw = (event.clientX - rect.left - padLeft) / step
    if (raw < 0 || raw >= n) {
      cursorState.leave()
      return
    }
    cursorState.move(Math.floor(raw))
  }

  const bucketLabel = (bucket: ChartBucket, index: number) =>
    `${bucket.fullLabel}: ${series.map((s) => `${s.label} ${s.values[index]}`).join(', ')}.`

  const srRows = buckets.map((bucket, index) => [
    bucket.fullLabel,
    ...series.map((s) => s.values[index]),
  ])

  return (
    <figure className="ax-chart" ref={ref}>
      <div
        className="ax-chart__plot"
        style={{ height: H }}
        onPointerMove={handleMove}
        onPointerLeave={cursorState.leave}
      >
        <svg width={width} height={H} aria-hidden="true" focusable="false">
          {yTicks(yMax).map((tick) => (
            <g key={tick}>
              <line className="ax-gridline" x1={padLeft} x2={padLeft + plotW} y1={yAt(tick)} y2={yAt(tick)} />
              <text className="ax-axis-label" x={padLeft - 8} y={yAt(tick) + 3.5} textAnchor="end">
                {tick}
              </text>
            </g>
          ))}

          {buckets.map((bucket, index) =>
            index % stride === 0 ? (
              <text
                key={bucket.key}
                className="ax-axis-label"
                x={xAt(index)}
                y={H - 10}
                textAnchor="middle"
              >
                {bucket.label}
              </text>
            ) : null,
          )}

          {active !== null && (
            <line
              className="ax-guide"
              x1={xAt(active)}
              x2={xAt(active)}
              y1={padTop}
              y2={padTop + plotH}
            />
          )}

          {series.map((s) => (
            <polyline
              key={s.key}
              className={cx('ax-line', `ax-line--${s.tone}`, s.dashed && 'ax-line--dashed')}
              points={s.values.map((value, index) => `${xAt(index)},${yAt(value)}`).join(' ')}
            />
          ))}

          {active !== null &&
            series.map((s) => (
              <circle
                key={s.key}
                className={cx('ax-point', `ax-point--${s.tone}`)}
                cx={xAt(active)}
                cy={yAt(s.values[active])}
                r={4}
              />
            ))}
        </svg>

        <div
          className="ax-chart__hit"
          style={{ left: padLeft, top: padTop, width: plotW, height: plotH }}
        >
          {buckets.map((bucket, index) => (
            <button
              key={bucket.key}
              ref={cursorState.attach(index)}
              type="button"
              className="ax-hit"
              style={{ left: index * step, width: step }}
              tabIndex={index === cursorState.tabStop ? 0 : -1}
              aria-label={bucketLabel(bucket, index)}
              onKeyDown={(event) => cursorState.onKeyDown(event, index)}
              {...cursorState.focusHandlers(index)}
            />
          ))}
        </div>

        {active !== null && (
          <ChartTooltip x={xAt(active)} y={yAt(Math.max(...series.map((s) => s.values[active]))) - 14} bounds={width}>
            <div className="ax-tip__label">{buckets[active].fullLabel}</div>
            {series.map((s) => (
              <TipRow key={s.key} label={s.label} value={String(s.values[active])} tone={s.tone} />
            ))}
          </ChartTooltip>
        )}
      </div>

      <figcaption className="sr-only">{description}</figcaption>
      <SrTable caption="Values by period" head={['Period', ...series.map((s) => s.label)]} rows={srRows} />
    </figure>
  )
}