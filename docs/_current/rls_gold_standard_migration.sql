-- =============================================================================
-- AI MATRX: Gold Standard RLS Migration
-- Purpose: Upgrade tasks (and sub-tables) to the full access hierarchy
-- Pattern: User > Org > Workspace > Project > Task > Sub-items
-- =============================================================================
-- This migration:
--   1. Adds missing columns to tasks (is_public, organization_id, workspace_id)
--   2. Upgrades has_permission() to support hierarchy inheritance
--   3. Drops old naive policies on tasks + sub-tables
--   4. Creates the gold-standard policies for tasks + sub-tables
--   5. Adds RPC functions for easy sharing management
--   6. Enables RLS on task_assignments and task_attachments
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Schema Additions
-- ─────────────────────────────────────────────────────────────────────────────

-- Add is_public flag to tasks (allows unauthenticated public reads)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Add organization_id to tasks (for org-level inheritance)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Add workspace_id to tasks (for workspace-level inheritance)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Create indexes for RLS query performance (critical for production)
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_public ON public.tasks(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);

-- Index for permissions table (critical for has_permission performance)
CREATE INDEX IF NOT EXISTS idx_permissions_resource_lookup
  ON public.permissions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_permissions_user_grant
  ON public.permissions(granted_to_user_id) WHERE granted_to_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_permissions_org_grant
  ON public.permissions(granted_to_organization_id) WHERE granted_to_organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_permissions_public
  ON public.permissions(resource_type, resource_id) WHERE is_public = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Hierarchy-Aware Access Check Function
-- ─────────────────────────────────────────────────────────────────────────────

-- This is the CORE function that resolves the full hierarchy chain.
-- For a task, it checks:
--   1. Direct task-level permission (in permissions table)
--   2. Project membership (if task.project_id is set)
--   3. Workspace membership (if task.workspace_id or project.workspace_id is set)
--   4. Organization membership (if task.organization_id or project.organization_id is set)
--
-- This means: share a workspace → all projects in it → all tasks in those projects
-- are automatically accessible. No per-task permission rows needed.

CREATE OR REPLACE FUNCTION public.has_task_access(
  p_task_id uuid,
  p_required_level permission_level DEFAULT 'viewer'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_task record;
  v_project record;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;

  -- Fetch the task and its hierarchy pointers
  SELECT t.user_id, t.assignee_id, t.project_id, t.organization_id, t.workspace_id, t.is_public
  INTO v_task
  FROM tasks t WHERE t.id = p_task_id;

  IF v_task IS NULL THEN RETURN false; END IF;

  -- 1. Owner always has full access
  IF v_task.user_id = v_uid THEN RETURN true; END IF;

  -- 2. Assignee has editor-level access
  IF v_task.assignee_id = v_uid THEN
    IF p_required_level IN ('viewer', 'editor') THEN RETURN true; END IF;
  END IF;

  -- 3. Direct permission on the task itself (via permissions table)
  IF has_permission('tasks', p_task_id, p_required_level) THEN RETURN true; END IF;

  -- 4. Project-level access (project member inherits task viewer)
  IF v_task.project_id IS NOT NULL THEN
    IF auth_is_project_member(v_task.project_id) AND p_required_level = 'viewer' THEN
      RETURN true;
    END IF;
    IF auth_is_project_admin(v_task.project_id) THEN RETURN true; END IF;

    -- Walk up: project → workspace → org
    SELECT p.workspace_id, p.organization_id INTO v_project
    FROM projects p WHERE p.id = v_task.project_id;

    IF v_project IS NOT NULL THEN
      -- 5. Workspace-level access
      IF v_project.workspace_id IS NOT NULL THEN
        IF EXISTS (
          SELECT 1 FROM workspace_members
          WHERE workspace_id = v_project.workspace_id
            AND user_id = v_uid
        ) THEN
          IF p_required_level = 'viewer' THEN RETURN true; END IF;
          IF EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = v_project.workspace_id
              AND user_id = v_uid
              AND role IN ('owner', 'admin')
          ) THEN RETURN true; END IF;
        END IF;
      END IF;

      -- 6. Organization-level access
      IF v_project.organization_id IS NOT NULL THEN
        IF EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_id = v_project.organization_id
            AND user_id = v_uid
            AND role IN ('owner', 'admin')
        ) THEN RETURN true; END IF;
      END IF;
    END IF;
  END IF;

  -- Also check direct org/workspace on the task itself (for tasks not in a project)
  IF v_task.workspace_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = v_task.workspace_id AND user_id = v_uid
    ) THEN
      IF p_required_level = 'viewer' THEN RETURN true; END IF;
      IF EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = v_task.workspace_id AND user_id = v_uid
          AND role IN ('owner', 'admin')
      ) THEN RETURN true; END IF;
    END IF;
  END IF;

  IF v_task.organization_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = v_task.organization_id AND user_id = v_uid
        AND role IN ('owner', 'admin')
    ) THEN RETURN true; END IF;
  END IF;

  RETURN false;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Drop Old Policies
-- ─────────────────────────────────────────────────────────────────────────────

-- Tasks
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks and assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view their own tasks and assigned tasks" ON public.tasks;

-- Task Comments
DROP POLICY IF EXISTS "Users can create comments on their tasks" ON public.task_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.task_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.task_comments;
DROP POLICY IF EXISTS "Users can view comments on their tasks" ON public.task_comments;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Gold Standard Policies — tasks
-- ─────────────────────────────────────────────────────────────────────────────

-- A. PUBLIC READ: Unauthenticated users can read public tasks
-- This uses the anon role explicitly — no auth.uid() check.
CREATE POLICY "tasks_public_read"
  ON public.tasks FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- B. AUTHENTICATED READ: Any logged-in user can read tasks with authenticated_read
CREATE POLICY "tasks_authenticated_read"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (authenticated_read = true);

-- C. OWNER + HIERARCHY SELECT: Full hierarchy resolution
CREATE POLICY "tasks_select_hierarchy"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR assignee_id = auth.uid()
    OR has_task_access(id, 'viewer')
  );

-- D. INSERT: Only authenticated users, must be the owner
CREATE POLICY "tasks_insert"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- E. UPDATE: Owner, assignee, or anyone with editor+ access through hierarchy
CREATE POLICY "tasks_update"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR assignee_id = auth.uid()
    OR has_task_access(id, 'editor')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR assignee_id = auth.uid()
    OR has_task_access(id, 'editor')
  );

-- F. DELETE: Owner or admin-level access only
CREATE POLICY "tasks_delete"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_task_access(id, 'admin')
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: Gold Standard Policies — task_comments
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "task_comments_select"
  ON public.task_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_comments.task_id
      AND (
        t.user_id = auth.uid()
        OR t.assignee_id = auth.uid()
        OR has_task_access(t.id, 'viewer')
      )
    )
  );

-- Public can also read comments on public tasks
CREATE POLICY "task_comments_public_read"
  ON public.task_comments FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_comments.task_id AND t.is_public = true)
  );

CREATE POLICY "task_comments_insert"
  ON public.task_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_comments.task_id
      AND (
        t.user_id = auth.uid()
        OR t.assignee_id = auth.uid()
        OR has_task_access(t.id, 'editor')
      )
    )
  );

CREATE POLICY "task_comments_update"
  ON public.task_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "task_comments_delete"
  ON public.task_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: Gold Standard Policies — task_assignments
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_assignments_select"
  ON public.task_assignments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR assigned_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_assignments.task_id
      AND (t.user_id = auth.uid() OR has_task_access(t.id, 'viewer'))
    )
  );

CREATE POLICY "task_assignments_insert"
  ON public.task_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_assignments.task_id
      AND (t.user_id = auth.uid() OR has_task_access(t.id, 'editor'))
    )
  );

CREATE POLICY "task_assignments_delete"
  ON public.task_assignments FOR DELETE
  TO authenticated
  USING (
    assigned_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_assignments.task_id
      AND (t.user_id = auth.uid() OR has_task_access(t.id, 'admin'))
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7: Gold Standard Policies — task_attachments
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_attachments_select"
  ON public.task_attachments FOR SELECT
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_attachments.task_id
      AND (
        t.user_id = auth.uid()
        OR t.assignee_id = auth.uid()
        OR has_task_access(t.id, 'viewer')
      )
    )
  );

-- Public can view attachments on public tasks
CREATE POLICY "task_attachments_public_read"
  ON public.task_attachments FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_attachments.task_id AND t.is_public = true)
  );

CREATE POLICY "task_attachments_insert"
  ON public.task_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_attachments.task_id
      AND (t.user_id = auth.uid() OR has_task_access(t.id, 'editor'))
    )
  );

CREATE POLICY "task_attachments_delete"
  ON public.task_attachments FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_attachments.task_id
      AND (t.user_id = auth.uid() OR has_task_access(t.id, 'admin'))
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 8: RPC Functions for Easy Sharing Management
-- ─────────────────────────────────────────────────────────────────────────────

-- Share a task with a user (convenience wrapper)
CREATE OR REPLACE FUNCTION public.share_task(
  p_task_id uuid,
  p_target_user_id uuid,
  p_level text DEFAULT 'viewer'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN share_resource_with_user('tasks', p_task_id, p_target_user_id, p_level);
END;
$$;

-- Make a task public (accessible to anyone, no auth required)
CREATE OR REPLACE FUNCTION public.make_task_public(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Only task owner can make public
  IF NOT EXISTS (SELECT 1 FROM tasks WHERE id = p_task_id AND user_id = v_uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the task owner can make it public');
  END IF;

  UPDATE tasks SET is_public = true WHERE id = p_task_id;

  RETURN jsonb_build_object('success', true, 'message', 'Task is now public');
END;
$$;

-- Make a task private again
CREATE OR REPLACE FUNCTION public.make_task_private(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM tasks WHERE id = p_task_id AND user_id = v_uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the task owner can change visibility');
  END IF;

  UPDATE tasks SET is_public = false WHERE id = p_task_id;

  RETURN jsonb_build_object('success', true, 'message', 'Task is now private');
END;
$$;

-- Revoke a user's access to a task
CREATE OR REPLACE FUNCTION public.revoke_task_access(
  p_task_id uuid,
  p_target_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_deleted int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM tasks WHERE id = p_task_id AND user_id = v_uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the task owner can revoke access');
  END IF;

  DELETE FROM permissions
  WHERE resource_type = 'tasks'
    AND resource_id = p_task_id
    AND granted_to_user_id = p_target_user_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No matching permission found');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Access revoked');
END;
$$;

-- Bulk share: share entire project's tasks with a user
CREATE OR REPLACE FUNCTION public.share_project_tasks(
  p_project_id uuid,
  p_target_user_id uuid,
  p_level text DEFAULT 'viewer'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Verify caller is project admin
  IF NOT auth_is_project_admin(p_project_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must be project admin');
  END IF;

  -- With the hierarchy model, just adding a project_member row is sufficient.
  -- But if you want explicit per-task permissions too:
  INSERT INTO permissions (resource_type, resource_id, granted_to_user_id, permission_level, created_by)
  SELECT 'tasks', t.id, p_target_user_id, p_level::permission_level, v_uid
  FROM tasks t
  WHERE t.project_id = p_project_id
    AND NOT EXISTS (
      SELECT 1 FROM permissions p
      WHERE p.resource_type = 'tasks' AND p.resource_id = t.id
        AND p.granted_to_user_id = p_target_user_id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Shared %s tasks', v_count),
    'count', v_count
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 9: Auto-populate hierarchy columns trigger
-- ─────────────────────────────────────────────────────────────────────────────

-- When a task is inserted/updated with a project_id, auto-fill org + workspace
CREATE OR REPLACE FUNCTION public.tasks_auto_fill_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    SELECT p.organization_id, p.workspace_id
    INTO NEW.organization_id, NEW.workspace_id
    FROM projects p WHERE p.id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_auto_fill_hierarchy ON public.tasks;
CREATE TRIGGER trg_tasks_auto_fill_hierarchy
  BEFORE INSERT OR UPDATE OF project_id ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.tasks_auto_fill_hierarchy();

-- Backfill existing tasks that have project_id but missing org/workspace
UPDATE tasks t
SET
  organization_id = p.organization_id,
  workspace_id = p.workspace_id
FROM projects p
WHERE t.project_id = p.id
  AND (t.organization_id IS NULL OR t.workspace_id IS NULL);
