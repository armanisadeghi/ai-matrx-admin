# Agent execution — remaining gaps (post-refactor)

Re-audit vs the **prompt runner** stack (`usePromptRunner`, `openPromptExecutionThunk`, `promptRunnerSlice`, `OverlayController` prompt branch) and the **current** agent stack (`launchAgentExecution`, `useAgentLauncher`, `AgentRunner`, `SmartAgentMessageList`, `AgentPreExecutionInput`, `AgentExecutionOverlay`).

**Intentionally omitted here:** items that are now clearly addressed in code (central `AgentRunner`, persisted `autoRun` / `usePreExecutionInput` / fine-grained visibility, `callbackGroupId` registration, launcher + shortcut wiring for visibility and pre-exec, `selectInstanceTitle` in shells, etc.).

---

## Logic / orchestration

### 1. `CallbackManager` — register but never trigger

- Launch registers `onComplete`, `onTextReplace`, `onTextInsertBefore`, `onTextInsertAfter` and stores `callbackGroupId` on `InstanceUIState`.
- **`callbackManager.triggerGroup` is not invoked anywhere in `features/agents/`** (only in `app/(authenticated)/demo/services/callback-manager/page.tsx`).
- Result: inline/editor integrations that rely on replace/insert/complete callbacks still get **no delivery**, even though Redux holds the group id (`selectCallbackGroupId` exists).
- Files: `features/agents/redux/execution-system/thunks/launch-agent-execution.thunk.ts`, `utils/callbackManager.ts`, `features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors.ts` (`selectCallbackGroupId`).

### 2. `originalText` dropped at launch

- `LaunchAgentOptions` / `useAgentLauncher` still accept `originalText`, but **`launchAgentExecution` does not read it** — nothing copies it into instance state for inline/compare UX.
- Prompt path carries `originalText` through modal/overlay config.
- Files: `features/agents/redux/execution-system/thunks/launch-agent-execution.thunk.ts`, `features/agents/hooks/useAgentLauncher.ts`

### 3. `launchChat` / `createManualInstanceNoAgent` path ignores most launch flags

- For the **no-agent** branch, the thunk only calls `createManualInstanceNoAgent` with `label`, `baseSettings`, `sourceFeature`, then optional `setUserVariableValues`, optional `setDisplayModeAction`.
- **`createManualInstanceNoAgent` always uses minimal `initInstanceUIState`** (no `autoRun`, `allowChat`, `usePreExecutionInput`, visibility flags, or `callbackGroupId` from options).
- So `launchChat({ ... })` options such as visibility, pre-exec, auto-run defaults, and callbacks are **not reflected in Redux** for that path unless added in a follow-up `dispatch` after creation (they are not today).

### 4. Resources not attachable at launch

- `openPromptExecution` accepts `resources` and passes them into `startPromptInstance`.
- **`LaunchAgentOptions` has no `resources` field**; instances start with `initInstanceResources` empty unless the UI adds attachments later.
- Files: `lib/redux/thunks/openPromptExecutionThunk.ts` vs `features/agents/redux/execution-system/thunks/launch-agent-execution.thunk.ts`

### 5. `track_in_runs` / server persistence toggle

- Prompt execution config includes `track_in_runs` and flows into the legacy prompt pipeline.
- Agent UI config in `InstanceUIState` / launch types **has no `trackInRuns` (or equivalent)** wired through `launchAgentExecution` into request assembly (only mentioned in `features/agents/utils/run-ui-utils.ts` for display meta parity, not orchestration).

### 6. `hiddenMessageCount` not populated at instance creation

- `InstanceUIState` documents `hiddenMessageCount` as coming from `agx_get_defined_data` (or similar) at creation time.
- **`createManualInstance` / shortcut creation paths do not set `hiddenMessageCount` from RPC**; it stays at slice default (`0`) unless something else updates it.
- Files: `features/agents/redux/execution-system/thunks/create-instance.thunk.ts`, `features/agents/types/instance.types.ts`

---

## UI / shell parity

### 7. Mobile: agent modals still `Dialog`-only

- `PromptRunnerModal` uses **`useIsMobile()` → `Drawer`** for full modal.
- `AgentFullModal` / `AgentCompactModal` in `AgentExecutionOverlay` still use **`Dialog` only** — does not match project mobile guidance (drawer for full-screen interactive surfaces).

### 8. Inline mode: no dedicated replace/insert chrome

- Prompt: **`PromptInlineOverlay`** — focused preview with Replace / Insert before / Insert after + streaming task wiring.
- Agent: **`AgentInlineOverlay`** is a thin shell around **`AgentRunner`** (full conversation + optional input), not a minimal cursor-context overlay with explicit text actions.
- Combined with §1, **programmatic replace/insert still has no UI hook** even when callbacks were passed at launch.

### 9. Toast: collapsed state still “plain text”

- Prompt **`PromptToast`**: strips `<thinking>` / `<planning>`, uses markdown renderer, socket-backed streaming, “expand” opens compact modal with `runId`.
- Agent **`AgentToastOverlay`**: collapsed view is still **`line-clamp` plain `<p>`**; expanded view correctly embeds `AgentRunner`. No thinking/planning strip, no markdown in the thumbnail.

### 10. Sidebar / flexible panel layout options

- Prompt: **`sidebarPosition`**, **`sidebarSize`**, **`flexiblePanelPosition`** in `promptRunnerSlice` and shells (`PromptSidebarRunner.tsx`, `PromptFlexiblePanel.tsx`).
- Agent: **`AgentSidebarOverlay`** hardcodes `position="right"`, `width="2xl"`; **`AgentFlexiblePanelOverlay`** uses fixed **`FloatingPanel`** placement, not **`MatrxDynamicPanel`**-style positioning/resizing/fullscreen like `PromptFlexiblePanel.tsx`.

### 11. Pre-execution: no auto-run countdown

- Prompt **`PreExecutionInputModalContainer.tsx`**: 3s countdown + progress when `auto_run` and no interaction.
- **`AgentPreExecutionInput`**: Continue/Skip only; **no countdown UX** aligned with prompt behavior.

### 12. Overlay close: no “response text” handoff

- Prompt closes still pass **`responseText`** into `promptRunnerSlice` (`closePromptModal`, `closeCompactModal`, etc.) in `components/overlays/OverlayController.tsx`.
- Agent branch only **`destroyInstance(instanceId)`** — **no symmetric “last response on close”** for consumers that depended on prompt semantics.

---

## Tester / harness gaps

### 13. `AgentLauncherSidebarTester` — no “track in runs” toggle

- Prompt **`PromptRunnerModalSidebarTester`** still exposes **`trackInRuns`** alongside other execution flags.
- Agent tester **does not**, so there is no UI to exercise a future `trackInRuns` flag alongside other toggles.

### 14. Test modal: `inline` not opened from sidebar tester

- **`AgentExecutionTestModal`** supports `testType: "direct" | "inline" | "background"`, but **`AgentLauncherSidebarTester`** only sets the modal for **`direct` and `background`** (`useState` + branch). Inline is only hit by launching the real **`inline` overlay**, not the isolated harness (prompt tester opens inline inside `PromptExecutionTestModal`).
- Files: `features/agents/components/run-controls/AgentLauncherSidebarTester.tsx`, `features/agents/components/run-controls/AgentExecutionTestModal.tsx`

---

## Prompt ecosystem not mirrored (product scope)

These remain **prompt-only** unless you add explicit agent equivalents:

- **`ContextAwarePromptRunner`** + `ContextVersionManager` (versioned context injection).
- **Inline canvas** (`PromptRunner` `enableInlineCanvas` + `canvasSlice`).
- **Dynamic system prompts** (`features/prompts/components/dynamic/DynamicButtons.tsx` & friends) vs DB-driven agent buttons with the same resolver pattern.

---

## File index (quick reference)

| Concern | Primary paths |
|--------|----------------|
| Launch orchestration | `features/agents/redux/execution-system/thunks/launch-agent-execution.thunk.ts` |
| Manual no-agent create | `features/agents/redux/execution-system/thunks/create-instance.thunk.ts` (`createManualInstanceNoAgent`) |
| Callbacks | `utils/callbackManager.ts`, `instance-ui-state.slice.ts` |
| Shells | `features/agents/components/overlays/AgentExecutionOverlay.tsx` |
| Core runner | `features/agents/components/smart/AgentRunner.tsx`, `AgentPreExecutionInput.tsx` |
| Prompt parity | `lib/redux/thunks/openPromptExecutionThunk.ts`, `features/prompts/components/results-display/PromptRunnerModal.tsx`, `PromptInlineOverlay.tsx`, `PromptToast.tsx`, `PreExecutionInputModalContainer.tsx` |
| Global overlays | `components/overlays/OverlayController.tsx` |

---

*Updated by re-reading the codebase after the AgentRunner / launch / visibility refactor.*
