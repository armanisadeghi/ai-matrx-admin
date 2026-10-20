-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- Two partial indexes only. Nothing dropped, revoked or granted; no function bodies.
-- lane: TEMPLATE-INSTALL-3
-- lock: custom
-- Inverse: migrations/inverse/templateinstall3_a_the_uninstall_stops_scanning_every_organization_down.sql
--
-- TEMPLATE-INSTALL-3 item 3 - WHY AN UNINSTALL TOOK 1-4 MINUTES. Profiled with track_functions on one real uninstall (24 view steps
-- at 0.15 s, then every table step 1.5-7 s). Two of the store's own reads were most of it:
--   1. custom.home_relations() (the "additional" half of the custom.home view) read EVERY organization's records for the 2 rows
--      that are a Home relation: 33 calls, 18.2 s of a 40 s sample. It is a SQL function with a SET clause, so the planner cannot
--      push the caller's organization into it, and nothing indexed the relation rows. A partial index on exactly its predicate
--      turns each call into an index read of the rows that match.
--   2. platform.relation_delete_effects asks platform.associations for "everything pointing at this record" by target_id alone, but
--      the only live target index leads with target_type, so each ask read the whole index: 96 calls, 8.4 s (88 ms each).
--      A partial index on target_id for live relation edges is the read it needs.
set local lock_timeout = '3s';

CREATE INDEX IF NOT EXISTS record_home_relation_idx
  ON custom.record (organization_id)
  WHERE data_class = 'relation' AND deleted_at IS NULL AND (data ->> 'role') = 'home';

CREATE INDEX IF NOT EXISTS idx_assoc_target_relation_live
  ON platform.associations (target_id)
  WHERE deleted_at IS NULL AND relation_field_id IS NOT NULL;
