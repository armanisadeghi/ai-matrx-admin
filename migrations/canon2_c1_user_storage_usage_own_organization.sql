-- chair-step: files.user_storage_usage gets its base contract: organization_id NOT NULL (backfilled to each person's own organization), and the three rows whose person no longer exists in auth.users are deleted (backed up in the lane-C report)
-- based-on: public.apply_usage_delta(uuid, bigint, integer, boolean, bigint) d2c428c35c4b9e0472b40d38ba9e144d8a61fcbeff79d01b0e486bccb941f2ab
--
-- Canonicalization wave 2, lane C. Access is unchanged: the row stays owner-only (the personal
-- variant keys on created_by, which equals user_id on every row and every future write).
-- Organization rule (Arman, 2026-10-10): a person's own per-person row belongs to that person's
-- own organization. "Own organization" is the rule iam.provision_signup_organization already uses:
-- the person's earliest active membership in an open organization; failing that, the newest
-- archived organization they own. The ONE writer (public.apply_usage_delta, service_role only)
-- now names it explicitly in its INSERT; no trigger or default chooses it.

set lock_timeout = '2s';

create or replace function iam.person_own_organization(p_user_id uuid)
returns uuid
language sql
stable
set search_path to ''
as $fn$
  select coalesce(
    (select m.organization_id
       from iam.memberships m
       join iam.organizations o on o.id = m.organization_id
      where m.user_id = p_user_id
        and m.container_type = 'organization'
        and m.status = 'active'
        and m.deleted_at is null
        and o.archived_at is null
      order by m.created_at, m.organization_id
      limit 1),
    (select o.id
       from iam.memberships m
       join iam.organizations o on o.id = m.organization_id
      where m.user_id = p_user_id
        and m.container_type = 'organization'
        and m.status = 'active'
        and m.deleted_at is null
        and m.role = 'owner'
        and o.archived_at is not null
        and not coalesce(o.is_system, false)
      order by o.archived_at desc, o.created_at desc, o.id
      limit 1));
$fn$;
comment on function iam.person_own_organization(uuid) is
  'The person''s own organization (the rule iam.provision_signup_organization uses, without its side effects): earliest active membership in an open organization, else the newest archived organization they own. NULL when they have none. Server-side writers of per-person rows name it explicitly; never a default or trigger.';
revoke all on function iam.person_own_organization(uuid) from public, anon, authenticated;
grant execute on function iam.person_own_organization(uuid) to service_role;

-- Rows whose person was deleted from auth.users (orphans; backed up in the lane-C report).
delete from files.user_storage_usage u
 where not exists (select 1 from auth.users a where a.id = u.user_id);

-- The owner column the personal kernel reads. Backfilled with triggers off so updated_at is not restamped.
alter table files.user_storage_usage disable trigger user;
alter table files.user_storage_usage add column if not exists created_by uuid;
alter table files.user_storage_usage add column if not exists updated_by uuid;
update files.user_storage_usage set created_by = user_id where created_by is null;
alter table files.user_storage_usage enable trigger user;

select platform.retrofit_entity(
  'files', 'user_storage_usage', 'user_storage_usage', 'expr',
  p_org_expr       => 'iam.person_own_organization(t.user_id)',
  p_owner_col      => 'user_id',
  p_legacy_trigger => 'set_updated_at');

create index if not exists user_storage_usage_organization_id_idx on files.user_storage_usage (organization_id);
create index if not exists user_storage_usage_created_by_idx on files.user_storage_usage (created_by);
create index if not exists user_storage_usage_updated_by_idx on files.user_storage_usage (updated_by);

-- The one writer names the organization and the owner explicitly.
create or replace function public.apply_usage_delta(p_user_id uuid, p_bytes_delta bigint, p_files_delta integer, p_record_upload boolean DEFAULT false, p_upload_bytes bigint DEFAULT 0)
 returns void
 language plpgsql
 security definer
as $function$
DECLARE
    v_org uuid;
BEGIN
    -- A per-person row lives in the person's own organization (Arman, 2026-10-10).
    v_org := iam.person_own_organization(p_user_id);
    IF v_org IS NULL THEN
        RAISE EXCEPTION 'apply_usage_delta: person % has no organization of their own, so their storage meter has nowhere to live', p_user_id
            USING ERRCODE = '23502';
    END IF;

    INSERT INTO files.user_storage_usage AS u
        (user_id, created_by, organization_id, bytes_used, files_count, daily_upload_count, daily_upload_bytes, daily_reset_at)
    VALUES
        (p_user_id, p_user_id, v_org, GREATEST(p_bytes_delta, 0), GREATEST(p_files_delta, 0),
         CASE WHEN p_record_upload THEN 1 ELSE 0 END,
         CASE WHEN p_record_upload THEN p_upload_bytes ELSE 0 END,
         CURRENT_DATE)
    ON CONFLICT (user_id) DO UPDATE
       SET bytes_used = GREATEST(u.bytes_used + p_bytes_delta, 0),
           files_count = GREATEST(u.files_count + p_files_delta, 0),
           daily_upload_count = CASE
               WHEN u.daily_reset_at < CURRENT_DATE THEN CASE WHEN p_record_upload THEN 1 ELSE 0 END
               ELSE u.daily_upload_count + CASE WHEN p_record_upload THEN 1 ELSE 0 END END,
           daily_upload_bytes = CASE
               WHEN u.daily_reset_at < CURRENT_DATE THEN CASE WHEN p_record_upload THEN p_upload_bytes ELSE 0 END
               ELSE u.daily_upload_bytes + CASE WHEN p_record_upload THEN p_upload_bytes ELSE 0 END END,
           daily_reset_at = CASE
               WHEN u.daily_reset_at < CURRENT_DATE THEN CURRENT_DATE
               ELSE u.daily_reset_at END,
           updated_at = now();
END;
$function$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values
  ('public', 'apply_usage_delta', pg_get_function_identity_arguments('public.apply_usage_delta(uuid,bigint,integer,boolean,bigint)'::regprocedure),
   null,  -- resolved from the catalog by door_identity_is_the_catalogs
   'p_user_id is the person whose storage meter moves; the server passes the authenticated uploader or the file owner it already resolved. Never NULL.',
   'canon2_c1_user_storage_usage_own_organization.sql',
   'server_only: matrx-files / aidream upload, delete and asset lanes (service_role) meter storage after a byte write; EXECUTE is granted to service_role only, no client ever calls it.',
   false, false)
on conflict do nothing;

-- The personal variant's retrofit does not attach the actor stamp; the gate requires it. The writer
-- already names created_by, so the stamp only fills updated_by.
drop trigger if exists _stamp_actor on files.user_storage_usage;
create trigger _stamp_actor before insert or update on files.user_storage_usage
  for each row execute function platform._stamp_actor();

-- Soft delete is part of the base contract (nothing deletes a meter today; the column stays NULL).
alter table files.user_storage_usage add column if not exists deleted_at timestamptz;
update platform.entity_types set has_soft_delete = true where token = 'user_storage_usage';

select iam.apply_rls('files', 'user_storage_usage', 'user_storage_usage', 'personal');

do $$ begin
  if exists (select 1 from files.user_storage_usage where organization_id is null) then raise exception 'null organization_id remains'; end if;
  if exists (select 1 from files.user_storage_usage where created_by is distinct from user_id) then raise exception 'created_by differs from user_id'; end if;
  if not exists (select 1 from pg_policy where polrelid = 'files.user_storage_usage'::regclass and polname = 'platform_admin_read') then raise exception 'platform_admin_read missing'; end if;
end $$;
