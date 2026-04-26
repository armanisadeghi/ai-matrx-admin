-- ============================================================
-- Migrate prompt_apps -> aga_apps
-- ============================================================
-- One-time data migration. Idempotent (re-runnable).
-- Verified pre-flight findings:
--   * 61/61 prompt_apps.prompt_id values exist in agx_agent.id
--     (IDs were preserved during the prior prompts -> agents migration).
--   * 0/61 prompt_apps.prompt_version_id values exist in agx_version
--     -> agent_version_id := NULL, use_latest := true on every row.
--   * 7 apps have variable_schema field names that no longer match
--     their agent's variable_definitions (renamed during the prompts
--     -> agents migration). Those apps are SKIPPED here and stay on
--     the legacy prompt-app path until manually fixed.
--   * Per user decision: flip is_public=true on status='published'
--     rows so the public dual-path resolver in /p/[slug] can serve
--     them. Authenticated visibility is unaffected.
--
-- Skipped slugs (variable-name mismatch):
--   balanced-news-analysis
--   enterprise-regional-itad-page-intro
--   regional-challenge-solution-writer
--   regional-itad-challenge-generator-app
--   regional-itad-page-generator
--   regional-service-coverage-section
--   regulatory-section-generator
--
-- Rollback (scoped to migrated rows only):
--   DELETE FROM aga_apps WHERE metadata ? 'migrated_from_prompt_app';
-- ============================================================

BEGIN;

INSERT INTO aga_apps (
  id, user_id, organization_id, project_id, task_id,
  agent_id, agent_version_id, use_latest,
  slug, name, tagline, description, category, tags,
  component_code, component_language, allowed_imports,
  variable_schema, layout_config, styling_config,
  app_kind, shared_context_slots,
  preview_image_url, favicon_url,
  status, is_public, is_featured, is_verified,
  rate_limit_per_ip, rate_limit_window_hours, rate_limit_authenticated,
  version, pinned_version,
  total_executions, total_tokens_used, total_cost,
  unique_users_count, success_rate, avg_execution_time_ms,
  last_execution_at,
  metadata, created_at, updated_at, published_at
)
SELECT
  pa.id,
  pa.user_id,
  pa.organization_id,
  pa.project_id,
  NULL::uuid                                                   AS task_id,
  pa.prompt_id                                                 AS agent_id,
  NULL::uuid                                                   AS agent_version_id,
  true                                                         AS use_latest,
  pa.slug,
  pa.name,
  pa.tagline,
  pa.description,
  pa.category,
  COALESCE(pa.tags, ARRAY[]::text[]),
  pa.component_code,
  pa.component_language,
  COALESCE(pa.allowed_imports, '[]'::jsonb),
  COALESCE(pa.variable_schema, '[]'::jsonb),
  COALESCE(pa.layout_config, '{}'::jsonb),
  COALESCE(pa.styling_config, '{}'::jsonb),
  'single'                                                     AS app_kind,
  '[]'::jsonb                                                  AS shared_context_slots,
  pa.preview_image_url,
  pa.favicon_url,
  pa.status,
  CASE WHEN pa.status = 'published' THEN true ELSE pa.is_public END AS is_public,
  COALESCE(pa.is_featured, false),
  COALESCE(pa.is_verified, false),
  pa.rate_limit_per_ip,
  pa.rate_limit_window_hours,
  pa.rate_limit_authenticated,
  pa.version,
  pa.pinned_version,
  COALESCE(pa.total_executions, 0),
  COALESCE(pa.total_tokens_used, 0)::bigint,
  COALESCE(pa.total_cost, 0),
  COALESCE(pa.unique_users_count, 0),
  -- aga_apps.success_rate is numeric(5,4) (0..1 fraction).
  -- prompt_apps.success_rate is mixed (some rows store 0..1, others 0..100).
  -- Normalize: anything > 1 is percent and gets /100.
  CASE
    WHEN pa.success_rate IS NULL THEN NULL
    WHEN pa.success_rate > 1 THEN pa.success_rate / 100.0
    ELSE pa.success_rate
  END,
  pa.avg_execution_time_ms,
  pa.last_execution_at,
  jsonb_set(
    COALESCE(pa.metadata, '{}'::jsonb),
    '{migrated_from_prompt_app}',
    jsonb_build_object(
      'prompt_id',         pa.prompt_id,
      'prompt_version_id', pa.prompt_version_id,
      'migrated_at',       now()
    )
  )                                                            AS metadata,
  COALESCE(pa.created_at, now()),
  COALESCE(pa.updated_at, now()),
  pa.published_at
FROM prompt_apps pa
WHERE pa.slug NOT IN (
  'balanced-news-analysis',
  'enterprise-regional-itad-page-intro',
  'regional-challenge-solution-writer',
  'regional-itad-challenge-generator-app',
  'regional-itad-page-generator',
  'regional-service-coverage-section',
  'regulatory-section-generator'
)
ON CONFLICT (id) DO NOTHING;

-- Coverage assertion: every non-skipped prompt_app must have a matching aga_apps row.
DO $$
DECLARE
  expected_count int;
  actual_count   int;
  missing_count  int;
BEGIN
  SELECT count(*) INTO expected_count
  FROM prompt_apps
  WHERE slug NOT IN (
    'balanced-news-analysis',
    'enterprise-regional-itad-page-intro',
    'regional-challenge-solution-writer',
    'regional-itad-challenge-generator-app',
    'regional-itad-page-generator',
    'regional-service-coverage-section',
    'regulatory-section-generator'
  );

  SELECT count(*) INTO missing_count
  FROM prompt_apps pa
  WHERE pa.slug NOT IN (
    'balanced-news-analysis',
    'enterprise-regional-itad-page-intro',
    'regional-challenge-solution-writer',
    'regional-itad-challenge-generator-app',
    'regional-itad-page-generator',
    'regional-service-coverage-section',
    'regulatory-section-generator'
  )
  AND NOT EXISTS (SELECT 1 FROM aga_apps a WHERE a.id = pa.id);

  SELECT count(*) INTO actual_count
  FROM aga_apps
  WHERE metadata ? 'migrated_from_prompt_app';

  RAISE NOTICE 'expected=% actual_migrated=% missing=%',
    expected_count, actual_count, missing_count;

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Migration coverage failure: % rows did not migrate', missing_count;
  END IF;
END $$;

COMMIT;
