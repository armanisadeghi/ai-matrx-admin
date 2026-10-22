-- chair-step: files.user_account gets its base contract (organization_id NOT NULL; the table holds 0 rows and has no writer in any repo or database function today)
--
-- Canonicalization wave 2, lane C. Access is unchanged: owner-only (the personal variant keys on
-- created_by, which equals user_id; _stamp_actor fills it from the signed-in person on a client
-- write and a server write names it). A future writer names organization_id explicitly — the
-- person's own organization, iam.person_own_organization(user_id) (Arman, 2026-10-10).
-- Readers (aidream ensure_default_sandbox, matrx-frontend /api/compute-targets) read by user_id,
-- which stays the primary key.

set lock_timeout = '2s';

alter table files.user_account disable trigger user;
alter table files.user_account add column if not exists created_by uuid;
alter table files.user_account add column if not exists updated_by uuid;
update files.user_account set created_by = user_id where created_by is null;
alter table files.user_account enable trigger user;

select platform.retrofit_entity(
  'files', 'user_account', 'files_user_account', 'expr',
  p_org_expr       => 'iam.person_own_organization(t.user_id)',
  p_owner_col      => 'user_id',
  p_legacy_trigger => 'set_updated_at');

create index if not exists user_account_organization_id_idx on files.user_account (organization_id);
create index if not exists user_account_created_by_idx on files.user_account (created_by);
create index if not exists user_account_updated_by_idx on files.user_account (updated_by);

drop trigger if exists _stamp_actor on files.user_account;
create trigger _stamp_actor before insert or update on files.user_account
  for each row execute function platform._stamp_actor();

alter table files.user_account add column if not exists deleted_at timestamptz;
update platform.entity_types set has_soft_delete = true where token = 'files_user_account';

select iam.apply_rls('files', 'user_account', 'files_user_account', 'personal');

do $$ begin
  if exists (select 1 from files.user_account where organization_id is null) then raise exception 'null organization_id remains'; end if;
  if not exists (select 1 from pg_policy where polrelid = 'files.user_account'::regclass and polname = 'platform_admin_read') then raise exception 'platform_admin_read missing'; end if;
end $$;
