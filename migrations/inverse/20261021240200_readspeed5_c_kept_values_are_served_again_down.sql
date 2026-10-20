-- lane: READ-SPEED-5
-- allows: revoke custom
-- based-on: custom.computed_refresh_drain(integer) 0b4f6a0d9a6de52d8e1b16ee24ed85c6420d0c26f318db52f596a11c0e2e70e5
-- based-on: custom._computed_reader_ok(uuid, uuid, uuid) beb6ed4778977ce374b020772149b7408d3c9613a624ef79ffe712f0139c0505
-- Inverse of migrations/campaign/20261021240200_readspeed5_c_kept_values_are_served_again.sql: kept values are held again (mx.computed_store = force only).
CREATE OR REPLACE FUNCTION custom._computed_reader_ok(p_me uuid, p_org uuid, p_table uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_mk  text;
  v_raw text;
  v_ok  boolean;
begin
  if coalesce(current_setting('mx.computed_store', true), '') = 'off' then
    return false;
  end if;
  if not custom._computed_eligible(p_org, p_table) then
    return false;
  end if;
  -- READ-SPEED-5 a: a column or Table write is waiting to be applied in this organization
  if exists (select 1 from custom.computed_org_mark m where m.organization_id = p_org) then
    return false;
  end if;
  -- served only once writes keep them current (the write triggers); mx.computed_store = force serves anyway (proofs)
  -- HELD (READ-SPEED-4 d): nothing kept is served until custom.computed_refresh works for a signed-in caller;
  -- mx.computed_store = force serves anyway (proofs only)
  if coalesce(current_setting('mx.computed_store', true), '') <> 'force' then
    return false;
  end if;
  if p_me is null then
    return true;
  end if;
  v_mk := 'custom.computed_reader_ok:' || p_me::text || ':' || p_org::text || ':' || p_table::text;
  v_raw := platform.memo_k_get(v_mk);
  if v_raw is not null then
    return v_raw = 't';
  end if;
  -- the kept judgement, while no access changed and for 5 minutes; else judged here, exactly
  select j.ok into v_ok from custom.computed_reader_judgement j
   where j.reader_id = p_me and j.organization_id = p_org and j.table_id = p_table
     and j.versions = custom._access_versions(p_org) and j.judged_at > now() - interval '5 minutes';
  if v_ok is null then
    v_ok := custom._computed_reader_judge(p_me, p_org, p_table);
  end if;
  perform platform.memo_k_put(v_mk, case when v_ok then 't' else 'f' end);
  return v_ok;
end;
$function$;
REVOKE ALL ON FUNCTION custom._computed_reader_ok(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION custom.computed_refresh_drain(p_ms integer DEFAULT 8000)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_t0 timestamptz := clock_timestamp();
  v_n  integer := 0;
  c    record;
begin
  if not pg_try_advisory_xact_lock(hashtext('custom.computed_refresh_drain')) then
    return 0;
  end if;
  loop
    select rc.organization_id org, rc.table_id tid into c
      from custom.record_computed rc where rc.stale order by rc.gen desc limit 1;
    exit when c.org is null;
    v_n := v_n + custom.computed_refresh(c.org, c.tid,
             array(select rc.record_id from custom.record_computed rc
                    where rc.organization_id = c.org and rc.table_id = c.tid and rc.stale limit 50));
    exit when clock_timestamp() - v_t0 > make_interval(secs => p_ms / 1000.0);
  end loop;
  return v_n;
end;
$function$;
