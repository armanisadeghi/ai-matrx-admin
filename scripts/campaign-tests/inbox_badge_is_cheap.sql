-- lane: DB LANE A (2026-10-21) — migrations/dblanea_inbox_indexes_on_record.sql +
--       migrations/dblanea_approver_check_asks_the_cheap_clause_first.sql
-- Run as the owner (Supabase Management API / MCP / psql). Read-only; the DO block always raises its
-- report, PASS/FAIL first.
--
-- Clause 1 (same answer): for admin@admin.com and test@test.com, custom.work_approval_is_approver on every
--   pending approval in their organizations equals the three clauses evaluated in full (named approver,
--   organization admin, admin on the record's permission ladder).
-- Clause 2 (cheap): custom.inbox_counts(null) for admin@admin.com (47 organizations) answers in under
--   700 ms, best of 3. Proven failing first: 2,151 ms before the indexes, 1,929 ms with the indexes and
--   the ladder-first clause order.
-- Clause 3 (indexed): the pending-approval scan over admin's organizations reads the partial index.
-- Clause 4 (the reminder tick, migrations/dblanea_remind_tick_reads_assignees_through_the_index.sql): its
--   assignee branch is written as a strict operator and that shape reads record_*_assignee_live_idx
--   (8.5 s seq scan before, 67 ms after). Proven failing first against the old nullif(...) body.
do $$
declare
  c record; t0 timestamptz; best numeric := 1e9; i int; n int;
  plan text; out text := ''; bad int := 0;
begin
  for c in select * from (values
      ('admin', '87a6e699-3622-4869-8843-d0867456c0dd'::uuid),
      ('test',  '4060701e-706a-4c76-b3ca-0bbc69fa5a14'::uuid)) v(n, u) loop
    select count(*) into n
      from custom.record r
      join iam.organization_member m on m.organization_id = r.organization_id and m.user_id = c.u
     where r.data_class = 'work_approval' and r.deleted_at is null
       and coalesce(r.data ->> 'state', 'pending') = 'pending'
       and custom.work_approval_is_approver(r.organization_id, nullif(r.data ->> 'subject_id', '')::uuid,
                                            nullif(r.data ->> 'approver_id', '')::uuid, c.u)
           is distinct from
           exists (select 1 from iam.organization_member m2 join auth.users u on u.id = m2.user_id
                    where m2.organization_id = r.organization_id and m2.user_id = c.u
                      and ((m2.user_id = nullif(r.data ->> 'approver_id', '')::uuid) is true
                           or public.is_org_admin_for(m2.user_id, r.organization_id)
                           or (custom.effective_level(m2.user_id, r.organization_id,
                                 nullif(r.data ->> 'subject_id', '')::uuid, 'record') = 'admin'::public.permission_level) is true));
    if n > 0 then bad := bad + 1; out := out || '  FAIL ' || n || ' approver answers differ for ' || c.n || E'\n'; end if;
  end loop;

  perform set_config('request.jwt.claims', json_build_object('sub', '87a6e699-3622-4869-8843-d0867456c0dd', 'role', 'authenticated')::text, true);
  for i in 1..3 loop
    t0 := clock_timestamp();
    perform count(*) from custom.inbox_counts(null);
    best := least(best, extract(epoch from clock_timestamp() - t0) * 1000);
  end loop;
  out := out || 'inbox_counts(admin) best_ms=' || round(best) || E'\n';
  if best >= 700 then bad := bad + 1; out := out || '  FAIL inbox_counts took ' || round(best) || E' ms\n'; end if;

  n := 0;
  for plan in execute 'explain select 1 from custom.record r where r.organization_id = any(array(select organization_id from iam.organization_member where user_id = ''87a6e699-3622-4869-8843-d0867456c0dd'')) and r.data_class = ''work_approval'' and r.deleted_at is null' loop
    if plan like '%work_approval_live_idx%' then n := -1; end if;
  end loop;
  if n is distinct from -1 then bad := bad + 1; out := out || E'  FAIL the pending-approval scan does not read record_*_work_approval_live_idx\n'; end if;

  if position($q$r.data ->> 'assignee' <> ''$q$ in pg_get_functiondef('custom.inbox_remind_tick()'::regprocedure)) = 0 then
    bad := bad + 1; out := out || E'  FAIL custom.inbox_remind_tick no longer filters assignees with a strict operator\n';
  end if;
  n := 0;
  for plan in execute $q$explain select 1 from custom.record r where r.data_class = 'record' and r.deleted_at is null and r.data ->> 'assignee' <> ''$q$ loop
    if plan like '%assignee_live_idx%' then n := -1; end if;
  end loop;
  if n is distinct from -1 then bad := bad + 1; out := out || E'  FAIL the assignee scan does not read record_*_assignee_live_idx\n'; end if;

  raise exception '%', case when bad = 0 then 'PASS' else 'FAIL ' || bad end || E'\n' || out;
end $$;
