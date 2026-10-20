-- READ-SPEED-ORG-3 a — THE GRANTED-IDS QUESTION OF A SMALL ORGANIZATION COSTS WHAT THE ORGANIZATION HOLDS.
--
-- custom.read_door_granted_ids(org, table) — "which of this organization's records does something name" — is asked
-- by every read door (custom.visible_set, custom.table_has_a_visible_record, ...). READ-SPEED-ORG-2 made its writing
-- branch probe each of the ~2,300 named ids of the WHOLE platform by (organization, id): right for the test admin's
-- organization (22,700 records), a fixed ~6,000 buffer reads (0.6 -> 7 ms quiet, 2 -> 35 ms loaded) for every small
-- one, and the median organization holds 6 records.
--
-- This suite, in one rolled-back transaction that has written (xid assigned: the writing branch, no statement memo):
--   1. picks the SMALLEST organization (fewest records, then id) that has a named record, and the test admin's;
--   2. asks custom.read_door_granted_ids(org, null) 7 times in each, one statement per ask, under
--      EXPLAIN (ANALYZE, BUFFERS) (a function's own reads are counted on the calling node);
--   3. compares the answer with the plain reference join (the named ids joined to the org's live records).
-- RED when: the answer differs from the reference in either organization; the small organization's median exceeds
-- 3,000 buffers (probe-every-id body: ~6,000; join: ~1,400) or 10 ms; the admin organization's median exceeds 100 ms.
-- Body before READ-SPEED-ORG-3 a (probe every id everywhere): RED (small org ~6,078 buffers).
-- READ-SPEED-ORG-3 a (plan by size): GREEN. Numbers: ~/lane-resume/reports/READ-SPEED-ORG-3.md.
--
-- Main database, read-only in effect: nothing is written; the transaction is rolled back.

\set ON_ERROR_STOP on
\timing off
\set suite 'readspeedorg3_a_granted_ids_small_org_reads_few_buffers.sql'
\set requires 'function:custom.read_door_granted_ids'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '60s';
select pg_current_xact_id() is not null as wrote;   -- the writing branch: no statement memo, every ask does the work

create temp table rso3_m (org text, ms numeric, buffers bigint) on commit drop;

create function pg_temp.rso3_ask(p_org uuid, p_tag text) returns void language plpgsql as $f$
declare v_plan jsonb;
begin
  execute format('explain (analyze, buffers, format json) select custom.read_door_granted_ids(%L::uuid, null)', p_org) into v_plan;
  insert into rso3_m values (p_tag, (v_plan -> 0 ->> 'Execution Time')::numeric,
    coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Hit Blocks')::bigint, 0) + coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Read Blocks')::bigint, 0));
end
$f$;

create function pg_temp.rso3_reference(p_org uuid) returns uuid[] language sql stable as $f$
  select coalesce(array_agg(distinct r.id order by r.id), '{}'::uuid[])
    from (select p.resource_id as id from iam.permissions p where p.resource_type = 'record'
          union all select m.container_id from iam.memberships m where m.container_type = 'record'
          union all select g.entity_id from platform.entity_grants g where g.entity_type = 'record'
          union all select rr.item_id from platform.reachability rr where rr.item_type = 'record') h
    join custom.record r on r.organization_id = p_org and r.id = h.id and r.deleted_at is null
$f$;

do $t$
declare v_small uuid;
begin
  select r.organization_id into v_small
    from custom.record r
   where r.deleted_at is null
     and exists (select 1 from iam.permissions p where p.resource_type = 'record' and p.resource_id = r.id)
   group by r.organization_id
   order by (select count(*) from custom.record x where x.organization_id = r.organization_id), r.organization_id
   limit 1;
  if v_small is null then raise exception 'RED — no organization has a named record; the fixture is gone'; end if;
  perform set_config('rso3.small', v_small::text, true);
  perform set_config('rso3.admin', '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f', true);   -- admin@admin.com's organization
end
$t$;

select pg_temp.rso3_ask(current_setting('rso3.small')::uuid, 'warm');
select pg_temp.rso3_ask(current_setting('rso3.small')::uuid, 'small');
select pg_temp.rso3_ask(current_setting('rso3.small')::uuid, 'small');
select pg_temp.rso3_ask(current_setting('rso3.small')::uuid, 'small');
select pg_temp.rso3_ask(current_setting('rso3.small')::uuid, 'small');
select pg_temp.rso3_ask(current_setting('rso3.small')::uuid, 'small');
select pg_temp.rso3_ask(current_setting('rso3.small')::uuid, 'small');
select pg_temp.rso3_ask(current_setting('rso3.small')::uuid, 'small');
select pg_temp.rso3_ask(current_setting('rso3.admin')::uuid, 'warm');
select pg_temp.rso3_ask(current_setting('rso3.admin')::uuid, 'admin');
select pg_temp.rso3_ask(current_setting('rso3.admin')::uuid, 'admin');
select pg_temp.rso3_ask(current_setting('rso3.admin')::uuid, 'admin');
select pg_temp.rso3_ask(current_setting('rso3.admin')::uuid, 'admin');
select pg_temp.rso3_ask(current_setting('rso3.admin')::uuid, 'admin');
select pg_temp.rso3_ask(current_setting('rso3.admin')::uuid, 'admin');
select pg_temp.rso3_ask(current_setting('rso3.admin')::uuid, 'admin');

do $t$
declare
  v_small uuid := current_setting('rso3.small')::uuid; v_admin uuid := current_setting('rso3.admin')::uuid;
  v_s_ms numeric; v_s_buf numeric; v_a_ms numeric; v_a_buf numeric; v_n integer; v_fail text[] := '{}';
begin
  select percentile_cont(0.5) within group (order by ms), percentile_cont(0.5) within group (order by buffers) into v_s_ms, v_s_buf from rso3_m where org = 'small';
  select percentile_cont(0.5) within group (order by ms), percentile_cont(0.5) within group (order by buffers) into v_a_ms, v_a_buf from rso3_m where org = 'admin';
  select count(*) into v_n from custom.record where organization_id = v_small;
  raise notice 'small org % (% records): median % ms, % buffers; admin org: median % ms, % buffers',
    v_small, v_n, round(v_s_ms, 2), v_s_buf, round(v_a_ms, 2), v_a_buf;
  if custom.read_door_granted_ids(v_small, null) is distinct from pg_temp.rso3_reference(v_small) then
    v_fail := v_fail || 'the small organization''s granted ids differ from the reference join';
  end if;
  if custom.read_door_granted_ids(v_admin, null) is distinct from pg_temp.rso3_reference(v_admin) then
    v_fail := v_fail || 'the admin organization''s granted ids differ from the reference join';
  end if;
  if v_s_buf > 3000 then
    v_fail := v_fail || format('the small organization (%s records) reads %s buffers per ask (bar 3,000: it pays for the whole platform''s named ids)', v_n, v_s_buf);
  end if;
  if v_s_ms > 10 then
    v_fail := v_fail || format('the small organization takes %s ms per ask (bar 10 ms)', round(v_s_ms, 2));
  end if;
  if v_a_ms > 100 then
    v_fail := v_fail || format('the admin organization takes %s ms per ask (bar 100 ms)', round(v_a_ms, 2));
  end if;
  if cardinality(v_fail) > 0 then raise exception 'RED — %', array_to_string(v_fail, '; '); end if;
  raise notice 'GREEN — a small organization''s granted ids cost what it holds; the admin organization stays fast';
end
$t$;

rollback;
