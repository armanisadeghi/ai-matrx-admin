-- ============================================================
-- Migrate the 7 remaining prompt_apps that were skipped because
-- their `variable_schema` field names no longer match the agent's
-- `variable_definitions`. Each row gets an explicitly-corrected
-- `variable_schema` that matches the renamed agent variables:
--   metro_name / metro_area_name → region_name
--   state                        → state_name
--   presentation_style           → dropped (no agent equivalent)
--
-- Idempotent. Same metadata stamp + scoped rollback as the
-- main migration (see migrate_prompt_apps_to_aga_apps.sql).
-- ============================================================

BEGIN;

-- ── Helper: insert one row with a custom variable_schema override ─────────
-- We can't reuse the bulk INSERT from the previous migration because each
-- row needs a different rewrite. Use 7 explicit INSERTs instead.

-- Common helper: insert from prompt_apps with an override variable_schema.
-- Uses a CTE per app so we still copy 30+ unchanged columns from the source.

WITH src AS (
  SELECT * FROM prompt_apps
  WHERE slug IN (
    'balanced-news-analysis',
    'enterprise-regional-itad-page-intro',
    'regional-challenge-solution-writer',
    'regional-itad-challenge-generator-app',
    'regional-itad-page-generator',
    'regional-service-coverage-section',
    'regulatory-section-generator'
  )
),
patched AS (
  SELECT
    s.*,
    CASE s.slug
      -- balanced-news-analysis: drop orphan `presentation_style`, keep `topic`
      WHEN 'balanced-news-analysis' THEN
        '[{"name":"topic","type":"string","label":"Topic","default":"","required":false}]'::jsonb

      -- enterprise-regional-itad-page-intro: metro_name → region_name, state → state_name
      WHEN 'enterprise-regional-itad-page-intro' THEN
        '[
          {"name":"region_name","type":"string","label":"Region Name","default":"Dallas-Forth Dallas","required":false},
          {"name":"state_name","type":"string","label":"State Name","default":"Texas","required":false},
          {"name":"sub_regions","type":"string","label":"Sub Regions","default":"Dallas, Fort Worth, Arlington, Plano, Frisco, Irving; DFW Airport hub","required":false}
        ]'::jsonb

      -- regional-challenge-solution-writer: metro_name → region_name
      WHEN 'regional-challenge-solution-writer' THEN
        jsonb_build_array(
          jsonb_build_object('name','region_name','type','string','label','Region Name','default','Dallas-Fort Worth','required',false),
          jsonb_build_object('name','business_sectors','type','string','label','Business Sectors','default','Telecom (AT&T), defense (Lockheed), finance, healthcare, energy, logistics','required',false),
          jsonb_build_object('name','sub_regions','type','string','label','Sub Regions','default','Dallas, Fort Worth, Arlington, Plano, Frisco, Irving; DFW Airport hub','required',false),
          jsonb_build_object('name','msa_name','type','string','label','Msa Name','default','Dallas-Fort Worth-Arlington, TX','required',false),
          jsonb_build_object(
            'name','challenges_data','type','string','label','Challenges Data',
            'default', (s.variable_schema -> 4 ->> 'default'),
            'required', false
          )
        )

      -- regional-itad-challenge-generator-app: metro_area_name → region_name
      WHEN 'regional-itad-challenge-generator-app' THEN
        jsonb_build_array(
          jsonb_build_object('name','region_name','type','string','label','Region Name','default','Dallas-Fort Worth','required',false),
          jsonb_build_object('name','business_sectors','type','string','label','Business Sectors','default',(s.variable_schema -> 1 ->> 'default'),'required',false),
          jsonb_build_object('name','sub_regions','type','string','label','Sub Regions','default',(s.variable_schema -> 2 ->> 'default'),'required',false),
          jsonb_build_object('name','msa_name','type','string','label','Msa Name','default','Dallas-Fort Worth-Arlington, TX','required',false)
        )

      -- regional-itad-page-generator: metro_name → region_name, state → state_name
      WHEN 'regional-itad-page-generator' THEN
        jsonb_build_array(
          jsonb_build_object('name','region_name','type','string','label','Region Name','default','Dallas-Fort Worth','required',false),
          jsonb_build_object('name','state_name','type','string','label','State Name','default','Texas','required',false),
          jsonb_build_object('name','challenge_solution_data','type','string','label','Challenge Solution Data','default',(s.variable_schema -> 2 ->> 'default'),'required',false),
          jsonb_build_object('name','regulatory_section_data','type','string','label','Regulatory Section Data','default',(s.variable_schema -> 3 ->> 'default'),'required',false),
          jsonb_build_object('name','serving_region_section_data','type','string','label','Serving Region Section Data','default',(s.variable_schema -> 4 ->> 'default'),'required',false),
          jsonb_build_object('name','sector_challenge_data','type','string','label','Sector Challenge Data','default',(s.variable_schema -> 5 ->> 'default'),'required',false),
          jsonb_build_object('name','intro_section_content','type','string','label','Intro Section Content','default',(s.variable_schema -> 6 ->> 'default'),'required',false)
        )

      -- regional-service-coverage-section: metro_area_name → region_name
      WHEN 'regional-service-coverage-section' THEN
        jsonb_build_array(
          jsonb_build_object('name','region_name','type','string','label','Region Name','default','Dallas-Fort Worth ','required',false),
          jsonb_build_object('name','sub_regions','type','string','label','Sub Regions','default',(s.variable_schema -> 1 ->> 'default'),'required',false)
        )

      -- regulatory-section-generator: metro_name → region_name (state_name already correct)
      WHEN 'regulatory-section-generator' THEN
        jsonb_build_array(
          jsonb_build_object('name','region_name','type','string','label','Region Name','default','Dallas-Fort Worth','required',false),
          jsonb_build_object('name','state_name','type','string','label','State Name','default','Texas','required',false),
          jsonb_build_object('name','state_level_regulations','type','string','label','State Level Regulations','default',(s.variable_schema -> 2 ->> 'default'),'required',false),
          jsonb_build_object('name','federal_level_regulations','type','string','label','Federal Level Regulations','default',(s.variable_schema -> 3 ->> 'default'),'required',false)
        )

      ELSE s.variable_schema
    END AS patched_schema
  FROM src s
)
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
  p.id, p.user_id, p.organization_id, p.project_id, NULL::uuid,
  p.prompt_id, NULL::uuid, true,
  p.slug, p.name, p.tagline, p.description, p.category,
  COALESCE(p.tags, ARRAY[]::text[]),
  p.component_code, p.component_language,
  COALESCE(p.allowed_imports, '[]'::jsonb),
  p.patched_schema,
  COALESCE(p.layout_config, '{}'::jsonb),
  COALESCE(p.styling_config, '{}'::jsonb),
  'single', '[]'::jsonb,
  p.preview_image_url, p.favicon_url,
  p.status,
  CASE WHEN p.status = 'published' THEN true ELSE p.is_public END,
  COALESCE(p.is_featured, false),
  COALESCE(p.is_verified, false),
  p.rate_limit_per_ip, p.rate_limit_window_hours, p.rate_limit_authenticated,
  p.version, p.pinned_version,
  COALESCE(p.total_executions, 0),
  COALESCE(p.total_tokens_used, 0)::bigint,
  COALESCE(p.total_cost, 0),
  COALESCE(p.unique_users_count, 0),
  CASE
    WHEN p.success_rate IS NULL THEN NULL
    WHEN p.success_rate > 1 THEN p.success_rate / 100.0
    ELSE p.success_rate
  END,
  p.avg_execution_time_ms,
  p.last_execution_at,
  jsonb_set(
    COALESCE(p.metadata, '{}'::jsonb),
    '{migrated_from_prompt_app}',
    jsonb_build_object(
      'prompt_id',         p.prompt_id,
      'prompt_version_id', p.prompt_version_id,
      'migrated_at',       now(),
      'variable_schema_patched', true
    )
  ),
  COALESCE(p.created_at, now()),
  COALESCE(p.updated_at, now()),
  p.published_at
FROM patched p
ON CONFLICT (id) DO NOTHING;

-- Coverage assertion: every targeted prompt_app must now have an aga_apps row.
DO $$
DECLARE missing_count int;
BEGIN
  SELECT count(*) INTO missing_count
  FROM prompt_apps pa
  WHERE pa.slug IN (
    'balanced-news-analysis',
    'enterprise-regional-itad-page-intro',
    'regional-challenge-solution-writer',
    'regional-itad-challenge-generator-app',
    'regional-itad-page-generator',
    'regional-service-coverage-section',
    'regulatory-section-generator'
  )
  AND NOT EXISTS (SELECT 1 FROM aga_apps a WHERE a.id = pa.id);

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Skipped-app migration coverage failure: missing=%', missing_count;
  END IF;
END $$;

COMMIT;
