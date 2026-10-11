# FEATURE.md — `prompt-blocks`

**Status:** `active` · **Plan:** `common-docs/systems/agents/agent-variable-binding/projects/prompt-blocks/PLAN.md` (§7, §11)

`{{<name>}}` in an agent prompt is replaced on the first turn by the block's current text wrapped in `<name>…</name>`
(server: `matrx_ai/prompt_blocks`). This feature is the frontend: library, editor, picker, chip, Model view report.

| Piece | Where |
|---|---|
| Tokens, trigger, declare lists (pure) | `tokens.ts` |
| Lanes Mine / Organization / System, stale flag | `lanes.ts` |
| Variant condition grammar | `conditions.ts` |
| Data door (direct Supabase, RLS) | `service.ts` |
| Server resolver call (`GET /prompt-blocks/resolve`) | `resolveBlocks.ts` |
| Declared names = the agent draft field `promptBlocks` (saved with the agent); `missing` = declared names with no live block | `agentBlocksStore.ts` |
| Prompt fields hook (Block button, right-click row, `{{<` trigger, picker, chip panel) | `usePromptBlockEditing.tsx` |
| Library `/agents/prompt-blocks`, block page `/agents/prompt-blocks/[id]` | `components/PromptBlock*.tsx`, `VariantsEditor.tsx` |
| Model view | `features/agents/components/model-view` (draws `prompt_blocks` from the preview) |

Rules: insert writes the token AND declares the name; a hand-typed undeclared token offers "Declare" (never auto);
`{{!<name>}}` stays text; a declared block with no row is red ("Missing"); always latest, no pinning;
System lane is editable only by platform admins (RLS decides). Tests: `__tests__/`.
