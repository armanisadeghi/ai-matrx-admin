# Matrx Versioning Rules

> Enforced standard. All code touching versioned tables must comply.

## Versioned Tables

| entity_type | Live Table | Versions Table | Parent FK Column |
|---|---|---|---|
| `agent` | `agx_agent` | `agx_version` | `agent_id` |
| `prompt` | `prompts` | `prompt_versions` | `prompt_id` |
| `builtin` | `prompt_builtins` | `prompt_builtin_versions` | `builtin_id` |
| `prompt_app` | `prompt_apps` | `prompt_app_versions` | `app_id` |
| `tool` | `tools` | `tool_versions` | `tool_id` |
| `tool_ui_component` | `tool_ui_components` | `tool_ui_component_versions` | `component_id` |
| `note` | `notes` | `note_versions` | `note_id` |

## Rules

### 1. Never write to `_versions` tables from application code
Versions are created exclusively by Postgres triggers. If you INSERT/UPDATE/DELETE a versions table from Python, React, or any other client, you are doing it wrong.

### 2. Use normal CRUD on the live table
Just UPDATE the live row. The BEFORE UPDATE trigger snapshots the OLD state and increments `version`. You don't need to think about it.

### 3. The `version` column is read-only
Never set `version` in an INSERT or UPDATE payload. The trigger manages it. INSERT → `version = 1`. UPDATE → auto-incremented.

### 4. Never join `_versions` in bulk queries
Fetching all agents for a user? Query `agx_agent` only. The `version` integer on the live row is all you need for list views. Only query `_versions` when showing a specific entity's history panel.

### 5. Use the shared RPCs for all version operations

```
get_version_history(entity_type, entity_id, limit?, offset?)
get_version_snapshot(entity_type, entity_id, version_number)
get_version_diff(entity_type, entity_id, version_a, version_b)
promote_version(entity_type, entity_id, version_number)
restore_version(entity_type, entity_id, version_number)
purge_old_versions(entity_type, entity_id, keep_count)
```

### 6. Change notes are optional but encouraged
Before an UPDATE, set a transaction-local note the trigger will capture:
```sql
SELECT set_config('app.change_note', 'Your note here', true);
```
Especially useful for AI-generated updates so the audit trail explains what happened.

### 7. `_versions` tables are append-only
Never UPDATE or DELETE version rows. The only approved deletion path is `purge_old_versions()`, which always preserves v1.

### 8. Content columns vs metadata columns
Only content column changes trigger a snapshot. These do NOT trigger snapshots:
- `is_archived`, `is_favorite`, `is_public`
- `updated_at`, `created_at`
- `user_id`, `organization_id`, `workspace_id`, `project_id`, `task_id`
- Analytics counters, rate limits, search indexes
- `source_agent_id`, `source_snapshot_at`

### 9. When adding a new versioned table
Follow the template in `matrx-versioning-approved-architectures.md`:
1. Add `version INTEGER NOT NULL DEFAULT 1` to the live table
2. Create `{table}_versions` with `{parent}_id` FK (CASCADE), `version_number`, unique constraint, content columns, `changed_at`, `change_note`
3. Create 3 triggers: BEFORE INSERT (set version=1), AFTER INSERT (v1 snapshot), BEFORE UPDATE (snapshot OLD + bump)
4. All trigger functions use `SECURITY DEFINER`
5. RLS on versions: SELECT only (inherits from parent). No INSERT/UPDATE/DELETE policies for users. The trigger runs as `SECURITY DEFINER` and bypasses RLS — user-facing write policies are both incorrect and a security risk. See `RLS_POLICY_STANDARD.md` for the exact policy template.
6. Add `ELSIF` branches to the 5 shared RPCs
7. Add `changed_at DESC` index
8. Add table comment: `'Append-only history. Never edit directly.'`
9. Backfill v1 for existing rows

### 10. `prompt_apps` version pinning
`prompt_apps` pin to a specific `prompt_versions.id` via `prompt_version_id`. When executing an app, always resolve the agent from the pinned version, never the live prompt. Use `pin_prompt_app_to_version()` to update the pin. Use `check_prompt_app_drift()` to find stale pins.
