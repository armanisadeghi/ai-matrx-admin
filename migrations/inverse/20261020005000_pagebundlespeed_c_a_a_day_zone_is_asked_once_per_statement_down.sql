-- lane: PAGE-BUNDLE-SPEED
-- lock: custom
-- based-on: custom.day_zone(uuid) b65a54013b9e20be35200811a1dafc51d89f976064ee235e05f8c3e28fb4f1d8
-- chair-step: Inverse of PAGE-BUNDLE-SPEED c: custom.day_zone goes back to working its answer out on every call (the body before migrations/campaign/20261020005000_pagebundlespeed_c_a_a_day_zone_is_asked_once_per_statement.sql) and its helper custom._day_zone_uncached is dropped. Same answers either way.

CREATE OR REPLACE FUNCTION custom.day_zone(p_organization_id uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me  uuid := custom.query_principal();
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

drop function if exists custom._day_zone_uncached(uuid, uuid);
