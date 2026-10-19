-- READ-SPEED-ORG — A SMALL TABLE READS IN THE SAME TIME WHETHER ITS ORGANIZATION HOLDS 20 TABLES OR 1,000.
--
-- A page read must cost what the TABLE costs, never what the ORGANIZATION holds. On 2026-10-19 a plain 10-row
-- Reading List in the test admin's organization (868 tables, 13,210 Field records) spent ~280 ms of its ~420 ms in
-- custom.read_records_page's "which columns are worked out" question: under the generic plan the join read every
-- Field record of the organization and asked custom.parity_type of each (13,210 calls for 7 columns).
--
-- This suite, inside one rolled-back transaction, in the near-empty Template sweep (test) organization:
--   1. declares a plain 10-row probe table (the Reading List's own shape) as admin@admin.com;
--   2. reads its first page through custom.read_records_page, one statement per read, 5 times (median = BEFORE);
--   3. seeds 1,000 more tables, 15,000 more Field records and 20,000 more records into the same organization
--      (triggers off for the seed only: raw volume, the reads below run normally);
--   4. reads the same probe page 5 times again (median = AFTER).
-- The reads run as a client's do: mx.kernel_batch = 'on_written' keeps the read-only path (generic plans, statement
-- memos) although this transaction has written. Without it every read takes custom plans, and a custom plan sees the
-- 7 column keys and probes them one by one, so the org-wide join never shows (measured: flat on the old body).
-- RED when AFTER - BEFORE > max(100 ms, 50% of BEFORE), or the page is not the same 10 rows.
-- Old body (org-wide join): RED. New body (one probe per column): GREEN. Numbers: ~/lane-resume/reports/READ-SPEED-ORG.md.
--
-- Main database, read-only in effect: every write is rolled back.

\set ON_ERROR_STOP on
\timing off
\set suite 'readspeedorg_a_small_table_read_flat_in_org_size.sql'
\set requires 'function:custom.read_records_page'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '600s';
set local lock_timeout = '60s';

-- one read of the probe page as admin@admin.com, timed inside the statement; appends ms to rso.<phase>
create function pg_temp.rso_read(p_phase text) returns void language plpgsql as $f$
declare
  v_org uuid := current_setting('rso.org')::uuid; v_probe uuid := current_setting('rso.probe')::uuid;
  v0 timestamptz; v_page jsonb; v_ms numeric;
begin
  perform set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated","email":"admin@admin.com"}', true);
  perform set_config('role', 'authenticated', true);
  v0 := clock_timestamp();
  v_page := custom.read_records_page(v_org, v_probe, '{}'::jsonb, null, '[]'::jsonb, null, false, 50, 0, null);
  v_ms := extract(epoch from clock_timestamp() - v0) * 1000;
  perform set_config('role', 'postgres', true);
  perform set_config('rso.' || p_phase, coalesce(nullif(current_setting('rso.' || p_phase, true), '') || ',', '') || round(v_ms, 1), true);
  perform set_config('rso.' || p_phase || '_rows', md5((v_page -> 'rows')::text) || ':' || jsonb_array_length(v_page -> 'rows'), true);
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
  v_spec := jsonb_build_object('name', 'RSO probe', 'slug', 'rso_probe', 'type', 'entity', 'weight', 'light',
    'display', 'list', 'ordered', false, 'parent_id', v_home, 'row_order', 'sorted', 'title_field', 'title',
    'default_sort', '[{"field":"title","direction":"asc"}]'::jsonb, 'label_plural', 'RSO probes',
    'label_singular', 'RSO probe', 'agent_writable', true, 'retention_days', 30,
    'fields', '[{"name":"title"},{"name":"author"},{"name":"status"},{"name":"genre"},{"name":"rating"},{"name":"finished_on"},{"name":"notes"}]'::jsonb);
  perform set_config('request.jwt.claims', c_admin, true);
  perform set_config('role', 'authenticated', true);
  v_probe := custom.table_declare(c_org, v_spec);
  v_seed  := custom.table_declare(c_org, v_spec || '{"name":"RSO seed","slug":"rso_seed"}'::jsonb);
  perform set_config('role', 'postgres', true);
  insert into custom.record (organization_id, table_id, data_class, data)
  select c_org, v_probe, 'record', jsonb_build_object('title', 'Book ' || g, 'author', 'Author ' || g, 'notes', 'Note ' || g)
    from generate_series(1, 10) g;
  perform set_config('rso.org', c_org::text, true);
  perform set_config('rso.probe', v_probe::text, true);
  perform set_config('rso.seed', v_seed::text, true);
end
$t$;

set local mx.kernel_batch = 'on_written';

-- BEFORE: one warm-up, then five reads, each its own statement (its own statement memo)
select pg_temp.rso_read('warm');
select pg_temp.rso_read('before');
select pg_temp.rso_read('before');
select pg_temp.rso_read('before');
select pg_temp.rso_read('before');
select pg_temp.rso_read('before');

-- SEED: the organization grows ~50x; the probe table does not change
reset role;
set local session_replication_role = replica;
insert into custom.record (organization_id, table_id, data_class, data)
select t.organization_id, t.table_id, t.data_class, t.data || jsonb_build_object('name', 'RSO seed ' || g, 'slug', 'rso_seed_' || g)
  from custom.record t cross join generate_series(1, 1000) g
 where t.organization_id = current_setting('rso.org')::uuid and t.id = current_setting('rso.seed')::uuid;
insert into custom.record (organization_id, table_id, data_class, data)
select f.organization_id, f.table_id, f.data_class, f.data
  from custom.record f cross join generate_series(1, 15000 / 7 + 1) g
 where f.organization_id = current_setting('rso.org')::uuid and f.table_id = custom.field_kernel_id()
   and f.data ->> 'entity_definition_id' = current_setting('rso.seed');
insert into custom.record (organization_id, table_id, data_class, data)
select current_setting('rso.org')::uuid, current_setting('rso.seed')::uuid, 'record', jsonb_build_object('title', 'Seed ' || g)
  from generate_series(1, 20000) g;
set local session_replication_role = origin;

-- AFTER
select pg_temp.rso_read('warm');
select pg_temp.rso_read('after');
select pg_temp.rso_read('after');
select pg_temp.rso_read('after');
select pg_temp.rso_read('after');
select pg_temp.rso_read('after');

do $t$
declare
  v_org uuid := current_setting('rso.org')::uuid;
  v_before numeric; v_after numeric; v_tables integer; v_fields integer; v_fail text[] := '{}';
begin
  select percentile_cont(0.5) within group (order by x::numeric) into v_before from unnest(string_to_array(current_setting('rso.before'), ',')) x;
  select percentile_cont(0.5) within group (order by x::numeric) into v_after  from unnest(string_to_array(current_setting('rso.after'), ',')) x;
  select count(*) filter (where table_id = custom.table_kernel_id()), count(*) filter (where table_id = custom.field_kernel_id())
    into v_tables, v_fields from custom.record where organization_id = v_org;
  raise notice 'probe page: before % ms [%]; after the org grew to % tables / % fields: % ms [%]',
    round(v_before), current_setting('rso.before'), v_tables, v_fields, round(v_after), current_setting('rso.after');
  if split_part(current_setting('rso.after_rows'), ':', 2) <> '10' then
    v_fail := v_fail || format('the probe page has %s rows, not 10', split_part(current_setting('rso.after_rows'), ':', 2));
  end if;
  if current_setting('rso.after_rows') <> current_setting('rso.before_rows') then
    v_fail := v_fail || 'the probe page changed when other tables were added';
  end if;
  if v_after - v_before > greatest(100, v_before * 0.5) then
    v_fail := v_fail || format('the read grew from %s ms to %s ms when the organization grew (bar: +max(100 ms, 50%%))', round(v_before), round(v_after));
  end if;
  if cardinality(v_fail) > 0 then
    raise exception 'RED — %', array_to_string(v_fail, '; ');
  end if;
  raise notice 'GREEN — a 10-row read stays flat while the organization grows ~50x';
end
$t$;

rollback;
