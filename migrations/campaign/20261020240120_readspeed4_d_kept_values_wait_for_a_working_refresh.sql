-- additive: yes
-- guard: custom/system_enabled
-- lane: READ-SPEED-4
-- lock: custom
-- allows: revoke custom
-- based-on: custom._computed_reader_ok(uuid, uuid, uuid) 208c52d8ad151cf53f2d2c967f144a97cf56e53e6228f2d67b97472e183592f7
--
-- READ-SPEED-4 d — KEPT VALUES ARE NOT SERVED YET. With READ-SPEED-4 c live every kept row was stale and the refresh door
-- (custom.computed_refresh) refused signed-in callers (custom._page_derived_prefetch's client door, with the claims cleared),
-- so reads paid the reader check and gained nothing (live, as admin: Customers 2213 -> 2960 ms). Reads take the read-time
-- path exactly as before; writes keep marking stale. Inverse: migrations/inverse/20261020240120_readspeed4_d_kept_values_wait_for_a_working_refresh_down.sql
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
