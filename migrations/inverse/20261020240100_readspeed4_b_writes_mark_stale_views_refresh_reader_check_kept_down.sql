-- lane: READ-SPEED-4
-- based-on: custom._computed_reader_ok(uuid, uuid, uuid) 208c52d8ad151cf53f2d2c967f144a97cf56e53e6228f2d67b97472e183592f7
-- chair-step: removes the machinery table and its entity_types row, the door rows and the triggers of READ-SPEED-4 b
-- ground-standing-ok: a, d — every trigger that runs these bodies is READ-SPEED-4 c's, and c's inverse (run first) detaches them all before this file drops a body
-- Inverse of migrations/campaign/20261020240100_readspeed4_b_writes_mark_stale_views_refresh_reader_check_kept.sql: writes stop marking kept values; nothing kept is served; the reader check is judged every read.
CREATE OR REPLACE FUNCTION custom._computed_reader_ok(p_me uuid, p_org uuid, p_table uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_mk    text;
  v_raw   text;
  v_t     uuid;
  v_all   boolean;
  v_level public.permission_level;
  v_mask  jsonb;
  v_ok    boolean := true;
begin
  if coalesce(current_setting('mx.computed_store', true), '') = 'off' then
    return false;
  end if;
  if not custom._computed_eligible(p_org, p_table) then
    return false;
  end if;
  -- served only once writes keep them current (the write triggers, READ-SPEED-3 b, a window-class change);
  -- mx.computed_store = force serves them anyway, for the proofs only
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
  foreach v_t in array custom._computed_component(p_org, p_table) loop
    select s.o_all_visible into v_all from custom.visible_set(p_me, p_org, v_t, 'viewer'::public.permission_level) s;
    if not coalesce(v_all, false) then
      v_ok := false; exit;
    end if;
    v_level := custom.effective_level(p_me, p_org, v_t);
    v_mask := custom.read_mask_for(p_me, p_org, v_t, v_level, 'read');
    if exists (select 1 from jsonb_object_keys(coalesce(v_mask -> 'all_key_ids', '{}'::jsonb)) k
                where not (coalesce(v_mask -> 'visible', '[]'::jsonb) ? k)) then
      v_ok := false; exit;
    end if;
  end loop;
  perform platform.memo_k_put(v_mk, case when v_ok then 't' else 'f' end);
  return v_ok;
end;
$function$;
REVOKE ALL ON FUNCTION custom._computed_reader_ok(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
DELETE FROM platform.client_callable_door WHERE schema_name = 'custom' AND function_name IN ('computed_refresh', 'computed_warm');
DROP FUNCTION IF EXISTS custom.computed_refresh(uuid, integer);
DROP FUNCTION IF EXISTS custom.computed_warm(uuid);
DROP FUNCTION IF EXISTS custom._computed_door_org(uuid);
DROP FUNCTION IF EXISTS custom._computed_warm(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS custom._computed_reader_judge(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS custom._computed_stale_stmt();
DROP FUNCTION IF EXISTS custom._computed_assoc_stmt();
DROP FUNCTION IF EXISTS custom._access_version_bump_stmt();
DROP FUNCTION IF EXISTS custom._access_version_bump(uuid);
DROP FUNCTION IF EXISTS custom._access_versions(uuid);
DELETE FROM platform.entity_types WHERE token = 'computed_reader_judgement';
DROP TABLE IF EXISTS custom.computed_reader_judgement;
DELETE FROM platform.entity_types WHERE token = 'access_version';
DROP TABLE IF EXISTS custom.access_version;
