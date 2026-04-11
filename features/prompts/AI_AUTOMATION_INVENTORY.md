# Prompt feature — built-in AI automations

Inventory of **hard-coded prompt IDs, prompt builtins, or dedicated backend AI routes** under `features/prompts` that exist specifically to run AI against the product (not user-authored prompt execution).

## Registry

| ID (UUID) | Type | Purpose | Feature / entry points |
|-----------|------|---------|------------------------|
| `62895ef4-1f3a-499d-9af3-148944462769` | `prompt_builtin` | Generate a full prompt JSON (name, messages, variables, settings) from a described purpose + optional context. | `PromptGenerator.tsx`, `GeneratePromptButton.tsx` → loads `prompt_builtins` row, fills `{{prompt_purpose}}`, streams via `submitChatFastAPI` / `direct_chat`. |
| `6e4e6335-dc04-4946-9435-561352db5b26` | `prompt` (DB row) | Optimize a single **system** message (streaming text output). | `SystemPromptOptimizer.tsx` → `prompts` table, variables `{{current_system_message}}`, `{{additional_guidance}}`. |
| `8b7a674a-07ba-43fc-a750-f189c242e70b` | `prompt` (DB row) | Optimize the **entire prompt object** (JSON in / JSON out). | `FullPromptOptimizer.tsx` (also opened from `SystemPromptOptimizer.tsx`) → variable `{{current_prompt_object}}`. |
| `ce7c5e71-cbdc-4ed1-8dd9-a7eac930b6b8` | `prompt_builtin` | Ad-hoc “quick chat” using the Matrx Custom Chat builtin. | `QuickAIResultsSheet.tsx` → `startPromptInstance` with `getBuiltinId('matrix-custom-chat')`. |
| — | `backend_api` | AI-suggested **category**, **tags**, and **description** for a user prompt (`POST` body: `prompt_id`). No agent/prompt UUID in this repo; resolved on the Python service. | `usePromptCategorizer.ts` → `ENDPOINTS.builtinAgents.categorizeSync` (`/ai/builtin-agents/categorize/sync`). Used by `PromptSettingsModal.tsx`, `PromptMetadataModal.tsx`. |

## Explicitly not listed (same folder)

- **User prompt execution**: `PromptTestPanel`, `PromptBuilder` run path, `usePromptExecution`, `SmartPromptRunner`, `ContextAwarePromptRunner`, modals, etc. They call `direct_chat` / `startPromptInstance` with **the prompt being edited or passed in**, not a fixed automation ID.
- **Default model IDs** (e.g. `c6539f9a-14ff-4449-8a33-644dfe49d2ea` in `promptBuilderService.ts`, `548126f2-…` in `useAvailableModels` / `get-plain-prompt.ts`): **model** defaults, not automation prompts.
- **`constants.ts`**: hard-coded **instruction snippets** (persona, tone, format) merged into user-built prompts in the UI — not standalone AI jobs.
- **Examples** (`examples/*.tsx`): sample `promptId` values for demos only.

## Related: other prompt builtins (outside this folder)

Central metadata for additional builtins lives in `lib/redux/prompt-execution/builtins.ts` (e.g. prompt-app auto-create, code editor, tool UI generator). Those are **not imported** from `features/prompts` today except for the two rows above (`FULL_PROMPT_STRUCTURE_BUILDER`, `matrix-custom-chat` via `getBuiltinId`).
