-- lane: canonicalization wave 2, lane E. Split from canon2_e1 so a hot table's ACCESS EXCLUSIVE is held alone, for milliseconds.
-- Same reasoning as canon2_e1_big_tables_base_columns_online.sql (instant column adds, NOT VALID FKs, access unchanged).
set lock_timeout = '2s';

-- history.row_versions (ledger, partitioned): base_metadata (catalog-only on every partition)
alter table history.row_versions add column if not exists metadata jsonb not null default '{}'::jsonb;
