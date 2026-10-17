-- A STANDARD TABLE'S RETIRED FIELDS CAN BE LISTED (HR custom-fields "Archived" view + Restore).
-- custom.entity_fields grows p_include_retired (default false). False answers exactly what it
-- always did: the live fields. True also answers the fields custom.entity_field_retire set aside,
-- each with its own deleted_at (the moment it was archived), so a screen can offer Restore
-- (custom.field_restore) by id. Same doors, same order, same SECURITY DEFINER checks.
-- Dropped and recreated (not overloaded) so PostgREST never sees two candidates for 2 args.
-- Inverse: migrations/inverse/hr_archived_fields_entity_fields_reads_retired_down.sql
drop function if exists custom.entity_fields(uuid, text);

create or replace function custom.entity_fields(
  p_organization_id uuid,
  p_token text,
  p_include_retired boolean default false
)
 returns setof custom.record
 language plpgsql
 stable security definer
 set search_path to 'pg_catalog'
as $function$
begin
  -- The decision comes BEFORE the read, the same order every door in this store uses, so a
  -- foreign organization and an invented one answer identically.
  perform custom.assert_store_door(p_organization_id, 'custom.entity_fields');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.entity_fields');
  perform custom.entity_table(p_token);

  return query
    select f.*
      from custom.record f
     where f.organization_id = p_organization_id
       and f.table_id = custom.field_kernel_id()
       and (f.deleted_at is null or coalesce(p_include_retired, false))
       and f.data ->> 'table_token' = p_token
     order by (f.deleted_at is not null), coalesce((f.data ->> 'sort')::numeric, 100), f.data ->> 'label';
end
$function$;

-- A DOOR FOLLOWS ITS FUNCTION (provision_shape_guard): move the door row to the new signature.
update platform.client_callable_door
   set identity_args = pg_get_function_identity_arguments('custom.entity_fields(uuid, text, boolean)'::regprocedure),
       identity_argtypes = platform.door_argtypes((select proargtypes from pg_proc where oid = 'custom.entity_fields(uuid, text, boolean)'::regprocedure)),
       reason = 'p_organization_id is checked by custom.assert_client_may_reach (membership of that organization) before anything is read; NULL is refused there by name. p_token is a registry token, not an entity id. p_include_retired (default false; NULL reads as false) adds the fields custom.entity_field_retire set aside, each with its deleted_at, so a screen can offer Restore; FOREIGN does not apply, it is a flag. Field definitions are organization-wide, so membership is the whole question.',
       declared_by = 'migrations/campaign/hr_archived_fields_entity_fields_reads_retired.sql'
 where schema_name = 'custom' and function_name = 'entity_fields'
   and identity_args = 'p_organization_id uuid, p_token text';

revoke all on function custom.entity_fields(uuid, text, boolean) from public;
grant execute on function custom.entity_fields(uuid, text, boolean) to authenticated;
notify pgrst, 'reload schema';
