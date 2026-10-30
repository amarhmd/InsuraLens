import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readdirSync } from 'node:fs'

const ROOT = process.cwd()
const OUT = join(ROOT, '.lib-check-cache')
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'summaryZones.ts'), readFileSync(join(ROOT, 'src/lib/summaryZones.ts'), 'utf8'))
const damageAreasSource = readFileSync(join(ROOT, 'src/lib/damageAreas.ts'), 'utf8').replace(
  "./summaryZones'",
  "./summaryZones.ts'",
)
writeFileSync(join(OUT, 'damageAreas.ts'), damageAreasSource)

const { resolveDamageAreas } = await import(pathToFileURL(join(OUT, 'damageAreas.ts')).href)

const fails = []
const ok = (cond, msg) => { if (!cond) fails.push(msg) }
const eq = (label, actual, expected) => { if (actual !== expected) fails.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`) }

const fixturesDir = join(ROOT, 'scripts/fixtures')
for (const file of readdirSync(fixturesDir).filter((f) => f.endsWith('.json'))) {
  const claim = JSON.parse(readFileSync(join(fixturesDir, file), 'utf8'))
  const result = resolveDamageAreas(claim)
  // safety: never throw already; result shape check
  ok(result && typeof result === 'object', `${file}: result is object`)
  ok(['ai','estimated','none'].includes(result.source), `${file}: valid source`)
}

// Structured areas present -> ai
const structured = resolveDamageAreas(JSON.parse(readFileSync(join(fixturesDir,'structured.json'),'utf8')))
eq('structured source', structured.source, 'ai')
ok(structured.areas.length > 0, 'structured areas')

// Summary only -> estimated
const summaryOnly = resolveDamageAreas(JSON.parse(readFileSync(join(fixturesDir,'summary-only.json'),'utf8')))
eq('summary-only source', summaryOnly.source, 'estimated')
ok(summaryOnly.areas.length > 0, 'summary-only areas')

// Multi-vehicle -> none + notice
const mv = resolveDamageAreas(JSON.parse(readFileSync(join(fixturesDir,'multi-vehicle.json'),'utf8')))
eq('multi-vehicle source', mv.source, 'none')
eq('multi-vehicle notice', mv.notice, 'The summary describes more than one vehicle. Damage areas cannot be estimated reliably.')

// Empty/null -> none
eq('empty source', resolveDamageAreas(JSON.parse(readFileSync(join(fixturesDir,'empty.json'),'utf8'))).source, 'none')
eq('null-analysis source', resolveDamageAreas(JSON.parse(readFileSync(join(fixturesDir,'null-analysis.json'),'utf8'))).source, 'none')

// Negation -> none (no zones)
eq('negation source', resolveDamageAreas(JSON.parse(readFileSync(join(fixturesDir,'negation.json'),'utf8'))).source, 'none')

// Rear-end / front-right -> estimated
eq('rear-end source', resolveDamageAreas(JSON.parse(readFileSync(join(fixturesDir,'rear-end.json'),'utf8'))).source, 'estimated')
eq('front-right source', resolveDamageAreas(JSON.parse(readFileSync(join(fixturesDir,'front-right.json'),'utf8'))).source, 'estimated')

// Safety: garbage input never throws
let threw = false
try { resolveDamageAreas(null); resolveDamageAreas('garbage'); resolveDamageAreas(42) } catch { threw = true }
eq('safety no throw', threw, false)

if (fails.length > 0) {
  console.error(`all-claims-zones-check: ${fails.length} failure(s)`)
  for (const fail of fails) console.error(`- ${fail}`)
  process.exit(1)
}
console.log('all-claims-zones-check: ok')