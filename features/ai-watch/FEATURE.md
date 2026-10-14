# FEATURE.md — `ai-watch`

**Status:** `active`
**Tier:** `2`
**Last updated:** `2026-10-13`

Product truth and the cross-repo contract live ONLY in
`common-docs/systems/architecture/execution-runtime/AI-WATCH.md`. This file is the local map.

---

## Purpose

Watch AI: a system admin (debug mode on) watches ONE AI run exactly as it ran — mandate,
holder + version, provision values as filled, goal, output kind, the exact provider request,
the live stream — and acts on it (Improve this agent, Send to developers).

---

## Entry points

**Window** — `features/window-panels/windows/ai-watch/AiWatchWindow.tsx` (overlay `aiWatchWindow`,
ONE instance per page, `ai-watch:page`; deep link `?panels=ai-watch:page` — an older
`ai-watch:<u|c|w|r>-<id>` opens the same window with that call selected). Left list:
`watch-rail.ts` (every AI call of the page's runs, grouped by run; newest live call auto-selected;
a new run clears a pick and never shows an older run's call). The page's run ids survive a reload in
`sessionStorage` (`matrx:ai-watch:runs:<pathname>`).

**Openers**
- `useWatchAiRun()` / `watchAiRunAction()` — `features/overlays/openers/aiWatchWindow.tsx`
  (`requestId` · `userRequestId` · `workflowRunId` + `nodeId` · `conversationId`) — every door only
  moves the ONE window's selection.
- Chat package: the host opener `openAiWatchWindow` is registered in `providers/ChatHostAdapter.tsx`
  ONLY when `useCanWatchAi()` — so `LiveRunWindow`'s button is absent for everyone else.
- `WatchAiRunButton` — the inline door (Applet job output, `features/applets-host/AppletRunOutput.tsx`).
- Sidebar light — `features/shell/components/controls/SidebarWatchAiToggle.tsx` (Lucide Eye,
  orange while `selectLiveWatchableRuns` is non-empty), mounted in `AdminSidebarSection`.
- Auto-watch — `AutoWatch.tsx`, mounted by `features/admin/AdminFeatureProvider.tsx` for super-admin
  debuggers on every page: with debug mode on, each live root workflow run on the page opens its
  `WorkflowRunWindow` and the page Watch AI window, and each new automated AI call re-opens Watch AI.
- Workflow run rail — `ProgressRailReadout` marks AI steps (`ai.*`), shows each step's timing, and
  opens Watch AI on that step's call (`nodeId` option → the call whose `metadata.workflow_node_id` matches).

**Gate** — `useCanWatchAi()` / `selectCanWatchAi` (`useCanWatchAi.ts`): registered admin feature
`ai.watch` (`utils/auth/adminFeaturesOnUserPages.ts`) AND `adminDebug.isDebugMode`. Debug mode is
saved in user preferences (`system.debugMode`, `features/admin/useDebugModePersistence.ts`) and
survives reloads, tabs and devices until turned off.

**Truth rules (pure, tested)** — `watch-run-truth.ts`: captures filtered by request id (children
nested), rejoin repeats merged, retried attempts superseded, live capture kept over the recorded
snapshot (labelled; a shortfall is an error), mandate identity only from the run's own frame.
A continuation turn's frame (`provision_applied: false` — server `build_turn_frame` for continue,
fork-and-run and resume) renders through `continuationView` / `earlierFrames`: "This turn ·
provision not re-applied" with who wrote the turn, its words or host line and its context, and a
resume's earlier frames on the same request — never the door's provision as if it applied.

**Records** — `ai-watch-records.ts`: `chat.user_request` (+ `metadata.mandate_watch`),
`chat.request_snapshot`, `agent.definition_version` (instructions + output schema of the version
that ran), `mandate.definition.version` (changed-since-run hint); runs lists via `readAllRows`.

**Identity source** — `@ai-matrx/chat` ≥ 0.8.73: `ActiveRequest.serverRequestId` (header or the
stream's own reservation), `ActiveRequest.mandateRun` (the server's `mandate_run` frame),
`selectWatchableRuns` / `selectLiveWatchableRuns`.

---

## Tests

- `__tests__/watch-run-truth.test.ts` — recorded `context_analysis` frames of two turns of one
  conversation.
- `__tests__/split-provider-request.test.ts` — every provider request shape.
- `__tests__/continuation-turn-frame.test.ts` — the recorded `applets.build` fix round's frame.
- Package: `every-request-creation-binds-its-identity.test.ts`, `watch-ai-identity-is-per-request.test.ts`
  (aidream `apps/shared/chat`); server: `aidream/services/mandates/tests/test_watch_frame.py`,
  `test_watch_frame_continuation.py`.

---

## Change Log

- **2026-10-14 (c)** — ONE window: three Watch AI windows piled up on a new round (two per-call
  windows restored from the address, the front one an old classifier call). Every door now opens
  `ai-watch:page`; a restored per-call window folds into it; `panels=` carries one entry. Live
  prompt: the server's debug emitter dropped `send_context_analysis` (aidream 3ac8f3abdd), so no
  workflow step's request ever streamed.

- **2026-10-14 (b)** — Root causes of "no AI runs, no progress": (1) debug mode was in-memory only;
  (2) auto-open lived in the sidebar button and the admin provider rendered nothing on user pages;
  (3) a workflow step never announced its `user_request` (only the HTTP stream's opening frames did),
  so lanes never bound; (4) every AI step of a run shared the root's request id, so ONE row held a
  whole round. Server (matrx-ai `run_step_agent`): each step runs under its own request id, announces
  it, and the reserved row carries `mandate_key` + `workflow_node_id`. Client: persisted debug mode,
  `AutoWatch`, and the rail's timing / AI steps / Watch AI door.

- **2026-10-14** — Workflow AI steps are watchable and the window is a chat. The server forwards a
  step's `record_reserved user_request` (as a `record_update` marker, status `reserved`) and its
  `context_analysis` (framed node_stream kind) — the run page binds the node's lane to its server
  run (`adopt-workflow-run.thunk.ts`) and puts the request on the lane's timeline. `page-ai-runs.ts`:
  the list/light/auto-watch read only AI runs (a lane counts once bound) and the page's workflow
  runs' recorded calls, so the list outlives the live rows. Debug mode auto-opens the page window
  on every new automated AI run (`SidebarWatchAiToggle`). The window leads with a Chat section
  (system, user, assistant via `LiveRunDisplay` / `MarkdownStream`) and shows a workflow step's
  mandate, step, agent and model from its row.

- **2026-10-13** — Continuation turns (Change it, her replies, host fix rounds, resumes) carry
  their own server frame; the window shows what that turn carried and says the provision was
  not re-applied, instead of "attributed to <key>".
- **2026-10-13** — Phase 1 of the admin watch window: per-request identity (server id, the
  `mandate_run` frame), the 5-second time-window match deleted, captures filtered by request id,
  recorded snapshot labelled and never a silent replacement, mandate/provision/goal/version
  sections, admin+debug gate on the window and every button, orange sidebar light, Applet job
  Watch door, Improve this agent / Send to developers, runs-list errors shown.
