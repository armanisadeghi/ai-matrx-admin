-- INVERSE of migrations/campaign/templateinstall3_b_which_tables_are_in_these_homes_reads_an_index.sql (lane TEMPLATE-INSTALL-3): drops the index.
-- chair-step: drops one index.
-- lock: custom
set local lock_timeout = '3s';

DROP INDEX IF EXISTS custom.record_table_home_idx;
