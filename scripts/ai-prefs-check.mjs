/* Data gate for the AI Review Preferences store (src/lib/aiPrefs.ts).

   The Claim workspace reads these three flags to decide what AI-assisted UI it
   shows. This script pins the defaults, the sanitizer around a missing or
   hand-edited localStorage value, and the save → notify flow the Settings
   toggles depend on. Run as part of `npm run check:settings`. */
import {
  DEFAULT_AI_PREFS,
  sanitizeAiPrefs,
  getAiPrefs,
  saveAiPrefs,
  subscribeAiPrefs,
} from '../.lib-check-cache/aiPrefs.ts'

const fails = []
const eq = (label, actual, expected) => {
  if (actual !== expected) fails.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}
const deep = (label, actual, expected) => {
  const a = JSON.stringify(actual)
  const b = JSON.stringify(expected)
  if (a !== b) fails.push(`${label}: expected ${b}, got ${a}`)
}

/* ---------------------------------------------------------------- defaults */

deep('default ai prefs (all on)', DEFAULT_AI_PREFS, {
  damageBoxes: true,
  evidenceLinks: true,
  aiBadges: true,
})

/* Store starts on the defaults (no localStorage in the check process). */
deep('store initial state', getAiPrefs(), DEFAULT_AI_PREFS)

/* --------------------------------------------------------------- sanitizer */

deep('sanitize(null)', sanitizeAiPrefs(null), DEFAULT_AI_PREFS)
deep('sanitize(42)', sanitizeAiPrefs(42), DEFAULT_AI_PREFS)
deep('sanitize("nope")', sanitizeAiPrefs('nope'), DEFAULT_AI_PREFS)
deep('sanitize({})', sanitizeAiPrefs({}), DEFAULT_AI_PREFS)

const coerced = sanitizeAiPrefs({ damageBoxes: false, evidenceLinks: 'yes', aiBadges: 0 })
eq('valid flag survives', coerced.damageBoxes, false)
eq('non-boolean flag falls back on', coerced.evidenceLinks, true)
eq('numeric flag falls back on', coerced.aiBadges, true)

/* ----------------------------------------------------- store save → notify */

let notified = 0
const unsubscribe = subscribeAiPrefs(() => {
  notified++
})

saveAiPrefs({ damageBoxes: false })
eq('save notified subscribers', notified, 1)
eq('save applied', getAiPrefs().damageBoxes, false)
eq('save keeps other flags', getAiPrefs().evidenceLinks, true)

saveAiPrefs({})
eq('no-op save still notifies', notified, 2)

unsubscribe()
saveAiPrefs({ damageBoxes: true })
eq('unsubscribe stops notifications', notified, 2)
deep('store restored to defaults', getAiPrefs(), DEFAULT_AI_PREFS)

/* --------------------------------------------------------------- report */

if (fails.length) {
  console.log('ai-prefs-check FAILURES:')
  for (const f of fails) console.log('  - ' + f)
  process.exit(1)
}
console.log('ai-prefs-check OK — defaults, sanitizer, store save → notify')
