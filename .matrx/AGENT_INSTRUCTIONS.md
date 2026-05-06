# Matrx Task System — Agent Instructions

A 3-file pipeline for turning user thoughts into completed work. **Read this fully before touching any file in `.matrx/`.**

## Files

| File | Role | Who writes |
|------|------|-----------|
| `TASKS_FROM_USER.md` | Inbox. Free-form. | User drops, agents process. |
| `AGENT_TASKS.md` | Active worklist. Structured. | Agents only. |
| `AGENT_INSTRUCTIONS.md` | This file. System rules. | Maintainers only. |

## The Flow

1. **User writes anything** into `TASKS_FROM_USER.md` under `## Inbox` — bullets, prose, half-thoughts. No format required.
2. **An agent reads the Inbox top-to-bottom.** For each item, classify and act:
   - **Trivial / instant** (one well-scoped edit, low risk, reversible): do it now. Append a `[done <date>]` line under `## Processed` in the inbox file with a one-line outcome. Skip `AGENT_TASKS.md`.
   - **Substantial**: create a task block in `AGENT_TASKS.md` (format below). Append a `[moved <date>] → TASK-NNN` line under `## Processed`.
   - **Unclear**: don't guess on intent. Create the task with status `needs-clarification` and write the exact question in **Notes**, then move on.
3. **Agents working `AGENT_TASKS.md`** execute active tasks, update status, and condense on completion.

The Inbox should trend toward empty. Anything sitting there means an agent hasn't done their job. The Processed log is the audit trail — **never delete from it.**

## Task IDs

Sequential, zero-padded: `TASK-001`, `TASK-002`, ... Find the highest existing ID anywhere in `AGENT_TASKS.md` (Active or Completed) and increment. Never reuse. Never renumber.

## Active task format (`AGENT_TASKS.md`)

```
### TASK-NNN: Short title
- **Status:** ready | in-progress | blocked | needs-clarification
- **Created:** YYYY-MM-DD
- **Source:** brief paraphrase of the user's original line

**Goal**
What "done" looks like in plain language.

**Why**
Motivation. Omit if obvious.

**Subtasks**
- [ ] specific, actionable
- [ ] specific, actionable

**Notes**
Discoveries while working: file paths, gotchas, decisions, the exact question if blocked on the user.
```

Status definitions:
- `ready` — defined, not started.
- `in-progress` — actively being worked. Use sparingly; clear it when you stop.
- `blocked` — waiting on something external. Name what in **Notes**.
- `needs-clarification` — waiting on the user. Write the exact question in **Notes**.

## Completion + condensation (the most important rule)

When a task is finished:

1. **Verify it's actually done** — tests pass, code merged or staged for commit, behavior works. Don't mark prematurely.
2. **Move the block** from Active to Completed.
3. **Condense to one line**, 5–15 words, with a date and a code reference (commit SHA, PR number, or primary file path). The code is now the source of truth; the verbose explanation is dead weight.
4. **Keep Completed sorted newest-first.** When it grows past ~50 entries, move everything older than 90 days into `AGENT_TASKS_ARCHIVE.md` (create if missing).

Condensation example:
- Before: 600-word block describing the chat streaming refactor with 8 subtasks and 3 paragraphs of context.
- After: `- [TASK-014] Refactored chat streaming to use offscreen proxy — 2026-04-30 (7a29e34)`

If you can't condense without losing critical context, the context belongs in a code comment, commit message, or doc — not the task list.

## When to ask vs. proceed

**Ask** when:
- Intent is genuinely ambiguous and a wrong guess wastes meaningful effort.
- The task touches shared state, production, secrets, or destructive operations.
- The user wrote something internally contradictory.

**Proceed** when:
- The task is well-defined and reversible.
- A reasonable interpretation exists and a wrong guess is cheap to undo.

When you ask, set status `needs-clarification` and put the question in **Notes**. Don't block other tasks while waiting.

## Splitting and merging

- **Split** when one inbox item contains multiple independent deliverables. One task per shippable unit.
- **Don't merge** distinct tasks into one block — even if they touch the same area. Cross-reference in **Notes** instead.

## Don'ts

- Don't reformat the user's inbox writing. Paraphrase into `Source`, mark Processed, leave the original prose alone.
- Don't condense an active task. Condensation is for completion only.
- Don't reuse or renumber task IDs.
- Don't delete Processed entries. They're the audit trail.
- Don't add subtasks to a completed task. If something else came up, file a new task.
- Don't take destructive actions (deletions, force-pushes, prod changes) without explicit user confirmation, even if a task seems to authorize it.

## When you arrive at this system cold

If you're an agent picking this up mid-flight:
1. Read this file.
2. Scan `AGENT_TASKS.md` for `needs-clarification` and `blocked` — surface those to the user first.
3. Scan `TASKS_FROM_USER.md` Inbox for unprocessed items.
4. Pick a `ready` task and execute, or process the inbox.
