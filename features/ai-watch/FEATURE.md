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
multi-instance; deep link `?panels=ai-watch:<u|c|w|r>-<id>`).

**Openers**
- `useWatchAiRun()` / `watchAiRunAction()` — `features/overlays/openers/aiWatchWindow.tsx`
  (`requestId` · `userRequestId` · `workflowRunId` · `conversationId` · `pageRuns`).
- Chat package: the host opener `openAiWatchWindow` is registered in `providers/ChatHostAdapter.tsx`
  ONLY when `useCanWatchAi()` — so `LiveRunWindow`'s button is absent for everyone else.
- `WatchAiRunButton` — the inline door (Applet job output, `features/applets-host/AppletRunOutput.tsx`).
- Sidebar light — `features/shell/components/controls/SidebarWatchAiToggle.tsx` (Lucide Eye,
  orange while `selectLiveWatchableRuns` is non-empty), mounted in `AdminSidebarSection`.

**Gate** — `useCanWatchAi()` / `selectCanWatchAi` (`useCanWatchAi.ts`): registered admin feature
`ai.watch` (`utils/auth/adminFeaturesOnUserPages.ts`) AND `adminDebug.isDebugMode`.

**Truth rules (pure, tested)** — `watch-run-truth.ts`: captures filtered by request id (children
nested), rejoin repeats merged, retried attempts superseded, live capture kept over the recorded
snapshot (labelled; a shortfall is an error), mandate identity only from the run's own frame.

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
- Package: `every-request-creation-binds-its-identity.test.ts`, `watch-ai-identity-is-per-request.test.ts`
  (aidream `apps/shared/chat`); server: `aidream/services/mandates/tests/test_watch_frame.py`.

---

## Change Log

- **2026-10-13** — Phase 1 of the admin watch window: per-request identity (server id, the
  `mandate_run` frame), the 5-second time-window match deleted, captures filtered by request id,
  recorded snapshot labelled and never a silent replacement, mandate/provision/goal/version
  sections, admin+debug gate on the window and every button, orange sidebar light, Applet job
  Watch door, Improve this agent / Send to developers, runs-list errors shown.
