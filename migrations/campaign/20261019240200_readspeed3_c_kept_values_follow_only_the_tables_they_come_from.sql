-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: READ-SPEED-3
-- lock: custom
-- based-on: custom._computed_component(uuid, uuid) b71f6693301cbfcaa3a73472e81bf3cccc456f6ff3dc453c5058dc8cc3e7c5b1
--
-- READ-SPEED-3 c — KEPT VALUES FOLLOW ONLY THE TABLES THEY COME FROM. custom._computed_component answered every Table
-- joined by any relation (75 Tables in one organization), so the reader check (custom._computed_reader_ok: all rows
-- and all columns visible on each) failed on an unrelated confidential Table and cost ~140 ms per Table. It now
-- answers the Table, the Tables its roll-ups and lookups read through, and on through theirs (Customers: 3).
-- Proof: same-load A/B as admin, kept vs read-time pages identical on Customers/Jobs/Donors/Campaigns.
-- Inverse: migrations/inverse/20261019240200_readspeed3_c_kept_values_follow_only_the_tables_they_come_from_down.sql

CREATE OR REPLACE FUNCTION custom._computed_component(p_org uuid, p_table uuid)
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  -- READ-SPEED-3 c: THE TABLES THIS TABLE'S WORKED-OUT VALUES COME FROM — itself, and every Table a roll-up or lookup
  -- reads through (a forward relation's targets, or the linking Table of a back-link), and on through those Tables'
  -- own roll-ups and lookups. (Was every Table joined by any relation: 75 Tables in one organization.)
  v_mk   text := 'custom.computed_deps:' || p_org::text || ':' || p_table::text;
  v_raw  text := platform.memo_k_get(v_mk);
  v_all  uuid[] := array[p_table];
  v_todo uuid[] := array[p_table];
  v_t    uuid;
  v_via  text;
  v_far  uuid[];
begin
  if v_raw is not null then
    return v_raw::uuid[];
  end if;
  while cardinality(v_todo) > 0 and cardinality(v_all) < 200 loop
    v_t := v_todo[1];
    v_todo := v_todo[2:];
    for v_via in
      select distinct f.data -> 'config' ->> 'via' from custom.record f
       where f.organization_id = p_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
         and f.data ->> 'entity_definition_id' = v_t::text
         and custom.parity_type(f.data) in ('lookup', 'rollup')
         and nullif(f.data -> 'config' ->> 'via', '') is not null
    loop
      select coalesce(array_agg(distinct x::uuid), '{}') into v_far from (
        select r.data ->> 'relation_target' x from custom.record r
         where r.organization_id = p_org and r.table_id = custom.field_kernel_id() and r.deleted_at is null
           and r.data ->> 'entity_definition_id' = v_t::text and r.data ->> 'key' = v_via
        union
        select jsonb_array_elements_text(case when jsonb_typeof(r.data -> 'config' -> 'target_tables') = 'array'
                                              then r.data -> 'config' -> 'target_tables' else '[]'::jsonb end)
          from custom.record r
         where r.organization_id = p_org and r.table_id = custom.field_kernel_id() and r.deleted_at is null
           and r.data ->> 'entity_definition_id' = v_t::text and r.data ->> 'key' = v_via
        union
        select custom._back_link_relation(p_org, v_t, v_via) ->> 'relation_target') s
       where x ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
      v_todo := v_todo || array(select u from unnest(v_far) u where not (u = any (v_all)));
      v_all := v_all || array(select u from unnest(v_far) u where not (u = any (v_all)));
    end loop;
  end loop;
  select array_agg(u order by u) into v_all from (select distinct unnest(v_all) u) d;
  perform platform.memo_k_put(v_mk, v_all::text);
  return v_all;
end;
$function$;
