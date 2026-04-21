-- ============================================================
-- Phase 1 — Scope-aware RLS on agx_shortcut
-- ============================================================
-- agx_shortcut already carries user_id / organization_id / project_id /
-- task_id columns, but its RLS was authored before multi-scope was
-- expressed. This migration replaces its policies to match the model
-- used by shortcut_categories and content_blocks.
--
-- Relies on helper functions created in:
--   migrations/scope_columns_on_shortcut_categories.sql
--   (public.is_org_admin, public.is_org_member, public.is_platform_admin)
--
-- ORDER: run AFTER scope_columns_on_shortcut_categories.sql.
-- ============================================================

BEGIN;

ALTER TABLE public.agx_shortcut ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agx_shortcut_read"         ON public.agx_shortcut;
DROP POLICY IF EXISTS "agx_shortcut_read_anon"    ON public.agx_shortcut;
DROP POLICY IF EXISTS "agx_shortcut_insert"       ON public.agx_shortcut;
DROP POLICY IF EXISTS "agx_shortcut_update"       ON public.agx_shortcut;
DROP POLICY IF EXISTS "agx_shortcut_delete"       ON public.agx_shortcut;
DROP POLICY IF EXISTS "agx_shortcut_service_role" ON public.agx_shortcut;

CREATE POLICY "agx_shortcut_read"
ON public.agx_shortcut
FOR SELECT
TO authenticated
USING (
  (user_id IS NULL AND organization_id IS NULL AND project_id IS NULL AND task_id IS NULL)
  OR user_id = auth.uid()
  OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
);

CREATE POLICY "agx_shortcut_read_anon"
ON public.agx_shortcut
FOR SELECT
TO anon
USING (
  user_id IS NULL AND organization_id IS NULL
  AND project_id IS NULL AND task_id IS NULL
  AND is_active IS TRUE
);

CREATE POLICY "agx_shortcut_insert"
ON public.agx_shortcut
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid()
    AND organization_id IS NULL
    AND project_id IS NULL
    AND task_id IS NULL)
  OR (organization_id IS NOT NULL
    AND user_id IS NULL
    AND public.is_org_admin(organization_id))
  OR (user_id IS NULL
    AND organization_id IS NULL
    AND project_id IS NULL
    AND task_id IS NULL
    AND public.is_platform_admin())
);

CREATE POLICY "agx_shortcut_update"
ON public.agx_shortcut
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

CREATE POLICY "agx_shortcut_delete"
ON public.agx_shortcut
FOR DELETE
TO authenticated
USING (
  (user_id = auth.uid())
  OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
  OR (user_id IS NULL AND organization_id IS NULL AND project_id IS NULL AND task_id IS NULL AND public.is_platform_admin())
);

CREATE POLICY "agx_shortcut_service_role"
ON public.agx_shortcut
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Helpful indexes (no-ops if already present)
CREATE INDEX IF NOT EXISTS idx_agx_shortcut_user_id
  ON public.agx_shortcut(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agx_shortcut_org_id
  ON public.agx_shortcut(organization_id)
  WHERE organization_id IS NOT NULL;

COMMIT;
