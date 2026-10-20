-- BELONGINGS-ERROR 2 - THE TABLE PAGE BUNDLE COUNTS THE CALLER'S VISIBLE ROWS ONCE.
--
-- custom.table_page_bundle used to read custom.query_visible_ids for its `rows_visible` part and then again inside
-- custom.where_id_opens (which counts the same rows, for `opening_view_shape`). Inside one rolled-back transaction, in the
-- Template sweep (test) organization, as admin@admin.com, this suite:
--   1. declares an 18-row probe table;
--   2. counts the calls to custom.query_visible_ids made by custom.where_id_opens(probe) alone (W) and by custom.views (V),
--      the only other bundle part that reads the visible set;
--   3. counts the calls the whole bundle makes (B), and reads its buffers (printed as the before/after record).
-- RED when B > W + V (the visible rows were read a second time by the bundle itself), or when `rows_visible` and
-- `opening_view_shape` are not both present, in order, with rows = 18 and no error.
-- Old body: B = W + V + 1 (RED). New body (belongingserror_a_a): B = W + V (GREEN).
--
-- Main database, read-only in effect: every write is rolled back.

\set ON_ERROR_STOP on
\timing off
\set suite 'belongingserror_a_table_page_bundle_counts_visible_rows_once.sql'
\set requires 'function:custom.table_page_bundle'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '120s';
set local lock_timeout = '10s';
set local track_functions = 'all';

do $t$
declare
  c_org   constant uuid := '9c54ebd0-49c0-4ff0-8a51-1cd2c6b8562d';   -- Template sweep (test)
  c_admin constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated","email":"admin@admin.com"}';
  v_home uuid; v_spec jsonb; v_probe uuid;
  v_w bigint; v_v bigint; v_b bigint; v_bundle jsonb; v_blk bigint; v_plan json;
  v_parts jsonb; v_rv jsonb; v_ov jsonb; v_fail text[] := '{}';
begin
  perform set_config('role', 'postgres', true);
  select (t.data ->> 'parent_id')::uuid into v_home from custom.record t
   where t.organization_id = c_org and t.table_id = custom.table_kernel_id() and t.deleted_at is null
     and t.data ? 'parent_id' limit 1;
  if v_home is null then
    raise exception 'RED - the Template sweep (test) organization % has no table with a home; the fixture org is gone', c_org;
  end if;
  v_spec := jsonb_build_object('name', 'BE probe', 'slug', 'be_probe', 'type', 'entity', 'weight', 'light',
    'display', 'list', 'ordered', false, 'parent_id', v_home, 'row_order', 'sorted', 'title_field', 'title',
    'default_sort', '[{"field":"title","direction":"asc"}]'::jsonb, 'label_plural', 'BE probes',
    'label_singular', 'BE probe', 'agent_writable', true, 'retention_days', 30,
    'fields', '[{"name":"title"},{"name":"notes"}]'::jsonb);
  perform set_config('request.jwt.claims', c_admin, true);
  perform set_config('role', 'authenticated', true);
  v_probe := custom.table_declare(c_org, v_spec);
  perform set_config('role', 'postgres', true);
  insert into custom.record (organization_id, table_id, data_class, data)
  select c_org, v_probe, 'record', jsonb_build_object('title', 'Item ' || g, 'notes', 'Note ' || g)
    from generate_series(1, 18) g;

  perform set_config('role', 'authenticated', true);
  -- W: the visible-set reads where_id_opens makes on its own
  select coalesce(sum(calls), 0) into v_w from pg_stat_xact_user_functions where funcname = 'query_visible_ids';
  perform custom.where_id_opens(v_probe);
  select coalesce(sum(calls), 0) - v_w into v_w from pg_stat_xact_user_functions where funcname = 'query_visible_ids';
  -- V: the one other bundle part that reads the visible set
  select coalesce(sum(calls), 0) into v_v from pg_stat_xact_user_functions where funcname = 'query_visible_ids';
  perform count(*) from custom.views(c_org, v_probe);
  select coalesce(sum(calls), 0) - v_v into v_v from pg_stat_xact_user_functions where funcname = 'query_visible_ids';
  -- B: the whole bundle
  select coalesce(sum(calls), 0) into v_b from pg_stat_xact_user_functions where funcname = 'query_visible_ids';
  v_bundle := custom.table_page_bundle(c_org, v_probe);
  select coalesce(sum(calls), 0) - v_b into v_b from pg_stat_xact_user_functions where funcname = 'query_visible_ids';
  execute format('explain (analyze, buffers, format json) select custom.table_page_bundle(%L, %L)', c_org, v_probe) into v_plan;
  v_blk := coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Hit Blocks')::bigint, 0) + coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Read Blocks')::bigint, 0);
  perform set_config('role', 'postgres', true);

  raise notice 'visible-set reads: where_id_opens alone %, views %, whole bundle % (bar: <= %); bundle buffers %', v_w, v_v, v_b, v_w + v_v, v_blk;
  if v_b > v_w + v_v then
    v_fail := v_fail || format('the bundle read the visible set %s times; where_id_opens alone reads it %s and views %s, so the bundle read it %s more time(s) than it needs', v_b, v_w, v_v, v_b - v_w - v_v);
  end if;

  v_parts := v_bundle -> 'parts';
  select p into v_rv from jsonb_array_elements(v_parts) p where p ->> 'door' = 'rows_visible';
  select p into v_ov from jsonb_array_elements(v_parts) p where p ->> 'door' = 'opening_view_shape';
  if v_rv is null or v_rv ? 'error' or (v_rv -> 'data' ->> 'rows')::integer <> 18 or (v_rv -> 'data' ->> 'cap')::integer <> 200 then
    v_fail := v_fail || format('rows_visible part is wrong: %s', v_rv);
  end if;
  if v_ov is null or v_ov ? 'error' then
    v_fail := v_fail || format('opening_view_shape part is missing or carries an error: %s', v_ov);
  end if;
  if (v_parts -> -2 ->> 'door') is distinct from 'rows_visible' or (v_parts -> -1 ->> 'door') is distinct from 'opening_view_shape' then
    v_fail := v_fail || 'rows_visible and opening_view_shape are not the last two parts, in that order';
  end if;
  if cardinality(v_fail) > 0 then
    raise exception 'RED - %', array_to_string(v_fail, '; ');
  end if;
  raise notice 'GREEN - the page bundle counts the caller''s visible rows once';
end
$t$;

rollback;
