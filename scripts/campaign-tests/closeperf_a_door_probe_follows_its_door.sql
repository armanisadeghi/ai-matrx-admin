-- CLOSE-PERF (CD-PERF-06): a door watch whose pinned argument list went stale because the door GAINED an
-- argument still measures the door; a retired door and a renamed argument still read broken.
-- RED before closeperf_a_a_a_door_probe_follows_its_door_when_an_argument_is_added.sql (the stale
-- record_aggregate subject answers null = "the door function does not exist"), GREEN after.
\set ON_ERROR_STOP on
\set suite 'closeperf_a_door_probe_follows_its_door.sql'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif
begin;
set local statement_timeout = '30s';
do $$
declare
  v_stale jsonb := jsonb_build_object('schema', 'custom', 'function', 'record_aggregate',
    'argtypes', 'uuid, uuid, jsonb, jsonb, jsonb, jsonb, integer, text, jsonb, text, text',
    'args', jsonb_build_object('p_organization_id', gen_random_uuid(), 'p_table_id', gen_random_uuid()));
  v_sql text;
begin
  -- 1. stale pin, one function of that name: the watch follows it (RED before the fix: null).
  v_sql := ops.perf_door_sql(v_stale);
  if v_sql is null or v_sql not like '%from custom.record_aggregate(p\_%' then
    raise exception 'FAIL 1: a door that gained an argument reads "does not exist" (got %)', coalesce(v_sql, 'null');
  end if;
  raise notice 'PASS 1: stale pin follows the one record_aggregate';
  -- 2. a retired door (no function of that name) still answers null = probe_broken.
  if ops.perf_door_sql(jsonb_build_object('schema', 'custom', 'function', 'closeperf_no_such_door', 'argtypes', 'text')) is not null then
    raise exception 'FAIL 2: a retired door was measured';
  end if;
  raise notice 'PASS 2: retired door stays broken';
  -- 3. a renamed argument still breaks THAT door by name.
  v_sql := ops.perf_door_sql(v_stale || jsonb_build_object('args', jsonb_build_object('p_no_such_arg', 1)));
  if v_sql is null or v_sql not like '%perf_door_has_no_argument__p_no_such_arg%' then
    raise exception 'FAIL 3: a missing argument was not named (got %)', coalesce(v_sql, 'null');
  end if;
  raise notice 'PASS 3: missing argument named';
  -- 4. an exact pin is unchanged.
  if ops.perf_door_sql(jsonb_build_object('schema', 'ops', 'function', 'perf_door_sql', 'argtypes', 'jsonb', 'args', '{}'::jsonb)) is null then
    raise exception 'FAIL 4: an exact pin stopped resolving';
  end if;
  raise notice 'PASS 4: exact pin unchanged';
end $$;
rollback;
