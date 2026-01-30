-- ============================================================================
-- Shared Prompts System - SQL Functions
-- ============================================================================
-- These functions enable fetching shared prompts and checking access levels
-- for the permission-based prompt sharing feature.
-- ============================================================================

-- ============================================================================
-- Function: get_prompts_shared_with_me()
-- ============================================================================
-- Returns all prompts shared with the current user, including:
-- - Full prompt data
-- - Permission level (viewer/editor/admin)
-- - Owner email for display
-- ============================================================================

CREATE OR REPLACE FUNCTION get_prompts_shared_with_me()
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    messages JSONB,
    variable_defaults JSONB,
    settings JSONB,
    user_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    permission_level TEXT,
    owner_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name::TEXT,
        p.description::TEXT,
        p.messages,
        p.variable_defaults,
        p.settings,
        p.user_id,
        p.created_at,
        p.updated_at,
        perm.permission_level::TEXT,
        u.email::TEXT AS owner_email
    FROM prompts p
    INNER JOIN permissions perm ON 
        perm.resource_type = 'prompt' 
        AND perm.resource_id = p.id
        AND perm.granted_to_user_id = auth.uid()
    LEFT JOIN auth.users u ON u.id = p.user_id
    WHERE p.user_id != auth.uid()  -- Exclude owned prompts
    ORDER BY p.updated_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_prompts_shared_with_me() TO authenticated;

-- ============================================================================
-- Function: get_prompt_access_level(prompt_id UUID)
-- ============================================================================
-- Returns access information for a specific prompt:
-- - is_owner: boolean indicating if current user owns the prompt
-- - permission_level: 'viewer' | 'editor' | 'admin' | null
-- - owner_email: email of the prompt owner (for display)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_prompt_access_level(prompt_id UUID)
RETURNS TABLE (
    is_owner BOOLEAN,
    permission_level TEXT,
    owner_email TEXT,
    can_edit BOOLEAN,
    can_delete BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prompt_owner_id UUID;
    v_current_user_id UUID;
    v_permission_level TEXT;
    v_owner_email TEXT;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();
    
    -- Get prompt owner and owner email
    SELECT p.user_id, u.email 
    INTO v_prompt_owner_id, v_owner_email
    FROM prompts p
    LEFT JOIN auth.users u ON u.id = p.user_id
    WHERE p.id = prompt_id;
    
    -- If prompt doesn't exist, return null values
    IF v_prompt_owner_id IS NULL THEN
        RETURN QUERY SELECT 
            FALSE::BOOLEAN AS is_owner,
            NULL::TEXT AS permission_level,
            NULL::TEXT AS owner_email,
            FALSE::BOOLEAN AS can_edit,
            FALSE::BOOLEAN AS can_delete;
        RETURN;
    END IF;
    
    -- Check if current user is owner
    IF v_prompt_owner_id = v_current_user_id THEN
        RETURN QUERY SELECT 
            TRUE::BOOLEAN AS is_owner,
            'admin'::TEXT AS permission_level,
            v_owner_email AS owner_email,
            TRUE::BOOLEAN AS can_edit,
            TRUE::BOOLEAN AS can_delete;
        RETURN;
    END IF;
    
    -- Check for direct user permission
    SELECT perm.permission_level::TEXT INTO v_permission_level
    FROM permissions perm
    WHERE perm.resource_type = 'prompt'
        AND perm.resource_id = prompt_id
        AND perm.granted_to_user_id = v_current_user_id;
    
    -- Check for public permission if no direct permission
    IF v_permission_level IS NULL THEN
        SELECT perm.permission_level::TEXT INTO v_permission_level
        FROM permissions perm
        WHERE perm.resource_type = 'prompt'
            AND perm.resource_id = prompt_id
            AND perm.is_public = TRUE;
    END IF;
    
    -- Return access info
    RETURN QUERY SELECT 
        FALSE::BOOLEAN AS is_owner,
        v_permission_level AS permission_level,
        v_owner_email AS owner_email,
        (v_permission_level IN ('editor', 'admin'))::BOOLEAN AS can_edit,
        FALSE::BOOLEAN AS can_delete;  -- Only owners can delete
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_prompt_access_level(UUID) TO authenticated;

-- ============================================================================
-- Update RLS Policies for Prompts Table
-- ============================================================================
-- Ensure users can read prompts that have been shared with them

-- First, check if policy exists and drop it if needed
DO $$ 
BEGIN
    -- Drop existing select policy if it exists
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'prompts' 
        AND policyname = 'Users can view own prompts'
    ) THEN
        DROP POLICY "Users can view own prompts" ON prompts;
    END IF;
    
    -- Drop shared prompts policy if it exists
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'prompts' 
        AND policyname = 'Users can view prompts shared with them'
    ) THEN
        DROP POLICY "Users can view prompts shared with them" ON prompts;
    END IF;
END $$;

-- Create unified SELECT policy that allows:
-- 1. Users to view their own prompts
-- 2. Users to view prompts shared with them
-- 3. Users to view public prompts
CREATE POLICY "Users can view own or shared prompts"
ON prompts FOR SELECT
USING (
    -- User owns the prompt
    user_id = auth.uid() 
    OR 
    -- Prompt is shared with user directly
    EXISTS (
        SELECT 1 FROM permissions 
        WHERE resource_type = 'prompt' 
        AND resource_id = prompts.id 
        AND granted_to_user_id = auth.uid()
    )
    OR
    -- Prompt is public
    EXISTS (
        SELECT 1 FROM permissions 
        WHERE resource_type = 'prompt' 
        AND resource_id = prompts.id 
        AND is_public = TRUE
    )
);

-- Update policy for editing - only owners and users with editor/admin permission
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'prompts' 
        AND policyname = 'Users can update own prompts'
    ) THEN
        DROP POLICY "Users can update own prompts" ON prompts;
    END IF;
END $$;

CREATE POLICY "Users can update own or shared prompts with edit permission"
ON prompts FOR UPDATE
USING (
    -- User owns the prompt
    user_id = auth.uid() 
    OR 
    -- User has editor or admin permission
    EXISTS (
        SELECT 1 FROM permissions 
        WHERE resource_type = 'prompt' 
        AND resource_id = prompts.id 
        AND granted_to_user_id = auth.uid()
        AND permission_level IN ('editor', 'admin')
    )
);

-- Delete policy remains owner-only (no changes needed if it exists)
-- Only create if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'prompts' 
        AND policyname LIKE '%delete%'
    ) THEN
        CREATE POLICY "Users can delete own prompts"
        ON prompts FOR DELETE
        USING (user_id = auth.uid());
    END IF;
END $$;
