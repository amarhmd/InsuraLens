/* ==========================================================================
   Agent Chat mock content — conversation seeds, evidence source metadata,
   prompt suggestions, and the canned demonstration response builder.

   Frontend prototype only. Nothing here talks to a model, a retrieval
   pipeline, or a backend. Every assistant reply is canned text assembled
   from the mock claim records (src/mocks/claims.ts) so the interface can be
   exercised honestly.

   Integration note: `buildDemoReply()` is the seam where a real InsuraLens
   agent endpoint can be plugged in later — same input (question + claim
   context), same output shape (sections + activity steps). src/api/chat.js
   calls it today; a real backend replaces that one call.
   ========================================================================== */

import { mockClaims } from './claims'
import { evidenceBreakdown, nextId } from '../lib/chatData'
import { priorityLabel, stageLabel } from '../lib/constants'
import type { Claim } from '../lib/claimsData'
import type {
  ActivityStep,
  ChatMessage,
  Conversation,
  DemoReply,
  EvidenceSource,
  SourceRef,
} from '../lib/chatData'

/* -------------------------------------------------------------------------- */
/* Evidence sources (metadata only — no file contents exist in the prototype)  */
/* -------------------------------------------------------------------------- */

interface SourceDef {
  name: string
  chipLabel: string
  type: string
  summary: string
  sectionLabel?: string
  related: string[]
}

const SOURCE_DEFS: Record<string, SourceDef> = {
  'accident-report': {
    name: 'Accident Report',
    chipLabel: 'Accident Report',
    type: 'PDF Document',
    summary: 'Illustrative accident report metadata for the InsuraLens prototype.',
    sectionLabel: 'Section 2 — damage description (demo reference)',
    related: ['Vehicle Photos', 'Customer Statement'],
  },
  'vehicle-photos': {
    name: 'Vehicle Photos',
    chipLabel: 'Vehicle Photos',
    type: 'Image Set',
    summary: 'Illustrative vehicle photograph metadata for the InsuraLens prototype.',
    sectionLabel: 'Photo 03 — rear damage (demo reference)',
    related: ['Accident Report'],
  },
  'customer-statement': {
    name: 'Customer Statement',
    chipLabel: 'Customer Statement',
    type: 'Statement Record',
    summary: 'Illustrative customer statement metadata for the InsuraLens prototype.',
    related: ['Accident Report'],
  },
  'policy-documents': {
    name: 'Policy Documents',
    chipLabel: 'Policy Document',
    type: 'PDF Document (2 files)',
    summary: 'Illustrative policy document metadata for the InsuraLens prototype.',
    sectionLabel: 'Clause 4.2 — collision coverage (demo reference)',
    related: ['Accident Report'],
  },
}

function sourceFileName(sourceId: string, claim?: Claim): string {
  if (!claim) return '—'
  switch (sourceId) {
    case 'accident-report':
      return `accident_report_${claim.id}.pdf`
    case 'vehicle-photos':
      return `vehicle_photos_${claim.id}.zip`
    case 'customer-statement':
      return `customer_statement_${claim.id}.txt`
    case 'policy-documents':
      return `policy_${claim.policyRef}.pdf`
    default:
      return '—'
  }
}

export function getSource(sourceId: string, claim?: Claim): EvidenceSource | null {
  const def = SOURCE_DEFS[sourceId]
  if (!def) return null
  return {
    id: sourceId,
    ...def,
    fileName: sourceFileName(sourceId, claim),
    dateAdded: claim ? claim.dateReported : '—',
    status: 'Available in demo',
  }
}

/** One-line description per source, used in "Evidence reviewed" bullets. */
const SOURCE_SENTENCE: Record<string, string> = {
  'accident-report': 'Accident report — describes the reported collision.',
  'vehicle-photos': 'Vehicle photographs — document visible vehicle damage.',
  'customer-statement':
    "Customer statement — describes the incident from the customer's perspective.",
  'policy-documents':
    'Policy document — provides the coverage terms relevant to the review.',
}

/* -------------------------------------------------------------------------- */
/* Prompt suggestions                                                          */
/* -------------------------------------------------------------------------- */

export const SUGGESTIONS: Array<{ id: string; text: string }> = [
  { id: 'compare', text: 'Compare the vehicle photos with the accident report.' },
  { id: 'policy', text: 'Explain the relevant policy coverage conditions.' },
  { id: 'missing', text: 'Identify missing evidence for this claim.' },
  { id: 'timeline', text: 'Review the consistency of the incident timeline.' },
]

/* -------------------------------------------------------------------------- */
/* Citation helpers                                                            */
/* -------------------------------------------------------------------------- */

function ref(sourceId: string, label: string): SourceRef {
  return { sourceId, label }
}

const NO_SOURCE: SourceRef = { sourceId: null, label: '' }

const DEMO_ACTIVITY: ActivityStep[] = [
  { text: 'Retrieved relevant claim context.' },
  { text: 'Located related evidence records.' },
  { text: 'Compared referenced source information.' },
  { text: 'Prepared a summary for reviewer assessment.' },
]

const REMINDER =
  'These are preliminary investigation points, not a claim decision. The available evidence and policy terms must be reviewed by an authorized human reviewer.'

/* -------------------------------------------------------------------------- */
/* The demonstration response builder                                          */
/* -------------------------------------------------------------------------- */

function summaryReply(claim: Claim | undefined): DemoReply {
  const rows = evidenceBreakdown(claim)

  if (!claim) {
    return {
      sections: [
        { kind: 'heading', text: 'Claim evidence summary' },
        {
          kind: 'paragraph',
          text: 'No claim context is selected, so there is no evidence list to summarize. Select a claim in the chat header and the assistant will ground its answer in that claim’s mock records.',
        },
        { kind: 'heading', text: 'What a summary covers' },
        {
          kind: 'bullets',
          items: [
            SOURCE_SENTENCE['accident-report'],
            SOURCE_SENTENCE['vehicle-photos'],
            SOURCE_SENTENCE['customer-statement'],
            SOURCE_SENTENCE['policy-documents'],
          ],
        },
        { kind: 'flags', items: ['Insufficient evidence to conclude'] },
        { kind: 'heading', text: 'Reviewer reminder' },
        { kind: 'reminder', text: REMINDER },
      ],
      activity: DEMO_ACTIVITY,
    }
  }

  if (rows.length === 0) {
    return {
      sections: [
        { kind: 'heading', text: 'Claim evidence summary' },
        {
          kind: 'paragraph',
          text: `The mock record for ${claim.id} currently lists no evidence items. There is nothing to summarize yet.`,
        },
        { kind: 'flags', items: ['Supporting source unavailable'] },
        { kind: 'heading', text: 'Recommended next step' },
        {
          kind: 'paragraph',
          text: 'Begin evidence collection for this claim, then ask for a summary once documents are attached.',
        },
        { kind: 'heading', text: 'Reviewer reminder' },
        { kind: 'reminder', text: REMINDER },
      ],
      activity: DEMO_ACTIVITY,
    }
  }

  return {
    sections: [
      { kind: 'heading', text: 'Claim evidence summary' },
      {
        kind: 'paragraph',
        text: `The available mock records indicate that this claim contains ${claim.evidenceItems} evidence items. The initial review identifies several points for the claims professional to examine.`,
      },
      { kind: 'heading', text: 'Key findings' },
      {
        kind: 'bullets',
        items: [
          'The accident report describes the reported collision and the damage recorded at the scene (demo reference).',
          'Vehicle photographs document the visible damage referenced in the report.',
          'The customer statement provides the incident description from the customer’s perspective.',
          'The policy documents set out coverage terms that may apply to this incident.',
        ],
      },
      { kind: 'heading', text: 'Needs further investigation' },
      {
        kind: 'numbered',
        items: [
          'Compare the damage visible in the photographs with the collision description in the accident report.',
          'Check whether the customer statement is consistent with the recorded incident timeline.',
          'Verify the relevant coverage conditions in the policy documents.',
        ],
      },
      { kind: 'flags', items: ['Requires reviewer verification', 'Insufficient evidence to conclude'] },
      { kind: 'heading', text: 'Recommended next step' },
      {
        kind: 'paragraph',
        text: 'Review the linked source documents and confirm whether the available evidence adequately supports the incident description.',
      },
      {
        kind: 'expand',
        title: 'View evidence',
        body: [{ kind: 'bullets', items: rows.map((r) => SOURCE_SENTENCE[r.sourceId]) }],
      },
      { kind: 'heading', text: 'Reviewer reminder' },
      { kind: 'reminder', text: REMINDER },
      { kind: 'sources', sourceIds: rows.map((r) => r.sourceId) },
    ],
    activity: DEMO_ACTIVITY,
  }
}

function inconsistencyReply(claim: Claim | undefined): DemoReply {
  /* Rear-end claims get the rear-impact comparison wording. */
  const rearImpact = claim?.incident === 'rear_end_collision'
  const id = claim?.id ?? 'this claim'

  return {
    sections: [
      { kind: 'heading', text: 'Potential inconsistencies' },
      {
        kind: 'paragraph',
        text: `The mock records for ${id} contain limited documentation, so any comparison below is preliminary. Each point separates what is read directly from a source from what the assistant inferred.`,
      },
      {
        kind: 'point',
        label: 'Observation',
        text: rearImpact
          ? 'The accident report describes rear-end damage.'
          : 'The accident report describes collision damage consistent with the recorded incident type.',
        source: ref('accident-report', 'Accident Report · Section 2'),
      },
      {
        kind: 'point',
        label: 'Supporting material',
        text: rearImpact
          ? 'Vehicle photographs show visible damage to the rear of the vehicle.'
          : 'Vehicle photographs show visible damage to the impacted area of the vehicle.',
        source: ref('vehicle-photos', 'Vehicle Photo 03'),
      },
      {
        kind: 'point',
        label: 'AI interpretation',
        text: 'The photographed damage appears consistent with the collision described in the report. The demo records do not contain enough detail to confirm this.',
        source: ref('vehicle-photos', 'Vehicle Photo 03'),
      },
      {
        kind: 'point',
        label: 'Review consideration',
        text: 'The reviewer should compare the report and photographs before determining whether they are consistent.',
        source: NO_SOURCE,
      },
      {
        kind: 'paragraph',
        text: `This comparison is an AI interpretation based on limited demonstration records for ${id}. It is not a verified finding.`,
      },
      { kind: 'flags', items: ['Requires reviewer verification', 'Insufficient evidence to conclude'] },
      { kind: 'sources', sourceIds: ['accident-report', 'vehicle-photos'] },
    ],
    activity: DEMO_ACTIVITY,
  }
}

function policyReply(claim: Claim | undefined): DemoReply {
  if (!claim) {
    return {
      sections: [
        { kind: 'heading', text: 'Policy context' },
        {
          kind: 'paragraph',
          text: 'No claim is selected, so no policy can be linked to this conversation. Choose a claim context and the assistant will reference that claim’s policy metadata.',
        },
        { kind: 'flags', items: ['Insufficient evidence to conclude'] },
      ],
      activity: DEMO_ACTIVITY,
    }
  }

  return {
    sections: [
      { kind: 'heading', text: 'Policy context' },
      {
        kind: 'paragraph',
        text: `Policy ${claim.policyRef} is recorded against ${claim.id} with a policy match status of “${claim.policyMatch}”. The mock records list two policy documents for this claim.`,
      },
      {
        kind: 'point',
        label: 'Observation',
        text: 'The policy document records coverage terms relevant to vehicle collisions.',
        source: ref('policy-documents', 'Policy Document · Clause 4.2'),
      },
      {
        kind: 'bullets',
        items: [
          'Clause 4.2 — collision coverage: may be relevant to a vehicle collision loss (demo reference).',
          'Coverage conditions and any exclusions must be confirmed against the full policy text.',
        ],
      },
      {
        kind: 'point',
        label: 'Review consideration',
        text: 'Verify the applicable coverage conditions before relying on them for any coverage position.',
        source: NO_SOURCE,
      },
      {
        kind: 'paragraph',
        text: 'This is illustrative policy context drawn from mock metadata, not a coverage determination.',
      },
      { kind: 'flags', items: ['Requires reviewer verification'] },
      { kind: 'sources', sourceIds: ['policy-documents'] },
    ],
    activity: DEMO_ACTIVITY,
  }
}

function missingReply(claim: Claim | undefined): DemoReply {
  const id = claim?.id ?? 'this claim'
  const n = claim?.evidenceItems ?? 0

  return {
    sections: [
      { kind: 'heading', text: 'Missing information' },
      {
        kind: 'paragraph',
        text: `The mock evidence list for ${id} contains ${n} item${n === 1 ? '' : 's'}. The following documents commonly reviewed for a collision claim are not present in the demo records:`,
      },
      {
        kind: 'bullets',
        items: [
          'Repair estimate or damage assessment.',
          'Third-party vehicle and insurance details, if applicable.',
          'Police or incident report reference number, when one was recorded.',
        ],
      },
      {
        kind: 'point',
        label: 'Review consideration',
        text: 'Confirm which of these are required for this claim type before requesting anything from the customer.',
        source: NO_SOURCE,
      },
      {
        kind: 'paragraph',
        text: 'Absence from this list only reflects the mock dataset — it is not evidence that a document was never received.',
      },
      { kind: 'flags', items: ['Supporting source unavailable', 'Requires reviewer verification'] },
    ],
    activity: DEMO_ACTIVITY,
  }
}

function timelineReply(claim: Claim | undefined): DemoReply {
  if (!claim) {
    return {
      sections: [
        { kind: 'heading', text: 'Investigation timeline' },
        {
          kind: 'paragraph',
          text: 'No claim context is selected, so there is no timeline to review. Select a claim in the chat header to see its mock activity sequence.',
        },
        { kind: 'flags', items: ['Insufficient evidence to conclude'] },
      ],
      activity: DEMO_ACTIVITY,
    }
  }

  return {
    sections: [
      { kind: 'heading', text: 'Investigation timeline (demo)' },
      {
        kind: 'paragraph',
        text: `The mock records for ${claim.id} mark these points in the claim’s recorded activity. Each marker is read from claim metadata, not from a system audit log.`,
      },
      {
        kind: 'bullets',
        items: [
          `Incident reported — ${claim.dateReported}.`,
          `Latest record update — ${claim.updatedLabel}.`,
          `Current workflow status — ${stageLabel(claim.status)}.`,
          `Priority recorded — ${priorityLabel(claim.priority)}.`,
        ],
      },
      {
        kind: 'point',
        label: 'Observation',
        text: 'The sequence above is read from mock claim metadata.',
        source: NO_SOURCE,
      },
      {
        kind: 'paragraph',
        text: 'A verified timeline would be built from system activity logs, which this prototype does not have.',
      },
      { kind: 'flags', items: ['Requires reviewer verification'] },
      { kind: 'sources', sourceIds: ['accident-report'] },
    ],
    activity: DEMO_ACTIVITY,
  }
}

function generalReply(): DemoReply {
  return {
    sections: [
      { kind: 'heading', text: 'Demonstration response' },
      {
        kind: 'paragraph',
        text: 'No live model or agent tools are connected to this prototype, so this reply is canned text assembled from mock claim records. The interaction above shows how a connected InsuraLens agent would respond.',
      },
      {
        kind: 'bullets',
        items: [
          'Summarize the available evidence for this claim.',
          'Look for inconsistencies between the report and the statement.',
          'Identify which policy clauses may be relevant.',
          'List documents that are still missing for review.',
        ],
      },
      {
        kind: 'point',
        label: 'Review consideration',
        text: 'Pick one of the example questions above, or connect the InsuraLens agent backend to enable live answers.',
        source: NO_SOURCE,
      },
      { kind: 'flags', items: ['Insufficient evidence to conclude'] },
    ],
    activity: [{ text: 'No live tools were called — this step list is illustrative only.' }],
  }
}

/**
 * Routes a question to one of a handful of canned responses. Keyword based —
 * intentionally simple, and always labelled as demo content in the UI.
 */
export function buildDemoReply(question: string, claim: Claim | undefined): DemoReply {
  const q = question.toLowerCase()
  if (q.includes('summar') || q.includes('overview') || q.includes('recap')) return summaryReply(claim)
  if (
    q.includes('compare') ||
    q.includes('inconsist') ||
    q.includes('contradict') ||
    q.includes('consistent')
  ) {
    return inconsistencyReply(claim)
  }
  if (q.includes('polic') || q.includes('coverage') || q.includes('clause')) return policyReply(claim)
  if (q.includes('missing') || q.includes('additional') || q.includes('need') || q.includes('document')) {
    return missingReply(claim)
  }
  if (q.includes('timeline') || q.includes('chronolog') || q.includes('sequence')) return timelineReply(claim)
  return generalReply()
}

/* -------------------------------------------------------------------------- */
/* Seeded conversations                                                        */
/* -------------------------------------------------------------------------- */

function userMsg(text: string, time: string): ChatMessage {
  return { id: nextId('msg'), role: 'user', text, time }
}

function replyMsg(question: string, claim: Claim | undefined, time: string): ChatMessage {
  const { sections, activity } = buildDemoReply(question, claim)
  return { id: nextId('msg'), role: 'assistant', sections, activity, demo: true, time }
}

function errorMsg(time: string): ChatMessage {
  return {
    id: nextId('msg'),
    role: 'assistant',
    time,
    error: true,
    text: 'The demonstration response could not be prepared for this conversation. No live agent tools are connected to this prototype.',
  }
}

function claim(id: string): Claim | undefined {
  return mockClaims.find((c) => c.id === id)
}

const SUMMARY_Q = 'Summarize the available evidence for CLM-10482 and tell me what needs further review.'

export function seedConversations(): Conversation[] {
  return [
    {
      id: nextId('conv'),
      title: 'Review CLM-10482',
      group: 'Recent',
      time: '12 min ago',
      claimId: 'CLM-10482',
      messages: [userMsg(SUMMARY_Q, '9:41 AM'), replyMsg(SUMMARY_Q, claim('CLM-10482'), '9:41 AM')],
    },
    {
      id: nextId('conv'),
      title: 'Missing evidence investigation',
      group: 'Recent',
      time: '1 hr ago',
      claimId: 'CLM-10476',
      messages: [
        userMsg('What additional documents or evidence may be needed for CLM-10476?', '8:57 AM'),
        errorMsg('8:57 AM'),
      ],
    },
    {
      id: nextId('conv'),
      title: 'Policy coverage clarification',
      group: 'Recent',
      time: '3 hrs ago',
      claimId: 'CLM-10461',
      messages: [
        userMsg('Which policy clauses may be relevant to CLM-10461?', '7:12 AM'),
        replyMsg('Which policy clauses may be relevant?', claim('CLM-10461'), '7:12 AM'),
      ],
    },
    {
      id: nextId('conv'),
      title: 'Rear-impact damage comparison',
      group: 'Earlier',
      time: 'Yesterday',
      claimId: 'CLM-10476',
      messages: [
        userMsg('Are there any inconsistencies between the accident report and customer statement?', '4:26 PM'),
        replyMsg(
          'inconsistencies between the accident report and customer statement',
          claim('CLM-10476'),
          '4:26 PM',
        ),
      ],
    },
    {
      id: nextId('conv'),
      title: 'Accident report summary',
      group: 'Earlier',
      time: '2 days ago',
      messages: [
        userMsg('Summarize the accident report for me.', '11:05 AM'),
        replyMsg('summarize', undefined, '11:05 AM'),
      ],
    },
    {
      id: nextId('conv'),
      title: 'Claim timeline review',
      group: 'Earlier',
      time: '4 days ago',
      claimId: 'CLM-10455',
      messages: [
        userMsg('Walk me through the timeline of this claim.', '2:48 PM'),
        replyMsg('timeline', claim('CLM-10455'), '2:48 PM'),
      ],
    },
  ]
}
