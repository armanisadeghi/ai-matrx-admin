-- ============================================================
-- Phase 1.1 — Scope columns on shortcut_categories
-- ============================================================
-- Makes `shortcut_categories` multi-scope (admin / user / org) to
-- match the `agx_shortcut` shape. A row with all scope columns NULL
-- is "global" and remains admin-only write.
--
-- Scope precedence is enforced at the VIEW / HOOK layer, not here.
-- RLS only governs visibility and write eligibility.
--
-- See: features/agents/migration/phases/phase-01-agent-shortcuts-foundation.md
-- See: features/agents/migration/DECISIONS.md (2026-04-20 — Shortcut category scope model)
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Scope helper: is_org_admin(org_id)
--    Reusable across every multi-scope table in this migration.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_org_id
      AND om.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.current_user_is_admin cua
    WHERE cua.user_id = auth.uid()
      AND cua.is_admin IS TRUE
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin()   TO authenticated;

-- ------------------------------------------------------------
-- 2. Add scope columns
-- ------------------------------------------------------------
ALTER TABLE public.shortcut_categories
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS organization_id uuid,
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD COLUMN IF NOT EXISTS task_id uuid;

-- NOTE: We add FKs conditionally. organizations/projects/tasks tables
-- may or may not have the exact names; if any of these FKs fail in
-- your environment, drop the specific ADD CONSTRAINT line. These are
-- the canonical names used elsewhere in the schema.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shortcut_categories_organization_id_fkey'
  ) THEN
    ALTER TABLE public.shortcut_categories
      ADD CONSTRAINT shortcut_categories_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'organizations table not found — skipping FK for shortcut_categories.organization_id';
END $$;

-- Indexes for scope lookups
CREATE INDEX IF NOT EXISTS idx_shortcut_categories_user_id
  ON public.shortcut_categories(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shortcut_categories_org_id
  ON public.shortcut_categories(organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shortcut_categories_placement
  ON public.shortcut_categories(placement_type, is_active);

-- ------------------------------------------------------------
-- 3. Enable RLS (no-op if already on)
-- ------------------------------------------------------------
ALTER TABLE public.shortcut_categories ENABLE ROW LEVEL SECURITY;

-- Drop any prior-named policies to make this migration idempotent.
DROP POLICY IF EXISTS "shortcut_categories_read"   ON public.shortcut_categories;
DROP POLICY IF EXISTS "shortcut_categories_insert" ON public.shortcut_categories;
DROP POLICY IF EXISTS "shortcut_categories_update" ON public.shortcut_categories;
DROP POLICY IF EXISTS "shortcut_categories_delete" ON public.shortcut_categories;
DROP POLICY IF EXISTS "shortcut_categories_service_role" ON public.shortcut_categories;

-- ------------------------------------------------------------
-- 4. SELECT — caller sees any row whose scope they belong to
-- ------------------------------------------------------------
CREATE POLICY "shortcut_categories_read"
ON public.shortcut_categories
FOR SELECT
TO authenticated
USING (
  -- Global rows: everyone authenticated can read active ones
  (user_id IS NULL AND organization_id IS NULL AND project_id IS NULL AND task_id IS NULL)
  OR user_id = auth.uid()
  OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
);

-- Anon can read global, active categories (public surfaces need menu).
CREATE POLICY "shortcut_categories_read_anon"
ON public.shortcut_categories
FOR SELECT
TO anon
USING (
  user_id IS NULL AND organization_id IS NULL
  AND project_id IS NULL AND task_id IS NULL
  AND is_active IS TRUE
);

-- ------------------------------------------------------------
-- 5. INSERT — scope determines who may create
-- ------------------------------------------------------------
CREATE POLICY "shortcut_categories_insert"
ON public.shortcut_categories
FOR INSERT
TO authenticated
WITH CHECK (
  -- User-scope: must target self
  (user_id = auth.uid()
    AND organization_id IS NULL
    AND project_id IS NULL
    AND task_id IS NULL)
  -- Org-scope: caller must be org admin/owner
  OR (organization_id IS NOT NULL
    AND user_id IS NULL
    AND public.is_org_admin(organization_id))
  -- Global: platform admin only
  OR (user_id IS NULL
    AND organization_id IS NULL
    AND project_id IS NULL
    AND task_id IS NULL
    AND public.is_platform_admin())
);

-- ------------------------------------------------------------
-- 6. UPDATE — owner of scope may modify
-- ------------------------------------------------------------
CREATE POLICY "shortcut_categories_update"
ON public.shortcut_categories
FOR UPDATE
TO authenticated
USING (
  (user_id = auth.uid())
  OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
  OR (user_id IS NULL AND organization_id IS NULL AND project_id IS NULL AND task_id IS NULL AND public.is_platform_admin())
)
WITH CHECK (
  (user_id = auth.uid())
  OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
  OR (user_id IS NULL AND organization_id IS NULL AND project_id IS NULL AND task_id IS NULL AND public.is_platform_admin())
);

-- ------------------------------------------------------------
-- 7. DELETE — same authority as UPDATE
-- ------------------------------------------------------------
CREATE POLICY "shortcut_categories_delete"
ON public.shortcut_categories
FOR DELETE
TO authenticated
USING (
  (user_id = auth.uid())
  OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
  OR (user_id IS NULL AND organization_id IS NULL AND project_id IS NULL AND task_id IS NULL AND public.is_platform_admin())
);

-- ------------------------------------------------------------
-- 8. Service role escape hatch (for server-side jobs)
-- ------------------------------------------------------------
CREATE POLICY "shortcut_categories_service_role"
ON public.shortcut_categories
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMIT;

COMMENT ON COLUMN public.shortcut_categories.user_id IS
  'Scope owner — set for personal categories. NULL on global + org + project + task rows.';
COMMENT ON COLUMN public.shortcut_categories.organization_id IS
  'Scope owner — set for organization-wide categories. NULL on global + user + project + task rows.';
COMMENT ON COLUMN public.shortcut_categories.project_id IS
  'Scope owner — set for project-wide categories. (Future use.)';
COMMENT ON COLUMN public.shortcut_categories.task_id IS
  'Scope owner — set for task-specific categories. (Future use.)';
