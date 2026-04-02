---
name: agent-execution-redux
description: >
  State management architecture for the AI agent execution system. Covers the four-layer
  Redux structure (agent source, app context, execution instances, request lifecycle),
  slice ownership, body assembly, NDJSON streaming, and the rules for extending instance
  slices. Use when working on any file in features/agents/redux/, building agent UI components,
  creating execution instances, wiring selectors for agent state, or adding new per-instance
  capabilities. Triggers on: instanceId, agentDefinition, executionInstances, instanceUIState,
  instanceModelOverrides, instanceVariableValues, instanceResources, instanceContext,
  instanceUserInput, instanceClientTools, activeRequests, instanceConversationHistory,
  assembleRequest, executeInstance, createManualInstance, createInstanceFromShortcut.
---

# Agent Execution Redux — State Management

## Architecture

Four strict layers. Every slice, selector, and thunk belongs to exactly one.

### Layer 1 — Agent Source (`features/agents/redux/`)

Static definitions. What agents and shortcuts exist.

| Redux Key | Directory | Owns |
|-----------|-----------|------|
| `agentDefinition` | `agent-definition/` | All agent records (live + version snapshots). Dirty tracking, field-level undo, progressive fetch status, access metadata. |
| `agentShortcut` | `agent-shortcuts/` | Pre-configured launch configs: agentId + scope mappings + display prefs + variable overrides. |
| `agentConsumers` | `agent-consumers/` | Per-UI-instance filter/sort/search for agent list views. Multiple consumers browse independently. |

### Layer 2 — App Context (`lib/redux/slices/appContextSlice.ts`)

| Redux Key | Owns |
|-----------|------|
| `appContext` | Org, workspace, project, task IDs. Injected into every API call by `assembleRequest()`. |

### Layer 3 — Execution Instances (10 slices under `execution-system/`)

Ephemeral runtime state. Each instance is self-contained.

**Core invariant: `agentId` is read exactly ONCE at instance creation. After that, the instance owns all its data. The agent definition can change or be deleted — the running instance is unaffected.**

All 10 slices use `byInstanceId: Record<string, T>`.

| Redux Key | Sent to API? | What it owns |
|-----------|:------------:|-------------|
| `executionInstances` | No | Shell: agentId, origin, status (`draft → ready → running → streaming → paused → complete → error`) |
| `instanceModelOverrides` | `config_overrides` | Base LLM settings snapshot + user deltas (only deltas sent) |
| `instanceVariableValues` | `variables` | Definitions snapshot + three-tier resolution: defaults → scope → user |
| `instanceResources` | merged into `user_input` | Attached files/content with status tracking |
| `instanceContext` | `context` | Slot-matched + ad-hoc context entries |
| `instanceUserInput` | `user_input` | Text + multimodal content blocks |
| `instanceClientTools` | `client_tools` | Client-side tool IDs |
| `instanceUIState` | **Never** | Display mode, panels, variable focus, creator flags — purely visual |
| `instanceConversationHistory` | No | Turn history, conversation mode, server conversation ID |
| `activeRequests` | No | Per-request stream state: accumulated text, data payloads, pending tool calls, client metrics |

### Layer 4 — Thunks + Cross-Cutting Selectors

| File | Role |
|------|------|
| `thunks/create-instance.thunk.ts` | Instance factory. 5 creation paths. Reads agent once, dispatches `init*` to all 10 slices. |
| `thunks/execute-instance.thunk.ts` | Convergence point. `assembleRequest()` reads all instance slices → fetch → NDJSON stream → dispatches to `activeRequests` + `instanceConversationHistory`. |
| `selectors/aggregate.selectors.ts` | Cross-cutting: instanceId → latest request → derived state (executing, streaming, text, errors, tools). |

---

## Execution Flow

```
createManualInstance(agentId)
  ├── readAgentSnapshot() — reads agentDefinition ONCE
  ├── createInstance() — shell in executionInstances
  └── init* dispatches to all 10 sibling slices
       │
       ▼
executeInstance(instanceId)
  ├── assembleRequest(state, instanceId)
  │     reads: instanceUserInput, instanceResources,
  │            instanceVariableValues, instanceModelOverrides,
  │            instanceContext, instanceClientTools, appContext
  │     → snake_case payload
  │
  ├── Routing: no conversationId → POST /api/ai/agents/{agentId}
  │            has conversationId → POST /api/ai/conversations/{id}
  │
  ├── addUserTurn → optimistic UI (message appears immediately)
  ├── createRequest → row in activeRequests
  │
  └── NDJSON stream loop:
        chunk        → appendChunk (accumulated text)
        tool_delegated → addPendingToolCall (instance pauses)
        completion   → stats captured
        error        → status "error"
        end          → commitAssistantTurn to conversation history
```

---

## Design Rules

**Snapshot isolation** — Instances never read back from `agentDefinition`. The creation thunk copies what it needs; execution only touches instance slices.

**Request ≠ Instance** — One instance, multiple requests (multi-turn). `activeRequests` keyed by `requestId`, reverse-indexed by `instanceId`. Components only know `instanceId` — aggregate selectors bridge.

**Cleanup** — `activeRequests`, `instanceConversationHistory`, and `instanceUIState` listen to `destroyInstance` via `extraReducers`. Other slices rely on the creation thunk for init and the shell for truth.

**Progressive fetch** — `AgentFetchStatus`: `list < execution < customExecution < full < versionSnapshot`. Never downgrades. `shouldUpgradeFetchStatus()` enforces this.

**Factory selectors** — `makeSelect*` creates per-component memoized instances. Use `useMemo(makeSelectFoo, [])` in components. See the `redux-selector-rules` skill for full selector guidelines.

---

## How to Extend This System

### Decision: where does new state belong?

| If the state describes... | It belongs in... |
|--------------------------|-----------------|
| How something is displayed (layout, panels, expanded, focus) | `instanceUIState` |
| What the user typed or attached | `instanceUserInput` / `instanceResources` |
| Agent config for this run (model, temperature, tokens) | `instanceModelOverrides` |
| Variable values for this run | `instanceVariableValues` |
| Contextual data sent to the agent | `instanceContext` / `instanceClientTools` |
| What happened during execution (stream, chunks, tools) | `activeRequests` |
| Conversation record (turns, mode) | `instanceConversationHistory` |
| Agent definition itself (permanent, not per-run) | `agentDefinition` |
| How a list of agents is filtered/sorted | `agentConsumers` |
| Pre-configured launch config | `agentShortcut` |

### Process

1. **Identify the slice.** Use the table above. If it's per-instance and ephemeral, it's Layer 3. If it's permanent agent data, it's Layer 1.

2. **Check what exists.** Read the slice file and its selectors. The capability often already exists.

3. **If it exists, wire into it.** Do not re-derive, re-fetch, or store locally.

4. **If it doesn't exist, extend the correct slice:**
   - Add the field to the interface (in the types file or inline).
   - Add a default in the `init*` action.
   - Add a setter action.
   - Add a selector (primitive → plain function; derived array/object → `createSelector`).
   - Export from the barrel `index.ts`.

5. **Verify the addition is general-purpose.** Any component, modal, panel, or shortcut should be able to use it — not just yours.

### What you must never do

- **Local state for shared concerns.** `useState` for something that belongs in a slice means other components can't see it and shortcuts can't configure it.
- **Parallel systems.** Don't build a new store because the existing one "doesn't have what I need yet." Extend it.
- **Shape hacks.** Don't force data into a shape that works for your component but breaks the contract.
- **Abandon architecture.** A missing piece is a cue to strengthen the system, not bypass it.

### Concrete example: adding variable display layout

**Scenario:** Multiple variable display components exist (form, stepper, stacked, minimal). You need to control which one renders for a given instance.

**Wrong:** `useState('form')` in the component.

**Right:**

1. This is per-instance display configuration → `instanceUIState`.
2. Check the slice: `expandedVariableId` exists (tracks focused variable), but no layout variant.
3. Extend:

```typescript
// In the InstanceUIState interface (types file):
variableDisplayLayout: "form" | "stepper" | "stacked" | "minimal";

// In initInstanceUIState action (slice):
variableDisplayLayout: action.payload.variableDisplayLayout ?? "form",

// New action:
setVariableDisplayLayout(state, action: PayloadAction<{
  instanceId: string;
  layout: "form" | "stepper" | "stacked" | "minimal";
}>) {
  const entry = state.byInstanceId[action.payload.instanceId];
  if (entry) entry.variableDisplayLayout = action.payload.layout;
},

// New selector:
export const selectVariableDisplayLayout =
  (instanceId: string) => (state: RootState) =>
    state.instanceUIState.byInstanceId[instanceId]?.variableDisplayLayout;
```

4. **What the whole system gains:**
   - Shortcuts can pre-select layout via `initInstanceUIState`.
   - `expandedVariableId` already controls focus — combine with layout for "open in stepper mode with this variable focused."
   - Every modal, panel, and chat-bubble gets this for free.

---

## Reference: Instance UI State

Current fields on `InstanceUIState` (source of truth: `features/agents/types/instance.types.ts`):

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `displayMode` | `ResultDisplayMode` | `"modal-full"` | Where/how the instance renders (modal-full, modal-compact, chat-bubble, inline, panel, toast) |
| `allowChat` | `boolean` | `true` | Whether multi-turn chat input is shown |
| `showVariablePanel` | `boolean` | `false` | Variable panel visibility |
| `isExpanded` | `boolean` | `true` | Collapsed/expanded state |
| `expandedVariableId` | `string \| null` | `null` | Which variable has an edit popover open |
| `isCreator` | `boolean` | `false` | Is current user the agent owner (snapshotted at creation) |
| `showCreatorDebug` | `boolean` | `false` | Show debug panels (request preview, provenance) |
| `submitOnEnter` | `boolean` | `true` | Enter submits vs Shift+Enter for newline |
| `autoClearConversation` | `boolean` | `false` | Wipe history between sends (builder/test mode) |
| `modeState` | `Record<string, unknown>` | `{}` | Arbitrary mode-specific state (scroll pos, active tab, etc.) |

Available actions: `initInstanceUIState`, `setDisplayMode`, `toggleExpanded`, `toggleVariablePanel`, `setAllowChat`, `updateModeState`, `setExpandedVariableId`, `toggleCreatorDebug`, `setSubmitOnEnter`, `setAutoClearConversation`.

For the full developer guide with pipeline details, see `features/agents/redux/AGENTS_OVERVIEW.MD`.
