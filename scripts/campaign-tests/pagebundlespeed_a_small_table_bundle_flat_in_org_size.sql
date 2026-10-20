-- PAGE-BUNDLE-SPEED — A SMALL TABLE'S PAGE BUNDLE COSTS THE SAME WHETHER ITS ORGANIZATION HOLDS 20 TABLES OR 1,000.
--
-- On 2026-10-20 custom.table_page_bundle for an 18-row table read 17,472 buffers in the near-empty Template sweep
-- organization and 38,391 once it held 1,000 more tables, 15,000 Fields and 20,000 rows: custom.visible_set and
-- custom.query_visible_ids filtered `table_id is not distinct from` (never an index condition), custom.reverse_columns
-- read every relation Field, custom.entity_reference_fields keyed nothing an index holds.
--
-- This suite, inside one rolled-back transaction, in the Template sweep (test) organization, as admin@admin.com:
--   1. declares an 18-row probe table and a seed table;
--   2. reads custom.table_page_bundle(probe) 5 times, one statement per read, timed and under EXPLAIN BUFFERS (BEFORE);
--   3. seeds 1,000 tables, ~15,000 Fields and 20,000 rows into the same organization (triggers off for the seed only);
--   4. reads it 5 times again (AFTER).
-- RED when the median buffers grow by more than max(3,000, 30%), or the bundle's shape changes or carries an error.
-- Old bodies: RED (17,472 -> 38,391). New bodies (pagebundlespeed_b_a): GREEN.
--
-- Main database, read-only in effect: every write is rolled back.

\set ON_ERROR_STOP on
\timing off
\set suite 'pagebundlespeed_a_small_table_bundle_flat_in_org_size.sql'
\set requires 'function:custom.table_page_bundle'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '120s';
set local lock_timeout = '10s';

create function pg_temp.pb_read(p_phase text) returns void language plpgsql as $f$
declare
  v_org uuid := current_setting('pb.org')::uuid; v_probe uuid := current_setting('pb.probe')::uuid;
  v0 timestamptz; v_b jsonb; v_ms numeric; v_errs text; v_plan json; v_blk bigint;
begin
  perform set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated","email":"admin@admin.com"}', true);
  perform set_config('role', 'authenticated', true);
  v0 := clock_timestamp();
  v_b := custom.table_page_bundle(v_org, v_probe);
  v_ms := extract(epoch from clock_timestamp() - v0) * 1000;
  -- the same read once more under EXPLAIN: the buffers it touches do not depend on how busy the database is
  execute format('explain (analyze, buffers, format json) select custom.table_page_bundle(%L, %L)', v_org, v_probe) into v_plan;
  v_blk := coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Hit Blocks')::bigint, 0) + coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Read Blocks')::bigint, 0);
  perform set_config('role', 'postgres', true);
  select string_agg(p ->> 'door', ',' order by p ->> 'door') into v_errs from jsonb_array_elements(v_b -> 'parts') p where p ? 'error';
  perform set_config('pb.' || p_phase, coalesce(nullif(current_setting('pb.' || p_phase, true), '') || ',', '') || round(v_ms, 1), true);
  perform set_config('pb.' || p_phase || '_blk', coalesce(nullif(current_setting('pb.' || p_phase || '_blk', true), '') || ',', '') || v_blk, true);
  perform set_config('pb.' || p_phase || '_shape', jsonb_array_length(v_b -> 'parts') || ':' || coalesce(v_errs, ''), true);
end
$f$;

do $t$
declare
  c_org   constant uuid := '9c54ebd0-49c0-4ff0-8a51-1cd2c6b8562d';   -- Template sweep (test)
  c_admin constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated","email":"admin@admin.com"}';
  v_home uuid; v_spec jsonb; v_probe uuid; v_seed uuid;
begin
  perform set_config('role', 'postgres', true);
  select (t.data ->> 'parent_id')::uuid into v_home from custom.record t
   where t.organization_id = c_org and t.table_id = custom.table_kernel_id() and t.deleted_at is null
     and t.data ? 'parent_id' limit 1;
  if v_home is null then
    raise exception 'RED — the Template sweep (test) organization % has no table with a home; the fixture org is gone', c_org;
  end if;
  v_spec := jsonb_build_object('name', 'PB probe', 'slug', 'pb_probe', 'type', 'entity', 'weight', 'light',
    'display', 'list', 'ordered', false, 'parent_id', v_home, 'row_order', 'sorted', 'title_field', 'title',
    'default_sort', '[{"field":"title","direction":"asc"}]'::jsonb, 'label_plural', 'PB probes',
    'label_singular', 'PB probe', 'agent_writable', true, 'retention_days', 30,
    'fields', '[{"name":"title"},{"name":"room"},{"name":"status"},{"name":"price"},{"name":"bought_on"},{"name":"notes"}]'::jsonb);
  perform set_config('request.jwt.claims', c_admin, true);
  perform set_config('role', 'authenticated', true);
  v_probe := custom.table_declare(c_org, v_spec);
  v_seed  := custom.table_declare(c_org, v_spec || '{"name":"PB seed","slug":"pb_seed"}'::jsonb);
  perform set_config('role', 'postgres', true);
  insert into custom.record (organization_id, table_id, data_class, data)
  select c_org, v_probe, 'record', jsonb_build_object('title', 'Item ' || g, 'notes', 'Note ' || g)
    from generate_series(1, 18) g;
  perform set_config('pb.org', c_org::text, true);
  perform set_config('pb.probe', v_probe::text, true);
  perform set_config('pb.seed', v_seed::text, true);
  perform set_config('pb.home', v_home::text, true);
end
$t$;

set local mx.kernel_batch = 'on_written';

select pg_temp.pb_read('warm');
select pg_temp.pb_read('before');
select pg_temp.pb_read('before');
select pg_temp.pb_read('before');
select pg_temp.pb_read('before');
select pg_temp.pb_read('before');

-- SEED: the organization grows ~50x in tables, Fields and rows elsewhere; the probe table does not change
reset role;
set local session_replication_role = replica;
insert into custom.record (organization_id, table_id, data_class, data)
select t.organization_id, t.table_id, t.data_class, t.data || jsonb_build_object('name', 'PB seed ' || g, 'slug', 'pb_seed_' || g)
  from custom.record t cross join generate_series(1, 1000) g
 where t.organization_id = current_setting('pb.org')::uuid and t.id = current_setting('pb.seed')::uuid;
insert into custom.record (organization_id, table_id, data_class, data)
select f.organization_id, f.table_id, f.data_class, f.data
  from custom.record f cross join generate_series(1, 15000 / 6 + 1) g
 where f.organization_id = current_setting('pb.org')::uuid and f.table_id = custom.field_kernel_id()
   and f.data ->> 'entity_definition_id' = current_setting('pb.seed');
insert into custom.record (organization_id, table_id, data_class, data)
select current_setting('pb.org')::uuid, current_setting('pb.seed')::uuid, 'record', jsonb_build_object('title', 'Seed ' || g)
  from generate_series(1, 20000) g;
set local session_replication_role = origin;

select pg_temp.pb_read('warm');
select pg_temp.pb_read('after');
select pg_temp.pb_read('after');
select pg_temp.pb_read('after');
select pg_temp.pb_read('after');
select pg_temp.pb_read('after');

do $t$
declare
  v_org uuid := current_setting('pb.org')::uuid;
  v_before numeric; v_after numeric; v_bb numeric; v_ba numeric; v_tables integer; v_fields integer; v_fail text[] := '{}';
begin
  select percentile_cont(0.5) within group (order by x::numeric) into v_bb from unnest(string_to_array(current_setting('pb.before_blk'), ',')) x;
  select percentile_cont(0.5) within group (order by x::numeric) into v_ba from unnest(string_to_array(current_setting('pb.after_blk'), ',')) x;
  select percentile_cont(0.5) within group (order by x::numeric) into v_before from unnest(string_to_array(current_setting('pb.before'), ',')) x;
  select percentile_cont(0.5) within group (order by x::numeric) into v_after  from unnest(string_to_array(current_setting('pb.after'), ',')) x;
  select count(*) filter (where table_id = custom.table_kernel_id()), count(*) filter (where table_id = custom.field_kernel_id())
    into v_tables, v_fields from custom.record where organization_id = v_org;
  raise notice 'probe bundle: before % ms [%], % buffers; after the org grew to % tables / % fields: % ms [%], % buffers',
    round(v_before), current_setting('pb.before'), v_bb, v_tables, v_fields, round(v_after), current_setting('pb.after'), v_ba;
  if current_setting('pb.after_shape') <> current_setting('pb.before_shape') or split_part(current_setting('pb.after_shape'), ':', 2) <> '' then
    v_fail := v_fail || format('the bundle shape changed or carries errors (%s then %s)', current_setting('pb.before_shape'), current_setting('pb.after_shape'));
  end if;
  -- the bar is on buffers (load-independent); the milliseconds are printed for the record
  if v_ba - v_bb > greatest(3000, v_bb * 0.3) then
    v_fail := v_fail || format('the bundle grew from %s to %s buffers when the organization grew (bar: +max(3,000, 30%%))', v_bb, v_ba);
  end if;
  if cardinality(v_fail) > 0 then
    raise exception 'RED — %', array_to_string(v_fail, '; ');
  end if;
  raise notice 'GREEN — a small table''s page bundle stays flat while the organization grows ~50x';
end
$t$;

rollback;
