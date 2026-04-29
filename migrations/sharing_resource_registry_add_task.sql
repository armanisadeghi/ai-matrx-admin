-- ============================================================================
-- Add 'task' to shareable_resource_registry
-- ============================================================================
--
-- Surfaces the same bug as 'agent' had pre-registry: TaskDetailsPanel and
-- TaskDetailPage were calling <ShareButton resourceType="tasks" /> but the
-- string 'tasks' was never registered in any RPC's CASE statement and the
-- table is actually 'ctx_tasks'. Sharing a task would have produced the
-- "Unknown resource type" failure the moment somebody clicked the button.
--
-- Registering it here resolves the alias once. The TS mirror in
-- utils/permissions/registry.ts and the corresponding parity-test snapshot
-- (utils/permissions/__tests__/registry.db-snapshot.json) must be updated in
-- the same commit. Any drift fails CI.
--
-- RLS rollout note: ctx_tasks RLS uses user_id / assignee_id / project_id /
-- workspace member checks but does not call has_permission(). Sharing rows
-- insert successfully, but RLS will not actually grant the grantee access
-- until those policies are amended. Tracked via rls_uses_has_permission=false.
-- ============================================================================

BEGIN;

INSERT INTO public.shareable_resource_registry
  (resource_type, table_name, id_column, owner_column, is_public_column,
   display_label, url_path_template, rls_uses_has_permission, is_active, notes)
VALUES
  ('task', 'ctx_tasks', 'id', 'user_id', 'is_public',
   'Task', '/tasks/{id}', false, true,
   'RLS gap: ctx_tasks RLS uses user_id/assignee_id/project_id checks but does not call has_permission(). Sharing through permissions table will not be enforced until RLS is updated. Same gap as agent/prompt/note — tracked in rls-rollout follow-up.')
ON CONFLICT (resource_type) DO NOTHING;

COMMIT;
