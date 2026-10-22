-- lane: canonicalization lane 2 (schema platform, m-z).
-- platform.masterwork_run_kind (rls_variant reference, 27 rows, PK operation — the natural key
-- platform.masterwork_run.operation FKs onto, so it stays the PK). The reference variant's base
-- contract: a uuid id (+ unique), created_at NOT NULL, metadata jsonb NOT NULL, and an archive
-- column. Exactly the columns platform.retrofit_entity adds for this variant; it is not called
-- because it would also force an organization_id NOT NULL that the reference variant does not
-- carry and that the only writer (aidream/startup/masterwork_run_kinds.py upsert, seeded from
-- code on boot) does not send. created_at is backfilled from first_seen_at, the row's own birth.
-- 27 rows: the id rewrite is instant.
set lock_timeout = '2s';

alter table platform.masterwork_run_kind add column if not exists id uuid not null default gen_random_uuid();
create unique index if not exists platform_masterwork_run_kind_id_key on platform.masterwork_run_kind (id);
alter table platform.masterwork_run_kind add column if not exists created_at timestamptz not null default now();
update platform.masterwork_run_kind set created_at = first_seen_at where created_at <> first_seen_at;
alter table platform.masterwork_run_kind add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table platform.masterwork_run_kind add column if not exists deleted_at timestamptz;
update platform.entity_types set has_soft_delete = true where token = 'masterwork_run_kind';
