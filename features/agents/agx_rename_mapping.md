# AGX Rename Migration — Before & After Reference

## Table Names

| Before | After | App code |
|--------|-------|----------|
| `agents` | `agx_agent` | X (all `supabase.from`, permissions `getTableName`, SSR/agent routes) |
| `agent_versions` | `agx_version` | — (no direct `.from()` in repo; types/comments only) |
| `agent_shortcuts` | `agx_shortcut` | X (redux shortcuts thunks + converters already used `agx_shortcut`) |

## Permission `resource_type` Strings

| Before | After |
|--------|-------|
| `'agents'` | `'agx_agent'` |
| `'agent_shortcuts'` | `'agx_shortcut'` |

## RPC / Function Names

| Before | After | Updated |
|--------|-------|---------|
| `accept_agent_version` | `agx_accept_version` | X |
| `build_agent_shortcut_menu` | `agx_build_shortcut_menu` | X |
| `check_agent_drift` | `agx_check_drift` | X |
| `check_agent_references` | `agx_check_references` | X |
| `create_shortcut_for_agent` | `agx_create_shortcut` | X |
| `duplicate_agent` | `agx_duplicate_agent` | X |
| `duplicate_shortcut` | `agx_duplicate_shortcut` | X |
| `get_agent_access_level` | `agx_get_access_level` | X |
| `get_agent_execution_full` | `agx_get_execution_full` | X |
| `get_agent_execution_minimal` | `agx_get_execution_minimal` | X |
| `get_agent_shortcuts_for_context` | `agx_get_shortcuts_for_context` | X |
| `get_agent_shortcuts_initial` | `agx_get_shortcuts_initial` | X |
| `get_agent_version_history` | `agx_get_version_history` | X |
| `get_agent_version_snapshot` | `agx_get_version_snapshot` | X |
| `get_agents_list` | `agx_get_list` | X |
| `get_agents_list_full` | `agx_get_list_full` | X |
| `get_agents_shared_with_me` | `agx_get_shared_with_me` | X |
| `get_shared_agents_for_chat` | `agx_get_shared_for_chat` | X |
| `get_user_shortcuts` | `agx_get_user_shortcuts` | X |
| `promote_agent_version` | `agx_promote_version` | X |
| `purge_agent_versions` | `agx_purge_versions` | X |
| `update_agent_from_source` | `agx_update_from_source` | X |
| `trg_agents_create_v1_snapshot` | `trg_agx_agent_create_v1_snapshot` | X |
| `trg_agents_set_initial_version` | `trg_agx_agent_set_initial_version` | X |
| `trg_agents_snapshot_version` | `trg_agx_agent_snapshot_version` | X |

## Multi-Entity Functions (internal branch updates only)

These functions keep their names but have internal `'agent'` branches updated:

| Function | Branch String Change |
|----------|---------------------|
| `get_version_history` | `agent_versions` → `agx_version` |
| `get_version_snapshot` | `agent_versions` → `agx_version` |
| `promote_version` | `agents` / `agent_versions` → `agx_agent` / `agx_version` |
| `purge_old_versions` | `agent_versions` → `agx_version` |

## Trigger Names

| Before | After | On Table |
|--------|-------|----------|
| `set_agents_updated_at` | `set_agx_agent_updated_at` | `agx_agent` |
| `trg_agents_create_v1_snapshot` | `trg_agx_agent_create_v1_snapshot` | `agx_agent` |
| `trg_agents_set_initial_version` | `trg_agx_agent_set_initial_version` | `agx_agent` |
| `trg_agents_snapshot_version` | `trg_agx_agent_snapshot_version` | `agx_agent` |
| `trg_auto_fill_hierarchy_agents` | `trg_auto_fill_hierarchy_agx_agent` | `agx_agent` |
| `set_agent_shortcuts_updated_at` | `set_agx_shortcut_updated_at` | `agx_shortcut` |

## Foreign Key Constraint Names

| Before | After |
|--------|-------|
| `agents_model_fk` | `agx_agent_model_fk` |
| `agents_org_fk` | `agx_agent_org_fk` |
| `agents_project_fk` | `agx_agent_project_fk` |
| `agents_source_fk` | `agx_agent_source_fk` |
| `agents_task_fk` | `agx_agent_task_fk` |
| `agents_workspace_fk` | `agx_agent_workspace_fk` |
| `agent_versions_agent_fk` | `agx_version_agent_fk` |
| `agent_shortcuts_agent_fk` | `agx_shortcut_agent_fk` |
| `agent_shortcuts_version_fk` | `agx_shortcut_version_fk` |
| `agent_shortcuts_category_fk` | `agx_shortcut_category_fk` |
| `agent_shortcuts_org_fk` | `agx_shortcut_org_fk` |
| `agent_shortcuts_project_fk` | `agx_shortcut_project_fk` |
| `agent_shortcuts_task_fk` | `agx_shortcut_task_fk` |
| `agent_shortcuts_workspace_fk` | `agx_shortcut_workspace_fk` |
| `cx_message_agent_id_fkey` | `cx_message_agx_agent_fk` |

## Index Names

| Before | After |
|--------|-------|
| `agents_pkey` | `agx_agent_pkey` |
| `idx_agents_archived` | `idx_agx_agent_archived` |
| `idx_agents_builtin_active` | `idx_agx_agent_builtin_active` |
| `idx_agents_category` | `idx_agx_agent_category` |
| `idx_agents_model` | `idx_agx_agent_model` |
| `idx_agents_org` | `idx_agx_agent_org` |
| `idx_agents_organization_id` | `idx_agx_agent_organization_id` |
| `idx_agents_project` | `idx_agx_agent_project` |
| `idx_agents_project_id` | `idx_agx_agent_project_id` |
| `idx_agents_public` | `idx_agx_agent_public` |
| `idx_agents_settings` | `idx_agx_agent_settings` |
| `idx_agents_source` | `idx_agx_agent_source` |
| `idx_agents_tags` | `idx_agx_agent_tags` |
| `idx_agents_tools` | `idx_agx_agent_tools` |
| `idx_agents_type` | `idx_agx_agent_type` |
| `idx_agents_user` | `idx_agx_agent_user` |
| `idx_agents_user_id` | `idx_agx_agent_user_id` |
| `idx_agents_workspace` | `idx_agx_agent_workspace` |
| `agent_versions_pkey` | `agx_version_pkey` |
| `agent_versions_unique` | `agx_version_unique` |
| `idx_agent_versions_agent` | `idx_agx_version_agent` |
| `idx_agent_versions_changed` | `idx_agx_version_changed` |
| `idx_agent_versions_latest` | `idx_agx_version_latest` |
| `agent_shortcuts_pkey` | `agx_shortcut_pkey` |
| `idx_agent_shortcuts_agent` | `idx_agx_shortcut_agent` |
| `idx_agent_shortcuts_category_active` | `idx_agx_shortcut_category_active` |
| `idx_agent_shortcuts_contexts` | `idx_agx_shortcut_contexts` |
| `idx_agent_shortcuts_org` | `idx_agx_shortcut_org` |
| `idx_agent_shortcuts_project` | `idx_agx_shortcut_project` |
| `idx_agent_shortcuts_system` | `idx_agx_shortcut_system` |
| `idx_agent_shortcuts_task` | `idx_agx_shortcut_task` |
| `idx_agent_shortcuts_user` | `idx_agx_shortcut_user` |
| `idx_agent_shortcuts_version` | `idx_agx_shortcut_version` |
| `idx_agent_shortcuts_workspace` | `idx_agx_shortcut_workspace` |

## RLS Policy Names

| Before | After | On Table |
|--------|-------|----------|
| `agents_builtin_read` | `agx_agent_builtin_read` | `agx_agent` |
| `agents_delete` | `agx_agent_delete` | `agx_agent` |
| `agents_insert` | `agx_agent_insert` | `agx_agent` |
| `agents_public_read` | `agx_agent_public_read` | `agx_agent` |
| `agents_select` | `agx_agent_select` | `agx_agent` |
| `agents_update` | `agx_agent_update` | `agx_agent` |
| `agent_versions_public_read` | `agx_version_public_read` | `agx_version` |
| `agent_versions_select` | `agx_version_select` | `agx_version` |
| `agent_shortcuts_delete` | `agx_shortcut_delete` | `agx_shortcut` |
| `agent_shortcuts_insert` | `agx_shortcut_insert` | `agx_shortcut` |
| `agent_shortcuts_scoped_read` | `agx_shortcut_scoped_read` | `agx_shortcut` |
| `agent_shortcuts_system_delete` | `agx_shortcut_system_delete` | `agx_shortcut` |
| `agent_shortcuts_system_insert` | `agx_shortcut_system_insert` | `agx_shortcut` |
| `agent_shortcuts_system_read` | `agx_shortcut_system_read` | `agx_shortcut` |
| `agent_shortcuts_system_update` | `agx_shortcut_system_update` | `agx_shortcut` |
| `agent_shortcuts_update` | `agx_shortcut_update` | `agx_shortcut` |

