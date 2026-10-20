-- chair-step: the inverse of VERSION-HOTROW b — custom._access_versions is the LANGUAGE sql body of VERSION-HOTROW a again
-- lane: VERSION-HOTROW
-- based-on: custom._access_versions(uuid) fe43ebe75435f01df8c10d2468da205b5ff9629bbfcbbed7b8f87925918b74dc
-- Inverse of migrations/campaign/20261024240100_versionhotrow_b_the_access_version_reader_keeps_its_plan.sql
CREATE OR REPLACE FUNCTION custom._access_versions(p_org uuid)
 RETURNS bigint[]
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select array[coalesce((select v.version from custom.access_version v where v.organization_id = p_org), 1)
                 + (select count(*) from custom.access_version_event e where e.organization_id = p_org),
               coalesce((select v.version from custom.access_version v
                          where v.organization_id = '00000000-0000-0000-0000-000000000000'::uuid), 1)
                 + (select count(*) from custom.access_version_event e
                     where e.organization_id = '00000000-0000-0000-0000-000000000000'::uuid)]
$function$;
