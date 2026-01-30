-- ============================================================================
-- EMERGENCY ROLLBACK: Remove the problematic RLS policy causing infinite recursion
-- ============================================================================

-- Drop the problematic SELECT policy
DROP POLICY IF EXISTS "Users can view relevant permissions" ON permissions;

-- Temporarily allow all authenticated users to view permissions
-- This will be replaced by the proper policy after the fix
CREATE POLICY "Users can view all permissions temporarily"
ON permissions FOR SELECT
TO authenticated
USING (true);
