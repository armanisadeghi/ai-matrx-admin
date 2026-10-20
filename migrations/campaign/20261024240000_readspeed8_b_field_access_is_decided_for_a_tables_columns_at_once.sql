-- chair-step: replaces iam.visible_field_ids and custom._computed_reader_judge in place (the same columns, the same judgement, decided for a Table's columns in one statement); additive functions, nothing dropped
-- additive: yes
-- guard: custom/system_enabled
-- lane: READ-SPEED-8
-- lock: custom,iam
-- allows: revoke custom
-- based-on: iam.visible_field_ids(uuid, uuid, uuid, permission_level, text) fbb10f34a05d7098b3c59e5e64e82fe0abf18b5e72292f4090eec24c3e906143
-- based-on: custom._computed_reader_judge(uuid, uuid, uuid) ba529d1fd2962189ae56902a3c2a1ddfd14949d47b2d0d4a0426f1ee8fb6a1dc
--
-- READ-SPEED-8 b — FIELD ACCESS IS DECIDED FOR A TABLE'S COLUMNS AT ONCE.
-- Before: the column mask (iam.visible_field_ids, under custom._read_mask_compute) and the reader judgement
-- (custom._computed_reader_judge) asked iam.may_touch_field one column at a time, and each worked-out formula walked its
-- inputs with custom.field_input_closure -> custom.field_inputs_of, one call per column and per input. Each call is
-- re-planned (a custom plan over the partitioned custom.record), so a cold mask cost 150-440 ms per level and a cold
-- judgement 545-850 ms, nearly all of it planning (field_inputs_of: 34 calls, 401 ms; field_input_closure: 18 calls,
-- 289 ms self, measured live).
-- Now custom._may_touch_fields answers the same question for a SET of columns in one statement:
--   * custom.field_input_closure_many works out every column's inputs, inputs of inputs, twelve levels, a column never
--     its own input — custom.field_input_closure's walk, for all of them at once;
--   * custom._field_inputs_step is custom.field_inputs_of's four branches (by id, by key, through the link, on the far
--     side), LANGUAGE sql so the planner inlines it into that one walk;
--   * each column and each distinct live input is asked iam.may_touch_field_itself once, at the same level, for
--     'read' on inputs — a NULL answer counts as allowed, as `if not ... then return false` treats it.
-- iam.may_touch_field itself is unchanged; guard readspeed8_b holds the set answer equal to it, column by column.
-- Guard: scripts/campaign-tests/readspeed8_b_field_access_set_answer_equals_one_by_one.sql
-- Inverse: migrations/inverse/20261024240000_readspeed8_b_field_access_is_decided_for_a_tables_columns_at_once_down.sql

-- READ-SPEED-8 b: field access decided for a SET of columns in one statement.
create or replace function custom._field_inputs_step(p_organization_id uuid, p_field_data jsonb)
returns table(input_id uuid, retired boolean)
language sql stable
as $f$
  -- the columns ONE column reads directly: custom.field_inputs_of, the same four branches, only (id, retired).
  -- LANGUAGE sql with no SET clause so the planner inlines it into custom.field_input_closure_many.
  with me as (
    select p_field_data as d, p_field_data ->> 'entity_definition_id' as tbl
     where coalesce(p_field_data ->> 'type', '') = 'formula'
       and coalesce(p_field_data -> 'config', '{}'::jsonb) ?| array['expr', 'pick', 'agg']),
  expr as (
    select case when jsonb_typeof(me.d -> 'config' -> 'expr') in ('object', 'array')
                then me.d -> 'config' -> 'expr' else 'null'::jsonb end as e, me.tbl
      from me),
  refs as (
    select v #>> '{}' as ref, expr.tbl
      from expr, jsonb_path_query(expr.e, 'strict $.**.field') v
     where jsonb_typeof(v) = 'string'
    union
    select v #>> '{}', expr.tbl
      from expr, jsonb_path_query(expr.e, 'strict $.**.parent_field') v
     where jsonb_typeof(v) = 'string'),
  via as (
    select f.id, f.data, f.deleted_at
      from me
      join custom.record f
        on f.organization_id = p_organization_id
       and f.table_id = '11111111-0000-4000-8000-000000000002'::uuid
       and f.data_class <> 'kernel'
       and f.data ->> 'entity_definition_id' = me.tbl
       and f.data ->> 'key' = me.d -> 'config' ->> 'via'
     where me.d -> 'config' ?| array['pick', 'agg'])
  select f.id, f.deleted_at is not null
    from refs r
    join custom.record f
      on f.organization_id = p_organization_id
     and f.id = case when r.ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then r.ref::uuid end
     and f.table_id = '11111111-0000-4000-8000-000000000002'::uuid
     and f.data_class <> 'kernel'
  union
  select f.id, f.deleted_at is not null
    from refs r
    join custom.record f
      on f.organization_id = p_organization_id
     and f.table_id = '11111111-0000-4000-8000-000000000002'::uuid
     and f.data_class <> 'kernel'
     and f.data ->> 'entity_definition_id' = r.tbl
     and f.data ->> 'key' = r.ref
   where r.ref !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  union
  select v.id, v.deleted_at is not null from via v
  union
  select far.id, far.deleted_at is not null
    from me
    join via v on true
    join custom.record far
      on far.organization_id = p_organization_id
     and far.table_id = '11111111-0000-4000-8000-000000000002'::uuid
     and far.data_class <> 'kernel'
     and far.data ->> 'entity_definition_id' = v.data ->> 'relation_target'
     and far.data ->> 'key' = coalesce(me.d -> 'config' ->> 'pick', me.d -> 'config' ->> 'of')
$f$;
revoke all on function custom._field_inputs_step(uuid, jsonb) from public, anon, authenticated;

create or replace function custom.field_input_closure_many(p_organization_id uuid, p_ids uuid[])
returns table(root_id uuid, input_id uuid, retired boolean, depth integer)
language plpgsql stable security definer
set search_path to 'pg_catalog'
as $f$
#variable_conflict use_column
begin
  -- custom.field_input_closure for every live column in p_ids at once (inputs of inputs, twelve levels, a column never
  -- its own input), in ONE statement: planned once, instead of once per column and once per input.
  return query
  with recursive seed as (
    select f.id, f.data
      from custom.record f
     where f.organization_id = p_organization_id
       and f.table_id = '11111111-0000-4000-8000-000000000002'::uuid
       and f.id = any (p_ids)
       and f.deleted_at is null
       and coalesce(f.data ->> 'type', '') = 'formula'
       and coalesce(f.data -> 'config', '{}'::jsonb) ?| array['expr', 'pick', 'agg']),
  c(root_id, input_id, retired, depth, path) as (
    select s.id, i.input_id, i.retired, 1, array[s.id, i.input_id]
      from seed s
      cross join lateral custom._field_inputs_step(p_organization_id, s.data) i
     where i.input_id is distinct from s.id
    union all
    select c.root_id, j.input_id, j.retired, c.depth + 1, c.path || j.input_id
      from c
      join custom.record f
        on f.organization_id = p_organization_id
       and f.id = c.input_id
       and f.table_id = '11111111-0000-4000-8000-000000000002'::uuid
      cross join lateral custom._field_inputs_step(p_organization_id, f.data) j
     where c.depth < 12
       and not (j.input_id = any (c.path)))
  select distinct on (c.root_id, c.input_id) c.root_id, c.input_id, c.retired, c.depth
    from c
   order by c.root_id, c.input_id, c.depth;
end
$f$;
revoke all on function custom.field_input_closure_many(uuid, uuid[]) from public, anon, authenticated;

create or replace function custom._may_touch_fields(p_user_id uuid, p_organization_id uuid, p_field_ids uuid[],
                                                p_level_on_record public.permission_level, p_action text default 'read')
returns table(field_id uuid, ok boolean)
language plpgsql stable security definer
set search_path to ''
as $f$
#variable_conflict use_column
begin
  -- iam.may_touch_field for a SET of columns, the same answer for each: the column itself (its part, its share, the
  -- portal), and — for a worked-out formula — every live column it reads, inputs of inputs, at the same level for
  -- 'read'. A NULL from the per-column check counts as allowed, exactly as `if not … then return false` treats it.
  return query
  with ids as (select distinct x.id from unnest(p_field_ids) x(id)),
  cl as materialized (
    select c.root_id, c.input_id
      from custom.field_input_closure_many(p_organization_id, array(select ids.id from ids where ids.id is not null)) c
     where not c.retired),
  ins as materialized (
    select d.input_id,
           coalesce(iam.may_touch_field_itself(p_user_id, d.input_id, p_organization_id, p_level_on_record, 'read'), true) as ok
      from (select distinct cl.input_id from cl) d)
  select ids.id,
         coalesce(iam.may_touch_field_itself(p_user_id, ids.id, p_organization_id, p_level_on_record, p_action), true)
         and not exists (select 1 from cl join ins on ins.input_id = cl.input_id where cl.root_id = ids.id and not ins.ok)
    from ids;
end
$f$;
revoke all on function custom._may_touch_fields(uuid, uuid, uuid[], public.permission_level, text) from public, anon, authenticated;

INSERT INTO platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
SELECT d.* FROM (VALUES
  ('custom', 'field_input_closure_many', 'p_organization_id uuid, p_ids uuid[]', ARRAY['uuid'::regtype, 'uuid[]'::regtype]::oid[],
   'Lists, for each named column of one organization, every column its value is worked out from (inputs of inputs). Not a door: it makes no access decision and hands no record value; NULL ids are ignored.',
   'migrations/campaign/20261024240000_readspeed8_b_field_access_is_decided_for_a_tables_columns_at_once.sql (READ-SPEED-8)',
   'server_only: no client grant. Reached only from custom._may_touch_fields, which iam.visible_field_ids and custom._computed_reader_judge call inside their own access decision.',
   false, false),
  ('custom', '_may_touch_fields', 'p_user_id uuid, p_organization_id uuid, p_field_ids uuid[], p_level_on_record permission_level, p_action text', ARRAY['uuid'::regtype, 'uuid'::regtype, 'uuid[]'::regtype, 'public.permission_level'::regtype, 'text'::regtype]::oid[],
   'iam.may_touch_field for a set of columns: p_user_id is the person asked about, each p_field_ids column is checked by iam.may_touch_field_itself and so is every live column it reads; a NULL id answers allowed, as iam.may_touch_field does.',
   'migrations/campaign/20261024240000_readspeed8_b_field_access_is_decided_for_a_tables_columns_at_once.sql (READ-SPEED-8)',
   'server_only: no client grant. Reached only from iam.visible_field_ids and custom._computed_reader_judge, inside the read door and the refresh door.',
   false, false)
) AS d(schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
WHERE NOT EXISTS (SELECT 1 FROM platform.client_callable_door c WHERE c.schema_name = d.schema_name AND c.function_name = d.function_name AND c.identity_argtypes = d.identity_argtypes);

CREATE OR REPLACE FUNCTION iam.visible_field_ids(p_user_id uuid, p_organization_id uuid, p_table_id uuid, p_level_on_record permission_level, p_action text DEFAULT 'read'::text)
 RETURNS TABLE(field_id uuid, field_key text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  v_ok uuid[];
begin
  -- READ-SPEED-8 b: the same columns as asking iam.may_touch_field of each, decided for the whole Table in one
  -- statement (custom._may_touch_fields) instead of one closure walk per worked-out column.
  select coalesce(array_agg(m.field_id) filter (where m.ok), '{}'::uuid[]) into v_ok
    from custom._may_touch_fields(p_user_id, p_organization_id,
           array(select f.id from custom.record f
                  where f.organization_id = p_organization_id
                    and f.table_id = custom.field_kernel_id()
                    and f.deleted_at is null
                    and (f.data ->> 'entity_definition_id')::uuid = p_table_id),
           p_level_on_record, p_action) m;
  return query
  select f.id, f.data ->> 'key'
    from custom.record f
   where f.organization_id = p_organization_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null
     and (f.data ->> 'entity_definition_id')::uuid = p_table_id
     and f.id = any (v_ok);
end
$function$;

CREATE OR REPLACE FUNCTION custom._computed_reader_judge(p_me uuid, p_org uuid, p_table uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_comp  uuid[] := custom._computed_component(p_org, p_table);
  v_t     uuid;
  v_all   boolean;
  v_level public.permission_level;
  c       record;
begin
  foreach v_t in array v_comp loop
    select s.o_all_visible into v_all from custom.visible_set(p_me, p_org, v_t, 'viewer'::public.permission_level) s;
    if not coalesce(v_all, false) then
      return false;
    end if;
  end loop;
  -- READ-SPEED-8 b: the same columns, asked per Table as one set (custom._may_touch_fields) at that Table's level
  for c in
    with f as (
      select f.id, f.data, (f.data ->> 'entity_definition_id')::uuid tid
        from custom.record f
       where f.organization_id = p_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
         and (f.data ->> 'entity_definition_id')::uuid = any (v_comp)),
    k as (
      select f.data -> 'config' ->> 'of' k from f where custom.parity_type(f.data) in ('rollup', 'lookup')
      union select f.data -> 'config' ->> 'via' from f where custom.parity_type(f.data) in ('rollup', 'lookup')
      union select jsonb_object_keys(case when jsonb_typeof(f.data -> 'config' -> 'filter') = 'object'
                                          then f.data -> 'config' -> 'filter' else '{}'::jsonb end)
              from f where custom.parity_type(f.data) in ('rollup', 'lookup')
      union select jsonb_array_elements_text(case when jsonb_typeof(f.data -> 'depends_on') = 'array'
                                                  then f.data -> 'depends_on' else '[]'::jsonb end) from f),
    ids as (
      select (x #>> '{}') id from f cross join lateral jsonb_path_query(coalesce(f.data -> 'config' -> 'expr', 'null'::jsonb), 'strict $.**.field') x
       where custom.parity_type(f.data) = 'formula' and jsonb_typeof(x) = 'string')
    select f.tid, array_agg(f.id) ids from f
     where f.data ->> 'key' in (select k from k where k is not null)
        or f.id::text in (select id from ids)
        or custom.parity_type(f.data) in ('rollup', 'lookup', 'formula')
     group by f.tid
     order by f.tid
  loop
    v_level := custom.effective_level(p_me, p_org, c.tid);
    if exists (select 1 from custom._may_touch_fields(p_me, p_org, c.ids, v_level, 'read') m where not m.ok) then
      return false;
    end if;
  end loop;
  return true;
end;
$function$;
