-- custom.io_outbox (event_key, created_at, id) for the record-change drain's consumed mark
-- (2026-10-21). custom.io_outbox_pending_organizations anti-joined the ENTIRE outbox history
-- (~1.1M rows) against custom.io_outbox_consumption on every drain pass: 3.3 s a call, 27% of all
-- database time. The drain now reads only rows at or after each consumer's consumed mark
-- (20261021223100_io_outbox_drain_reads_from_the_consumed_mark.sql); finding the first unconsumed
-- row and the waiting organizations across every organization needs this range, which the
-- (event_key, organization_id, created_at, id) index cannot serve on Postgres 17 (no skip scan).
-- Built CONCURRENTLY so no write is blocked. Applied via aidream's runner (autocommit file).
create index concurrently if not exists io_outbox_event_key_created_idx
  on custom.io_outbox (event_key, created_at, id)
  where deleted_at is null;
