---
name: shape-system
subject: architecture/content-ir
description: "The Shape System — the content_ir kind registry for structured content. Use when adding, activating, or rendering a kind/shape, writing `__kind` JSON, kind schemas or samples, XML-tag/fence detection surfaces, kind components, workflow node input_kind/output_kind, or binding agent output to a kind."
---

# Shape System — how to add to it (and never around it)

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
21. **Every active shape has a skill, and a hand-written one is never overwritten** (Arman, 2026-10-04). Generated skills come from the non-AI template (`kind_create_skill`) and carry `metadata.created_via`; a weekly refresh regenerates only those. A shape with no description gets a concise one from a weekly batch run on a fast model.
22. **Shapes picked in chat: up to a knob (default 10) go to the model in full; past it, the model gets each shape's name and description and loads the ones it uses** (Arman, 2026-10-04). Picks travel as `output_kinds` (kind slugs) on start, chat and continue requests, never as skill ids; an omitted field means the chat's saved picks (`chat.conversation.metadata.run_configuration.outputKinds`). The server alone resolves shape → skill (aidream `services/tooling/output_kinds.py`, knob `chat.output_kinds.full_body_max`).
23. **An agent locked to a structured output schema answers in its own shape; a different picked shape is never an error** (Arman, 2026-10-04, 2026-10-05). The picker warns at the moment of selection, and a saved conflicting pick shows the same warning; the server drops picks the agent cannot honor and sends a visible warning (`output_kind_locked`), never a failed run. The agent's schema is never modified per request.
24. **Every kind, kind component, surface and converter is born ACTIVE** (Arman, 2026-10-13), from every screen, tool, seed script or automation. Switching one off is a deliberate act; turning one on is never refused. Never write `is_active=False` on create and never add a check that blocks activation or disables the Activate button.
25. **A streamed shape's render state is a one-way ratchet:** markdown text → JSON found → `__kind` found → kind resolved and its component rendering. Once forward it never goes back (no re-mount, no generic or text flash) because a chunk is partial, unparseable or fails validation; hold the last good render and fall back only on strong, repeated evidence (the stream ended and the final value is invalid). Mount count stays 1 per block; test with token-by-token replay including mid-key and mid-`__kind` splits.
26. **Rich content helps, never hinders** (Arman, 2026-10-04). Every surface offers copy as markdown and copy as plain text one click away; formatting buttons work in every mode including raw markdown; editing happens in place. Replacing a UI never ships without full parity verified by screenshot in EVERY mode, and "done" means a clipboard capture plus a screenshot of the visible button, not a green guard. Judge each surface from the user's seat (copy, select, format, edit in place, every mode, window panels, phone) and audit every surface for consistency; copy never puts raw `<artifact>` tags on the clipboard. Every rename or cleanup ships with its full inventory (tools, routes, DB, tokens, copy, docs, tests) and is done 100%, never half-way; the [domain tree](/policies/domain-tree.md) wins on names and placement. The basics come before any side work, and when Arman says "focus on my vision" every other lane drops.
27. **A kind's name and schema are ONE shared contract per slug; how it looks layers user → org → system, most personal wins** (Arman, 2026-10-14). Anyone fixes a bad render for themselves in one click, org admins for their organization, and super admins get a link to the admin pages for a global change (never admin power on a user route). The fix ladder starts at "kind not registered".
<!-- rules:stamp-end -->

**Glossary:** "Shape" = product name; **"kind"** = the technical noun (`content_ir.kind_definition.kind`). One kind = one named, versioned structure that every platform (web, Python, workflow-studio, React Native later) validates and renders against.

**Operating doc (read it):** [`features/content-ir/docs/SHAPE_SYSTEM.md`](../../../features/content-ir/docs/SHAPE_SYSTEM.md) — rulings, posture, roadmap. FEATURE.md invariants: [`features/content-ir/FEATURE.md`](../../../features/content-ir/FEATURE.md).

## The model in three lines

- A Shape carries 7 assets: schema · skill(s) · content block · output component · input component · samples (`kind_example`) · pydantic mirror.
- Every input surface (`__kind` JSON, XML tag, fence, tool result) converges to canonical `__kind` JSON at DETECTION (`kind_surface` is the one list). Below that boundary everything is format-agnostic by construction.
- Consumers: agent outputs, **workflow node I/O (live)**, tool results (Stage 7), custom apps.

## Adding a kind (the paved road)

1. **Schema** — insert the `kind_definition` row (fields in `data[]` for ts-owned; `emitted_json_schema` always; org = system org `39c38960-d30c-4840-b0c1-c9960de95582` for platform kinds, `visibility='public'`). Python-owned kinds derive the schema from the pydantic model: `Model.model_json_schema()` — never hand-write what a model can emit. Idempotent SQL, applied via Supabase MCP, ledgered in `public._schema_migrations`.
2. **Sample** — one `kind_example` row per kind@version (`is_canonical=true`). **Never write `validation_status` yourself** — the `kind_example_recompute_validation` trigger DERIVES it on every write, so a fabricated `passed` is both impossible and a defect. Helper: `pnpm shape:sample <kind> --file|--stdin [--apply]`.
3. **Component** — register the web component. Two tiers, both satisfy the render leg: **compiled** (`kinds/<slug>.ts` → append to `SYSTEM_KIND_DEFINITIONS` → register the block type in `SHAPE_BLOCK_DISPATCH` in `aidream/apps/shared/rich-content/src/display/chat-markdown/block-registry/block-dispatch.tsx`; never add a switch case) or **DB-authored** (a `source='db'` `kind_component` row — no repo change, no deploy; what the creator agent writes). A **bundled** row's `component_key` MUST resolve in `block-dispatch.tsx` — `pnpm check:shapes:components` is a blocking release gate, because a dangling key changes nothing at runtime (the compiled bridge routes anyway) while the registry claims coverage. A kind without either stays inactive and renders the generic viewer (correct, not a failure).
4. **Skill + content block** — one skill per kind per syntax (`kind_<slug>` JSON / `kind_<slug>_xml`); skill bodies teach the REAL parser failure modes. Blocks pair with the skill under the **Agent Skills** category (two per skill: simple + complex), linked via `platform.associations`. Coexist-not-clobber: never overwrite a live legacy block; use a `-kind` suffix during transition.
5. **Surface** — ONLY for a non-JSON arrival form (XML tag / custom fence language). `__kind` JSON needs NO surface: the parser detects it natively in a ```json fence. A row is inert without its `parser_strategy` implemented in `surfaces/xml-finalize.ts#SURFACE_PARSER_STRATEGIES`, so registering one without the parser mints a phantom row (8 such `json_root_key` rows already exist — do not add a ninth). After inserting, run `pnpm check:shapes:surfaces:refresh` — the compiled bootstraps in BOTH repos are generated from `kind_surface`. Never hand-add a tag/fence literal to `stream-block-accumulator.ts` / `content-splitter-v2.ts` / `block_detector.py`.
6. **Activate** — `content_ir.set_kind_activation(id, true)` is the ONE write path for `is_active`; it runs the dual gate (structural leg on the sample + render leg on the component) and raises with the specific missing asset. Surfaces: the owner control on `/shapes/[kind]`, or the `kind_activate` agent tool. **This step is not optional** — an inactive kind renders through the generic viewer and, critically, `isKindBindable` refuses to bind it to an agent's structured output. The admin Gate tab (`/administration/kind-registry/<kind>?tab=gate`) shows the verdict read-only and never writes.
7. **Coverage gates** — a new kind slug or surface token that no crosswalk rule claims FAILS the run. `pnpm check:shapes:crosswalk:refresh`, then `pnpm check:content-ir:strict` (crosswalk + aidream twin + `check:shapes --strict`).

## Workflow node I/O (live)

- `NodeSpec.output_kind` is MANDATORY for non-dynamic nodes (structural kind for stable shapes; generic `json` minimum). `input_kind` gates inputs pre-execute. Per-node authored overrides: `data.input_kind` / `data.output_kind`. Read `packages/matrx-graph/docs/node-authoring.md` §kinds (aidream repo) before adding a node.
- Runtime: `matrx_graph.kinds.get_kind / validate_against_kind` (loud-fail-open). After ANY kind registry mutation call `invalidate_kind_catalog_cache()` (and remember the FE warm registry re-reads on its own cadence).
- LLM binding: `matrx_ai.kinds.response_format_for_kind(slug)` → strict portable response_format. Unknown/unportable kinds decline loudly with `None`.

## Buttons, AI runs and saved results inside a shape

A kind component receives `runAction` and `itemState` beside `data`: it can run a shortcut
on one item (in a window, or in the background saving the result onto the item), keep a
person's pick, and show saved results and generated images. How: the **`shape-authoring`**
skill. Never answer "a shape can't trigger an agent."

## Hard rules

- **One registry.** Never a parallel kind list, detector, sample store, or component map. Extending `content_ir` IS the feature.
- **Verify live, never trust reports** — after any DB write, `execute_sql` the counts; after any render change, a runtime marker or screenshot.
- **XML is not legacy — and neither is anything else named "legacy" in this feature.** Every `*-legacy-text.ts`, every `*_legacy_text` strategy key, `legacyBlockType`, and `toLegacyServerData` is LIVE code carrying migration-narrative vocabulary that froze into identifiers. `legacyBlockType` in particular is THE render key — `kind-route.ts` sets `block.type` from it and `block-dispatch.tsx` routes on it; nothing renders without it. Never read the name as permission to delete or "modernize". Rename pending (~100 files + 23 DB rows + an aidream generated file).
- **Render-leg satisfier order is load-bearing.** The compiled-bridge check runs FIRST because it actually exercises the bridge; the resolved `kind_component` row is the last resort. Reversing them short-circuits the "No `<kind>` available" guard for every compiled kind. Pinned by tests — do not reorder.
- **Matrx Directives (MatrxEnvelope) is off-limits** except the collision guard and its `kind_surface` row. Its invariants are listed in SHAPE_SYSTEM.md.
- **`sample_data` on kind_definition is interim** — new samples go to `kind_example`; never add new readers of `sample_data`.
- **DB changes follow the db-change skill** (MCP apply → ledger → `pnpm db-types` → aidream `python db/generate.py` → live verify → both repos commit).

## Definition of done

**The doctor SHIPPED** — `pnpm check:shapes` generates `features/content-ir/docs/SHAPES_STATUS.md` (8 asset columns per kind) and `scripts/shape/shapes-status.json`. Your kind's row is green **and** a preview screenshot exists.

Read the report's `n/a` doctrine before "closing gaps": a `nested_only_child` (renders only inside its parent) and a `data_only` contract kind are STRUCTURALLY exempt from component/skill/block/surface. Those cells are derived, never declared — building assets for them is wasted work, and the doctor will keep marking them n/a.

A fabricated `validation_status='passed'` is a defect; so is an `is_active` flipped by anything other than `set_kind_activation`.
