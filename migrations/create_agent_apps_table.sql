-- ============================================================
-- Phase 8.1 — agent_apps table
-- ============================================================
-- Mirrors the legacy `prompt_apps` table but keys off `agx_agent`
-- and `agx_version`. Public shareable AI-powered mini-apps with
-- custom JSX/TSX UIs and Babel-transformed component code.
--
-- Scope columns follow the same pattern used across the migration
-- (user / organization / project / task) even though public apps
-- are typically user-scoped. A row with all scope columns NULL is
-- a platform-admin "global" app.
--
-- See: features/agents/migration/phases/phase-08-agent-apps-public.md
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.agent_apps (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership + scope (one of user / organization / project / task set)
  user_id                   uuid REFERENCES auth.users(id)      ON DELETE CASCADE,
  organization_id           uuid,
  project_id                uuid,
  task_id                   uuid,

  -- Primary agent pinning (App's UI depends on the agent's variable shape)
  agent_id                  uuid NOT NULL REFERENCES public.agx_agent(id)   ON DELETE CASCADE,
  agent_version_id          uuid          REFERENCES public.agx_version(id) ON DELETE SET NULL,
  use_latest                boolean NOT NULL DEFAULT false,

  -- Slug & identity
  slug                      text NOT NULL UNIQUE,
  name                      text NOT NULL,
  tagline                   text,
  description               text,
  category                  text,
  tags                      text[] DEFAULT ARRAY[]::text[],

  -- Component code (Babel-transformed JSX/TSX)
  component_code            text NOT NULL,
  component_language        text NOT NULL DEFAULT 'tsx',
  allowed_imports           jsonb DEFAULT '[]'::jsonb,

  -- UI configuration
  variable_schema           jsonb DEFAULT '[]'::jsonb,
  layout_config             jsonb DEFAULT '{}'::jsonb,
  styling_config            jsonb DEFAULT '{}'::jsonb,

  -- Composite-app support (Phase 10). Single rows leave these at defaults.
  app_kind                  text NOT NULL DEFAULT 'single'
    CHECK (app_kind IN ('single','composite')),
  shared_context_slots      jsonb DEFAULT '[]'::jsonb,

  -- Media
  preview_image_url         text,
  favicon_url               text,

  -- Status + visibility
  status                    text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published','archived','suspended')),
  is_public                 boolean NOT NULL DEFAULT true,
  is_featured               boolean DEFAULT false,
  is_verified               boolean DEFAULT false,

  -- Rate limit config (per-app; trigger reads these)
  rate_limit_per_ip         integer DEFAULT 20,
  rate_limit_window_hours   integer DEFAULT 24,
  rate_limit_authenticated  integer DEFAULT 100,

  -- Versioning
  version                   integer NOT NULL DEFAULT 1,
  pinned_version            integer,

  -- Analytics (denormalized)
  total_executions          integer DEFAULT 0,
  total_tokens_used         bigint  DEFAULT 0,
  total_cost                numeric(12,6) DEFAULT 0,
  unique_users_count        integer DEFAULT 0,
  success_rate              numeric(5,4),
  avg_execution_time_ms     integer,
  last_execution_at         timestamptz,

  -- Metadata
  metadata                  jsonb DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  published_at              timestamptz,

  -- Full-text search
  search_tsv                tsvector
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_apps_organization_id_fkey') THEN
    ALTER TABLE public.agent_apps
      ADD CONSTRAINT agent_apps_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'organizations table not found — skipping FK for agent_apps.organization_id';
END $$;

CREATE INDEX IF NOT EXISTS idx_agent_apps_user_id           ON public.agent_apps(user_id)         WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_apps_organization_id   ON public.agent_apps(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_apps_agent_id          ON public.agent_apps(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_apps_status_public     ON public.agent_apps(status, is_public) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_agent_apps_slug              ON public.agent_apps(slug);
CREATE INDEX IF NOT EXISTS idx_agent_apps_category          ON public.agent_apps(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_apps_featured          ON public.agent_apps(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_agent_apps_search_tsv        ON public.agent_apps USING gin(search_tsv);

-- Full-text search trigger
CREATE OR REPLACE FUNCTION public.agent_apps_update_search_tsv()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('english', coalesce(NEW.name,'')),        'A') ||
    setweight(to_tsvector('english', coalesce(NEW.tagline,'')),     'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description,'')), 'C') ||
    setweight(to_tsvector('english', array_to_string(coalesce(NEW.tags, ARRAY[]::text[]), ' ')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_apps_search_tsv ON public.agent_apps;
CREATE TRIGGER trg_agent_apps_search_tsv
  BEFORE INSERT OR UPDATE OF name, tagline, description, tags
  ON public.agent_apps
  FOR EACH ROW
  EXECUTE FUNCTION public.agent_apps_update_search_tsv();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.agent_apps_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_apps_updated_at ON public.agent_apps;
CREATE TRIGGER trg_agent_apps_updated_at
  BEFORE UPDATE ON public.agent_apps
  FOR EACH ROW
  EXECUTE FUNCTION public.agent_apps_set_updated_at();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE public.agent_apps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_apps_read_public"    ON public.agent_apps;
DROP POLICY IF EXISTS "agent_apps_read_anon"      ON public.agent_apps;
DROP POLICY IF EXISTS "agent_apps_read_owner"     ON public.agent_apps;
DROP POLICY IF EXISTS "agent_apps_insert"         ON public.agent_apps;
DROP POLICY IF EXISTS "agent_apps_update"         ON public.agent_apps;
DROP POLICY IF EXISTS "agent_apps_delete"         ON public.agent_apps;
DROP POLICY IF EXISTS "agent_apps_service_role"   ON public.agent_apps;

CREATE POLICY "agent_apps_read_public"
ON public.agent_apps FOR SELECT TO authenticated
USING (
  (status = 'published' AND is_public = true)
  OR user_id = auth.uid()
  OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  OR (user_id IS NULL AND organization_id IS NULL AND project_id IS NULL AND task_id IS NULL AND public.is_platform_admin())
);

CREATE POLICY "agent_apps_read_anon"
ON public.agent_apps FOR SELECT TO anon
USING (status = 'published' AND is_public = true);

CREATE POLICY "agent_apps_insert"
ON public.agent_apps FOR INSERT TO authenticated
WITH CHECK (
  (user_id = auth.uid()
    AND organization_id IS NULL AND project_id IS NULL AND task_id IS NULL)
  OR (organization_id IS NOT NULL AND user_id IS NULL
    AND public.is_org_admin(organization_id))
  OR (user_id IS NULL AND organization_id IS NULL
    AND project_id IS NULL AND task_id IS NULL
    AND public.is_platform_admin())
);

CREATE POLICY "agent_apps_update"
ON public.agent_apps FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
  OR (user_id IS NULL AND organization_id IS NULL AND project_id IS NULL AND task_id IS NULL AND public.is_platform_admin())
)
WITH CHECK (
  user_id = auth.uid()
  OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
  OR (user_id IS NULL AND organization_id IS NULL AND project_id IS NULL AND task_id IS NULL AND public.is_platform_admin())
);

CREATE POLICY "agent_apps_delete"
ON public.agent_apps FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
  OR (user_id IS NULL AND organization_id IS NULL AND project_id IS NULL AND task_id IS NULL AND public.is_platform_admin())
);

CREATE POLICY "agent_apps_service_role"
ON public.agent_apps FOR ALL TO service_role
USING (true) WITH CHECK (true);

COMMIT;

COMMENT ON TABLE  public.agent_apps IS 'Agent-backed public mini-apps with Babel-transformed custom UIs. Replaces prompt_apps.';
COMMENT ON COLUMN public.agent_apps.agent_id IS 'FK to agx_agent — the agent powering this app.';
COMMENT ON COLUMN public.agent_apps.agent_version_id IS 'Optional pinned agx_version. NULL + use_latest=true means always use agent HEAD.';
COMMENT ON COLUMN public.agent_apps.component_code IS 'JSX/TSX source; sandboxed at runtime via Babel + allowlisted imports.';
COMMENT ON COLUMN public.agent_apps.allowed_imports IS 'Subset of ALLOWED_IMPORTS_CONFIG paths. Security-critical — widen only through the shared allowlist.';
