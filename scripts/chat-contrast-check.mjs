/* Contrast gate for Agent Chat-specific color pairs.
   Blend tinted-alpha backgrounds over their stacking base first. */
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

const cases = [
  ['teal-dark on white (citations, capability icons, new-conversation btn)', '#0F7F81', WHITE, 4.5],
  ['teal-dark on page (search input)', '#0F7F81', PAGE, 4.5],
  ['teal-dark on page (citation resting)', '#0F7F81', PAGE, 4.5],
  ['teal-700 on 8% teal tint over page (citation hover)', '#0C6E70', blend('rgba(21,154,156,0.08)', PAGE), 4.5],
  ['teal-700 on 8% teal tint over white (total pill)', '#0C6E70', blend('rgba(21,154,156,0.08)', WHITE), 4.5],
  ['teal-700 on 9% teal tint over white (citation hover)', '#0C6E70', blend('rgba(21,154,156,0.09)', WHITE), 4.5],
  ['gray-600 on 9% teal tint over white (highlighted count)', '#475467', blend('rgba(21,154,156,0.09)', WHITE), 4.5],
  ['success-dark on 8% success tint (context badge)', '#116946', blend('rgba(22,138,91,0.08)', WHITE), 4.5],
  ['success-dark on white (investigation status)', '#116946', WHITE, 4.5],
  ['warning-dark on 8% warning tint (oversight flags)', '#8A5A00', blend('rgba(201,130,0,0.08)', WHITE), 4.5],
  ['warning-dark on white (policy-review value)', '#8A5A00', WHITE, 4.5],
  ['info-dark on 6% info tint (prototype notice)', '#2A5F94', blend('rgba(53,120,184,0.06)', PAGE), 4.5],
  ['info-dark on 6% info tint (reviewer reminder)', '#2A5F94', blend('rgba(53,120,184,0.06)', WHITE), 4.5],
  ['info-dark on 8% info tint (preview status pill)', '#2A5F94', blend('rgba(53,120,184,0.08)', WHITE), 4.5],
  ['critical-dark on 6% critical tint (error message)', '#A13232', blend('rgba(194,65,65,0.06)', PAGE), 4.5],
  ['critical-dark on white (delete menu item)', '#A13232', WHITE, 4.5],
  ['text-secondary on white (timestamps, hints)', '#64748B', WHITE, 4.5],
  ['text-secondary on page (field labels)', '#64748B', PAGE, 4.5],
  ['white on navy (send button, workspace button)', WHITE, '#12304a', 4.5],
  ['text-primary on surface-hover (active conversation)', '#172B3A', PAGE, 4.5],
  ['disabled send icon / border fill', '#64748B', '#e2e8f0', 3.0],
  ['slate focus ring on white', '#4C6FFF', WHITE, 3.0],
  ['slate focus ring on page', '#4C6FFF', PAGE, 3.0],
  ['teal border on white (panel affordances)', '#159A9C', WHITE, 3.0],
  ['scrim navy vs page', '#12304a', PAGE, 3.0],
]

let fail = 0
console.log('Agent Chat contrast gate')
for (const [label, fg, bg, min] of cases) {
  const r = ratio(fg, bg)
  const pass = r >= min
  if (!pass) fail++
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${r.toFixed(2)} (min ${min})  ${label}`,
  )
}
if (fail) {
  console.log(`\n${fail} pair(s) below minimum`)
  process.exit(1)
}
console.log('\nAll chat pairs meet their minimum contrast.')
