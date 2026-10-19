# Memory Lab

> Product truth (vision, plan, decisions) lives in common-docs:
> `systems/chat/agent-memory/VISION.md` and `systems/chat/agent-memory/projects/memory-v1/PLAN.md` §4.
> This file holds only this repo's mechanics.

Route: `/administration/intelligence/memory-lab` (trial list) and `/administration/intelligence/memory-lab/[trialId]` (workspace). Admin nav: Intelligence › Memory Lab.

## What it does

A **trial** (`chat.memory_trial`) replays one person's historic chat conversations through the memory agents (reviewer, reflection, steward) into a **sandbox store** (`trial.files`, `{path: content}`), never their live memory. Every agent pass is a `chat.memory_trial_step` row (files before and after, the agent's `memory_edits`, per-edit results), so any point in the trial can be reopened.

## Files

| File | Role |
|---|---|
| `types.ts` | Trial / step / edit shapes and the defensive jsonb parsers; roles → provision points. |
| `data.ts` | Supabase reads/writes (trials, steps, the person's conversations + their agents); the capture call with full values; the apply door. |
| `useMemoryLabRunner.ts` | One pass: capture → bind variables → run through the execution system → apply. Sequential "review next N" with stop. |
| `components/TrialList.tsx` | List + archive filter + "New trial" (admin user search). |
| `components/TrialWorkspace.tsx` | Three columns: conversations · agents/bindings, Reflect, steward box, step timeline, notes · store. |
| `components/StepTimeline.tsx` | Step cards: edits (why, evidence, diff), questions, doors to provisions, run conversation, Watch AI. |
| `components/RoleAgentsPanel.tsx` | Agent per role (the one agent picker) and the variable → provision value binding editor. |
| `components/ConversationsColumn.tsx` | The person's conversations oldest first, chat-agents filter, review state per conversation. |
| `components/MemoryFilesPanel.tsx` | Store tree + file content, current or after any step. |

## Invariants

- **The client never writes `files` or a step.** It creates trials, edits title / agents / bindings / notes / status, and owns `subject_label` and `pending_runs` (real columns; `metadata` is guarded by `_metadata_guard` and never written by the client). The server's `POST /memory-lab/trials/{id}/apply` validates and applies the run's `memory_edits` and writes the step.
- **Provision first.** A role with no agent still captures its provision (`memory.conversation_review` with subject = conversation, plus `memory.store` with subject = trial for a review; `memory.store` alone for reflection and the steward). The lab always asks for full values (`debug_view=1`) and reads the saved snapshot back through `loadProvisionSnapshot`.
- **Archived trial:** Review, Reflect, the steward box, Apply and the agent / binding controls are off in place with one short reason.
- **Admin reads:** every browser Supabase client rides the admin lane on /administration (`installAdminLane`), which opens `is_platform_admin()` and the `platform_admin_read` policies on chat.conversation, agent.definition and the trial tables.
- **Bindings:** options are seeded from `POINT_VALUE_NAMES` (the server's declared value names), so a binding can be set before any capture; `trial.bindings = {role: {variable: "<point key>.<value name>"}}`; an unmapped variable takes the value of the same name. Provision values ride as named `variables`; `user_input` carries only what the admin typed to the steward.
- **Runs are watchable.** Every run starts through `launchAgentExecution` (client-minted `conversationId`, `store` on), registers in the run set `memory-lab:<trialId>`, and floats in the live run window; steps open in Watch AI by run conversation.
- **A reload does not lose a run.** A run is written to `pending_runs` (whole-column write under the row's version guard) before it starts and removed when applied; the workspace offers "Apply its edits" (the server reads the output from the run conversation) or "Discard".
- **Conversations:** `chat.conversation` where `created_by` = person, `conversation_type = 'standard'`, not deleted, oldest first, read with `readAllRows`; agents read separately from `agent.definition` (no cross-schema join). A plain chat with no agent counts as a chat conversation.
- The trial's organization is the admin's active organization at create (`ensureOrgId(null)`).

## Change Log

- 2026-10-19 — Live walk fixes: the conversation list draws 100 rows at a time (a person can hold thousands); no message count (the stored counter is stale on some chats); text styles fixed (type-caption never existed).
- 2026-10-19 — subject_label / pending_runs moved off metadata onto columns; binding options before capture; archived trials read-only; runner compiles under the React Compiler (no try…finally).
- 2026-10-19 — Created (memory v1 §4): trial list, workspace, runner, step timeline, store view.
