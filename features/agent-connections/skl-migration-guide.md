# SKL\_ Namespace Migration Guide

**Date:** April 22, 2026
**Author:** Arman (via Claude)
**Audience:** React / Frontend team (Matrx Admin, Matrx Mobile, Matrx Local, Matrx Code, Matrx Chrome)

---

## What Happened

We've introduced a new `skl_` database namespace that does two things:

1. **Renames and replaces `content_blocks`** with `skl_render_definitions` — because what we've been calling "content blocks" are actually render block definitions: LLM instructions that produce structured output mapping 1:1 to React rendering components.

2. **Adds a general-purpose skills system** (`skl_definitions`) modeled after how Claude Code, Cursor, and Windsurf handle skills/rules — but normalized into database tables instead of files, so we can sync across cloud, version-control, and generate files for any platform surface.

---

## New Tables

### `skl_render_definitions` (replaces `content_blocks`)

Same data, same IDs, same category FK. All 55 rows have been migrated with identical UUIDs so nothing breaks during transition.

| Column | Notes |
|---|---|
| `id`, `block_id`, `label`, `description`, `icon_name`, `template` | Unchanged from `content_blocks` |
| `sort_order`, `is_active`, `category_id` | Unchanged |
| `user_id`, `organization_id`, `project_id`, `task_id` | Scope columns (unchanged) |
| `is_public` | **New.** Defaults `false`. For public/marketplace visibility. |
| `skill_id` | **New.** Optional FK to `skl_definitions` — links a render block to its parent skill definition. |

### `skl_render_components` (new)

The React side of the rendering contract. One render definition can have multiple component implementations (web, mobile, desktop).

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid | PK |
| `render_definition_id` | uuid | FK → `skl_render_definitions` |
| `component_key` | varchar | React component identifier (e.g., `TimelineRenderer`) |
| `platform` | varchar | `web`, `mobile`, `desktop` |
| `parser_key` | varchar? | Parser/pattern-matcher identifier |
| `parser_config` | jsonb? | Parser configuration (regex patterns, delimiters, etc.) |
| `props_schema` | jsonb? | JSON Schema for the expected props contract |
| `import_path` | varchar? | Where this component lives in the codebase |
| `is_active` | boolean | Default `true` |

**Unique constraint:** One component per `(render_definition_id, platform)`.

### `skl_definitions` (new — the core skills table)

General-purpose skills: coding conventions, workflows, agent behaviors, mode modifiers, reference docs. This is the big new table.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid | PK |
| `skill_id` | varchar | Slug identifier (e.g., `api-conventions`, `code-review`) |
| `label` | varchar | Human-readable name |
| `description` | text | **Discovery text** — loaded into LLM system prompt for progressive disclosure |
| `skill_type` | enum | `render_block`, `convention`, `workflow`, `task`, `reference`, `mode`, `agent_behavior` |
| `body` | text | **Full instruction payload** — loaded only when skill is invoked |
| `model_preference` | varchar? | Preferred LLM model |
| `allowed_tools` | jsonb? | Tools this skill can access when active |
| `trigger_patterns` | jsonb? | Keywords/phrases for auto-activation |
| `disable_auto_invocation` | boolean | Manual-only invocation when `true` |
| `platform_targets` | jsonb? | Which surfaces: `["web", "mobile", "desktop", "vscode", "chrome"]` |
| `version` | varchar? | Semver tracking |
| `config` | jsonb? | Platform-specific config (glob patterns, context settings, etc.) |
| `is_system` | boolean | `true` for built-in skills (visible to all) |
| `is_public` | boolean | `true` for marketplace/public visibility |
| `user_id` / `organization_id` / `project_id` / `task_id` | Scope columns | Same pattern as `ctx_tasks` |

### `skl_categories` (new)

Independent category system for the skills namespace. Currently `skl_render_definitions` still FKs to the existing `shortcut_categories` table for backwards compatibility. This table is ready for when we want to fully decouple.

### `skl_resources` (new)

Supporting files for skills — equivalent to Claude Code's `scripts/`, `references/`, `assets/` directories.

| Column | Type | Purpose |
|---|---|---|
| `skill_id` | uuid | FK → `skl_definitions` |
| `resource_type` | varchar | `script`, `reference`, `asset`, `template`, `example` |
| `filename` | varchar | Filename when generated to disk |
| `content` | text? | Text content (scripts, markdown) |
| `storage_path` | varchar? | S3 path for binary assets |
| `mime_type` | varchar? | MIME type |

---

## What the Frontend Team Needs to Do

### Phase 1: Rename References (Do Now)

**1. Switch Supabase queries from `content_blocks` → `skl_render_definitions`.**

The table has identical columns plus `is_public` and `skill_id`. All existing row IDs are preserved — this is a drop-in replacement.

```typescript
// BEFORE
const { data } = await supabase.from('content_blocks').select('*');

// AFTER
const { data } = await supabase.from('skl_render_definitions').select('*');
```

**2. Update the `type` discriminator in menu/context views.**

The views (`agent_context_menu_view`, `context_menu_unified_view`, `category_items_view`) now output `type: 'render_block'` instead of `type: 'content_block'`. Update any frontend code that filters or switches on this string:

```typescript
// BEFORE
if (item.type === 'content_block') { ... }

// AFTER
if (item.type === 'render_block') { ... }
```

**3. Update TypeScript types/interfaces.**

Rename `ContentBlock` → `RenderDefinition` (or `SklRenderDefinition`) in your type definitions. Add the new optional fields:

```typescript
interface SklRenderDefinition {
  id: string;
  block_id: string;
  label: string;
  description: string | null;
  icon_name: string;
  template: string;
  sort_order: number;
  is_active: boolean;
  is_public: boolean;        // NEW
  skill_id: string | null;   // NEW
  category_id: string | null;
  user_id: string | null;
  organization_id: string | null;
  project_id: string | null;
  task_id: string | null;
  created_at: string;
  updated_at: string;
}
```

**4. Update Redux slices, selectors, and any store references.**

If there are slices named `contentBlocks` or selectors like `selectContentBlocks`, rename them to `renderDefinitions` or `sklRenderDefinitions`.

### Phase 2: Register Components (Next Sprint)

Start populating `skl_render_components`. For each render block that has a React component today, insert a row mapping the `render_definition_id` to its `component_key`, `parser_key`, `platform`, and `import_path`. This gives us a database-driven component registry instead of hardcoded switch statements.

```typescript
// Example: what a component registry query looks like
const { data } = await supabase
  .from('skl_render_components')
  .select('*, render_definition:skl_render_definitions(*)')
  .eq('platform', 'web')
  .eq('is_active', true);
```

### Phase 3: Skills Integration (Future)

`skl_definitions` is available for use when we're ready to build skill management UI — creating/editing skills, assigning them to agents, generating SKILL.md files for Matrx Code, etc. No frontend work needed here until product specs are ready.

---

## Tables Marked for Deprecation and Removal

This is the full list of tables and views that are now superseded and should be removed once the frontend has fully migrated off them. **Do not write new code against any of these.**

### Tier 1: Remove ASAP (direct replacements exist)

| Legacy Table | Replaced By | Rows | Status |
|---|---|---|---|
| `content_blocks` | `skl_render_definitions` | 55 | Data migrated. Identical IDs. Drop when all queries are switched. |
| `prompt_shortcuts` | `agx_shortcut` | 29 | `agx_shortcut` has 32 rows and is the active system. Legacy table is only used by old views. |
| `prompt_actions` | (unused) | 0 | Empty. Safe to drop immediately. |
| `system_prompt_executions` | (unused) | 0 | Empty. Safe to drop immediately. |

### Tier 2: Remove After View Migration

| Legacy View | Depends On | Action |
|---|---|---|
| `shortcuts_by_placement_view` | `prompt_shortcuts`, `shortcut_categories`, `prompt_builtins` | Fully superseded by `agent_context_menu_view`. Remove once no frontend code references it. |
| `context_menu_unified_view` | `prompt_shortcuts`, `skl_render_definitions`, `shortcut_categories` | Still references `prompt_shortcuts`. Once frontend is on `agent_context_menu_view` only, this can go. |
| `category_items_view` | `prompt_shortcuts`, `skl_render_definitions` | Simple union view. Remove once nothing queries it. |

### Tier 3: Remove With Coordinated Cleanup

| Legacy Table | Replaced By | Rows | Notes |
|---|---|---|---|
| `prompt_builtins` | `agx_agent` + `agx_version` | 49 | The agent definition/version system replaces builtins. Has FK dependencies from `prompt_shortcuts` and several RPCs. Remove after `prompt_shortcuts` is gone. |
| `prompt_builtin_versions` | `agx_version` | 72 | Versioning is handled by the `agx_` system now. |
| `system_prompts` | `agx_agent` | 24 | System prompts are now agent definitions. |
| `system_prompts_new` | `agx_agent` | 24 | Duplicate of above. Remove. |
| `prompt_templates` | `skl_definitions` (type: `reference`) | 9 | Templates should migrate to skills. |

### Tier 4: Evaluate — May Still Be Active

| Table | Rows | Notes |
|---|---|---|
| `prompts` | 343 | User-created prompts. May still be actively used. Needs audit — likely migrates to `agx_agent` or `skl_definitions`. |
| `prompt_versions` | 631 | Version history for `prompts`. Tied to `prompts` lifecycle. |
| `prompt_apps` | 61 | Published prompt apps. Needs product decision on whether these become skills or remain separate. |
| `prompt_app_*` (6 tables) | various | Supporting tables for prompt_apps: `versions`, `executions`, `analytics`, `errors`, `rate_limits`, `categories`. Tied to `prompt_apps` lifecycle. |
| `shortcut_categories` | `skl_categories` (eventually) | 43 | Still actively used as FK target by `skl_render_definitions` and `agx_shortcut`. Cannot remove yet. Migrate to `skl_categories` when ready for a coordinated FK migration. |

### RPCs That Will Need Updates

These functions still reference legacy tables. They should be updated or removed as part of the Tier 2/3 cleanup:

| RPC | References | Action |
|---|---|---|
| `build_category_hierarchy` | ~~`content_blocks`~~ → `skl_render_definitions` | **Already updated.** ✅ |
| `convert_prompt_to_builtin` | `prompt_builtins`, `prompt_shortcuts` | Remove with Tier 3 |
| `update_builtin_from_source` | `prompt_builtins` | Remove with Tier 3 |
| `update_builtins_from_prompt` | `prompt_builtins` | Remove with Tier 3 |
| `check_builtin_drift` | `prompt_builtins` | Remove with Tier 3 |
| `check_prompt_app_drift` | `prompt_builtins` | Remove with Tier 3 |
| `trg_builtins_create_v1_snapshot` | `prompt_builtins` | Remove with Tier 3 |
| `trg_builtins_snapshot_version` | `prompt_builtins` | Remove with Tier 3 |
| `get_prompt_execution_data` | `prompt_builtins`, `prompt_shortcuts` | Remove with Tier 3 |
| `get_prompt_app_execution_payload` | `prompt_builtins` | Evaluate with Tier 4 |
| `promote_version`, `purge_old_versions`, `get_version_history`, `get_version_snapshot`, `pin_prompt_app_to_version` | `prompt_builtins` | Evaluate with Tier 4 |

---

## RLS & Security

All 5 new `skl_` tables have RLS enabled with 25 policies total, following the same access pattern as `ctx_tasks`:

- **Global/system items** (all scope columns NULL, or `is_system = true`): visible to all authenticated users
- **Public items** (`is_public = true`): visible to everyone including anonymous
- **User-scoped** (`user_id`): owner has full CRUD
- **Org-scoped** (`organization_id`): members can read, admins/owners can write
- **Project-scoped** (`project_id`): project members can read, admins/owners can write
- **Task-scoped** (`task_id`): task owner and assignee can read
- **Child tables** (`skl_render_components`, `skl_resources`): access inherits from parent via subquery

All tables have `updated_at` triggers and proper grants for `authenticated` and `anon` roles.

---

## Summary Checklist

- [ ] Switch all `content_blocks` queries → `skl_render_definitions`
- [ ] Update `type: 'content_block'` → `type: 'render_block'` checks
- [ ] Rename TypeScript types (`ContentBlock` → `SklRenderDefinition`)
- [ ] Rename Redux slices/selectors
- [ ] Search entire codebase for `content_block` string (including camelCase `contentBlock`) — nothing should reference the old name
- [ ] Confirm `shortcuts_by_placement_view` is not queried anywhere (if so, switch to `agent_context_menu_view`)
- [ ] Confirm `context_menu_unified_view` is not queried anywhere (if so, switch to `agent_context_menu_view`)
- [ ] Drop `prompt_actions` table (empty, no dependencies)
- [ ] Drop `system_prompt_executions` table (empty, no dependencies)
- [ ] File tickets for Tier 2–4 cleanup items

---

## Questions?

If anything is unclear or you hit a blocker during migration, flag it immediately. The `content_blocks` table still exists as a safety net during transition, but we want it gone within one sprint.
