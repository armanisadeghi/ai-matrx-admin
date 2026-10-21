-- Inverse of migrations/campaign/20261021140000_closelink_a_a_record_never_moves_under_its_own_descendant.sql: puts back custom.record_reparent exactly as it was (no cycle refusal).
-- lane: close-link
-- based-on: custom.record_reparent(uuid, uuid, uuid) 46c8a471c5b192b0f5d42a24e146a134181393276b971cef18755eb9b20c68fd
set lock_timeout = '3s';

CREATE OR REPLACE FUNCTION custom.record_reparent(p_organization_id uuid, p_record_id uuid, p_parent_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.record_reparent');
  perform custom.assert_client_may_change(p_organization_id, p_record_id, 'custom.record_reparent', 'admin'::public.permission_level, 'record');
  perform custom.assert_store_door(p_organization_id, 'custom.record_reparent');
  if p_organization_id is null or p_record_id is null then
    raise exception 'custom.record_reparent: the organization and the record are required'
      using errcode = '22004';
  end if;
  -- ARGS-RULED (2026-09-21). THE PARENT IS A RECORD YOU MAY OPEN, IN THIS ORGANIZATION.
  -- `parent_id` is a CARRYING edge: `custom.visibility_ancestors` walks it and
  -- `custom.reaches_directly` arm 3 says an ancestor conveys its level to what is inside it. So
  -- this argument decides WHO ELSE can reach the record being moved — and it was never asked
  -- about. A caller could put their record inside a container they cannot see (handing it to
  -- whoever holds that container, and adding a row to a list its owner never added to), or name
  -- an id in another organization entirely and leave a pointer to nothing.
  -- `viewer` and not `editor`: filing something into a container is not changing the container,
  -- and the store already decides changing it separately.
  if p_parent_id is not null then
    perform custom.assert_client_may_open(p_organization_id, p_parent_id, 'custom.record_reparent',
                                          'viewer'::public.permission_level, 'record');
  end if;

  update custom.record r
     set data = case when p_parent_id is null
                     then r.data - 'parent_id'
                     else r.data || jsonb_build_object('parent_id', p_parent_id::text) end
   where r.organization_id = p_organization_id and r.id = p_record_id;
  if not found then
    raise exception 'that record is not in this organization' using errcode = '23503';
  end if;
end;
$function$

;
