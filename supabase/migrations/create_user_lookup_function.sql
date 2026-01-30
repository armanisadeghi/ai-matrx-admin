-- ============================================================================
-- SHARING FUNCTIONS
-- ============================================================================
-- These functions handle user lookup and sharing with SECURITY DEFINER
-- to bypass RLS while maintaining proper authorization checks.
-- ============================================================================

-- ============================================================================
-- 1. USER LOOKUP FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS public.lookup_user_by_email(text);

CREATE OR REPLACE FUNCTION public.lookup_user_by_email(lookup_email text)
RETURNS TABLE (
  user_id uuid,
  user_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  normalized_email text;
  found_user_id uuid;
  found_user_email text;
BEGIN
  normalized_email := lower(trim(lookup_email));
  
  -- Try auth.users first
  SELECT au.id, au.email INTO found_user_id, found_user_email
  FROM auth.users au
  WHERE lower(au.email) = normalized_email
  LIMIT 1;
  
  IF found_user_id IS NOT NULL THEN
    user_id := found_user_id;
    user_email := found_user_email;
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Try public.users as fallback
  BEGIN
    SELECT u.id, u.email INTO found_user_id, found_user_email
    FROM public.users u
    WHERE lower(u.email) = normalized_email
    LIMIT 1;
    
    IF found_user_id IS NOT NULL THEN
      user_id := found_user_id;
      user_email := found_user_email;
      RETURN NEXT;
      RETURN;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_user_by_email(text) TO authenticated;

-- ============================================================================
-- 2. SHARE WITH USER FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS public.share_resource_with_user(text, uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.share_resource_with_user(
  p_resource_type text,
  p_resource_id uuid,
  p_target_user_id uuid,
  p_permission_level text DEFAULT 'viewer'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  resource_owner_id uuid;
  table_name text;
  new_permission_id uuid;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Validate permission level
  IF p_permission_level NOT IN ('viewer', 'editor', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid permission level');
  END IF;
  
  -- Determine table name from resource type
  table_name := CASE p_resource_type
    WHEN 'prompt' THEN 'prompts'
    WHEN 'workflow' THEN 'workflows'
    WHEN 'note' THEN 'notes'
    WHEN 'recipe' THEN 'recipes'
    WHEN 'document' THEN 'documents'
    WHEN 'conversation' THEN 'conversations'
    WHEN 'applet' THEN 'applets'
    ELSE p_resource_type || 's'
  END;
  
  -- Check if current user owns the resource
  EXECUTE format(
    'SELECT user_id FROM %I WHERE id = $1',
    table_name
  ) INTO resource_owner_id USING p_resource_id;
  
  IF resource_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resource not found');
  END IF;
  
  IF resource_owner_id != current_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not own this resource');
  END IF;
  
  -- Check if permission already exists
  IF EXISTS (
    SELECT 1 FROM permissions 
    WHERE resource_type = p_resource_type 
      AND resource_id = p_resource_id 
      AND granted_to_user_id = p_target_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This user already has access to this resource');
  END IF;
  
  -- Insert the permission (cast text to permission_level enum)
  INSERT INTO permissions (
    resource_type,
    resource_id,
    granted_to_user_id,
    permission_level,
    created_by
  ) VALUES (
    p_resource_type,
    p_resource_id,
    p_target_user_id,
    p_permission_level::permission_level,
    current_user_id
  )
  RETURNING id INTO new_permission_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Successfully shared with user',
    'permission_id', new_permission_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.share_resource_with_user(text, uuid, uuid, text) TO authenticated;

COMMENT ON FUNCTION public.share_resource_with_user IS 
'Shares a resource with a user. Verifies ownership before creating permission.';
