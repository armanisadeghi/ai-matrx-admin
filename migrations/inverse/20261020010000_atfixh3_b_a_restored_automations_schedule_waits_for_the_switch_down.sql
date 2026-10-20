-- inverse of 20261020010000_atfixh3_b_a_restored_automations_schedule_waits_for_the_switch: puts the two prior bodies back, then drops the helpers.
-- chair-step: AT-FIX-H3 undo - a restored automation's schedule comes back on at once again.
CREATE OR REPLACE FUNCTION custom.automation_set_enabled(p_organization_id uuid, p_automation_id uuid, p_enabled boolean)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
  -- round 2 (AUTOMATIONS-AIRTABLE): switching it on clears the reason the store switched it off (a removed view).
  select custom._automation_flip(p_organization_id, p_automation_id, 'custom.automation_set_enabled',
           jsonb_build_object('enabled', coalesce(p_enabled, false)),
           case when coalesce(p_enabled, false) then 'disabled_reason' end);
$function$;

CREATE OR REPLACE FUNCTION custom._schedules_stand_up(p_organization_id uuid, p_by text, p_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
-- The other half: restoring the thing turns back on exactly the schedules its archive turned off (those carrying its
-- stood_down_by_archive marker) and clears the marker.
declare
  v_n integer;
begin
  if not coalesce((platform.knob_resolve('custom', 'system_enabled', p_organization_id) #>> '{}')::boolean, false) then
    return 0;
  end if;
  with t as (
    update scheduler.sch_task s
       set enabled = true, metadata = s.metadata - 'stood_down_by_archive'
     where s.organization_id = p_organization_id and s.deleted_at is null and not s.enabled
       and s.metadata -> 'stood_down_by_archive' ->> 'by' = p_by
       and s.metadata -> 'stood_down_by_archive' ->> 'id' = p_id::text
    returning s.id),
  tr as (
    update scheduler.sch_trigger g
       set enabled = true, metadata = g.metadata - 'stood_down_by_archive'
     where g.organization_id = p_organization_id and g.deleted_at is null and not g.enabled
       and g.metadata -> 'stood_down_by_archive' ->> 'by' = p_by
       and g.metadata -> 'stood_down_by_archive' ->> 'id' = p_id::text
    returning g.id)
  select count(*) into v_n from t;
  return v_n;
end
$function$;

DROP FUNCTION IF EXISTS custom._schedules_stand_up_for_automation(uuid, uuid);
DROP FUNCTION IF EXISTS custom._automation_is_on(uuid, uuid);
delete from platform.client_callable_door where declared_by = '20261020010000_atfixh3_b_a_restored_automations_schedule_waits_for_the_switch';
