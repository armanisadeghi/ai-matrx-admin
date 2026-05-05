-- Admin Levels + future-flex JSONB columns
--
-- Adds a tier on top of the boolean admin check:
--   developer < senior_admin < super_admin
--
-- All existing admins backfill to super_admin (highest bar) so behavior is
-- preserved on the day of the migration. Selective-lower decisions happen
-- per call site afterwards.
--
-- The two JSONB columns (permissions, metadata) are reserved for future use
-- and are NOT loaded into Redux. Features that need them load on demand.

-- 1. Enum for admin levels.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_level') THEN
    CREATE TYPE public.admin_level AS ENUM ('developer', 'senior_admin', 'super_admin');
  END IF;
END
$$;

-- 2. Extend admins table.
ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS level public.admin_level NOT NULL DEFAULT 'super_admin',
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3. Recreate the current_user_is_admin view to expose level too.
--    is_admin column preserved so existing callers (is_platform_admin RPC,
--    types/database.types.ts) keep working unchanged.
DROP VIEW IF EXISTS public.current_user_is_admin;
CREATE VIEW public.current_user_is_admin AS
  SELECT
    a.user_id,
    true AS is_admin,
    a.level AS admin_level
  FROM public.admins a;

-- 4. New RPC for RLS / Postgres callers that want the highest bar.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins a
    WHERE a.user_id = auth.uid() AND a.level = 'super_admin'
  );
$$;

-- 5. Convenience RPC: returns {is_admin, admin_level} for the current
--    auth.uid(). Mirrors get_user_session_data shape.
CREATE OR REPLACE FUNCTION public.get_admin_status()
RETURNS TABLE (is_admin boolean, admin_level public.admin_level)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true, a.level
  FROM public.admins a
  WHERE a.user_id = auth.uid()
  UNION ALL
  SELECT false, NULL::public.admin_level
  WHERE NOT EXISTS (SELECT 1 FROM public.admins a2 WHERE a2.user_id = auth.uid())
  LIMIT 1;
$$;
