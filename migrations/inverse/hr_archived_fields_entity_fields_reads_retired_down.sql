-- Inverse of migrations/campaign/hr_archived_fields_entity_fields_reads_retired.sql
drop function if exists custom.entity_fields(uuid, text, boolean);

create or replace function custom.entity_fields(p_organization_id uuid, p_token text)
 returns setof custom.record
 language plpgsql
 stable security definer
 set search_path to 'pg_catalog'
as $function$
begin
  perform custom.assert_store_door(p_organization_id, 'custom.entity_fields');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.entity_fields');
  perform custom.entity_table(p_token);

  return query
    select f.*
      from custom.record f
     where f.organization_id = p_organization_id
       and f.table_id = custom.field_kernel_id()
       and f.deleted_at is null
       and f.data ->> 'table_token' = p_token
     order by coalesce((f.data ->> 'sort')::numeric, 100), f.data ->> 'label';
end
$function$;

update platform.client_callable_door
   set identity_args = 'p_organization_id uuid, p_token text',
       identity_argtypes = platform.door_argtypes((select proargtypes from pg_proc where oid = 'custom.entity_fields(uuid, text)'::regprocedure)),
       reason = 'p_organization_id is checked by custom.assert_client_may_reach (membership of that organization) before anything is read; NULL is refused there by name. p_token is a registry token, not an entity id. Field definitions are organization-wide, so membership is the whole question.',
       declared_by = 'migrations/campaign/entityfields_the_doors_a_person_reaches.sql'
 where schema_name = 'custom' and function_name = 'entity_fields'
   and identity_args = 'p_organization_id uuid, p_token text, p_include_retired boolean';

revoke all on function custom.entity_fields(uuid, text) from public;
grant execute on function custom.entity_fields(uuid, text) to authenticated;
notify pgrst, 'reload schema';
