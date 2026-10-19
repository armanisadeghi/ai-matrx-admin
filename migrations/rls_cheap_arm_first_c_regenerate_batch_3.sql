-- draft: cheap-arm-first proof running (owner: deep lane, 2026-10-19)
-- CHEAP-ARM-FIRST c (2026-10-19): regenerates the next tables whose parent arms change order under
-- rls_cheap_arm_first_a_generator_and_six_tables.sql (container arm first, iam.containment_depth). Order only; same
-- readers. Proof and timings: accessible-entity-ids-perf-2026-10-19.md, section "Generator: cheap arm first".
do $pre$ begin
  if not exists (select 1 from pg_proc where oid = to_regprocedure('iam.containment_depth(text)')) then
    raise exception 'cheap-arm-first c: apply rls_cheap_arm_first_a_generator_and_six_tables.sql first';
  end if;
end $pre$;
select iam.apply_rls('seo', 'change_event', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'change_event' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'change_event' and is_active));
select iam.apply_rls('seo', 'change_item', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'change_item' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'change_item' and is_active));
select iam.apply_rls('seo', 'change_metric', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'change_metric' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'change_metric' and is_active));
select iam.apply_rls('seo', 'change_set', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'change_set' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'change_set' and is_active));
select iam.apply_rls('seo', 'change_theory', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'change_theory' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'change_theory' and is_active));
select iam.apply_rls('seo', 'collection_run', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'collection_run' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'collection_run' and is_active));
select iam.apply_rls('seo', 'competitor_observation', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'competitor_observation' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'competitor_observation' and is_active));
select iam.apply_rls('seo', 'competitor_opportunity', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'competitor_opportunity' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'competitor_opportunity' and is_active));
select iam.apply_rls('seo', 'keyword_class_rule', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'keyword_class_rule' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'keyword_class_rule' and is_active));
select iam.apply_rls('seo', 'page_performance', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'page_performance' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'page_performance' and is_active));
