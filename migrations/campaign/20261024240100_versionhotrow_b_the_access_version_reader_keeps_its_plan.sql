-- chair-step: replaces custom._access_versions in place (same answer; plpgsql so its plan is kept across calls)
-- additive: yes
-- guard: custom/system_enabled
-- lane: VERSION-HOTROW
-- lock: custom
-- based-on: custom._access_versions(uuid) ec4956ebe6f43599e8719088fbd025134e8e05ac2ceebf843c8ecaa819c53e40
--
-- VERSION-HOTROW b — THE ACCESS VERSION READER KEEPS ITS PLAN.
-- After a, custom._access_versions (LANGUAGE sql with a SET clause, so never inlined) was planned again on every call:
-- live, 100 calls took ~103 ms against ~10 ms before a (four sub-selects with two counts instead of two key lookups).
-- The same expression in plpgsql keeps its plan for the session (clone, 100 calls: sql 15.7 ms, plpgsql 4.1 ms, the
-- pre-a body 8.3 ms). The answer is unchanged: base row (1 when absent) + the events the caller's snapshot sees.
-- Inverse: migrations/inverse/20261024240100_versionhotrow_b_the_access_version_reader_keeps_its_plan_down.sql
CREATE OR REPLACE FUNCTION custom._access_versions(p_org uuid)
 RETURNS bigint[]
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
begin
  return array[coalesce((select v.version from custom.access_version v where v.organization_id = p_org), 1)
                 + (select count(*) from custom.access_version_event e where e.organization_id = p_org),
               coalesce((select v.version from custom.access_version v
                          where v.organization_id = '00000000-0000-0000-0000-000000000000'::uuid), 1)
                 + (select count(*) from custom.access_version_event e
                     where e.organization_id = '00000000-0000-0000-0000-000000000000'::uuid)];
end;
$function$;
