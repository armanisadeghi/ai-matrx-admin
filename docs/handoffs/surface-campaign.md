---
type: Handoff
title: "Surface campaign — handoff"
description: "Make every registered surface agent-readable, verified on the live site, with one list that stays true."
status: active
updated: 2026-10-22
repos: [matrx-frontend, aidream]
scope: program
feature: surfaces
vision: []
---
# Surface campaign — handoff

**What this is:** the campaign to make every page and window in the app publish what the user is
looking at, so an AI agent launched there sees it. It also removes the platform gaps that stopped the
last attempt.

**Seen from his seat:** on any page, the header button "Agents for this page" → "This page"
names the page and lists its live values. His review inbox gets one row per finished batch.

## Vision — Arman's words

> "It's clear we need to have a management process in place so that the lists and all of that are perfect and all updated."

> "Don't assume the problems are on purpose. The good things are on purpose, but the bad need to be overcome and that's what I need your help with."

> "The key that would make this work really well is if each agent worked on multiple surfaces at once … the agent is fixing x pages and commiting each as he goes. Then, when he's all done, already one or more of the pages are live for testing … even if they did batches of 5, they would fix 5, commit, wait, test 5, recommit..."

## Where it stands (2026-10-22)

- **One path in.** A worker takes pages through the `page-pass` skill
  (`.claude/skills/page-pass/SKILL.md`), dispatched with
  `.claude/skills/page-pass/loop/worker-brief.md` and graded blind with `loop/judge-brief.md`.
  The coordinator brief (`.claude/skills/surface-authoring/references/campaign-coordinator.md`)
  owns the list and the waves; `campaign-worker.md` is the surface-mechanics reference page-pass
  sends workers to.
- **Both lanes work.** A cloud container (15 GB) cannot run the whole-repo type check (killed,
  measured 2026-10-22), so it uses `pnpm type-check:files <files>`; it has no direct-Postgres
  credentials, so it syncs a surface by running `scripts/emit-surface-sync-sql.ts` output through
  the Supabase MCP and checks with the same script's `--check` SELECT (no rows = in sync).
- **The list is computed.** `pnpm surface:census` (about a minute) sees scope builders in this
  repo and inside the installed `@ai-matrx/chat` package, plus mounts that name the surface in
  code (comments never count): a runtime provider, a context menu that resolves per-target context
  (`resolveContextOnOpen`, how `assistant-message` emits), a name constant, or a `surfaceName`
  prop. On 2026-10-22: 278 surfaces, 260 emitting, 18 not; 72 verified / 194 partial / 12 stub;
  16 detected by name only (probe these). Columns: write targets, guide, budgeted values.
- **Cloud gaps that remain:** `check:agent-disclosure` needs the aidream checkout and errors in a
  container; writes through the Supabase MCP sometimes hang for 60 s and do not apply (a sync of
  ~28 KB timed out twice on 2026-10-22; small single updates mostly work) — read back, never
  retry blind.
- **The context budget** (10,000 chars per page, one bundle; `contextBudgetApproval` for
  exceptions) replaced the per-value inline rule; see page-pass area 1.
- **Agents can report problems** with the `surface_feedback` write target on every surface;
  read them with `pnpm surface:feedback`.
- Stale claims from 2026-08-26 were cleared on 2026-10-22.
- About 48 pages had a page-pass between 2026-09-27 and 2026-10-10; the fleet campaign itself
  has not been run.

## Future — everything still open

1. **Run the campaign.** Start a coordinator session with `campaign-coordinator.md`; it dispatches
   page-pass workers with the worker brief. Wave 0 is in that file.

2. **`MatrxDataTable` must tell its host which rows are on screen.**
   - **Where:** `aidream/apps/shared/design-system`, the `data-table` export.
   - **Problem:** it applies column filters, layered filters and sort internally. It exposes neither
     the processed rows nor its query state unless the host takes over every control with
     `controlled-local`, so every table-backed list surface reports the wrong rows once a user
     filters or sorts from a header.
   - **What to add:** an optional read-only callback or handle with the processed rows (before
     pagination) and the query state that produced them. It must not trigger a render loop. Release
     it and adopt it in the SAME session (same-session law).
   - **First adopter:** `features/artifacts/components/CmsArtifactList.tsx`. Feed the rows to
     `buildArtifactListScope`, declare the active column filters and sort in `artifacts.manifest.ts`,
     and delete its "PLATFORM GAP" note.
   - **Done when:** on `/artifacts`, a Name "Contains" filter and a Name sort show the same count and
     order in the probe as on screen.

3. **A creator cannot see some of their own artifacts** (access-sensitive; read
   `docs/official/db-rules.md` §6 and the `protected-resources` skill; start with the `diagnose`
   skill).
   - **Symptom:** `admin@admin.com` has 387 non-deleted `chat.artifact` rows as creator, but
     `/artifacts` (the `/api/artifacts` `list` action) shows 377. For example, 79 flashcard decks in
     the DB but 78 on the Flashcards tab, and 1 report in the DB but 0 on screen.
   - **Worst case:** `/artifacts/3e9a8551-2849-4a8c-8242-d2d1551a2cb1` tells its own creator "You
     don't have access".
   - **Lead:** the user's rows span five organizations (`f9cb3e35…`, `7cd12da2…`, `884d1ce8…` which
     holds the example, `5dc930e9…`, `3e790542…`).
   - **Done when:** DB rows equal the rows shown, per type tab, and the example opens.

4. **DONE 2026-10-22 — cloud sync and check.** `emit-surface-sync-sql.ts` names how to find the
   system org when it is missing, and `--check` prints a read-only SELECT comparing every column
   the direct check compares (surface row and every keyed child table, both archival directions,
   the guide skill). Not covered in the cloud: the direct check's EXPLAIN of every sync
   statement. Still better: an admin RPC pair (`ui.sync_surface(jsonb)` /
   `ui.check_surface(text)`) so no SQL is pasted, which would also dodge the MCP write timeouts.

5. **A docked panel with its own surface replaces the page's surface.**
   - **Problem:** runtimes resolve "deepest wins, most recent breaks ties"
     (`../aidream/apps/shared/chat/src/surfaces/runtime/SurfaceRuntimeContext.tsx`). On `/artifacts`, opening a row in the
     side canvas (`CanvasSurface`, same depth) wipes the list's values from the Agents chrome. The
     user sees both; an agent sees one.
   - **Fix:** decide the platform rule for co-visible surfaces (a page plus a docked panel), write it
     in `features/surfaces/FEATURE.md`, and implement it in the runtime.
   - **Done when:** on `/artifacts` with the canvas open, both the list's values and the canvas's
     values are reachable.

6. **The admin board should compute status, and claims should expire, everywhere they are read.**
   - `/administration/ui/surfaces` should show the census facts beside declared readiness: emitting,
     mirror in sync, claim age, last independent check.
   - A claim older than 6 hours reads as free.
   - (Done 2026-10-22: the five stale 2026-08-26 claims were cleared.)
   - Until this lands, the coordinator's census is the board.

7. **DB rows with no manifest (31 on 2026-09-26).**
   - Split them into rows that legitimately belong to other clients (`chrome-extension/*`,
     `matrx-local/*`, `sms/*`, `voice/*`) and true orphans:
     - renames: `matrx-user/rag`, `rag-data-stores`, `rag-library`, `rag-search`, `rag-viewer`
       (now `knowledge-*`);
     - old admin debug windows: `matrx-admin/*-debug`, `execution-inspector`, `json-truncator`, …
   - Before deleting an orphan, move any `platform.associations` agent bindings that target it.
   - Two value-count drifts to resync: `matrx-user/markdown-pdf`, `matrx-user/settings`.

8. **Surfaces the census sees only by name (16 on 2026-10-22).** Probe each once the release
   carrying the probe fix is live (`pnpm surface:census` lists them as "by name"); either the
   census learns the emitter or readiness drops to `partial`. `masterwork-rulebook` was probed
   live on 2026-10-22 and emits (33 values shown). `working-document` is declared verified but
   nothing in this repo emits it — it is built inside `@ai-matrx/chat` (item 14).

9. **Artifacts surface, remaining gaps.**
   - The access gate distinguishes "no access" from "not found" but emits only
     `artifact_load_state = "gate"`.
   - Right-clicking empty space below the detail cards opens no menu.
   - No outside-helper binding test yet (non-matching names plus the Matrx-vs-matrix check).

10. **Attribution slug.** No `artifacts` product slug exists in
    `@ai-matrx/agents/generated/source-attribution` (generated from aidream), so the surface is
    attributed to `canvas`. If the Content Library should report as its own product, add the slug in
    aidream, regenerate, and update `../aidream/apps/shared/chat/src/agents/utils/source-feature-from-surface.ts`.

11. **Generic scope tools must not build a feature's records half-way.**
    - **Where:** aidream, the `scope_system` agent tool (`expand_scope_type`, `apply` with
      `upsert_context_item` / scope-create ops).
    - **Problem (seen live 2026-09-26 on /education/classes):** asked to "just add" classes, an agent
      used `scope_system` to create three scopes of the org's `class` type. They came out with
      `settings = {}`: no access mode, no join code, no exam dates, and no owner membership. It also
      added `teacher` / `term` / `period` context items to the Class scope TYPE, which changes it for
      everyone in the workspace. To the person this looked like success.
    - **What to add:** a scope type owned by a feature (e.g. slug `class`, owned by education) is
      refused by the generic create/upsert ops. The refusal names the feature's own path ("classes
      are created on My Classes with `create_classes`"). Type-level context-item upserts ask first.
    - **Done when:** the same prompt, run from a page with no classes surface, gets a refusal that
      names My Classes, and nothing is written.
    - **Clean-up:** `Physics 101`, `History 210` and `Spanish II` (org `884d1ce8…`, created
      2026-09-26 21:39 UTC) and the three type-level context items are test debris. The person
      decides whether to delete them.

12. **SETTLED 2026-09-27 — how much of a page an agent sees up front.** The context budget (10,000
    chars per page as one bundle, with an approval path for exceptions) replaced the per-value
    inline rule. `inlineUpTo` is still sent as `max_inline_chars`; set it only as page-pass
    area 1 allows.

13. **Conversations should record the surface they ran on.** (needs a session attached to
    AI-Matrix-Engine/aidream — the send path lives in `@ai-matrx/chat`)
    - **Why:** `pnpm surface:openers` (how often agents open a run with lookups, Arman's surface
      scorecard) can only estimate by matching value names; `chat.conversation` has only
      `source_feature` (e.g. "ai-results"), which does not name the page.
    - **What to add:** the launch request's surface name stored on the conversation
      (`metadata.last_request_context.surface_name`, written wherever `source_feature` is), then
      switch `scripts/surface-openers.ts` to filter by it.
    - **Done when:** the openers query for `matrx-user/education-classes` counts runs by surface,
      not by value names.

14. **Pages hosted inside `@ai-matrx/chat` can only be finished from aidream.** Chat, agent run,
    the message thread and the working document build their scope inside the package. Their
    open feedback (chat: no `transcript` value for its message write targets, row 66868128) and
    their page-pass need a session with AI-Matrix-Engine/aidream attached.

## Resources

- Per-page entry point: `.claude/skills/page-pass/SKILL.md`; dispatch brief `loop/worker-brief.md`;
  blind judge `loop/judge-brief.md`
- Surface mechanics: `.claude/skills/surface-authoring/references/campaign-worker.md`
- Coordinator brief: `.claude/skills/surface-authoring/references/campaign-coordinator.md`
- Tools: `pnpm surface:census`, `pnpm surface:probe` (`--agent` for writes), `pnpm surface:feedback`,
  `pnpm surface:openers`, `pnpm page:look`, `pnpm page:checks`, `pnpm type-check:files`,
  `scripts/emit-surface-sync-sql.ts` (`--check`)
- Pilot, worked example: `features/artifacts/lib/artifacts-scope.ts`,
  `features/artifacts/components/CmsArtifactList.tsx`, `CmsArtifactDetail.tsx`
- Review row for the pilot: https://manage.aimatrx.com/administration/users/agent-review/3eed121b-6a96-4850-a49c-7e309289958b
