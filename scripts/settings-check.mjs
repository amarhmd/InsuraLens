/* Data gate for the Settings page.

   Every control on #/settings reads settingsStore.ts, so this script pins the
   things the UI promises: the illustrative profile and workspace facts, the
   option lists exactly as the spec names them, a notification model whose
   keys partition into the three groups, validation messages that appear
   verbatim in the form, honest defaults (no fabricated preferences), a
   sanitizer that can never leave the UI in a broken state, and a store whose
   save → notify flow every toast depends on.

   Run via `npm run check:settings` (stages the .ts module first). */
import {
  DEFAULT_SETTINGS,
  DEFAULT_NOTIFICATIONS,
  NOTIFICATION_GROUPS,
  NOTIFICATION_KEYS,
  THEME_OPTIONS,
  LANGUAGE_OPTIONS,
  TIME_ZONE_OPTIONS,
  DATE_FORMAT_OPTIONS,
  LANDING_OPTIONS,
  DENSITY_OPTIONS,
  RESPONSE_FORMAT_OPTIONS,
  RESPONSE_DETAIL_OPTIONS,
  WORKSPACE_TYPE,
  WORKSPACE_ID,
  WORKSPACE_MEMBERS,
  DEMO_MODULES,
  PRODUCT,
  validateProfile,
  validateWorkspaceName,
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
  theme: 'light',
  language: 'English',
  timeZone: 'UTC',
  dateFormat: 'DD/MM/YYYY',
  landing: 'dashboard',
  density: 'comfortable',
})

deep('default AI preferences', DEFAULT_SETTINGS.ai, {
  format: 'detailed',
  showSources: true,
  highlightUncertainty: true,
  highlightInconsistencies: true,
  detail: 'balanced',
})

deep('default workspace', DEFAULT_SETTINGS.workspace, {
  displayName: 'Claims Operations',
  description: 'A shared environment for reviewing claims evidence and AI-assisted findings.',
})

/* Store starts on the defaults (no localStorage in the check process). */
deep('store initial state', getSettings(), DEFAULT_SETTINGS)

/* ---------------------------------------------------------- notifications */

eq('notification key count', NOTIFICATION_KEYS.length, 11)
eq('notification keys unique', new Set(NOTIFICATION_KEYS).size, 11)
eq('notification group count', NOTIFICATION_GROUPS.length, 3)
deep(
  'group titles',
  NOTIFICATION_GROUPS.map((g) => g.title),
  ['Claim activity', 'AI-assisted analysis', 'Product updates'],
)
deep(
  'group item counts (5/4/2)',
  NOTIFICATION_GROUPS.map((g) => g.items.length),
  [5, 4, 2],
)

/* The group lists and the key list must describe the same model. */
const grouped = NOTIFICATION_GROUPS.flatMap((g) => g.items.map((i) => i.key)).sort()
eq('grouped keys partition NOTIFICATION_KEYS', grouped.join(','), [...NOTIFICATION_KEYS].sort().join(','))
eq(
  'every group item label present',
  NOTIFICATION_GROUPS.every((g) => g.items.every((i) => typeof i.label === 'string' && i.label.length > 0)),
  true,
)

deep('default notification flags', DEFAULT_NOTIFICATIONS, {
  claimAssigned: true,
  evidenceAdded: true,
  docsMissing: true,
  statusChanged: true,
  humanReview: true,
  analysisDone: true,
  sourceUnavailable: true,
  needsVerification: true,
  analysisError: true,
  productNews: false,
  featureUpdates: false,
})
eq(
  'product updates opt-in by default',
  DEFAULT_NOTIFICATIONS.productNews && DEFAULT_NOTIFICATIONS.featureUpdates,
  false,
)

/* The spec's worked example, verbatim. */
const verifyItem = NOTIFICATION_GROUPS.flatMap((g) => g.items).find(
  (i) => i.key === 'needsVerification',
)
eq('findings-verification label', verifyItem?.label, 'Findings require verification')
eq(
  'findings-verification hint (spec example)',
  verifyItem?.hint,
  'Notify me when AI-generated findings are flagged for reviewer assessment.',
)

/* ------------------------------------------------------------- option lists */

deep(
  'theme options',
  THEME_OPTIONS.map((o) => o.label),
  ['Light', 'Dark', 'System'],
)
deep('language options', LANGUAGE_OPTIONS, ['English', 'French', 'Arabic'])
eq('time zone default first', TIME_ZONE_OPTIONS[0], 'UTC')
ok(TIME_ZONE_OPTIONS.length >= 8, `time zones: expected >= 8, got ${TIME_ZONE_OPTIONS.length}`)
eq('time zones unique', new Set(TIME_ZONE_OPTIONS).size, TIME_ZONE_OPTIONS.length)
deep('date format options', DATE_FORMAT_OPTIONS, ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'])
deep(
  'landing options',
  LANDING_OPTIONS.map((o) => `${o.value}:${o.label}`),
  ['dashboard:Dashboard', 'claims:Claims', 'chat:Agent Chat'],
)
deep(
  'density options',
  DENSITY_OPTIONS.map((o) => o.label),
  ['Comfortable', 'Compact'],
)
deep(
  'response format options (spec order)',
  RESPONSE_FORMAT_OPTIONS.map((o) => o.label),
  ['Concise Summary', 'Detailed Evidence Review', 'Structured Investigation Report'],
)
deep(
  'response format values',
  RESPONSE_FORMAT_OPTIONS.map((o) => o.value),
  ['concise', 'detailed', 'structured'],
)
ok(
  RESPONSE_FORMAT_OPTIONS.every((o) => typeof o.desc === 'string' && o.desc.length > 10),
  'every response format needs a description',
)
deep(
  'response detail options',
  RESPONSE_DETAIL_OPTIONS.map((o) => `${o.value}:${o.label}`),
  ['brief:Brief', 'balanced:Balanced', 'detailed:Detailed'],
)

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

eq('empty workspace name message', validateWorkspaceName(''), 'Workspace display name is required.')
eq('short workspace name message', validateWorkspaceName('X'), 'Enter at least 2 characters.')
eq('valid workspace name', validateWorkspaceName('Claims Operations'), undefined)

eq('initials two words', initials('Alex Morgan'), 'AM')
eq('initials lowercase', initials('alex morgan'), 'AM')
eq('initials one word', initials('Jamie'), 'J')
eq('initials empty', initials('   '), '?')

/* ------------------------------------------------------ workspace & product */

eq('workspace type', WORKSPACE_TYPE, 'Insurance Claims Review')
eq('workspace id', WORKSPACE_ID, 'WS-DEMO-CLAIMS-OPS')
eq('member count', WORKSPACE_MEMBERS.length, 3)
eq(
  'exactly one "you" member',
  WORKSPACE_MEMBERS.filter((m) => m.you).length,
  1,
)
eq('"you" member is the demo profile', WORKSPACE_MEMBERS.find((m) => m.you)?.name, 'Alex Morgan')

deep(
  'demo modules',
  DEMO_MODULES.map((m) => m.label),
  ['Dashboard', 'Claims', 'Agent Chat', 'Analytics', 'Settings'],
)
ok(
  DEMO_MODULES.every((m) => m.hash.startsWith('#/')),
  'every demo module needs a hash route',
)

eq('product name', PRODUCT.name, 'InsuraLens')
eq('product description', PRODUCT.description, 'AI-assisted vehicle insurance claims review.')
eq(
  'product principle (spec wording)',
  PRODUCT.principle,
  'AI helps connect and explain evidence. Humans remain responsible for the final decision.',
)
eq('product version', PRODUCT.version, 'Demo Prototype')
eq('interface status', PRODUCT.interfaceStatus, 'Frontend Demo')

/* --------------------------------------------------------------- sanitizer */

deep('sanitize(null)', sanitizeSettings(null), DEFAULT_SETTINGS)
deep('sanitize(42)', sanitizeSettings(42), DEFAULT_SETTINGS)
deep('sanitize("nope")', sanitizeSettings('nope'), DEFAULT_SETTINGS)
deep('sanitize({})', sanitizeSettings({}), DEFAULT_SETTINGS)

const coerced = sanitizeSettings({
  preferences: { theme: 'neon', density: 'compact', landing: 'nope', language: 'Klingon' },
  ai: { format: 'concise', showSources: 0, detail: 'verbose' },
  notifications: { productNews: 'yes', claimAssigned: false },
  profile: { fullName: 'Sam Lee', role: 42 },
  workspace: { displayName: 'Night Ops' },
})
eq('bogus theme falls back to default', coerced.preferences.theme, 'light')
eq('valid density survives', coerced.preferences.density, 'compact')
eq('bogus landing falls back', coerced.preferences.landing, 'dashboard')
eq('bogus language falls back', coerced.preferences.language, 'English')
eq('valid AI format survives', coerced.ai.format, 'concise')
eq('non-boolean showSources falls back', coerced.ai.showSources, true)
eq('bogus detail falls back', coerced.ai.detail, 'balanced')
eq('non-boolean notification falls back', coerced.notifications.productNews, false)
eq('valid notification survives', coerced.notifications.claimAssigned, false)
eq('partial profile keeps other fields', coerced.profile.email, baseProfile.email)
eq('partial profile keeps role', coerced.profile.role, baseProfile.role)
eq('valid workspace name survives', coerced.workspace.displayName, 'Night Ops')

/* ----------------------------------------------------- store save → notify */

let notified = 0
const unsubscribe = subscribeSettings(() => {
  notified++
})

saveSettings({ preferences: { ...DEFAULT_SETTINGS.preferences, theme: 'dark', density: 'compact' } })
eq('save notified subscribers', notified, 1)
eq('save applied', getSettings().preferences.theme, 'dark')
eq('save keeps untouched sections', getSettings().profile.fullName, 'Alex Morgan')
deep(
  'density side-effect string in store state',
  getSettings().preferences.density,
  'compact',
)

saveSettings({})
eq('no-op save still notifies', notified, 2)

unsubscribe()
saveSettings({ preferences: { ...DEFAULT_SETTINGS.preferences, theme: 'light', density: 'comfortable' } })
eq('unsubscribe stops notifications', notified, 2)
deep('store restored to defaults', getSettings(), DEFAULT_SETTINGS)

/* --------------------------------------------------------------- report */

if (fails.length) {
  console.log('settings-check FAILURES:')
  for (const f of fails) console.log('  - ' + f)
  process.exit(1)
}
console.log(
  'settings-check OK — defaults, notification model, options, validation, sanitizer, store',
)
