-- chair-step: undo FIX-AUTO's store half: restore the connected-app note, event and flip bodies it replaced, and drop its cursor-merge helper and the server-only send-mark door (custom.automation_step_mark)
-- inverse of 20261018233700_fix_auto_cursor_merge_owner_switch_off_check_send_once.sql
-- lane: FIX-AUTO
-- lock: custom,platform
-- BASED-ON-HERE
CREATE OR REPLACE FUNCTION custom.automation_app_note(p_automation_id uuid, p_says text, p_cursor jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_watch jsonb;
begin
  v_watch := custom.automation_app_watch(p_automation_id);
  if v_watch is null then
    return jsonb_build_object('ok', false, 'says', 'There is no such automation.');
  end if;
  -- the sentence a person reads on the automation (a missing or expired connection); null clears it
  perform custom._automation_app_patch((v_watch ->> 'table_id')::uuid, p_automation_id,
            jsonb_build_object('app_checked_at', now(), 'app_says', left(nullif(btrim(coalesce(p_says, '')), ''), 600))
            || case when p_cursor is not null then jsonb_build_object('app_cursor', p_cursor) else '{}'::jsonb end);
  return jsonb_build_object('ok', true);
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

CREATE OR REPLACE FUNCTION custom._automation_flip(p_organization_id uuid, p_automation_id uuid, p_door text, p_patch jsonb, p_strip text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_table uuid;
  v_doc   jsonb;
  e       jsonb;
  v_new   jsonb := '[]'::jsonb;
  v_item  jsonb;
begin
  perform custom.assert_store_door(p_organization_id, p_door);
  perform custom.assert_client_may_reach(p_organization_id, p_door);
  select h.table_id into v_table from custom._automation_home(p_organization_id, p_automation_id) h;
  if v_table is null then
    raise exception 'There is no such automation here.'
      using errcode = '23503', hint = 'It may have been removed, or it belongs to another organization. Nothing was changed.';
  end if;
  perform custom.assert_client_may_change(p_organization_id, v_table, p_door, 'editor'::public.permission_level, 'table');
  select t.data into v_doc from custom.record t
   where t.organization_id = p_organization_id and t.id = v_table and t.table_id = custom.table_kernel_id() for update;
  for e in select x from jsonb_array_elements(v_doc -> 'automations') x loop
    if e ->> 'id' = p_automation_id::text then
      v_item := (case when p_strip is null then e else e - p_strip end)
                || p_patch || jsonb_build_object('updated_at', now(), 'updated_by', custom.query_principal());
      v_new := v_new || jsonb_build_array(v_item);
    else
      v_new := v_new || jsonb_build_array(e);
    end if;
  end loop;
  update custom.record set data = jsonb_set(data, '{automations}', v_new, true)
   where organization_id = p_organization_id and id = v_table and table_id = custom.table_kernel_id();
  return jsonb_build_object('ok', true, 'automation_id', p_automation_id, 'table_id', v_table,
           'enabled', coalesce((v_item ->> 'enabled')::boolean, false), 'archived_at', v_item -> 'archived_at');
end
$function$;

DELETE FROM platform.client_callable_door WHERE schema_name = 'custom' AND function_name = 'automation_step_mark';
DROP FUNCTION IF EXISTS custom.automation_step_mark(uuid, integer, text, jsonb);
DROP FUNCTION IF EXISTS custom._automation_app_cursor_merge(jsonb, jsonb);
