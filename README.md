# InsuraLens

A frontend-only claims-review prototype for insurance teams: sign-in, dashboard, claims work queue, claim workspace, analytics, agent chat, and settings. Built with Vite, React, and TypeScript. There is no backend — every screen reads from a mock API layer that the backend engineer swaps for real endpoints.

## Requirements

- **Node.js 20 or newer** (verified on Node 24, which is also what the scripts' `node:` imports and type-stripping checks run on)
- npm (on this machine `npm.ps1` is blocked by PowerShell execution policy — use `npm.cmd`)

## Quick Start

```cmd
cd C:\Users\DESKTOP\Desktop\InsuraLens1
npm.cmd install
npm.cmd run dev
```

Open http://127.0.0.1:5173. The login form accepts **any work email** with the demo password `demo123` (anything else shows "Incorrect email or password"), or use **Continue with demo**.

## Scripts

| Script | What it does |
| --- | --- |
| `npm.cmd run dev` | Start the dev server (port 5173, hash routing). |
| `npm.cmd run build` | Type-check (`tsc -b`) and build for production into `dist/`. |
| `npm.cmd run preview` | Serve the production build locally. |
| `npm.cmd run typecheck` | Strict TypeScript check (`tsc -b --force`) only. |
| `npm.cmd run contrast` | Contrast gates: palette, chat, analytics, settings. |
| `npm.cmd run check:chat` | Chat data invariants + chat CSS/token gate. |
| `npm.cmd run check:analytics` | Analytics data invariants + analytics CSS/token gate. |
| `npm.cmd run check:settings` | Settings CSS/token gate + SSR smoke test. |

Individual gates also live in `scripts/*.mjs` and run directly with `node scripts\<name>.mjs`.

## Project Structure

```
src/
  api/                  Mock-backed API layer — the ONLY place pages get data
    http.js             Base URL, bearer token helpers, ApiError, request(),
                        delay(). request() is the seam for the real backend.
    auth.js             login / getCurrentUser / logout        → /api/auth/*
    claims.js           listClaims / getClaim / createClaim    → /api/claims*
    evidence.js         uploadEvidence (progress callback)     → upload endpoint
    dashboard.js        getDashboardSummary                    → /api/dashboard/summary
    analytics.js        getAnalytics(filters)                  → /api/analytics
    chat.js             listConversations / sendChatMessage    → /api/chat/*
    notifications.js    listNotifications / markNotificationRead
  mocks/                Single source of truth for demo data
    claims.ts           128-claim dataset (seeds + deterministic generator)
    chat.ts             Conversation seeds, canned replies, source registry
    analytics.ts        Sample workflow-duration metrics
    auth.ts             Demo session/user, demo password
    dashboard.ts        Fixed recent-activity feed
    notifications.ts    Bell-inbox items
  lib/
    constants.ts        Shared vocabulary: stage/priority/incident tokens,
                        label maps, label helpers, option lists, priorityRank()
    claimsData.ts       Claim types + queue helpers (filter/sort/count)
    analyticsData.ts    Analytics selectors (re-exports mock metrics)
    chatData.ts         Chat message types + helpers (re-exports mock content)
    router.ts           Hash router: #/, #/dashboard, #/claims, #/claims/:id,
                        #/analytics, #/chat, #/settings
    cx.ts, landing.ts, settingsStore.ts
  components/           Only truly shared pieces
    layout/             App shell, top header, sidebar
    ui/                 StatusBadge, icons
    feedback/           ToastNotification, ConfirmDialog
  pages/                One folder per route; page-specific components and
    login/              hooks colocate next to the page (CustomSelect,
    demo/               SettingsKit, chartKit/, useClaimsQueue, useAgentChat)
    dashboard/
    claims/
    claim-workspace/
    agent-chat/
    analytics/
    settings/
  styles/               tokens.css + per-area stylesheets
  main.tsx              App entry — CSS import order matters
scripts/                Verification gates (data invariants, CSS, contrast, SSR)
docs/                   API_CONTRACT.md, openapi.yaml
public/brand/           Logo and brand assets (unmodified)
```

## How Data Flows

```
pages/*.tsx  →  src/api/*.js  →  src/mocks/* + src/lib selectors
                     │
                     └── delay(150–750 ms) simulates the network
```

- **Pages never import `src/mocks/` data directly** — they call `src/api/` functions and handle loading/error states (`.page-state` panels, retry buttons, the analytics skeleton).
- All counts are computed from the one claims dataset in `src/mocks/claims.ts`, so Dashboard, Claims, and Analytics totals always agree, and a claim created on `#/claims` appears in every page's numbers.
- Stage, priority, and incident values are **tokens** (`evidence_collection`, `high`, `rear_end_collision`, …) defined once in `src/lib/constants.ts`; display text goes through `stageLabel()` / `priorityLabel()` / `incidentLabel()` so the UI wording is unchanged.

## Switching from Mocks to the Real API

1. Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` (origin only, no `/api` suffix).
2. In each file under `src/api/`, replace the mock body with the already-annotated call:

   ```js
   // before (mock)
   export async function listClaims(params) {
     await delay(MOCK_DELAY_MS)
     return mockClaims.map((claim) => ({ ...claim }))
   }

   // after (real)
   export async function listClaims(params) {
     return request('/api/claims', { query: params })
   }
   ```

   Every function carries a `TODO(backend):` comment naming its exact endpoint and payload shape.
3. On login success, persist the issued token with `setToken()` from `src/api/http.js` — `request()` then sends `Authorization: Bearer …` automatically.
4. Errors: `request()` already converts the server's error envelope (`{ error: { code, message, details } }`) into `ApiError { status, code, message }`, which the pages render as their error/retry states.

Contracts, example payloads, pagination, upload rules, and open questions live in **`docs/API_CONTRACT.md`**; the machine-readable version is **`docs/openapi.yaml`**.

## Design & Accessibility Notes

- **Teal for text-bearing actions**: brand teal `#159A9C` fails WCAG AA for small white text (3.42:1); primary buttons/links use `#0F7F81` (teal-600). The `contrast` script gates this.
- Status and priority always pair colour with a text label; motion is decorative and removed under `prefers-reduced-motion`.
- Hash routing (`#/claims?tab=human_review`) keeps deep links working without server config; query values use the API tokens.

## Out of Scope (by design)

No real authentication, storage, network calls, or AI model. Files chosen in the create-claim modal stay in the browser session. Prototype notices on the chat and login pages say so in-product.
