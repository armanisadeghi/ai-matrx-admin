-- LANE SERVER-ROWS (item 1) - A PAGE'S PER-ROW LEVELS ARE READ THE WAY THE PAGE ITSELF READS THEM.
-- migrations/campaign/serverrows_a_a_pages_levels_are_read_the_way_the_page_reads_them.sql. ONE transaction, ROLLBACK, reads only.
-- As test@test.com (a plain member of admin's Workspace) and as admin@admin.com, on the Workspace's largest table of
-- 100-1000 live rows, custom.my_levels of 100 row ids (with a duplicate and a null, as the grid may send):
--   1. answers, id for id and in the order asked, exactly what the ladder's set form custom.effective_level_many answers;
--   2. asks custom.levels_of (the page read's set path: the ladder once per class of record), not only the per-id halving
--      custom.effective_level_many (levels_of itself may hand a class's representatives to it).
-- RED before the migration: check 2 fails (seen 2026-10-20: my_levels called effective_level_many once and levels_of 0 times). Run from the repo root:
--   ~/lane-resume/rso3/psql.sh -f scripts/campaign-tests/serverrows_a_a_pages_levels_are_read_the_way_the_page_reads_them.sql
\set ON_ERROR_STOP on
\timing off
\set suite 'serverrows_a_a_pages_levels_are_read_the_way_the_page_reads_them.sql'
\set requires 'function:custom.my_levels|function:custom.levels_of|function:custom.effective_level_many'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif
begin;
set local statement_timeout = '120s';
set local track_functions = 'all';
do $t$
declare
  c_org uuid := '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f';
  c_who uuid[] := array['4060701e-706a-4c76-b3ca-0bbc69fa5a14', '87a6e699-3622-4869-8843-d0867456c0dd']::uuid[];
  v_table uuid; v_ids uuid[]; v_asked jsonb; v_who uuid; v_t0 timestamptz; v_ms numeric;
  v_bad int; v_elm0 bigint; v_lo0 bigint; v_elm1 bigint; v_lo1 bigint;
begin
  select t.id into v_table
    from custom.record t
    cross join lateral (select count(*) n from (select 1 from custom.record r where r.organization_id = c_org and r.table_id = t.id and r.deleted_at is null limit 1001) x) k
   where t.organization_id = c_org and t.table_id = custom.table_kernel_id() and t.deleted_at is null and k.n between 100 and 1000
   order by k.n desc, t.id limit 1;
  if v_table is null then raise exception 'FAIL setup: the Workspace has no table of 100-1000 live rows'; end if;
  v_ids := array(select r.id from custom.record r where r.organization_id = c_org and r.table_id = v_table and r.deleted_at is null order by r.created_at desc, r.id limit 100);
  -- the grid's own shape: the page's ids in order, plus one repeated and one null
  v_asked := to_jsonb(v_ids) || jsonb_build_array(v_ids[1]::text, null);
  foreach v_who in array c_who loop
    perform set_config('request.jwt.claims', jsonb_build_object('sub', v_who, 'role', 'authenticated')::text, true);
    -- the expected answer: the ladder's set form, for every distinct id
    create temp table if not exists srows_expect (id uuid, level text) on commit drop;
    truncate srows_expect;
    insert into srows_expect select m.id, m.level::text from custom.effective_level_many(v_who, v_ids, 'record') m;
    select coalesce(sum(calls), 0) into v_elm0 from pg_stat_xact_user_functions where schemaname = 'custom' and funcname = 'effective_level_many';
    select coalesce(sum(calls), 0) into v_lo0 from pg_stat_xact_user_functions where schemaname = 'custom' and funcname = 'levels_of';
    v_t0 := clock_timestamp();
    create temp table if not exists srows_got (ord bigint, id uuid, level text) on commit drop;
    truncate srows_got;
    insert into srows_got select row_number() over (), m.id, m.level::text from custom.my_levels(c_org, v_asked) m;
    v_ms := round(extract(epoch from clock_timestamp() - v_t0) * 1000);
    select coalesce(sum(calls), 0) into v_elm1 from pg_stat_xact_user_functions where schemaname = 'custom' and funcname = 'effective_level_many';
    select coalesce(sum(calls), 0) into v_lo1 from pg_stat_xact_user_functions where schemaname = 'custom' and funcname = 'levels_of';
    raise notice '% on table %: my_levels of % ids in % ms (effective_level_many +%, levels_of +%)',
      v_who, v_table, jsonb_array_length(v_asked), v_ms, v_elm1 - v_elm0, v_lo1 - v_lo0;
    -- 1. the same answer, in the order asked
    if (select count(*) from srows_got) <> jsonb_array_length(v_asked) then
      raise exception 'FAIL shape: % ids asked, % rows answered', jsonb_array_length(v_asked), (select count(*) from srows_got);
    end if;
    select count(*) into v_bad
      from jsonb_array_elements_text(v_asked) with ordinality a(asked, ord)
      join srows_got g on g.ord = a.ord
      left join srows_expect e on e.id = a.asked::uuid
     where g.id is distinct from a.asked::uuid or g.level is distinct from e.level;
    if v_bad > 0 then raise exception 'FAIL answer: % of % rows differ from custom.effective_level_many for %', v_bad, jsonb_array_length(v_asked), v_who; end if;
    -- 2. the page read's set path, not the per-id halving
    if v_lo1 - v_lo0 < 1 then
      raise exception 'FAIL path: custom.my_levels never asked the page read''s set path (custom.levels_of: % calls; effective_level_many, the per-id halving: % calls) for %',
        v_lo1 - v_lo0, v_elm1 - v_elm0, v_who;
    end if;
  end loop;
  raise notice 'PASS serverrows_a: my_levels answers what the ladder answers, through the page read''s set path';
end $t$;
rollback;
