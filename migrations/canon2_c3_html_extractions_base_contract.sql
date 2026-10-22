-- chair-step: api.html_extractions gets its base contract: id bigint -> uuid (14 rows, nothing references the id: no FK, no reader in any repo), organization_id NOT NULL backfilled to each owner's own organization
-- based-on: audit.user_delete_probe(text) 4c94813ff4b454477c2a53ab2bebf19fa188dcbfa2ee675aa66953e4ad6cbd0e
--
-- Canonicalization wave 2, lane C. Access is unchanged: owner-only (personal variant on created_by,
-- which equals user_id on every row). Writers: none live in any repo (last row 2025-10-01); the one
-- database writer is the audit.user_delete_probe fixture, which now names its organization like
-- its sibling inserts do.

set lock_timeout = '2s';

-- id: uuid identity (no FK or reader points at the old integer)
alter table api.html_extractions alter column id drop default;
alter table api.html_extractions alter column id type uuid using gen_random_uuid();
alter table api.html_extractions alter column id set default gen_random_uuid();
drop sequence if exists api.html_extractions_id_seq;

alter table api.html_extractions disable trigger user;
alter table api.html_extractions add column if not exists created_by uuid;
alter table api.html_extractions add column if not exists updated_by uuid;
update api.html_extractions set created_by = user_id where created_by is null;
alter table api.html_extractions enable trigger user;

select platform.retrofit_entity(
  'api', 'html_extractions', 'html_extraction', 'expr',
  p_org_expr  => 'iam.person_own_organization(t.user_id)',
  p_owner_col => 'user_id');

create index if not exists html_extractions_organization_id_idx on api.html_extractions (organization_id);
create index if not exists html_extractions_created_by_idx on api.html_extractions (created_by);
create index if not exists html_extractions_updated_by_idx on api.html_extractions (updated_by);

drop trigger if exists _stamp_actor on api.html_extractions;
create trigger _stamp_actor before insert or update on api.html_extractions
  for each row execute function platform._stamp_actor();

alter table api.html_extractions add column if not exists deleted_at timestamptz;
update platform.entity_types set has_soft_delete = true where token = 'html_extraction';

select iam.apply_rls('api', 'html_extractions', 'html_extraction', 'personal');

-- The probe fixture names the organization (its own v_org, as its app_instances insert does).
do $$
declare
  v_def text := pg_get_functiondef('audit.user_delete_probe(text)'::regprocedure);
  v_new text;
begin
  v_new := replace(v_def,
    'insert into api.html_extractions (user_id, url, html_content)' || E'\n' || '    values (v_id, ''https://example.com/invoices'',',
    'insert into api.html_extractions (user_id, organization_id, url, html_content)' || E'\n' || '    values (v_id, v_org, ''https://example.com/invoices'',');
  if v_new = v_def then
    raise exception 'audit.user_delete_probe: html_extractions insert not found; nothing replaced';
  end if;
  execute v_new;
end $$;

do $$ begin
  if exists (select 1 from api.html_extractions where organization_id is null) then raise exception 'null organization_id remains'; end if;
  if exists (select 1 from api.html_extractions where created_by is distinct from user_id) then raise exception 'created_by differs from user_id'; end if;
  if not exists (select 1 from pg_policy where polrelid = 'api.html_extractions'::regclass and polname = 'platform_admin_read') then raise exception 'platform_admin_read missing'; end if;
end $$;
