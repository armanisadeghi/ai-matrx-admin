# Agent Execution System — Roadmap

> Single source of truth for building the agent display/execution pipeline.
> Every task must be completed correctly — no shortcuts, no fake code.
>
> **Terminology (corrected):**
> - ~~taskId~~ → `instanceId`
> - ~~runId~~ → `conversationId`
> - ~~runs~~ → `conversations` or `chats`
> - `OverlayController` → **Global component render controller** (overlays,
>   sidebars, headers, footers, menus, toasts, etc.). Name stays but scope
>   is broader than "overlays."

---

## Architecture (How It Must Work)

```
Card / Menu / Button / Any UI
  └─► dispatch(launchAgentExecution({ agentId, displayMode, ... }))
        ├─► Creates ExecutionInstance in Redux (with ALL settings persisted)
        ├─► Sets status to "ready" (selector picks it up)
        ├─► Registers callbacks via CallbackManager (inline callbacks, etc.)
        └─► OverlayController renders the correct AUTONOMOUS component

OverlayController (mounted globally)
  └─► selectOverlayInstancesByDisplayMode (excludes direct/background)
        ├─► "modal-full"      → <AgentRunnerModal instanceId={id} />
        ├─► "modal-compact"   → <AgentCompactModal instanceId={id} />
        ├─► "chat-bubble"     → <AgentChatBubble instanceId={id} />
        ├─► "inline"          → <AgentInlineOverlay instanceId={id} />
        ├─► "sidebar"         → <AgentSidebarRunner instanceId={id} />
        ├─► "flexible-panel"  → <AgentFlexiblePanel instanceId={id} />
        ├─► "panel"           → <AgentPanel instanceId={id} />
        └─► "toast"           → <AgentToast instanceId={id} />

Each component is FULLY AUTONOMOUS:
  - Receives only: instanceId (and onClose from OverlayController)
  - Reads ALL config from Redux selectors
  - Retrieves callbacks via CallbackManager when needed (inline replace, etc.)
  - Manages its own variable entry, input, execution, message display
  - Honors: autoRun, allowChat, showVariablePanel, showDefinitionMessages, etc.

Pre-execution interceptor pattern:
  Component mounts → reads selectNeedsPreExecutionInput(instanceId)
    If true AND not yet satisfied:
      → Render <AgentPreExecutionInput /> in place of main content
      → User submits → updates slice (preExecutionSatisfied = true)
      → Selector now returns false → main content renders
    If false:
      → Render main content (AgentRunner) directly
```

---

## Current State Assessment

### What Works
- Instance creation (3 paths: agent, shortcut, manual)
- Variable storage and scope mapping
- Context slot management (instance-context slice)
- Stream processing (V2 events → Redux)
- Conversation history tracking per instance
- Model override management
- Resource attachment system
- SmartAgentInput (reads/writes from Redux, dispatches execution)
- SmartAgentVariableInputs (reads variable definitions, allows editing)
- SmartAgentResourceChips / ResourcePickerButton
- AgentConversationDisplay (renders turn history + streaming message)
- Overlay selector (selectOverlayInstancesByDisplayMode)
- CallbackManager singleton (`utils/callbackManager.ts`) + React hook (`hooks/useCallbackManager.ts`)

### What's Missing or Broken

#### A. Missing Instance Settings (Redux Gaps)

**Philosophy: Fine-grained state, coarse-grained config.**
State fields are small and specific — one field controls one behavior.
Config actions (from shortcuts, launch options) can flip multiple state fields at once.
We never overload a single field to control unrelated behaviors.

| Setting | Stored in `InstanceUIState`? | Notes |
|---------|------------------------------|-------|
| `displayMode` | ✅ | |
| `allowChat` | ✅ | |
| `showVariablePanel` | ✅ | **KEEP AS-IS** — controls whether variable input panel renders |
| `autoRun` | ❌ **MISSING** | Used once in thunk, discarded. Components can't read it. |
| `showDefinitionMessages` | ❌ **MISSING** | Whether agent-definition turns (fabricated user messages) are visible at all. False = first N turns completely hidden. |
| `showDefinitionMessageContent` | ❌ **MISSING** | When definition messages ARE shown, whether the "secret" template portion is visible or only user-entered variables/resources/attachments render. |
| `usePreExecutionInput` | ❌ **MISSING** | Used once in thunk, discarded. |
| `preExecutionSatisfied` | ❌ **MISSING** | Tracks whether pre-exec input has been provided |
| `hiddenMessageCount` | ❌ **MISSING** | Number of agent-definition messages to hide (from RPC). Temp until backend sends per-message flags. |
| `callbackGroupId` | ❌ **MISSING** | CallbackManager group ID for this instance's lifecycle callbacks (inline replace, complete, etc.) |

**Config-to-state mapping examples (how launch options flip multiple fields):**
```
# From shortcut or launch options:
showVariables: false  →  showDefinitionMessages: false
                         showVariablePanel: false

showVariables: true   →  showDefinitionMessages: true
                         showDefinitionMessageContent: false   (default: hide template)
                         showVariablePanel: true

# Normal chat defaults:
                         showDefinitionMessages: true
                         showDefinitionMessageContent: false
                         showVariablePanel: true
```

These mappings happen in `launchAgentExecution` via a helper. Components never consume
a `showVariables` config — they read the 3 fine-grained state fields independently.

**`store` (persist to DB):** Already exists as `builderAdvancedSettings.store`. Sent to the API.
No new field needed, but we should surface a toggle in non-builder contexts too.

**`allowChat` / visibility fields not applied on the `agentId` path:**
`createManualInstance` doesn't accept these. `initInstanceUIState` only sets `showVariablePanel`
based on whether the agent has variables. Launch overrides are silently dropped for Path 1.

#### B. Missing Turn Visibility

`ConversationTurn` already has `isVisibleToUser` and `isVisibleToModel` (mirrored from `cx_message`).
Currently only set when loading from DB history.

For new turns created during execution:
- **Short-term (console warning):** Use `hiddenMessageCount` from `agx_get_defined_data` RPC.
  When `showDefinitionMessages` is false, hide the first N user turns where N = `definition_messages`.
- **Long-term:** Backend streams `is_visible_to_user` / `is_visible_to_model` per message.
  `commitAssistantTurn` / `addUserTurn` sets the flags. RPC call goes away.

#### C. Missing Components

| Component | Purpose | Old Prompt Equivalent | Status |
|-----------|---------|----------------------|--------|
| `AgentRunner` | Core: messages + variables + input + auto-run + pre-exec gate | `PromptRunner` | ❌ Not created |
| `AgentRunnerModal` | Dialog (desktop) / Drawer (mobile) wrapping AgentRunner | `PromptRunnerModal` | ❌ Not created |
| `AgentCompactModal` | Draggable compact with chat toggle | `PromptCompactModal` | ❌ Fake exists |
| `AgentSidebarRunner` | Right sheet, position/size configurable | `PromptSidebarRunner` | ❌ Fake exists |
| `AgentFlexiblePanel` | 4-edge resize, collapse, fullscreen | `PromptFlexiblePanel` (`MatrxDynamicPanel`) | ❌ Fake exists |
| `AgentPanel` | Narrower sheet variant | — | ❌ Fake exists |
| `AgentChatBubble` | Floating bubble with expand/minimize | — (agent-only) | ❌ Fake exists |
| `AgentInlineOverlay` | Positioned overlay with replace/insert callbacks | `PromptInlineOverlay` | ❌ Fake exists |
| `AgentToast` | Toast + expand to full view, markdown, tag stripping | `PromptToast` | ❌ Fake exists |
| `AgentPreExecutionInput` | Compact input overlay with countdown | `PreExecutionInputModalContainer` | ❌ Not created |
| `SmartAgentMessageList` | Message list respecting visibility flags | `SmartMessageList` | ❌ Not created |

#### D. Missing Selectors

| Selector | Purpose | Status |
|----------|---------|--------|
| `selectAutoRun(instanceId)` | Does this instance auto-execute? | ❌ (field not stored) |
| `selectShowDefinitionMessages(instanceId)` | Are definition turns visible? | ❌ (field not stored) |
| `selectShowDefinitionMessageContent(instanceId)` | Is template content visible in definition turns? | ❌ (field not stored) |
| `selectUsePreExecutionInput(instanceId)` | Show pre-exec input? | ❌ (field not stored) |
| `selectPreExecutionSatisfied(instanceId)` | Has pre-exec been completed? | ❌ (field not stored) |
| `selectNeedsPreExecutionInput(instanceId)` | Derived: usePreExec AND NOT satisfied | ❌ |
| `selectHiddenMessageCount(instanceId)` | N messages to hide from agent definition | ❌ |
| `selectShouldShowInput(instanceId)` | Derived: allowChat OR needs first input | ❌ |
| `selectInstanceTitle(instanceId)` | Display title (agent name or shortcut label) | ❌ |
| `selectCallbackGroupId(instanceId)` | CallbackManager group for this instance | ❌ |

#### E. Launch Pipeline Gaps (from gap analysis)

1. **`allowChat` / visibility fields dropped on Path 1 (agentId):** `createManualInstance` doesn't accept or forward these.
2. **`usePreExecutionInput` never consumed:** Exists on `LaunchAgentOptions` but never stored.
3. **`launchShortcut` omits `usePreExecutionInput`:** Hook doesn't forward it.
4. **`launchChat` omits most flags:** No visibility fields, `usePreExecutionInput`, inline callbacks.
5. **No resource attachments on launch:** `LaunchAgentOptions` has no `resources` field.
6. **Inline callbacks have no delivery mechanism:** `onTextReplace` / `onTextInsertBefore` / `onTextInsertAfter` exist in options but the overlay component can't access them.
7. **No CallbackManager integration:** Callbacks are not registered at launch time.

#### F. Shell Implementation Gaps (from gap analysis)

1. **No Drawer on mobile:** Agent modals use Dialog only — violates project mobile rules.
2. **No sidebar position/size from launch:** Hardcoded `position="right"`, `width="2xl"`.
3. **No shell titles:** Generic "Agent" strings, no selector for display title.
4. **No `displayVariant` (standard/compact):** Hardcoded in some shells.
5. **Toast has no markdown, no tag stripping, no expand-to-full.**
6. **Flexible panel uses fixed FloatingPanel, not 4-edge resize.**
7. **No canvas integration** (lower priority, future).
8. **No `onExecutionComplete` callback pattern** from overlay components.

---

## Callback Strategy

### The Problem
Overlay-managed components receive only `instanceId`. They cannot receive function callbacks
as props because they're rendered by the OverlayController, not by the calling code. But
several display modes need callbacks: inline needs replace/insert, toast needs expand,
completion handlers need to notify the host.

### The Solution: Two Layers

**Layer 1: Instance Context (Redux — serializable state)**
The instance-context slice already stores key-value pairs per instance. We use this for
data that the overlay component needs to read:
- `originalText` — the text being replaced (for inline)
- `selectionStart` / `selectionEnd` — cursor position (for code editor)
- `textBefore` / `textAfter` — surrounding text (for context menus)
- `fullContent` — full note/file content
- `currentPage` — page context

This is **already there** — instance-context entries support arbitrary keys with type inference.
Components read it via `selectInstanceContextEntries(instanceId)`.

**Layer 2: CallbackManager (non-Redux — function references)**
The existing `CallbackManager` singleton (`utils/callbackManager.ts`) stores actual function
references outside Redux. We integrate it into the launch pipeline:

1. At launch time, `launchAgentExecution` registers callbacks with CallbackManager:
   ```
   const groupId = callbackManager.createGroup();
   // Store groupId on the instance for retrieval
   dispatch(setCallbackGroupId({ instanceId, groupId }));

   // Register each callback under the group
   if (onTextReplace) callbackManager.registerWithContext(onTextReplace, { groupId, context: { type: 'replace' } });
   if (onTextInsertBefore) callbackManager.registerWithContext(onTextInsertBefore, { groupId, context: { type: 'insertBefore' } });
   if (onTextInsertAfter) callbackManager.registerWithContext(onTextInsertAfter, { groupId, context: { type: 'insertAfter' } });
   if (onComplete) callbackManager.registerWithContext(onComplete, { groupId, context: { type: 'complete' } });
   ```

2. Overlay components read `selectCallbackGroupId(instanceId)` and trigger callbacks:
   ```
   const groupId = useAppSelector(selectCallbackGroupId(instanceId));
   // When user clicks "Replace":
   callbackManager.triggerGroup(groupId, { action: 'replace', text: responseText });
   ```

3. On instance destruction, the group is cleaned up:
   ```
   // In destroyInstance extraReducer or thunk:
   callbackManager.removeGroup(groupId);
   ```

**Why this works:**
- Redux stays serializable (only stores the `groupId` string)
- Functions live in the singleton CallbackManager (survives React re-renders)
- Any display mode can use callbacks without prop drilling
- Cleanup is deterministic (tied to instance lifecycle)
- Pre-loaded shortcuts (500+ context menu items) can pre-register callbacks efficiently
- CallbackManager already supports groups, progress, and listeners

---

## Task List (Ordered by Foundation → Components)

### Phase 1: Redux Foundation

**1.1 Add missing fields to `InstanceUIState`**
```typescript
autoRun: boolean;                       // default: true
showDefinitionMessages: boolean;        // default: true
showDefinitionMessageContent: boolean;  // default: false (hide template by default)
usePreExecutionInput: boolean;          // default: false
preExecutionSatisfied: boolean;         // default: false
hiddenMessageCount: number;             // default: 0 (from RPC, temp)
callbackGroupId: string | null;         // default: null (CallbackManager group)
```

**`showVariablePanel` stays as-is.** It controls the panel. New fields control message
visibility. They are independent — you can show the panel but hide definition messages,
or vice versa.

**1.2 Add `systemGenerated` flag to `ConversationTurn`**
```typescript
systemGenerated?: boolean;  // true for turns fabricated from agent definition
```
Set when `addUserTurn` is dispatched for auto-generated messages.

**1.3 Update `initInstanceUIState` payload**
Accept and store all new fields. Create a `resolveVisibilitySettings` helper:
```typescript
function resolveVisibilitySettings(showVariables?: boolean) {
  if (showVariables === false) {
    return { showDefinitionMessages: false, showVariablePanel: false, showDefinitionMessageContent: false };
  }
  if (showVariables === true) {
    return { showDefinitionMessages: true, showVariablePanel: true, showDefinitionMessageContent: false };
  }
  return {}; // Use defaults
}
```

**1.4 Fix launch pipeline**
- All 3 create paths forward display/behavior flags to `initInstanceUIState`.
- `launchAgentExecution` stores `autoRun`, visibility flags, `usePreExecutionInput` on the instance.
- Add `resources` to `LaunchAgentOptions`.
- Register callbacks via CallbackManager and store `groupId`.
- Add cleanup in `destroyInstance`.

**1.5 Add selectors**
All new fields get dedicated selectors. Plus derived:
- `selectNeedsPreExecutionInput`: `usePreExecutionInput && !preExecutionSatisfied`
- `selectShouldShowInput`: `allowChat || (!autoRun && status === 'ready')`
- `selectInstanceTitle`: reads agent name or shortcut label from source slice
- `selectCallbackGroupId`

**1.6 Fetch `hiddenMessageCount` on instance creation**
When `showDefinitionMessages` is false and the instance has an `agentId`:
- Call `agx_get_defined_data(agentId)` RPC
- Store `definition_messages` count as `hiddenMessageCount`
- ⚠️ Console warning: temporary until backend sends visibility flags per message

### Phase 2: Core Smart Components

**2.1 Create `SmartAgentMessageList`**
- Takes `instanceId` only
- Reads `showDefinitionMessages`, `showDefinitionMessageContent`, `hiddenMessageCount` from Redux
- When `showDefinitionMessages` is false:
  - Hides `system` role turns
  - Hides first N `user` turns where N = `hiddenMessageCount`
  - Respects `isVisibleToUser` flag on individual turns (for DB-loaded history)
- When `showDefinitionMessages` is true but `showDefinitionMessageContent` is false:
  - Shows the turn but renders only the user-entered portions (variables, resources, attachments)
  - Hides the template text
- Renders user/assistant messages for visible history turns
- Appends streaming message when stream is active
- Auto-scrolls on new content
- Supports `compact` mode

**2.2 Create `AgentRunner` (core inner component)**
The equivalent of `PromptRunner`. Used by ALL display mode shells.

Props: `instanceId`, optional hints (`compact?: boolean`, `showTitle?: boolean`)

Reads ALL config from Redux:
- `autoRun` → if true and status is "ready" with sufficient input → auto-dispatch execute
- `allowChat` → controls whether input shows after first response
- `showVariablePanel` → controls variable panel
- `showDefinitionMessages` / `showDefinitionMessageContent` → controls message filtering
- `usePreExecutionInput` / `preExecutionSatisfied` → gates content behind pre-exec input

Renders:
1. Pre-execution gate: if `needsPreExecution` → `<AgentPreExecutionInput instanceId />`
2. Otherwise → SmartAgentMessageList + SmartAgentVariableInputs (when showVariablePanel) + SmartAgentInput (when shouldShowInput)
3. Handles streaming finalization (commit turn when stream ends)

### Phase 3: Pre-Execution Input

**3.1 Create `AgentPreExecutionInput`**
- Compact overlay/card rendered in place of main content by `AgentRunner`
- Shows text input + cancel/continue buttons
- Auto-run countdown (3 seconds, like old system) if `autoRun` is also true
- On submit: sets user input → dispatches `setPreExecutionSatisfied` → parent re-renders
- On cancel: dispatches close/destroy

**3.2 Wire into `AgentRunner`**
```
if (selectNeedsPreExecutionInput) → render <AgentPreExecutionInput />
else → render main content
```

### Phase 4: Display Shell Components

Each shell wraps `AgentRunner` in the appropriate container. Only `instanceId` + `onClose`.

**Build order (most impactful first):**

1. **`AgentRunnerModal`** — Dialog (desktop) / Drawer (mobile), largest surface area
2. **`AgentCompactModal`** — Draggable compact with chat toggle, close button
3. **`AgentSidebarRunner`** — FloatingSheet right, position/size from modeState
4. **`AgentToast`** — Toast notification, markdown, tag stripping, expand to full
5. **`AgentInlineOverlay`** — Positioned overlay, uses CallbackManager for replace/insert
6. **`AgentFlexiblePanel`** — MatrxDynamicPanel (4-edge resize, collapse, fullscreen)
7. **`AgentPanel`** — Narrower FloatingSheet variant
8. **`AgentChatBubble`** — Floating bubble with minimize/expand

Each one replaces the fake version in `AgentExecutionOverlay.tsx`.

### Phase 5: OverlayController Integration

**5.1 Replace `AgentExecutionOverlay` router with individual dynamic imports**
- Delete the current single-file wrapper
- OverlayController dynamically imports each shell component individually
- Same pattern as the prompt system's overlay wiring

**5.2 CallbackManager wiring for inline and complete**
- At launch: register `onTextReplace`, `onTextInsertBefore`, `onTextInsertAfter`, `onComplete` under a group
- At component: read `selectCallbackGroupId(instanceId)` → trigger via `callbackManager.triggerGroup`
- At destroy: `callbackManager.removeGroup(groupId)`

### Phase 6: Testing & Verification

**6.1 Update `AgentLauncherSidebarTester`**
- Wire all new toggles: `usePreExecutionInput`, `store`, `showVariables` (which resolves to fine-grained fields)
- Ensure toggles actually flow through to `launchAgent` → Redux

**6.2 Verify each display mode end-to-end**
- For each of the 8 overlay modes: create instance → verify correct component renders → verify
  variables, input, autoRun, allowChat, definition message visibility all work
- For `direct` and `background`: verify they don't trigger overlay

---

## Scalability to 100+ Display Components

Adding a new display mode:
1. Add the string to `ResultDisplayMode` union
2. Create a new shell component that wraps `AgentRunner` (or a custom inner)
3. Register it in OverlayController's dynamic import map
4. Done — all settings, selectors, execution, streaming, message filtering, callbacks work automatically

`AgentRunner` + `SmartAgentMessageList` + `SmartAgentInput` + `SmartAgentVariableInputs` do all
the heavy lifting. A new shell is just a container with layout decisions.

---

## Design Principles (Non-Negotiable)

1. **No props beyond `instanceId`** for display components. Everything from Redux + CallbackManager.
2. **Each display component is autonomous** — manages its own lifecycle.
3. **Settings must be stored in Redux** so components can read them after creation.
4. **Fine-grained state, coarse-grained config** — many small fields, orchestrated by actions.
5. **No fake code** — every component must handle variables, input, messages, autoRun, visibility correctly.
6. **Incremental correctness** — better to have 2 working modes than 8 fake ones.
7. **The OverlayController renders individual components**, not a router wrapper.
8. **Pre-execution is handled inside `AgentRunner`**, not as a separate overlay layer.
9. **Callbacks live in CallbackManager**, not Redux. Redux stores the `groupId` reference.
10. **Hidden message count is a temporary solution** (console warning). Long-term: backend sends per-message visibility flags.
11. **Terminology: instanceId not taskId, conversationId not runId.**
