-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: FIX-AUTO
-- lock: custom,platform
-- based-on: custom.automation_app_note(uuid, text, jsonb) 392f0343de548c0eba3d05349d5bd3356ad93eed2dcef0250cca562954962daf
-- based-on: custom.automation_app_event(uuid, jsonb, jsonb) 59f943bed201c009e1415c04bd42015e76119fa533fc616c9b864025bbaadaae
-- based-on: custom._automation_flip(uuid, uuid, text, jsonb, text) da8989a2d72c059161b4fc043c2539aad8de56e9c685a5e7a0d628c4ca1a48b6
--
-- FIX-AUTO (close-out adversarial review ADV-2, findings A1, A2, A3 store half, B1 store half).
-- A1 ONE CURSOR MERGE. custom.automation_app_note takes the automation's advisory lock and the table row, and a cursor
--    it is handed is MERGED with the stored one through the same rule automation_app_event uses (new helper
--    custom._automation_app_cursor_merge: furthest after/ts/through/since, seen ids union, newest 500), never
--    overwritten. A "Nothing new" write clears the stored sentence only when the stored cursor was not ahead of it, so a
--    fresher note another check wrote stays.
-- A2 SWITCHED ON BY SOMEONE ELSE. custom._automation_flip: switching a connected-app automation ON by anyone but its
--    owner re-binds it to that person (app_owner), drops the old cursor, leaves it off and says so — the same behaviour
--    automation_declare has on save. The owner's account is never read or billed by another person's switch.
-- A3 SWITCHED OFF. automation_app_event's switched-off arm no longer moves the cursor (items handed in while off are not
--    consumed) and answers ok=false with the sentence, so the server refuses instead of reporting "started 0 runs".
-- B1 SEND ONCE. New server-only door custom.automation_step_mark(run, n, state, output) records on the waiting run's
--    pending step that a send step is sending / sent / failed; the claim already hands `pending` back on a re-claim, so
--    the worker never sends twice.

CREATE FUNCTION custom._automation_app_cursor_merge(p_old jsonb, p_new jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_old  jsonb := case when jsonb_typeof(p_old) = 'object' then p_old else '{}'::jsonb end;
  v_cur  jsonb := case when jsonb_typeof(p_new) = 'object' then p_new else '{}'::jsonb end;
  v_seen jsonb;
begin
  -- The furthest point either side reached, never backwards.
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
  -- Every seen id: the stored ones first, then the new side's ids not already there; the newest 500 kept.
  v_seen := case when jsonb_typeof(v_old -> 'seen') = 'array' then v_old -> 'seen' else '[]'::jsonb end;
  if jsonb_typeof(v_cur -> 'seen') = 'array' then
    v_seen := v_seen || coalesce((select jsonb_agg(sv) from jsonb_array_elements(v_cur -> 'seen') s(sv)
                                   where not v_seen @> jsonb_build_array(sv)), '[]'::jsonb);
  end if;
  if jsonb_array_length(v_seen) > 0 then
    v_cur := v_cur || jsonb_build_object('seen', coalesce((select jsonb_agg(s order by n) from jsonb_array_elements(v_seen) with ordinality a(s, n)
                                                            where n > jsonb_array_length(v_seen) - 500), '[]'::jsonb));
  end if;
  return v_cur;
end
$function$;

CREATE OR REPLACE FUNCTION custom.automation_app_note(p_automation_id uuid, p_says text, p_cursor jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_watch jsonb;
  v_table uuid;
  v_item  jsonb;
  v_old   jsonb;
  v_new   jsonb;
  v_cur   jsonb;
  v_ahead boolean;
  v_says  text := left(nullif(btrim(coalesce(p_says, '')), ''), 600);
begin
  v_watch := custom.automation_app_watch(p_automation_id);
  if v_watch is null then
    return jsonb_build_object('ok', false, 'says', 'There is no such automation.');
  end if;
  v_table := (v_watch ->> 'table_id')::uuid;
  -- FIX-AUTO A1: the same lock and row lock as automation_app_event, so a note never lands between another check's
  -- read and write, and never writes a cursor older than the one stored.
  perform pg_advisory_xact_lock(hashtextextended('automation-app-trigger:' || p_automation_id::text, 0));
  perform 1 from custom.record t where t.id = v_table for update;
  if p_cursor is null then
    -- the sentence a person reads on the automation (a missing or expired connection); null clears it
    perform custom._automation_app_patch(v_table, p_automation_id,
              jsonb_build_object('app_checked_at', now(), 'app_says', v_says));
    return jsonb_build_object('ok', true);
  end if;
  select x2 into v_item from custom.record t, jsonb_array_elements(t.data -> 'automations') x2
   where t.id = v_table and x2 ->> 'id' = p_automation_id::text;
  v_old := case when jsonb_typeof(v_item -> 'app_cursor') = 'object' then v_item -> 'app_cursor' else '{}'::jsonb end;
  v_new := case when jsonb_typeof(p_cursor) = 'object' then p_cursor else '{}'::jsonb end;
  v_cur := custom._automation_app_cursor_merge(v_old, v_new);
  -- The stored cursor was ahead (another check got further, or saw ids this one did not): its sentence stays.
  v_ahead := (v_cur - 'seen') is distinct from (v_new - 'seen')
             or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(v_old -> 'seen') = 'array' then v_old -> 'seen' else '[]'::jsonb end) o(sv)
                         where not coalesce(case when jsonb_typeof(v_new -> 'seen') = 'array' then v_new -> 'seen' end, '[]'::jsonb) @> jsonb_build_array(sv));
  perform custom._automation_app_patch(v_table, p_automation_id,
            jsonb_build_object('app_cursor', v_cur, 'app_checked_at', now())
            || case when v_says is not null then jsonb_build_object('app_says', v_says)
                    when not v_ahead then jsonb_build_object('app_says', null)
                    else '{}'::jsonb end);
  return jsonb_build_object('ok', true, 'merged', v_ahead);
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
  -- FIX-AUTO A3: switched off, nothing runs AND the cursor stays, so these items still fire once it is switched on.
  if not (v_watch ->> 'enabled')::boolean then
    perform custom._automation_app_patch(v_table, p_automation_id, jsonb_build_object('app_checked_at', now()));
    return jsonb_build_object('ok', false, 'off', true, 'ran', 0, 'says', 'This automation is switched off; nothing ran.');
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
  -- The cursor is MERGED, never overwritten backwards (FIX-AUTO A1: one rule, shared with automation_app_note): the
  -- stored seen ids plus this batch's first, then the checker's own seen ids.
  v_cur := custom._automation_app_cursor_merge(v_old || jsonb_build_object('seen', v_seen), p_cursor);
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
  v_me    uuid := custom.query_principal();
  v_says  text;
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
                || p_patch || jsonb_build_object('updated_at', now(), 'updated_by', v_me);
      -- FIX-AUTO A2: a connected-app automation reads its OWNER's account. Switched on by anyone else, it re-binds to
      -- the person who switched it (their own connection, never the owner's), starts watching afresh and stays off,
      -- exactly as automation_declare does on save. Switching it on again is then their own act.
      if coalesce((p_patch ->> 'enabled')::boolean, false)
         and (e -> 'spec' -> 'trigger' ->> 'on') in ('gmail_received', 'calendar_event', 'slack_message')
         and v_me is not null
         and coalesce(nullif(e ->> 'app_owner', ''), nullif(e ->> 'created_by', ''), nullif(e ->> 'updated_by', '')) is distinct from v_me::text then
        v_says := 'Switched on by someone other than its owner, so it now reads the account of the person who switched it on and was left off. Switch it on to start it.';
        v_item := (v_item - 'app_cursor' - 'app_sample')
                  || jsonb_build_object('app_owner', v_me, 'enabled', false, 'app_checked_at', now(), 'app_says', v_says);
      end if;
      v_new := v_new || jsonb_build_array(v_item);
    else
      v_new := v_new || jsonb_build_array(e);
    end if;
  end loop;
  update custom.record set data = jsonb_set(data, '{automations}', v_new, true)
   where organization_id = p_organization_id and id = v_table and table_id = custom.table_kernel_id();
  return jsonb_build_object('ok', true, 'automation_id', p_automation_id, 'table_id', v_table,
           'enabled', coalesce((v_item ->> 'enabled')::boolean, false), 'archived_at', v_item -> 'archived_at')
         || case when v_says is not null then jsonb_build_object('says', v_says) else '{}'::jsonb end;
end
$function$;

CREATE FUNCTION custom.automation_step_mark(p_run_id uuid, p_n integer, p_state text, p_output jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  d jsonb;
begin
  if auth.uid() is not null or not iam.is_trusted_backend() then
    raise exception 'Only the platform server marks an automation step.' using errcode = '42501';
  end if;
  if p_state is null or p_state not in ('sending', 'sent', 'failed') then
    return jsonb_build_object('ok', false, 'says', 'A step is marked sending, sent or failed.');
  end if;
  select r.data into d from custom.record r
   where r.id = p_run_id and r.data_class = 'automation_run' and r.deleted_at is null for update;
  if d is null or not d ? 'pending' or (d -> 'pending' ->> 'n')::integer is distinct from p_n then
    return jsonb_build_object('ok', false, 'says', 'That run is not waiting at this step.');
  end if;
  -- FIX-AUTO B1: rides on `pending`, which automation_claim_pending hands back on a re-claim, so the next worker sees
  -- that this step already went out (or may have) and never sends it twice.
  update custom.record set data = jsonb_set(d, '{pending,send_mark}',
           jsonb_build_object('n', p_n, 'state', p_state, 'output', coalesce(p_output, 'null'::jsonb), 'at', now()))
   where id = p_run_id;
  return jsonb_build_object('ok', true);
end
$function$;

INSERT INTO platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers) VALUES
 ('custom', 'automation_step_mark', 'p_run_id uuid, p_n integer, p_state text, p_output jsonb', ARRAY['uuid'::regtype, 'integer'::regtype, 'text'::regtype, 'jsonb'::regtype]::oid[],
  'Trusted backend only (auth.uid() null and iam.is_trusted_backend()); p_run_id must be a waiting automation run at step p_n.',
  '20261018233700_fix_auto_cursor_merge_owner_switch_off_check_send_once.sql',
  'server_only: aidream''s automation step worker records that a send step went out, so a re-claimed step is never sent twice; a browser never calls it.', false, false);
