import {
  seedConversations,
  evidenceBreakdown,
  buildDemoReply,
  claimById,
  getSource,
} from '../.chat-check-cache/chatData.ts'

const fails = []
const ok = (cond, msg) => {
  if (!cond) fails.push(msg)
}

const convs = seedConversations()
ok(convs.length === 6, `expected 6 seed conversations, got ${convs.length}`)

const titles = convs.map((c) => c.title)
const expected = [
  'Review CLM-10482',
  'Missing evidence investigation',
  'Policy coverage clarification',
  'Rear-impact damage comparison',
  'Accident report summary',
  'Claim timeline review',
]
expected.forEach((t) => ok(titles.includes(t), `missing conversation: ${t}`))

const groups = convs.map((c) => c.group)
ok(groups.filter((g) => g === 'Recent').length === 3, 'Recent group should hold 3')
ok(groups.filter((g) => g === 'Earlier').length === 3, 'Earlier group should hold 3')

// Every conversation has messages; the seeded lead matches the brief exactly.
const lead = convs[0]
ok(lead.claimId === 'CLM-10482', 'lead conversation should target CLM-10482')
ok(lead.messages.length === 2, 'lead should have user + assistant message')
ok(lead.messages[0].role === 'user', 'lead first message is user')
ok(lead.messages[1].role === 'assistant', 'lead second message is assistant')
ok(
  lead.messages[0].text ===
    'Summarize the available evidence for CLM-10482 and tell me what needs further review.',
  'lead user question must match the brief',
)

// The demo error state exists (for the error + retry path).
ok(convs.some((c) => c.messages.some((m) => m.error)), 'one seeded error message expected')

// Evidence consistency for CLM-10482: 1 + 4 + 1 + 2 = 8
const c10482 = claimById('CLM-10482')
ok(c10482 && c10482.evidenceItems === 8, 'CLM-10482 should carry 8 evidence items')
const rows = evidenceBreakdown(c10482)
const total = rows.reduce((s, r) => s + r.count, 0)
ok(total === c10482.evidenceItems, `breakdown total ${total} != ${c10482.evidenceItems}`)
ok(rows.find((r) => r.sourceId === 'vehicle-photos')?.count === 4, '4 vehicle photos expected')
ok(rows.find((r) => r.sourceId === 'policy-documents')?.count === 2, '2 policy files expected')
ok(rows.find((r) => r.sourceId === 'accident-report')?.count === 1, '1 accident report expected')
ok(rows.find((r) => r.sourceId === 'customer-statement')?.count === 1, '1 statement expected')

// Every claim's breakdown sums correctly (never invents items).
for (const id of ['CLM-10476', 'CLM-10461', 'CLM-10455', 'CLM-10450', 'CLM-10470']) {
  const c = claimById(id)
  if (!c) continue
  const t = evidenceBreakdown(c).reduce((s, r) => s + r.count, 0)
  ok(t === c.evidenceItems, `${id}: breakdown ${t} != ${c.evidenceItems}`)
}

// Source metadata resolves and is labelled as demo.
const src = getSource('accident-report', c10482)
ok(src?.fileName === 'accident_report_CLM-10482.pdf', `unexpected fileName: ${src?.fileName}`)
ok(src?.status === 'Available in demo', 'source must be labelled as demo')
ok(src?.summary.includes('Illustrative'), 'summary must say Illustrative')
ok(getSource('policy-documents', c10482)?.fileName === 'policy_POL-88214.pdf', 'policy filename')

// Reply router picks the right shape for each prompt family.
const hasHeading = (reply, text) =>
  reply.sections.some((s) => s.kind === 'heading' && s.text.includes(text))

ok(hasHeading(buildDemoReply('Summarize the available evidence', c10482), 'Claim evidence summary'), 'summary reply')
ok(hasHeading(buildDemoReply('Are there any inconsistencies?', c10482), 'Potential inconsistencies'), 'inconsistency reply')
ok(hasHeading(buildDemoReply('Which policy clauses apply?', c10482), 'Policy context'), 'policy reply')
ok(hasHeading(buildDemoReply('What documents are missing?', c10482), 'Missing information'), 'missing reply')
ok(hasHeading(buildDemoReply('Walk me through the timeline', c10482), 'Investigation timeline'), 'timeline reply')
ok(hasHeading(buildDemoReply('hello there', c10482), 'Demonstration response'), 'fallback reply')

// The brief's exact headline sentence appears in the summary reply.
const summary = buildDemoReply('Summarize the available evidence for CLM-10482', c10482)
const para = summary.sections.find(
  (s) => s.kind === 'paragraph' && s.text.includes('evidence items'),
)
ok(
  para && para.text.includes('contains 8 evidence items'),
  `expected "contains 8 evidence items", got: ${para ? para.text : 'none'}`,
)
ok(summary.sections.some((s) => s.kind === 'reminder'), 'summary must carry the reviewer reminder')
ok(summary.sections.some((s) => s.kind === 'sources'), 'summary must carry source chips')

// Source chips in the summary = the four sources in the brief.
const chips = summary.sections.find((s) => s.kind === 'sources')
ok(
  chips && chips.sourceIds.join(',') === 'accident-report,vehicle-photos,customer-statement,policy-documents',
  `unexpected chips: ${chips ? chips.sourceIds.join(',') : 'none'}`,
)

// Citations never reference an unknown source id.
const known = new Set(['accident-report', 'vehicle-photos', 'customer-statement', 'policy-documents'])
for (const q of ['Summarize', 'inconsistencies', 'policy', 'missing', 'timeline', 'random']) {
  const r = buildDemoReply(q, c10482)
  for (const s of r.sections) {
    if (s.kind === 'point' && s.source.sourceId) {
      ok(known.has(s.source.sourceId), `unknown source id in "${q}": ${s.source.sourceId}`)
    }
    if (s.kind === 'sources') {
      for (const id of s.sourceIds) ok(known.has(id), `unknown chip id in "${q}": ${id}`)
    }
  }
}

// No approval language anywhere in the demo replies.
for (const q of ['Summarize', 'inconsistencies', 'policy', 'missing', 'timeline', 'random']) {
  const r = buildDemoReply(q, c10482)
  const flat = JSON.stringify(r).toLowerCase()
  ok(!flat.includes('"approved"') && !flat.includes('auto-approve'), `reply "${q}" implies approval`)
}

if (fails.length) {
  console.log('FAILURES:')
  fails.forEach((f) => console.log('  - ' + f))
  process.exit(1)
}
console.log(`chatData invariants OK (${convs.length} conversations, all checks passed)`)
