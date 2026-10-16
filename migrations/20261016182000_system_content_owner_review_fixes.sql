-- System content ownership, review fixes (pair of 20261016180000 / 20261016181000):
--  1. files ('principal' mode): a writer that leaves created_by empty gets the system principal instead of a
--     NOT NULL failure.
--  2. agent.exemplar (reference/system variant: examples attached to system agents) joins the declared
--     platform-content tables; 52 person-owned rows backfilled to NULL.
-- based-on: platform._system_content_owner() 47091c0656965f934133bb322e3b94200f7679f3662e982c90720e37a3d051eb
-- based-on: platform.system_content_person_owner_report() d8bf39b6039404be7fd7ee664482769b913a8157184c9650dbe903ab2db3164f

create or replace function platform._system_content_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_principal constant uuid := '71b55cc0-f333-462f-8176-f558f866ea5d';
  v_caller    name := coalesce(nullif(current_setting('role', true), 'none'), session_user)::name;
begin
  -- A NOT NULL owner column ('principal' mode, files) also takes the principal when the writer left it empty.
  if NEW.organization_id is null or NEW.created_by = v_principal
     or (NEW.created_by is null and TG_ARGV[0] <> 'principal') then
    return NEW;
  end if;
  if not exists (select 1 from iam.system_orgs s
                  where s.organization_id = NEW.organization_id and s.key = 'system') then
    return NEW;
  end if;
  if TG_OP = 'UPDATE'
     and OLD.organization_id is distinct from NEW.organization_id
     and v_caller = 'authenticated'
     and not public.is_platform_admin() then
    return NEW;
  end if;
  NEW.created_by := case when TG_ARGV[0] = 'principal' then v_principal else null end;
  return NEW;
end
$$;

create trigger zz_system_content_owner before insert or update of organization_id, created_by on agent.exemplar
  for each row execute function platform._system_content_owner('null');

create or replace function platform.system_content_person_owner_report()
returns table (table_name text, offenders bigint, sample_ids uuid[], trigger_attached boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sys       constant uuid := '39c38960-d30c-4840-b0c1-c9960de95582';
  v_principal constant uuid := '71b55cc0-f333-462f-8176-f558f866ea5d';
  t record;
begin
  for t in
    select v.rel, exists (select 1 from pg_trigger g
                           where g.tgrelid = v.rel and g.tgname = 'zz_system_content_owner' and g.tgenabled <> 'D') attached
      from (values ('agent.definition'::regclass), ('skill.definition'::regclass), ('mandate.definition'::regclass),
                   ('tool.definition'::regclass), ('ai.model_definition'::regclass),
                   ('content_ir.kind_definition'::regclass), ('content_ir.io_contract'::regclass),
                   ('agent.prompt_block'::regclass), ('agent.exemplar'::regclass), ('files.files'::regclass)) v(rel)
  loop
    table_name := t.rel::text;
    trigger_attached := t.attached;
    execute format(
      'select count(*), (array_agg(id order by created_at desc))[1:5] from %s
        where organization_id = $1 and created_by is not null and created_by <> $2', t.rel)
      into offenders, sample_ids using v_sys, v_principal;
    return next;
  end loop;
end
$$;

set local app.actor_tier = 'system';
set local app.actor_system = 'migration.system_content_has_no_person_owner';

update agent.exemplar set created_by = null
 where organization_id = '39c38960-d30c-4840-b0c1-c9960de95582' and created_by is not null
   and created_by <> '71b55cc0-f333-462f-8176-f558f866ea5d';
