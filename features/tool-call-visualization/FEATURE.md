# FEATURE.md — `tool-call-visualization`

**Status:** `scaffolded — fragmented across multiple locations; consolidation pending`
**Tier:** `1` — tools are first-class product surface, not auxiliary output
**Last updated:** `2026-04-22`

> **This is a placeholder-with-map.** No real code lives here yet. The point of this file is to prevent future agents from creating a sixth or seventh home for tool-call visualization code while consolidation is being planned. Before touching any tool-viz code, read the fragmentation map below and extend what's already there — do not start a new renderer location.

---

## Purpose

Tool call visualization is how the product turns raw tool invocations (inputs, streamed progress, outputs, errors) into purpose-built UI — custom per-tool component code, often stored in the database, dynamically compiled, and rendered as inline cards or modal overlays during and after stream events.

The UX goal is that every tool is a first-class citizen: a web-research call renders as a research panel, an SEO check renders as a pass/fail matrix, a news fetch renders as article tiles — never a raw JSON dump. The UI appears as the stream is still running (progressive) and persists afterwards (same renderer, served from conversation history).

---

## Current fragmentation (the map)

Tool-call visualization code currently lives in **at least six distinct locations**. Consolidation is pending; until then, this is the authoritative inventory of where to look.

### 1. Canonical static + dynamic renderer registry — `lib/tool-renderers/`

The main registry. Resolution order: static registry → dynamic DB cache → DynamicInlineRenderer/DynamicOverlayRenderer (fetch-on-mount) → GenericRenderer fallback.

- `lib/tool-renderers/registry.tsx` — `toolRendererRegistry`, `getInlineRenderer`, `getOverlayRenderer`, `hasCustomRenderer`, `mightHaveDynamicRenderer`, `shouldKeepExpandedOnStream`, `getToolDisplayName`, `getResultsLabel`, `getHeaderSubtitle`, `getHeaderExtras`, `registerToolRenderer`
- `lib/tool-renderers/types.ts` — `ToolRendererProps`, `ToolRenderer`, `ToolRegistry`, `getToolNameFromUpdates`
- `lib/tool-renderers/GenericRenderer.tsx` — unknown-tool fallback
- `lib/tool-renderers/index.ts` — barrel
- `lib/tool-renderers/README.md` — full authoring guide (inline/overlay contract, tab system, blue-gradient header, props)

Built-in per-tool renderers (static):
- `lib/tool-renderers/brave-search/`
- `lib/tool-renderers/news-api/`
- `lib/tool-renderers/seo-meta-tags/`, `seo-meta-titles/`, `seo-meta-descriptions/`
- `lib/tool-renderers/web-research/`
- `lib/tool-renderers/core-web-search/`
- `lib/tool-renderers/deep-research/`
- `lib/tool-renderers/get-user-lists/`

### 2. Dynamic (DB-stored) component pipeline — `lib/tool-renderers/dynamic/`

Babel-transforms TSX stored in `tool_ui_components` at runtime via `new Function()` with allowlisted imports. Mirrors the prompt-apps security model.

- `lib/tool-renderers/dynamic/index.ts` — barrel (`DynamicInlineRenderer`, `DynamicOverlayRenderer`, `usePrefetchToolRenderer`, `fetchAndCompileRenderer`, `prefetchRenderer`, `refreshRenderer`, cache helpers, incident reporter)
- `lib/tool-renderers/dynamic/types.ts` — `ToolUiComponentRow`, `ToolUiIncidentRow`, `CompiledToolRenderer`, `DynamicRendererProps`, `ComponentSlot`, `IncidentErrorType`
- `lib/tool-renderers/dynamic/fetcher.ts` — Supabase fetch → compile → cache, with in-flight dedup and negative cache
- `lib/tool-renderers/dynamic/compiler.ts` — Babel transform + scoped `new Function()` execution
- `lib/tool-renderers/dynamic/allowed-imports.ts` — import allowlist
- `lib/tool-renderers/dynamic/cache.ts` — in-memory TTL cache + negative-lookup tracking
- `lib/tool-renderers/dynamic/DynamicToolRenderer.tsx` — React wrappers
- `lib/tool-renderers/dynamic/DynamicToolErrorBoundary.tsx` — runtime error containment
- `lib/tool-renderers/dynamic/incident-reporter.ts` — writes to `tool_ui_incidents`

### 3. Container / visualization shells (multiple, overlapping)

Several components group `ToolCallObject[]` by call id and drive renderer lookup; duplication here is the single biggest consolidation target.

- `features/chat/components/response/assistant-message/stream/ToolCallVisualization.tsx` — chat's grouping + inline + "View all" overlay trigger (primary)
- `features/chat/components/response/assistant-message/stream/ChatStreamDisplay.tsx` — the parent that owns the stream
- `features/cx-conversation/ToolCallVisualization.tsx` — legacy cx equivalent (still referenced by agent-run + chat-markdown handlers)
- `features/chat/components/response/tool-updates/ToolUpdatesOverlay.tsx` — full-screen modal, one tab per tool call, blue gradient header, toggle between Results and Input views
- `features/chat/components/response/tool-updates/stepDataRegistry.tsx` — step-data specific renderer registry
- `features/chat/components/response/tool-renderers/*` — **deprecated re-export** back to `lib/tool-renderers/*` (kept for back-compat; do not add new code here)
- `components/mardown-display/chat-markdown/RequestToolVisualization.tsx` — chat-markdown's own tool-viz entry
- `components/mardown-display/chat-markdown/internal-handlers/ToolHandlers.tsx` — markdown-embedded tool handler
- `components/mardown-display/chat-markdown/EnhancedChatMarkdown.tsx` / `StreamAwareChatMarkdown.tsx` — callers

### 4. Agent-runner tool display — `features/agents/components/run/`

Bridges `toolLifecycle` (agent execution system) into the renderer registry by converting `ToolLifecycleEntry` → `ToolCallObject[]`.

- `features/agents/components/run/AgentToolDisplay.tsx` — subscribes to `selectAllToolLifecycles`, delegates to `ToolCallVisualization`
- `features/agents/components/run/ToolCallCard.tsx` — single-tool variant
- `features/agents/components/run/InlineToolCalls.tsx` — orders tool calls by call id

### 5. Tool definition / admin CRUD — `features/agents/components/tools-management/` + `components/admin/`

Tool rows (server-side tools, widget tools) and their UI component code.

- `features/agents/components/tools-management/AgentToolsManager.tsx` — agent-side tool attachment UI
- `features/agents/components/tools-management/AgentToolsModal.tsx`
- `features/agents/components/tools-management/CLIENT_SIDE_TOOLS.md` — full client-delegated tools contract
- `features/agents/components/tools-management/WIDGET_TOOLS_SEED.sql` — seed for the 10 canonical `widget_*` tools
- `features/agents/components/tools-management/MCP-RESEARCH.md`, `mcp-server-architecture-guide.md`
- `features/agents/redux/tools/tools.slice.ts`, `tools.selectors.ts`, `tools.thunks.ts` — Redux over `public.tools`
- `utils/supabase/tools-service.ts` — `DatabaseTool` = `public.tools.Row`
- `components/admin/McpToolsManager.tsx` — admin shell
- `components/admin/ToolUiComponentGenerator.tsx` — AI component generator (calls builtin agent `tool-ui-component-generator`)
- `components/admin/ToolUiComponentEditor.tsx` — manual editor for cloud-stored UI code
- `components/admin/ToolUiIncidentViewer.tsx`, `ToolTestSamplesViewer.tsx`
- `components/admin/tool-ui-generator-prompt.ts`
- `components/admin/mcp-tools/ToolCreatePage.tsx`, `ToolEditPage.tsx`, `ToolViewPage.tsx`, `ToolUiPage.tsx`, `ToolIncidentsPage.tsx`, `ToolComponentPreview.tsx`
- `app/(authenticated)/(admin-auth)/administration/mcp-tools/` — admin routes (`/new`, `/[toolId]`)
- `app/api/tools/`, `app/api/admin/tools/`, `app/api/tool-ui-components/`, `app/api/admin/tool-ui-components/`, `app/api/admin/tool-ui-incidents/` — REST endpoints
- `app/(public)/demos/api-tests/tool-testing/` — test harness including `components/ToolRendererPreview.tsx` and `utils/stream-processing-beta/build-tool-call-objects.ts`

### 6. Stream routing — `features/agents/redux/execution-system/`

Where `tool_event` NDJSON events are parsed, written to Redux, and dispatched to widget handles.

- `features/agents/redux/execution-system/thunks/process-stream.ts` — parses every stream event (`tool_event`, `tool_delegated`, `content_block`, etc.); builds `toolLifecycle` keyed by `callId` on `activeRequests`
- `features/agents/redux/execution-system/thunks/dispatch-widget-action.thunk.ts` — routes `widget_*` tool_delegated events to registered widget handles
- `features/agents/redux/execution-system/active-requests/active-requests.slice.ts` — owns `toolLifecycle` per request
- `features/agents/redux/execution-system/active-requests/active-requests.selectors.ts` — `selectToolLifecycle`, `selectAllToolLifecycles`, `selectToolCallIdsInOrder`
- `features/agents/api/submit-tool-results.ts` — client→server result POST (batched via microtask)
- `features/agents/api/resume-conversation.ts`, `fetch-pending-calls.ts` — durable tool call continuation
- `features/agents/hooks/useWidgetHandle.ts`, `hooks/useConversationPendingCalls.ts`
- `features/agents/types/widget-handle.types.ts`, `types/request.types.ts` (`ToolLifecycleEntry`)
- `lib/api/tool-call.types.ts` — `ToolCallObject`, `ToolCallPhase` (the wire shape every renderer consumes)
- `lib/redux/socket-io/socket.types.ts` — legacy `ToolCallObject` (alternate source)

---

## Core concepts (regardless of where they currently live)

### Tool registry

A tool has two halves:
- **Definition** — row in `public.tools` (name, schema, category, annotations, tags). Managed by the admin MCP Tools Manager. Seeded for widget tools via `WIDGET_TOOLS_SEED.sql`.
- **UI** — a renderer that turns `ToolCallObject[]` into pixels. Statically registered in `lib/tool-renderers/registry.tsx` OR stored in `tool_ui_components` for runtime compilation.

The resolution order (`getInlineRenderer` / `getOverlayRenderer`):
1. Static registry (bundled code)
2. Dynamic cache hit (already compiled)
3. `DynamicInlineRenderer` / `DynamicOverlayRenderer` (fetch + compile on mount)
4. `GenericRenderer` fallback

### DB-stored UI code pipeline

1. Admin authors code in `ToolUiComponentEditor` or via the AI generator builtin agent.
2. Row lands in `tool_ui_components` (active, versioned).
3. Client runtime: `fetchAndCompileRenderer(toolName)` pulls the row, runs Babel to strip JSX/TS, executes via `new Function()` bound to an **allowlisted import scope**.
4. Result: a `CompiledToolRenderer` with `InlineComponent`, `OverlayComponent`, `getHeaderExtras`, `getHeaderSubtitle`.
5. Cached in memory with TTL and negative-lookup tracking. `DynamicToolErrorBoundary` catches runtime errors → `tool_ui_incidents`.

This mirrors the prompt-apps Babel-transform model; the security invariants are the same.

### Stream-driven rendering

NDJSON `tool_event` events arrive via `process-stream.ts` → build `toolLifecycle[callId]` on `activeRequests[requestId]`. Multiple visualization shells subscribe to selectors over that state and convert lifecycle entries into the `ToolCallObject[]` shape the registry expects.

`prefetchRenderer(toolName)` is called as soon as the first `mcp_input` event arrives so the DB-stored component is compiled and cached before the first render — hiding compile latency under existing network time.

### Three tool kinds

Cross-reference `features/agents/docs/`.

1. **Server-side tools** — the server executes, streams inputs/progress/outputs; client renders only. (`STREAMING_SYSTEM.md`.)
2. **Durable client-delegated tools** — server emits `tool_delegated`, the stream pauses, client executes, client POSTs to `/tool_results`, server resumes. Survives laptop-close via the `cx_tool_call` ledger with 7-day expiry. (`DURABLE_TOOL_CALLS_CLIENT_INTEGRATION.md`.)
3. **Widget tools** — the `widget_*` family. Stream does **not** pause; `dispatchWidgetAction.thunk.ts` routes to the registered `WidgetHandle` method, results are microtask-batched into one POST per conversation. (`WIDGET_HANDLE_SYSTEM.md`.)

### Lifecycle

```
pending (input known, execution not started)
 → streaming (mcp_input + 0..N step_data / user_message / content_block chunks)
 → complete (mcp_output) OR error (mcp_error)
 → persisted (post-stream, served from conversation history)
```

Inline renderers progressively reveal updates via `currentIndex`. Overlay renderers (modal) receive the whole group and typically add filtering, sorting, export. `keepExpandedOnStream` controls whether the card collapses when assistant text starts streaming after tool completion. Same renderer serves live and historical views — state is the only difference.

---

## Migration target — what should live in this directory

When consolidation runs, `features/tool-call-visualization/` should own:

- **Registry + resolution** — move `lib/tool-renderers/registry.tsx`, `types.ts`, `GenericRenderer.tsx` to `features/tool-call-visualization/registry/`
- **Dynamic pipeline** — move `lib/tool-renderers/dynamic/**` to `features/tool-call-visualization/dynamic/` (Babel compiler, fetcher, cache, allowlist, error boundary, incident reporter)
- **Built-in static renderers** — move the per-tool directories under `features/tool-call-visualization/renderers/`
- **Visualization shells** — single canonical `ToolCallVisualization` + `ToolUpdatesOverlay` + step-data registry. Replaces all five duplicated shells listed in §3.
- **Stream routing surface** — move or re-export `ToolLifecycleEntry` conversion helpers here; the state itself stays on `activeRequests` (don't fragment state)
- **Widget + durable integration glue** — thin adapters living here, real execution staying in `features/agents/redux/execution-system/`
- **DB schema owner** — `tool_ui_components` and `tool_ui_incidents` (`types/database.types.ts` is already generated); SQL migrations move here
- **Admin UI code** — keep admin routes in `app/(authenticated)/(admin-auth)/administration/mcp-tools/` but move the implementation from `components/admin/mcp-tools/*`, `McpToolsManager.tsx`, `ToolUiComponentEditor.tsx`, `ToolUiComponentGenerator.tsx` into this feature
- **`FEATURE.md` upgrade** — replace this placeholder with real flows, selectors, slice shapes

The consolidation must leave deprecated re-export shims at the old paths (as `features/chat/components/response/tool-renderers/registry.tsx` and `features/cx-conversation/ToolCallVisualization.tsx` already demonstrate) so in-flight branches don't break.

---

## Invariants

- **Safety of DB-stored UI code is non-negotiable.** Import allowlisting (`allowed-imports.ts`) + Babel transform + `new Function()` scoped scope + `DynamicToolErrorBoundary` + `tool_ui_incidents` logging. Mirror the prompt-apps security model; do not loosen it when consolidating.
- **Renderers must be stream-aware.** An inline component receives partial `ToolCallObject[]` and can be re-rendered many times per second. Handle "mcp_output missing" gracefully; never assume completion.
- **Same tool, same renderer — everywhere.** Chat, Runner, Shortcut result cards, Agent App canvases must route through the same `getInlineRenderer` / `getOverlayRenderer` resolution. If you find a surface building its own rendering path, that's a bug, not a feature.
- **Registry keys are exact tool names.** The `mcp_input.name` (or `ToolLifecycleEntry.toolName`) string IS the registry key. No normalization, no fuzzy matching.
- **`broker` stream events are frozen** (per `STREAMING_SYSTEM.md`). New tool signals go through `tool_event` / `content_block` / `data`, not `broker`.
- **Widget tools never pause the stream.** Non-widget delegated tools always do. The distinction is enforced in `process-stream.ts` + `dispatchWidgetAction.thunk.ts` — preserve it across consolidation.
- **`prefetchRenderer` is fire-and-forget and idempotent.** Call it eagerly on first `mcp_input`; never await it in render paths.
- **Negative cache must be respected.** `isKnownNoDynamic(toolName)` short-circuits compile attempts; consolidation must not accidentally invalidate it on every render.

---

## Related features

- **Depends on:** `features/agents/` (execution system + stream parser owns the `toolLifecycle` state), `features/agents/redux/tools/` (tool definitions), `features/api-integrations/` (MCP servers + remote tools)
- **Depended on by:** `features/chat/`, `features/conversation/`, `features/cx-conversation/`, `features/public-chat/`, `features/agents/components/run/*`, `features/agent-apps/`, `features/prompt-apps/` (legacy), every surface that displays an assistant message
- **Cross-links:**
  - `features/agents/FEATURE.md`
  - `features/agents/docs/STREAMING_SYSTEM.md`
  - `features/agents/docs/WIDGET_HANDLE_SYSTEM.md`
  - `features/agents/docs/DURABLE_TOOL_CALLS_CLIENT_INTEGRATION.md`
  - `features/agents/components/tools-management/CLIENT_SIDE_TOOLS.md`
  - `features/artifacts/FEATURE.md` (forthcoming) — adjacent "render structured output" system; both should share the Babel/allowlist plumbing after consolidation

---

## Current work / migration state

No migration phase yet. This directory is a **placeholder reservation** so the first consolidation pass has a defined target. Before that pass:

1. Do not add new tool-viz homes. Extend `lib/tool-renderers/` (static + dynamic), `features/chat/components/response/assistant-message/stream/ToolCallVisualization.tsx` (the primary shell), or `features/agents/components/run/AgentToolDisplay.tsx` (runner bridge) — whichever matches the surface you're working on.
2. When adding a new renderer, prefer the **dynamic (DB-stored) path** over hard-coding in `registry.tsx`. Use the admin MCP Tools Manager "Generate UI" flow.
3. When discovering a new tool-viz surface the map above missed, update this file's fragmentation list in the same PR.
4. When consolidation begins, the first phase is inventory verification against §§1–6 above; the second is shim-forward moves (destination first, legacy re-exports second); deletions come last.

---

## Change log

- `2026-04-22` — claude: placeholder doc establishing a home; consolidation migration pending.

---

> **Keep-docs-live rule (CLAUDE.md):** every time a tool-viz surface is added, moved, or deleted, update the fragmentation map in §Current fragmentation and append to the change log in the same PR. The value of this doc is entirely in its accuracy as a map — a stale map actively misleads future agents into creating a seventh home.
