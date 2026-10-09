/* Stages the chat data-gate module graph with explicit .ts extensions
   (Node 24 type-stripping needs them) into .chat-check-cache/, then runs
   chat-check. Staged graph: chatData + claimsData + constants at the cache
   root, and everything in src/mocks/ under mocks/. */
import { mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const ROOT = 'C:/Users/DESKTOP/Desktop/InsuraLens1'
const OUT = join(ROOT, '.chat-check-cache')

rmSync(OUT, { recursive: true, force: true })
mkdirSync(join(OUT, 'mocks'), { recursive: true })

/* Files staged at the cache root re-point sibling and mocks imports. */
const patchRoot = (src) =>
  src
    .replace(/from '\.\/(claimsData|analyticsData|chatData|constants)'/g, "from './$1.ts'")
    .replace(/from '\.\.\/mocks\/(\w+)'/g, "from './mocks/$1.ts'")

/* Files staged into mocks/ re-point lib imports one level up, plus sibling
   mock imports. Type-only imports are elided by Node before resolution. */
const patchMock = (src) =>
  src
    .replace(/from '\.\.\/lib\/(claimsData|analyticsData|chatData|constants)'/g, "from '../$1.ts'")
    .replace(/from '\.\/(\w+)'/g, "from './$1.ts'")

const stage = (srcPath, outPath, patcher) =>
  writeFileSync(join(OUT, outPath), patcher(readFileSync(join(ROOT, 'src', srcPath), 'utf8')))

stage(join('lib', 'claimsData.ts'), 'claimsData.ts', patchRoot)
stage(join('lib', 'chatData.ts'), 'chatData.ts', patchRoot)
stage(join('lib', 'constants.ts'), 'constants.ts', patchRoot)
for (const file of readdirSync(join(ROOT, 'src/mocks'))) {
  if (file.endsWith('.ts')) stage(join('mocks', file), join('mocks', file), patchMock)
}

const result = spawnSync(process.execPath, [join(ROOT, 'scripts/chat-check.mjs')], { stdio: 'inherit' })
process.exit(result.status ?? 1)
