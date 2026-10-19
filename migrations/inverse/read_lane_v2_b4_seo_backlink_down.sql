-- chair-step: takes seo.backlink back out of read-lane v2 and regenerates its policies; read_lane_v2_b4_seo_backlink.sql narrowed access (user f0146c96 lost 22 rows on a reachability-only page)
-- read_lane_v2_b4_seo_backlink.sql (applied 2026-10-19 08:20 UTC, 01:20 PT — inside the 1-4 AM window, not outside as
-- its header says) NARROWED access: its per-row web_page arm follows web.page's own std_select, which refuses a page
-- the kernel and iam.accessible_entity_ids admit through a reachability lane (page e2e69db4…, reached via task
-- d520c6c4…). Measured: user f0146c96… read 22 seo.backlink rows on that page before, 0 after. Its rolled-back proof
-- sampled 7 people and missed it; the same disagreement showed in the sweep's proof on web.page_content
-- (priscilla.tran: 1 row -> 0). This restores the generated set-form policy, byte-identical to before.
delete from iam.read_lane_v2_rollout where token = (select token from platform.entity_types where schema_name = 'seo' and table_name = 'backlink' and is_active);
select iam.apply_rls('seo', 'backlink', (select token from platform.entity_types where schema_name = 'seo' and table_name = 'backlink' and is_active), (select rls_variant from platform.entity_types where schema_name = 'seo' and table_name = 'backlink' and is_active));
