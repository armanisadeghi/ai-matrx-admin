-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: ADV-FIX-A
-- lock: custom,platform,ops
-- based-on: custom.automation_app_watch(uuid) 5ca0db2ee19c8d3b352bf7b4c65398bbfab41b227a474985fb020afbbabac7f0
-- based-on: custom.automation_app_event(uuid, jsonb, jsonb) a0e6a9b3ff7cb1c2a92a96ea7f6895cdd55599913ba23245e50713d70b318bb5
-- based-on: custom.automation_declare(uuid, uuid, jsonb, uuid) 889bea05db4da73a0349c1645265a587adb21bccb5ba6bfe83f1293faf164b8e
-- based-on: custom._automation_advance(uuid) c572d529d57cf52b612fc499556d35bd40aa70ce7f91ea9af175e8bf10cd7f95
-- based-on: ops.record_system_error(jsonb) 3782a4291f6c31324ef5e8ff5dc82bd4d22180f879fc794144c2c9ca074ff539
--
-- ADV-FIX-A (close-out adversarial review ADV-1, findings F1, F2, F3, F5, F9).
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
-- 4. THE ERROR RECORDER NEVER RAISES. Every uuid/time conversion of ops.record_system_error runs inside a protected
--    block; an unconvertible value is stored as null and kept in context.unconvertible; the stand-in keeps its sender.
-- 5. A waiting GitHub step says it is opening the GitHub issue.
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
     and coalesce(custom.has_visibility(p_user_id, 'record', (v_watch ->> 'table_id')::uuid, 'editor'::public.permission_level), false);
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
                 and jsonb_path_exists(v_check -> 'spec', '$.actions.** ? (@.do == "agent" || @.do == "script" || @.do == "run_mandate" || @.do == "gmail" || @.do == "sms" || @.do == "google_calendar_event" || @.do == "github_issue")'))
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
                   and jsonb_path_exists(e -> 'spec', '$.actions.** ? (@.do == "agent" || @.do == "script" || @.do == "run_mandate" || @.do == "gmail" || @.do == "sms" || @.do == "google_calendar_event" || @.do == "github_issue")'))
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

CREATE OR REPLACE FUNCTION custom._automation_advance(p_run_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_plan    jsonb;
  c_max_steps constant integer := 500;
  c_max_items constant integer := 200;
  v_org    uuid;
  d        jsonb;
  st       jsonb;
  ctx      jsonb;
  stack    jsonb;
  fr       jsonb;
  act      jsonb;
  r        jsonb;
  v_do     text;
  v_n      integer;
  v_top    integer;
  v_k      integer;
  v_steps  jsonb;
  v_status text;
  v_says   text;
  v_auto   jsonb;
  v_table  uuid;
  v_rid    uuid;
  v_fields jsonb;
  v_byid   jsonb;
  v_trig   jsonb;
  v_change uuid;
  v_total  integer;
  v_wait   boolean := false;
  v_entry  jsonb;
  v_msg    text;
  v_hint   text;
  v_list   jsonb;
  b        jsonb;
  v_pick   jsonb;
  v_label  text;
  v_bi     integer;
  v_tf     jsonb;
  v_recs   jsonb;
  v_cand   uuid;
  v_vals   jsonb;
  v_lim    integer;
  v_cnt    integer;
  v_ids    uuid[];
  v_tbl    uuid;
  v_patch  jsonb;
  k        text;
  v        jsonb;
  v_field  jsonb;
  v_me     uuid;
  v_owner  uuid;
  v_addr   text;
  v_outp   jsonb;
  v_pend   jsonb;
  v_depth  integer := coalesce(nullif(current_setting('custom.automation_depth', true), '')::integer, 0);
begin
  select x.organization_id, x.data into v_org, d from custom.record x
   where x.id = p_run_id and x.data_class = 'automation_run' and x.deleted_at is null for update;
  if d is null or d -> 'state' is null then
    return d ->> 'status';
  end if;
  st := d -> 'state';
  ctx := coalesce(st -> 'ctx', '{}'::jsonb);
  stack := coalesce(st -> 'stack', '[]'::jsonb);
  v_steps := coalesce(d -> 'steps', '[]'::jsonb);
  v_status := coalesce(st ->> 'status', 'ran');
  v_says := coalesce(st ->> 'says', 'Every step finished.');
  v_auto := st -> 'automation';
  v_table := (d ->> 'table_id')::uuid;
  v_rid := nullif(d ->> 'record_id', '')::uuid;
  v_byid := coalesce(st -> 'byid', '{}'::jsonb);
  v_trig := d -> 'trigger';
  v_change := nullif(d ->> 'change_id', '')::uuid;
  v_total := coalesce((st ->> 'total')::integer, 0);
  v_fields := custom._automation_fields(v_org, v_table);
  perform set_config('custom.automation_depth', (v_depth + 1)::text, true);

  <<run>>
  loop
    exit when v_status = 'failed' or jsonb_array_length(stack) = 0;
    v_top := jsonb_array_length(stack) - 1;
    fr := stack -> v_top;
    if (fr ->> 'i')::integer >= jsonb_array_length(fr -> 'acts') then
      if fr ? 'list' and (fr ->> 'k')::integer + 1 < jsonb_array_length(fr -> 'list') then
        v_k := (fr ->> 'k')::integer + 1;
        stack := jsonb_set(stack, array[v_top::text], fr || jsonb_build_object('k', v_k, 'i', 0));
        ctx := ctx || jsonb_build_object('item', fr -> 'list' -> v_k, 'index', v_k);
      else
        if fr ? 'list' then
          ctx := ctx || jsonb_build_object('item', coalesce(fr -> 'saved_item', 'null'::jsonb), 'index', coalesce(fr -> 'saved_index', 'null'::jsonb));
        end if;
        stack := stack - v_top;
      end if;
      continue;
    end if;
    act := fr -> 'acts' -> ((fr ->> 'i')::integer);
    stack := jsonb_set(stack, array[v_top::text, 'i'], to_jsonb((fr ->> 'i')::integer + 1));
    v_total := v_total + 1;
    v_n := (act ->> '_n')::integer;
    v_do := act ->> 'do';
    if v_total > c_max_steps then
      v_status := 'failed';
      v_says := format('Stopped after %s steps in one run: a repeating group is too long. Narrow the list it repeats over.', c_max_steps);
      exit;
    end if;
    v_entry := null;
    begin
      if v_do = 'if' then
        v_pick := null;
        v_bi := 0;
        for b in select e from jsonb_array_elements(coalesce(act -> 'branches', '[]'::jsonb)) e loop
          v_bi := v_bi + 1;
          if custom._automation_when(custom._automation_tok(b -> 'when', ctx)) then
            v_pick := coalesce(b -> 'actions', '[]'::jsonb);
            v_label := coalesce(nullif(b ->> 'label', ''), 'path ' || v_bi);
            exit;
          end if;
        end loop;
        if v_pick is null and act ? 'else' then
          v_pick := act -> 'else';
          v_label := 'otherwise';
        end if;
        if v_pick is null then
          v_entry := jsonb_build_object('says', 'No condition was met, so no path ran.', 'output', jsonb_build_object('path', null));
        else
          stack := stack || jsonb_build_array(jsonb_build_object('acts', v_pick, 'i', 0));
          v_entry := jsonb_build_object('says', format('Took the "%s" path.', v_label), 'output', jsonb_build_object('path', v_label));
        end if;

      elsif v_do = 'for_each' then
        v_list := custom._automation_tok(act -> 'list', ctx);
        if jsonb_typeof(v_list) = 'object' and jsonb_typeof(v_list -> 'records') = 'array' then
          v_list := v_list -> 'records';
        end if;
        if v_list is null or jsonb_typeof(v_list) = 'null' then
          v_list := '[]'::jsonb;
        end if;
        if jsonb_typeof(v_list) <> 'array' then
          raise exception 'The list to repeat over is not a list (it is %).', jsonb_typeof(v_list) using errcode = '22023';
        end if;
        if jsonb_array_length(v_list) > c_max_items then
          raise exception 'The list has % items; a repeating group takes at most %.', jsonb_array_length(v_list), c_max_items using errcode = '22023';
        end if;
        if jsonb_array_length(v_list) = 0 then
          v_entry := jsonb_build_object('says', 'The list was empty, so nothing repeated.', 'output', jsonb_build_object('count', 0));
        else
          stack := stack || jsonb_build_array(jsonb_build_object('acts', coalesce(act -> 'actions', '[]'::jsonb), 'i', 0,
                     'list', v_list, 'k', 0, 'saved_item', coalesce(ctx -> 'item', 'null'::jsonb), 'saved_index', coalesce(ctx -> 'index', 'null'::jsonb)));
          ctx := ctx || jsonb_build_object('item', v_list -> 0, 'index', 0);
          v_entry := jsonb_build_object('says', format('Repeating for %s item%s.', jsonb_array_length(v_list),
                       case when jsonb_array_length(v_list) = 1 then '' else 's' end), 'output', jsonb_build_object('count', jsonb_array_length(v_list)));
        end if;

      elsif v_do = 'find' then
        r := custom._automation_tok(act - 'where', ctx);
        v_tbl := (r ->> 'table_id')::uuid;
        v_tf := custom._automation_fields(v_org, v_tbl);
        v_lim := least(greatest(coalesce((r ->> 'limit')::integer, 50), 1), 200);
        v_recs := '[]'::jsonb;
        v_cnt := 0;
        v_plan := custom.choice_render_plan(v_org, v_tbl);
        for v_cand in select x.id from custom.record x
                       where x.organization_id = v_org and x.table_id = v_tbl
                         and x.data_class = 'record' and x.deleted_at is null
                       order by x.created_at limit 5000 loop
          exit when v_cnt >= v_lim;
          v_vals := custom.record_values(v_org, v_cand);
          continue when v_vals is null;
          if jsonb_typeof(act -> 'where') = 'object' and not coalesce(custom._fx_truthy(custom.rule_eval(v_org,
               custom._automation_bind(custom._automation_tok(act -> 'where', ctx), v_byid), v_vals,
               coalesce(custom.rule_context(v_org, v_cand), '{}'::jsonb)
                 || jsonb_build_object('fx_self_id', v_cand, 'fx_table_id', v_tbl))), false) then
            continue;
          end if;
          -- AT-AUTO3: a choice reads as its LABEL ("VIP") wherever a later step or a person sees it; the stored key stays
          -- in the filter above and in the record's own storage.
          v_vals := custom.choice_render_with(v_org, v_tbl, v_vals, v_plan) - '_choices';
          select jsonb_build_object('id', v_cand) || v_vals
                 || coalesce(jsonb_object_agg(f.key, coalesce(v_vals -> (f.value ->> 'key'), 'null'::jsonb)), '{}'::jsonb)
            into v_vals from jsonb_each(v_tf) f;
          v_recs := v_recs || jsonb_build_array(v_vals);
          v_cnt := v_cnt + 1;
        end loop;
        v_entry := jsonb_build_object('says', format('Found %s record%s.', v_cnt, case when v_cnt = 1 then '' else 's' end),
                     'found', v_cnt,
                     'output', jsonb_build_object('records', v_recs, 'count', v_cnt,
                                 'first', coalesce(v_recs -> 0, 'null'::jsonb),
                                 'ids', coalesce((select jsonb_agg(e -> 'id') from jsonb_array_elements(v_recs) e), '[]'::jsonb)));

      elsif v_do = 'archive' then
        r := custom._automation_tok(act, ctx);
        v_ids := custom._automation_ids(r -> 'record');
        if cardinality(v_ids) > c_max_items then
          raise exception 'That names % records; one step archives at most %.', cardinality(v_ids), c_max_items using errcode = '22023';
        end if;
        v_cnt := 0;
        foreach v_cand in array v_ids loop
          if not exists (select 1 from custom.record x where x.organization_id = v_org and x.id = v_cand
                           and x.data_class = 'record' and x.deleted_at is null
                           and (r ->> 'table_id' is null or x.table_id = (r ->> 'table_id')::uuid)) then
            continue;
          end if;
          perform custom.record_delete(v_org, v_cand);
          v_cnt := v_cnt + 1;
        end loop;
        v_entry := jsonb_build_object('says', format('Archived %s record%s (restorable).', v_cnt, case when v_cnt = 1 then '' else 's' end),
                     'edited', v_cnt, 'output', jsonb_build_object('archived', v_cnt));

      elsif v_do = 'update' then
        r := custom._automation_tok(act, ctx);
        v_tbl := (r ->> 'table_id')::uuid;
        v_tf := custom._automation_fields(v_org, v_tbl);
        v_ids := custom._automation_ids(r -> 'record');
        if cardinality(v_ids) > c_max_items then
          raise exception 'That names % records; one step updates at most %.', cardinality(v_ids), c_max_items using errcode = '22023';
        end if;
        v_me := custom.query_principal();
        v_patch := '{}'::jsonb;
        for k, v in select key, value from jsonb_each(coalesce(r -> 'values', '{}'::jsonb)) loop
          v_field := v_tf -> k;
          if v_field is null then
            raise exception 'A property this step sets is gone, so it cannot run until it is edited.' using errcode = '23503';
          end if;
          v_patch := v_patch || jsonb_build_object(v_field ->> 'key',
                       custom._action_coerce(v_field, custom._automation_value(v, v_byid, v_me), v_org));
        end loop;
        v_cnt := 0;
        foreach v_cand in array v_ids loop
          continue when not exists (select 1 from custom.record x where x.organization_id = v_org and x.id = v_cand
                                      and x.table_id = v_tbl and x.data_class = 'record' and x.deleted_at is null);
          perform custom.record_update(v_org, v_cand, v_patch);
          v_cnt := v_cnt + 1;
        end loop;
        v_entry := jsonb_build_object('says', format('Updated %s record%s.', v_cnt, case when v_cnt = 1 then '' else 's' end),
                     'edited', v_cnt, 'output', jsonb_build_object('updated', v_cnt));

      elsif v_do in ('script', 'run_mandate', 'gmail', 'sms', 'google_calendar_event', 'github_issue') then
        -- THE SERVER RUNS IT: the run waits here, its place saved, until custom.automation_resume answers.
        r := custom._automation_tok(act, ctx);
        v_wait := true;
        v_pend := jsonb_build_object('n', v_n, 'do', v_do, 'act', r - '_n', 'index', ctx -> 'index', 'queued_at', now(), 'attempts', 0);
        v_steps := v_steps || jsonb_build_array(jsonb_build_object('n', v_n, 'do', v_do, 'status', 'waiting',
                     'says', case v_do when 'script' then 'Waiting for the server to run the script.' when 'run_mandate' then 'Waiting for the agent to answer.' when 'gmail' then 'Waiting for the server to send the email.' when 'sms' then 'Waiting for the server to send the text.' when 'github_issue' then 'Waiting for the server to open the GitHub issue.' else 'Waiting for the server to change the calendar event.' end) || case when ctx ? 'index' and ctx -> 'index' <> 'null'::jsonb
                     then jsonb_build_object('index', ctx -> 'index') else '{}'::jsonb end);
        exit run;

      elsif v_do = 'agent' then
        v_steps := v_steps || jsonb_build_array(jsonb_build_object('n', v_n, 'do', 'agent', 'status', 'waiting',
                     'says', 'Waiting for a person: an agent''s changes are confirmed by a person. Open this record''s chat to ask it.',
                     'prompt', custom._automation_tok(act -> 'prompt', ctx)));
        if v_status = 'ran' then
          v_status := 'waiting';
          v_says := 'Waiting for a person to run the agent step.';
        end if;
        continue;

      else
        v_entry := custom._automation_step(v_org, v_table, v_rid, v_auto, v_byid, v_fields, v_change, v_trig, v_n,
                     custom._automation_tok(act - '_n', ctx));
      end if;
      v_outp := coalesce(v_entry -> 'output', '{}'::jsonb);
      v_entry := jsonb_build_object('n', v_n, 'do', v_do, 'status', 'done') || (v_entry - 'output')
                 || case when ctx ? 'index' and ctx -> 'index' <> 'null'::jsonb and v_do <> 'for_each'
                         then jsonb_build_object('index', ctx -> 'index') else '{}'::jsonb end;
      v_steps := v_steps || jsonb_build_array(v_entry);
      ctx := ctx || jsonb_build_object('step' || v_n, v_outp);
    exception when others then
      get stacked diagnostics v_msg = message_text, v_hint = pg_exception_hint;
      v_steps := v_steps || jsonb_build_array(jsonb_build_object('n', v_n, 'do', v_do, 'status', 'failed',
                   'says', v_msg, 'hint', v_hint) || case when ctx ? 'index' and ctx -> 'index' <> 'null'::jsonb
                   then jsonb_build_object('index', ctx -> 'index') else '{}'::jsonb end);
      v_status := 'failed';
      v_says := format('Step %s did not run: %s', v_n, v_msg);
      exit run;
    end;
  end loop;
  perform set_config('custom.automation_depth', v_depth::text, true);

  if v_wait then
    d := d || jsonb_build_object('status', 'waiting', 'says', format('Waiting for the server to run step %s (%s).', v_n, v_do),
               'steps', v_steps, 'pending', v_pend,
               'state', (d -> 'state') || jsonb_build_object('ctx', ctx, 'stack', stack, 'total', v_total,
                                                             'status', v_status, 'says', v_says));
    update custom.record set data = d where id = p_run_id;
    return 'waiting';
  end if;

  d := (d - 'state' - 'pending') || jsonb_build_object('status', v_status, 'says', v_says, 'steps', v_steps,
         'finished_at', clock_timestamp());
  update custom.record set data = d where id = p_run_id;

  -- A FAILED RUN TELLS ITS OWNER: the failing step and its words, opening the run (never for a test run).
  if v_status = 'failed' and coalesce(v_trig ->> 'on', '') <> 'test' then
    v_owner := coalesce(nullif(v_auto ->> 'created_by', '')::uuid, nullif(v_auto ->> 'updated_by', '')::uuid);
    if v_owner is not null then
      begin
        select ra.address into v_addr from communication.resolve_channel_address('email', v_org, 'user', v_owner, null, null, null) ra limit 1;
        perform communication.notify_from_sql(v_org, 'records.changed', v_owner, v_addr, null,
                  jsonb_build_object('notice', jsonb_build_object(
                    'subject', format('Automation "%s" failed', left(coalesce(v_auto -> 'spec' ->> 'name', 'automation'), 80)),
                    'body', left(v_says, 600))),
                  '/data/' || v_table::text || '?automation=' || (v_auto ->> 'id') || '&run=' || p_run_id::text,
                  'custom.record', p_run_id, 'automation-failed:' || p_run_id::text);
      exception when others then
        raise warning 'custom._automation_advance: failed-run notice for % not sent: %', p_run_id, sqlerrm;
      end;
    end if;
  end if;
  return v_status;
end
$function$;

CREATE OR REPLACE FUNCTION ops.record_system_error(p_error jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_e    jsonb := coalesce(p_error, '{}'::jsonb);
  v_uid  uuid := auth.uid();
  v_user uuid;
  v_org  uuid;
  v_oin  uuid;
  v_ctx  jsonb;
  v_id   uuid;
  v_why  text;
  v_sys  uuid;
  v_app  text;
  v_given uuid;
  v_conv  uuid;
  v_agent uuid;
  v_by    uuid;
  v_at    timestamptz;
  v_bad   jsonb := '{}'::jsonb;
  c_uuid  constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  k       text;
begin
  -- ADV-FIX-A 3: EVERY conversion of the caller's text happens here, protected, and never raises. A value that is not
  -- a uuid (or not a time) is stored as null and kept, as written, in context.unconvertible.<key>; the error itself is
  -- still recorded, and a caller's transaction is never aborted by the recorder.
  begin
    v_ctx := case when jsonb_typeof(v_e->'context') = 'object' then v_e->'context' else '{}'::jsonb end;
    foreach k in array array['organization_id', 'occurred_in_organization_id', 'user_id', 'id', 'conversation_id', 'agent_id', 'created_by'] loop
      if nullif(v_e->>k, '') is not null and not ((v_e->>k) ~ c_uuid) then
        v_bad := v_bad || jsonb_build_object(k, left(v_e->>k, 200));
      end if;
    end loop;
    if nullif(v_e->>'occurred_at', '') is not null then
      begin
        v_at := (v_e->>'occurred_at')::timestamptz;
      exception when others then
        v_bad := v_bad || jsonb_build_object('occurred_at', left(v_e->>'occurred_at', 200));
      end;
    end if;
    if v_bad <> '{}'::jsonb then
      v_ctx := v_ctx || jsonb_build_object('unconvertible', v_bad);
    end if;
    select s.organization_id into v_sys from iam.system_orgs s where s.key = 'system';
    v_org   := case when not v_bad ? 'organization_id' then nullif(v_e->>'organization_id', '')::uuid end;
    v_oin   := coalesce(case when not v_bad ? 'occurred_in_organization_id' then nullif(v_e->>'occurred_in_organization_id', '')::uuid end, v_org);
    if v_oin = v_sys then v_oin := null; end if;
    v_user  := case when not v_bad ? 'user_id' then nullif(v_e->>'user_id', '')::uuid end;
    v_conv  := case when not v_bad ? 'conversation_id' then nullif(v_e->>'conversation_id', '')::uuid end;
    v_agent := case when not v_bad ? 'agent_id' then nullif(v_e->>'agent_id', '')::uuid end;
    v_by    := case when not v_bad ? 'created_by' then nullif(v_e->>'created_by', '')::uuid end;
    v_given := case when not v_bad ? 'id' then nullif(v_e->>'id', '')::uuid end;
  exception when others then
    v_ctx := coalesce(v_ctx, '{}'::jsonb) || jsonb_build_object('unconvertible_refusal', sqlstate || ': ' || sqlerrm);
  end;
  if v_uid is not null and v_user is not null and v_user is distinct from v_uid then
    v_ctx := v_ctx || jsonb_build_object('declared_user_id', v_user);
    v_user := v_uid;
  end if;
  -- A reference that points at nothing is stored as null and NOTED, never refused.
  if v_user is not null and not exists (select 1 from iam.users u where u.id = v_user) then
    v_ctx := v_ctx || jsonb_build_object('unknown_user_id', v_user);
    v_user := null;
  end if;
  if v_oin is not null and not exists (select 1 from iam.organizations o where o.id = v_oin) then
    v_ctx := v_ctx || jsonb_build_object('unknown_organization_id', v_oin);
    v_oin := null;
  end if;
  v_app := v_e->>'source_app';
  if v_app in ('claude-code', 'codex', 'cursor', 'vscode') then
    v_ctx := v_ctx || jsonb_build_object('refused_source_app', v_app);
    v_app := null;
  end if;
  v_given := coalesce(v_given, gen_random_uuid());
  if exists (select 1 from ops.system_error x where x.id = v_given) then
    v_ctx := v_ctx || jsonb_build_object('original_id', v_given);
    v_given := gen_random_uuid();
  end if;
  begin
    insert into ops.system_error (id, kind, request_id, user_id, conversation_id, agent_id, source_app, route,
                                  error_type, error_text, traceback, payload, context, occurred_at,
                                  organization_id, occurred_in_organization_id, created_by, metadata, source_feature)
    values (v_given,
            coalesce(nullif(v_e->>'kind', ''), 'unclassified'),
            v_e->>'request_id', v_user,
            v_conv, v_agent,
            v_app, v_e->>'route', v_e->>'error_type',
            coalesce(nullif(v_e->>'error_text', ''), '(no message)'),
            v_e->>'traceback', v_e->'payload', v_ctx,
            coalesce(v_at, now()),
            v_sys, v_oin,
            coalesce(v_by, v_uid, v_user),
            case when jsonb_typeof(v_e->'metadata') = 'object' then v_e->'metadata' else '{}'::jsonb end,
            v_e->>'source_feature')
    returning id into v_id;
  exception when others then
    v_why := sqlstate || ': ' || sqlerrm;
    begin
      insert into ops.system_error (kind, error_type, error_text, source_app, source_feature, route, context, organization_id,
                                    occurred_in_organization_id, created_by)
      values ('system_error_write_refused', 'record_system_error',
              'An error could not be recorded as written (' || v_why || '). What it said is kept in context.original.',
              'database', 'provenance', 'ops.record_system_error',
              jsonb_build_object('original', v_e, 'refusal', v_why),
              v_sys, v_oin, (select u.id from iam.users u where u.id = v_uid))
      returning id into v_id;
    exception when others then
      raise warning 'ops.record_system_error could not store even the stand-in row: %: %', sqlstate, sqlerrm;
      v_id := null;
    end;
  end;
  return v_id;
end $function$;

INSERT INTO platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers) VALUES
 ('custom', 'automation_app_stop', 'p_automation_id uuid, p_says text', ARRAY['uuid'::regtype, 'text'::regtype]::oid[],
  'p_automation_id is checked through custom.automation_app_watch (trusted backend only, unknown id answers ok=false).',
  '20261018150000_adv_fix_a_one_email_one_run_owner_bound_recorder_never_raises.sql',
  'server_only: aidream''s connected-app trigger check switches an automation off when its owner''s connection is gone; a browser never calls it.', false, false),
 ('custom', 'automation_app_may_edit', 'p_automation_id uuid, p_user_id uuid', ARRAY['uuid'::regtype, 'uuid'::regtype]::oid[],
  'p_automation_id is checked through custom.automation_app_watch (trusted backend only); p_user_id is the signed-in caller the server asks about.',
  '20261018150000_adv_fix_a_one_email_one_run_owner_bound_recorder_never_raises.sql',
  'server_only: aidream''s schedule-mirror route asks whether its caller may flip this automation; a browser never calls it.', false, false);
