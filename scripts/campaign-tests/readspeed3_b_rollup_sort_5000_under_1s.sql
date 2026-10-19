-- READ-SPEED-3 b — A ROLL-UP SORT OVER 5,000 RECORDS ANSWERS IN UNDER 1 SECOND.
--
-- Customers (Plumbing Company HQ) grown to 5,000 records inside this rolled-back transaction (copies of its first
-- record, links included), the refresh job's work done, then sorted by "Jobs done" (job_count, a filtered roll-up
-- through a back-link) as admin@admin.com through custom.read_records_page. Must answer a full page in under 1 s,
-- not refuse (the old 500-match ceiling), count all 5,000+, and come back in non-increasing job_count order.
-- RED before READ-SPEED-3 (refused: worked out per match, ceiling 500), GREEN after (sorted by kept values).
-- Main database, read-only in effect: every write is rolled back.
\set ON_ERROR_STOP on
\timing off
\set suite 'readspeed3_b_rollup_sort_5000_under_1s.sql'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '900s';

do $t$
declare
  c_org   constant uuid := '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f';
  c_tid   constant uuid := '28e2af9e-ddab-4f02-adea-b3387916c5d4';
  c_admin constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_n integer; v0 timestamptz; v_ms numeric; v_page jsonb; v_prev numeric; v_x numeric; e jsonb;
begin
  perform set_config('role', 'postgres', true);
  select count(*) into v_n from custom.record where organization_id = c_org and table_id = c_tid and deleted_at is null;
  insert into custom.record (organization_id, table_id, data, data_class, created_by, visibility)
  select r.organization_id, r.table_id, r.data || jsonb_build_object('customer_name', 'Seed ' || g), r.data_class, r.created_by, r.visibility
    from custom.record r cross join generate_series(1, greatest(5000 - v_n, 0)) g
   where r.id = (select id from custom.record where organization_id = c_org and table_id = c_tid
                  and deleted_at is null order by created_at limit 1);
    -- THE REFRESH JOB'S WORK, done here (absent before READ-SPEED-3: then nothing is kept and the read works it out).
    perform set_config('role', 'postgres', true);
    perform set_config('request.jwt.claims', '', true);
    if to_regprocedure('custom.computed_refresh_drain(integer)') is not null then
      perform custom.computed_refresh_drain(900000);
    end if;
    -- until READ-SPEED-3 b (the write triggers) lands, kept values are served only when forced (proofs only)
    perform set_config('mx.computed_store', 'force', true);

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
