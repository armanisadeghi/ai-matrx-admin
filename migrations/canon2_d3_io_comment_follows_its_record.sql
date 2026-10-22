-- Canonicalization wave 2, lane D, item 3 (Arman 2026-10-22: comments follow their row).
-- custom.io_comment is resolved by the kernel as a detail of its record
-- (platform.detail_parent_columns('io_comment') = {record_id, record}); the registry said entity.
-- Re-register it as detail. apply_rls' detail lane reads (entity_type, entity_id), so the record
-- pair is exposed as two GENERATED columns derived from record_id (no writer names them; 36 rows).
-- Access proof (rolled-back trial 2026-10-22, 5 users incl. test admin + ordinary members, 36
-- comments): iam.has_access('io_comment', id, 'viewer') lost 0, gained 0. The table has no
-- authenticated/anon grant — every client read goes through SECURITY DEFINER custom.* doors.
set lock_timeout = '2s';

alter table custom.io_comment
  add column if not exists entity_type text generated always as ('record') stored,
  add column if not exists entity_id uuid generated always as (record_id) stored;

update platform.entity_types set rls_variant = 'detail' where token = 'io_comment';

select iam.apply_rls('custom', 'io_comment', 'io_comment', 'detail');
