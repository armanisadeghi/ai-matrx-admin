-- READ-SPEED-3 b — A ROLL-UP SORT OVER 5,000 RECORDS ANSWERS IN UNDER 1 SECOND.
--
-- READ-SPEED-8: read from a KEPT organization (slug larkspur-garage-doors-readspeed-b), built and topped up by
-- scripts/campaign-tests/_readspeed3_b_5000_fixture.sql in short transactions — growing 5,000 records inside this
-- guard's own transaction broke the one-minute rule. Its Customers sort by "Jobs done" (job_count, a roll-up through
-- the Jobs back-link filtered to status Done) as admin@admin.com through custom.read_records_page: a full page in under
-- 1 s, counting all 5,000, in non-increasing job_count order. RED when the organization is missing, has fewer than
-- 5,000 Customers, or has stale kept values or a mark waiting (re-run the fixture), and on the path before kept values:
-- psql -v read_time=1 forces the read-time path (mx.computed_store = off), which refuses past the 500-match ceiling or
-- answers over 1 s: RED.
\set ON_ERROR_STOP on
\timing off
\set suite 'readspeed3_b_rollup_sort_5000_under_1s.sql'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '58s';
create temp table rs3b (k text primary key, v uuid) on commit drop;
grant select on rs3b to authenticated;

do $t$
declare
  v_org uuid; v_cust uuid; v_jobs uuid; v_n integer; v_stale integer;
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  select o.id into v_org from iam.organizations o where o.slug = 'larkspur-garage-doors-readspeed-b' and o.archived_at is null;
  if v_org is null then
    raise exception 'RED — the 5,000-Customer organization (larkspur-garage-doors-readspeed-b) is missing: run scripts/campaign-tests/_readspeed3_b_5000_fixture.sql';
  end if;
  select t.id into v_cust from custom.record t where t.organization_id = v_org and t.table_id = '11111111-0000-4000-8000-000000000001'::uuid
     and t.deleted_at is null and t.data ->> 'slug' = 'customers';
  select t.id into v_jobs from custom.record t where t.organization_id = v_org and t.table_id = '11111111-0000-4000-8000-000000000001'::uuid
     and t.deleted_at is null and t.data ->> 'slug' = 'jobs';
  select count(*) into v_n from custom.record r where r.organization_id = v_org and r.table_id = v_cust and r.deleted_at is null;
  select count(*) into v_stale from custom.record_computed rc where rc.organization_id = v_org and rc.table_id in (v_cust, v_jobs) and rc.stale;
  raise notice 'organization %: % Customers, % stale kept values, mark waiting: %', v_org, v_n, v_stale, custom._computed_marked(v_org, v_cust);
  if v_n < 5000 then
    raise exception 'RED — % Customers, fewer than 5,000: run scripts/campaign-tests/_readspeed3_b_5000_fixture.sql', v_n;
  end if;
  if v_stale > 0 or custom._computed_marked(v_org, v_cust) then
    raise exception 'RED — % stale kept values / a mark waiting: the refresh has not caught up (run scripts/campaign-tests/_readspeed3_b_5000_fixture.sql)', v_stale;
  end if;
  insert into rs3b values ('org', v_org), ('cust', v_cust);
end
$t$;

-- the refresh door's reader work, as a page's door call does it (its own statement)
select custom._computed_warm('87a6e699-3622-4869-8843-d0867456c0dd'::uuid, (select v from rs3b where k = 'org'), (select v from rs3b where k = 'cust')) as warmed;

\if :{?read_time}
-- THE PATH BEFORE KEPT VALUES: every value worked out at read
set local mx.computed_store = 'off';
\endif

-- READ-SPEED-6: the read is its own statement, as a page read is (the setup's statement memo is not its)
do $t$
declare
  c_org   constant uuid := (select v from rs3b where k = 'org');
  c_tid   constant uuid := (select v from rs3b where k = 'cust');
  c_admin constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_n integer; v0 timestamptz; v_ms numeric; v_page jsonb; v_prev numeric; v_x numeric; e jsonb;
begin
  perform set_config('request.jwt.claims', c_admin, true);
  perform set_config('role', 'authenticated', true);
  v0 := clock_timestamp();
  begin
    v_page := custom.read_records_page(c_org, c_tid, '{}'::jsonb, null, '[{"field":"job_count","direction":"desc"}]'::jsonb, null, false, 50, 0, null);
  exception when others then
    raise exception 'RED — the roll-up sort over 5,000 records refused: %', sqlerrm;
  end;
  v_ms := extract(epoch from clock_timestamp() - v0) * 1000;
  raise notice 'job_count sort over % records: % rows in % ms', v_page ->> 'total', jsonb_array_length(v_page -> 'rows'), round(v_ms);
  if (v_page ->> 'total')::integer < 5000 or jsonb_array_length(v_page -> 'rows') <> 50 then
    raise exception 'RED — total % / % rows, expected 5,000+ and a full page', v_page ->> 'total', jsonb_array_length(v_page -> 'rows');
  end if;
  for e in select x from jsonb_array_elements(v_page -> 'rows') x loop
    v_x := nullif(coalesce(e -> 'document', e -> 'data', e) ->> 'job_count', '')::numeric;
    if v_prev is not null and v_x is not null and v_x > v_prev then
      raise exception 'RED — not in job_count order (% after %)', v_x, v_prev;
    end if;
    v_prev := coalesce(v_x, v_prev);
  end loop;
  if v_ms >= 1000 then
    raise exception 'RED — % ms (bar 1000 ms)', round(v_ms);
  end if;
  raise notice 'GREEN — roll-up sort over 5,000 records in % ms', round(v_ms);
end
$t$;

rollback;
