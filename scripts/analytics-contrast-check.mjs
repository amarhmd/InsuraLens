/* Contrast gate for Analytics-specific color pairs.

   Blend tinted-alpha backgrounds over their stacking base first, then apply
   WCAG 2.1: 4.5:1 for text, 3:1 for non-text UI (bar fills, focus rings,
   icons).

   Note on bar fills: each fill is gated against the white panel it sits in,
   not against the #eef2f6 track behind it (amber vs track is 2.8:1). That
   matches the dashboard's existing claim-status bars, and the count + percent
   is always printed as adjacent text, so the fill is never the sole carrier
   of meaning. */
const lum = (hex) => {
  const n = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
const blend = (rgba, base) => {
  const m = rgba.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/)
  const a = m[4] === undefined ? 1 : parseFloat(m[4])
  const out = [1, 2, 3].map((i) => {
    const c = parseFloat(m[i])
    return Math.round(c * a + parseInt(base.slice(i * 2 - 1, i * 2 + 1), 16) * (1 - a))
      .toString(16)
      .padStart(2, '0')
  })
  return `#${out.join('')}`
}

const WHITE = '#ffffff'
const PAGE = '#f7f9fb'
const SUNKEN = '#f2f5f8'

const cases = [
  /* ---- text ---- */
  ['primary text on white (panel titles, KPI values)', '#172B3A', WHITE, 4.5],
  ['primary text on page (empty-state title)', '#172B3A', PAGE, 4.5],
  ['secondary-dark text on white (axis labels, footnotes, hints)', '#475467', WHITE, 4.5],
  ['secondary-dark text on sunken (chips, disabled reset, metric hints, Illustrative tag, view toggle)', '#475467', SUNKEN, 4.5],
  ['secondary-dark text on page (muted footer line)', '#475467', PAGE, 4.5],
  ['teal-700 on 10% teal tint over white (filters-active chip)', '#0C6E70', blend('rgba(21,154,156,0.10)', WHITE), 4.5],
  ['primary text on 8% teal tint over white (evidence insight title)', '#172B3A', blend('rgba(21,154,156,0.08)', WHITE), 4.5],
  ['secondary-dark on 8% teal tint over white (evidence insight body)', '#475467', blend('rgba(21,154,156,0.08)', WHITE), 4.5],
  ['white on navy (bar hover tooltip)', WHITE, '#12304a', 4.5],
  ['teal-600 on white (Review row button, focusable link text)', '#0F7F81', WHITE, 4.5],
  ['white on teal-600 (empty-state reset, view toggle selected)', WHITE, '#0F7F81', 4.5],

  /* ---- non-text: fills, rings, icons ---- */
  ['bar fill slate on white panel', '#475467', WHITE, 3.0],
  ['bar fill navy on white panel', '#12304a', WHITE, 3.0],
  ['bar fill blue on white panel', '#3578b8', WHITE, 3.0],
  ['bar fill teal on white panel', '#0f7f81', WHITE, 3.0],
  ['bar fill amber on white panel', '#c98200', WHITE, 3.0],
  ['bar fill green on white panel', '#168a5b', WHITE, 3.0],
  ['bar fill critical on white panel', '#c24141', WHITE, 3.0],
  ['legend swatch navy on white (Claims Received series)', '#12304a', WHITE, 3.0],
  ['legend swatch teal on white (Reviews Completed series)', '#0f7f81', WHITE, 3.0],
  ['focus ring / active select border on white', '#0F7F81', WHITE, 3.0],
  ['insight icon teal-700 on 8% teal tint', '#0C6E70', blend('rgba(21,154,156,0.08)', WHITE), 3.0],
  ['view toggle selected fill against its sunken track', '#0f7f81', SUNKEN, 3.0],
]

let fail = 0
console.log('Analytics contrast gate')
for (const [label, fg, bg, min] of cases) {
  const r = ratio(fg, bg)
  const pass = r >= min
  if (!pass) fail++
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${r.toFixed(2)} (min ${min})  ${label}`)
}
if (fail) {
  console.log(`\n${fail} pair(s) below minimum`)
  process.exit(1)
}
console.log('\nAll analytics pairs meet their minimum contrast.')
