-- 20261021280100_bc_b_synced_source_connected_app.sql
-- chair-step: replaces one CHECK constraint (drop + add) on custom.synced_source; the new list only ADDS 'connected_app', no row changes.
-- lane: BUILD-CONN
-- lock: custom
--
-- custom.synced_source.source_kind accepts 'connected_app': a table brought in from ANY connected app's read tool (Asana,
-- Jira via Atlassian, Box, Salesforce …), source_ref '<connection>/<tool>/<hash of arguments>', connector = {connection,
-- tool, arguments, items_path, fields, key}; refreshed by Sync now (aidream POST /connection-sync/sync). 'connector' stays
-- the mapped-sync job kind (no target). Additive: the check only gains a value.
-- Inverse: migrations/inverse/20261021280100_bc_b_synced_source_connected_app_down.sql.
set local lock_timeout = '3s';
set local statement_timeout = '60s';

alter table custom.synced_source drop constraint synced_source_source_kind_check;
alter table custom.synced_source add constraint synced_source_source_kind_check check (source_kind = any (array[
  'notion_database','notion_page','notion_mapped','gmail','search','scraper','connector','airtable_base','google_sheets','github_issues',
  'notion_view_of','connected_app']::text[]));
-- The NEXT kind change copies this whole list.
