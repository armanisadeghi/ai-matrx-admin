-- draft: cheap-arm-first proof running (owner: deep lane, 2026-10-19)
-- CHEAP-ARM-FIRST b (2026-10-19): regenerates the next tables whose parent arms change order under
-- rls_cheap_arm_first_a_generator_and_six_tables.sql (container arm first, iam.containment_depth). Order only; same
-- readers. Proof and timings: accessible-entity-ids-perf-2026-10-19.md, section "Generator: cheap arm first".
do $pre$ begin
  if not exists (select 1 from pg_proc where oid = to_regprocedure('iam.containment_depth(text)')) then
    raise exception 'cheap-arm-first b: apply rls_cheap_arm_first_a_generator_and_six_tables.sql first';
  end if;
end $pre$;
select iam.apply_rls('browser', 'site_observation', (select token from platform.entity_types where schema_name = 'browser' and table_name = 'site_observation' and is_active), (select rls_variant from platform.entity_types where schema_name = 'browser' and table_name = 'site_observation' and is_active));
select iam.apply_rls('seo', 'ai_visibility_citation', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'ai_visibility_citation' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'ai_visibility_citation' and is_active));
select iam.apply_rls('seo', 'ai_visibility_claim', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'ai_visibility_claim' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'ai_visibility_claim' and is_active));
select iam.apply_rls('seo', 'ai_visibility_response', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'ai_visibility_response' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'ai_visibility_response' and is_active));
select iam.apply_rls('seo', 'ai_visibility_signal', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'ai_visibility_signal' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'ai_visibility_signal' and is_active));
select iam.apply_rls('seo', 'backlink_change_event', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'backlink_change_event' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'backlink_change_event' and is_active));
select iam.apply_rls('seo', 'backlink_dimension_snapshot', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'backlink_dimension_snapshot' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'backlink_dimension_snapshot' and is_active));
select iam.apply_rls('seo', 'backlink_observation', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'backlink_observation' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'backlink_observation' and is_active));
select iam.apply_rls('seo', 'backlink_snapshot', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'backlink_snapshot' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'backlink_snapshot' and is_active));
select iam.apply_rls('seo', 'change_assessment', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'change_assessment' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'change_assessment' and is_active));
