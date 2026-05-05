# Code-Editor Modals + `/prompt-apps/[id]` Editor → Agent Execution

**Status:** ⏳ Not started — agent IDs verified, plan is fully detailed in-file
**Owner:** TBD
**Branch suggestion:** `code-editor-shortcut-trigger-swap`
**Cross-refs:** [`INVENTORY.md §6`](./INVENTORY.md) · [`FINAL-AUDIT-2026-05-04.md §1.4-§1.5`](./FINAL-AUDIT-2026-05-04.md) · [`phases/phase-06-code-editor-quick-wrapper.md`](./phases/phase-06-code-editor-quick-wrapper.md)

> **Confirmed in DB (Matrx Main, 2026-05-04):** All three target agents already exist at the same UUIDs as the legacy prompt-builtins. Same IDs, agent-system rows. The migration is real code work, but **no DB changes** and **no ID remapping** are required.

---

## What we lose if these aren't migrated

These five files keep `features/prompts/**` and the entire `lib/redux/prompt-execution/` slice alive. They block the Phase 18 deletion campaign.

User-facing functionality at risk if we delete legacy without migrating:

- **`/prompt-apps/[id]` editor (LIVE)** — the Prompt App page editor uses `AICodeEditor` → `useAICodeEditor` to do AI-assisted code edits on prompt-app HTML/JSX. Real users use this today.
- **`/code` workspace embedded AI editor** — the `ContextAwareCodeEditorModal` and `ContextAwareCodeEditorCompact` are the right-click "Ask AI to edit" affordance.
- **HTML files tab** — `MultiFileCodeEditor` consumes `AICodeEditorModalV2` for HTML/CSS/JS editing inside prompt apps.
- **Demo pages** under `app/(legacy)/legacy/demo/component-demo/ai-prog/*` — internal-only, lower priority but uses the same surface.

---

## Confirmed mapping table (DO NOT change IDs)

| Prompt-builtin key | UUID (= agent ID, same value) | Agent name in `agx_agent` | Shortcut UUID | Shortcut name |
|---|---|---|---|---|
| `prompt-app-ui-editor` | `c1c1f092-ba0d-4d6c-b352-b22fe6c48272` | "Prompt App Code Editor" | `6231578b-a52d-47c5-a41d-831000ddfa9e` | "Update Prompt App Code" |
| `generic-code-editor` | `87efa869-9c11-43cf-b3a8-5b7c775ee415` | "Code Editor" | `00836ba6-10af-4a95-8c7e-6b5a03c0b3e4` | "Master Code Editor" |
| `code-editor-dynamic-context` | `970856c5-3b9d-4034-ac9d-8d8a11fb3dba` | "Code Editor (Dynamic Context)" | `2c301ba1-e870-4a3f-abe6-8148c72a7425` | "Dynamic Context Code Editor" |

**Implication:** the `getBuiltinId(promptKey)` helper still returns valid UUIDs — they're just agent UUIDs now, not prompt-builtin UUIDs. The helper can stay (rename later) or its callers can switch to constants pointing at the **shortcut** UUIDs (recommended pattern below).

---

## Files to migrate (5 total)

| File | LoC | Current state | Target |
|---|---|---|---|
| `features/code-editor/components/AICodeEditorModalV2.tsx` | 199 | Uses `useAgentLauncher` (Phase 6 swap done) BUT still SELECTs from `prompt_builtins` table and imports prompt types | Drop the prompt_builtins fetch entirely (data isn't used for the launch — gating only); inline minimal types or drop them; switch to shortcut-trigger pattern |
| `features/code-editor/components/ContextAwareCodeEditorModal.tsx` | 429 | Renders `<ContextAwarePromptRunner>` from `features/prompts/`; uses `getBuiltinPrompt`, `selectCachedPrompt`, prompt-execution `runId`/`sessionKey` | Replace with `<AgentRunner conversationId>`; drive launch via `useShortcutTrigger()` with `displayMode: "direct"` override |
| `features/code-editor/components/ContextAwareCodeEditorCompact.tsx` | 394 | Same as Modal — `<ContextAwarePromptCompactModal>` from prompts | Same recipe; only chrome differs (compact draggable wrapper) |
| `features/code-editor/components/AICodeEditor.tsx` | 522 | Consumes `useAICodeEditor` hook; passes `promptKey` prop | Update prop signatures; consume the rewritten hook (below) |
| `features/code-editor/hooks/useAICodeEditor.ts` | 549 | **The crown jewel.** ~150-LoC rewrite. Tied to 8+ prompt-execution selectors and 4+ thunks. Backs the LIVE `/prompt-apps/[id]` editor. | Full swap to `useShortcutTrigger()` + agent-execution selectors |

> **⚠️ DO NOT** ship the hook rewrite (`useAICodeEditor.ts`) without browser-testing the `/prompt-apps/[id]` editor in production-equivalent conditions. It's the only live, user-facing consumer.

---

## The canonical pattern (use everywhere)

The `(a)/code` workspace already runs on the agent system. The pattern there is URL-driven (`?agentId=`), but for embedded modals/wrappers like these code-editor consumers, the right pattern is **`useShortcutTrigger` with `displayMode: "direct"` override**.

```typescript
import { useShortcutTrigger } from "@/features/agent-shortcuts/hooks/useShortcutTrigger";

const SHORTCUT_IDS = {
  promptAppUiEditor: "6231578b-a52d-47c5-a41d-831000ddfa9e",
  genericCodeEditor: "00836ba6-10af-4a95-8c7e-6b5a03c0b3e4",
  codeEditorDynamicContext: "2c301ba1-e870-4a3f-abe6-8148c72a7425",
} as const;

const { trigger } = useShortcutTrigger();
const [conversationId, setConversationId] = useState<string | null>(null);

// On modal open:
useEffect(() => {
  if (open) {
    trigger(SHORTCUT_IDS.genericCodeEditor, {
      sourceFeature: "code-editor",
      surfaceKey: `code-editor-modal:${SHORTCUT_IDS.genericCodeEditor}`,
      config: {
        displayMode: "direct",          // override shortcut's modal-full default
        autoRun: false,
        allowChat: true,
        showPreExecutionGate: false,
      },
      onConversationCreated: setConversationId,
      runtime: {
        applicationScope: { selection, content: code, context },
        variables: {
          current_code: code,
          content: code,
          ...(selection && { selection }),
          ...(context && { context }),
        },
      },
    });
  }
}, [open, trigger, code, selection, context]);

// On stream complete:
const phase = useAppSelector((s) => conversationId ? selectStreamPhase(s, conversationId) : null);
const text = useAppSelector((s) => conversationId ? selectLatestAccumulatedText(s, conversationId) : "");

useEffect(() => {
  if (phase === "complete" && text) {
    handleResponseComplete(text);  // existing parser/canvas flow
  }
}, [phase, text]);

// On close:
const handleClose = useCallback(() => {
  if (conversationId) {
    dispatch(destroyInstanceIfAllowed(conversationId));
    setConversationId(null);
  }
}, [conversationId, dispatch]);
```

Why `displayMode: "direct"` — every existing shortcut row is configured `modal-full` (so shortcut launches show their own overlay). The code-editor wrappers render their own chrome and just want the agent to run inline. `direct` suppresses the overlay.

---

## Per-file recipe

### 1. `AICodeEditorModalV2.tsx` (199 LoC, smallest surgery)

Today (lines 108–143): SELECTs `prompt_builtins` row, normalizes into `PromptData`, gates the launch on `promptData` being present. **The fetched data is never used in the launch params** (lines 152–169 reference only `defaultBuiltinId`, `currentCode`, `selection`, `context`).

**Surgery:**

1. Delete the entire `useEffect` at lines 108–143 (`prompt_builtins` fetch).
2. Delete `promptData` state (line 95) and `isLoadingPrompt` (line 96).
3. Delete `asPromptMessages` (lines 26–37) and `asPromptVariables` (lines 39–48).
4. Remove imports for `PromptData`, `PromptMessage`, `PromptVariable` (lines 20–24).
5. Remove `import { supabase } from "@/utils/supabase/client"` (line 19).
6. Simplify the launch effect (lines 146–186) to fire on `open && !hasOpened`.
7. Optionally: switch from `launchAgent(defaultBuiltinId, ...)` to `trigger(SHORTCUT_ID, ...)` per the canonical pattern. Either works; shortcut form is preferred for consistency with the other two ContextAware files.

**Net result:** ~80 LoC removed, zero behavior change (the fetch was dead-weight gating).

### 2. `ContextAwareCodeEditorModal.tsx` (429 LoC)

Follow the in-file TODO at lines 1–48. Concrete steps:

1. Replace `<ContextAwarePromptRunner runId promptId promptSource …>` with `<AgentRunner conversationId={conversationId} />`.
2. Drop `getBuiltinPrompt`, `selectCachedPrompt`, the local `promptData` selector, `runId`/`sessionKey` machinery, and the `defaultBuiltinId` lookup.
3. On modal open, `await trigger(SHORTCUT_ID, { ...config above... })` using `displayMode: "direct"`.
4. Convert `handleResponseComplete` from a callback prop to a `useEffect` watching `selectStreamPhase(conversationId) === "complete"` + reading `selectLatestAccumulatedText(conversationId)`.
5. `handleContextUpdateReady` / `handleContextChange` → call `setInstanceVariableValue({ conversationId, name: "dynamic_context", value })` from the `instance-variable-values` slice.
6. Cleanup: `dispatch(destroyInstanceIfAllowed(conversationId))` on close.

### 3. `ContextAwareCodeEditorCompact.tsx` (394 LoC)

Identical recipe to the Modal. Only the chrome differs (compact draggable vs. standard Dialog). Don't touch the layout primitives — only swap the inner runner.

### 4. `AICodeEditor.tsx` (522 LoC)

This is the consumer that imports `useAICodeEditor`. Once the hook is rewritten (next item), this file's prop signature may shift. Mostly needs:
- Drop `useAICodeEditor` selector imports that no longer apply.
- Update names: `runId` → `conversationId`, `selectMergedVariables` results → `selectInstanceVariableValues` results.
- Verify the existing UI renders the new agent message stream (the underlying message text is the same — just sourced from a different selector).

### 5. `useAICodeEditor.ts` (549 LoC) — the crown jewel

The in-file TODO (lines 155–212) lays out the exact recipe. Summary:

1. Replace `startPromptInstance` (line 152) with `useShortcutTrigger()` + `trigger(SHORTCUT_ID, ...)`. Pass `config: { displayMode: "direct" }`.
2. Capture `conversationId` via `onConversationCreated`.
3. Replace prompt-slice selectors with agent counterparts:
   - `selectStreamingTextForInstance` → `selectLatestAccumulatedText(conversationId)`
   - `selectIsResponseEndedForInstance` → `selectStreamPhase(conversationId) === "complete"`
   - `selectMessages` → `selectInstanceConversationHistory(conversationId)`
   - `selectMergedVariables` → `selectInstanceVariableValues(conversationId)`
4. Replace `executeMessage` (line 395, multi-turn send) with `dispatch(executeInstance({ conversationId }))`.
5. Drop `completeExecutionThunk` — agent stream machinery handles completion natively.
6. Drop the `cachedPrompt` path entirely — variable defaults live on `agx_agent`, queried by the launcher.
7. Move `buildSpecialVariables` (line 254) into the `runtime.userInput` / variable-seeding layer of `trigger`.
8. Cleanup-on-close (line 286): replace `removeInstance({ runId })` with `dispatch(destroyInstanceIfAllowed(conversationId))`.

**This change fans out to `AICodeEditor.tsx`.** Plan one PR for both files.

---

## `/prompt-apps/[id]` editor — same surgery, no extra files

The `/prompt-apps/[id]` page renders `PromptAppEditor` → `AICodeEditorModal` → `AICodeEditor` → `useAICodeEditor` with `promptKey="prompt-app-ui-editor"`.

It uses the same hook. Once the hook is migrated, the prompt-apps editor moves to the agent system automatically. No `prompt-apps`-specific work needed — the hook owns the bridge.

**Verify in browser after migration:**
- Open any `/prompt-apps/[id]` row.
- Click "Edit with AI".
- Send a request like "make the heading purple".
- Confirm the agent streams a response, the parser extracts edits, the diff renders, and Apply commits the change.
- Confirm conversation cleanup on close (no orphan `agent_conversations` rows).

---

## Side-effects to confirm during migration

1. **Special variables injection** — `buildSpecialVariables` (`useAICodeEditor.ts:254`) populates `selection`, `current_code`, `context`, etc. into the prompt's variable bag. Equivalent on the agent side: pass via `runtime.variables` in the `trigger()` call OR dispatch `setInstanceVariableValue` after creation.
2. **Variable defaults** — currently sourced from `cachedPrompt.variableDefaults`. Agent system: defaults live on `agx_agent.variable_definitions` and are auto-seeded by the launcher.
3. **Resource tracking** — prompt-execution had per-instance resource tracking (`selectResources`). The agent execution system handles resources natively; no parallel cleanup needed.
4. **Multi-turn execution** — `executeMessage` → `executeInstance({ conversationId })`. Conversation continuity is handled by the agent-conversation-id, not by re-invoking start.
5. **Canvas integration** — `useCanvas()` from `features/canvas/` is unchanged; it lives orthogonal to execution.

---

## Implementation checklist

### Phase 1 — Smaller-blast-radius files first (V2 + ContextAware × 2)

- [ ] `AICodeEditorModalV2.tsx` — drop the prompt_builtins fetch, drop prompt-types imports, optionally swap to `useShortcutTrigger`.
- [ ] `ContextAwareCodeEditorModal.tsx` — full TODO recipe.
- [ ] `ContextAwareCodeEditorCompact.tsx` — full TODO recipe.
- [ ] Smoke-test: open `/code` workspace right-click → "Ask AI to edit" → verify both modal and compact variants stream and apply edits.
- [ ] Verify cleanup: no orphan `agent_conversations` after closing.

### Phase 2 — The hook (gates `/prompt-apps/[id]` editor live functionality)

- [ ] Branch off; rewrite `useAICodeEditor.ts` per the TODO at lines 155–212.
- [ ] Update `AICodeEditor.tsx` consumer for new prop/return shape.
- [ ] Browser-test the LIVE `/prompt-apps/[id]` editor — single edit, multi-turn edit, error state, cancel during stream, close mid-stream.
- [ ] Verify the HTML files tab in `MultiFileCodeEditor` still works (consumes `AICodeEditorModalV2`).
- [ ] Verify special-variable injection (`current_code`, `selection`, `context`, language) reaches the agent.

### Phase 3 — Cleanup

- [ ] Remove `getBuiltinId` if unused, OR rename to `getCodeEditorAgentId` and have it return shortcut UUIDs instead.
- [ ] Delete `lib/redux/prompt-execution/builtins.ts` if no other consumer (last one was the demo route).
- [ ] Update `phase-06-code-editor-quick-wrapper.md` status → `complete`.
- [ ] Append change log entry to `INVENTORY.md`.

---

## Out-of-scope (intentionally)

- **`/code` workspace** — already on the agent system, nothing to do.
- **Demo pages** under `app/(legacy)/legacy/demo/component-demo/ai-prog/*` — will inherit the fix or get deleted in Phase 16/18.
- **DB changes** — none. The agent rows already exist at the same UUIDs as the prompt-builtin rows.
- **Shortcut authoring** — already done. Shortcuts exist for all three agents.

---

## Change log

| Date | Who | Change |
|---|---|---|
| 2026-05-04 | claude (audit-legacy-systems) | Created. Verified in DB that all three agents (`c1c1f092…`, `87efa869…`, `970856c5…`) and all three shortcuts (`6231578b…`, `00836ba6…`, `2c301ba1…`) exist. Mapping is 1:1 — no ID remap needed. Recipe consolidates the in-file TODOs across 5 files into a single reference, with the `/prompt-apps/[id]` editor surgery folded in (it shares `useAICodeEditor`). |
