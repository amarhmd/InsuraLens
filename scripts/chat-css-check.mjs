/* Verifies every class referenced by className={...} in the chat components
   is defined in a stylesheet, and every var(--token) is declared. */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'C:/Users/DESKTOP/Desktop/InsuraLens1'
const css = ['chat.css', 'dashboard.css', 'claims.css', 'base.css', 'tokens.css', 'login.css', 'form.css', 'analytics.css', 'settings.css']
  .map((f) => readFileSync(join(ROOT, 'src/styles', f), 'utf8'))
  .join('\n')

const files = [
  ...readdirSync(join(ROOT, 'src/pages/agent-chat')).map((f) => join(ROOT, 'src/pages/agent-chat', f)),
  join(ROOT, 'src/components/feedback/ToastNotification.tsx'),
  join(ROOT, 'src/components/feedback/ConfirmDialog.tsx'),
]

const defined = new Set()
for (const m of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) defined.add(m[1])

const tokens = new Set()
for (const m of css.matchAll(/(--[\w-]+)\s*:/g)) tokens.add(m[1])

const fails = []
const classRefs = new Map()
const tokenRefs = new Map()

const addClass = (cls, name) => {
  if (!/^[a-zA-Z][\w-]*$/.test(cls)) return
  if (cls.endsWith('-')) return /* prefix of an interpolated modifier — checked separately */
  if (!classRefs.has(cls)) classRefs.set(cls, name)
}

for (const file of files) {
  const src = readFileSync(file, 'utf8')
  const name = file.split(/[\\/]/).slice(-1)[0]

  /* className="a b" */
  for (const m of src.matchAll(/className="([^"]+)"/g)) {
    for (const cls of m[1].split(/\s+/)) addClass(cls, name)
  }
  /* className={'a b'} */
  for (const m of src.matchAll(/className=\{'([^']+)'\}/g)) {
    for (const cls of m[1].split(/\s+/)) addClass(cls, name)
  }
  /* className={`...`} — split on interpolation, keep literal runs */
  for (const m of src.matchAll(/className=\{`([^`]*)`\}/g)) {
    for (const chunk of m[1].split(/\$\{[^}]+\}/)) {
      for (const cls of chunk.split(/\s+/)) addClass(cls, name)
      /* token ending in "-", e.g. "chat-ctx__status--" before ${state} */
      for (const token of chunk.split(/\s+/)) {
        const partial = token.trim()
        if (partial && partial.endsWith('-')) {
          const found = [...defined].some((d) => d.startsWith(partial))
          if (!found) fails.push(`no CSS class starts with "${partial}" (used in ${name})`)
        }
      }
    }
  }
  /* cx('a', cond && 'b') */
  const cxStart = src.indexOf('cx(')
  for (const m of src.matchAll(/cx\(/g)) {
    let depth = 1
    let i = m.index + 3
    const open = i
    while (i < src.length && depth > 0) {
      if (src[i] === '(') depth++
      if (src[i] === ')') depth--
      i++
    }
    const args = src.slice(open, i - 1)
    for (const s of args.matchAll(/'([a-zA-Z][\w-]*)'/g)) addClass(s[1], name)
    for (const s of args.matchAll(/"([a-zA-Z][\w-]*)"/g)) addClass(s[1], name)
  }
  void cxStart

  for (const m of src.matchAll(/var\((--[\w-]+)/g)) {
    if (!tokenRefs.has(m[1])) tokenRefs.set(m[1], name)
  }
}

for (const [cls, src] of classRefs) {
  if (!defined.has(cls)) fails.push(`class .${cls} (used in ${src}) has no CSS rule`)
}
for (const [tok, src] of tokenRefs) {
  if (!tokens.has(tok)) fails.push(`token ${tok} (used in ${src}) is not defined`)
}

if (fails.length) {
  console.log('FAILURES:')
  fails.forEach((f) => console.log('  - ' + f))
  process.exit(1)
}
console.log(`chat markup OK — ${classRefs.size} classes, ${tokenRefs.size} tokens, all defined`)
