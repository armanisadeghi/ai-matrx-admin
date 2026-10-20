-- LANE TABLE-CREATE-SPEED-2 (item 1) - A NEW TABLE, ITS HOME AND ITS COLUMNS IN ONE DOOR.
-- migrations/campaign/tablecreatespeed2_a_a_table_its_home_and_its_columns_in_one_door.sql. ONE transaction as admin@admin.com, ROLLBACK.
--   1. custom.table_create makes a Home, a Table under it and three columns, in one call, as the signed-in person.
--   2. a column the store refuses leaves NOTHING behind: no Table and no Home (one transaction, no undo dance).
-- RED before the migration: the door does not exist. Run from the repo root:
--   ~/lane-resume/rso3/psql.sh -f scripts/campaign-tests/tablecreatespeed2_a_a_table_its_home_and_its_columns_in_one_door.sql
\set ON_ERROR_STOP on
\timing off
\set suite 'tablecreatespeed2_a_a_table_its_home_and_its_columns_in_one_door.sql'
\set requires 'function:custom.table_create|function:custom.field_declare_many|function:custom.table_declare'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif
begin;
set local lock_timeout = '20s';
set local statement_timeout = '120s';
select set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}', true);
select set_config('tcs.slug', 'tcs2_test_' || substr(md5(random()::text), 1, 6), true);
set local role authenticated;
do $t$
declare
  c_org uuid := '5dc930e9-bd65-44a1-8369-af773f6e1a5b'; v_out jsonb; v_t0 timestamptz; v_ms numeric; v_refused boolean := false;
  v_spec jsonb := jsonb_build_object('name', 'TCS2 test', 'slug', current_setting('tcs.slug'),
             'type', 'entity', 'title_field', 'name',
             'label_singular', 'TCS2 test', 'label_plural', 'TCS2 tests', 'display', 'list', 'weight', 'light', 'ordered', false,
             'row_order', 'manual', 'retention_days', 365, 'agent_writable', true, 'default_sort', '[{"field":"name","direction":"asc"}]'::jsonb,
             'fields', '[{"name":"name"},{"name":"email"},{"name":"phone"}]'::jsonb);
begin
  v_t0 := clock_timestamp();
  v_out := custom.table_create(c_org, v_spec, '[{"key":"name","label":"Name","type":"text","sort":10},
                                                {"key":"email","label":"Email","type":"email","sort":20},
                                                {"key":"phone","label":"Phone","type":"phone","sort":30}]'::jsonb);
  v_ms := round(extract(epoch from clock_timestamp() - v_t0) * 1000);
  perform set_config('tcs.out', v_out::text, true);
  raise notice 'table_create answered in % ms', v_ms;
  -- 2. a refused column: the whole birth is refused and nothing is left
  begin
    perform custom.table_create(c_org, v_spec || jsonb_build_object('name', 'TCS2 refused', 'slug', current_setting('tcs.slug') || '_r',
                                                                     'label_singular', 'TCS2 refused', 'label_plural', 'TCS2 refused'),
                                '[{"key":"name","label":"Name","type":"no_such_type_tcs2","sort":10}]'::jsonb);
  exception when others then
    v_refused := true;
  end;
  if not v_refused then raise exception 'FAIL refusal: a column of a type that does not exist was accepted'; end if;
end $t$;
reset role;
do $t$
declare
  c_org uuid := '5dc930e9-bd65-44a1-8369-af773f6e1a5b'; v_out jsonb := current_setting('tcs.out')::jsonb; v_keys text; v_parent uuid; v_left int;
begin
  select nullif(t.data ->> 'parent_id', '')::uuid into v_parent from custom.record t where t.organization_id = c_org and t.id = (v_out ->> 'table_id')::uuid and t.deleted_at is null;
  if v_parent is distinct from (v_out ->> 'home_id')::uuid then
    raise exception 'FAIL home: the table % lives under %, the door answered home %', v_out ->> 'table_id', v_parent, v_out ->> 'home_id';
  end if;
  select string_agg(f.data ->> 'key', ',' order by u.n) into v_keys
    from jsonb_array_elements_text(v_out -> 'field_ids') with ordinality u(fid, n)
    join custom.record f on f.organization_id = c_org and f.id = u.fid::uuid
   where f.table_id = custom.field_kernel_id() and f.deleted_at is null;
  if v_keys is distinct from 'name,email,phone' then
    raise exception 'FAIL columns: table_create declared % (wanted name,email,phone)', v_keys;
  end if;
  select count(*) into v_left from custom.record r
   where r.organization_id = c_org and r.deleted_at is null
     and ((r.data ->> 'slug') = current_setting('tcs.slug') || '_r' or (r.data ->> 'name') = 'TCS2 refused Home');
  if v_left <> 0 then raise exception 'FAIL refusal: a refused birth left % records behind', v_left; end if;
  raise notice 'PASS: one call made the Home, the Table under it and %; a refused column left nothing', v_keys;
end $t$;
rollback;
