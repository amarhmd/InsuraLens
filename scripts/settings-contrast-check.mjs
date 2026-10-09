/* Contrast gate for Settings-specific color pairs.

   Blend tinted-alpha backgrounds over their stacking base first, then apply
   WCAG 2.1: 4.5:1 for text, 3:1 for non-text UI (switch tracks and borders,
   selected borders, focus rings, icons, status dots).

   Switch states get gated on the value that carries them: the ON track
   (#0F7F81, 4.80:1) against the panel, the OFF border (#64748B, 4.76:1)
   against the panel. State also reads through knob position and
   aria-checked, so colour is never the sole cue. */
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
const NAVY = '#12304a'
const TEAL_TINT_08 = blend('rgba(21,154,156,0.08)', WHITE)
const TEAL_TINT_06 = blend('rgba(21,154,156,0.06)', WHITE)
const INFO_TINT_08 = blend('rgba(53,120,184,0.08)', WHITE)
const INFO_TINT_07 = blend('rgba(53,120,184,0.07)', WHITE)
const AMBER_TINT_10 = blend('rgba(201,130,0,0.10)', WHITE)

const cases = [
  /* ---- text: titles, values, labels ---- */
  ['primary text on white (section titles, values, defs)', '#172B3A', WHITE, 4.5],
  ['primary text on sunken (profile name, code chip)', '#172B3A', SUNKEN, 4.5],
  ['primary text on page (mobile nav label)', '#172B3A', PAGE, 4.5],
  ['secondary text on white (descriptions, hints, defs)', '#64748B', WHITE, 4.5],
  ['secondary-dark on sunken (profile email, danger hint, placeholder)', '#475467', SUNKEN, 4.5],
  ['secondary-dark on white (help text, preview labels, chips)', '#475467', WHITE, 4.5],
  ['secondary-dark on page (principle line)', '#475467', PAGE, 4.5],
  ['error text on white (profile validation messages)', '#B42318', WHITE, 4.5],

  /* ---- text: interactive and status colors ---- */
  ['teal-700 on 8% teal tint (active nav item)', '#0C6E70', TEAL_TINT_08, 4.5],
  ['teal-700 on white (selected pill, segmented chip, link hover)', '#0C6E70', WHITE, 4.5],
  ['teal-600 on white (workspace/about links)', '#0F7F81', WHITE, 4.5],
  ['white on teal-600 (Save Changes primary button)', WHITE, '#0F7F81', 4.5],
  ['primary text on 6% teal tint (selected radio card title)', '#172B3A', TEAL_TINT_06, 4.5],
  ['secondary-dark on 6% teal tint (selected radio card desc)', '#475467', TEAL_TINT_06, 4.5],
  ['info-dark on 8% info tint (chips, badges)', '#2A5F94', INFO_TINT_08, 4.5],
  ['info-dark on 7% info tint (note title, preview flag)', '#2A5F94', INFO_TINT_07, 4.5],
  ['secondary-dark on 7% info tint (note body)', '#475467', INFO_TINT_07, 4.5],
  ['amber-dark on 10% amber tint (requires-verification flag)', '#8A5A00', AMBER_TINT_10, 4.5],
  ['white on navy (avatar initials, About panel)', WHITE, NAVY, 4.5],
  ['on-navy-muted on navy (About description)', '#C7D8E6', NAVY, 4.5],

  /* ---- non-text: switch, borders, rings, icons, dots ---- */
  ['switch ON track teal vs white panel', '#0F7F81', WHITE, 3.0],
  ['switch OFF border vs white panel', '#64748B', WHITE, 3.0],
  ['switch OFF border vs switch OFF track', '#64748B', SUNKEN, 3.0],
  ['switch knob white vs ON track (position cue)', WHITE, '#0F7F81', 3.0],
  ['selected pill / radio card border teal vs white', '#0F7F81', WHITE, 3.0],
  ['focus ring teal-600 vs white panel', '#0F7F81', WHITE, 3.0],
  ['save dot amber vs white panel', '#C98200', WHITE, 3.0],
  ['note icon info on 7% info tint', '#3578B8', INFO_TINT_07, 3.0],
  ['principle icon teal-700 vs page background', '#0C6E70', PAGE, 3.0],
  ['About panel border navy-line vs white', '#1f4767', WHITE, 3.0],
]

let fail = 0
console.log('Settings contrast gate')
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
console.log('\nAll settings pairs meet their minimum contrast.')
