---
name: create-render-block-skill
subject: [agents/agent-skills, architecture/content-ir]
description: "Platform agent skill and content blocks that teach agents a render block, building the block first if new. Use when asked to create the skill for a render block, skill-ify flashcards or quiz, add content blocks for a block, or add a new render block type. NOT for tool result displays (use create-tool-renderer)."
---

# Create a render block's skill + content blocks

<!-- rules:stamp -->
> Rules from `common-docs/systems/architecture/content-ir/FEATURE.md` — edit there, never here (`python3 common-docs/meta/scripts/one_home.py --write`).

1. **Every schema declares `__kind`** at every object position: `const` + `required` where the identity is known, and declared but optional everywhere else. The only exceptions are the `boolean`/`number` scalar roots and the `json` kind. BEFORE triggers guarantee this on `kind_definition`, `kind_example`, `kind_instance` and `agent.definition.output_schema` (`wf_066`). Never add a write-time check that rejects an unmarked schema, because the trigger fixes it.
2. **Never strip `__kind` and never loosen a schema to fit the data.** Bring the data up to the schema with `content_ir.stamp_markers_from_schema`. Never reintroduce `injectKind: false`, and never hand-patch `emitted_json_schema`, because it is emitted from the kind's source. Guards: aidream `scripts/check_kind_marker_law.py --live` and matrx-frontend `pnpm check:kind-marker-law`.
3. **`__kind` is the first key.** An unfenced bound-agent stream is typed from its first key (`block_detector.root_kind_declaration`). `jsonb` reorders keys, so SQL that mints an instance builds it as text/`json` and reads the row back.
4. **An agent is never asked for plain JSON.** A structured result is a kind instance or it is markdown.
5. **A registered kind is not a payload with a `__kind` key.** `content_ir.evaluate_kind_activation` checks that its example validates, it has a real output component, and its schema is unique; the result is advice shown beside the switch (`warnings`), never a refusal (rule 24). The generic key/value view is not a component; activation changes go through `set_kind_activation`.
6. **Machine contracts are quarantined by residence.** They live in `content_ir.io_contract`. The family names `action_io`, `tool_io` and `agent_io` are reserved and never appear on a `kind_definition` row. `workflow_io` is a pinned slug set, and `data_only` is informational only: it never removes a form. Guard: `scripts/check_kind_family_law.py`.
7. **`directive_v` is a reserved prefix.** No hand-authored or user kind may start with it (enforced in `@kind`, kind authoring and the shape creator, and checked by `scripts/validate_kind_directive_registry.py` at zero). Capability is derived from the directive class and never stored.
8. **The position law has one home: `matrx_graph.content_ir.directives`.** Only `create`, `update`, `delete` and `action` execute, and only at an agent's output root. Only `reference` and `secret` resolve inside content. A side effect found in content renders as a button and runs only on a human click.
9. **The directive ledger key is `sha256(namespace·type·item)` with `kind` excluded.** Changing how `type` is derived from the slug re-applies every past action. Keep `"matrx"` in `MATRX_OWNED_BLOCK_TYPES`, never seed a `kind_definition` row per directive, and never attach `__ir` to a `matrx` block, or directives render as raw JSON.
10. **Shared logic lives once, in `aidream/apps/shared/content-ir-core` (kernel) and `content-ir-react` (route, resolver, shared views).** No consumer keeps a local copy of a parser, a route decision or the directive decoder. The kernel refuses React, and the render layer refuses Next.js, Redux and Supabase. Consumers ride the npm `latest` tag, and versions live in each package's CHANGELOG.
11. **Detection is identical in Python and TypeScript.** A container never hides a kind: when a region closes, balanced JSON objects with a non-empty `__kind` become their own instances, in document order. XML owns its body until its root closes, and a ```` ```matrx ```` fence is a container. Shared conformance vectors pin markdown-fence nesting. A change to one runtime lands with the other and its vectors.
12. **A streaming partial follows the partial wire contract.** Partials ride `metadata.__ir_partial`. The `state` is `partial`, `superseded` or `retracted`, and exactly one terminal state ends every partial, so a skeleton can never stick. Every partial is closed into valid JSON. The key is absent on most events: consumers carry state forward, never reset on absence.
13. **Runtime wrappers delegate, never reimplement.** `node_outcome` renders its inner kind through the ordinary route. Elided payloads ride once, through `output_ref`.
14. **A skipped check is never a pass.** A degraded verdict carries a named `KindDegradedReason`. Only `catalog_unreachable` is a loud skip, `KindContractViolation` is non-retryable, and an invalid typed output is never stored as a success.
15. **Enforcement is the code constant `matrx_graph.kinds.KIND_ENFORCEMENT`, never an environment variable.** The DB `admission_config` ratchet coexists with it on purpose.
16. **Undeclared keys never sit at a payload's root.** They go in a declared map (for example `extras`).
17. **A primitive binds; it does not get a new component.** A shape that maps onto an existing primitive binds through the primitive plus `props_transform`. Block-type string values, routes, dispatch outcomes and stored content bytes are frozen, and a rename that changes one is a defect.
18. **Every emitted kind declares a disposition.** A kind with none gets no storage and files an `ops.system_error` row (`kind_disposition_undeclared`). New kind data lands in records, never in `content_ir.kind_instance`.
19. **A missing or broken component is replaced at once and reviewed afterwards.** The replacement shows a "just built" mark and a one-click way back to the plain data view. This never replaces a working, registered component without review.
20. **Reuse before you mint.** Well-known kinds (web results, citations, address, rating) are reused through provider translation functions, never re-minted under a new name. `metadata.maturity = verified` is earned only by the verification pass.
21. **Every active shape has a skill, and a hand-written one is never overwritten**. Generated skills come from the non-AI template (`kind_create_skill`) and carry `metadata.created_via`; a weekly refresh regenerates only those. A shape with no description gets a concise one from a weekly batch run on a fast model.
22. **Shapes picked in chat: up to a knob (default 10) go to the model in full; past it, the model gets each shape's name and description and loads the ones it uses**. Picks travel as `output_kinds` (kind slugs) on start, chat and continue requests, never as skill ids; an omitted field means the chat's saved picks (`chat.conversation.metadata.run_configuration.outputKinds`). The server alone resolves shape → skill (aidream `services/tooling/output_kinds.py`, knob `chat.output_kinds.full_body_max`).
23. **An agent locked to a structured output schema answers in its own shape; a different picked shape is never an error**. The picker warns at the moment of selection, and a saved conflicting pick shows the same warning; the server drops picks the agent cannot honor and sends a visible warning (`output_kind_locked`), never a failed run. The agent's schema is never modified per request.
24. **Every kind, kind component, surface and converter is born ACTIVE**, from every screen, tool, seed script or automation. Switching one off is a deliberate act; turning one on is never refused. Never write `is_active=False` on create and never add a check that blocks activation or disables the Activate button.
25. **A streamed shape's render state is a one-way ratchet:** markdown text → JSON found → `__kind` found → kind resolved and its component rendering. Once forward it never goes back (no re-mount, no generic or text flash) because a chunk is partial, unparseable or fails validation; hold the last good render and fall back only on strong, repeated evidence (the stream ended and the final value is invalid). Mount count stays 1 per block; test with token-by-token replay including mid-key and mid-`__kind` splits.
26. **Rich content helps, never hinders**. Every surface offers copy as markdown and copy as plain text one click away; formatting buttons work in every mode including raw markdown; editing happens in place. Replacing a UI never ships without full parity verified by screenshot in EVERY mode, and "done" means a clipboard capture plus a screenshot of the visible button, not a green guard. Judge each surface from the user's seat (copy, select, format, edit in place, every mode, window panels, phone) and audit every surface for consistency; copy never puts raw `<artifact>` tags on the clipboard. Every rename or cleanup ships with its full inventory (tools, routes, DB, tokens, copy, docs, tests) and is done 100%, never half-way; the [domain tree](/policies/domain-tree.md) wins on names and placement. The basics come before any side work, and when Arman says "focus on my vision" every other lane drops.
27. **A kind's name and schema are ONE shared contract per slug; how it looks layers user → org → system, most personal wins**. Anyone fixes a bad render for themselves in one click, org admins for their organization, and super admins get a link to the admin pages for a global change (never admin power on a user route). The fix ladder starts at "kind not registered".
<!-- rules:stamp-end -->

Given a render block, produce the two things that make agents actually USE it:

1. **A platform skill** — a `skl_definitions` row (`skill_type='render_block'`, `is_system=true`) whose **body** is the teaching doc injected into an agent's system prompt when the agent includes it. Optionally the render registry (`agent.prompt_block` + per-platform `skl_render_components`).
2. **Content blocks** — `content_blocks` rows: the lightweight prompt snippets a user injects into ONE agent's instructions from the right-click context menu ("a couple of clicks"). Grouped in a `shortcut_categories` (placement `content-block`) category.

Both ship in **ONE idempotent migration**, applied AND live-verified. That's the whole job for an existing block. For a NEW block type you first build the block end-to-end (Part 2), then do Part 1. This is the dispatchable recipe for the 40-50 existing blocks that still need skills and for any new block; Mermaid is the paved worked example throughout.

Not this recipe: a one-off MCP tool result display (the `create-tool-renderer` skill) or printing a block (the `block-print-system` skill).

## Cardinal rules

- **Read the block's real contract — never invent syntax.** Open the block's renderer + parser (FE `components/mardown-display/blocks/<name>/`, server `packages/matrx-ai/.../parsers/`) and copy the EXACT fence/tag, sub-types, and the failure modes the parser tolerates. A teaching doc with wrong syntax trains agents to emit broken blocks.
- **The body IS the reference — `skl_resources` are NOT agent-reachable.** `skill_get` (aidream `packages/matrx-ai/.../tools/implementations/skill.py`) returns the body only. Put per-sub-type examples IN the body; paging handles length. Do not create resource rows expecting agents to read them.
- **Human labels, no internal jargon.** Users are non-technical. Content blocks say "Flowchart", "Mind Map", "Pie Chart" — never "mermaid X". The block's catalog already names sub-types as user-facing features; reuse those names.
- **A migration changes NOTHING until applied AND verified live.** Writing the `.sql` and reporting "done" is the single most damaging mistake. Apply via the aidream applier (records the ledger), then query the live rows with a throwaway admin-client script. Trust the DB, never the file.
- **Real verification only.** No mock confirmations. For the skill: confirm `skill_get` returns the body / the agent's preamble contains it. For content blocks: confirm the rows are live AND appear in the menu.

## Decide first: does the render block already EXIST?

- **EXISTING** (flashcards, quiz, timeline, decision_tree, comparison_table, presentation, … the 40-50): it already streams + renders. You ONLY create the skill + content blocks → **Part 1**.
- **NEW** (no detection, no renderer): build it end-to-end first → **Part 2**, then **Part 1**.

---

## Part 1 — Skill + content blocks (the common, dispatchable task)

### 1. Gather the block's truth (read, don't guess)
- The exact trigger: a ` ```language ` fence, a `<tag>`, or a JSON root key. Find it in `components/mardown-display/markdown-classification/processors/utils/content-splitter-v2.ts` and/or aidream `block_detector.py`.
- The sub-types / variants (the block's catalog or model enum).
- The syntax rules that BREAK rendering (read the parser's tolerances + the renderer's error path).
- One correct minimal example per sub-type.

### 2. Write the skill body (`skl_definitions.body`, ~250-400 lines markdown)
Structure that works (mermaid's body is the template):
1. **What it is** — one fence/tag per block; renders live + becomes an editable/persisted artifact; never wrap in `<artifact>` if it's a fence.
2. **When to use which sub-type** — an intent→type table, presented as the user-facing features.
3. **Fence/tag + structure rules.**
4. **Syntax rules that prevent render failures** — the real breakage class, each with wrong→right.
5. **Sizing/limits.**
6. **Editing etiquette** — return ONE complete updated block, preserve untouched ids, keep the type.
7. **Per-sub-type quick reference** — one correct example each (this is what would have been `skl_resources`; it lives in the body).

Row fields: `skill_id` (kebab business key, UNIQUE), `skill_type='render_block'`, `is_system=true`, `is_public=true`, scope columns (`user_id`/`organization_id`/`project_id`/`task_id`) **NULL** = global, `category_id` → the `skl_categories` `render-blocks` row (create with `ON CONFLICT (category_key) DO NOTHING` if absent), `platform_targets='["web"]'::jsonb`, `version`. **Pre-check live**: existing `is_system=true` rows' `user_id` convention; `skl_definitions.skill_id` is UNIQUE per `(skill_id,user_id,org,project)` composite → use `INSERT … SELECT … WHERE NOT EXISTS` (NOT `ON CONFLICT (skill_id)` — that errors on the composite key).

### 3. (Render registry, optional) `agent.prompt_block` + `skl_render_components`
- `agent.prompt_block`: `block_id` (no unique constraint → `WHERE NOT EXISTS`), linked to the skill.
- `skl_render_components`: one `web` row `is_active=true` with the real `import_path`; `chrome-extension`/`desktop`/`mobile` rows `is_active=false` — the explicit notation that those clients await the server-side processing switch. UNIQUE `(block_id, platform)` → `ON CONFLICT DO UPDATE`. **Pre-check** `SELECT DISTINCT platform FROM skl_render_components` for the vocabulary.

### 4. Write the content blocks (`content_blocks` rows)
- A category in `shortcut_categories` (`placement_type='content-block'`, global NULL scope). Name it for the family ("Diagrams", "Education", "Timeline"…). `WHERE NOT EXISTS` (no business-key unique).
- **One block per sub-type** + **a few combos** (each teaches "pick the right type for the job") + **one general** all-types block. Human labels. `block_id` is UNIQUE → `ON CONFLICT (block_id) DO UPDATE`.
- **Template style** (match the existing Timeline/Interactive-Diagram blocks): framing line → one concrete ` ```fence ` example → 3-6 tight rules. **~250-600 chars.** Dollar-quote each (`$CB$…$CB$`) so backticks/quotes need no escaping.
- `icon_name` is cosmetic (the menu uses a generic icon); pick a sensible Lucide name.

### 5. One migration, applied + ledger-recorded
- `migrations/<block>_content_blocks.sql` (or fold into the block's platform migration). `BEGIN; … COMMIT;`, idempotent on business keys.
- Apply from **aidream**: `uv run python db/apply_migrations.py --source matrx-frontend --dry-run` (confirm it'd apply ONLY yours), then without `--dry-run` (applies in a txn + records the ledger). Then `pnpm -s check:migrations` in frontend = clean.
- **No `pnpm db-types` needed** — these are data rows, not schema. (Only run it if you added columns.)

### 6. Verify LIVE (throwaway admin-client query)
```ts
// node --env-file=.env.local --import tsx <script>
import { createAdminClient } from "@/utils/supabase/adminClient";
// SELECT the skl_definitions row (body length, type, is_system, category linked)
// SELECT the content_blocks (all in the new category, is_active, template has the fence)
```
Confirm counts + that each template contains the real fence. Delete the script after.

### 7. Turn-on + hand off (don't auto-attach to a prod agent)
- The skill is **opt-in**: it reaches a prompt only when an agent has it in `agx_agent.skill_config.included` (aidream `skill_merge.apply_unified_skills`). Do NOT mass-attach without the user's call (modifying a shared agent's config is their decision — the auto-classifier will block it, correctly).
- Content blocks are **user-driven**: right-click an agent's instructions → context menu → the category → a block injects. That IS the feature; tell the user the path.

---

## Part 2 — Building a NEW render block end-to-end

Only when the block type doesn't exist. The full layer map (mermaid is the reference implementation — read its diff):

1. **Server (aidream, do FIRST — unblocks type sync):** enum in `processing/blocks/models/base.py`; a Pydantic model + a **forgiving** parser (never raises) in `models/` + `parsers/`; `block_detector.py` (`SPECIAL_CODE_LANGUAGES` + any alias) ; `stream_processor.py` (classification set + parser map); `packages/matrx-connect/.../render_blocks.py` registry (3 entries). Then `pnpm sync-types:fast` (local backend up) → the type lands in `@ai-matrx/agents/generated/stream-events`. Tests in `processing/blocks/tests/`; zero integrity-check errors on import.
2. **Client core** `components/<block>/`: a dynamic-import runtime if the renderer is heavy (keep the lib out of the initial bundle), a forgiving sanitizer if the format is fragile, the renderer with last-good behavior during streaming.
3. **Detection (FE):** `content-splitter-v2.ts` `SPECIAL_CODE_LANGUAGES`; `stream-block-accumulator.ts` for live promotion; `BlockComponentRegistry.tsx` + `BlockRenderer.tsx`; the chat wrapper `components/mardown-display/blocks/<block>/<Block>.tsx`; the DB round-trip in `…/utils/assemble-cx-content-blocks.ts` (reconstruct as the SAME fence/tag — the XML-wrapper default corrupts fence types).
4. **Artifact/canvas (if it should persist + edit) — registry-driven, mostly free:** add a `{canvasType, aliases, standaloneAliases, materializable:true}` row in `features/canvas/artifact-types/artifact-type-registry.ts`, a lazy entry in `artifact-renderers.tsx`, and a thin `<X>Artifact.tsx` wrapper in `artifact-types/renderers/`; add the canvasType to `CanvasContentType` (`features/canvas/redux/canvasSlice.ts`). Materialization markers (`materialization/reconcileArtifacts.ts` derives them FROM the registry), canvas render (`canvas/core/CanvasBody.tsx`), and public render (`shared/PublicCanvasRenderer.tsx`) then come free from the one registration. Types needing user-state persistence (answers, etc.) set `persistenceStrategy:"generic"` (or `"custom"` + adapter) in the registry — never a per-block persistence hook. Client-only types add a `*RenderBlock` type in `components/mardown-display/markdown-classification/processors/utils/client-blocks.ts` (the client-only vocabulary; the server data-event wrappers are GENERATED into `stream-events.ts` — never hand-add those).
5. **Editing (optional):** a doc model + per-type adapters with a **round-trip fidelity gate** (downgrade to code-only rather than ever destroy content), a workbench, session-versioning saves.
6. **Surface + agent round trip (optional):** a `features/surfaces/manifests/<x>.manifest.ts` + registry entry; an "Edit with AI" hook cloned from `features/transcription-cleanup/hooks/useAiPostProcess.ts`.
7. **Then Part 1** (skill + content blocks) + docs + a `/demos` page + `FOUND_DEFECTS` for any deferred surface.

See the block-registry recipe for the FE-only flavors: `components/mardown-display/chat-markdown/block-registry/ADDING_BLOCKS.md` (mermaid is the Flavor-F worked example).

---

## Gotchas that cost real time

- **Turbopack HMR corrupts after many rapid edits** ("module factory is not available" / renders stick on skeletons app-wide). A browser reload does NOT fix it — **restart the dev server**. First import of a heavy lib chunk also takes 15-40s in dev; skeletons during that window are normal.
- **`pnpm db-types` ≠ `pnpm sync-types`.** db-types regenerates Supabase types (`types/database.types.ts`); sync-types regenerates the Python/stream types (`@ai-matrx/agents/generated/stream-events`) from the running backend. A new block type needs sync-types.
- **The tree often has other teams' uncommitted work.** Stage ONLY your files explicitly; never `git add -A`.
- **Pushing `main` deploys + may carry others' commits.** Confirm before pushing if the situation shifted.

## Mermaid reference (copy from these)

- Platform migration: `migrations/mermaid_render_block_platform.sql` (surface + skill + render registry + content block + RPC). Content blocks: `migrations/mermaid_content_blocks.sql` (the 18-block "Diagrams" set — the per-type + combo pattern).
- Handoff (remaining operational turn-on): `docs/handoffs/mermaid-render-block.md`.
- Frontend commits: `feat(mermaid): first-class … render block`, `feat(mermaid): content blocks per diagram type + combos`. aidream: the mermaid pipeline on `main`.
