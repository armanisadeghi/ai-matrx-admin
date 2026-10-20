-- additive: yes
-- guard: custom/system_enabled
-- lane: READ-SPEED-5
-- lock: custom
-- allows: revoke custom
-- based-on: custom.computed_refresh_drain(integer) 135536914d6ec3c70cc32a1d69f561f55ac970a726a61f2644947b661fd4bb64
-- based-on: custom._computed_reader_ok(uuid, uuid, uuid) 4f473a7eda104c5e83aa8a69aa518b826eefaf1b2dbc5730de842913e58cdc62
--
-- READ-SPEED-5 c — KEPT VALUES ARE SERVED AGAIN (the inverse of READ-SPEED-4 d, keeping READ-SPEED-5 a's organization
-- mark check). custom.computed_refresh now works for a signed-in caller (READ-SPEED-5 a) and the client calls it after a
-- page read (features/data-tables/data-source/record-store.ts), so a reader the kept judgement admits is served kept
-- values; a stale row, or any row while a column write's mark is waiting, is still worked out at read.
-- The drain (custom.computed_refresh_drain) applies waiting organization marks before it works anything out.
-- Inverse: migrations/inverse/20261021240200_readspeed5_c_kept_values_are_served_again_down.sql
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
  -- READ-SPEED-5 c: the hold of READ-SPEED-4 d is released — custom.computed_refresh works for a signed-in caller
  if coalesce(current_setting('mx.computed_store', true), '') <> 'force'
     and not exists (select 1 from pg_trigger where tgrelid = 'custom.record'::regclass and tgname = 'zzzzzz_computed_stale_u') then
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
  -- READ-SPEED-5 c: a column write's organization mark is applied first (every kept row of that organization stale)
  for c in select distinct m.organization_id org from custom.computed_org_mark m loop
    perform custom._computed_apply_org_mark(c.org);
  end loop;
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
