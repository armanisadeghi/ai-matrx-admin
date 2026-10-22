# FEATURE.md — `ai-watch`

**Status:** `active`
**Tier:** `2`
**Last updated:** `2026-10-22`

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
- `useWatchAiRun()` / `watchAiRunAction()` — `features/overlays/definitions/aiWatchWindow.overlay.tsx`
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
snapshot (labeled; a shortfall is an error), mandate identity only from the run's own frame.
A continuation turn's frame (`provision_applied: false` — server `build_turn_frame` for continue,
fork-and-run and resume) renders through `continuationView` / `earlierFrames`: "This turn ·
provision not re-applied" with who wrote the turn, its words or host line and its context, and a
resume's earlier frames on the same request — never the door's provision as if it applied.

**Records** — `ai-watch-records.ts`: `chat.user_request` (+ `metadata.mandate_watch`), the exact provider
calls through the server (`GET /runs/{request_id}/snapshots?debug_view=1`, `fetchAiWatchSnapshots` — the browser
never selects `chat.request_snapshot` payload columns; since stage 5, 2026-10-20, they are client-excluded and any
select naming one, or `*`, is refused with 42501), provision values by hash through
`GET /runs/{id}/values?debug_view=1`, `agent.definition_version` (instructions + output schema of the version
that ran), `mandate.definition.version` (changed-since-run hint); runs lists via `readAllRows`. Run LISTS
(`fetchAiWatchRuns`, `fetchFollowedRuns`, `everything-feed.ts`) select only the label fields of `metadata`
(`RUN_LABEL_METADATA_COLUMNS` + `withLabelMetadata`), never the whole column with its watch frame.
**On the wire** — `@ai-matrx/chat/host/ai-watch` adds `?debug_view=1` to every AI stream when the host's
`server.aiWatch()` says the person is watching; without it the server streams no `context_analysis` and withholds
values (provision leak fix, stage 2). The host wiring (`providers/ChatHostAdapter.tsx` `aiWatch: selectCanWatchAi`)
lands with the package adoption.

**Data — the three tiers (2026-10-22)** — `data/`: every step's exact data in labelled panes
(`DataPane`, the ONE place a value is shown; tier + size in every title). Per tool call of the run
(`RunDataSection`, `chat.tool_call` by `user_request_id`, read direct): **RAW** from the server's
capture index `metadata.raw_capture` (inline bytes, a stored `run-captures` file opened in the file
preview window, or "Not kept — why"; a row recorded before capture says so), a web read's **page as
fetched** (`pages[].processed_document_id` → `docproc.processed_documents.original_file_id`), the
**cut trail** (`cutLine`), **SENT TO MODEL** = the `tool_result` block with the call id in every later
iteration's provider request (`sentToModel`: Anthropic, OpenAI Responses, chat-completions, Gemini),
and **DISPLAY** = the tool's own renderer (`ToolCallVisualization` over the stored row). Non-AI
workflow steps (`workflow.node_outcome` of the page's runs, `fetchRunSteps`) join the rail beside the
AI calls (`rail-steps.ts`); a step opens `StepDataView`: RAW (its outside answers, e.g. Smart Add's
ScrapeCreators bodies), **PASSED ON** (its output, value refs resolved) and DISPLAY
(`AnswerValueView`). Pure rules: `data/raw-data.ts`. Who sees it: whoever can open the window — no
added gating. The Goal section shows the output kind's schema from the kind registry
(`useKindSchema`), the agent version's schema only when the run has no output kind.

**Identity source** — `@ai-matrx/chat` ≥ 0.8.73: `ActiveRequest.serverRequestId` (header or the
stream's own reservation), `ActiveRequest.mandateRun` (the server's `mandate_run` frame),
`selectWatchableRuns` / `selectLiveWatchableRuns`.

---

## Tests

- `__tests__/watch-run-truth.test.ts` — recorded `context_analysis` frames of two turns of one
  conversation.
- `__tests__/split-provider-request.test.ts` — every provider request shape.
- `__tests__/raw-data-tiers.test.ts` — a recorded web read (`chat.tool_call` b8393cef) and its next
  request's `tool_result`: SENT per provider shape, the capture index, the cut trail, page originals,
  rail steps. Guard: `pnpm check:ai-watch` also fails a Data pane without a literal tier.
- `__tests__/continuation-turn-frame.test.ts` — the recorded `applets.build` fix round's frame.
- Package: `every-request-creation-binds-its-identity.test.ts`, `watch-ai-identity-is-per-request.test.ts`
  (aidream `apps/shared/chat`); server: `aidream/services/mandates/tests/test_watch_frame.py`,
  `test_watch_frame_continuation.py`.

---

## Change Log

- **2026-10-22** — Raw data (phase 1): the Data section (RAW · SENT TO MODEL · DISPLAY per tool call,
  RAW · PASSED ON · DISPLAY per non-AI workflow step, sizes and the cut trail), non-AI steps in the
  rail, web reads link their stored page, the output kind schema comes from the kind registry. The
  server snapshot door serves any run to an AI Watch viewer (no conversation-access check).

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
  recorded snapshot labeled and never a silent replacement, mandate/provision/goal/version
  sections, admin+debug gate on the window and every button, orange sidebar light, Applet job
  Watch door, Improve this agent / Send to developers, runs-list errors shown.
- 2026-10-17 — Everything view (`EverythingFeed.tsx`, `everything-feed.ts`): platform-wide recent runs from `chat.user_request`, server-side filters (person, organization, door, mandate, agent, background) and keyset paging, loaded only when switched on; a row opens in the same detail. The eval fact judge's call (`outcome.judge.conversation_id/request_id`, aidream `agent_tests`) is a followed step. Watch AI lives in one place (`watch-ai-one-place.ts`, enforced in `AutoWatch`). Scalars that quote a kind key render through the answer pipeline (`RowText`). The from-chat door follows each sub-run conversation.
