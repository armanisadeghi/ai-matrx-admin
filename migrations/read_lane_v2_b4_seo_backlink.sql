-- read_lane_v2_b4_seo_backlink — enroll seo.backlink in read-lane v2 and regenerate its policies (one table, one transaction).
-- Applied 2026-10-19 outside the 1-4 AM window on purpose: a live timeout. The backlinks page's 7 parallel seo.backlink
-- reads all returned 500 at the 8 s timeout for admin@admin.com, because std_select's page_id arm built the caller's
-- WHOLE web_page set (264,950 ids, 2-6 s) on every read. v2 replaces the two parent arms (web_page, web_site; both
-- composition edges that pass iam.read_lane_v2_edge_emits) with the parent policy's correlated per-row arm.
-- Proof (rolled-back transaction, live data, before vs after regeneration): only std_select changes (insert, update,
-- delete policies byte-identical, so editor access is unchanged); select rows identical for 7 people x 3 reads
-- (whole table, one site, the page's first 100): admin@admin.com, test@test.com, arman@armansadeghi.com,
-- arman@titaniumsuccess.com, projectmanager@titaniumsuccess.com and two fixture members. Admin whole-table read
-- 2.77 s -> 0.42 s; site read 1.56 s -> 0.30 s. Report: common-docs systems/intelligence/mandates/projects/
-- intelligence-from-data/accessible-entity-ids-perf-2026-10-19.md. The enroll row is written BEFORE the regeneration.
insert into iam.read_lane_v2_rollout (token, batch) select token, 'b4' from platform.entity_types where schema_name = 'seo' and table_name = 'backlink' and is_active on conflict do nothing;
select iam.apply_rls('seo', 'backlink', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'backlink' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'backlink' and is_active));
