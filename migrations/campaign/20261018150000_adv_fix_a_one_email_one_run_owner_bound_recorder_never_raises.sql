-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: ADV-FIX-A
-- lock: custom,platform
-- based-on: custom.automation_app_watch(uuid) 5ca0db2ee19c8d3b352bf7b4c65398bbfab41b227a474985fb020afbbabac7f0
-- based-on: custom.automation_app_event(uuid, jsonb, jsonb) a0e6a9b3ff7cb1c2a92a96ea7f6895cdd55599913ba23245e50713d70b318bb5
-- based-on: custom.automation_declare(uuid, uuid, jsonb, uuid) 3ed0afeccb644326e2316179f58d1964e5b901b40a749453add0860d0987304f
--
-- ADV-FIX-A (close-out adversarial review ADV-1, findings F1, F2, F3, F5; F9 was already fixed live by
-- 20261018140000_mswrite_a, whose _automation_advance carries the GitHub waiting sentence).
-- 1. ONE EMAIL, ONE RUN. custom.automation_app_event takes the automation's advisory lock (the same key the server's
--    check and schedule mirror take) and the table row FOR UPDATE, re-reads the automation, and starts nothing for an
--    item id it has already seen; the cursor is merged (furthest point, seen ids union, newest 500), never overwritten.
-- 2. OWNER-BOUND. Saving a connected-app automation by anyone but its owner re-binds it to the saver (app_owner), drops
--    the old cursor, switches it off and says so; automation_app_watch reports that owner. New server-only door
--    custom.automation_app_may_edit answers the schedule-mirror route: a member of the organization at the table's
--    editor level (the switch's own rung).
-- 3. OWNER LEFT. automation_app_watch answers owner_member; automation_app_event switches the automation off with the
--    reason when the owner is no longer a member; new server-only door custom.automation_app_stop does the same for the
--    server when the connection is gone.
-- (F5, the error recorder, is its own header-less file: 20261018150100_adv_fix_a_the_error_recorder_never_raises.sql.)
CREATE OR REPLACE FUNCTION custom.automation_app_watch(p_automation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_org uuid; v_table uuid; v_item jsonb; v_owner text;
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
  -- ADV-FIX-A 2: the account read is the app_owner's (whoever last saved a connected-app automation), else its creator.
  v_owner := coalesce(nullif(v_item ->> 'app_owner', ''), nullif(v_item ->> 'created_by', ''), nullif(v_item ->> 'updated_by', ''));
  return jsonb_build_object('automation_id', p_automation_id, 'table_id', v_table, 'organization_id', v_org,
           'owner', v_owner,
           -- ADV-FIX-A 5: an owner who left the organization is never read for it.
           'owner_member', v_owner ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                           and coalesce(iam.has_org_access_for(v_owner::uuid, v_org), false),
           'name', v_item -> 'spec' -> 'name', 'trigger', v_item -> 'spec' -> 'trigger',
           'enabled', coalesce((v_item ->> 'enabled')::boolean, false) and (v_item ->> 'archived_at') is null,
           'cursor', coalesce(v_item -> 'app_cursor', 'null'::jsonb));
end
$function$;

CREATE FUNCTION custom.automation_app_stop(p_automation_id uuid, p_says text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_watch jsonb;
begin
  v_watch := custom.automation_app_watch(p_automation_id);  -- trusted backend only
  if v_watch is null then
    return jsonb_build_object('ok', false, 'says', 'There is no such automation.');
  end if;
  -- ADV-FIX-A 5: the owner left or the connection is gone: switched off, and why, on the automation.
  perform custom._automation_app_patch((v_watch ->> 'table_id')::uuid, p_automation_id,
            jsonb_build_object('enabled', false, 'app_checked_at', now(), 'app_stopped_at', now(),
                               'app_says', left(coalesce(nullif(btrim(coalesce(p_says, '')), ''), 'Switched off.'), 600)));
  return jsonb_build_object('ok', true, 'stopped', true);
end
$function$;

CREATE FUNCTION custom.automation_app_may_edit(p_automation_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_watch jsonb;
begin
  v_watch := custom.automation_app_watch(p_automation_id);  -- trusted backend only
  if v_watch is null or p_user_id is null then
    return false;
  end if;
  -- ADV-FIX-A 2: the schedule mirror asks the same two questions the switch does: a member of the automation's
  -- organization, holding the editor level on its table (custom._automation_flip's rung). Nothing wider, nothing tighter.
  return coalesce(iam.has_org_access_for(p_user_id, (v_watch ->> 'organization_id')::uuid), false)
     and coalesce(custom.effective_level(p_user_id, (v_watch ->> 'organization_id')::uuid, (v_watch ->> 'table_id')::uuid, 'record')
                  >= 'editor'::public.permission_level, false);
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
  v_old   jsonb;
  v_seen  jsonb;
  v_key   text;
  v_skip  integer := 0;
  v_cur   jsonb;
  v_says  text;
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
  -- ADV-FIX-A 1: ONE hand-in per automation at a time (the same key the server's check and schedule mirror take),
  -- the table row locked, then the automation read AGAIN so the cursor and seen ids are the last committed ones.
  perform pg_advisory_xact_lock(hashtextextended('automation-app-trigger:' || p_automation_id::text, 0));
  perform 1 from custom.record t where t.id = v_table for update;
  v_watch := custom.automation_app_watch(p_automation_id);
  if v_watch is null then
    return jsonb_build_object('ok', false, 'says', 'There is no such connected-app automation.');
  end if;
  select x2 into v_item from custom.record t, jsonb_array_elements(t.data -> 'automations') x2
   where t.id = v_table and x2 ->> 'id' = p_automation_id::text;
  v_old := case when jsonb_typeof(v_item -> 'app_cursor') = 'object' then v_item -> 'app_cursor' else '{}'::jsonb end;
  v_seen := case when jsonb_typeof(v_old -> 'seen') = 'array' then v_old -> 'seen' else '[]'::jsonb end;
  -- ADV-FIX-A 5: an owner who is no longer a member is never read or run for: switched off, and why.
  if not coalesce((v_watch ->> 'owner_member')::boolean, false) then
    v_says := 'Switched off: its owner is no longer a member of this organization, so their account is not read. Someone in the organization can save it again to have it read their own account.';
    perform custom._automation_app_patch(v_table, p_automation_id,
              jsonb_build_object('enabled', false, 'app_checked_at', now(), 'app_stopped_at', now(), 'app_says', v_says));
    return jsonb_build_object('ok', false, 'stopped', true, 'ran', 0, 'says', v_says);
  end if;
  if not (v_watch ->> 'enabled')::boolean then
    perform custom._automation_app_patch(v_table, p_automation_id, jsonb_build_object('app_cursor', p_cursor, 'app_checked_at', now()));
    return jsonb_build_object('ok', true, 'ran', 0, 'says', 'This automation is switched off; nothing ran.');
  end if;
  v_who := (v_watch ->> 'owner')::uuid;
  for x in select e from jsonb_array_elements(p_items) e loop
    -- ADV-FIX-A 1: an item this automation has already seen (a second check of the same mail) starts nothing.
    v_key := coalesce(x ->> 'id', x ->> 'ts');
    if v_key is not null and v_seen @> jsonb_build_array(v_key) then
      v_skip := v_skip + 1;
      continue;
    end if;
    if v_key is not null then
      v_seen := v_seen || jsonb_build_array(v_key);
    end if;
    v_held := current_setting('request.jwt.claims', true);
    perform set_config('request.jwt.claims', jsonb_build_object('sub', v_who, 'role', 'authenticated')::text, true);
    v_run := custom._automation_run(v_org, v_table, null, v_item, '{}'::jsonb, custom._automation_fields(v_org, v_table), null,
               jsonb_build_object('on', v_on, 'operation', 'app', 'via', v_on, 'changed_field_ids', '[]'::jsonb, 'body', x));
    perform set_config('request.jwt.claims', coalesce(v_held, ''), true);
    v_runs := v_runs || to_jsonb(v_run);
  end loop;
  -- Only now the checker's own seen ids join (they already name this batch, so merging them first would drop it).
  if jsonb_typeof(p_cursor -> 'seen') = 'array' then
    v_seen := v_seen || coalesce((select jsonb_agg(sv) from jsonb_array_elements(p_cursor -> 'seen') s(sv) where not v_seen @> jsonb_build_array(sv)), '[]'::jsonb);
  end if;
  -- The cursor is MERGED, never overwritten backwards: the furthest point either check reached, and every seen id
  -- (the newest 500 kept).
  v_cur := coalesce(case when jsonb_typeof(p_cursor) = 'object' then p_cursor end, '{}'::jsonb);
  if v_old ? 'after' and v_cur ? 'after' and (v_old ->> 'after')::numeric > (v_cur ->> 'after')::numeric then
    v_cur := v_cur || jsonb_build_object('after', v_old -> 'after');
  end if;
  if v_old ? 'ts' and v_cur ? 'ts' and (v_old ->> 'ts')::numeric > (v_cur ->> 'ts')::numeric then
    v_cur := v_cur || jsonb_build_object('ts', v_old -> 'ts');
  end if;
  if v_old ? 'through' and v_cur ? 'through' and (v_old ->> 'through')::timestamptz > (v_cur ->> 'through')::timestamptz then
    v_cur := v_cur || jsonb_build_object('through', v_old -> 'through');
  end if;
  if v_old ? 'since' and v_cur ? 'since' and (v_old ->> 'since')::timestamptz > (v_cur ->> 'since')::timestamptz then
    v_cur := v_cur || jsonb_build_object('since', v_old -> 'since');
  end if;
  if jsonb_array_length(v_seen) > 0 then
    v_cur := v_cur || jsonb_build_object('seen', coalesce((select jsonb_agg(s order by n) from jsonb_array_elements(v_seen) with ordinality a(s, n)
                                                            where n > jsonb_array_length(v_seen) - 500), '[]'::jsonb));
  end if;
  perform custom._automation_app_patch(v_table, p_automation_id,
            jsonb_build_object('app_cursor', v_cur, 'app_checked_at', now(), 'app_says', null)
            || case when jsonb_array_length(v_runs) > 0 then jsonb_build_object('app_sample', jsonb_build_object('body', p_items -> -1, 'at', now())) else '{}'::jsonb end);
  return jsonb_build_object('ok', true, 'ran', jsonb_array_length(v_runs), 'run_ids', v_runs, 'skipped', v_skip);
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
  -- ADV-FIX-A 2: a connected-app automation reads its OWNER's account. Saved by anyone else, it re-binds to the person
  -- who saved it (their own connection, never the previous owner's), starts watching afresh, and is switched off.
  v_prev_owner text;
  v_rebound    boolean := false;
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
      if (v_check -> 'spec' -> 'trigger' ->> 'on') in ('gmail_received', 'calendar_event', 'slack_message') and v_me is not null then
        v_prev_owner := coalesce(nullif(e ->> 'app_owner', ''), nullif(e ->> 'created_by', ''), nullif(e ->> 'updated_by', ''));
        if v_prev_owner is distinct from v_me::text then
          v_rebound := true;
          v_item := (v_item - 'app_cursor' - 'app_sample')
                    || jsonb_build_object('app_owner', v_me, 'enabled', false, 'app_checked_at', now(),
                         'app_says', 'Saved by someone other than its owner, so it now reads the account of the person who saved it and was switched off. Switch it on to start it.');
        end if;
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
         || case when v_rebound then jsonb_build_object('ai_on_schedule', true, 'rebound', true,
                   'says', 'Saved by someone other than its owner, so it now reads your own connected account, not theirs, and was switched off. Switch it on to start it.')
                 when v_ai_sched then jsonb_build_object('ai_on_schedule', true,
                   'says', case when (v_check -> 'spec' -> 'trigger' ->> 'on') in ('gmail_received', 'calendar_event', 'slack_message')
                                then 'It checks a connected account every few minutes, so it is saved switched off. Switch it on to start it.'
                                when (v_check -> 'spec' -> 'trigger' ->> 'every') in ('minutes', 'hour')
                                then 'It runs every few minutes or hours, so it is saved switched off. Switch it on to start it.'
                                else 'It runs an agent, a script, an email or a text on a schedule, so it is saved switched off. Switch it on to start it.' end)
                 else '{}'::jsonb end;
end
$function$;

INSERT INTO platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers) VALUES
 ('custom', 'automation_app_stop', 'p_automation_id uuid, p_says text', ARRAY['uuid'::regtype, 'text'::regtype]::oid[],
  'p_automation_id is checked through custom.automation_app_watch (trusted backend only, unknown id answers ok=false).',
  '20261018150000_adv_fix_a_one_email_one_run_owner_bound_recorder_never_raises.sql',
  'server_only: aidream''s connected-app trigger check switches an automation off when its owner''s connection is gone; a browser never calls it.', false, false),
 ('custom', 'automation_app_may_edit', 'p_automation_id uuid, p_user_id uuid', ARRAY['uuid'::regtype, 'uuid'::regtype]::oid[],
  'p_automation_id is checked through custom.automation_app_watch (trusted backend only); p_user_id is the signed-in caller the server asks about.',
  '20261018150000_adv_fix_a_one_email_one_run_owner_bound_recorder_never_raises.sql',
  'server_only: aidream''s schedule-mirror route asks whether its caller may flip this automation; a browser never calls it.', false, false);
