-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- One partial expression index only. Nothing dropped, revoked or granted; no function bodies.
-- lane: TEMPLATE-INSTALL-3
-- lock: custom
-- Inverse: migrations/inverse/templateinstall3_b_which_tables_are_in_these_homes_reads_an_index_down.sql
--
-- TEMPLATE-INSTALL-3 item 3 (second index). The "declared" half of the custom.home view answers "which Tables are in these Homes" by
-- working out every Table record's containment parent in the organization: 86,000 containment_parent calls and 4.8 s inclusive in one
-- uninstall's 127 deletes. An index on exactly that expression over the Table kernel's live rows answers it from the index.
set local lock_timeout = '3s';

CREATE INDEX IF NOT EXISTS record_table_home_idx
  ON custom.record (organization_id, (custom.containment_parent(data)))
  WHERE table_id = '11111111-0000-4000-8000-000000000001'::uuid AND deleted_at IS NULL;
