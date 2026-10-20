-- additive: yes
-- Replaces one function body (custom.entity_reference_kinds). No table, trigger, policy or row is touched; locks nothing.
-- GRANT NAMED: none; the function keeps the grants it has.
-- lane: LINK-PICKER-2
-- lock: custom
-- Inverse: migrations/inverse/20261021260300_linkpicker2_d_a_kind_whose_id_is_not_a_uuid_is_not_offered_as_a_link_target_down.sql
-- based-on: custom.entity_reference_kinds() 03d86f14fcc0ceb9d7754408961a060996b927ccb01d8a9f9a70f3e92ce8f291
set local lock_timeout = '3s';
--
-- 26 kinds of the 1,104 a record can link to are identified by a number, a text key or a flag, not a uuid (activity,
-- courts, opinions, dockets, citations, billing_stripe_event, row_version, webhook_dispatch_state ...). A link is a uuid
-- edge (platform.associations.source_id / target_id, custom.external_link, the reference value), so the link store
-- cannot hold their ids: the write gate refused them in words (linkpicker_b) but the kinds list still offered them, so a
-- column could be declared on one and a picker opened on it. They are not offered any more: the list a person picks from,
-- the list the Field guard accepts and the list the edge trigger accepts are ONE list (this function), and it now leaves
-- out a kind whose registered table has an id column that is not a uuid. Set-based on the catalogue (0.17 s for the list,
-- the same as before within noise); a kind whose table cannot be found stays listed and is refused by name where it is searched.
-- The association_types rows are deliberately NOT deactivated: that fires the reachability rebuild.

create or replace function custom.entity_reference_kinds()
 RETURNS TABLE(token text, label text, category text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
#variable_conflict use_column
begin
  -- SUITE-HEALTH-3: the identical body, moved from LANGUAGE sql into plpgsql so its plan is
  -- cached for the session instead of re-planned on every call (writeperf2_green clause 9).
  -- The kinds of platform thing an entity-reference Field may name: exactly the registered
  -- `record → <token>` association types, so the list a person picks from, the list the Field
  -- guard accepts and the list the edge trigger accepts are ONE list.
  return query
  select e.token, e.label, coalesce(nullif(e.reference_category, ''), e.schema_name)
    from platform.association_types r
    join platform.entity_types e on e.token = r.target_type
   where r.source_type = 'record'
     and r.target_type <> 'record'
     and r.is_active
     and e.is_active
     -- LINK-PICKER-2: a link is a uuid edge (platform.associations.target_id, custom.record links), so a kind whose
     -- rows are identified by a number, a text key or a flag (activity, courts, opinions ... 26 of them) cannot be
     -- held by one and is not offered. A kind whose table is not there to be read stays listed: it is refused in
     -- words by name, not hidden.
     and not exists (select 1
                       from pg_catalog.pg_namespace n
                       join pg_catalog.pg_class c on c.relnamespace = n.oid
                       join pg_catalog.pg_attribute a on a.attrelid = c.oid
                      where n.nspname = e.schema_name and c.relname = e.table_name
                        and a.attname = 'id' and a.attnum > 0 and not a.attisdropped
                        and a.atttypid <> 'uuid'::regtype)
   order by e.label;
end
$function$
;
