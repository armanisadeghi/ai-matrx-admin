-- additive: yes
-- adds two partial btree indexes to each of the sixteen partitions of custom.record (relation Field rows; Confidential Table rows), built CONCURRENTLY so no write waits for them. Nothing is dropped, altered or rewritten; no data, function, policy or grant is touched.
-- lane: PAGE-BUNDLE-SPEED
-- lock: custom
-- AUTOCOMMIT FILE: CREATE INDEX CONCURRENTLY cannot run inside a transaction; apply statement by statement.
--
-- PAGE-BUNDLE-SPEED a — A TABLE PAGE FINDS ITS BACK-LINKS AND THE ORGANIZATION'S CONFIDENTIAL TABLES BY INDEX.
--
-- Measured 2026-10-20 (pg_stat_statements, track=all, buffers per inner statement of custom.table_page_bundle for an
-- 18-row table, before and after the Template sweep org grew by 1,000 tables / 15,000 Fields / 20,000 rows):
--   custom.reverse_columns' "links" read           125 -> 3,509 buffers  (it read every relation-capable Field of the org)
--   the "is any Table of the org Confidential" ask   44 ->   416 buffers  (custom.visible_set / custom.levels_of; every Table)
--   record_fieldkernel_reltarget_rp_NN  (organization_id, target mode, relation_target) on relation Fields only: the
--      back-link question is "Fields whose one target is this table, or whose target mode is several" — two index ranges.
--   record_tablekernel_confidential_rp_NN  (organization_id) on live Confidential Table rows only (a handful per org).
--
-- INVERSE: migrations/inverse/pagebundlespeed_a_a_relation_fields_and_confidential_tables_are_found_by_index_down.sql

create index concurrently if not exists record_fieldkernel_reltarget_rp_00
  on custom.record_p00 (organization_id, (coalesce(nullif((data -> 'config') ->> 'target_mode', ''), 'one')), (data ->> 'relation_target'))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid and (data ->> 'type') = 'relation';

create index concurrently if not exists record_fieldkernel_reltarget_rp_01
  on custom.record_p01 (organization_id, (coalesce(nullif((data -> 'config') ->> 'target_mode', ''), 'one')), (data ->> 'relation_target'))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid and (data ->> 'type') = 'relation';

create index concurrently if not exists record_fieldkernel_reltarget_rp_02
  on custom.record_p02 (organization_id, (coalesce(nullif((data -> 'config') ->> 'target_mode', ''), 'one')), (data ->> 'relation_target'))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid and (data ->> 'type') = 'relation';

create index concurrently if not exists record_fieldkernel_reltarget_rp_03
  on custom.record_p03 (organization_id, (coalesce(nullif((data -> 'config') ->> 'target_mode', ''), 'one')), (data ->> 'relation_target'))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid and (data ->> 'type') = 'relation';

create index concurrently if not exists record_fieldkernel_reltarget_rp_04
  on custom.record_p04 (organization_id, (coalesce(nullif((data -> 'config') ->> 'target_mode', ''), 'one')), (data ->> 'relation_target'))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid and (data ->> 'type') = 'relation';

create index concurrently if not exists record_fieldkernel_reltarget_rp_05
  on custom.record_p05 (organization_id, (coalesce(nullif((data -> 'config') ->> 'target_mode', ''), 'one')), (data ->> 'relation_target'))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid and (data ->> 'type') = 'relation';

create index concurrently if not exists record_fieldkernel_reltarget_rp_06
  on custom.record_p06 (organization_id, (coalesce(nullif((data -> 'config') ->> 'target_mode', ''), 'one')), (data ->> 'relation_target'))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid and (data ->> 'type') = 'relation';

create index concurrently if not exists record_fieldkernel_reltarget_rp_07
  on custom.record_p07 (organization_id, (coalesce(nullif((data -> 'config') ->> 'target_mode', ''), 'one')), (data ->> 'relation_target'))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid and (data ->> 'type') = 'relation';

create index concurrently if not exists record_fieldkernel_reltarget_rp_08
  on custom.record_p08 (organization_id, (coalesce(nullif((data -> 'config') ->> 'target_mode', ''), 'one')), (data ->> 'relation_target'))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid and (data ->> 'type') = 'relation';

create index concurrently if not exists record_fieldkernel_reltarget_rp_09
  on custom.record_p09 (organization_id, (coalesce(nullif((data -> 'config') ->> 'target_mode', ''), 'one')), (data ->> 'relation_target'))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid and (data ->> 'type') = 'relation';

create index concurrently if not exists record_fieldkernel_reltarget_rp_10
  on custom.record_p10 (organization_id, (coalesce(nullif((data -> 'config') ->> 'target_mode', ''), 'one')), (data ->> 'relation_target'))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid and (data ->> 'type') = 'relation';

create index concurrently if not exists record_fieldkernel_reltarget_rp_11
  on custom.record_p11 (organization_id, (coalesce(nullif((data -> 'config') ->> 'target_mode', ''), 'one')), (data ->> 'relation_target'))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid and (data ->> 'type') = 'relation';

create index concurrently if not exists record_fieldkernel_reltarget_rp_12
  on custom.record_p12 (organization_id, (coalesce(nullif((data -> 'config') ->> 'target_mode', ''), 'one')), (data ->> 'relation_target'))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid and (data ->> 'type') = 'relation';

create index concurrently if not exists record_fieldkernel_reltarget_rp_13
  on custom.record_p13 (organization_id, (coalesce(nullif((data -> 'config') ->> 'target_mode', ''), 'one')), (data ->> 'relation_target'))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid and (data ->> 'type') = 'relation';

create index concurrently if not exists record_fieldkernel_reltarget_rp_14
  on custom.record_p14 (organization_id, (coalesce(nullif((data -> 'config') ->> 'target_mode', ''), 'one')), (data ->> 'relation_target'))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid and (data ->> 'type') = 'relation';

create index concurrently if not exists record_fieldkernel_reltarget_rp_15
  on custom.record_p15 (organization_id, (coalesce(nullif((data -> 'config') ->> 'target_mode', ''), 'one')), (data ->> 'relation_target'))
  where table_id = '11111111-0000-4000-8000-000000000002'::uuid and (data ->> 'type') = 'relation';

create index concurrently if not exists record_tablekernel_confidential_rp_00
  on custom.record_p00 (organization_id)
  where table_id = '11111111-0000-4000-8000-000000000001'::uuid and deleted_at is null and (data ->> 'level') = 'confidential';

create index concurrently if not exists record_tablekernel_confidential_rp_01
  on custom.record_p01 (organization_id)
  where table_id = '11111111-0000-4000-8000-000000000001'::uuid and deleted_at is null and (data ->> 'level') = 'confidential';

create index concurrently if not exists record_tablekernel_confidential_rp_02
  on custom.record_p02 (organization_id)
  where table_id = '11111111-0000-4000-8000-000000000001'::uuid and deleted_at is null and (data ->> 'level') = 'confidential';

create index concurrently if not exists record_tablekernel_confidential_rp_03
  on custom.record_p03 (organization_id)
  where table_id = '11111111-0000-4000-8000-000000000001'::uuid and deleted_at is null and (data ->> 'level') = 'confidential';

create index concurrently if not exists record_tablekernel_confidential_rp_04
  on custom.record_p04 (organization_id)
  where table_id = '11111111-0000-4000-8000-000000000001'::uuid and deleted_at is null and (data ->> 'level') = 'confidential';

create index concurrently if not exists record_tablekernel_confidential_rp_05
  on custom.record_p05 (organization_id)
  where table_id = '11111111-0000-4000-8000-000000000001'::uuid and deleted_at is null and (data ->> 'level') = 'confidential';

create index concurrently if not exists record_tablekernel_confidential_rp_06
  on custom.record_p06 (organization_id)
  where table_id = '11111111-0000-4000-8000-000000000001'::uuid and deleted_at is null and (data ->> 'level') = 'confidential';

create index concurrently if not exists record_tablekernel_confidential_rp_07
  on custom.record_p07 (organization_id)
  where table_id = '11111111-0000-4000-8000-000000000001'::uuid and deleted_at is null and (data ->> 'level') = 'confidential';

create index concurrently if not exists record_tablekernel_confidential_rp_08
  on custom.record_p08 (organization_id)
  where table_id = '11111111-0000-4000-8000-000000000001'::uuid and deleted_at is null and (data ->> 'level') = 'confidential';

create index concurrently if not exists record_tablekernel_confidential_rp_09
  on custom.record_p09 (organization_id)
  where table_id = '11111111-0000-4000-8000-000000000001'::uuid and deleted_at is null and (data ->> 'level') = 'confidential';

create index concurrently if not exists record_tablekernel_confidential_rp_10
  on custom.record_p10 (organization_id)
  where table_id = '11111111-0000-4000-8000-000000000001'::uuid and deleted_at is null and (data ->> 'level') = 'confidential';

create index concurrently if not exists record_tablekernel_confidential_rp_11
  on custom.record_p11 (organization_id)
  where table_id = '11111111-0000-4000-8000-000000000001'::uuid and deleted_at is null and (data ->> 'level') = 'confidential';

create index concurrently if not exists record_tablekernel_confidential_rp_12
  on custom.record_p12 (organization_id)
  where table_id = '11111111-0000-4000-8000-000000000001'::uuid and deleted_at is null and (data ->> 'level') = 'confidential';

create index concurrently if not exists record_tablekernel_confidential_rp_13
  on custom.record_p13 (organization_id)
  where table_id = '11111111-0000-4000-8000-000000000001'::uuid and deleted_at is null and (data ->> 'level') = 'confidential';

create index concurrently if not exists record_tablekernel_confidential_rp_14
  on custom.record_p14 (organization_id)
  where table_id = '11111111-0000-4000-8000-000000000001'::uuid and deleted_at is null and (data ->> 'level') = 'confidential';

create index concurrently if not exists record_tablekernel_confidential_rp_15
  on custom.record_p15 (organization_id)
  where table_id = '11111111-0000-4000-8000-000000000001'::uuid and deleted_at is null and (data ->> 'level') = 'confidential';
