-- chair-step: withdraw AT-BASE: drops custom.base_copy_finish and its door row, the retention policy row, custom.base_snapshot and custom.base (and their registry tokens), and restores the narrower custom.synced_source.source_kind check (rows of the two new kinds are deleted first).
-- lock: custom
-- Inverse of atbase_a_a_base_has_a_name_snapshots_and_a_copy_that_points_inward.sql.
set local lock_timeout = '3s';
set local statement_timeout = '60s';

delete from platform.client_callable_door where schema_name = 'custom' and function_name = 'base_copy_finish';
drop function if exists custom.base_copy_finish(uuid, jsonb);
delete from platform.retention_policy where entity_token = 'custom_base_snapshot' and set_by = 'agent' and label = 'Base snapshot retention';
drop table if exists custom.base_snapshot;
drop table if exists custom.base;
delete from platform.entity_types where token in ('custom_base_snapshot', 'custom_base');
delete from custom.synced_source where source_kind in ('airtable_base', 'google_sheets');
alter table custom.synced_source drop constraint synced_source_source_kind_check;
alter table custom.synced_source add constraint synced_source_source_kind_check check (source_kind = any (array[
  'notion_database','notion_page','notion_mapped','gmail','search','scraper','connector']::text[]));
