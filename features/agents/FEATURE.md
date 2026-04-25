# FEATURE.md — `agents`

**Status:** `migrating` (active rebuild — see `features/agents/migration/`)
**Tier:** `1` — core of the product
**Last updated:** `2026-04-22`

> This file is the **entry point** for the agents system. The system is large enough that it has its own `docs/` subdirectory with sub-feature docs. Start here, then jump to the relevant sub-doc.

---

## Purpose

Agents are autonomous AI specialists. The AI Matrx Harness turns a raw model into one by providing persistent context, tool execution, orchestration, and multi-surface invocation. Everything in the product that does AI work is ultimately an agent invocation — Chat, Runner, Shortcuts, Agent Apps, Builder.

---

## The mental model in one page

The system runs in three stages with three consumer surfaces:

1. **Build** — `Agent Builder` (`/agents/[id]/build`) — engineers craft identity, instructions, model, settings, tools, variables, context slots. Every save creates a new version.
2. **Test** — `Agent Runner` (`/agents/[id]/run`) — same runtime as Chat with observability on; can pin any past version.
3. **Consume** — `Chat` (user conversations), `Agent Shortcuts` (click-to-fire invocations with auto-mapped variables), `Agent Apps` (custom UIs for workflows).

### Two invocation payloads — the key distinction

| Surface | Endpoint on first turn | Payload includes | Why |
|---|---|---|---|
| **Builder** | `POST /prompts` | **Full agent definition** (system prompt, model, settings, tools, variables) | Cache-independent raw test — builder must see exactly what the server will run, no hidden state |
| **Runner / Chat / Shortcut / App** | `POST /ai/agents/{id}` | **Agent ID + form values** (variables, context, user input) | Server owns the agent definition; client sends only what changes per call |

After the first turn, everything collapses to `POST /ai/conversations/{conversationId}` (or `POST /ai/chat` for ephemeral). See **AGENT_INVOCATION_LIFECYCLE.md**.

### Variables vs. context slots

- **Variables** are required inputs — missing them leaves the agent confused. Bound by name from `invocation.inputs.variables`.
- **Context slots** are optional, auto-filled from ambient sources (user profile, org, active project, scope mappings). Their absence is graceful.
- **Everything else** is fetched on demand via tool call, not injection.

### Versioning

Every Builder save = new `agent_definition` version. Runner + Chat default to the current pointer. **Shortcuts and Apps pin to a specific version** so embeds never break when the agent evolves. Drift is surfaced in the UI; engineers update on demand. See **AGENT_VERSIONING.md**.

---

## Entry points

**Routes**
- `app/(authenticated)/agents/[id]/build/page.tsx` — Builder
- `app/(authenticated)/agents/[id]/run/page.tsx` — Runner
- `app/(authenticated)/chat/...` — Chat (🚧 not yet built; legacy at `features/cx-conversation/` + `features/cx-chat/`, deprecated stub at `app/(authenticated)/deprecated/chat/`)
- `app/(authenticated)/ai/agents/[id]/connections` — tool/integration config
- `app/(authenticated)/ai/shortcuts/` — shortcut admin

**API endpoints**
- `POST /ai/agents/{id}` — first turn of a new conversation (agent mode)
- `POST /ai/conversations/{conversationId}` — subsequent turns
- `POST /ai/chat` — ephemeral turns (no DB persistence)
- `POST /prompts` — Builder-mode raw request
- `POST /ai/conversations/{id}/tool_results` — durable + widget tool result submission

**Key thunks** (`features/agents/redux/execution-system/thunks/`)
- `launch-conversation.thunk.ts` — single entry point every surface hands a `ConversationInvocation` to
- `launch-agent-execution.thunk.ts` — low-level launch delegate
- `execute-instance.thunk.ts` — body assembly, fetch, stream parsing (agent mode)
- `execute-chat-instance.thunk.ts` — same but for ephemeral/chat mode
- `resume-conversation.ts` — rehydrate after refresh
- `submit-tool-results.ts` — durable tool call result submission

**Services**
- `features/agents/services/mcp.service.ts` — MCP protocol integration (see `features/api-integrations/FEATURE.md`)
- `features/agents/services/mcp-client/` — MCP client
- `features/agents/services/mcp-oauth/` — MCP OAuth flow

---

## Data model (Redux — four layers)

All state lives under `features/agents/redux/`. The four layers:

### Layer 1 — Agent Source (static definitions)

| Redux key | Slice | Role |
|---|---|---|
| `agentDefinition` | `agent-definition/` | Master registry — live + version snapshots, per-record fetch status, dirty tracking, field-level undo |
| `agentShortcut` | `agent-shortcuts/` | Stored launch buttons — agentId + scope mappings + display config |
| `agentConsumers` | `agent-consumers/` | Per-UI filter/sort/search state for list views |

### Layer 2 — App Context (external)

| Redux key | Location | Role |
|---|---|---|
| `appContext` | `lib/redux/slices/appContextSlice.ts` | Global scope: org, workspace, project, task IDs. Injected by `assembleRequest()`. |

### Layer 3 — Execution Instances (10 slices, `byInstanceId`)

Ephemeral runtime state. Core invariant: **`agentId` is read exactly ONCE — at instance creation.** After that the instance owns its data; if the definition changes mid-run the instance doesn't notice.

| Redux key | In API body? | Owns |
|---|:-:|---|
| `executionInstances` | No | Shell: agentId, origin, status lifecycle |
| `instanceModelOverrides` | Yes (`config_overrides`) | Model settings snapshot + user deltas |
| `instanceVariableValues` | Yes (`variables`) | Variable defs + resolved values (defaults → scope → user) |
| `instanceResources` | Yes (merged into `user_input`) | Attached files/content with status |
| `instanceContext` | Yes (`context`) | Context slot matches + ad-hoc entries |
| `instanceUserInput` | Yes (`user_input`) | Text + multimodal content blocks |
| `instanceClientTools` | Yes (`client_tools`) | Client-side tool IDs registered for this instance |
| `instanceUIState` | **No** | Display mode, panels, modals, visual state |
| `instanceConversationHistory` | No (server owns it) | Turn history, conversation mode, server conversation ID |
| `activeRequests` | No | Per-request stream state (chunks, status, content blocks, tool lifecycle) |

### Layer 4 — Thunks + aggregate selectors

See `features/agents/redux/execution-system/` and `selectors/aggregate.selectors.ts`.

---

## Sub-feature docs (read these for detail)

### New in this doc pass
- [`docs/AGENT_BUILDER.md`](./docs/AGENT_BUILDER.md) — authoring surface; ships full definition; cache-independent
- [`docs/AGENT_RUNNER.md`](./docs/AGENT_RUNNER.md) — observability-on test track; ID-only invocation
- [`docs/AGENT_VERSIONING.md`](./docs/AGENT_VERSIONING.md) — version semantics + pin-by-version for Shortcuts/Apps
- [`docs/AGENT_INVOCATION_LIFECYCLE.md`](./docs/AGENT_INVOCATION_LIFECYCLE.md) — endpoint routing, Builder vs Runner payloads, ephemeral branch
- [`docs/AGENT_ORCHESTRATION.md`](./docs/AGENT_ORCHESTRATION.md) — maxIterations, retries, self-correction, state persistence
- [`docs/STREAMING_SYSTEM.md`](./docs/STREAMING_SYSTEM.md) — canonical NDJSON streaming contract (anchor for the whole app)

### Existing (refresh as needed when editing)
- [`docs/AGENTS_OVERVIEW.MD`](./docs/AGENTS_OVERVIEW.MD) — four-layer architecture deep dive
- [`agent-system-mental-model.md`](./agent-system-mental-model.md) — long-form mental model
- [`docs/agent-rpcs-reference.md`](./docs/agent-rpcs-reference.md) — RPC surface (with `new-rpcs.md`)
- [`docs/STREAM_STATUS_LIFECYCLE.md`](./docs/STREAM_STATUS_LIFECYCLE.md) — stream event types + phases
- [`docs/DURABLE_TOOL_CALLS_CLIENT_INTEGRATION.md`](./docs/DURABLE_TOOL_CALLS_CLIENT_INTEGRATION.md) — durable tools contract
- [`docs/WIDGET_HANDLE_SYSTEM.md`](./docs/WIDGET_HANDLE_SYSTEM.md) — widget handle + client tools
- [`docs/WIDGET_HANDLE_AND_CLIENT_TOOLS-STATE.md`](./docs/WIDGET_HANDLE_AND_CLIENT_TOOLS-STATE.md) — state integration
- [`docs/agent-undo-redo.md`](./docs/agent-undo-redo.md) — field-level undo
- [`docs/agents-migration-status.md`](./docs/agents-migration-status.md) — live migration status
- [`conversation-invocation-reference.md`](./conversation-invocation-reference.md) — `ConversationInvocation` shape
- [`ROADMAP-agent-ecosystem-rebuild.md`](./ROADMAP-agent-ecosystem-rebuild.md) — roadmap

---

## Invariants & gotchas

- **`agentId` is read once at instance creation.** Do not re-read during execution. If the agent definition changes mid-run, the instance must not notice.
- **Builder and Runner are not the same payload shape.** Builder ships the full definition; Runner ships only the ID. If you add a field to the agent definition, both paths must be updated — Runner needs server-side handling, Builder needs client-side bundling.
- **Shortcuts and Apps pin to version.** `useLatest: false` + `agentVersionId` is the frozen case. Breaking the version contract breaks every embedded invocation silently.
- **The stream is never paused for widget tools.** Fast + fire-and-forget. Non-widget delegated tools do pause.
- **Ephemeral conversations cannot call `/ai/conversations/{id}` on turn 2** — they must call `/ai/chat` with full accumulated history (there is no DB row to target).
- **Client never sees the system prompt or instructions.** Those are server-owned engineer secrets. The client only gets variable + context slot definitions on agent load.
- **Drift between a pinned Shortcut/App version and the live agent is surfaced in the UI, never auto-resolved.**

---

## Related features

- **Depends on:** `features/agent-context/` + `features/brokers/` (variable/context resolution), `features/api-integrations/` (MCP + external tools), `features/artifacts/` (rendering output), `features/tool-call-visualization/` (tool UI)
- **Depended on by:** `features/agent-shortcuts/`, `features/agent-apps/`, `features/conversation/`, almost every user-facing surface
- **Cross-links:** `features/agents/migration/MASTER-PLAN.md`, `features/scope-system/FEATURE.md`

---

## Current work / migration state

Active rebuild governed by `features/agents/migration/MASTER-PLAN.md`. Phase-ordered plan (20 phases). Key context:

- Legacy prompts stack is still wired in some places — do not extend it. See `migration/INVENTORY.md` for the legacy ↔ agent map.
- Phases 16–19 are deletion phases; run last.
- RTK only for new state; extend `features/agents/redux/**`, never create parallel local state.
- Multi-scope (admin/user/org) from day one — Shortcuts, categories, content blocks must all support it.

---

## Change log

- `2026-04-24` — claude: message-level UX overhaul on the runner — fork outcome toast (Go to new branch / Stay here), Edit & Resubmit dialog (Fork vs Overwrite, both auto-submit), per-message Delete dialog (Delete here / Fork without this message, with cascade warning for attached tool calls), and inline Retry button on failed assistant turns. Built on a new central surfaces registry (`features/agents/redux/surfaces/`) so action bars stay surface-agnostic — page consumers register `kind: 'page'` and get a 5-line pendingNavigation effect; window/widget consumers register without one and react to focus updates as before. New thunks (`deleteMessage`, `overwriteAndResend`, `atomicRetry`) are stable; they fall back to per-message soft-delete when the atomic Python RPC `cx_truncate_conversation_after` isn't deployed yet. Python team work captured in [`docs/PYTHON_RESUME_SPEC.md`](./docs/PYTHON_RESUME_SPEC.md). Other consumers (chat, build, AgentRunWindow, widgets) get the new dialogs automatically once they pass `surfaceKey` through `AgentConversationDisplay` and register their surface — separate PR.
- `2026-04-22` — claude: initial FEATURE.md umbrella + new sub-docs (BUILDER, RUNNER, VERSIONING, INVOCATION_LIFECYCLE, ORCHESTRATION, STREAMING_SYSTEM).
- `2026-04-22` — claude: admin surface for system (builtin) agents lives at `app/(authenticated)/(admin-auth)/administration/system-agents/agents/`. Reuses `AgentBuilderPage`, `AgentRunnerPage`, and `AgentCard` from the user-side `(a)/agents/` routes via new `basePath` / `backHref` props on `AgentHeader`, `AgentModeController`, `AgentRunHeader`, `AgentCard`, `AgentListItem`. The admin shell (`ClientAdminLayout`) suppresses its ModuleHeader on builder/runner detail routes so these pages can own the top strip. `SystemAgentsGrid` is a simpler admin-only grid that reads `selectBuiltinAgents` directly. System agent creation goes through `createSystemAgentFromSeed` server action (admin-gated, writes via `createAdminClient` with all scope columns null).

---

> **Keep-docs-live rule:** after any substantive change to agents — especially to thunks, slice shapes, invocation payloads, or stream event types — update this file, the specific sub-doc it touches, and the Change log. A broken mental model cascades across every parallel agent working on top of it.
