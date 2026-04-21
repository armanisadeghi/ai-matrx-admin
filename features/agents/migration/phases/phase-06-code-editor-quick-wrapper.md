# Phase 6 — Code Editor Quick Wrapper

**Status:** blocked
**Owner:** claude (phase-6)
**Prerequisites:** Phase 5
**Unblocks:** Phase 15
**Blocker:** No `agx_agent` row exists today that mirrors the `prompt_builtins` used by the code editor (`prompt-app-ui-editor`, `generic-code-editor`, `code-editor-dynamic-context`). The wrapper currently passes the prompt-builtin UUID straight into `launchAgent(agentId, …)`, which will fail at the agent loader until an equivalent agent (or a prompt-builtin → agent shim in the launcher) exists. **Needs a human decision before V2/Compact/V3 code-editor paths will run.** The live prompt-app editor path (`/prompt-apps/[id]`) is unaffected — see below.

## Goal

Keep the one live coding feature working (the AI-assisted editor used when a user edits their prompt_app component) by swapping `usePromptRunner` → `useAgentLauncher` inside existing code-editor components. **Thin wrapper only.** Do not redesign — Phase 15 replaces everything.

## Findings (live-consumer tracing)

- The only live consumer of code-editor AI is `features/prompt-apps/components/PromptAppEditor.tsx`, which mounts `AICodeEditorModal` → `AICodeEditor` → `useAICodeEditor`. That path talks **directly to the `prompt-execution` slice**, not through `usePromptRunner`. So the `usePromptRunner` swap is zero-break for the live feature — the live feature never touched `usePromptRunner`.
- `usePromptRunner` was imported by exactly **one** file inside `features/code-editor/`: `AICodeEditorModalV2.tsx`. That file is consumed only by `MultiFileCodeEditor.tsx` (V2 branch) and the demo pages under `app/(authenticated)/demo/component-demo/ai-prog/…`.
- The other three files listed in the phase plan (`AICodeEditor.tsx`, `ContextAwareCodeEditorCompact.tsx`, `ContextAwareCodeEditorModal.tsx`) **did not import `usePromptRunner`** — they run on other prompt-system entry points (`useAICodeEditor`, `ContextAwarePromptCompactModal`, `ContextAwarePromptRunner`). Those entry points still resolve against `prompt_builtins` / prompt-execution internals and will be ripped out in Phase 15.

## Files to touch
- `features/code-editor/components/AICodeEditorModalV2.tsx` — swap `usePromptRunner().openPrompt` → `useAgentLauncher().launchAgent`; manage conversation close via `destroyInstanceIfAllowed`. Dead `handleExecutionComplete` callback removed (it was only reachable via `openPrompt`'s `onExecutionComplete` hook, which has no agent-launcher equivalent — Phase 15 rebuilds the edit-detection pipeline on agent tools).
- `features/code-editor/components/AICodeEditor.tsx` — marker comment only (no `usePromptRunner` usage).
- `features/code-editor/components/ContextAwareCodeEditorCompact.tsx` — marker comment only.
- `features/code-editor/components/ContextAwareCodeEditorModal.tsx` — marker comment only.

## Preserve
- `features/code-editor/utils/applyCodeEdits.ts`
- `features/code-editor/utils/parseCodeEdits.ts`
- `features/code-editor/utils/generateDiff.ts`

Phase 15 will replace these with agent-tool-driven equivalents, but until then they stay.

## Agent id substitution

| Legacy `prompt_builtins` key | Legacy UUID | Agent id used in wrapper |
|---|---|---|
| `prompt-app-ui-editor` | `c1c1f092-ba0d-4d6c-b352-b22fe6c48272` | **same UUID, passed through** — no `agx_agent` replacement exists |
| `generic-code-editor` | `87efa869-9c11-43cf-b3a8-5b7c775ee415` | **same UUID, passed through** — no `agx_agent` replacement exists |
| `code-editor-dynamic-context` | `970856c5-3b9d-4034-ac9d-8d8a11fb3dba` | **same UUID, passed through** — no `agx_agent` replacement exists |

`AICodeEditorModalV2` now calls `launchAgent(defaultBuiltinId, …)` where `defaultBuiltinId` is still sourced from `getBuiltinId(promptKey)` in `lib/redux/prompt-execution/builtins.ts`. Until an agent-side equivalent is seeded (or the launcher grows a `prompt_builtin_id → agent_id` fallback), launching V2/V3/Compact will error at the agent-definition loader. The live `AICodeEditor` / `PromptAppEditor` path remains on the legacy prompt-execution slice and still works.

## Success criteria
- [x] Zero `usePromptRunner` imports remain in `features/code-editor/`.
- [x] The prompt-app component editor in `/prompt-apps/[id]` still works end-to-end. (It never used `usePromptRunner`; unchanged code path.)
- [x] This phase's code is marked with a `// Phase 6 wrapper — replaced in Phase 15` comment at each touched file's top.
- [ ] V2/V3/Compact code-editor launches wire to an agent that actually exists. **Blocked on agent-id decision above.**

## Change log
| Date | Who | Change |
|---|---|---|
| 2026-04-21 | claude (phase-6) | Replaced `usePromptRunner().openPrompt` with `useAgentLauncher().launchAgent` inside `AICodeEditorModalV2.tsx`. Added Phase 6 marker comment to all four files in scope (`AICodeEditorModalV2.tsx`, `AICodeEditor.tsx`, `ContextAwareCodeEditorCompact.tsx`, `ContextAwareCodeEditorModal.tsx`). Removed orphaned `handleExecutionComplete` callback from V2 (no `onExecutionComplete` hook exists on `launchAgent` — Phase 15 rebuilds the edit-detection pipeline). Close path now dispatches `destroyInstanceIfAllowed` against the launched `conversationId`. `features/code-editor/utils/{applyCodeEdits,parseCodeEdits,generateDiff}.ts` untouched per plan. Flagged status `blocked`: the three legacy `prompt_builtins` UUIDs used for code editing have no `agx_agent` equivalent seeded — `launchAgent` is invoked with the prompt-builtin UUID as a placeholder `agentId` and will fail at agent-definition load until a human decides which agent(s) should back these surfaces. Live prompt-app editor flow (`AICodeEditorModal` → `AICodeEditor` → `useAICodeEditor`) does not go through `usePromptRunner` and is therefore unaffected. |
