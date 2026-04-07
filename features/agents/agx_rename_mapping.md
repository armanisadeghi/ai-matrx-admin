# AGX Entity Naming Convention & Reference

This document outlines the current naming conventions for Agent-related entities (AGX) in the database and application code. All legacy `agent` references have been migrated to the `agx_` prefix.

## Core Guidance

**1. Standard Prefixing:** All agent-related tables, functions, triggers, index names, and constraint names must use the `agx_` prefix.
**2. Table References:** Exclusively use the `agx_` prefixed table names for any Supabase queries or references. Avoid using `agents`, `agent_versions`, or `agent_shortcuts`.
**3. Permission Strings:** Use `agx_agent` and `agx_shortcut` for resource types in permissions logic.

## Current Entity Names

### Tables
- `agx_agent`: Main agents table.
- `agx_version`: Agent versions table.
- `agx_shortcut`: Agent shortcuts table.

### Permission `resource_type` Strings
- `'agx_agent'`
- `'agx_shortcut'`

### RPC / Function Names
Functions interacting with AGX entities follow the `agx_{action}` format:
- `agx_accept_version`
- `agx_build_shortcut_menu`
- `agx_check_drift`
- `agx_check_references`
- `agx_create_shortcut`
- `agx_duplicate_agent`
- `agx_duplicate_shortcut`
- `agx_get_access_level`
- `agx_get_execution_full`
- `agx_get_execution_minimal`
- `agx_get_shortcuts_for_context`
- `agx_get_shortcuts_initial`
- `agx_get_version_history`
- `agx_get_version_snapshot`
- `agx_get_list`
- `agx_get_list_full`
- `agx_get_shared_with_me`
- `agx_get_shared_for_chat`
- `agx_get_user_shortcuts`
- `agx_promote_version`
- `agx_purge_versions`
- `agx_update_from_source`

### Triggers & Database Constraints
- **Triggers:** Prefixed with `trg_agx_agent_` or `set_agx_` (e.g., `trg_agx_agent_snapshot_version`, `set_agx_agent_updated_at`).
- **Indexes:** Prefixed with `idx_agx_[entity]_` (e.g., `idx_agx_agent_category`, `idx_agx_shortcut_workspace`).
- **Foreign Keys:** Named as `agx_[entity]_[relation]_fk` (e.g., `agx_agent_org_fk`, `agx_shortcut_version_fk`). Other specific names like `cx_message_agx_agent_fk` also apply.
- **RLS Policies:** Named as `agx_[entity]_[action]` (e.g., `agx_agent_select`, `agx_shortcut_insert`).

## System / Multi-Entity Functions

The following core system functions maintained their original names, but their internal logic was updated to reference the new `agx_version` and `agx_agent` structures for the `'agent'` branch:
- `get_version_history`
- `get_version_snapshot`
- `promote_version`
- `purge_old_versions`
