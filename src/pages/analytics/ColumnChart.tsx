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

type ColumnChartProps = {
  buckets: ChartBucket[]
  values: number[]
  yMax: number
  tone: string
  valueLabel: string
  description: string
  emptyMessage: string
}

/**
 * Column chart — AI-assisted analysis activity. Pointer and keyboard share
 * the axis-cursor interaction model from chartPrimitives.
 */
export function ColumnChart({
  buckets,
  values,
  yMax,
  tone,
  valueLabel,
  description,
  emptyMessage,
}: ColumnChartProps) {
  const { ref, width } = useElementWidth<HTMLElement>()
  const n = buckets.length
  const peak = values.reduce((max, value) => Math.max(max, value), 0)
  const cursorState = useChartCursor(n)

  if (n === 0 || peak === 0) return <ChartUnavailable message={emptyMessage} />

  const { left: padLeft, right: padRight, top: padTop, bottom: padBottom, height: H } = PLOT
  const plotW = Math.max(width - padLeft - padRight, 80)
  const plotH = H - padTop - padBottom
  const step = plotW / n
  const xAt = (i: number) => padLeft + step * (i + 0.5)
  const yAt = (v: number) => padTop + plotH - (v / yMax) * plotH
  const stride = xStride(n, plotW)
  const barW = Math.max(3, Math.min(step * 0.62, 34))
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

          {values.map((value, index) => {
            const y = yAt(value)
            return (
              <rect
                key={buckets[index].key}
                className={cx(
                  'ax-col',
                  `ax-col--${tone}`,
                  cursorState.cursor === index && 'ax-col--on',
                )}
                x={xAt(index) - barW / 2}
                y={value === 0 ? yAt(0) - 2 : y}
                width={barW}
                height={value === 0 ? 2 : padTop + plotH - y}
              />
            )
          })}
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
              aria-label={`${bucket.fullLabel}: ${values[index]} ${valueLabel}.`}
              onKeyDown={(event) => cursorState.onKeyDown(event, index)}
              {...cursorState.focusHandlers(index)}
            />
          ))}
        </div>

        {active !== null && (
          <ChartTooltip x={xAt(active)} y={yAt(values[active]) - 14} bounds={width}>
            <div className="ax-tip__label">{buckets[active].fullLabel}</div>
            <TipRow label={valueLabel} value={String(values[active])} tone={tone} />
          </ChartTooltip>
        )}
      </div>

      <figcaption className="sr-only">{description}</figcaption>
      <SrTable
        caption="Values by period"
        head={['Period', valueLabel]}
        rows={buckets.map((bucket, index) => [bucket.fullLabel, values[index]])}
      />
    </figure>
  )
}