-- platform.system_content_person_owner_report(): THE GUARD'S QUESTION, asked of the database.
-- Pair of 20261016180000_system_content_has_no_person_owner.sql. For every table carrying the
-- zz_system_content_owner trigger (the declaration), it lists Matrx System rows whose created_by is a person
-- (not NULL, not the system principal), plus one row per table that has lost the trigger.
-- Read by aidream scripts/check_system_content_has_no_person_owner.py --live. Not client-callable (no grant to
-- authenticated/anon). New function; no based-on.

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
                   ('agent.prompt_block'::regclass), ('files.files'::regclass)) v(rel)
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

comment on function platform.system_content_person_owner_report() is
  'Matrx System platform-content rows owned by a person, per declared table, and whether the '
  'zz_system_content_owner trigger is still attached. Guard: aidream scripts/check_system_content_has_no_person_owner.py.';

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values
  ('platform', 'system_content_person_owner_report', '', array[]::oid[],
   'Takes no entity-id argument; reads only fixed platform-content tables in the Matrx System org and returns counts plus at most five row ids per table.',
   '20261016181000_system_content_person_owner_report',
   'server_only: aidream scripts/check_system_content_has_no_person_owner.py calls it on the privileged pool as a release-health guard; no client ever does.',
   false, false);
