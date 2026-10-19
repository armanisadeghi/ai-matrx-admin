-- draft: cheap-arm-first proof running (owner: deep lane, 2026-10-19)
-- CHEAP-ARM-FIRST d (2026-10-19): regenerates the next tables whose parent arms change order under
-- rls_cheap_arm_first_a_generator_and_six_tables.sql (container arm first, iam.containment_depth). Order only; same
-- readers. Proof and timings: accessible-entity-ids-perf-2026-10-19.md, section "Generator: cheap arm first".
do $pre$ begin
  if not exists (select 1 from pg_proc where oid = to_regprocedure('iam.containment_depth(text)')) then
    raise exception 'cheap-arm-first d: apply rls_cheap_arm_first_a_generator_and_six_tables.sql first';
  end if;
end $pre$;
select iam.apply_rls('seo', 'rank_target', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'rank_target' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'rank_target' and is_active));
select iam.apply_rls('seo', 'reputation_case', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'reputation_case' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'reputation_case' and is_active));
select iam.apply_rls('seo', 'web_analytics_daily', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'web_analytics_daily' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'web_analytics_daily' and is_active));
select iam.apply_rls('web', 'finding', (select token from platform.entity_types where schema_name = 'web' and table_name = 'finding' and is_active), (select rls_variant from platform.entity_types where schema_name = 'web' and table_name = 'finding' and is_active));
select iam.apply_rls('web', 'gsc_page_stat', (select token from platform.entity_types where schema_name = 'web' and table_name = 'gsc_page_stat' and is_active), (select rls_variant from platform.entity_types where schema_name = 'web' and table_name = 'gsc_page_stat' and is_active));
select iam.apply_rls('web', 'page_content', (select token from platform.entity_types where schema_name = 'web' and table_name = 'page_content' and is_active), (select rls_variant from platform.entity_types where schema_name = 'web' and table_name = 'page_content' and is_active));
select iam.apply_rls('web', 'page_evidence', (select token from platform.entity_types where schema_name = 'web' and table_name = 'page_evidence' and is_active), (select rls_variant from platform.entity_types where schema_name = 'web' and table_name = 'page_evidence' and is_active));
select iam.apply_rls('web', 'page_sitemap', (select token from platform.entity_types where schema_name = 'web' and table_name = 'page_sitemap' and is_active), (select rls_variant from platform.entity_types where schema_name = 'web' and table_name = 'page_sitemap' and is_active));
select iam.apply_rls('web', 'screenshot', (select token from platform.entity_types where schema_name = 'web' and table_name = 'screenshot' and is_active), (select rls_variant from platform.entity_types where schema_name = 'web' and table_name = 'screenshot' and is_active));
select iam.apply_rls('web', 'snapshot', (select token from platform.entity_types where schema_name = 'web' and table_name = 'snapshot' and is_active), (select rls_variant from platform.entity_types where schema_name = 'web' and table_name = 'snapshot' and is_active));
