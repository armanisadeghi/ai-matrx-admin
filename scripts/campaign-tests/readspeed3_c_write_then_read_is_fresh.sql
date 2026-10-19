-- READ-SPEED-3 c — A WRITE IS SEEN BY THE NEXT READ, AND THE KEPT VALUES CATCH UP.
--
-- Plumbing Company HQ: a Customer with a counted Invoice. As admin@admin.com through custom.read_records_by_ids:
--   1. kept and current after the refresh job (custom.record_computed row fresh, read = read worked out at read);
--   2. the Invoice's amount moves by 100 -> the Customer's kept row is marked stale, the next read shows billed+100
--      (identical to the read-time path), and after the refresh job the kept row is current again with that value;
--   3. the Invoice's link to the Customer is removed -> the next read and the refreshed kept row drop it;
--   4. the "Tier" formula's threshold changes -> every kept row of the organization is stale, the read is right,
--      and after the refresh job the kept rows are current with the new formula's answer.
-- RED before READ-SPEED-3 (nothing is kept), GREEN after. Every write is rolled back.
\set ON_ERROR_STOP on
\timing off
\set suite 'readspeed3_c_write_then_read_is_fresh.sql'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '900s';

do $t$
declare
  c_org   constant uuid := '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f';
  c_cust  constant uuid := '28e2af9e-ddab-4f02-adea-b3387916c5d4';
  c_inv   constant uuid := '60bbba5d-ab96-4cb1-a36e-a9ae312d3885';
  c_admin constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_c uuid; v_i uuid; v_b0 numeric; v_b numeric; v_doc jsonb; v_slow jsonb; v_kept jsonb; v_stale boolean;
begin
  if to_regclass('custom.record_computed') is null then
    raise exception 'RED — nothing is kept: custom.record_computed does not exist';
  end if;
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  select i.id, (i.data ->> 'customer')::uuid into v_i, v_c
    from custom.record i
    join custom.record c on c.organization_id = c_org and c.id = (i.data ->> 'customer')::uuid and c.deleted_at is null
   where i.organization_id = c_org and i.table_id = c_inv and i.deleted_at is null
     and jsonb_typeof(i.data -> 'amount') = 'number' and i.data ->> 'status' not in ('Draft', 'Void')
     and (i.data ->> 'customer') ~ '^[0-9a-f-]{36}$'
   order by i.created_at limit 1;
  if v_i is null then
    raise exception 'RED — no counted Invoice linked to a Customer on this database';
  end if;

  create temp table _rs3c_read (step text, doc jsonb, slow jsonb, kept jsonb, stale boolean) on commit drop;
  -- one read as admin, kept path and read-time path, plus the kept row as it stands
  create or replace function pg_temp._rs3c(p_step text, p_c uuid, p_admin text) returns void language plpgsql as $f$
  declare v_doc jsonb; v_slow jsonb;
  begin
    perform set_config('request.jwt.claims', p_admin, true);
    perform set_config('role', 'authenticated', true);
    select r.document into v_doc from custom.read_records_by_ids('884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f', '28e2af9e-ddab-4f02-adea-b3387916c5d4', array[p_c]) r;
    perform set_config('mx.computed_store', 'off', true);
    select r.document into v_slow from custom.read_records_by_ids('884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f', '28e2af9e-ddab-4f02-adea-b3387916c5d4', array[p_c]) r;
    perform set_config('mx.computed_store', '', true);
    perform set_config('role', 'postgres', true);
    perform set_config('request.jwt.claims', '', true);
    insert into _rs3c_read select p_step, v_doc, v_slow, rc.vals, rc.stale
      from (select 1) o left join custom.record_computed rc on rc.record_id = p_c;
  end $f$;

  perform custom.computed_refresh_drain(600000);
  perform pg_temp._rs3c('1 refreshed', v_c, c_admin);

  update custom.record set data = jsonb_set(data, '{amount}', to_jsonb((data ->> 'amount')::numeric + 100))
   where organization_id = c_org and id = v_i;
  perform pg_temp._rs3c('2 amount +100, before refresh', v_c, c_admin);
  perform custom.computed_refresh_drain(600000);
  perform pg_temp._rs3c('2 amount +100, refreshed', v_c, c_admin);

  update custom.record set data = data - 'customer' where organization_id = c_org and id = v_i;
  perform pg_temp._rs3c('3 link removed, before refresh', v_c, c_admin);
  perform custom.computed_refresh_drain(600000);
  perform pg_temp._rs3c('3 link removed, refreshed', v_c, c_admin);

  update custom.record f
     set data = jsonb_set(f.data, '{config,expr,args,0,args,1,const}', '1')
   where f.organization_id = c_org and f.table_id = custom.field_kernel_id() and f.deleted_at is null
     and f.data ->> 'entity_definition_id' = c_cust::text and f.data ->> 'key' = 'value_tier';
  perform pg_temp._rs3c('4 formula changed, before refresh', v_c, c_admin);
  perform custom.computed_refresh_drain(600000);
  perform pg_temp._rs3c('4 formula changed, refreshed', v_c, c_admin);

  for v_doc, v_slow, v_kept, v_stale, v_b in
      select doc, slow, kept, stale, row_number() over () from _rs3c_read loop null; end loop;
  declare r record; v_fail text[] := '{}';
  begin
    for r in select * from _rs3c_read loop
      raise notice '% — billed % tier % | kept billed % stale %', r.step, r.doc ->> 'billed', r.doc ->> 'value_tier', r.kept ->> 'billed', r.stale;
      if r.doc is distinct from r.slow then v_fail := v_fail || (r.step || ': read differs from the read-time path'); end if;
      if r.step like '%refreshed' then
        if r.stale is distinct from false then v_fail := v_fail || (r.step || ': kept row not current after the refresh job'); end if;
        if (r.kept -> 'billed') is distinct from (r.doc -> 'billed') or (r.kept -> 'value_tier') is distinct from (r.doc -> 'value_tier') then
          v_fail := v_fail || (r.step || ': kept value differs from the read'); end if;
      else
        if r.stale is distinct from true then v_fail := v_fail || (r.step || ': the write did not mark the kept row stale'); end if;
      end if;
    end loop;
    select (doc ->> 'billed')::numeric into v_b0 from _rs3c_read where step = '1 refreshed';
    select (doc ->> 'billed')::numeric into v_b from _rs3c_read where step = '2 amount +100, before refresh';
    if v_b is distinct from v_b0 + 100 then v_fail := v_fail || format('billed after +100 is %s, expected %s', v_b, v_b0 + 100); end if;
    if (select count(*) from custom.record_computed where organization_id = c_org and stale) > 0 then
      v_fail := v_fail || 'kept rows still stale after the last refresh'::text;
    end if;
    if cardinality(v_fail) > 0 then
      raise exception 'RED — %', array_to_string(v_fail, '; ');
    end if;
  end;
  raise notice 'GREEN — every write was seen by the next read, and the kept values caught up';
end
$t$;

rollback;
