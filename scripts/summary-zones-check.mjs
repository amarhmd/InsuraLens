/* Data gate for the summary → estimated damage zones fallback
   (src/lib/summaryZones.ts).

   The module is deliberately pure, so this script stages the .ts file and
   imports it directly (Node 24 type-stripping). It pins the important cases:
   the front-right example from the brief, rear-end damage, negation,
   multi-vehicle summaries, casing/hyphen variants, side-ambiguous input, and
   the 8-zone cap. Run via `npm run check:summary-zones`. */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const OUT = join(ROOT, '.lib-check-cache')

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
writeFileSync(
  join(OUT, 'summaryZones.ts'),
  readFileSync(join(ROOT, 'src/lib/summaryZones.ts'), 'utf8'),
)

const { extractZonesFromSummary, isMultiVehicleSummary } = await import(
  pathToFileURL(join(OUT, 'summaryZones.ts')).href
)

const fails = []
const ok = (cond, msg) => {
  if (!cond) fails.push(msg)
}
const eq = (label, actual, expected) => {
  if (actual !== expected) {
    fails.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}
const deep = (label, actual, expected) => {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) fails.push(`${label}: expected ${e}, got ${a}`)
}

const zones = (summary) => extractZonesFromSummary(summary)
const names = (summary) => zones(summary).map((zone) => zone.zone)
const find = (summary, zone) => zones(summary).find((item) => item.zone === zone)

/* 1. The brief's front-right example. */
const frontRight =
  "Severe front-right impact damage to the vehicle's hood, bumper, headlight assembly, fender, grille, and license plate bracket."
deep('front-right zones', names(frontRight), [
  'hood',
  'front_bumper',
  'headlight',
  'front_fender',
  'grille',
])
eq('front-right headlight side', find(frontRight, 'headlight')?.side, 'right')
eq('front-right fender side', find(frontRight, 'front_fender')?.side, 'right')

/* 2. Rear-end summary. */
const rearEnd =
  'The rear-end collision damaged the rear bumper, taillights, trunk lid, and rear window.'
deep('rear-end zones', names(rearEnd), ['rear_bumper', 'taillight', 'trunk_lid', 'rear_window'])

/* 3. Negation with a positive contrast clause. */
deep(
  'negation contrast',
  names('No damage to the hood; the front bumper is cracked.'),
  ['front_bumper'],
)

/* 4. Simple negation and a negated list. */
deep('simple negation', names('The hood is undamaged.'), [])
deep('negated list', names('The hood and bumper are undamaged.'), [])

/* 5. Multi-vehicle summaries produce no zones. */
const multiVehicle = 'The dark SUV had front-end damage. The blue sedan had rear damage.'
ok('multi-vehicle detected', isMultiVehicleSummary(multiVehicle))
deep('multi-vehicle zones', names(multiVehicle), [])
ok('other-vehicle phrase', isMultiVehicleSummary('The other vehicle was hit.'))
deep('other-vehicle zones', names('The other vehicle was hit.'), [])
ok(
  'one vehicle with several parts is not multi-vehicle',
  !isMultiVehicleSummary("The SUV's hood and bumper were damaged."),
)

/* 6. Empty and null input. */
deep('empty summary', zones(''), [])
deep('null summary', zones(null), [])

/* 7. Casing and hyphen variants. */
eq('uppercase side', find('FRONT-RIGHT HEADLIGHT', 'headlight')?.side, 'right')
eq('right-front side', find('right-front headlight', 'headlight')?.side, 'right')
eq('space-separated side', find('front right headlight', 'headlight')?.side, 'right')

/* 8. Unknown words are ignored. */
deep('unknown words', zones('The flux capacitor is damaged.'), [])

/* 9. Side-ambiguous input uses a center marker, never a guess. */
const ambiguous = find('The headlight is damaged.', 'headlight')
eq('ambiguous side', ambiguous?.side, 'center')
ok('ambiguous label', Boolean(ambiguous?.label.includes('side not specified')))

/* 10. Driver / passenger side cues are resolved per part. */
const driverPassenger = zones('The driver side door and passenger side mirror are damaged.')
eq(
  'driver side door',
  driverPassenger.find((zone) => zone.zone === 'door')?.side,
  'left',
)
eq(
  'passenger side mirror',
  driverPassenger.find((zone) => zone.zone === 'mirror')?.side,
  'right',
)

/* 11. Front/rear fender selection. */
const rearLeftFender = zones('rear-left fender damage')
deep('rear-left fender zone', rearLeftFender.map((zone) => zone.zone), ['rear_fender'])
eq('rear-left fender side', rearLeftFender[0]?.side, 'left')

/* 12. Front and rear bumpers both appear. */
deep(
  'front and rear bumpers',
  names('The front and rear bumpers are damaged.'),
  ['front_bumper', 'rear_bumper'],
)

/* 13. Glass, trunk, and roof. */
deep(
  'glass and trunk',
  names('The windshield, rear window, trunk lid, and roof are damaged.'),
  ['windshield', 'rear_window', 'trunk_lid', 'roof'],
)

/* 14. Basic French terms. */
const french = zones('Capot avant droit et phare avant droit endommagés.')
deep('french zones', french.map((zone) => zone.zone), ['hood', 'headlight'])
eq('french hood side', french.find((zone) => zone.zone === 'hood')?.side, 'right')

/* 15. Basic Arabic terms. */
deep(
  'arabic zones',
  names('تلف في المصد الأمامي والمصابيح الأمامية.'),
  ['front_bumper', 'headlight'],
)

/* 16. Duplicate mentions are de-duplicated. */
deep('dedupe', names('Hood, hood, HOOD damage'), ['hood'])

/* 17. The result is capped at 8 zones. */
const many = zones(
  'hood, front bumper, rear bumper, grille, headlight, taillight, trunk lid, windshield, rear window, door, mirror, roof, wheel, fog light are damaged.',
)
eq('zone cap', many.length, 8)

/* 18. Bumper defaults and explicit rear cues. */
deep('bumper default', names('The bumper is damaged.'), ['front_bumper'])
deep('rear bumper cue', names('The rear bumper is damaged.'), ['rear_bumper'])
deep('rear fascia', names('The rear fascia is cracked.'), ['rear_bumper'])

/* 19. Fog light and wing mirror do not become headlight/fender. */
deep('fog light', names('The fog light is broken.'), ['fog_light'])
deep('wing mirror', names('The wing mirror is cracked.'), ['mirror'])

/* 20. Both headlights keep their own side. */
deep(
  'both headlights',
  zones('The left headlight and right headlight are damaged.').map(
    (zone) => `${zone.zone}:${zone.side}`,
  ),
  ['headlight:left', 'headlight:right'],
)

/* ---------------------------------------------------------------------- report */

if (fails.length > 0) {
  console.error(`summary-zones-check: ${fails.length} failure(s)`)
  for (const fail of fails) console.error(`- ${fail}`)
  process.exit(1)
}
console.log('summary-zones-check: ok')
