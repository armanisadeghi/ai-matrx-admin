-- chair-step: withdraw AT-SYNC GitHub: deletes custom.synced_source rows of kind github_issues (their tables stay, just no longer synced) and restores the narrower source_kind check.
-- lock: custom
-- Inverse of 20261018120000_synced_source_github_issues.sql.
set local lock_timeout = '3s';
set local statement_timeout = '60s';

delete from custom.synced_source where source_kind = 'github_issues';
alter table custom.synced_source drop constraint synced_source_source_kind_check;
alter table custom.synced_source add constraint synced_source_source_kind_check check (source_kind = any (array[
  'notion_database','notion_page','notion_mapped','gmail','search','scraper','connector','airtable_base','google_sheets',
  'notion_view_of']::text[]));  -- a later kind (notion_view_of) stays: this inverse withdraws github_issues only
