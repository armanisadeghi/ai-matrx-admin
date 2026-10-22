-- chair-step: inverse of 20261022090000_closeshare_d_a_table_known_through_a_shared_row_opens_by_id — restores custom.tables_i_can_open() to the body it replaced (a Table known only through a shared row is not listed again).
-- lane: close-share
-- lock: custom
-- based-on: custom.tables_i_can_open() 99b87beb24236bf17973cadb346e2bb4a57d655b822097bf0ae0e5a1b1c1febd

CREATE OR REPLACE FUNCTION custom.tables_i_can_open()
 RETURNS TABLE(table_id uuid, table_name text, organization_id uuid, organization_name text, member boolean, visibility text, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me     uuid := custom.query_principal();
  v_kernel uuid := custom.table_kernel_id();
begin
  if v_me is null then
    return;
  end if;

  -- ONE STATEMENT (lane HANDOVER): a RETURN QUERY per organization took 11.8 s for a person in 46
  -- organizations; the same question asked once takes under half a second.
  return query
    with orgs as (
      select o.id, o.name::text as name, true as member
        from iam.organization_member m
        join iam.organizations o on o.id = m.organization_id and o.archived_at is null
       where m.user_id = v_me
      union
      select distinct o.id, o.name::text, false
        from iam.permissions g
        join custom.record t
          on t.id = g.resource_id
         and t.table_id = v_kernel
         and t.deleted_at is null
        join iam.organizations o on o.id = t.organization_id and o.archived_at is null
       where g.resource_type = 'record'
         and g.granted_to_user_id = v_me
         and g.status = 'active'
         and (g.expires_at is null or g.expires_at > now())
         and not exists (select 1 from iam.organization_member m2
                          where m2.organization_id = o.id and m2.user_id = v_me)
    ),
    admitted as materialized (
      -- THE WALL, as custom.assert_client_may_reach admits a signed-in person; and A STORE THAT IS
      -- OFF HAS NOTHING TO OPEN. The portal question is asked only when the organization's own door
      -- said no: written as `a or b` it was asked of every organization (a CASE fixes the order),
      -- and at ~55 ms a call it was 2.5 of the 2.9 s measured on the clone.
      select o.id, o.name, o.member
        from orgs o
       where (case when iam.has_org_access(o.id) then true else custom.portal_admits(o.id) end)
         and custom.store_is_open(o.id)
    ),
    visible as materialized (
      -- A MEMBER'S organization: the store's own visibility door.
      select a.id as org_id, v.v as id
        from admitted a
        cross join lateral custom.query_visible_ids(a.id, v_kernel) v
       where a.member
      union
      -- AN ORGANIZATION SHE IS NOT IN, listed only because a table there was shared with her: the
      -- tables shared with her, which is what the visibility door answers there too. Asked through
      -- that door, one table shared from Arman's Org cost 2.6 s on the clone (10 s on production
      -- under load): the door works out the whole organization's visibility to find the one row.
      select a.id, g.resource_id
        from admitted a
        join iam.permissions g
          on g.resource_type = 'record'
         and g.granted_to_user_id = v_me
         and g.status = 'active'
         and (g.expires_at is null or g.expires_at > now())
       where not a.member
    )
    select t.id,
           coalesce(nullif(btrim(t.data ->> 'name'), ''), 'Untitled table'),
           a.id,
           a.name,
           a.member,
           t.visibility::text,
           t.updated_at
      from admitted a
      join visible vis on vis.org_id = a.id
      join custom.record t
        on t.id = vis.id
       and t.organization_id = a.id
       and t.table_id = v_kernel
       and t.deleted_at is null
     where not coalesce((t.data ->> 'kept_by_the_app')::boolean, false);
end;
$function$;
