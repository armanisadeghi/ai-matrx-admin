-- 20261018120000_synced_source_github_issues.sql
-- chair-step: replaces one CHECK constraint (drop + add) on custom.synced_source; the new list only ADDS 'github_issues', no row changes.
-- lane: AT-SYNC
-- lock: custom
--
-- custom.synced_source.source_kind accepts 'github_issues': a table of one GitHub repository's issues, source_ref 'owner/name',
-- refreshed by Sync now (aidream POST /github-sync/sync). Additive: the check only gains a value. Inverse: migrations/inverse/20261018120000_synced_source_github_issues_down.sql.
set local lock_timeout = '3s';
set local statement_timeout = '60s';

alter table custom.synced_source drop constraint synced_source_source_kind_check;
alter table custom.synced_source add constraint synced_source_source_kind_check check (source_kind = any (array[
  'notion_database','notion_page','notion_mapped','gmail','search','scraper','connector','airtable_base','google_sheets','github_issues',
  'notion_view_of']::text[]));
-- 'notion_view_of' (aidream 20261019230000_synced_source_kind_notion_view_of.sql, live 2026-10-19) is kept here so the next
-- source kind, copied from this list, never drops it. The NEXT kind change copies this whole list.
