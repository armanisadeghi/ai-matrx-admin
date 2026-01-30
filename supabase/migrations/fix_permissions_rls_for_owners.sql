-- ============================================================================
-- Fix Permissions Table RLS - Allow Owners to View/Manage Permissions
-- ============================================================================
-- This migration adds RLS policies to the permissions table so that:
-- 1. Resource owners can view all permissions for their resources
-- 2. Resource owners can manage (insert/update/delete) permissions for their resources
-- 3. Users can view permissions granted to them
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SELECT Policy: View permissions
-- ============================================================================
-- Users can view permissions if:
-- 1. The permission is granted to them
-- 2. The permission is public
-- 
-- Note: We use a SECURITY DEFINER function for owners to view their permissions
-- to avoid infinite recursion with resource table RLS policies

DO $$ 
BEGIN
    -- Drop existing SELECT policies if they exist
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'permissions' 
        AND policyname = 'Users can view relevant permissions'
    ) THEN
        DROP POLICY "Users can view relevant permissions" ON permissions;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'permissions' 
        AND policyname = 'Users can view all permissions temporarily'
    ) THEN
        DROP POLICY "Users can view all permissions temporarily" ON permissions;
    END IF;
END $$;

CREATE POLICY "Users can view relevant permissions"
ON permissions FOR SELECT
USING (
    -- User is granted the permission
    granted_to_user_id = auth.uid()
    OR
    -- Permission is public (anyone can see it exists)
    is_public = TRUE
);

-- ============================================================================
-- INSERT Policy: Create permissions
-- ============================================================================
-- Users can create permissions only for resources they own

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'permissions' 
        AND policyname = 'Users can create permissions for own resources'
    ) THEN
        DROP POLICY "Users can create permissions for own resources" ON permissions;
    END IF;
END $$;

CREATE POLICY "Users can create permissions for own resources"
ON permissions FOR INSERT
WITH CHECK (
    (
        resource_type = 'prompt' 
        AND EXISTS (
            SELECT 1 FROM prompts 
            WHERE id = resource_id 
            AND user_id = auth.uid()
        )
    )
    OR
    (
        resource_type = 'note' 
        AND EXISTS (
            SELECT 1 FROM notes 
            WHERE id = resource_id 
            AND user_id = auth.uid()
        )
    )
    OR
    (
        resource_type = 'prompt_app' 
        AND EXISTS (
            SELECT 1 FROM prompt_apps 
            WHERE id = resource_id 
            AND user_id = auth.uid()
        )
    )
);

-- ============================================================================
-- UPDATE Policy: Update permissions
-- ============================================================================
-- Users can update permissions only for resources they own

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'permissions' 
        AND policyname = 'Users can update permissions for own resources'
    ) THEN
        DROP POLICY "Users can update permissions for own resources" ON permissions;
    END IF;
END $$;

CREATE POLICY "Users can update permissions for own resources"
ON permissions FOR UPDATE
USING (
    (
        resource_type = 'prompt' 
        AND EXISTS (
            SELECT 1 FROM prompts 
            WHERE id = resource_id 
            AND user_id = auth.uid()
        )
    )
    OR
    (
        resource_type = 'note' 
        AND EXISTS (
            SELECT 1 FROM notes 
            WHERE id = resource_id 
            AND user_id = auth.uid()
        )
    )
    OR
    (
        resource_type = 'prompt_app' 
        AND EXISTS (
            SELECT 1 FROM prompt_apps 
            WHERE id = resource_id 
            AND user_id = auth.uid()
        )
    )
);

-- ============================================================================
-- DELETE Policy: Delete permissions
-- ============================================================================
-- Users can delete permissions only for resources they own

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'permissions' 
        AND policyname = 'Users can delete permissions for own resources'
    ) THEN
        DROP POLICY "Users can delete permissions for own resources" ON permissions;
    END IF;
END $$;

CREATE POLICY "Users can delete permissions for own resources"
ON permissions FOR DELETE
USING (
    (
        resource_type = 'prompt' 
        AND EXISTS (
            SELECT 1 FROM prompts 
            WHERE id = resource_id 
            AND user_id = auth.uid()
        )
    )
    OR
    (
        resource_type = 'note' 
        AND EXISTS (
            SELECT 1 FROM notes 
            WHERE id = resource_id 
            AND user_id = auth.uid()
        )
    )
    OR
    (
        resource_type = 'prompt_app' 
        AND EXISTS (
            SELECT 1 FROM prompt_apps 
            WHERE id = resource_id 
            AND user_id = auth.uid()
        )
    )
);

-- ============================================================================
-- Helper Function: Get permissions for owned resources with user details
-- ============================================================================
-- This SECURITY DEFINER function allows resource owners to fetch permissions
-- without triggering infinite recursion with RLS policies

DROP FUNCTION IF EXISTS get_resource_permissions(TEXT, UUID);

CREATE OR REPLACE FUNCTION get_resource_permissions(
    p_resource_type TEXT,
    p_resource_id UUID
)
RETURNS TABLE (
    id UUID,
    resource_type TEXT,
    resource_id UUID,
    granted_to_user_id UUID,
    granted_to_organization_id UUID,
    is_public BOOLEAN,
    permission_level TEXT,
    created_at TIMESTAMPTZ,
    granted_to_user JSONB,
    granted_to_organization JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_owner BOOLEAN := FALSE;
BEGIN
    -- Check if current user owns the resource
    IF p_resource_type = 'prompt' THEN
        SELECT EXISTS (
            SELECT 1 FROM prompts 
            WHERE prompts.id = p_resource_id 
            AND prompts.user_id = auth.uid()
        ) INTO v_is_owner;
    ELSIF p_resource_type = 'note' THEN
        SELECT EXISTS (
            SELECT 1 FROM notes 
            WHERE notes.id = p_resource_id 
            AND notes.user_id = auth.uid()
        ) INTO v_is_owner;
    ELSIF p_resource_type = 'prompt_app' THEN
        SELECT EXISTS (
            SELECT 1 FROM prompt_apps 
            WHERE prompt_apps.id = p_resource_id 
            AND prompt_apps.user_id = auth.uid()
        ) INTO v_is_owner;
    END IF;
    
    -- If not owner, return empty result
    IF NOT v_is_owner THEN
        RETURN;
    END IF;
    
    -- Return all permissions for this resource with user details
    RETURN QUERY
    SELECT 
        perm.id,
        perm.resource_type::TEXT,
        perm.resource_id,
        perm.granted_to_user_id,
        perm.granted_to_organization_id,
        perm.is_public,
        perm.permission_level::TEXT,
        perm.created_at,
        -- User details as JSONB
        CASE 
            WHEN perm.granted_to_user_id IS NOT NULL THEN
                jsonb_build_object(
                    'id', u.id::TEXT,
                    'email', u.email,
                    'displayName', COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
                )
            ELSE NULL
        END AS granted_to_user,
        -- Organization details as JSONB (placeholder - add when orgs exist)
        CASE 
            WHEN perm.granted_to_organization_id IS NOT NULL THEN
                jsonb_build_object(
                    'id', perm.granted_to_organization_id::TEXT,
                    'name', 'Organization',
                    'slug', 'org'
                )
            ELSE NULL
        END AS granted_to_organization
    FROM permissions perm
    LEFT JOIN auth.users u ON u.id = perm.granted_to_user_id
    WHERE perm.resource_type = get_resource_permissions.p_resource_type
        AND perm.resource_id = get_resource_permissions.p_resource_id
    ORDER BY perm.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_resource_permissions(TEXT, UUID) TO authenticated;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant table access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON permissions TO authenticated;

-- Add helpful comment
COMMENT ON TABLE permissions IS 'Stores resource sharing permissions. RLS ensures users can only view/manage permissions for resources they own or permissions granted to them.';
