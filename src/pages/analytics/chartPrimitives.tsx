import { useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { cx } from '../../lib/cx'

/* ==========================================================================
   Shared chart infrastructure for the analytics charts — measurement,
   the axis cursor interaction model, tooltips, the unavailable state, the
   screen-reader table, and the axis helpers. Nothing here renders a chart
   on its own; LineChart, ColumnChart, and BarList compose it.
   ========================================================================== */

/* -------------------------------------------------------------------------- */
/* Measuring                                                                  */
/* -------------------------------------------------------------------------- */

export function useElementWidth<T extends HTMLElement>(fallback = 720) {
  /* Callback ref rather than useRef: charts swap themselves for a fallback
     state and back, so the measurement has to re-attach whenever the node
     mounts — not once on first render when it may not exist yet. */
  const [element, setElement] = useState<T | null>(null)
  const [width, setWidth] = useState(fallback)

  useLayoutEffect(() => {
    if (!element) return
    const measure = () => setWidth(element.clientWidth)
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return { ref: setElement, width }
}

/* -------------------------------------------------------------------------- */
/* Axis cursor (roving tab stop + tooltip index)                              */
/* -------------------------------------------------------------------------- */

export function useChartCursor(count: number) {
  const [cursor, setCursor] = useState<number | null>(null)
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const [tabStop, setTabStop] = useState(0)
  const nodes = useRef<Array<HTMLButtonElement | null>>([])

  const focusAt = (index: number) => {
    if (count === 0) return
    const next = Math.min(Math.max(index, 0), count - 1)
    setTabStop(next)
    nodes.current[next]?.focus()
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        focusAt(index + 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        focusAt(index - 1)
        break
      case 'Home':
        event.preventDefault()
        focusAt(0)
        break
      case 'End':
        event.preventDefault()
        focusAt(count - 1)
        break
      default:
        break
    }
  }

  const attach = (index: number) => (node: HTMLButtonElement | null) => {
    nodes.current[index] = node
  }

  const focusHandlers = (index: number) => ({
    onFocus: () => {
      setFocusIndex(index)
      setCursor(index)
    },
    onBlur: () => {
      setFocusIndex(null)
      setCursor(null)
    },
  })

  /** Pointer left the plot — unless a point has keyboard focus. */
  const leave = () => {
    if (focusIndex === null) setCursor(null)
  }

  return {
    cursor,
    /* Clamped so a shrink in bucket count can never strand the tab stop. */
    tabStop: tabStop < count ? tabStop : 0,
    move: (index: number) => setCursor(index),
    leave,
    onKeyDown,
    attach,
    focusHandlers,
  }
}

/* -------------------------------------------------------------------------- */
/* Tooltip / fallback / sr-only table                                         */
/* -------------------------------------------------------------------------- */

type TooltipProps = {
  x: number
  y: number
  /** Plot width — the tip is clamped so it never leaves the panel. */
  bounds: number
  children: ReactNode
}

export function ChartTooltip({ x, y, bounds, children }: TooltipProps) {
  const half = 110
  const left = bounds > half * 2 ? Math.min(Math.max(x, half), bounds - half) : bounds / 2
  return (
    <div className="ax-tip" style={{ left, top: y }} aria-hidden="true">
      {children}
    </div>
  )
}

export function TipRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="ax-tip__row">
      {tone && <span className={cx('ax-tip__dot', `ax-tip__dot--${tone}`)} />}
      <span className="ax-tip__row-label">{label}</span>
      <strong className="ax-tip__row-value">{value}</strong>
    </div>
  )
}

export function ChartUnavailable({ message }: { message: string }) {
  return (
    <div className="ax-unavailable" role="status">
      <span className="ax-unavailable__icon" aria-hidden="true">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3v18h18" />
          <path d="M7 14.5l3.5-4 3 2.5 4-6" />
          <path d="M16.8 5.6l2.4 2.4M19.2 5.6l-2.4 2.4" />
        </svg>
      </span>
      <p className="ax-unavailable__title">Chart unavailable</p>
      <p className="ax-unavailable__text">{message}</p>
    </div>
  )
}

/** Screen-reader mirror of a chart. Visible users never see it. */
export function SrTable({
  caption,
  head,
  rows,
}: {
  caption: string
  head: string[]
  rows: Array<Array<string | number>>
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {head.map((cell) => (
            <th key={cell} scope="col">
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) =>
              cellIndex === 0 ? (
                <th key={cellIndex} scope="row">
                  {cell}
                </th>
              ) : (
                <td key={cellIndex}>{cell}</td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* -------------------------------------------------------------------------- */
/* Axis helpers                                                               */
/* -------------------------------------------------------------------------- */

/** Five ticks from 0 to yMax — yMax is always a multiple of 4. */
export const yTicks = (yMax: number): number[] => [0, 1, 2, 3, 4].map((k) => (yMax / 4) * k)

/** Thin x labels to roughly one per 74px so they never collide. */
export const xStride = (count: number, plotW: number): number =>
  Math.max(1, Math.ceil(count / Math.max(1, Math.floor(plotW / 74))))

export const PLOT = { left: 42, right: 12, top: 16, bottom: 32, height: 264 }

export type { TooltipProps }