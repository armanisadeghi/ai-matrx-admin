-- ============================================================================
-- FIX PROMPT APPS RLS POLICIES
-- Run this to update all RLS policies for prompt app tables
-- ============================================================================

-- ============================================================================
-- PROMPT_APPS TABLE
-- ============================================================================

-- 1. Drop old policies
DROP POLICY IF EXISTS "Users can view their own prompt_apps" ON prompt_apps;
DROP POLICY IF EXISTS "Users can create their own prompt_apps" ON prompt_apps;
DROP POLICY IF EXISTS "Users can update their own prompt_apps" ON prompt_apps;
DROP POLICY IF EXISTS "Users can delete their own prompt_apps" ON prompt_apps;
DROP POLICY IF EXISTS "prompt_apps_select_policy" ON prompt_apps;
DROP POLICY IF EXISTS "prompt_apps_insert_policy" ON prompt_apps;
DROP POLICY IF EXISTS "prompt_apps_update_policy" ON prompt_apps;
DROP POLICY IF EXISTS "prompt_apps_delete_policy" ON prompt_apps;

-- 2. Create new policies
CREATE POLICY "prompt_apps_select_policy" ON prompt_apps
FOR SELECT
USING (
  user_id = auth.uid()
  OR status = 'published'  -- Allow anyone to view published apps
  OR has_permission('prompt_apps', id, 'viewer'::permission_level)
);

CREATE POLICY "prompt_apps_insert_policy" ON prompt_apps
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "prompt_apps_update_policy" ON prompt_apps
FOR UPDATE
USING (
  user_id = auth.uid()
  OR has_permission('prompt_apps', id, 'editor'::permission_level)
);

CREATE POLICY "prompt_apps_delete_policy" ON prompt_apps
FOR DELETE
USING (
  user_id = auth.uid()
  OR has_permission('prompt_apps', id, 'admin'::permission_level)
);

-- ============================================================================
-- PROMPT_APP_EXECUTIONS TABLE
-- ============================================================================

-- 1. Drop old policies
DROP POLICY IF EXISTS "Users can view their own prompt_app_executions" ON prompt_app_executions;
DROP POLICY IF EXISTS "Users can create their own prompt_app_executions" ON prompt_app_executions;
DROP POLICY IF EXISTS "Users can update their own prompt_app_executions" ON prompt_app_executions;
DROP POLICY IF EXISTS "Users can delete their own prompt_app_executions" ON prompt_app_executions;
DROP POLICY IF EXISTS "prompt_app_executions_select_policy" ON prompt_app_executions;
DROP POLICY IF EXISTS "prompt_app_executions_insert_policy" ON prompt_app_executions;
DROP POLICY IF EXISTS "prompt_app_executions_update_policy" ON prompt_app_executions;
DROP POLICY IF EXISTS "prompt_app_executions_delete_policy" ON prompt_app_executions;

-- 2. Create new policies
-- Users can only view executions for their own apps
CREATE POLICY "prompt_app_executions_select_policy" ON prompt_app_executions
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM prompt_apps 
    WHERE prompt_apps.id = prompt_app_executions.app_id 
    AND prompt_apps.user_id = auth.uid()
  )
);

-- Allow inserts from both authenticated users and anonymous (service role)
CREATE POLICY "prompt_app_executions_insert_policy" ON prompt_app_executions
FOR INSERT
WITH CHECK (true); -- Service role and API will handle validation

-- No update/delete policies - executions are immutable once created

-- ============================================================================
-- PROMPT_APP_ERRORS TABLE
-- ============================================================================

-- 1. Drop old policies
DROP POLICY IF EXISTS "Users can view their own prompt_app_errors" ON prompt_app_errors;
DROP POLICY IF EXISTS "Users can create their own prompt_app_errors" ON prompt_app_errors;
DROP POLICY IF EXISTS "Users can update their own prompt_app_errors" ON prompt_app_errors;
DROP POLICY IF EXISTS "Users can delete their own prompt_app_errors" ON prompt_app_errors;
DROP POLICY IF EXISTS "prompt_app_errors_select_policy" ON prompt_app_errors;
DROP POLICY IF EXISTS "prompt_app_errors_insert_policy" ON prompt_app_errors;
DROP POLICY IF EXISTS "prompt_app_errors_update_policy" ON prompt_app_errors;
DROP POLICY IF EXISTS "prompt_app_errors_delete_policy" ON prompt_app_errors;

-- 2. Create new policies
-- Users can only view errors for their own apps
CREATE POLICY "prompt_app_errors_select_policy" ON prompt_app_errors
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM prompt_apps 
    WHERE prompt_apps.id = prompt_app_errors.app_id 
    AND prompt_apps.user_id = auth.uid()
  )
);

-- Allow inserts from service role for error tracking
CREATE POLICY "prompt_app_errors_insert_policy" ON prompt_app_errors
FOR INSERT
WITH CHECK (true); -- Service role handles error creation

-- Allow app owners to update errors (mark as resolved)
CREATE POLICY "prompt_app_errors_update_policy" ON prompt_app_errors
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM prompt_apps 
    WHERE prompt_apps.id = prompt_app_errors.app_id 
    AND prompt_apps.user_id = auth.uid()
  )
);

-- ============================================================================
-- PROMPT_APP_RATE_LIMITS TABLE
-- ============================================================================

-- 1. Drop old policies
DROP POLICY IF EXISTS "Users can view their own prompt_app_rate_limits" ON prompt_app_rate_limits;
DROP POLICY IF EXISTS "Users can create their own prompt_app_rate_limits" ON prompt_app_rate_limits;
DROP POLICY IF EXISTS "Users can update their own prompt_app_rate_limits" ON prompt_app_rate_limits;
DROP POLICY IF EXISTS "Users can delete their own prompt_app_rate_limits" ON prompt_app_rate_limits;
DROP POLICY IF EXISTS "prompt_app_rate_limits_select_policy" ON prompt_app_rate_limits;
DROP POLICY IF EXISTS "prompt_app_rate_limits_insert_policy" ON prompt_app_rate_limits;
DROP POLICY IF EXISTS "prompt_app_rate_limits_update_policy" ON prompt_app_rate_limits;
DROP POLICY IF EXISTS "prompt_app_rate_limits_delete_policy" ON prompt_app_rate_limits;

-- 2. Create new policies
-- Users can view rate limits for their own apps or their own usage
CREATE POLICY "prompt_app_rate_limits_select_policy" ON prompt_app_rate_limits
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM prompt_apps 
    WHERE prompt_apps.id = prompt_app_rate_limits.app_id 
    AND prompt_apps.user_id = auth.uid()
  )
);

-- Allow inserts and updates from service role
CREATE POLICY "prompt_app_rate_limits_insert_policy" ON prompt_app_rate_limits
FOR INSERT
WITH CHECK (true); -- Service role handles rate limit tracking

CREATE POLICY "prompt_app_rate_limits_update_policy" ON prompt_app_rate_limits
FOR UPDATE
USING (true); -- Service role handles rate limit updates

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'prompt_apps' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE prompt_apps ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on prompt_apps';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'prompt_app_executions' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE prompt_app_executions ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on prompt_app_executions';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'prompt_app_errors' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE prompt_app_errors ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on prompt_app_errors';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'prompt_app_rate_limits' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE prompt_app_rate_limits ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on prompt_app_rate_limits';
  END IF;
END $$;

-- Show all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies 
WHERE tablename LIKE 'prompt_app%'
ORDER BY tablename, policyname;

