-- lane: canonicalization lane 3 (schemas users + iam).
--
-- iam.org_member_controls is an Organization-level, shareable entity with no visibility column
-- (certify: "listed/shareable entity requires visibility enum"). Add the T-13 transitional column
-- every certified Organization table carries (default 'internal'), then regenerate the canonical
-- entity policies so std_select carries the visibility walls the certifier requires.
-- The generator keeps platform_admin_read, org_open_gate and the client_*_refused write guards.
--
-- Proof (rolled-back rehearsal 2026-10-22, role authenticated, rows visible before -> after):
--   test admin 87a6e699-3622-4869-8843-d0867456c0dd            2 -> 2
--   controlled member 5f1f8030-331c-4192-a3fd-a7b9f9b26b20     1 -> 1
--   other member 0a4f8717-ac21-4cfc-80b3-3f8c9e22a369          1 -> 1
set lock_timeout = '2s';

alter table iam.org_member_controls add column if not exists visibility platform.visibility not null
  default platform._t13_transitional_row_column_default('iam.org_member_controls'::regclass, 'internal'::platform.visibility);

select iam.apply_rls('iam', 'org_member_controls', 'org_member_control', 'entity');
