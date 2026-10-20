-- target: production
-- additive: yes
-- guard: custom/system_enabled
-- lane: AT-FIX-H3
-- lock: custom
-- based-on: custom._schedules_stand_up(uuid, text, uuid) 542c50da2f89f057cd37a66b85723e2e6ef03bda5912acd0b0b648483c39a085
-- based-on: custom.automation_set_enabled(uuid, uuid, boolean) 31144061f0bcd2c879efbeb501e5553f3e4fe02e98f232175dae4075a06c18dd
--
-- AT-FIX-H3 2 - automation_restore brings the automation back SWITCHED OFF (the archive set it off), but its check
-- schedule came back ON, so the schedule ticked for an automation that was not running (its first tick saw the
-- automation off and removed itself). Now the schedule waits for the switch: custom._schedules_stand_up only brings a
-- schedule back when its automation is on (a base's snapshot schedule has no automation and is unchanged), and a
-- schedule that is still waiting keeps its stood_down_by_archive marker. Switching an automation on
-- (custom.automation_set_enabled) stands up exactly the schedules waiting for it, through
-- custom._schedules_stand_up_for_automation. custom._automation_is_on is the one question both ask.
CREATE FUNCTION custom._automation_is_on(p_organization_id uuid, p_automation_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
  -- true when the automation exists, is switched on and is not archived; false (never an error) for anything else
  select coalesce((
    select coalesce((x ->> 'enabled')::boolean, false) and nullif(x ->> 'archived_at', '') is null
      from custom._automation_home(p_organization_id, p_automation_id) h
      join custom.record r on r.organization_id = p_organization_id and r.id = h.table_id and r.table_id = custom.table_kernel_id()
      cross join lateral jsonb_array_elements(case when jsonb_typeof(r.data -> 'automations') = 'array' then r.data -> 'automations' else '[]'::jsonb end) x
     where x ->> 'id' = p_automation_id::text
     limit 1), false)
$function$;

CREATE OR REPLACE FUNCTION custom._schedules_stand_up(p_organization_id uuid, p_by text, p_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
-- The other half: restoring the thing turns back on exactly the schedules its archive turned off (those carrying its
-- stood_down_by_archive marker) and clears the marker. AT-FIX-H3: a schedule that belongs to an automation comes back
-- only when that automation is switched on; one still waiting keeps its marker and is stood up by the switch
-- (custom._schedules_stand_up_for_automation). A base's snapshot schedule has no automation and comes back at once.
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
       and (p_by = 'base'
            or custom._automation_is_on(p_organization_id, nullif(s.metadata ->> 'automation_app_trigger', '')::uuid))
    returning s.id),
  tr as (
    update scheduler.sch_trigger g
       set enabled = true, metadata = g.metadata - 'stood_down_by_archive'
     where g.organization_id = p_organization_id and g.deleted_at is null and not g.enabled
       and g.metadata -> 'stood_down_by_archive' ->> 'by' = p_by
       and g.metadata -> 'stood_down_by_archive' ->> 'id' = p_id::text
       and (p_by = 'base' or g.task_id in (select id from t))
    returning g.id)
  select count(*) into v_n from t;
  return v_n;
end
$function$;

CREATE FUNCTION custom._schedules_stand_up_for_automation(p_organization_id uuid, p_automation_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
-- Switching an automation on stands up the schedules that were waiting for it (an archive or a restore left them off
-- with the stood_down_by_archive marker). It does nothing when the automation is not on, or when the table it lives
-- on is archived (that table's own restore stands them up).
declare
  v_n     integer;
  v_table uuid;
begin
  if not coalesce((platform.knob_resolve('custom', 'system_enabled', p_organization_id) #>> '{}')::boolean, false) then
    return 0;
  end if;
  if not custom._automation_is_on(p_organization_id, p_automation_id) then
    return 0;
  end if;
  select h.table_id into v_table from custom._automation_home(p_organization_id, p_automation_id) h;
  if exists (select 1 from custom.record r where r.organization_id = p_organization_id and r.id = v_table and r.deleted_at is not null) then
    return 0;
  end if;
  with t as (
    update scheduler.sch_task s
       set enabled = true, metadata = s.metadata - 'stood_down_by_archive'
     where s.organization_id = p_organization_id and s.deleted_at is null and not s.enabled
       and s.metadata ? 'stood_down_by_archive'
       and s.metadata ->> 'automation_app_trigger' = p_automation_id::text
    returning s.id),
  tr as (
    update scheduler.sch_trigger g
       set enabled = true, metadata = g.metadata - 'stood_down_by_archive'
     where g.organization_id = p_organization_id and g.deleted_at is null and not g.enabled
       and g.metadata ? 'stood_down_by_archive'
       and g.task_id in (select id from t)
    returning g.id)
  select count(*) into v_n from t;
  return v_n;
end
$function$;

CREATE OR REPLACE FUNCTION custom.automation_set_enabled(p_organization_id uuid, p_automation_id uuid, p_enabled boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_r jsonb;
begin
  -- round 2 (AUTOMATIONS-AIRTABLE): switching it on clears the reason the store switched it off (a removed view).
  v_r := custom._automation_flip(p_organization_id, p_automation_id, 'custom.automation_set_enabled',
           jsonb_build_object('enabled', coalesce(p_enabled, false)),
           case when coalesce(p_enabled, false) then 'disabled_reason' end);
  -- AT-FIX-H3: switched on (and still on: a connected-app automation switched on by someone else is left off), the
  -- schedules waiting for it stand up.
  if coalesce((v_r ->> 'enabled')::boolean, false) then
    perform custom._schedules_stand_up_for_automation(p_organization_id, p_automation_id);
  end if;
  return v_r;
end
$function$;

insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values ('custom', '_automation_is_on', 'p_organization_id uuid, p_automation_id uuid', array['uuid'::regtype,'uuid'::regtype]::oid[],
  'Answers one yes/no about an automation (switched on and not archived) for the schedule helpers; it is called only from them and returns nothing else.',
  '20261020010000_atfixh3_b_a_restored_automations_schedule_waits_for_the_switch',
  'server_only: reached only from custom._schedules_stand_up and custom._schedules_stand_up_for_automation; no client calls it.',
  false, false);
insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values ('custom', '_schedules_stand_up_for_automation', 'p_organization_id uuid, p_automation_id uuid', array['uuid'::regtype,'uuid'::regtype]::oid[],
  'The organization and the automation are named by custom.automation_set_enabled, which already checked the caller''s rung on the table; the only effect is switching back on the schedules waiting (marked stood_down_by_archive) for that automation.',
  '20261020010000_atfixh3_b_a_restored_automations_schedule_waits_for_the_switch',
  'server_only: reached only from custom.automation_set_enabled; no client calls it.',
  false, false);
