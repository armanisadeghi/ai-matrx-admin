-- AT-FIX-G4 — A TABLE'S BACK-LINK COLUMNS COST THE SAME WHETHER ITS ORGANIZATION HOLDS 20 TABLES OR 1,000.
--
-- On 2026-10-19 custom.reverse_columns took 5.7 s (first call) for a member in the test admin's organization (880
-- tables) and the table page bundle hit the REST timeout. EXPLAIN (ANALYZE, BUFFERS) as the member: the planner walked
-- every table of the organization and ran _may_know_table + may_see_table_structure on each (8.1 s inside the
-- statement) before looking for the 2 relation Fields that point at the table.
--
-- This suite, inside one rolled-back transaction, in the near-empty Template sweep (test) organization, as the
-- authenticated admin@admin.com:
--   1. declares table A and table B, and makes B's title a relation Field that points at A (A has one back-link column);
--   2. reads custom.reverse_columns(A) 5 times, one statement per read (median = BEFORE);
--   3. seeds 1,000 more tables and their Fields into the same organization (triggers off for the seed only);
--   4. reads it 5 times again (median = AFTER).
-- RED when AFTER - BEFORE > max(100 ms, 100% of BEFORE), or the answer is not exactly the one back-link column both times.
-- Old body (access checks on every table): RED. New body (access checks on the linking tables only): GREEN.
--
-- Main database, read-only in effect: every write is rolled back.

\set ON_ERROR_STOP on
\timing off
\set suite 'atfixg4_reverse_columns_flat_in_org_size.sql'
\set requires 'function:custom.reverse_columns'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '50s';
set local lock_timeout = '10s';

create function pg_temp.g4_read(p_phase text) returns void language plpgsql as $f$
declare
  v_org uuid := current_setting('g4.org')::uuid; v_a uuid := current_setting('g4.a')::uuid;
  v0 timestamptz; v_n integer; v_key text; v_ms numeric;
begin
  perform set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated","email":"admin@admin.com"}', true);
  perform set_config('role', 'authenticated', true);
  v0 := clock_timestamp();
  select count(*), min(source_table_name) into v_n, v_key from custom.reverse_columns(v_org, v_a);
  v_ms := extract(epoch from clock_timestamp() - v0) * 1000;
  perform set_config('role', 'postgres', true);
  perform set_config('g4.' || p_phase, coalesce(nullif(current_setting('g4.' || p_phase, true), '') || ',', '') || round(v_ms, 1), true);
  perform set_config('g4.' || p_phase || '_answer', v_n || ':' || coalesce(v_key, ''), true);
end
$f$;

do $t$
declare
  c_org   constant uuid := '9c54ebd0-49c0-4ff0-8a51-1cd2c6b8562d';   -- Template sweep (test)
  c_admin constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated","email":"admin@admin.com"}';
  v_home uuid; v_spec jsonb; v_a uuid; v_b uuid; v_seed uuid;
begin
  perform set_config('role', 'postgres', true);
  select (t.data ->> 'parent_id')::uuid into v_home from custom.record t
   where t.organization_id = c_org and t.table_id = custom.table_kernel_id() and t.deleted_at is null
     and t.data ? 'parent_id' limit 1;
  if v_home is null then
    raise exception 'RED — the Template sweep (test) organization % has no table with a home; the fixture org is gone', c_org;
  end if;
  v_spec := jsonb_build_object('name', 'G4 table A', 'slug', 'g4_a', 'type', 'entity', 'weight', 'light',
    'display', 'list', 'ordered', false, 'parent_id', v_home, 'row_order', 'sorted', 'title_field', 'title',
    'default_sort', '[{"field":"title","direction":"asc"}]'::jsonb, 'label_plural', 'G4 As',
    'label_singular', 'G4 A', 'agent_writable', true, 'retention_days', 30,
    'fields', '[{"name":"title"},{"name":"notes"}]'::jsonb);
  perform set_config('request.jwt.claims', c_admin, true);
  perform set_config('role', 'authenticated', true);
  v_a    := custom.table_declare(c_org, v_spec);
  v_b    := custom.table_declare(c_org, v_spec || '{"name":"G4 table B","slug":"g4_b"}'::jsonb);
  v_seed := custom.table_declare(c_org, v_spec || '{"name":"G4 seed","slug":"g4_seed"}'::jsonb);
  perform set_config('role', 'postgres', true);
  -- B's "notes" Field becomes a relation Field that points at A
  update custom.record f
     set data = f.data || jsonb_build_object('type', 'relation', 'relation_target', v_a::text, 'relation_max', 1, 'on_target_delete', 'set_null', 'config', '{}'::jsonb)
   where f.organization_id = c_org and f.table_id = custom.field_kernel_id()
     and f.data ->> 'entity_definition_id' = v_b::text and f.data ->> 'key' = 'notes';
  if not found then raise exception 'RED — could not make B''s notes a relation Field (fixture shape changed)'; end if;
  perform set_config('g4.org', c_org::text, true);
  perform set_config('g4.a', v_a::text, true);
  perform set_config('g4.seed', v_seed::text, true);
end
$t$;

select pg_temp.g4_read('warm');
select pg_temp.g4_read('before');
select pg_temp.g4_read('before');
select pg_temp.g4_read('before');
select pg_temp.g4_read('before');
select pg_temp.g4_read('before');

-- SEED: the organization grows ~50x in tables; table A and its one link do not change
reset role;
set local session_replication_role = replica;
insert into custom.record (organization_id, table_id, data_class, data)
select t.organization_id, t.table_id, t.data_class, t.data || jsonb_build_object('name', 'G4 seed ' || g, 'slug', 'g4_seed_' || g)
  from custom.record t cross join generate_series(1, 1000) g
 where t.organization_id = current_setting('g4.org')::uuid and t.id = current_setting('g4.seed')::uuid;
set local session_replication_role = origin;

select pg_temp.g4_read('warm');
select pg_temp.g4_read('after');
select pg_temp.g4_read('after');
select pg_temp.g4_read('after');
select pg_temp.g4_read('after');
select pg_temp.g4_read('after');

do $t$
declare
  v_org uuid := current_setting('g4.org')::uuid;
  v_before numeric; v_after numeric; v_tables integer; v_fail text[] := '{}';
begin
  select percentile_cont(0.5) within group (order by x::numeric) into v_before from unnest(string_to_array(current_setting('g4.before'), ',')) x;
  select percentile_cont(0.5) within group (order by x::numeric) into v_after  from unnest(string_to_array(current_setting('g4.after'), ',')) x;
  select count(*) into v_tables from custom.record where organization_id = v_org and table_id = custom.table_kernel_id();
  raise notice 'reverse_columns: before % ms [%]; after the org grew to % tables: % ms [%]',
    round(v_before), current_setting('g4.before'), v_tables, round(v_after), current_setting('g4.after');
  if split_part(current_setting('g4.before_answer'), ':', 1) <> '1' or current_setting('g4.after_answer') <> current_setting('g4.before_answer') then
    v_fail := v_fail || format('the answer is not the one back-link column both times (%s then %s)', current_setting('g4.before_answer'), current_setting('g4.after_answer'));
  end if;
  if v_after - v_before > greatest(100, v_before) then
    v_fail := v_fail || format('the read grew from %s ms to %s ms when the organization grew (bar: +max(100 ms, 100%%))', round(v_before), round(v_after));
  end if;
  if cardinality(v_fail) > 0 then
    raise exception 'RED — %', array_to_string(v_fail, '; ');
  end if;
  raise notice 'GREEN — the back-link read stays flat while the organization grows ~50x';
end
$t$;

rollback;
