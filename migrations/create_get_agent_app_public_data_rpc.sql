-- ============================================================
-- Phase 8.7 — get_agent_app_public_data RPC
-- ============================================================
-- Public-safe RPC for resolving an agent app by slug or id.
-- Returns ONLY the fields the public renderer needs — omits
-- agent_id, agent_version_id, user_id, organization_id, and all
-- rate-limit config so internals never reach the wire.
--
-- Mirrors get_prompt_app_public_data.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_agent_app_public_data(
  p_slug   text DEFAULT NULL,
  p_app_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id                 uuid,
  slug               text,
  name               text,
  tagline            text,
  description        text,
  category           text,
  tags               text[],
  preview_image_url  text,
  favicon_url        text,
  component_code     text,
  component_language text,
  allowed_imports    jsonb,
  variable_schema    jsonb,
  layout_config      jsonb,
  styling_config     jsonb,
  total_executions   integer,
  success_rate       numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.slug,
    a.name,
    a.tagline,
    a.description,
    a.category,
    a.tags,
    a.preview_image_url,
    a.favicon_url,
    a.component_code,
    a.component_language,
    a.allowed_imports,
    a.variable_schema,
    a.layout_config,
    a.styling_config,
    a.total_executions,
    a.success_rate
  FROM public.agent_apps a
  WHERE a.status = 'published'
    AND a.is_public = true
    AND (
      (p_app_id IS NOT NULL AND a.id = p_app_id)
      OR (p_slug IS NOT NULL AND a.slug = p_slug)
    )
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_agent_app_public_data(text, uuid) TO anon, authenticated, service_role;

COMMIT;

COMMENT ON FUNCTION public.get_agent_app_public_data(text, uuid) IS
  'Public-safe resolver for agent_apps. Returns only render-facing fields; omits agent_id and ownership.';
