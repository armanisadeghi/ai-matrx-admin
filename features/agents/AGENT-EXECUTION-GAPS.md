# Agent execution — gaps beyond `AGENT-EXECUTION-SYSTEM-ROADMAP.md`

Additive findings from comparing the **Prompt Runner / prompt-execution** stack to the **agent execution** stack. Does **not** re-list items already covered in the roadmap (missing `InstanceUIState` fields, named fake shell components, `SmartAgentMessageList`, pre-exec design questions, etc.).

---

## 1. Launch pipeline — options dropped or not applied

- **`usePreExecutionInput` is never consumed in the orchestrator**  
  It appears on `LaunchAgentOptions` and is forwarded from `useAgentLauncher` → `launchAgent`, but `launchAgentExecution` never destructures or applies it (only `createInstanceFromShortcut` paths encode shortcut defaults in DB, not per-launch UI).  
  Files: `features/agents/redux/execution-system/thunks/launch-agent-execution.thunk.ts`, `features/agents/hooks/useAgentLauncher.ts`

- **`allowChat` / `showVariables` from launch are ignored on the main `agentId` path**  
  Shortcut creation passes them into `createInstanceFromShortcut`; **`createManualInstance` does not take them** and `initInstanceUIState` only sets `showVariablePanel` from whether the agent has variable definitions. Launcher toggles do not update `allowChat` or `showVariablePanel` after creation.  
  Files: `features/agents/redux/execution-system/thunks/launch-agent-execution.thunk.ts`, `features/agents/redux/execution-system/thunks/create-instance.thunk.ts`

- **`useAgentLauncher.launchShortcut` omits `usePreExecutionInput`**  
  The shortcut payload does not forward `options?.usePreExecutionInput` (unlike `launchAgent`).  
  File: `features/agents/hooks/useAgentLauncher.ts`

- **`launchChat` omits most execution/display flags**  
  No `showVariables`, `usePreExecutionInput`, `onTextReplace` / inline callbacks, etc., on the payload built for manual chat.  
  File: `features/agents/hooks/useAgentLauncher.ts`

- **No resource attachments on launch**  
  `openPromptExecution` accepts `resources` and passes them into `startPromptInstance`. `LaunchAgentOptions` / `launchAgentExecution` have **no `resources`**; instances get `initInstanceResources` empty unless something else populates the slice.  
  Files: `lib/redux/thunks/openPromptExecutionThunk.ts`, `features/agents/redux/execution-system/thunks/launch-agent-execution.thunk.ts`, `features/prompts/components/runner-tester/PromptRunnerModalSidebarTester.tsx` (passes `resources`) vs `features/agents/components/run-controls/AgentLauncherSidebarTester.tsx` (does not).

- **No `track_in_runs` (or server “ephemeral run”) hook in the agent orchestrator**  
  Prompt config carries `track_in_runs` through execution config and API assembly; agent launch/assemble path has no analogous flag in types used by `launchAgentExecution` (roadmap Phase 1.5 names the destination; this notes the **absence in launcher + hook surface** today).  
  Files: `features/prompt-builtins/types/execution-modes.ts`, `usePromptRunner.ts` defaults vs `features/agents/hooks/useAgentLauncher.ts`

---

## 2. Tester / UI wiring inconsistencies (regressions vs prompt tester)

- **`AgentLauncherSidebarTester`: “Use Pre-Execution Input” switch is dead**  
  Local state `usePreExecutionInput` is never passed into `launchAgent(...)`.  
  File: `features/agents/components/run-controls/AgentLauncherSidebarTester.tsx`

- **`AgentLauncherSidebarTester`: no “Track in Runs” toggle**  
  Prompt tester exposes `trackInRuns`; agent tester does not, so there is no parallel UX for the future `trackInRuns` field.  
  Files: `features/prompts/components/runner-tester/PromptRunnerModalSidebarTester.tsx` vs `features/agents/components/run-controls/AgentLauncherSidebarTester.tsx`

- **Tester modal coverage**  
  `AgentExecutionTestModal` supports `testType: "direct" | "inline" | "background"`, but the sidebar tester only opens it for **`direct` and `background`** (`useState` initial / branch). Inline is only exercised via the real overlay path, not the isolated harness (prompt’s `PromptExecutionTestModal` opens inline in the harness).  
  Files: `features/agents/components/run-controls/AgentLauncherSidebarTester.tsx`, `features/agents/components/run-controls/AgentExecutionTestModal.tsx`, `features/prompts/components/runner-tester/PromptExecutionTestModal.tsx`

---

## 3. OverlayController and prompt-adjacent behavior not replicated for agents

- **Close semantics: response text / callbacks**  
  Prompt paths call `closePromptModal({ responseText })`, `closeCompactModal({ responseText })`, etc., using `selectPrimaryResponseTextByTaskId` in `components/overlays/OverlayController.tsx`. Agent overlay close is only **`destroyInstance(instanceId)`** — no symmetry for “last response snapshot on dismiss” if product needs it.

- **Pre-execution Redux staging**  
  Prompt flow uses `promptRunnerSlice` (`openPreExecutionModal`, `preExecutionModal.config`, `targetResultDisplay`) and `submitPreExecutionThunk.ts` to reopen the correct shell and execute. **Agent system has no slice-level “pending overlay + target display mode” queue**; only a future `AgentPreExecutionInput` (roadmap) plus persisted flags on `InstanceUIState` will make this possible.

- **`PreExecutionInputModalContainer` behaviors to mirror**  
  Auto-run countdown (3s), interaction cancellation, `CompactPromptModal` in `mode="input-only"`, reads `selectExecutionConfig` for `auto_run`. Any agent pre-exec layer should match these UX details.  
  File: `features/prompts/components/results-display/PreExecutionInputModalContainer.tsx`

---

## 4. Shell / layout parity (implementation detail gaps)

- **Flexible panel implementation**  
  Prompt: `MatrxDynamicPanel` — four edges, resize, collapse, fullscreen (`features/prompts/components/results-display/PromptFlexiblePanel.tsx`).  
  Agent: fixed `FloatingPanel` in a corner (`features/agents/components/overlays/AgentExecutionOverlay.tsx` → `AgentFlexiblePanelOverlay`). **Not feature-equivalent.**

- **Sidebar: position + size**  
  Prompt stores and maps `sidebarPosition` / `sidebarSize` through `promptRunnerSlice` and `PromptSidebarRunner.tsx`. Agent sidebar is hardcoded (`FloatingSheet` `position="right"`, `width="2xl"`). No `sm | md | lg` mapping or left/right from launch options.

- **Modal / drawer mobile split**  
  `PromptRunnerModal.tsx` uses **`useIsMobile()`** → `Drawer` on mobile, `Dialog` on desktop. Agent full modal in `AgentExecutionOverlay.tsx` uses **`Dialog` only** for `AgentFullModal` / `AgentCompactModal` — **no Drawer path** (conflicts with project mobile rules for dialogs).

- **Shell titles**  
  Prompt shells receive optional **title** from config (e.g. prompt name). Agent shells mostly show generic “Agent Execution” / “Agent” strings; **no selector for display title** per instance.

- **`displayVariant` (`standard` | `compact`)**  
  `usePromptRunner.ts` exposes `displayVariant` for inner runner layout. Agent overlay hardcodes compact in some shells; **no stored variant** on `InstanceUIState`.

---

## 5. Rich prompt-runner features without agent equivalents

- **Inline result UX**  
  `PromptInlineOverlay` + `openPromptExecutionThunk` wire **real** `onReplace`, `onInsertBefore`, `onInsertAfter`. `AgentInlineOverlay` buttons only call **`onClose`** — no callback surface from Redux/thunk like prompt’s `onTextReplace` / `LaunchAgentOptions` (options exist on paper but inline path returns after poll without invoking them in `AgentExecutionOverlay`).  
  Files: `lib/redux/thunks/openPromptExecutionThunk.ts`, `features/prompts/components/results-display/PromptInlineOverlay.tsx`, `features/agents/components/overlays/AgentExecutionOverlay.tsx`

- **Toast content behavior**  
  `PromptToast.tsx`: strips `<thinking>` / `<planning>` for display, uses `BasicMarkdownContent`, live stream via socket selectors, **“Show more” → `openCompactModal`** with `runId`. `AgentToastOverlay`: plain `<p>` text, **no markdown**, no tag stripping, no expand-to-full-runner with preserved instance context beyond accumulated text.

- **Canvas side-by-side**  
  `PromptRunner.tsx` supports **`enableInlineCanvas`** + `ResizableCanvas` / `CanvasRenderer` + `canvasSlice`. No agent runner integration for the global canvas system.

- **Context versioning**  
  `ContextAwarePromptRunner.tsx` uses `ContextVersionManager` + dynamic context variables for long editing sessions. **No agent overlay or instance hook** for the same “versioned context blob” pattern.

- **Dynamic / admin-driven triggers**  
  `DynamicButtons.tsx`, `DynamicCards.tsx`, `PromptExecutionCard.tsx` tie **system prompts + `PromptContextResolver` + `startPromptInstance`** into configurable UI. Parallel for **agents** (e.g. DB-driven agent buttons with scope resolution) is not present in the same folder patterns.

- **Prompt generators / optimizers**  
  `features/prompts/components/actions/prompt-generator/*`, `prompt-optimizers/*` are prompt-definition tools surfaced next to execution. **No agent-definition generator/optimizer mirror** wired to instance launch.

- **Resource UX depth**  
  Prompt stack: `resource-picker/*`, `resource-display/*` (`ResourceDebugModal.tsx`, `ResourcePreviewSheet.tsx`, `ResourceChips.tsx`) integrated with prompt runs. Agent has slice-level resources but **no parity modals/sheets** in overlay runners for debug/preview flows.

- **Additional / compact context modals**  
  `AdditionalInfoModal.tsx`, `ContextAwarePromptCompactModal.tsx`, `PromptCompactModal.tsx` patterns for extra metadata and context-aware entry — **no agent instance-driven counterparts** listed beside `AgentExecutionOverlay`.

- **`PromptRunner.onExecutionComplete`**  
  Prompt path finalizes stream and invokes callback (with a known TODO about passing full text). Agent overlays **don’t expose** a unified `onExecutionComplete` prop pattern from `OverlayController` (callers rely on thunk `onComplete` for direct/background only).

- **`SmartMessageList` / template visibility rules**  
  Prompt list filters **`metadata?.fromTemplate` when `show_variables` is false** after first execution (`features/prompts/components/smart/SmartMessageList.tsx`). Agent history needs the **same class of rule** once `systemGenerated` / hidden turns exist (roadmap) — today **`AgentConversationDisplay`** does not implement that filter.

---

## 6. Minor / API ergonomics

- **`openPromptImperative` typing**  
  `usePromptRunner.ts` uses `dispatch: any` on `openPromptImperative` — not an agent gap, but any shared “imperative launcher” API for agents should stay strictly typed (`AppDispatch`).

- **Agent `chat-bubble` / `panel` display modes**  
  Exist in agent `ResultDisplayMode` and router, but **not** in prompt `ResultDisplay` enum — migration docs should treat them as **agent-only surfaces** when comparing feature matrices.

---

## 7. File index (prompt side referenced above)

| Area | Path |
|------|------|
| Unified open + routing | `lib/redux/thunks/openPromptExecutionThunk.ts` |
| Pre-exec submit | `lib/redux/thunks/submitPreExecutionThunk.ts` |
| Prompt runner Redux UI | `lib/redux/slices/promptRunnerSlice.ts` |
| Hook | `features/prompts/hooks/usePromptRunner.ts` |
| Overlay wiring | `components/overlays/OverlayController.tsx` |
| Core runner / canvas | `features/prompts/components/results-display/PromptRunner.tsx` |
| Modals / panels | `PromptRunnerModal.tsx`, `PromptSidebarRunner.tsx`, `PromptFlexiblePanel.tsx`, `PromptInlineOverlay.tsx`, `PromptToast.tsx` |
| Pre-exec UI | `features/prompts/components/results-display/PreExecutionInputModalContainer.tsx` |
| Smart list | `features/prompts/components/smart/SmartMessageList.tsx` |
| Context-aware | `features/prompts/components/results-display/ContextAwarePromptRunner.tsx` |
| Test harness | `features/prompts/components/runner-tester/PromptRunnerModalSidebarTester.tsx`, `PromptExecutionTestModal.tsx` |
| Dynamic UI | `features/prompts/components/dynamic/DynamicButtons.tsx`, `DynamicCards.tsx`, `PromptExecutionCard.tsx` |

**Agent counterparts (for diffs):** `features/agents/redux/execution-system/thunks/launch-agent-execution.thunk.ts`, `features/agents/hooks/useAgentLauncher.ts`, `features/agents/components/overlays/AgentExecutionOverlay.tsx`, `features/agents/components/run-controls/AgentLauncherSidebarTester.tsx`, `AgentExecutionTestModal.tsx`.

---

*Last reviewed against prompt + agent codepaths under `matrx-admin` (execution orchestration, overlays, testers).*
