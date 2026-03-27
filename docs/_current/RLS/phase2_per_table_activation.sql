-- =============================================================================
-- AI MATRX — PHASE 2: Per-Table Gold Standard Activation
-- =============================================================================
-- Run ONE section at a time. Each section is independent.
-- Coordinate each section with its corresponding React code update.
--
-- For each table, the pattern is:
--   1. Drop old policies
--   2. Create new gold-standard policies using check_resource_access()
--   3. Handle sub-tables if any
--
-- The check_resource_access() function resolves the FULL hierarchy:
--   Owner > Assignee > Direct Permission > Project > Workspace (nested) > Org
--
-- You already have: is_public, authenticated_read, organization_id, workspace_id
-- columns on all tables (added in Phase 1). Auto-fill triggers are active.
-- =============================================================================


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: tasks
-- ═══════════════════════════════════════════════════════════════════════════════
-- BREAKING CHANGES:
--   - task_assignments gets RLS enabled (was open)
--   - task_attachments gets RLS enabled (was open)
--   - Tasks visible to project/workspace/org members (was owner+assignee only)
-- 
-- REACT CODE TO UPDATE BEFORE RUNNING:
--   - Any "my tasks" list: add .eq('user_id', userId) filter
--   - Any direct task_assignments queries: will now be filtered
--   - Any direct task_attachments queries: will now be filtered
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop old policies
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks and assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view their own tasks and assigned tasks" ON public.tasks;

-- New gold standard policies
CREATE POLICY "tasks_public_read" ON public.tasks
  FOR SELECT TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "tasks_authenticated_read" ON public.tasks
  FOR SELECT TO authenticated
  USING (authenticated_read = true);

CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT TO authenticated
  USING (check_resource_access('tasks', id, 'viewer', user_id, assignee_id, project_id, workspace_id, organization_id));

CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE TO authenticated
  USING (check_resource_access('tasks', id, 'editor', user_id, assignee_id, project_id, workspace_id, organization_id))
  WITH CHECK (check_resource_access('tasks', id, 'editor', user_id, assignee_id, project_id, workspace_id, organization_id));

CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR check_resource_access('tasks', id, 'admin', user_id, NULL, project_id, workspace_id, organization_id));

-- Sub-table: task_comments (already has RLS enabled)
DROP POLICY IF EXISTS "Users can create comments on their tasks" ON public.task_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.task_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.task_comments;
DROP POLICY IF EXISTS "Users can view comments on their tasks" ON public.task_comments;

CREATE POLICY "task_comments_select" ON public.task_comments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_comments.task_id
    AND check_resource_access('tasks', t.id, 'viewer', t.user_id, t.assignee_id, t.project_id, t.workspace_id, t.organization_id)
  ));

CREATE POLICY "task_comments_public_read" ON public.task_comments
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_comments.task_id AND t.is_public = true));

CREATE POLICY "task_comments_insert" ON public.task_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_comments.task_id
      AND check_resource_access('tasks', t.id, 'editor', t.user_id, t.assignee_id, t.project_id, t.workspace_id, t.organization_id)
    )
  );

CREATE POLICY "task_comments_update" ON public.task_comments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "task_comments_delete" ON public.task_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Sub-table: task_assignments (currently NO RLS — enabling it)
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_assignments_select" ON public.task_assignments
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR assigned_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_assignments.task_id
      AND check_resource_access('tasks', t.id, 'viewer', t.user_id, t.assignee_id, t.project_id, t.workspace_id, t.organization_id)
    )
  );

CREATE POLICY "task_assignments_insert" ON public.task_assignments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_assignments.task_id
    AND check_resource_access('tasks', t.id, 'editor', t.user_id, t.assignee_id, t.project_id, t.workspace_id, t.organization_id)
  ));

CREATE POLICY "task_assignments_delete" ON public.task_assignments
  FOR DELETE TO authenticated
  USING (
    assigned_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_assignments.task_id
      AND check_resource_access('tasks', t.id, 'admin', t.user_id, NULL, t.project_id, t.workspace_id, t.organization_id)
    )
  );

-- Sub-table: task_attachments (currently NO RLS — enabling it)
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_attachments_select" ON public.task_attachments
  FOR SELECT TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_attachments.task_id
      AND check_resource_access('tasks', t.id, 'viewer', t.user_id, t.assignee_id, t.project_id, t.workspace_id, t.organization_id)
    )
  );

CREATE POLICY "task_attachments_public_read" ON public.task_attachments
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_attachments.task_id AND t.is_public = true));

CREATE POLICY "task_attachments_insert" ON public.task_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_attachments.task_id
      AND check_resource_access('tasks', t.id, 'editor', t.user_id, t.assignee_id, t.project_id, t.workspace_id, t.organization_id)
    )
  );

CREATE POLICY "task_attachments_delete" ON public.task_attachments
  FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_attachments.task_id
      AND check_resource_access('tasks', t.id, 'admin', t.user_id, NULL, t.project_id, t.workspace_id, t.organization_id)
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: prompts
-- ═══════════════════════════════════════════════════════════════════════════════
-- BREAKING CHANGES:
--   - Prompts visible to project/workspace/org members (was owner + shared only)
--   - Public read now available (is_public flag)
--
-- REACT CODE TO UPDATE:
--   - Prompt lists may return more results than before
--   - prompt_versions inherits from parent prompt
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "prompts_delete_policy" ON public.prompts;
DROP POLICY IF EXISTS "prompts_insert_policy" ON public.prompts;
DROP POLICY IF EXISTS "prompts_select_policy" ON public.prompts;
DROP POLICY IF EXISTS "prompts_update_policy" ON public.prompts;

CREATE POLICY "prompts_public_read" ON public.prompts
  FOR SELECT TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "prompts_authenticated_read" ON public.prompts
  FOR SELECT TO authenticated
  USING (authenticated_read = true);

CREATE POLICY "prompts_select" ON public.prompts
  FOR SELECT TO authenticated
  USING (check_resource_access('prompts', id, 'viewer', user_id, NULL, project_id, workspace_id, organization_id));

CREATE POLICY "prompts_insert" ON public.prompts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "prompts_update" ON public.prompts
  FOR UPDATE TO authenticated
  USING (check_resource_access('prompts', id, 'editor', user_id, NULL, project_id, workspace_id, organization_id))
  WITH CHECK (check_resource_access('prompts', id, 'editor', user_id, NULL, project_id, workspace_id, organization_id));

CREATE POLICY "prompts_delete" ON public.prompts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR check_resource_access('prompts', id, 'admin', user_id, NULL, project_id, workspace_id, organization_id));

-- prompt_versions inherits from parent prompt
DROP POLICY IF EXISTS "prompt_versions_select_owner" ON public.prompt_versions;

CREATE POLICY "prompt_versions_select" ON public.prompt_versions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM prompts p WHERE p.id = prompt_versions.prompt_id
    AND check_resource_access('prompts', p.id, 'viewer', p.user_id, NULL, p.project_id, p.workspace_id, p.organization_id)
  ));

CREATE POLICY "prompt_versions_public_read" ON public.prompt_versions
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM prompts p WHERE p.id = prompt_versions.prompt_id AND p.is_public = true));


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: notes
-- ═══════════════════════════════════════════════════════════════════════════════
-- BREAKING CHANGES:
--   - Notes visible to project/workspace/org members
--   - Has duplicate old policies that need cleanup
--
-- REACT CODE TO UPDATE:
--   - Note lists may show shared notes
--   - note_versions inherits from parent note
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
DROP POLICY IF EXISTS "notes_delete_policy" ON public.notes;
DROP POLICY IF EXISTS "notes_insert_policy" ON public.notes;
DROP POLICY IF EXISTS "notes_select_policy" ON public.notes;
DROP POLICY IF EXISTS "notes_update_policy" ON public.notes;

CREATE POLICY "notes_public_read" ON public.notes
  FOR SELECT TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "notes_authenticated_read" ON public.notes
  FOR SELECT TO authenticated
  USING (authenticated_read = true);

CREATE POLICY "notes_select" ON public.notes
  FOR SELECT TO authenticated
  USING (check_resource_access('notes', id, 'viewer', user_id, NULL, project_id, workspace_id, organization_id));

CREATE POLICY "notes_insert" ON public.notes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notes_update" ON public.notes
  FOR UPDATE TO authenticated
  USING (check_resource_access('notes', id, 'editor', user_id, NULL, project_id, workspace_id, organization_id))
  WITH CHECK (check_resource_access('notes', id, 'editor', user_id, NULL, project_id, workspace_id, organization_id));

CREATE POLICY "notes_delete" ON public.notes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR check_resource_access('notes', id, 'admin', user_id, NULL, project_id, workspace_id, organization_id));

-- note_versions: update to use hierarchy
DROP POLICY IF EXISTS "Users can manage their own note versions" ON public.note_versions;
DROP POLICY IF EXISTS "note_versions_delete" ON public.note_versions;
DROP POLICY IF EXISTS "note_versions_insert" ON public.note_versions;
DROP POLICY IF EXISTS "note_versions_select" ON public.note_versions;

CREATE POLICY "note_versions_select" ON public.note_versions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM notes n WHERE n.id = note_versions.note_id
      AND check_resource_access('notes', n.id, 'viewer', n.user_id, NULL, n.project_id, n.workspace_id, n.organization_id)
    )
  );

CREATE POLICY "note_versions_insert" ON public.note_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM notes n WHERE n.id = note_versions.note_id
      AND check_resource_access('notes', n.id, 'editor', n.user_id, NULL, n.project_id, n.workspace_id, n.organization_id)
    )
  );

CREATE POLICY "note_versions_delete" ON public.note_versions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: cx_conversation (and cx_message, cx_request, cx_tool_call, cx_media)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Copy this pattern for conversations. Sub-tables inherit via conversation_id.
-- Similar structure to tasks — drop old, create new with check_resource_access.
-- ═══════════════════════════════════════════════════════════════════════════════

-- [Follow the same drop+create pattern as tasks above]
-- cx_conversation, cx_message, cx_request, cx_tool_call, cx_media
-- Each sub-table does EXISTS on cx_conversation with check_resource_access


-- ═══════════════════════════════════════════════════════════════════════════════
-- TEMPLATE: For any other table
-- ═══════════════════════════════════════════════════════════════════════════════
-- Replace {TABLE} with your table name.
-- Remove assignee_id parameter if the table doesn't have one.
-- ═══════════════════════════════════════════════════════════════════════════════

/*
DROP POLICY IF EXISTS "{TABLE}_old_policy_name" ON public.{TABLE};

CREATE POLICY "{TABLE}_public_read" ON public.{TABLE}
  FOR SELECT TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "{TABLE}_authenticated_read" ON public.{TABLE}
  FOR SELECT TO authenticated
  USING (authenticated_read = true);

CREATE POLICY "{TABLE}_select" ON public.{TABLE}
  FOR SELECT TO authenticated
  USING (check_resource_access('{TABLE}', id, 'viewer', user_id, NULL, project_id, workspace_id, organization_id));

CREATE POLICY "{TABLE}_insert" ON public.{TABLE}
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "{TABLE}_update" ON public.{TABLE}
  FOR UPDATE TO authenticated
  USING (check_resource_access('{TABLE}', id, 'editor', user_id, NULL, project_id, workspace_id, organization_id))
  WITH CHECK (check_resource_access('{TABLE}', id, 'editor', user_id, NULL, project_id, workspace_id, organization_id));

CREATE POLICY "{TABLE}_delete" ON public.{TABLE}
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR check_resource_access('{TABLE}', id, 'admin', user_id, NULL, project_id, workspace_id, organization_id));
*/
