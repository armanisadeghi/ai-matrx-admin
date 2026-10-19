-- READ-SPEED-2 — A PAGE OF A COMPUTED-HEAVY TABLE READS IN UNDER 2 SECONDS, WITH THE SAME ANSWER.
--
-- The four template tables READ-SPEED measured (Customers and Jobs of Plumbing Company HQ, Donors and Campaigns of
-- Nonprofit Fundraising Desk: roll-ups through forward links and back-links, filtered roll-ups, formulas over
-- roll-ups and over other formulas), each grown to a FULL page of 50 records inside this rolled-back transaction
-- (copies of its own first record, links included), read as admin@admin.com through custom.read_records_page — the
-- door the grid calls. Each full page must take under 2 s. The per-row code (before READ-SPEED-2) paid rows x
-- roll-ups x formulas and took > 2 s for a full page; RED there, GREEN after (numbers in
-- ~/lane-resume/reports/READ-SPEED-2.md). The same page with the page prefetch and the per-read memo switched off
-- (mx.page_prefetch / mx.read_memo = off: the per-row path) must give the identical rows.
--
-- Main database, read-only in effect: every write is rolled back.

\set ON_ERROR_STOP on
\timing off
\set suite 'readspeed2_a_computed_page_reads_under_2s.sql'
\set requires 'function:custom._page_derived_prefetch'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '600s';

do $t$
declare
  c_org   constant uuid := '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f';
  c_admin constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_bar   constant numeric := 2000;   -- milliseconds
  c record; v_n integer; v0 timestamptz; v_ms numeric; v_page jsonb; v_slow jsonb;
  v_fail text[] := '{}';
begin
  for c in select * from (values
    ('Customers', '28e2af9e-ddab-4f02-adea-b3387916c5d4'::uuid),
    ('Jobs',      '0aaa5c59-0df9-4ae6-a4f4-dcba08ac1a9d'::uuid),
    ('Donors',    '1ce82c3f-440e-4107-a8e7-79c178116c54'::uuid),
    ('Campaigns', 'cb606573-dad2-4df7-8373-1803e6e1c1b4'::uuid)) v(name, tid)
  loop
    perform set_config('role', 'postgres', true);
    select count(*) into v_n from custom.record
     where organization_id = c_org and table_id = c.tid and deleted_at is null;
    if v_n = 0 then
      raise exception 'RED — % (%) has no records on this database; the fixture tables are gone', c.name, c.tid;
    end if;
    insert into custom.record (organization_id, table_id, data, data_class, created_by, visibility)
    select r.organization_id, r.table_id, r.data, r.data_class, r.created_by, r.visibility
      from custom.record r cross join generate_series(1, greatest(50 - v_n, 0)) g
     where r.id = (select id from custom.record where organization_id = c_org and table_id = c.tid
                    and deleted_at is null order by created_at limit 1);

    perform set_config('request.jwt.claims', c_admin, true);
    perform set_config('role', 'authenticated', true);
    v0 := clock_timestamp();
    v_page := custom.read_records_page(c_org, c.tid, '{}'::jsonb, null, '[]'::jsonb, null, false, 50, 0, null);
    v_ms := extract(epoch from clock_timestamp() - v0) * 1000;
    perform set_config('mx.page_prefetch', 'off', true);
    perform set_config('mx.read_memo', 'off', true);
    v_slow := custom.read_records_page(c_org, c.tid, '{}'::jsonb, null, '[]'::jsonb, null, false, 50, 0, null);
    perform set_config('mx.page_prefetch', '', true);
    perform set_config('mx.read_memo', '', true);
    raise notice '% — % rows in % ms (bar % ms)', c.name, jsonb_array_length(v_page -> 'rows'), round(v_ms), c_bar;
    if jsonb_array_length(v_page -> 'rows') <> 50 then
      v_fail := v_fail || format('%s: %s rows, not a full page of 50', c.name, jsonb_array_length(v_page -> 'rows'));
    end if;
    if v_ms >= c_bar then
      v_fail := v_fail || format('%s: %s ms (bar %s)', c.name, round(v_ms), c_bar);
    end if;
    if v_page is distinct from v_slow then
      v_fail := v_fail || format('%s: the set-based page differs from the per-row page', c.name);
    end if;
  end loop;
  if cardinality(v_fail) > 0 then
    raise exception 'RED — %', array_to_string(v_fail, '; ');
  end if;
  raise notice 'GREEN — four full computed pages under % ms, identical to the per-row path', c_bar;
end
$t$;

rollback;
