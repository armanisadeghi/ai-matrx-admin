# Phase 19 — DB Cleanup

**Status:** not-started
**Owner:** _unassigned_
**Prerequisites:** Phase 18 + one week of zero-traffic verification on prompt tables
**Unblocks:** Phase 20

## Drop (in order — respect FK dependencies)

### Views
- `context_menu_unified_view`
- `shortcuts_by_placement_view`

### Tables
- `prompt_actions`
- `prompt_shortcuts`
- `prompt_builtin_versions`
- `prompt_builtins`
- `prompt_app_rate_limits`
- `prompt_app_errors`
- `prompt_app_executions`
- `prompt_app_versions`
- `prompt_app_categories`
- `prompt_apps`
- `prompt_templates`
- `prompt_versions`
- `prompts`
- `system_prompt_executions`
- `system_prompts`

## Verification
- `SELECT count(*) FROM prompt_apps WHERE created_at > now() - interval '7 days'` = 0 before drop.
- Same check on the other tables.
- Drop inside a single migration file with `CASCADE` only where dependency is documented.
- Regenerate `types/database.types.ts`; expect zero references remain.

## Change log
| Date | Who | Change |
|---|---|---|
