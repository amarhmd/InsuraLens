/* Stages settingsStore.ts and aiPrefs.ts with explicit .ts extensions (Node 24
   type-stripping needs them) into .lib-check-cache/, then runs settings-check. */
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const ROOT = 'C:/Users/DESKTOP/Desktop/InsuraLens1'
const OUT = join(ROOT, '.lib-check-cache')

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

/* Neither module has relative imports, so they copy across verbatim. */
writeFileSync(join(OUT, 'settingsStore.ts'), readFileSync(join(ROOT, 'src/lib/settingsStore.ts'), 'utf8'))
writeFileSync(join(OUT, 'aiPrefs.ts'), readFileSync(join(ROOT, 'src/lib/aiPrefs.ts'), 'utf8'))

const result = spawnSync(process.execPath, [join(ROOT, 'scripts/settings-check.mjs')], {
  stdio: 'inherit',
})
process.exit(result.status ?? 1)
