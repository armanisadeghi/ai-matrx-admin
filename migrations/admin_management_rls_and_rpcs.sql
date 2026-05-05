-- Admin management: RLS + SECURITY DEFINER RPCs + audit log.
--
-- The codebase is hostile territory (any contributor can edit a TS check).
-- DB-enforced RLS + RPCs are the only defenses that survive a malicious or
-- careless code change. Everything in this migration is the load-bearing
-- security layer; the API + UI are belt-and-suspenders.

-- ============================================================================
-- 1. RLS on public.admins
-- ============================================================================
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_select_self_or_super" ON public.admins;
DROP POLICY IF EXISTS "admins_no_direct_writes" ON public.admins;

-- SELECT: callers can see their own row, plus super admins can see everything.
CREATE POLICY "admins_select_self_or_super"
ON public.admins
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_super_admin()
);

-- INSERT/UPDATE/DELETE: deny under RLS — mutations only via the
-- SECURITY DEFINER RPCs below (which check is_super_admin() themselves).
CREATE POLICY "admins_no_direct_writes"
ON public.admins
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- service_role bypasses RLS by Supabase default — for migrations / system work.

-- ============================================================================
-- 2. Audit log table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  action text NOT NULL CHECK (action IN ('promote', 'update', 'revoke')),
  target_user_id uuid NOT NULL,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx
  ON public.admin_audit_log (target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_actor_idx
  ON public.admin_audit_log (actor_user_id, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_select_super" ON public.admin_audit_log;
DROP POLICY IF EXISTS "admin_audit_no_direct_writes" ON public.admin_audit_log;

CREATE POLICY "admin_audit_select_super"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "admin_audit_no_direct_writes"
ON public.admin_audit_log
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- ============================================================================
-- 3. Audit trigger on public.admins
-- ============================================================================
CREATE OR REPLACE FUNCTION public._admin_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid;
BEGIN
  actor := auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_audit_log (actor_user_id, action, target_user_id, before, after)
    VALUES (actor, 'promote', NEW.user_id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.admin_audit_log (actor_user_id, action, target_user_id, before, after)
    VALUES (actor, 'update', NEW.user_id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_audit_log (actor_user_id, action, target_user_id, before, after)
    VALUES (actor, 'revoke', OLD.user_id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS admins_audit_trigger ON public.admins;
CREATE TRIGGER admins_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public._admin_audit_trigger();

-- ============================================================================
-- 4. Bricking guards
-- ============================================================================
CREATE OR REPLACE FUNCTION public._count_super_admins()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.admins WHERE level = 'super_admin';
$$;

-- ============================================================================
-- 5. Management RPCs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_list()
RETURNS TABLE (
  user_id uuid,
  email text,
  level public.admin_level,
  permissions jsonb,
  metadata jsonb,
  admin_created_at timestamptz,
  user_created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: Super Admin required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT
      a.user_id,
      u.email::text,
      a.level,
      a.permissions,
      a.metadata,
      a.created_at AS admin_created_at,
      u.created_at AS user_created_at,
      u.last_sign_in_at
    FROM public.admins a
    LEFT JOIN auth.users u ON u.id = a.user_id
    ORDER BY a.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_promote(
  target_user_id uuid,
  target_level public.admin_level DEFAULT 'developer',
  target_permissions jsonb DEFAULT '{}'::jsonb,
  target_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.admins
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted public.admins;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: Super Admin required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'User % does not exist', target_user_id USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.admins (user_id, level, permissions, metadata)
  VALUES (target_user_id, target_level, target_permissions, target_metadata)
  RETURNING * INTO inserted;

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update(
  target_user_id uuid,
  target_level public.admin_level DEFAULT NULL,
  target_permissions jsonb DEFAULT NULL,
  target_metadata jsonb DEFAULT NULL
)
RETURNS public.admins
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_row public.admins;
  updated public.admins;
  new_level public.admin_level;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: Super Admin required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO current_row FROM public.admins WHERE user_id = target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % is not an admin', target_user_id USING ERRCODE = '23503';
  END IF;

  new_level := COALESCE(target_level, current_row.level);

  IF target_user_id = auth.uid()
     AND current_row.level = 'super_admin'
     AND new_level <> 'super_admin' THEN
    RAISE EXCEPTION 'Cannot demote yourself from Super Admin' USING ERRCODE = '42501';
  END IF;

  IF current_row.level = 'super_admin'
     AND new_level <> 'super_admin'
     AND public._count_super_admins() <= 1 THEN
    RAISE EXCEPTION 'Cannot demote the last Super Admin' USING ERRCODE = '42501';
  END IF;

  UPDATE public.admins
     SET level       = new_level,
         permissions = COALESCE(target_permissions, current_row.permissions),
         metadata    = COALESCE(target_metadata,    current_row.metadata)
   WHERE user_id = target_user_id
  RETURNING * INTO updated;

  RETURN updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke(target_user_id uuid)
RETURNS public.admins
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed public.admins;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: Super Admin required' USING ERRCODE = '42501';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot revoke your own admin access' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO removed FROM public.admins WHERE user_id = target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % is not an admin', target_user_id USING ERRCODE = '23503';
  END IF;

  IF removed.level = 'super_admin' AND public._count_super_admins() <= 1 THEN
    RAISE EXCEPTION 'Cannot revoke the last Super Admin' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.admins WHERE user_id = target_user_id;

  RETURN removed;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_audit(
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  actor_user_id uuid,
  actor_email text,
  action text,
  target_user_id uuid,
  target_email text,
  before jsonb,
  after jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: Super Admin required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT
      l.id,
      l.actor_user_id,
      au.email::text AS actor_email,
      l.action,
      l.target_user_id,
      tu.email::text AS target_email,
      l.before,
      l.after,
      l.created_at
    FROM public.admin_audit_log l
    LEFT JOIN auth.users au ON au.id = l.actor_user_id
    LEFT JOIN auth.users tu ON tu.id = l.target_user_id
    ORDER BY l.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_find_user_by_email(p_email text)
RETURNS TABLE (
  user_id uuid,
  email text,
  is_admin boolean,
  admin_level public.admin_level
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: Super Admin required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT
      u.id AS user_id,
      u.email::text,
      (a.user_id IS NOT NULL) AS is_admin,
      a.level
    FROM auth.users u
    LEFT JOIN public.admins a ON a.user_id = u.id
    WHERE lower(u.email) = lower(p_email)
    LIMIT 1;
END;
$$;

-- ============================================================================
-- 6. Grants
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.admin_list()                                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_promote(uuid, public.admin_level, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update(uuid, public.admin_level, jsonb, jsonb)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke(uuid)                                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_audit(integer, integer)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_find_user_by_email(text)                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin()                                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_status()                                    TO authenticated;
