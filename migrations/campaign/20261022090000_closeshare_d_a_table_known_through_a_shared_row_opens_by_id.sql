-- chair-step: lane CLOSE-SHARE (CD-SHARE-06, R23 "nothing reads a record directly"): REPLACES custom.tables_i_can_open() by body (same signature, same columns) so a Table a person knows ONLY through a record shared with her (VIS-5 / T10, the rule custom.assert_may_know_table already applies to the grid) is listed in its organization, and REST v1, the "tables" agent tool and every other caller of matrx_records.store.reach can open that Table by id (they find a Table's organization through this door). Before: the grid showed the shared row while REST answered 404 "No table with that id is open to you" and the tool the same. No table, column or grant is added. Inverse: migrations/inverse/20261022090000_closeshare_d_a_table_known_through_a_shared_row_opens_by_id_down.sql.
-- lane: close-share
-- lock: custom
-- based-on: custom.tables_i_can_open() 58d85d5b3c988410ed375b86edb92527d5a703e5b61f0dc72c1b086fb17dbe80
--
-- Two changes, both inside the one statement:
--   . orgs: an organization she is not in is listed when ANY record there (not only a Table record) is shared with her;
--   . visible: the Table of every record shared with her (in any admitted organization) is a Table she knows.
-- What she then READS is still decided by the store's doors as her (read_records answers only her rows).
-- Test: scripts/airtable-walk/closeshare-record-revoke.mjs (RED before: "record shared: REST one row Alpha opens", "REST
-- rows list Alpha" and "MCP tables list_rows lists Alpha" fail with 404; GREEN after).

create or replace function custom.tables_i_can_open()
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
      union
      -- A TABLE KNOWN THROUGH A ROW (VIS-5 / T10, CLOSE-SHARE): a record shared with her names its Table, in an
      -- organization she is in or not. custom.assert_may_know_table says the same yes to the grid; without it here
      -- REST and the agent tool could not find the Table's organization and answered 404 for a row she may read.
      select a.id, r.table_id
        from admitted a
        join iam.permissions g
          on g.resource_type = 'record'
         and g.granted_to_user_id = v_me
         and g.status = 'active'
         and (g.expires_at is null or g.expires_at > now())
        join custom.record r
          on r.id = g.resource_id
         and r.organization_id = a.id
         and r.deleted_at is null
         and r.table_id <> v_kernel
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
