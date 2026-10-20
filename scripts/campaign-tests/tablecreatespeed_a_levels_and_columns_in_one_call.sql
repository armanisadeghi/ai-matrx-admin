-- LANE TABLE-CREATE-SPEED (item 1) - LEVELS FOR A WHOLE PAGE AND A NEW TABLE'S COLUMNS, EACH IN ONE CALL.
-- migrations/campaign/tablecreatespeed_a_levels_and_columns_in_one_call.sql. ONE transaction as admin@admin.com, ROLLBACK.
--   1. custom.my_levels_across over 30 tables from 6 of the admin's organizations answers exactly what custom.my_levels
--      answers organization by organization, in one call.
--   2. custom.field_declare_many declares three columns on a new table in one call, in order, each a real Field.
-- RED before the migration: the doors do not exist. Run from the repo root:
--   ~/lane-resume/rso3/psql.sh -f scripts/campaign-tests/tablecreatespeed_a_levels_and_columns_in_one_call.sql
\set ON_ERROR_STOP on
\timing off
\set suite 'tablecreatespeed_a_levels_and_columns_in_one_call.sql'
\set requires 'function:custom.my_levels|function:custom.field_declare|function:custom.table_declare'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif
begin;
set local lock_timeout = '20s';
set local statement_timeout = '120s';
select set_config('request.jwt.claims', '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}', true);
-- the asks are read as the owner (the person cannot read custom.record directly), then asked as the person
select set_config('tcs.asks', (select jsonb_agg(jsonb_build_object('organization_id', o.organization_id, 'ids', o.ids))
    from (select t.organization_id, jsonb_agg(t.id) as ids
            from (select r.organization_id, r.id, row_number() over (partition by r.organization_id order by r.id) as k
                    from custom.record r
                   where r.table_id = '11111111-0000-4000-8000-000000000001' and r.deleted_at is null
                     and r.organization_id in (select m.organization_id from iam.organization_member m
                                                where m.user_id = '87a6e699-3622-4869-8843-d0867456c0dd'
                                                order by m.organization_id limit 6)) t
           where t.k <= 5 group by t.organization_id) o)::text, true);
set local role authenticated;
do $t$
declare
  v_asks jsonb; v_org record; v_one jsonb := '[]'::jsonb; v_all jsonb; v_t0 timestamptz; v_ms numeric; v_refused_one int := 0; v_refused_all int;
  c_org uuid := '5dc930e9-bd65-44a1-8369-af773f6e1a5b'; v_pk uuid; v_home uuid; v_tbl uuid; v_ids uuid[]; v_keys text;
begin
  -- 1. parity
  v_asks := current_setting('tcs.asks')::jsonb;
  for v_org in select a ->> 'organization_id' as org, a -> 'ids' as ids from jsonb_array_elements(v_asks) a loop
    begin
      v_one := v_one || coalesce((select jsonb_agg(jsonb_build_array(v_org.org, l.id, l.level) order by l.id)
                                    from custom.my_levels(v_org.org::uuid, v_org.ids) l), '[]'::jsonb);
    exception when others then
      v_refused_one := v_refused_one + 1;  -- an organization custom.my_levels refuses (archived…): the one call must refuse it too
    end;
  end loop;
  v_t0 := clock_timestamp();
  select jsonb_agg(jsonb_build_array(a.organization_id, a.id, a.level) order by a.organization_id, a.id) into v_all
    from custom.my_levels_across(v_asks) a where a.refused is null;
  v_ms := round(extract(epoch from clock_timestamp() - v_t0) * 1000);
  select jsonb_agg(e order by e ->> 0, e ->> 1) into v_one from jsonb_array_elements(v_one) e;
  select count(distinct a.organization_id) into v_refused_all from custom.my_levels_across(v_asks) a where a.refused is not null;
  if v_refused_all <> v_refused_one then
    raise exception 'FAIL levels: the one call refused % organizations, custom.my_levels refused %', v_refused_all, v_refused_one;
  end if;
  if v_one is distinct from v_all then
    raise exception 'FAIL levels: one call answered % but organization by organization answered %', v_all, v_one;
  end if;
  raise notice 'PASS levels: % ids across % organizations (% refused by both), one call, % ms, same answers as custom.my_levels', jsonb_array_length(v_all), jsonb_array_length(v_asks), v_refused_one, v_ms;

  -- 2. three columns, one call
  v_pk := custom.person_kernel_id();
  v_home := custom.record_write(c_org, v_pk, '{"name":"TCS test Home"}'::jsonb);
  v_tbl := custom.table_declare(c_org, jsonb_build_object('name', 'TCS test', 'slug', 'tcs_test_' || substr(md5(random()::text), 1, 6),
             'type', 'entity', 'title_field', 'name', 'parent_id', v_home,
             'label_singular', 'TCS test', 'label_plural', 'TCS tests', 'display', 'list', 'weight', 'light', 'ordered', false,
             'row_order', 'manual', 'retention_days', 365, 'agent_writable', true, 'default_sort', '[{"field":"name","direction":"asc"}]'::jsonb, 'fields', '[{"name":"name"},{"name":"email"},{"name":"phone"}]'::jsonb));
  v_ids := custom.field_declare_many(c_org, v_tbl, '[{"key":"name","label":"Name","type":"text","sort":10},
                                                     {"key":"email","label":"Email","type":"email","sort":20},
                                                     {"key":"phone","label":"Phone","type":"phone","sort":30}]'::jsonb);
  perform set_config('tcs.fields', array_to_string(v_ids, ','), true);
end $t$;
reset role;
do $t$
declare v_ids uuid[] := string_to_array(current_setting('tcs.fields'), ',')::uuid[]; v_keys text;
begin
  select string_agg(f.data ->> 'key', ',' order by u.n) into v_keys
    from unnest(v_ids) with ordinality u(fid, n) join custom.record f on f.organization_id = '5dc930e9-bd65-44a1-8369-af773f6e1a5b' and f.id = u.fid
   where f.table_id = custom.field_kernel_id() and f.deleted_at is null;
  if cardinality(v_ids) <> 3 or v_keys is distinct from 'name,email,phone' then
    raise exception 'FAIL columns: field_declare_many gave % ids, keys %', cardinality(v_ids), v_keys;
  end if;
  raise notice 'PASS columns: one call declared %', v_keys;
end $t$;
rollback;
