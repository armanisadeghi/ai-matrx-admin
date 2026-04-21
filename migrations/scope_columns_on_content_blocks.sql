-- ============================================================
-- Phase 1.2 — Scope columns on content_blocks
-- ============================================================
-- `public.content_blocks` already exists (joined to shortcut_categories
-- by context_menu_unified_view). Extends it with the same scope columns
-- as `shortcut_categories` and widens RLS to admin / user / org.
--
-- See: features/agents/migration/DECISIONS.md
--   (2026-04-20 — Content blocks: extend existing table, do not create
--    agent_content_blocks)
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Scope columns
-- ------------------------------------------------------------
ALTER TABLE public.content_blocks
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS organization_id uuid,
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD COLUMN IF NOT EXISTS task_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'content_blocks_organization_id_fkey'
  ) THEN
    ALTER TABLE public.content_blocks
      ADD CONSTRAINT content_blocks_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'organizations table not found — skipping FK for content_blocks.organization_id';
END $$;

CREATE INDEX IF NOT EXISTS idx_content_blocks_user_id
  ON public.content_blocks(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_blocks_org_id
  ON public.content_blocks(organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_blocks_category
  ON public.content_blocks(category_id, is_active);

-- ------------------------------------------------------------
-- 2. RLS
-- ------------------------------------------------------------
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_blocks_read"   ON public.content_blocks;
DROP POLICY IF EXISTS "content_blocks_read_anon" ON public.content_blocks;
DROP POLICY IF EXISTS "content_blocks_insert" ON public.content_blocks;
DROP POLICY IF EXISTS "content_blocks_update" ON public.content_blocks;
DROP POLICY IF EXISTS "content_blocks_delete" ON public.content_blocks;
DROP POLICY IF EXISTS "content_blocks_service_role" ON public.content_blocks;

CREATE POLICY "content_blocks_read"
ON public.content_blocks
FOR SELECT
TO authenticated
USING (
  (user_id IS NULL AND organization_id IS NULL AND project_id IS NULL AND task_id IS NULL)
  OR user_id = auth.uid()
  OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
);

CREATE POLICY "content_blocks_read_anon"
ON public.content_blocks
FOR SELECT
TO anon
USING (
  user_id IS NULL AND organization_id IS NULL
  AND project_id IS NULL AND task_id IS NULL
  AND is_active IS TRUE
);

CREATE POLICY "content_blocks_insert"
ON public.content_blocks
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

CREATE POLICY "content_blocks_update"
ON public.content_blocks
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

CREATE POLICY "content_blocks_delete"
ON public.content_blocks
FOR DELETE
TO authenticated
USING (
  (user_id = auth.uid())
  OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
  OR (user_id IS NULL AND organization_id IS NULL AND project_id IS NULL AND task_id IS NULL AND public.is_platform_admin())
);

CREATE POLICY "content_blocks_service_role"
ON public.content_blocks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMIT;

COMMENT ON COLUMN public.content_blocks.user_id IS
  'Scope owner — set for personal content blocks. NULL on global + org rows.';
COMMENT ON COLUMN public.content_blocks.organization_id IS
  'Scope owner — set for organization-wide content blocks. NULL on global + user rows.';
