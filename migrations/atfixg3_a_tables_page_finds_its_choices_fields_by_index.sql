-- lane: AT-FIX-G3
-- Adds one index (custom.record, expression on a Field's options_table_id). Nothing replaced, dropped or revoked. Inverse: migrations/inverse/atfixg3_a_tables_page_finds_its_choices_fields_by_index_down.sql
--
-- WHY A MEMBER SAW A TABLE PAGE THAT NEVER DREW (measured 2026-10-19, test@test.com in the Workspace, 883 live tables)
-- custom.table_page_bundle and custom.table_facts both read custom.table_placement for EVERY table of the organization,
-- and table_placement asks per table "does any list Field name this table as its choices?" - a scan of all the
-- organization's Field records (3,931 rows) for each of 883 tables. Measured: table_facts 4.7 s as the owner, 10-12 s as the
-- member, table_page_bundle 10.4 s; the REST door answered 500 (statement timeout) for table_page_bundle, table_facts
-- and reverse_columns, so the page held its loading skeleton and then showed nothing. The question is a lookup by
-- (organization, options table), so it gets the index that answers it.
create index if not exists record_options_table_id_idx
  on custom.record (organization_id, ((data -> 'config' ->> 'options_table_id')))
  where deleted_at is null and (data -> 'config' ->> 'options_table_id') is not null;
