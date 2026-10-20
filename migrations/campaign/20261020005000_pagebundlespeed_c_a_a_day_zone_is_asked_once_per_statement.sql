-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: PAGE-BUNDLE-SPEED
-- lock: custom
-- based-on: custom.day_zone(uuid) 449f5e056e9c00aa26a6bb06713afc9ac8dfda05025b234444c490f5e03f7048
--
-- PAGE-BUNDLE-SPEED c — "WHAT DAY IS IT HERE" IS WORKED OUT ONCE PER STATEMENT, NOT ONCE PER ROW.
--
-- Profiled 2026-10-20 (track_functions, read-only, as admin@admin.com): custom.read_records_page for the 18-row Belongings
-- table of an installed Home Inventory took 1.4 s server-side, of which custom.day_zone was 1,087 ms self over 18 calls
-- (TODAY() in a formula column, once per row). Each call reads pg_catalog.pg_timezone_names (~55 ms: every zone is built).
-- The new custom.day_zone answers from the statement memo after its first call; custom._day_zone_uncached is the old body
-- word for word (the principal is passed in, read once by the caller exactly as before). Same answer for every caller.
-- New function: custom._day_zone_uncached (SECURITY INVOKER, like custom.day_zone; called only from custom.day_zone).
-- Inverse: migrations/inverse/20261020005000_pagebundlespeed_c_a_a_day_zone_is_asked_once_per_statement_down.sql

CREATE FUNCTION custom._day_zone_uncached(p_organization_id uuid, p_me uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me  uuid := p_me;
  v_tz  text;
begin
  if v_me is not null then
    select n.name into v_tz
      from users.user_preferences up
      join pg_catalog.pg_timezone_names n on n.name = nullif(btrim(up.preferences -> 'display' ->> 'timeZone'), '')
     where up.user_id = v_me
     limit 1;
    if v_tz is not null then return v_tz; end if;

    select z.tz into v_tz
      from (select p.timezone as tz, p.updated_at, (p.organization_id is not distinct from p_organization_id) as same_org
              from communication.notification_channel_preference p
             where p.created_by = v_me and p.deleted_at is null and nullif(btrim(p.timezone), '') is not null
            union all
            select s.timezone, s.updated_at, (s.organization_id is not distinct from p_organization_id)
              from communication.sms_notification_preferences s
             where s.user_id = v_me and nullif(btrim(s.timezone), '') is not null) z
      join pg_catalog.pg_timezone_names n on n.name = z.tz
     order by z.same_org desc, z.updated_at desc nulls last
     limit 1;
    if v_tz is not null then return v_tz; end if;
  end if;
  if p_organization_id is not null then
    v_tz := custom.agg_calendar(p_organization_id) ->> 'time_zone';
    if v_tz is not null and v_tz <> 'UTC' then return v_tz; end if;
  end if;
  v_tz := nullif(btrim(current_setting('custom.time_zone', true)), '');
  if v_tz is not null and exists (select 1 from pg_catalog.pg_timezone_names n where n.name = v_tz) then
    return v_tz;
  end if;
  return 'UTC';
end
$function$;

CREATE OR REPLACE FUNCTION custom.day_zone(p_organization_id uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me  uuid := custom.query_principal();
  v_tz  text;
  -- PAGE-BUNDLE-SPEED c (2026-10-20): THE ANSWER ONCE PER STATEMENT. Every check in custom._day_zone_uncached reads
  -- pg_catalog.pg_timezone_names, which builds all ~1,200 zones (~55 ms) each time; a page whose formulas say
  -- TODAY() asked this once per row (18 rows: 1.09 s of a 1.4 s read). The answer depends only on the person,
  -- the organization and custom.time_zone, all in the key; the statement memo (platform.memo_k_*) is fenced by
  -- the statement, backend, seat and transaction, so the next statement asks afresh.
  v_key text := 'custom.day_zone:' || coalesce(v_me::text, '-') || ':' || coalesce(p_organization_id::text, '-')
             || ':' || coalesce(current_setting('custom.time_zone', true), '');
  v_hit text := platform.memo_k_get(v_key);
begin
  if v_hit is not null then
    return v_hit;
  end if;
  v_tz := custom._day_zone_uncached(p_organization_id, v_me);
  perform platform.memo_k_put(v_key, v_tz);
  return v_tz;
end
$function$;
