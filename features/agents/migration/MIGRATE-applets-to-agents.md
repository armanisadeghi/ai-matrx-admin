# Applets → Agents Migration

**Status:** ⏳ Not started
**Owner:** TBD
**Branch suggestion:** `applet-runner-to-agents`
**Cross-refs:** [`INVENTORY.md §2-§6`](./INVENTORY.md) · [`FINAL-AUDIT-2026-05-04.md §1.2`](./FINAL-AUDIT-2026-05-04.md) · [`phases/phase-10-applets-capture.md`](./phases/phase-10-applets-capture.md)

> **Decision:** We are **NOT** rebuilding the applet generation system. Applets stay. We are converting the runner to call agents instead of recipes, and we are eliminating brokers in favor of native agent `variable_definitions`.

---

## What we lose if applets are deleted instead of migrated

Live user functionality at risk:

- `/applets`, `/applets/[category]/[subcategory]/[id]` — built-in applet landing
- `/apps/custom/[slug]` — parent custom app
- `/apps/custom/[slug]/[appletSlug]` — child applet runner (live)
- `/apps/debug/admin/[slug]/[appletSlug]` — admin debug
- Applet builder UI under `app/(authenticated)/admin/official-components/`
- Parent-app-with-children pattern with shared working memory
- Layouts: tabs, accordion, stepper, vertical, horizontal-search
- 349+ code references to `custom_app_configs` / `custom_applet_configs`
- `MatrixFloatingMenu` link to `/applets`

Database tables to keep (currently coupled to recipes via `compiled_recipe_id`):

- `custom_app_configs`, `custom_applet_configs`
- `data_broker`, `data_input_component`, `field_components` (broker→variable migration source)
- `applet` (built-in/official applets table — confirm during Phase A)

---

## The plan — three atomic workstreams

All three can run in parallel. Phase D (builder UI) can lag without blocking applet execution.

### Workstream 1 — Database linkage (recipe → agent ID)

The applet's recipe linkage lives in `custom_applet_configs.compiled_recipe_id` and (cached) in `data_source_config.config.promptId`. Recipe IDs were **NOT** preserved during the recipes→prompts→agents migrations. Mapping is by conversion, not by ID.

**Existing infrastructure we'll reuse:**

- `POST /api/recipes/{id}/convert-to-prompt` — already converts a recipe to a prompt/agent. Two RPC paths:
  - With `appletId` → `convert_recipe_and_bind_to_applet(...)` — converts AND atomically writes `promptId` into the applet's `data_source_config.config.promptId`.
  - Without `appletId` → `convert_compiled_recipe_to_prompt(...)` — returns agent ID only.
- `useAppletRecipeFastAPI` already auto-converts on first execution if no cached `promptId`.

**New work:**

1. Create RPC `migrate_applets_to_agents()`:
   - For every `custom_applet_configs` row with `compiled_recipe_id IS NOT NULL`:
     - Call `convert_compiled_recipe_to_prompt(compiled_recipe_id, ...)` to get the agent ID.
     - Update `data_source_config` to store `agent_id` (and remove `compiledId` / `id` recipe references).
     - Set new column `agent_id uuid` on `custom_applet_configs` (or keep linkage in `data_source_config` only — pick one).
   - Output a CSV: `{ applet_id, applet_name, old_recipe_id, new_agent_id, status }`.
   - For unconvertible applets (orphaned recipes), log to CSV with reason for manual review.

2. Add an index on `custom_applet_configs.agent_id` (or on the `data_source_config` JSON path) for join performance.

3. Update the schema column comment to reflect the new linkage.

**Verification:** After migration, every applet should resolve to an agent via either column lookup or JSON path.

---

### Workstream 2 — Runner code (remove Socket.IO + recipe types)

**Files to change:**

| Path | Action | Notes |
|---|---|---|
| `features/applet/runner/AppletRunComponent.tsx` | **Refactor** | Remove `useAppletRecipe`; keep only `useAppletAgent`; drop `useFastApi` prop and `isFastApiPath` branch |
| `features/applet/hooks/useAppletRecipeFastAPI.ts` | **Rename** → `useAppletAgent.ts` | Drop "recipe" naming, keep same return signature |
| `features/applet/hooks/useAppletRecipe.ts` | **Delete** | Socket.IO recipe path |
| `lib/redux/socket-io/thunks/submitTaskThunk.ts` | **Audit** | Used by applet + scraper + cockpit (see Final Audit §3). Delete only the applet path; keep the thunk for other consumers. |
| `lib/redux/socket-io/thunks/submitAppletAgentThunk.ts` | **Rename** → `submitAppletThunk.ts` | Keep behavior |
| `types/customAppTypes.ts` | **Rename** | `RecipeSourceConfig` → `AgentSourceConfig`; add `agent_id`; drop `compiledId`; rename `neededBrokers` → `variables` |

**Current dual-path code to remove** (`AppletRunComponent.tsx`):

```tsx
// BEFORE
const socketResult = useAppletRecipe({ appletId });
const fastApiResult = useAppletRecipeFastAPI({ appletId });
const isFastApiPath = useFastApi || fastApiResult.hasAgent;
const activeResult = isFastApiPath ? fastApiResult : socketResult;

// AFTER
const { taskId, submitRecipe } = useAppletAgent({ appletId });
```

**Important** — the response-handler chain (`ResponseLayoutManager`, `socketResponseSlice`, `socketTasksSlice`) does NOT change. Both paths already feed the same Redux slices. Only the SUBMIT path changes.

**`submitAppletAgentThunk` already does the right thing today:**
- POST `/ai/agents/{agentId}` with `variables`
- Parses NDJSON stream
- Updates `socketResponseSlice` and `socketTasksSlice` (same target as Socket.IO)
- Honors `X-Conversation-ID` response header for follow-up turns

After the migration, remove the `?fx=1` opt-in flag — it becomes unconditional.

---

### Workstream 3 — Brokers → variable_definitions

**Source schemas:**

```text
data_broker (broker metadata):
  id, name, required, dataType, default_value, description,
  input_component (FK → data_input_component.id),
  field_component_id (optional FK → field_components.id),
  output_component, color, is_public, public_read

data_input_component (component spec):
  id, component, name, description, options (jsonb),
  placeholder, min, max, min_height, max_height,
  include_other, label_class_name, component_class_name,
  color_overrides, additional_params

custom_applet_configs.broker_map (jsonb):
  [{ appletId, fieldId, brokerId }, ...]

custom_applet_configs.data_source_config.config.neededBrokers (jsonb):
  [{ id, name, required, dataType, defaultValue, fieldComponentId? }, ...]
```

**Target schema:**

```text
agx_agent.variable_definitions (jsonb):
[
  {
    "name": "<broker.name>",
    "label": "<from broker_map's mapped field label, fallback to broker.name>",
    "description": "<broker.description>",
    "required": <broker.required>,
    "input_component": "<broker.input_component>",
    "default_value": "<broker.default_value>",
    "options": [
      { "id": <opt>, "label": <opt>, "description": "", "helpText": "", "metadata": {} }
    ],
    "validation_rules": <derived from broker.dataType>,
    "helpText": "<from field's helpText if mapped>",
    "iconName": ""
  }
]
```

**Field-by-field mapping table:**

| Broker field | variable_definition field | Notes |
|---|---|---|
| `id` | (drop) | Names are primary key |
| `name` | `name` | Required — matches template variable |
| `required` | `required` | Direct boolean |
| `dataType` | (derive) | → `validation_rules` + `input_component` (table below) |
| `default_value` | `default_value` | Direct |
| `inputComponent` | `input_component` | Direct string |
| `description` | `description` | Direct |
| (new) | `label` | From mapped field label, else `name` |
| (new) | `helpText` | From mapped field helpText, else broker.description |
| (new) | `options` | From `data_input_component.options` flat array → wrapped FieldOption objects |

**Component type passthrough** (broker → variable):

`input` · `textarea` · `select` · `multiselect` · `radio` · `checkbox` · `date` · `slider` · `number` · `fileUpload` · `switch` — all 1:1.

**Data-type → validation/component derivation:**

```text
str    → input_component: "input"        validation: { maxLength: ... }
int    → input_component: "number"       validation: { min, max }
float  → input_component: "number"       validation: { step: 0.01 }
bool   → input_component: "checkbox" or "switch"
date   → input_component: "date"
list   → input_component: "multiselect"  options: [...]
dict   → input_component: "jsonField"    (verify support; otherwise fallback)
url    → input_component: "input"        validation: { pattern: URL_REGEX }
```

**Critical gap — option richness:**

- Brokers store options in `data_input_component.options` as a flat string array. No per-option metadata.
- `variable_definitions.options` expects rich `FieldOption` objects with `id`, `label`, `description`, `helpText`, `metadata`, `parentId`, `order`.
- **Migration approach:** generate basic wrappers `{ id: value, label: value, description: "", helpText: "" }`. Builder UI can enrich later.

**Do not change:** field component rendering. The applet field renderers (`features/applet/runner/fields/*`) read `input_component` and route to the right UI primitive. As long as the names match between brokers and variables, rendering keeps working.

---

## Workstream 4 (post-core) — Builder UI rename

Heavy "broker / recipe" naming in the admin builder. No data model changes; only labels and selectors.

| Path | Action |
|---|---|
| `features/applet/builder/modules/recipe-source/` | Rename to `agent-source/`; swap `RecipeSelectionList` → `AgentSelectionList`, `RecipeVersionSelection` → `AgentVersionSelection`, "Select Recipe" → "Select Agent" |
| `features/applet/builder/modules/broker-mapping/` | Rename to `variable-mapping/`; `BrokerCard` → `VariableCard`, `NeededBrokersCard` → `VariablesCard`. Keep mapping logic. |
| `features/applet/builder/modules/field-builder/` | Drop recipe-specific validation; add agent version selection if desired |

This phase can ship incrementally — labels first, file/component renames in a follow-up to keep PR diffs reviewable.

---

## Implementation checklist

### Phase A — Database linkage (atomic)

- [ ] Create RPC `migrate_applets_to_agents()`.
- [ ] Decide column placement: `custom_applet_configs.agent_id` (recommended) vs JSON path inside `data_source_config`.
- [ ] Run migration, capture CSV of orphaned applets.
- [ ] Hand orphan CSV to product owner for manual remediation.
- [ ] Add index on the new linkage column.
- [ ] Update column comment.

### Phase B — Runner refactor (atomic)

- [ ] Create `useAppletAgent` (rename of `useAppletRecipeFastAPI`).
- [ ] Refactor `AppletRunComponent.tsx` to single execution path.
- [ ] Delete `useAppletRecipe.ts`.
- [ ] Audit `submitTaskThunk` — only delete the applet code path; preserve scraper/cockpit usage.
- [ ] Rename `submitAppletAgentThunk` → `submitAppletThunk`.
- [ ] Update `customAppTypes.ts` types.
- [ ] Drop `?fx=1` opt-in flag.

### Phase C — Brokers → variable_definitions (data transform)

- [ ] Write transform script that walks every applet's `data_source_config.config.neededBrokers` + `broker_map` and produces variable_definitions for the linked agent.
- [ ] Upsert into `agx_agent.variable_definitions` (or `agx_version.variable_definitions` per the version policy).
- [ ] Compare counts and field names; log mismatches.
- [ ] Verify in browser that rich-UI inputs (select with options, date pickers, sliders, etc.) still render.

### Phase D — Builder UI relabel (post-core)

- [ ] Labels first (find/replace "Recipe" → "Agent" in JSX).
- [ ] File/component renames in a separate PR.
- [ ] Update any sample data, fixtures, demo apps.

### Phase E — Test & verify

- [ ] Unit tests on `useAppletAgent`.
- [ ] Integration test: load applet → execute → see results.
- [ ] Mobile responsiveness check on layouts (parent app uses `UniformHeightProvider`).
- [ ] Conversation follow-up turn (verify `X-Conversation-ID` round-trips).

---

## Critical edge cases (don't get caught)

1. **No parent-child applet hierarchy in DB** — applets are independent. The "parent app with children" pattern lives in the app-level `applet_list` JSON on `custom_app_configs`. Migration treats each applet independently; relationships are preserved automatically.
2. **`UniformHeightProvider`** in `features/applet/runner/layouts/core/UniformHeightWrapper.tsx` is layout-only — no recipe/agent coupling. Verify horizontal-search layout still renders correctly after the runner swap.
3. **Custom vs official applets** — the `applet` table (Supabase, separate from `custom_applet_configs`) holds built-in applets. Confirm during Phase A whether built-in applets carry `compiled_recipe_id` too. If yes, migrate both.
4. **Builder dependency on broker concepts** — listed above. Builder runs orthogonal to runner; can stay broker-named for one release while runner ships.
5. **First-execution latency** — applets that never executed via the FastAPI path have no cached `promptId`. After Phase A they'll all have an agent ID stored, so this latency disappears. Good.
6. **`X-Conversation-ID` header** — `submitAppletAgentThunk` already extracts it. Confirm `/ai/agents/{agentId}` sets it (it does for chat). Required for multi-turn applets.
7. **`submitTaskThunk` is shared infrastructure** — it's used by `features/scraper/parts/recipes/` and `useCockpitRecipe` too. Do NOT delete the thunk; only remove the applet call site.

---

## Files touched (manifest)

| Path | Phase |
|---|---|
| `features/applet/runner/AppletRunComponent.tsx` | B (refactor) |
| `features/applet/hooks/useAppletRecipe.ts` | B (delete) |
| `features/applet/hooks/useAppletRecipeFastAPI.ts` | B (rename → useAppletAgent.ts) |
| `lib/redux/socket-io/thunks/submitTaskThunk.ts` | B (remove applet code path) |
| `lib/redux/socket-io/thunks/submitAppletAgentThunk.ts` | B (rename → submitAppletThunk.ts) |
| `types/customAppTypes.ts` | B (RecipeSourceConfig → AgentSourceConfig) |
| `features/applet/builder/modules/recipe-source/**` | D (rename to agent-source) |
| `features/applet/builder/modules/broker-mapping/**` | D (rename to variable-mapping) |
| Migration SQL: `migrate_applets_to_agents` RPC | A (new) |
| Data transform script: brokers → variable_definitions | C (new) |

---

## Change log

| Date | Who | Change |
|---|---|---|
| 2026-05-04 | claude (audit-legacy-systems) | Created — full audit of applet runner, broker schema, and recipe→agent conversion infrastructure. |
