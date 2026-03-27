-- =============================================================================
-- AI MATRX — PHASE 2: Per-Table Gold Standard Activation
-- =============================================================================
-- INFRASTRUCTURE STATUS (all live on database):
--
--   check_resource_access()  — v2, single CTE query, resolves full hierarchy
--   has_permission()         — v2, single query, no is_public check
--   share_resource_with_user()  — existing, validates ownership
--   share_resource_with_org()   — NEW, validates ownership + org membership
--   update_permission_level()   — NEW, validates ownership
--   revoke_resource_access()    — existing
--   make_resource_public()      — existing, works on any table
--   make_resource_private()     — existing, works on any table
--   set_authenticated_read()    — existing, works on any table
--
-- COLUMNS on all tables: is_public, authenticated_read, organization_id,
--   workspace_id, project_id (where applicable)
-- AUTO-FILL TRIGGERS: active on 17 tables
-- INDEXES: deployed on permissions, membership, and key tables
--
-- HOW TO USE THIS FILE:
--   1. Copy ONE section (e.g., "TABLE: tasks")
--   2. Review the "REACT CODE TO UPDATE" notes
--   3. Update your React code
--   4. Run the SQL section
--   5. Test
--   6. Move to the next table
-- =============================================================================


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: tasks
-- ═══════════════════════════════════════════════════════════════════════════════
-- BREAKING CHANGES:
--   1. task_assignments: RLS enabled (was open — queries will now be filtered)
--   2. task_attachments: RLS enabled (was open — queries will now be filtered)
--   3. Tasks visible to project/workspace/org members (was owner+assignee only)
-- 
-- REACT CODE TO UPDATE BEFORE RUNNING:
--   - "My tasks" lists: add .eq('user_id', userId) to keep them personal
--   - task_assignments queries: will now be filtered by access
--   - task_attachments queries: will now be filtered by access
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop old policies
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks and assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view their own tasks and assigned tasks" ON public.tasks;

-- New gold standard
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

-- task_comments
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

-- task_assignments (ENABLING RLS)
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

-- task_attachments (ENABLING RLS)
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
-- TABLE: prompts (+ prompt_versions)
-- ═══════════════════════════════════════════════════════════════════════════════
-- BREAKING CHANGES:
--   - Prompts visible to project/workspace/org members
--   - Public read now available via is_public
--
-- REACT CODE TO UPDATE:
--   - Prompt lists may return more results; filter with .eq('user_id', userId) for "my prompts"
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "prompts_delete_policy" ON public.prompts;
DROP POLICY IF EXISTS "prompts_insert_policy" ON public.prompts;
DROP POLICY IF EXISTS "prompts_select_policy" ON public.prompts;
DROP POLICY IF EXISTS "prompts_update_policy" ON public.prompts;

CREATE POLICY "prompts_public_read" ON public.prompts
  FOR SELECT TO anon, authenticated USING (is_public = true);

CREATE POLICY "prompts_authenticated_read" ON public.prompts
  FOR SELECT TO authenticated USING (authenticated_read = true);

CREATE POLICY "prompts_select" ON public.prompts
  FOR SELECT TO authenticated
  USING (check_resource_access('prompts', id, 'viewer', user_id, NULL, project_id, workspace_id, organization_id));

CREATE POLICY "prompts_insert" ON public.prompts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "prompts_update" ON public.prompts
  FOR UPDATE TO authenticated
  USING (check_resource_access('prompts', id, 'editor', user_id, NULL, project_id, workspace_id, organization_id))
  WITH CHECK (check_resource_access('prompts', id, 'editor', user_id, NULL, project_id, workspace_id, organization_id));

CREATE POLICY "prompts_delete" ON public.prompts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR check_resource_access('prompts', id, 'admin', user_id, NULL, project_id, workspace_id, organization_id));

-- prompt_versions
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
-- TABLE: notes (+ note_versions)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
DROP POLICY IF EXISTS "notes_delete_policy" ON public.notes;
DROP POLICY IF EXISTS "notes_insert_policy" ON public.notes;
DROP POLICY IF EXISTS "notes_select_policy" ON public.notes;
DROP POLICY IF EXISTS "notes_update_policy" ON public.notes;

CREATE POLICY "notes_public_read" ON public.notes
  FOR SELECT TO anon, authenticated USING (is_public = true);

CREATE POLICY "notes_authenticated_read" ON public.notes
  FOR SELECT TO authenticated USING (authenticated_read = true);

CREATE POLICY "notes_select" ON public.notes
  FOR SELECT TO authenticated
  USING (check_resource_access('notes', id, 'viewer', user_id, NULL, project_id, workspace_id, organization_id));

CREATE POLICY "notes_insert" ON public.notes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "notes_update" ON public.notes
  FOR UPDATE TO authenticated
  USING (check_resource_access('notes', id, 'editor', user_id, NULL, project_id, workspace_id, organization_id))
  WITH CHECK (check_resource_access('notes', id, 'editor', user_id, NULL, project_id, workspace_id, organization_id));

CREATE POLICY "notes_delete" ON public.notes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR check_resource_access('notes', id, 'admin', user_id, NULL, project_id, workspace_id, organization_id));

-- note_versions
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
-- TEMPLATE: Any other table (copy + find/replace {TABLE})
-- ═══════════════════════════════════════════════════════════════════════════════
-- For tables WITH an assignee column, pass it as the 5th arg.
-- For tables WITHOUT one, pass NULL.

/*
DROP POLICY IF EXISTS "old_policy_name" ON public.{TABLE};

CREATE POLICY "{TABLE}_public_read" ON public.{TABLE}
  FOR SELECT TO anon, authenticated USING (is_public = true);

CREATE POLICY "{TABLE}_authenticated_read" ON public.{TABLE}
  FOR SELECT TO authenticated USING (authenticated_read = true);

CREATE POLICY "{TABLE}_select" ON public.{TABLE}
  FOR SELECT TO authenticated
  USING (check_resource_access('{TABLE}', id, 'viewer', user_id, NULL, project_id, workspace_id, organization_id));

CREATE POLICY "{TABLE}_insert" ON public.{TABLE}
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "{TABLE}_update" ON public.{TABLE}
  FOR UPDATE TO authenticated
  USING (check_resource_access('{TABLE}', id, 'editor', user_id, NULL, project_id, workspace_id, organization_id))
  WITH CHECK (check_resource_access('{TABLE}', id, 'editor', user_id, NULL, project_id, workspace_id, organization_id));

CREATE POLICY "{TABLE}_delete" ON public.{TABLE}
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR check_resource_access('{TABLE}', id, 'admin', user_id, NULL, project_id, workspace_id, organization_id));
*/


-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC CHEAT SHEET (for React frontend)
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- Share with user:
--   supabase.rpc('share_resource_with_user', { p_resource_type: 'tasks', p_resource_id: taskId, p_target_user_id: userId, p_permission_level: 'editor' })
--
-- Share with org:
--   supabase.rpc('share_resource_with_org', { p_resource_type: 'tasks', p_resource_id: taskId, p_target_org_id: orgId, p_permission_level: 'viewer' })
--
-- Update permission level:
--   supabase.rpc('update_permission_level', { p_resource_type: 'tasks', p_resource_id: taskId, p_target_user_id: userId, p_new_level: 'editor' })
--
-- Revoke access:
--   supabase.rpc('revoke_resource_access', { p_resource_type: 'tasks', p_resource_id: taskId, p_target_user_id: userId })
--
-- Make public:
--   supabase.rpc('make_resource_public', { p_resource_type: 'tasks', p_resource_id: taskId })
--
-- Make private:
--   supabase.rpc('make_resource_private', { p_resource_type: 'tasks', p_resource_id: taskId })
--
-- Toggle authenticated read:
--   supabase.rpc('set_authenticated_read', { p_resource_type: 'tasks', p_resource_id: taskId, p_enabled: true })
--
-- Get permissions for a resource (owner only):
--   supabase.rpc('get_resource_permissions', { p_resource_type: 'tasks', p_resource_id: taskId })
