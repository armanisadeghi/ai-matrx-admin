-- chair-step: withdraw BUILD-CONN connected-app syncs: deletes custom.synced_source rows of kind connected_app (their tables stay, just no longer synced) and restores the narrower source_kind check.
-- lock: custom
-- Inverse of 20261021280100_bc_b_synced_source_connected_app.sql.
set local lock_timeout = '3s';
set local statement_timeout = '60s';

delete from custom.synced_source where source_kind = 'connected_app';
alter table custom.synced_source drop constraint synced_source_source_kind_check;
alter table custom.synced_source add constraint synced_source_source_kind_check check (source_kind = any (array[
  'notion_database','notion_page','notion_mapped','gmail','search','scraper','connector','airtable_base','google_sheets','github_issues',
  'notion_view_of']::text[]));
