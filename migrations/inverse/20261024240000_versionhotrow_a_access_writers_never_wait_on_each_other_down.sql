-- chair-step: the inverse of VERSION-HOTROW a — the access version is one row per organization updated in place again
-- lane: VERSION-HOTROW
-- allows: revoke custom
-- based-on: custom._access_version_bump(uuid) 9f773efcb8021f389301cf3c01edfac0af8874c1972a4465764c587050d2cd1b
-- based-on: custom._access_versions(uuid) ec4956ebe6f43599e8719088fbd025134e8e05ac2ceebf843c8ecaa819c53e40
-- Inverse of migrations/campaign/20261024240000_versionhotrow_a_access_writers_never_wait_on_each_other.sql
-- The log is folded into the base rows first, and every base row moves one step past base + events, so no stamp kept
-- under the event versions can ever match a version again (a version must never step back onto a kept stamp).
-- The event table is locked first so no event lands between the fold and the drop (access writers wait for this
-- transaction only).
set local lock_timeout = '5s';
lock table custom.access_version_event in exclusive mode;
insert into custom.access_version as v (organization_id, version, bumped_at)
select e.organization_id, 2 + count(*), now() from custom.access_version_event e group by e.organization_id
on conflict (organization_id) do update set version = v.version + excluded.version - 1, bumped_at = now();
update custom.access_version set version = version + 1, bumped_at = now()
 where organization_id not in (select distinct organization_id from custom.access_version_event);

CREATE OR REPLACE FUNCTION custom._access_version_bump(p_org uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_seen text := coalesce(current_setting('mx.access_bumped', true), '');
  v_tag  text := pg_current_xact_id()::text || ':' || coalesce(p_org, '00000000-0000-0000-0000-000000000000'::uuid)::text;
begin
  -- once per transaction per organization: what a reader sees changes at commit, so one bump is enough
  if position(v_tag in v_seen) > 0 then
    return;
  end if;
  insert into custom.access_version as v (organization_id, version, bumped_at)
  values (coalesce(p_org, '00000000-0000-0000-0000-000000000000'::uuid), 2, now())
  on conflict (organization_id) do update set version = v.version + 1, bumped_at = now();
  perform set_config('mx.access_bumped', right(v_seen, 4000) || ' ' || v_tag, true);
end;
$function$;

CREATE OR REPLACE FUNCTION custom._access_versions(p_org uuid)
 RETURNS bigint[]
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select array[coalesce((select v.version from custom.access_version v where v.organization_id = p_org), 1),
               coalesce((select v.version from custom.access_version v
                          where v.organization_id = '00000000-0000-0000-0000-000000000000'::uuid), 1)]
$function$;

DROP FUNCTION custom._access_version_fold(uuid);
delete from platform.entity_types where token = 'access_version_event';
DROP TABLE custom.access_version_event;
