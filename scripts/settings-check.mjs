/* Data gate for the Settings page.

   Every control on #/settings reads settingsStore.ts, so this script pins the
   things the UI promises: the illustrative profile facts, the two remaining
   notification switches, validation messages that appear verbatim in the form,
   honest defaults (no fabricated preferences), a sanitizer that can never leave
   the UI in a broken state, and a store whose save → notify flow every toast
   depends on.

   The AI display switches live in src/lib/aiPrefs.ts under their own key and
   are covered by scripts/ai-prefs-check.mjs. Run via `npm run check:settings`
   (stages the .ts module first). */
import {
  DEFAULT_SETTINGS,
  DEFAULT_NOTIFICATIONS,
  NOTIFICATION_KEYS,
  NOTIFICATION_ITEMS,
  validateProfile,
  initials,
  sanitizeSettings,
  getSettings,
  saveSettings,
  subscribeSettings,
} from '../.lib-check-cache/settingsStore.ts'

const fails = []
const ok = (cond, msg) => {
  if (!cond) fails.push(msg)
}
const eq = (label, actual, expected) => {
  if (actual !== expected) fails.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}
const deep = (label, actual, expected) => {
  const a = JSON.stringify(actual)
  const b = JSON.stringify(expected)
  if (a !== b) fails.push(`${label}: expected ${b}, got ${a}`)
}

/* ---------------------------------------------------------------- defaults */

deep('default profile', DEFAULT_SETTINGS.profile, {
  fullName: 'Alex Morgan',
  displayName: '',
  jobTitle: 'Claims Reviewer',
  email: 'alex.morgan@example.com',
  role: 'Claims Reviewer',
  workspace: 'Claims Operations',
})

deep('default preferences', DEFAULT_SETTINGS.preferences, {
  landing: 'dashboard',
  density: 'comfortable',
})

deep('default workspace', DEFAULT_SETTINGS.workspace, {
  displayName: 'Claims Operations',
  description: 'A shared environment for reviewing claims evidence and AI-assisted findings.',
})

/* The removed sections must leave nothing behind in the store shape. */
ok(!('ai' in DEFAULT_SETTINGS), 'DEFAULT_SETTINGS should not carry the removed AI section')
ok(!('theme' in DEFAULT_SETTINGS.preferences), 'preferences should not carry theme')
ok(!('language' in DEFAULT_SETTINGS.preferences), 'preferences should not carry language')
ok(!('timeZone' in DEFAULT_SETTINGS.preferences), 'preferences should not carry timeZone')
ok(!('dateFormat' in DEFAULT_SETTINGS.preferences), 'preferences should not carry dateFormat')

/* Store starts on the defaults (no localStorage in the check process). */
deep('store initial state', getSettings(), DEFAULT_SETTINGS)

/* ---------------------------------------------------------- notifications */

eq('notification key count', NOTIFICATION_KEYS.length, 2)
eq('notification keys unique', new Set(NOTIFICATION_KEYS).size, 2)
deep('notification items keys', NOTIFICATION_ITEMS.map((i) => i.key), [...NOTIFICATION_KEYS])
eq(
  'every notification item has label + hint',
  NOTIFICATION_ITEMS.every((i) => typeof i.label === 'string' && i.label.length > 0 && typeof i.hint === 'string' && i.hint.length > 0),
  true,
)
eq('assigned label', NOTIFICATION_ITEMS[0].label, 'Claims assigned to me')
eq('needs-review label', NOTIFICATION_ITEMS[1].label, 'Claims needing my review')

deep('default notification flags', DEFAULT_NOTIFICATIONS, {
  claimAssigned: true,
  needsReview: true,
})

/* --------------------------------------------------------- validation copy */

const baseProfile = { ...DEFAULT_SETTINGS.profile }

const noName = validateProfile({ ...baseProfile, fullName: '   ' })
eq('empty full name message', noName.fullName, 'Full name is required.')
eq('short full name message', validateProfile({ ...baseProfile, fullName: 'A' }).fullName, 'Enter at least 2 characters.')
eq('empty job title message', validateProfile({ ...baseProfile, jobTitle: '' }).jobTitle, 'Job title is required.')
eq('empty email message', validateProfile({ ...baseProfile, email: '' }).email, 'Work email is required.')
eq(
  'invalid email message',
  validateProfile({ ...baseProfile, email: 'not-an-email' }).email,
  'Enter a valid email address.',
)
eq(
  'short display name message',
  validateProfile({ ...baseProfile, displayName: 'J' }).displayName,
  'Enter at least 2 characters.',
)
deep('valid profile has no errors', validateProfile(baseProfile), {})
deep(
  'valid trimmed variants pass',
  validateProfile({ ...baseProfile, fullName: 'Sam Lee', email: 'sam.lee@example.com' }),
  {},
)

eq('initials two words', initials('Alex Morgan'), 'AM')
eq('initials lowercase', initials('alex morgan'), 'AM')
eq('initials one word', initials('Jamie'), 'J')
eq('initials empty', initials('   '), '?')

/* --------------------------------------------------------------- sanitizer */

deep('sanitize(null)', sanitizeSettings(null), DEFAULT_SETTINGS)
deep('sanitize(42)', sanitizeSettings(42), DEFAULT_SETTINGS)
deep('sanitize("nope")', sanitizeSettings('nope'), DEFAULT_SETTINGS)
deep('sanitize({})', sanitizeSettings({}), DEFAULT_SETTINGS)

const coerced = sanitizeSettings({
  preferences: { landing: 'nope', density: 'compact', theme: 'dark' },
  notifications: { needsReview: 'yes', claimAssigned: false },
  profile: { fullName: 'Sam Lee', role: 42 },
  workspace: { displayName: 'Night Ops' },
})
eq('bogus landing falls back', coerced.preferences.landing, 'dashboard')
eq('valid density survives', coerced.preferences.density, 'compact')
ok(!('theme' in coerced.preferences), 'unknown preference keys are dropped')
eq('non-boolean notification falls back', coerced.notifications.needsReview, true)
eq('valid notification survives', coerced.notifications.claimAssigned, false)
eq('partial profile keeps other fields', coerced.profile.email, baseProfile.email)
eq('non-string role falls back', coerced.profile.role, baseProfile.role)
eq('valid workspace name survives', coerced.workspace.displayName, 'Night Ops')

/* ----------------------------------------------------- store save → notify */

let notified = 0
const unsubscribe = subscribeSettings(() => {
  notified++
})

saveSettings({ notifications: { ...DEFAULT_NOTIFICATIONS, needsReview: false } })
eq('save notified subscribers', notified, 1)
eq('save applied', getSettings().notifications.needsReview, false)
eq('save keeps untouched sections', getSettings().profile.fullName, 'Alex Morgan')

saveSettings({ preferences: { ...DEFAULT_SETTINGS.preferences, density: 'compact' } })
eq('second save notified', notified, 2)
deep('density side-effect string in store state', getSettings().preferences.density, 'compact')

saveSettings({})
eq('no-op save still notifies', notified, 3)

unsubscribe()
saveSettings({ notifications: { ...DEFAULT_NOTIFICATIONS }, preferences: { ...DEFAULT_SETTINGS.preferences } })
eq('unsubscribe stops notifications', notified, 3)
deep('store restored to defaults', getSettings(), DEFAULT_SETTINGS)

/* --------------------------------------------------------------- report */

if (fails.length) {
  console.log('settings-check FAILURES:')
  for (const f of fails) console.log('  - ' + f)
  process.exit(1)
}
console.log(
  'settings-check OK — defaults, notification model, validation, sanitizer, store',
)
