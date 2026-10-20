-- READ-SPEED-3 a — A FULL 50-ROW PAGE OF A COMPUTED-HEAVY TABLE READS IN UNDER 500 MS, WITH THE SAME ANSWER.
--
-- Customers and Jobs (Plumbing Company HQ), Donors and Campaigns (Nonprofit Fundraising Desk): roll-ups through
-- forward links and back-links, filtered roll-ups, formulas over roll-ups. Each grown to a full page of 50 records
-- inside this rolled-back transaction, the refresh job's work done (custom.computed_refresh_drain), then read as
-- admin@admin.com through custom.read_records_page. Each page must take under 500 ms server-side and be identical
-- to the same page worked out at read (mx.computed_store = off). RED before READ-SPEED-3 (worked out at read:
-- 1.2-2.8 s), GREEN after (kept values). Numbers: ~/lane-resume/reports/READ-SPEED-3.md.
-- Main database, read-only in effect: every write is rolled back.
\set ON_ERROR_STOP on
\timing off
\set suite 'readspeed3_a_kept_values_page_under_500ms.sql'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '58s';  -- READ-SPEED-6: inside the transaction (the pooler drops session settings)

do $t$
declare
  c_org1  constant uuid := '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f';
  c_admin constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_bar   constant numeric := 500;
  c record; v_n integer; v0 timestamptz; v_ms numeric; v_page jsonb; v_slow jsonb; v_fail text[] := '{}';
begin
  for c in select * from (values
    ('Customers', '28e2af9e-ddab-4f02-adea-b3387916c5d4'::uuid),
    ('Jobs',      '0aaa5c59-0df9-4ae6-a4f4-dcba08ac1a9d'::uuid),
    ('Donors',    '1ce82c3f-440e-4107-a8e7-79c178116c54'::uuid),
    ('Campaigns', 'cb606573-dad2-4df7-8373-1803e6e1c1b4'::uuid)) v(name, tid)
  loop
    perform set_config('role', 'postgres', true);
    select count(*) into v_n from custom.record where organization_id = c_org1 and table_id = c.tid and deleted_at is null;
    if v_n = 0 then
      raise exception 'RED — % (%) has no records on this database; the fixture tables are gone', c.name, c.tid;
    end if;
    insert into custom.record (organization_id, table_id, data, data_class, created_by, visibility)
    select r.organization_id, r.table_id, r.data, r.data_class, r.created_by, r.visibility
      from custom.record r cross join generate_series(1, greatest(50 - v_n, 0)) g
     where r.id = (select id from custom.record where organization_id = c_org1 and table_id = c.tid
                    and deleted_at is null order by created_at limit 1);
  end loop;
    -- THE REFRESH JOB'S WORK, done here (absent before READ-SPEED-3: then nothing is kept and the read works it out).
    perform set_config('role', 'postgres', true);
    perform set_config('request.jwt.claims', '', true);
    if to_regprocedure('custom.computed_refresh_drain(integer)') is not null then
      -- the new records queued as the write triggers (READ-SPEED-3 b) queue them, then the job's work
      -- READ-SPEED-6: only these Tables are marked and worked out (a whole-organization drain ran 150-600 s and
      -- broke the one-minute rule); the refresh door's own reader work (kept judgement and masks) is done too
      if to_regprocedure('custom._computed_mark_tables(uuid,uuid[])') is not null then
        perform custom._computed_mark_tables(c_org1, array['28e2af9e-ddab-4f02-adea-b3387916c5d4','0aaa5c59-0df9-4ae6-a4f4-dcba08ac1a9d','1ce82c3f-440e-4107-a8e7-79c178116c54','cb606573-dad2-4df7-8373-1803e6e1c1b4']::uuid[]);
        perform custom._computed_apply_org_mark(c_org1);
        declare v_t uuid; v_ids uuid[]; begin
          foreach v_t in array array['28e2af9e-ddab-4f02-adea-b3387916c5d4','0aaa5c59-0df9-4ae6-a4f4-dcba08ac1a9d','1ce82c3f-440e-4107-a8e7-79c178116c54','cb606573-dad2-4df7-8373-1803e6e1c1b4']::uuid[] loop
            loop
              select coalesce(array_agg(rc.record_id), '{}') into v_ids from (select rc.record_id from custom.record_computed rc
                where rc.organization_id = c_org1 and rc.table_id = v_t and rc.stale limit 500) rc;
              exit when cardinality(v_ids) = 0;
              perform custom.computed_refresh(c_org1, v_t, v_ids);
            end loop;
            perform custom._computed_warm('87a6e699-3622-4869-8843-d0867456c0dd'::uuid, c_org1, v_t);
          end loop;
        end;
      else
        perform custom._computed_mark_org(c_org1);
        perform custom.computed_refresh_drain(900000);
      end if;
    end if;
    -- until READ-SPEED-3 b (the write triggers) lands, kept values are served only when forced (proofs only)
    perform set_config('mx.computed_store', 'force', true);
end
$t$;

-- READ-SPEED-6: the reads are their own statement, as a page read is (the setup's statement memo is not theirs)
do $t$
declare
  c_org1  constant uuid := '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f';
  c_admin constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  c_bar   constant numeric := 500;
  c record; v_n integer; v0 timestamptz; v_ms numeric; v_page jsonb; v_slow jsonb; v_fail text[] := '{}';
begin
  for c in select * from (values
    ('Customers', '28e2af9e-ddab-4f02-adea-b3387916c5d4'::uuid),
    ('Jobs',      '0aaa5c59-0df9-4ae6-a4f4-dcba08ac1a9d'::uuid),
    ('Donors',    '1ce82c3f-440e-4107-a8e7-79c178116c54'::uuid),
    ('Campaigns', 'cb606573-dad2-4df7-8373-1803e6e1c1b4'::uuid)) v(name, tid)
  loop
    perform set_config('request.jwt.claims', c_admin, true);
    perform set_config('role', 'authenticated', true);
    v0 := clock_timestamp();
    v_page := custom.read_records_page(c_org1, c.tid, '{}'::jsonb, null, '[]'::jsonb, null, false, 50, 0, null);
    v_ms := extract(epoch from clock_timestamp() - v0) * 1000;
    perform set_config('mx.computed_store', 'off', true);
    v_slow := custom.read_records_page(c_org1, c.tid, '{}'::jsonb, null, '[]'::jsonb, null, false, 50, 0, null);
    perform set_config('mx.computed_store', 'force', true);
    raise notice '% — % rows in % ms (bar % ms)', c.name, jsonb_array_length(v_page -> 'rows'), round(v_ms), c_bar;
    if jsonb_array_length(v_page -> 'rows') <> 50 then
      v_fail := v_fail || format('%s: %s rows, not a full page of 50', c.name, jsonb_array_length(v_page -> 'rows'));
    end if;
    if v_ms >= c_bar then
      v_fail := v_fail || format('%s: %s ms (bar %s)', c.name, round(v_ms), c_bar);
    end if;
    if v_page is distinct from v_slow then
      v_fail := v_fail || format('%s: the kept page differs from the page worked out at read', c.name);
    end if;
  end loop;
  if cardinality(v_fail) > 0 then
    raise exception 'RED — %', array_to_string(v_fail, '; ');
  end if;
  raise notice 'GREEN — four full computed pages under % ms, identical to the read-time path', c_bar;
end
$t$;

rollback;
