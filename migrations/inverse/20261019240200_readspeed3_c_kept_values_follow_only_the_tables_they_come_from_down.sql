-- target: branch,production
-- lane: READ-SPEED-3
-- Inverse of migrations/campaign/20261019240200_readspeed3_c_kept_values_follow_only_the_tables_they_come_from.sql: every Table joined by any relation, as READ-SPEED-3 a left it.
CREATE OR REPLACE FUNCTION custom._computed_component(p_org uuid, p_table uuid)
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_mk  text := 'custom.computed_component:' || p_org::text || ':' || p_table::text;
  v_raw text := platform.memo_k_get(v_mk);
  v     uuid[];
begin
  if v_raw is not null then
    return v_raw::uuid[];
  end if;
  with recursive e as (
    select f.data ->> 'entity_definition_id' as a, t.t as b
      from custom.record f
      cross join lateral (
        select f.data ->> 'relation_target' as t
        union
        select jsonb_array_elements_text(case when jsonb_typeof(f.data -> 'config' -> 'target_tables') = 'array'
                                              then f.data -> 'config' -> 'target_tables' else '[]'::jsonb end)) t
     where f.organization_id = p_org
       and f.table_id = custom.field_kernel_id()
       and f.deleted_at is null
       and f.data ->> 'type' = 'relation'
       and t.t ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       and (f.data ->> 'entity_definition_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  u as (select a, b from e union select b, a from e),
  c(t) as (select p_table::text union select u.b from c join u on u.a = c.t)
  select array_agg(c.t::uuid order by c.t) into v from c;
  perform platform.memo_k_put(v_mk, v::text);
  return v;
end;
$function$;
