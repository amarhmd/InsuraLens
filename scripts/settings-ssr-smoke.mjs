/* Temporary smoke test: server-renders SettingsPage and each of the seven
   sections through Vite's SSR pipeline, so any render-time crash shows up
   in Node without a browser. Run: node scripts/settings-ssr-smoke.mjs */
import { createServer } from 'vite'
import React from 'react'
import { renderToString } from 'react-dom/server'

const server = await createServer({
  root: 'C:/Users/DESKTOP/Desktop/InsuraLens1',
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
})

const fails = []
const render = async (label, modPath, exportName, props = {}) => {
  try {
    const mod = await server.ssrLoadModule(modPath)
    const Comp = mod[exportName]
    if (!Comp) throw new Error(`export ${exportName} missing`)
    const html = renderToString(React.createElement(Comp, props))
    console.log(`OK   ${label} (${html.length} chars)`)
    return html
  } catch (error) {
    fails.push(`${label}: ${error && error.message}`)
    console.log(`FAIL ${label}: ${error && error.message}`)
  }
}

try {
  await render('SettingsPage', '/src/pages/settings/SettingsPage.tsx', 'SettingsPage')

  const store = await server.ssrLoadModule('/src/lib/settingsStore.ts')
  const d = store.DEFAULT_SETTINGS

  await render('ProfileSettings', '/src/pages/settings/ProfileSettings.tsx', 'ProfileSettings', {
    value: d.profile,
    onSave: () => {},
  })
  await render('PreferencesSettings', '/src/pages/settings/PreferencesSettings.tsx', 'PreferencesSettings', {
    value: d.preferences,
    onSave: () => {},
    onReset: () => {},
  })
  await render('NotificationSettings', '/src/pages/settings/NotificationSettings.tsx', 'NotificationSettings', {
    value: d.notifications,
    onSave: () => {},
  })
  await render('AIReviewSettings', '/src/pages/settings/AIReviewSettings.tsx', 'AIReviewSettings', {
    value: d.ai,
    onSave: () => {},
  })
  await render('WorkspaceSettings', '/src/pages/settings/WorkspaceSettings.tsx', 'WorkspaceSettings', {
    value: d.workspace,
    role: d.profile.role,
    onSave: () => {},
  })
  await render('PrivacySecuritySettings', '/src/pages/settings/PrivacySecuritySettings.tsx', 'PrivacySecuritySettings', {
    profile: d.profile,
    workspace: d.workspace,
  })
  await render('AboutSettings', '/src/pages/settings/AboutSettings.tsx', 'AboutSettings')

  /* Routing: every settings hash must resolve to the settings route. */
  const router = await server.ssrLoadModule('/src/lib/router.ts')
  for (const hash of ['#/settings', '#settings']) {
    const route = router.routeFromHash(hash)
    if (route.name !== 'settings') fails.push(`routeFromHash(${hash}) → ${route.name}`)
    else console.log(`OK   routeFromHash(${hash}) → settings`)
  }
  const back = router.hashFromRoute({ name: 'settings' })
  if (back !== '#/settings') fails.push(`hashFromRoute(settings) → ${back}`)
  else console.log(`OK   hashFromRoute(settings) → #/settings`)
} finally {
  await server.close()
}

if (fails.length) {
  console.log('\nSSR SMOKE FAILURES:')
  fails.forEach((f) => console.log('  - ' + f))
  process.exit(1)
}
console.log('\nSSR smoke OK — SettingsPage, all 7 sections, and routing render clean.')
