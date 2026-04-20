# Phase 6 — Code Editor Quick Wrapper

**Status:** not-started
**Owner:** _unassigned_
**Prerequisites:** Phase 5
**Unblocks:** Phase 15

## Goal

Keep the one live coding feature working (the AI-assisted editor used when a user edits their prompt_app component) by swapping `usePromptRunner` → `useAgentLauncher` inside existing code-editor components. **Thin wrapper only.** Do not redesign — Phase 15 replaces everything.

## Files to touch
- `features/code-editor/components/AICodeEditorModalV2.tsx`
- `features/code-editor/components/AICodeEditor.tsx`
- `features/code-editor/components/ContextAwareCodeEditorCompact.tsx`
- `features/code-editor/components/ContextAwareCodeEditorModal.tsx`

## Preserve
- `features/code-editor/utils/applyCodeEdits.ts`
- `features/code-editor/utils/parseCodeEdits.ts`
- `features/code-editor/utils/generateDiff.ts`

Phase 15 will replace these with agent-tool-driven equivalents, but until then they stay.

## Success criteria
- [ ] Zero `usePromptRunner` imports remain in `features/code-editor/`.
- [ ] The prompt-app component editor in `/prompt-apps/[id]` still works end-to-end.
- [ ] This phase's code is marked with a `// Phase 6 wrapper — replaced in Phase 15` comment at each touched file's top (the one exception to our no-comments rule).

## Change log
| Date | Who | Change |
|---|---|---|
