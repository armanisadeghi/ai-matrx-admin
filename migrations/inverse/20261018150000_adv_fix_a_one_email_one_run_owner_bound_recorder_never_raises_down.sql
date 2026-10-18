-- chair-step: undo ADV-FIX-A's store half: restore the connected-app watch, event and declare bodies it replaced, and drop its two server-only doors (automation_app_stop, automation_app_may_edit)
-- inverse of 20261018150000_adv_fix_a_one_email_one_run_owner_bound_recorder_never_raises.sql
-- lane: ADV-FIX-A
-- lock: custom,platform
-- based-on: custom.automation_app_watch(uuid) 1bc861cedac750a633de86972c20c74332e381e71e5cc01ba218560a6f159578
-- based-on: custom.automation_app_event(uuid, jsonb, jsonb) 59f943bed201c009e1415c04bd42015e76119fa533fc616c9b864025bbaadaae
-- based-on: custom.automation_declare(uuid, uuid, jsonb, uuid) 7876adc1d25734f2a7d5bfa82d40305eb4da9d87ece4fdcea0943a03ddc7c458
CREATE OR REPLACE FUNCTION custom.automation_app_watch(p_automation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_org uuid; v_table uuid; v_item jsonb;
begin
  if auth.uid() is not null or not iam.is_trusted_backend() then
    raise exception 'Only the platform server checks connected accounts.' using errcode = '42501';
  end if;
  select t.organization_id, t.id, x into v_org, v_table, v_item
    from custom.record t, jsonb_array_elements(t.data -> 'automations') x
   where t.data_class = 'table' and t.deleted_at is null and t.table_id = custom.table_kernel_id()
     and t.data -> 'automations' @> jsonb_build_array(jsonb_build_object('id', p_automation_id::text))
     and x ->> 'id' = p_automation_id::text
   limit 1;
  if v_item is null then
    return null;
  end if;
  return jsonb_build_object('automation_id', p_automation_id, 'table_id', v_table, 'organization_id', v_org,
           'owner', coalesce(nullif(v_item ->> 'created_by', ''), nullif(v_item ->> 'updated_by', '')),
           'name', v_item -> 'spec' -> 'name', 'trigger', v_item -> 'spec' -> 'trigger',
           'enabled', coalesce((v_item ->> 'enabled')::boolean, false) and (v_item ->> 'archived_at') is null,
           'cursor', coalesce(v_item -> 'app_cursor', 'null'::jsonb));
end
$function$;

CREATE OR REPLACE FUNCTION custom.automation_app_event(p_automation_id uuid, p_items jsonb, p_cursor jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_watch jsonb;
  v_org   uuid;
  v_table uuid;
  v_item  jsonb;
  v_who   uuid;
  v_held  text;
  v_run   uuid;
  v_runs  jsonb := '[]'::jsonb;
  v_on    text;
  x       jsonb;
begin
  v_watch := custom.automation_app_watch(p_automation_id);
  v_on := v_watch -> 'trigger' ->> 'on';
  if v_watch is null or v_on not in ('gmail_received', 'calendar_event', 'slack_message') then
    return jsonb_build_object('ok', false, 'says', 'There is no such connected-app automation.');
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 25 then
    return jsonb_build_object('ok', false, 'says', 'Hand at most 25 items at a time.');
  end if;
  v_org := (v_watch ->> 'organization_id')::uuid;
  v_table := (v_watch ->> 'table_id')::uuid;
  if not (v_watch ->> 'enabled')::boolean then
    perform custom._automation_app_patch(v_table, p_automation_id, jsonb_build_object('app_cursor', p_cursor, 'app_checked_at', now()));
    return jsonb_build_object('ok', true, 'ran', 0, 'says', 'This automation is switched off; nothing ran.');
  end if;
  select x2 into v_item from custom.record t, jsonb_array_elements(t.data -> 'automations') x2
   where t.id = v_table and x2 ->> 'id' = p_automation_id::text;
  v_who := (v_watch ->> 'owner')::uuid;
  for x in select e from jsonb_array_elements(p_items) e loop
    v_held := current_setting('request.jwt.claims', true);
    perform set_config('request.jwt.claims', jsonb_build_object('sub', v_who, 'role', 'authenticated')::text, true);
    v_run := custom._automation_run(v_org, v_table, null, v_item, '{}'::jsonb, custom._automation_fields(v_org, v_table), null,
               jsonb_build_object('on', v_on, 'operation', 'app', 'via', v_on, 'changed_field_ids', '[]'::jsonb, 'body', x));
    perform set_config('request.jwt.claims', coalesce(v_held, ''), true);
    v_runs := v_runs || to_jsonb(v_run);
  end loop;
  perform custom._automation_app_patch(v_table, p_automation_id,
            jsonb_build_object('app_cursor', p_cursor, 'app_checked_at', now(), 'app_says', null)
            || case when jsonb_array_length(p_items) > 0 then jsonb_build_object('app_sample', jsonb_build_object('body', p_items -> -1, 'at', now())) else '{}'::jsonb end);
  return jsonb_build_object('ok', true, 'ran', jsonb_array_length(v_runs), 'run_ids', v_runs);
end
$function$;

CREATE OR REPLACE FUNCTION custom.automation_declare(p_organization_id uuid, p_table_id uuid, p_spec jsonb, p_automation_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_doc    jsonb;
  v_check  jsonb;
  v_list   jsonb;
  v_item   jsonb;
  v_id     uuid;
  v_found  boolean := false;
  v_new    jsonb := '[]'::jsonb;
  e        jsonb;
  v_me     uuid := custom.query_principal();
  v_dup    jsonb;
  -- AUTOMATIONS-AIRTABLE (2026-10-10): AI ON A SCHEDULE IS SAVED SWITCHED OFF (Arman's standing rule): an automation
  -- whose trigger is a time (date arrives / every…) and which has an agent step is stored off, and switching it on is
  -- its own explicit act (custom.automation_set_enabled). Editing one INTO that shape switches it off too.
  v_ai_sched boolean;
  v_was_ai   boolean;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.automation_declare');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.automation_declare');
  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.automation_declare',
                                          'admin'::public.permission_level, 'table');
  select t.data into v_doc from custom.record t
   where t.organization_id = p_organization_id and t.id = p_table_id
     and t.table_id = custom.table_kernel_id() and t.deleted_at is null
   for update;
  if not found then
    raise exception 'That table is not in this organization, so it has no automations to change.'
      using errcode = '23503', hint = 'REC-29: organizations are hard walls. Nothing was written.';
  end if;

  v_check := custom._automation_check_timed(p_organization_id, p_table_id, p_spec);
  if v_check ? '_errors' then
    return jsonb_build_object('ok', false, '_errors', v_check -> '_errors');
  end if;

  -- AT-AUTO2 (2026-10-15): a script is paid work like an agent, so a script on a time is saved off too; and a schedule
  -- that runs every N minutes or hours is saved off whatever its steps (no blind paid automations): switching it on is
  -- the person's own act.
  v_ai_sched := ((v_check -> 'spec' -> 'trigger' ->> 'on') in ('date_arrives', 'schedule')
                 and jsonb_path_exists(v_check -> 'spec', '$.actions.** ? (@.do == "agent" || @.do == "script" || @.do == "run_mandate" || @.do == "gmail" || @.do == "sms" || @.do == "google_calendar_event" || @.do == "github_issue" || @.do == "outlook_mail" || @.do == "outlook_calendar_event" || @.do == "teams_message")'))
                or coalesce((v_check -> 'spec' -> 'trigger' ->> 'every') in ('minutes', 'hour'), false)
                -- W2-E: a connected-app trigger checks the person's account on a schedule: saved off, switching it on is theirs.
                or coalesce((v_check -> 'spec' -> 'trigger' ->> 'on') in ('gmail_received', 'calendar_event', 'slack_message'), false);

  v_list := case when jsonb_typeof(v_doc -> 'automations') = 'array' then v_doc -> 'automations' else '[]'::jsonb end;
  -- MAKE-AUTODUP: declaring the same automation again (same judged spec, not archived) answers the one already
  -- there instead of storing a second; a template installed twice into a reused table keeps one reminder.
  if p_automation_id is null then
    select x into v_dup from jsonb_array_elements(v_list) x
     where x -> 'spec' = v_check -> 'spec' and nullif(x ->> 'archived_at', '') is null
     order by x ->> 'created_at' limit 1;
    if v_dup is not null then
      return jsonb_build_object('ok', true, 'automation_id', (v_dup ->> 'id')::uuid, 'table_id', p_table_id,
               'enabled', coalesce((v_dup ->> 'enabled')::boolean, true), 'spec', v_dup -> 'spec', 'reused', true);
    end if;
  end if;
  v_id := coalesce(p_automation_id, gen_random_uuid());

  for e in select x from jsonb_array_elements(v_list) x loop
    if e ->> 'id' = v_id::text then
      v_found := true;
      v_item := e || jsonb_build_object('spec', v_check -> 'spec', 'updated_at', now(), 'updated_by', v_me);
      v_was_ai := ((e -> 'spec' -> 'trigger' ->> 'on') in ('date_arrives', 'schedule')
                   and jsonb_path_exists(e -> 'spec', '$.actions.** ? (@.do == "agent" || @.do == "script" || @.do == "run_mandate" || @.do == "gmail" || @.do == "sms" || @.do == "google_calendar_event" || @.do == "github_issue" || @.do == "outlook_mail" || @.do == "outlook_calendar_event" || @.do == "teams_message")'))
                  or coalesce((e -> 'spec' -> 'trigger' ->> 'every') in ('minutes', 'hour'), false)
                  or coalesce((e -> 'spec' -> 'trigger' ->> 'on') in ('gmail_received', 'calendar_event', 'slack_message'), false);
      if v_ai_sched and not coalesce(v_was_ai, false) then
        v_item := v_item || jsonb_build_object('enabled', false);
      end if;
      if v_check -> 'spec' -> 'trigger' ->> 'on' = 'webhook' and coalesce(v_item ->> 'webhook_secret', '') = '' then
        v_item := v_item || jsonb_build_object('webhook_secret', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));
      end if;
      v_new := v_new || jsonb_build_array(v_item);
    else
      v_new := v_new || jsonb_build_array(e);
    end if;
  end loop;
  if p_automation_id is not null and not v_found then
    raise exception 'There is no such automation on this table.'
      using errcode = '23503', hint = 'It may belong to another table or organization. Nothing was changed.';
  end if;
  if not v_found then
    if jsonb_array_length(v_list) >= 50 then
      return jsonb_build_object('ok', false, '_errors', jsonb_build_object('automations', 'A table has at most 50 automations; archive one first.'));
    end if;
    v_item := jsonb_strip_nulls(jsonb_build_object('id', v_id, 'spec', v_check -> 'spec', 'enabled', not v_ai_sched,
                'created_at', now(), 'created_by', v_me, 'updated_at', now(), 'updated_by', v_me,
                'webhook_secret', case when v_check -> 'spec' -> 'trigger' ->> 'on' = 'webhook'
                                       then replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '') end));
    v_new := v_new || jsonb_build_array(v_item);
  end if;

  update custom.record set data = jsonb_set(data, '{automations}', v_new, true)
   where organization_id = p_organization_id and id = p_table_id and table_id = custom.table_kernel_id();
  -- AT-AUTO2: EVERY SAVE IS A VERSION (custom.automation_revisions lists them, custom.automation_revision_restore
  -- declares one again).
  insert into custom.record (organization_id, table_id, data_class, data)
  values (p_organization_id, null, 'automation_revision', jsonb_build_object('automation_id', v_id, 'table_id', p_table_id,
            'spec', v_check -> 'spec', 'enabled', coalesce((v_item ->> 'enabled')::boolean, true), 'at', clock_timestamp(), 'by', v_me,
            'note', case when v_found then 'edited' else 'created' end));

  return jsonb_build_object('ok', true, 'automation_id', v_id, 'table_id', p_table_id,
           'enabled', coalesce((v_item ->> 'enabled')::boolean, true), 'spec', v_check -> 'spec')
         || case when v_ai_sched then jsonb_build_object('ai_on_schedule', true,
                   'says', case when (v_check -> 'spec' -> 'trigger' ->> 'on') in ('gmail_received', 'calendar_event', 'slack_message')
                                then 'It checks a connected account every few minutes, so it is saved switched off. Switch it on to start it.'
                                when (v_check -> 'spec' -> 'trigger' ->> 'every') in ('minutes', 'hour')
                                then 'It runs every few minutes or hours, so it is saved switched off. Switch it on to start it.'
                                else 'It runs an agent, a script, an email or a text on a schedule, so it is saved switched off. Switch it on to start it.' end)
                 else '{}'::jsonb end;
end
$function$;

DELETE FROM platform.client_callable_door WHERE schema_name = 'custom' AND function_name IN ('automation_app_stop', 'automation_app_may_edit');
DROP FUNCTION IF EXISTS custom.automation_app_stop(uuid, text);
DROP FUNCTION IF EXISTS custom.automation_app_may_edit(uuid, uuid);
