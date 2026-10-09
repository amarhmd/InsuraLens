/* Verifies every class referenced by the Analytics markup is defined in a
   stylesheet, every var(--token) is declared, and every interpolated class
   prefix (cx('ax-bar__fill', `ax-bar__fill--${tone}`)) has at least one real
   rule behind it. Same gate as chat-css-check, plus template literals
   inside cx(). */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'C:/Users/DESKTOP/Desktop/InsuraLens1'
const css = [
  'analytics.css',
  'chat.css',
  'dashboard.css',
  'claims.css',
  'base.css',
  'tokens.css',
  'login.css',
  'form.css',
  'settings.css',
]
  .map((f) => readFileSync(join(ROOT, 'src/styles', f), 'utf8'))
  .join('\n')

const files = [
  ...readdirSync(join(ROOT, 'src/pages/analytics')).map((f) =>
    join(ROOT, 'src/pages/analytics', f),
  ),
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
  if (cls.endsWith('-')) return /* prefix of an interpolated modifier — checked below */
  if (!classRefs.has(cls)) classRefs.set(cls, name)
}

/** Literal runs of a template literal: check each plus any trailing dash. */
const addTemplate = (tpl, name) => {
  for (const chunk of tpl.split(/\$\{[^}]+\}/)) {
    for (const cls of chunk.split(/\s+/)) addClass(cls, name)
    for (const token of chunk.split(/\s+/)) {
      const partial = token.trim()
      if (partial && partial.endsWith('-')) {
        const found = [...defined].some((d) => d.startsWith(partial))
        if (!found) fails.push(`no CSS class starts with "${partial}" (used in ${name})`)
      }
    }
  }
}

/** Pulls balanced args out of every cx(...) call. */
const cxArgs = (src) => {
  const out = []
  for (const m of src.matchAll(/cx\(/g)) {
    let depth = 1
    let i = m.index + 3
    const open = i
    while (i < src.length && depth > 0) {
      if (src[i] === '(') depth++
      if (src[i] === ')') depth--
      i++
    }
    out.push(src.slice(open, i - 1))
  }
  return out
}

/* `cond !== 'all' && 'ax-select--on'` — the compared literal is a value, not
   a class. Drop operands of ===/!==/==/!=/</>/<=/>= before scanning. */
const stripComparisons = (s) =>
  s
    .replace(/(===|!==|==|!=|<=|>=|<|>)\s*'[^']*'/g, '$1 __')
    .replace(/'[^']*'\s*(===|!==|==|!=|<=|>=|<|>)/g, '__ $1')

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
  /* className={`a b ${x} c`} — literal runs + trailing-dash prefixes */
  for (const m of src.matchAll(/className=\{`([^`]*)`\}/g)) addTemplate(m[1], name)

  /* cx('a', cond && 'b', `c--${d}`) */
  for (const raw of cxArgs(src)) {
    const args = stripComparisons(raw)
    for (const s of args.matchAll(/'([a-zA-Z][\w-]*)'/g)) addClass(s[1], name)
    for (const s of args.matchAll(/"([a-zA-Z][\w-]*)"/g)) addClass(s[1], name)
    for (const s of args.matchAll(/`([^`]*)`/g)) addTemplate(s[1], name)
  }

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
console.log(`analytics markup OK — ${classRefs.size} classes, ${tokenRefs.size} tokens, all defined`)
