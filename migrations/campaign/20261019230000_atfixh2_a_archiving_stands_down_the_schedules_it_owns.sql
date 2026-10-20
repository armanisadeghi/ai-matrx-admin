-- target: production
-- additive: yes
-- guard: custom/system_enabled
-- lane: AT-FIX-H2
-- lock: custom
-- based-on: custom.automation_archive(uuid, uuid) 68eae18a094c9244566a543fafe36e7c717ccad20415d39058dcfa56e2e8cfa8
-- based-on: custom.automation_restore(uuid, uuid) 75ec0f57f2fba692abcba0af496f4c7441ddff8d7c04297a87fa418c5ffa3129
-- based-on: custom._table_takes_what_is_built_on_it(uuid, uuid, uuid) 16b2a1dddec673b0b3496b9eae507b7b766ae0d5a0694b57285f0843ce38c865
-- based-on: custom._table_archive_reaches_what_is_built_on_it() 9b9c616fc3a8ffd5a894037d19fa3901d2a729d8998bd78ebd685f90e964c5db
--
-- AT-FIX-H2 1 - archiving an automation left its connected-app check schedule switched on (the schedule only noticed on
-- its next tick), and archiving a table or a base left the schedules of what it held on too. The ONE step is
-- custom._schedules_stand_down(org, by, id, at) (and custom._schedules_stand_up for the way back): the automation
-- archive door, the table archive (custom._table_takes_what_is_built_on_it, with its restore in the table trigger) and
-- the base archive (a trigger on custom.base) all call it. It writes down what it switched off, so a restore turns back
-- on exactly that and never a schedule that was already off. Template uninstall archives tables, so it is covered.
CREATE FUNCTION custom._schedules_stand_down(p_organization_id uuid, p_by text, p_id uuid, p_at timestamp with time zone DEFAULT now())
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
-- THE ONE STEP: archiving a thing switches off every schedule it owns and writes down what it switched off
-- (metadata.stood_down_by_archive = {by, id, at}) so custom._schedules_stand_up can bring exactly those back.
--   p_by 'automation': the connected-app check schedule of that automation (metadata.automation_app_trigger)
--   p_by 'table'     : the same, for every automation the table holds
--   p_by 'base'      : the base's snapshot schedule (metadata.base_snapshot)
-- A schedule that was already off is never touched, so a restore never turns on what was off before.
declare
  v_ids text[] := '{}';
  v_n   integer;
begin
  if not coalesce((platform.knob_resolve('custom', 'system_enabled', p_organization_id) #>> '{}')::boolean, false) then
    return 0;
  end if;
  if p_by not in ('automation', 'table', 'base') then
    raise exception 'custom._schedules_stand_down: unknown owner kind %', p_by using errcode = '22023';
  end if;
  if p_by = 'automation' then
    v_ids := array[p_id::text];
  elsif p_by = 'table' then
    select coalesce(array_agg(x ->> 'id'), '{}') into v_ids
      from custom.record r,
           jsonb_array_elements(case when jsonb_typeof(r.data -> 'automations') = 'array' then r.data -> 'automations' else '[]'::jsonb end) x
     where r.organization_id = p_organization_id and r.id = p_id and r.table_id = custom.table_kernel_id();
  end if;
  with t as (
    update scheduler.sch_task s
       set enabled = false,
           metadata = coalesce(s.metadata, '{}'::jsonb)
                      || jsonb_build_object('stood_down_by_archive', jsonb_build_object('by', p_by, 'id', p_id, 'at', p_at))
     where s.organization_id = p_organization_id and s.deleted_at is null and s.enabled
       and ((p_by = 'base' and s.metadata ->> 'base_snapshot' = p_id::text)
         or (p_by <> 'base' and s.metadata ->> 'automation_app_trigger' = any (v_ids)))
    returning s.id),
  tr as (
    update scheduler.sch_trigger g
       set enabled = false,
           metadata = coalesce(g.metadata, '{}'::jsonb)
                      || jsonb_build_object('stood_down_by_archive', jsonb_build_object('by', p_by, 'id', p_id, 'at', p_at))
     where g.task_id in (select id from t) and g.deleted_at is null and g.enabled
    returning g.id)
  select count(*) into v_n from t;
  return v_n;
end
$function$;

CREATE FUNCTION custom._schedules_stand_up(p_organization_id uuid, p_by text, p_id uuid)
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

insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values ('custom', '_schedules_stand_down', 'p_organization_id uuid, p_by text, p_id uuid, p_at timestamp with time zone', array['uuid'::regtype,'text'::regtype,'uuid'::regtype,'timestamptz'::regtype]::oid[],
  'The organization and the archived thing (automation, table or base) are named by the archive door that already checked the caller''s rung on it; the only effect is switching off the schedules that thing owns, with a marker so the restore turns back on exactly those.',
  '20261019230000_atfixh2_a_archiving_stands_down_the_schedules_it_owns',
  'server_only: reached only from the archive and restore doors of automations, tables and bases (and the base trigger); no client calls it.',
  false, false);
insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values ('custom', '_schedules_stand_up', 'p_organization_id uuid, p_by text, p_id uuid', array['uuid'::regtype,'text'::regtype,'uuid'::regtype]::oid[],
  'The organization and the restored thing are named by the restore door that already checked the caller''s rung on it; the only effect is switching back on the schedules carrying that thing''s own stand-down marker.',
  '20261019230000_atfixh2_a_archiving_stands_down_the_schedules_it_owns',
  'server_only: reached only from the archive and restore doors of automations, tables and bases (and the base trigger); no client calls it.',
  false, false);

CREATE FUNCTION custom._base_archive_moves_its_schedules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    perform custom._schedules_stand_down(new.organization_id, 'base', new.id, new.deleted_at);
  elsif old.deleted_at is not null and new.deleted_at is null then
    perform custom._schedules_stand_up(new.organization_id, 'base', new.id);
  end if;
  return null;
end
$function$;

insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values ('custom', '_base_archive_moves_its_schedules', '', array[]::oid[],
  'Trigger function on custom.base (AFTER UPDATE OF deleted_at); never called directly, and it only calls the two schedule helpers for the base row that just changed.',
  '20261019230000_atfixh2_a_archiving_stands_down_the_schedules_it_owns',
  'server_only: reached only from the archive and restore doors of automations, tables and bases (and the base trigger); no client calls it.',
  false, false);

CREATE TRIGGER zz_at_fix_h2_base_archive_moves_its_schedules AFTER UPDATE OF deleted_at ON custom.base
  FOR EACH ROW WHEN ((old.deleted_at IS NULL) <> (new.deleted_at IS NULL))
  EXECUTE FUNCTION custom._base_archive_moves_its_schedules();

CREATE OR REPLACE FUNCTION custom._table_takes_what_is_built_on_it(p_organization_id uuid, p_table_id uuid, p_event uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  -- THE TABLE'S OWN MOMENT when it already carries one (a writer that archived it first — the trigger
  -- below); otherwise now(), which is the value custom.record_delete writes right after calling this.
  v_now timestamptz := coalesce((select r.deleted_at from custom.record r
                                  where r.organization_id = p_organization_id and r.id = p_table_id), now());
  v_on  jsonb := '[]'::jsonb;
  v_n   integer := 0;
  v_k   integer;
begin
  with g as (
    update custom.anon_form f set deleted_at = v_now
     where f.organization_id = p_organization_id and f.table_id = p_table_id and f.deleted_at is null
    returning f.id)
  select v_on || coalesce(jsonb_agg(jsonb_build_object('kind', 'anon_form', 'id', g.id, 'at', v_now)), '[]'::jsonb), count(*)
    into v_on, v_k from g;
  v_n := v_n + v_k;
  with g as (
    update custom.anon_inbound i set deleted_at = v_now
     where i.organization_id = p_organization_id and i.table_id = p_table_id and i.deleted_at is null
    returning i.id)
  select v_on || coalesce(jsonb_agg(jsonb_build_object('kind', 'anon_inbound', 'id', g.id, 'at', v_now)), '[]'::jsonb), count(*)
    into v_on, v_k from g;
  v_n := v_n + v_k;
  with g as (
    update platform.saved_view v set deleted_at = v_now
     where v.organization_id = p_organization_id and v.subject_id = p_table_id and v.deleted_at is null
    returning v.id)
  select v_on || coalesce(jsonb_agg(jsonb_build_object('kind', 'saved_view', 'id', g.id, 'at', v_now)), '[]'::jsonb), count(*)
    into v_on, v_k from g;
  v_n := v_n + v_k;
  with g as (
    update custom.portal p
       set archived_at = v_now, archived_by = custom.query_principal(), archive_reason = 'Its table was archived.'
     where p.organization_id = p_organization_id and p.client_table_id = p_table_id and p.archived_at is null
    returning p.id)
  select v_on || coalesce(jsonb_agg(jsonb_build_object('kind', 'portal', 'id', g.id, 'at', v_now)), '[]'::jsonb), count(*)
    into v_on, v_k from g;
  v_n := v_n + v_k;
  -- AT-FIX-H2: the table's automations own connected-app check schedules; they stand down with it (restored by the trigger below).
  perform custom._schedules_stand_down(p_organization_id, 'table', p_table_id, v_now);
  if v_n > 0 and p_event is not null then
    update history.migration_log m
       set inverse = m.inverse || jsonb_build_object('built_on', coalesce(m.inverse -> 'built_on', '[]'::jsonb) || v_on)
     where m.organization_id = p_organization_id and m.id = p_event;
  end if;
  return v_n;
end;
$function$;

CREATE OR REPLACE FUNCTION custom._table_archive_reaches_what_is_built_on_it()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_n    integer;
  v_kind text;
  v_id   uuid;
begin
  if old.deleted_at is not null and new.deleted_at is null then
    -- AT-FIX-H2: whatever stood down with the table's automations comes back to its prior state, by ANY restore path.
    perform custom._schedules_stand_up(new.organization_id, 'table', new.id);
  end if;
  if old.deleted_at is null and new.deleted_at is not null then
    -- ARCHIVE, by any writer. An open archive event (custom.table_archive's) gets the list written to it.
    v_n := custom._table_takes_what_is_built_on_it(new.organization_id, new.id,
             nullif(current_setting('custom.archive_event', true), '')::uuid);
    if v_n > 0 then
      raise notice '[table-archive] custom.record % archived; % thing(s) built on it followed at %',
        new.id, v_n, new.deleted_at;
    end if;
    return null;
  end if;

  -- RESTORE by a writer other than the event-driven restore, which brings back its own `built_on` list.
  if old.deleted_at is not null and new.deleted_at is null
     and coalesce(current_setting('history.mark_verb', true), '') <> 'undo of archive' then
    for v_kind, v_id in
      select 'anon_form', f.id from custom.anon_form f
       where f.organization_id = new.organization_id and f.table_id = new.id and f.deleted_at = old.deleted_at
      union all
      select 'anon_inbound', i.id from custom.anon_inbound i
       where i.organization_id = new.organization_id and i.table_id = new.id and i.deleted_at = old.deleted_at
      union all
      select 'saved_view', v.id from platform.saved_view v
       where v.organization_id = new.organization_id and v.subject_id = new.id and v.deleted_at = old.deleted_at
      union all
      select 'portal', p.id from custom.portal p
       where p.organization_id = new.organization_id and p.client_table_id = new.id
         and p.archived_at = old.deleted_at and p.archive_reason = 'Its table was archived.'
    loop
      begin
        if v_kind = 'anon_form' then
          update custom.anon_form set deleted_at = null where organization_id = new.organization_id and id = v_id;
        elsif v_kind = 'anon_inbound' then
          update custom.anon_inbound set deleted_at = null where organization_id = new.organization_id and id = v_id;
        elsif v_kind = 'saved_view' then
          update platform.saved_view set deleted_at = null where organization_id = new.organization_id and id = v_id;
        else
          update custom.portal set archived_at = null, archived_by = null, archive_reason = null
           where organization_id = new.organization_id and id = v_id;
        end if;
      exception when unique_violation then
        raise notice '[table-restore] custom.record % restored; its % % stays archived — a live one took its name meanwhile',
          new.id, v_kind, v_id;
      end;
    end loop;
  end if;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.automation_archive(p_organization_id uuid, p_automation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_r jsonb;
begin
  v_r := custom._automation_flip(p_organization_id, p_automation_id, 'custom.automation_archive',
           jsonb_build_object('archived_at', now(), 'enabled', false));
  -- AT-FIX-H2: the schedule it owns stands down with it.
  perform custom._schedules_stand_down(p_organization_id, 'automation', p_automation_id, now());
  return v_r;
end
$function$;

CREATE OR REPLACE FUNCTION custom.automation_restore(p_organization_id uuid, p_automation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_r jsonb;
begin
  v_r := custom._automation_flip(p_organization_id, p_automation_id, 'custom.automation_restore', '{}'::jsonb, 'archived_at');
  perform custom._schedules_stand_up(p_organization_id, 'automation', p_automation_id);
  return v_r;
end
$function$;
