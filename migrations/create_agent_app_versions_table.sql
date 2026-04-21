-- ============================================================
-- Phase 8.5 — agent_app_versions table
-- ============================================================
-- Version history for agent_apps. Auto-populated on UPDATE to any
-- tracked field (component_code / variable_schema / layout_config /
-- styling_config / etc.). Mirrors prompt_app_versions.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.agent_app_versions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id               uuid NOT NULL REFERENCES public.agent_apps(id) ON DELETE CASCADE,

  version_number       integer NOT NULL,
  pinned_version       integer,

  agent_id             uuid REFERENCES public.agx_agent(id)   ON DELETE SET NULL,
  agent_version_id     uuid REFERENCES public.agx_version(id) ON DELETE SET NULL,

  name                 text,
  tagline              text,
  description          text,
  category             text,
  tags                 text[],
  status               text,

  component_code       text,
  component_language   text,
  allowed_imports      jsonb,

  variable_schema      jsonb,
  layout_config        jsonb,
  styling_config       jsonb,

  change_note          text,
  changed_at           timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_app_versions_app_version
  ON public.agent_app_versions(app_id, version_number);

CREATE INDEX IF NOT EXISTS idx_agent_app_versions_app_id
  ON public.agent_app_versions(app_id);

CREATE INDEX IF NOT EXISTS idx_agent_app_versions_changed_at
  ON public.agent_app_versions(changed_at DESC);

-- ------------------------------------------------------------
-- Auto-version trigger on agent_apps updates
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.snapshot_agent_app_version()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_next_version integer;
BEGIN
  IF (OLD.component_code    IS DISTINCT FROM NEW.component_code)
  OR (OLD.variable_schema   IS DISTINCT FROM NEW.variable_schema)
  OR (OLD.layout_config     IS DISTINCT FROM NEW.layout_config)
  OR (OLD.styling_config    IS DISTINCT FROM NEW.styling_config)
  OR (OLD.allowed_imports   IS DISTINCT FROM NEW.allowed_imports)
  OR (OLD.agent_version_id  IS DISTINCT FROM NEW.agent_version_id)
  THEN
    SELECT COALESCE(MAX(version_number), 0) + 1
      INTO v_next_version
      FROM public.agent_app_versions
     WHERE app_id = NEW.id;

    NEW.version := v_next_version;

    INSERT INTO public.agent_app_versions (
      app_id, version_number, pinned_version,
      agent_id, agent_version_id,
      name, tagline, description, category, tags, status,
      component_code, component_language, allowed_imports,
      variable_schema, layout_config, styling_config
    )
    VALUES (
      NEW.id, v_next_version, NEW.pinned_version,
      NEW.agent_id, NEW.agent_version_id,
      NEW.name, NEW.tagline, NEW.description, NEW.category, NEW.tags, NEW.status,
      NEW.component_code, NEW.component_language, NEW.allowed_imports,
      NEW.variable_schema, NEW.layout_config, NEW.styling_config
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_apps_snapshot_version ON public.agent_apps;
CREATE TRIGGER trg_agent_apps_snapshot_version
  BEFORE UPDATE ON public.agent_apps
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_agent_app_version();

-- ------------------------------------------------------------
-- Seed v1 on initial insert
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.snapshot_agent_app_version_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.agent_app_versions (
    app_id, version_number, pinned_version,
    agent_id, agent_version_id,
    name, tagline, description, category, tags, status,
    component_code, component_language, allowed_imports,
    variable_schema, layout_config, styling_config
  )
  VALUES (
    NEW.id, 1, NEW.pinned_version,
    NEW.agent_id, NEW.agent_version_id,
    NEW.name, NEW.tagline, NEW.description, NEW.category, NEW.tags, NEW.status,
    NEW.component_code, NEW.component_language, NEW.allowed_imports,
    NEW.variable_schema, NEW.layout_config, NEW.styling_config
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_apps_seed_v1 ON public.agent_apps;
CREATE TRIGGER trg_agent_apps_seed_v1
  AFTER INSERT ON public.agent_apps
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_agent_app_version_on_insert();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE public.agent_app_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_app_versions_read_owner"   ON public.agent_app_versions;
DROP POLICY IF EXISTS "agent_app_versions_read_public"  ON public.agent_app_versions;
DROP POLICY IF EXISTS "agent_app_versions_service_role" ON public.agent_app_versions;

CREATE POLICY "agent_app_versions_read_owner"
ON public.agent_app_versions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agent_apps a
    WHERE a.id = agent_app_versions.app_id
      AND (a.user_id = auth.uid()
        OR (a.organization_id IS NOT NULL AND public.is_org_member(a.organization_id))
        OR (a.user_id IS NULL AND a.organization_id IS NULL AND a.project_id IS NULL AND a.task_id IS NULL AND public.is_platform_admin()))
  )
);

CREATE POLICY "agent_app_versions_read_public"
ON public.agent_app_versions FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.agent_apps a
    WHERE a.id = agent_app_versions.app_id
      AND a.status = 'published'
      AND a.is_public = true
  )
);

CREATE POLICY "agent_app_versions_service_role"
ON public.agent_app_versions FOR ALL TO service_role
USING (true) WITH CHECK (true);

COMMIT;

COMMENT ON TABLE public.agent_app_versions IS 'Version history for agent_apps. Auto-snapshotted on tracked-field changes.';
