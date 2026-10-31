# InsuraLens

**From accident photo to a supported claim decision in minutes.**

InsuraLens is a claims-review workspace for vehicle insurance teams. An AI agent analyzes damage photos and summarizes the findings, while a human reviewer confirms each damage area and makes the final decision. Built with Vite, React, and TypeScript on top of the InsuraLens backend API.

**Live demo:** https://insura-lens.vercel.app

<!-- Add screenshots here once saved in docs/screenshots/:
![Claims list](docs/screenshots/claims.png)
![Claim workspace](docs/screenshots/workspace.png)
![AI decision card](docs/screenshots/decision.png)
-->

## Key Features

- **Claims queue** with status, priority, and evidence tracking
- **AI damage analysis** from uploaded photos, with a summary and consistency check
- **Interactive damage map**: the reviewer confirms or dismisses each detected area
- **AI Decision card** with a recommendation, confidence level, and an explanation linked to each damage area
- **Human-in-the-loop**: the AI recommends, the authorized reviewer always decides
- Dashboard, analytics, agent chat, and settings

## Requirements

- **Node.js 20 or newer** (verified on Node 24, which is also what the scripts' `node:` imports and type-stripping checks run on)
- npm

> Windows PowerShell users: if `npm` is blocked by the execution policy, use `npm.cmd` instead.

## Quick Start

```bash
git clone https://github.com/amarhmd/InsuraLens.git
cd InsuraLens
npm install
npm run dev
```

Create `.env.local` (or `.env`) with the backend base URL (see `.env.example`):

```env
VITE_API_URL=https://insurance-ai-1.onrender.com/api
```

Open http://localhost:5173 and sign in with the credentials the backend issued you. The deployed dev backend currently accepts `demo@insuralens.app` / `demo123` (a demo-only account); any other credentials are rejected with "Incorrect email or password".

The dev server must be reached at `http://localhost:5173` or `http://127.0.0.1:5173`, the origins the backend allows. In production the app is served behind a same-origin `/api` rewrite, so no CORS configuration is needed.

## Judges

Opening the app needs no credentials and no setup:

1. **Open the app**: visit the [live demo](https://insura-lens.vercel.app), or run it locally (see [Quick Start](#quick-start)).
2. **Click "Continue as guest reviewer"** on the sign-in screen. This opens a real session on the live backend (`POST /api/auth/demo`) and lands on the dashboard.
3. **Open a claim and run AI analysis**: go to **Claims**, open any claim, and use **Run AI analysis** in the claim workspace to see the agent pipeline (policy lookup, damage findings, and the reviewer decision controls).
4. **Review and decide**: confirm or dismiss each damage area, open **Why this decision?** on the AI Decision card, then approve the claim.

> The AI analysis step depends on the backend's MCP policy tools. If they are unreachable, the workspace shows the real error and a Retry.

**Tip:** if the backend has been idle, the first request can take up to a minute while Render's free instance wakes. Open the app a few minutes before reviewing; the sign-in screen also offers Retry.

## Prototype Notes

This is a working prototype. To be transparent about what is live and what is simplified:

**Live**

- Authentication, claims queue, evidence upload, dashboard, and analytics read from the real backend API.
- AI damage analysis and the damage summary come from the backend agent.

**Simplified for the demo**

- **Approval fallback:** if the backend's `update_claim` tool is unreachable, the UI can apply the approval locally so the full review flow can be demonstrated. This state is kept in the browser only and is not saved to the database.
- **AI Decision card:** the recommendation, confidence value, and "Why this decision?" explanation are derived in the frontend from review progress, coverage, and inconsistencies. They are not a direct output of the model.
- **Damage areas** may be estimated from the AI summary text when the analysis does not return coordinates.

**Roadmap**

- Persist approvals through the backend and database.
- Model-generated explanations and calibrated confidence.
- Duplicate / edited-image detection for fraud prevention.
- Multi-language support, including Arabic.
- Role-based access (reviewer / supervisor).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | `tsc -b` then `vite build`. |
| `npm run preview` | Preview the production build. |
| `npm run typecheck` | `tsc -b --force`. |
| `npm run contrast` | Contrast gates (shared palette, chat, analytics, settings). |
| `npm run check:chat` | Chat stylesheet gate. |
| `npm run check:analytics` | Analytics stylesheet gate. |
| `npm run check:settings` | Settings store + AI-preference + stylesheet + SSR checks. |
| `npm run check:notifications` | Notification store checks. |

There is no unit-test framework; the `scripts/*.mjs` files are the verification gates.

## Project Structure

```
src/
  api/                  The ONLY place pages get data — all real requests
    http.js             Base URL, bearer token, ApiError, request(), session bootstrap
    auth.js             login / continueAsGuest / getCurrentUser / logout → /api/auth/*
    claims.js           listClaims / getClaim / createClaim    → /api/claims*
    evidence.js         uploadClaimEvidence (XHR progress)     → /api/claims/:id/evidence
    dashboard.js        getDashboardSummary                    → /api/dashboard/summary
    analytics.js        getAnalytics(filters)                  → /api/analytics
    chat.js             listConversations / sendChatMessage    → /api/chat/*
    notifications.js    listNotifications / markNotificationRead
  lib/
    constants.ts        Shared vocabulary: stage/priority/incident tokens + labels
    claimsData.ts       Claim types + queue helpers (filter/sort/count)
    claimWorkspace.ts   Claim-workspace view model types
    analyticsData.ts    Analytics selectors (real claim rows only)
    chatData.ts         Chat message types + mapping from the backend
    identity.ts         Signed-in user from GET /api/auth/me
    dashboard.ts        Dashboard view-model types
    router.ts           Hash router: #/, #/dashboard, #/claims, #/claims/:id,
                        #/analytics, #/chat, #/settings
    cx.ts, landing.ts, settingsStore.ts, format.ts
  components/           Shared pieces (layout, ui, feedback)
  pages/                One folder per route; page components and hooks colocate
  styles/               tokens.css + per-area stylesheets
  main.tsx              App entry — CSS import order matters
scripts/                Verification gates (stores, stylesheets, contrast, SSR)
docs/                   API_CONTRACT.md, openapi.yaml
public/brand/           Logo and brand assets
```

## How Data Flows

```
pages/*.tsx  →  src/api/*.js  →  the InsuraLens backend (/api/…)
```

- **Pages read their data from the backend.** They call `src/api/` functions and render loading / empty / error states (with a Retry where a request can fail). A failed request shows the real error. The only exception is the demo approval fallback described in [Prototype Notes](#prototype-notes).
- Dashboard, Claims, and Analytics all derive their numbers from the same live claim queue, so their totals agree and a claim created on `#/claims` shows up everywhere.
- The signed-in user comes from `GET /api/auth/me`; the sidebar and profile menu render that identity, not a hardcoded name.
- Stage, priority, and incident values are **tokens** (`evidence_collection`, `high`, `rear_end_collision`, …) defined once in `src/lib/constants.ts`; display text goes through `stageLabel()` / `priorityLabel()` / `incidentLabel()`.

## Connecting to the Backend

1. Set `VITE_API_URL` to the backend base URL including `/api` (see `.env.example`).
2. `src/api/http.js` attaches the bearer token to every request and opens a backend session when none is stored.
3. Errors: `request()` converts the server's error envelope (`{ error: { code, message, details } }`) into `ApiError { status, code, message }`, which pages render as their error/retry states.

Some screens state that data is "not available yet" because no endpoint serves it yet (policy document viewer, per-stage workflow timings, forgot-password). The exact endpoint contracts needed to make those real are listed in `docs/API_CONTRACT.md`.

## Design & Accessibility Notes

- **Teal for text-bearing actions**: brand teal `#159A9C` fails WCAG AA for small white text (3.42:1); primary buttons/links use `#0F7F81` (teal-600). The `contrast` script gates this.
- Status and priority always pair colour with a text label; motion is decorative and removed under `prefers-reduced-motion`.
- Hash routing (`#/claims?tab=human_review`) keeps deep links working without server config; query values use the API tokens.

## Out of Scope

- AI analysis depends on the backend's MCP policy tools; when they are unreachable the workspace shows the real error.
- Some backend endpoints used by the design are not implemented yet (policy document, per-stage timings, evidence deletion, analytics export, password reset). Their exact contracts are listed in `docs/API_CONTRACT.md`.