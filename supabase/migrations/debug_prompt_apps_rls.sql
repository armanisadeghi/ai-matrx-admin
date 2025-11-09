-- ============================================================================
-- DEBUG PROMPT APPS RLS
-- Run this to check what's blocking inserts
-- ============================================================================

-- 1. Check the current user
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- 2. Check the exact INSERT policy
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'prompt_apps' 
AND cmd = 'INSERT';

-- 3. Try a test insert (this will fail but show us the error)
-- Comment this out after you see the error message
-- INSERT INTO prompt_apps (prompt_id, slug, name, component_code, component_language, status)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000', -- fake prompt_id for testing
--   'test-app-' || floor(random() * 1000)::text,
--   'Test App',
--   'export default function TestApp() { return <div>Test</div>; }',
--   'react',
--   'draft'
-- );

-- 4. Check if the table exists and has the right columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'prompt_apps'
AND column_name IN ('id', 'user_id', 'prompt_id', 'slug', 'name', 'status')
ORDER BY ordinal_position;

-- 5. Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'prompt_apps';

