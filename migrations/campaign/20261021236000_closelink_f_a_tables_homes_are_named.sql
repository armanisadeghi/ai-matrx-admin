-- Lane CLOSE-LINK (CD-LINK-10, acceptance test 10 "Two Homes, one Table"; PLAN.md "Table settings -> Where it lives -> Also lives in…: add a record as another Home; list of Homes"). ADDS one client door, custom.table_homes_named(uuid, uuid): every Home a Table lives in (custom.query_table_homes, which decides who may know the Table), each with the name this reader may see (platform.relation_label masks a Home she may not open) and whether it is the Home the Table was declared in. Table settings draws it as "Lives in" beside "Also lives in…" (custom.home_add, already a client door). Nothing else changes. Inverse: migrations/inverse/20261021236000_closelink_f_a_tables_homes_are_named_down.sql.
-- lane: close-link
-- lock: custom
--
-- Test: scripts/campaign-tests/closelink_two_homes_green.sql (RED before: the door is missing).

set lock_timeout = '3s';
set statement_timeout = '120s';

create or replace function custom.table_homes_named(p_organization_id uuid, p_table_id uuid)
 returns table(home_id uuid, name text, declared boolean)
 language plpgsql
 stable security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_first uuid;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_homes_named');
  if p_organization_id is null or p_table_id is null then
    return;
  end if;
  select custom.containment_parent(t.data) into v_first
    from custom.record t
   where t.organization_id = p_organization_id and t.id = p_table_id and t.deleted_at is null;
  return query
    -- an organization's own Home record belongs to no table, so it has no title column: its name is its own
    select h.h,
           coalesce(platform.relation_label(p_organization_id, 'record', h.h),
                    (select nullif(r.data ->> 'name', '') from custom.record r
                      where r.organization_id = p_organization_id and r.id = h.h and r.table_id is null)),
           h.h is not distinct from v_first
      from (select q.q as h from custom.query_table_homes(p_organization_id, p_table_id) as q(q)
            union
            -- the Home it was declared in, when this reader may know the Table at all (the line above answered)
            select v_first where v_first is not null
              and exists (select 1 from custom.query_table_homes(p_organization_id, p_table_id))) h
     order by (h.h is not distinct from v_first) desc, 2;
end
$function$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers, anonymous_purpose, argument_rules)
values
  ('custom', 'table_homes_named', 'p_organization_id uuid, p_table_id uuid', array['uuid'::regtype, 'uuid'::regtype]::oid[],
   'Table settings "Lives in": every Home a Table lives in, named for this reader, the declared one first.',
   '20261021236000_closelink_f_a_tables_homes_are_named.sql', null, true, false, null,
   jsonb_build_object('version', 1, 'declared_by', '20261021236000_closelink_f_a_tables_homes_are_named.sql', 'declared_at', '2026-10-21 lane CLOSE-LINK, read from the body and exercised in scripts/campaign-tests/closelink_two_homes_green.sql',
     'arguments', jsonb_build_object(
       'p_organization_id', jsonb_build_object(
         'type', 'uuid', 'position', 1, 'optional', false, 'entity', 'organization', 'entity_reason', 'The organization the Table lives in.',
         'check', 'custom.assert_client_may_reach: the caller belongs to it.',
         'foreign', jsonb_build_object('note', 'refused by the reach check, as every store door is', 'not_a_leak', true, 'same_as_invented', true),
         'null_rule', jsonb_build_object('means', 'no rows'),
         'verified', 'exercised in scripts/campaign-tests/closelink_two_homes_green.sql, rolled back'),
       'p_table_id', jsonb_build_object(
         'type', 'uuid', 'position', 2, 'optional', false, 'entity', 'record', 'entity_reason', 'A Table is a record (REC-25).',
         'check', 'custom.query_table_homes decides whether the caller may know the Table; each Home is named through platform.relation_label, which masks one she may not open.',
         'foreign', jsonb_build_object('note', 'a Table of another organization or one she may not know answers what query_table_homes answers', 'not_a_leak', true, 'same_as_invented', true),
         'null_rule', jsonb_build_object('means', 'no rows'),
         'verified', 'exercised in scripts/campaign-tests/closelink_two_homes_green.sql, rolled back'))))
on conflict do nothing;

grant execute on function custom.table_homes_named(uuid, uuid) to authenticated;
select custom.reopen_declared_doors();
