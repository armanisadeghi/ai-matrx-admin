-- based-on: ops.perf_door_sql(jsonb) 0ee5ac0c5d2776861d54ab19dea1e04a488d867c7b49eacab055cac6d3edf53c
--
-- CLOSE-PERF (CD-PERF-06): the member table-read watches for custom.record_aggregate (member, member@large,
-- admin, large, stress, stress@large) had read "probe_broken: the door function does not exist (42883)" since
-- 2026-10-19, when record_aggregate gained p_split_multi boolean (default false). Each watch pins the door by
-- its full argument list (perf_subject.argtypes), so ANY added argument breaks the watch although the call the
-- watch makes (named arguments only) is still valid. Nobody measured the member chart door for two days.
-- Class fix: when the pinned argument list no longer names a function, the watch follows the door by its name
-- when exactly ONE function of that name exists. The call stays named-notation, so a renamed or removed
-- argument still breaks the watch by name (unchanged), and a retired door (no function of that name) or an
-- overloaded one (two or more) still reads probe_broken.
-- Inverse: migrations/inverse/closeperf_a_a_a_door_probe_follows_its_door_when_an_argument_is_added_down.sql
-- Test: scripts/campaign-tests/closeperf_a_door_probe_follows_its_door.sql (RED before, GREEN after).
create or replace function ops.perf_door_sql(p_subject jsonb)
 returns text
 language plpgsql
 stable
 set search_path to 'pg_catalog'
as $function$
declare
  v_fn regprocedure;
  v_names text[];
  v_types oid[];
  v_args jsonb := coalesce(p_subject->'args', '{}'::jsonb);
  k text;
  v_pos int;
  v_type text;
  v_parts text[] := '{}';
begin
  v_fn := to_regprocedure(format('%I.%I(%s)', p_subject->>'schema', p_subject->>'function', coalesce(p_subject->>'argtypes', '')));
  if v_fn is null then
    -- CLOSE-PERF: the pinned argument list is stale (an argument was added). Follow the door by its name
    -- when exactly one function carries it; the named-notation call below stays the judge of every argument.
    select min(p.oid)::regprocedure into v_fn
      from pg_proc p
     where p.pronamespace = to_regnamespace(p_subject->>'schema')
       and p.proname = p_subject->>'function'
    having count(*) = 1;
  end if;
  if v_fn is null then
    return null;
  end if;
  -- 1-based on both sides (an oidvector cast to oid[] keeps its 0 lower bound).
  select p.proargnames,
         (select array_agg(t order by o) from unnest(p.proargtypes) with ordinality u(t, o))
    into v_names, v_types from pg_proc p where p.oid = v_fn;
  for k in select jsonb_object_keys(v_args) loop
    v_pos := array_position(v_names, k);
    if v_pos is null then
      -- WAVE 2: a door whose argument was renamed must break THAT door (probe_broken, named),
      -- never the whole probe run — raising here escaped the probe's per-door handling and failed
      -- the 17:00 run of 2026-10-08 (custom.data_home lost p_include_app_tables). The returned SQL
      -- fails inside the probe's warm-up with 42883 naming the missing argument.
      return format('select %L::regproc::oid::bigint', 'perf_door_has_no_argument__' || k);
    end if;
    v_type := format_type(v_types[v_pos], null);
    v_parts := v_parts || case
      when v_type = 'jsonb' then format('%I => nullif($1->%L, ''null''::jsonb)', k, k)
      when v_type = 'json' then format('%I => nullif($1->%L, ''null''::jsonb)::json', k, k)
      when v_type like '%[]' then format('%I => (case when jsonb_typeof($1->%L) = ''array'' then array(select jsonb_array_elements_text($1->%L)) end)::%s', k, k, k, v_type)
      else format('%I => ($1->>%L)::%s', k, k, v_type) end;
  end loop;
  -- WAVE 2: bytes = length of the result as JSON text (what PostgREST would send): a scalar
  -- door's value, or the sum of a set's rows. Serialising also forces the whole result to be built.
  return format('select coalesce(sum(octet_length(case when x.j ? %L and (select count(*) from jsonb_object_keys(x.j)) = 1 '
                'then (x.j -> %L)::text else x.j::text end)), 0)::bigint from (select to_jsonb(t) j from %I.%I(%s) t) x',
                p_subject->>'function', p_subject->>'function',
                p_subject->>'schema', p_subject->>'function', array_to_string(v_parts, ', '));
end;
$function$;
