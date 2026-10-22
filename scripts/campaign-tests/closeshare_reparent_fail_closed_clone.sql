-- LANE CLOSE-SHARE — CD-SHARE-13 (acceptance test 13: fail-closed under load). NIGHTLY CLONE ONLY, one transaction, always rolled back.
-- Run: sed 's/__N__/10000/' <this file> > /tmp/t13.sql; python ~/lane-resume/closeshare/qcn.py /tmp/t13.sql   (CLONE_DATABASE_URL from .env.local)
-- Result 2026-10-21: reparent of X with 1,000 / 10,000 below it costs the same as a record with none (81 vs 82 ms; 217 vs 195 ms);
-- the member reads 0 descendants right after. 100,000+ cannot load inside the clone's transaction timeout (~10 ms per filler row).
-- CD-SHARE-13 (acceptance test 13) on the nightly clone, one transaction, rolled back at the end.
-- Y is shared with test@test.com (outside Oak Street Studio); X sits under Y with :N records under X.
-- X is reparented under P, which test cannot see. Expect: the commit (one record_reparent) costs the same at any N,
-- and right after it test reads zero of X's subtree.
do $t$
declare
  c_org   constant uuid := '2643e470-b275-47f3-95f3-ae275ad3ca47';
  c_tab   constant uuid := '459fc731-3224-442d-b5eb-6134a9ded1fe';
  c_admin constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_dana  constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated"}';
  c_n     constant int  := __N__;
  v_y uuid := gen_random_uuid(); v_x uuid := gen_random_uuid(); v_p uuid := gen_random_uuid();
  t0 timestamptz; v_ins_ms int; v_move_ms numeric; v_before int; v_after bigint; v_x_seen int; v_count_ms int; v_av_before bigint; v_av_after bigint; v_ids uuid[]; v_l uuid := gen_random_uuid(); v_leaf_ms numeric; v_leaf2_ms numeric; v_d1 uuid; v_d1_before boolean; v_d1_after boolean; v_x_before boolean;
begin
  perform set_config('app.actor_system', 'campaign-test/closeshare-t13', true);
  t0 := clock_timestamp();
  insert into custom.record (id, organization_id, table_id, data, created_by) values
    (v_y, c_org, c_tab, '{}'::jsonb, '87a6e699-3622-4869-8843-d0867456c0dd'),
    (v_p, c_org, c_tab, '{}'::jsonb, '87a6e699-3622-4869-8843-d0867456c0dd'),
    (v_x, c_org, c_tab, jsonb_build_object('parent_id', v_y::text), '87a6e699-3622-4869-8843-d0867456c0dd'),
    (v_l, c_org, c_tab, jsonb_build_object('parent_id', v_y::text), '87a6e699-3622-4869-8843-d0867456c0dd');
  insert into custom.record (organization_id, table_id, data, created_by)
    select c_org, c_tab, jsonb_build_object('parent_id', v_x::text), '87a6e699-3622-4869-8843-d0867456c0dd' from generate_series(1, c_n);
  v_ins_ms := extract(epoch from clock_timestamp() - t0) * 1000;

  perform set_config('request.jwt.claims', c_admin, true);
  execute 'set local role authenticated';
  perform custom.share_grant(c_org, v_y, 'user', '4060701e-706a-4c76-b3ca-0bbc69fa5a14', 'viewer');
  execute 'reset role';

  perform set_config('request.jwt.claims', c_dana, true);
  execute 'set local role authenticated';
  execute 'reset role';
  select r.id into v_d1 from custom.record r where r.organization_id = c_org and r.table_id = c_tab and r.data ->> 'parent_id' = v_x::text limit 1;
  execute 'set local role authenticated';
  v_x_before := custom.query_can_see(c_org, v_x, 'viewer');
  v_d1_before := custom.query_can_see(c_org, v_d1, 'viewer');
  execute 'reset role';
  v_before := (v_x_before::int) + (v_d1_before::int);

  select coalesce(sum(v), 0) into v_av_before from unnest(custom._access_versions(c_org)) v;

  perform set_config('request.jwt.claims', c_admin, true);
  execute 'set local role authenticated';
  t0 := clock_timestamp();
  perform custom.record_reparent(c_org, v_l, v_p);
  v_leaf_ms := round((extract(epoch from clock_timestamp() - t0) * 1000)::numeric, 2);
  t0 := clock_timestamp();
  perform custom.record_reparent(c_org, v_l, v_y);
  v_leaf2_ms := round((extract(epoch from clock_timestamp() - t0) * 1000)::numeric, 2);
  t0 := clock_timestamp();
  perform custom.record_reparent(c_org, v_x, v_p);
  v_move_ms := round((extract(epoch from clock_timestamp() - t0) * 1000)::numeric, 2);
  execute 'reset role';

  select coalesce(sum(v), 0) into v_av_after from unnest(custom._access_versions(c_org)) v;

  perform set_config('request.jwt.claims', c_dana, true);
  execute 'set local role authenticated';
  t0 := clock_timestamp();
  v_d1_after := custom.query_can_see(c_org, v_d1, 'viewer');
  v_ids := array(select custom.query_visible_ids(c_org, c_tab, 'viewer'));
  v_count_ms := extract(epoch from clock_timestamp() - t0) * 1000;
  execute 'reset role';
  select count(*) into v_after from custom.record r where r.id = any(v_ids) and r.data ->> 'parent_id' = v_x::text;
  v_x_seen := (v_x = any(v_ids))::int;
  raise notice 'member could see X % and a descendant % before; a descendant % after; visible ids in the table after: %', v_x_before, v_d1_before, v_d1_after, coalesce(array_length(v_ids, 1), 0);

  raise notice 'reparent of a record with no children: % ms then % ms; reparent of X with % below it: % ms', v_leaf_ms, v_leaf2_ms, c_n, v_move_ms;
  raise notice 'N=% inserted in % ms; member saw % of (X, one descendant) before; reparent took % ms; access version % -> %; member sees % descendants and X % times after (full scan % ms)',
    c_n, v_ins_ms, v_before, v_move_ms, v_av_before, v_av_after, v_after, v_x_seen, v_count_ms;
  raise exception 'rollback on purpose (proof only)';
end
$t$;
