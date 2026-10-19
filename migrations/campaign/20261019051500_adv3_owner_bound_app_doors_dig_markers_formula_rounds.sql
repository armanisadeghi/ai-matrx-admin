-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: FIX-ADV3
-- lock: custom,platform
-- based-on: custom._automation_app_cursor_merge(jsonb, jsonb) b4469b5bac3003347cc0c63d16fe562f9388b55a0c410df08088526dee861d4d
-- based-on: custom.automation_app_event(uuid, jsonb, jsonb) ffb40275b0fbccdc19e0803a4bb5ea2c725ca902d98d4d25d2bac64a98d8a703
-- based-on: custom.automation_app_note(uuid, text, jsonb) 488d9019562315da28c00b971b633bdf76700013d588484258074fceff02ef81
-- based-on: custom.automation_app_stop(uuid, text) 6a912bcf92a052a5ec346a169a35f55e726804cb795ce72b57744bf72ac7560e
-- based-on: custom._fxp_formula_type(text, jsonb) 0c2cb642773d934be7c37b8a601c80e98ec99e17fe1ca6f3c10c3f4dd1e4ec5e
-- based-on: custom.formula_parse(uuid, uuid, text) 1a69e598b68405a08cb95fe19dfec8a37c11025c26532f6f6f2693578912ba3a
-- based-on: custom._view_field_key(uuid, uuid, text, text, jsonb, text[]) eb8192b37c21e7500f6fb76bfd20993ffa3cb9563870f601bd73c655a1ef2dd9
--
-- FIX-ADV3 (close-out adversarial review ADV-3, findings N1, N3, N7, N8; N6 is the records-ui client mirror).
-- N1 A CHECK IS BOUND TO THE OWNER IT READ. New overloads custom.automation_app_event(…, p_expected_owner),
--    custom.automation_app_note(…, p_expected_owner) and custom.automation_app_stop(…, p_expected_owner): under the
--    automation's advisory lock and row lock each re-reads the automation and REFUSES (no run, no cursor or sentence
--    written, nothing switched off) when coalesce(app_owner, created_by, updated_by) is no longer that person. So a
--    check that was reading A's mailbox when the automation changed hands to B never starts B's runs with A's mail,
--    never writes A's cursor onto B's automation and never switches B's automation off. The old signatures stay as
--    one-line forms handing the current owner (the server deployed before this), so there is one body and one rule.
-- N3 DIG MARKERS SURVIVE A STALE WRITE. custom._automation_app_cursor_merge keeps a stored `before` (Gmail) / `latest`
--    (Slack) when the handed-in cursor does not name it; a finished dig names it as null (server half), which wins.
-- N7 THE EDITOR TYPES A FORMULA THE WAY A CALENDAR DOES. custom.formula_parse answers result_type through
--    custom._fxp_formula_type (9 rounds), so "= {Follow-up due}" gives a date in the editor exactly when a calendar takes it.
-- N8 A CHAIN DEEPER THAN 9 IS SAID PLAINLY. custom._fxp_formula_type(text, jsonb, integer) runs any number of rounds
--    (the two-argument form runs 9, one body); custom._view_field_key says "goes through more than 9 other formulas"
--    when the field is a date only past round 9, instead of "does not hold a date".
-- Inverse: migrations/inverse/20261019051500_adv3_owner_bound_app_doors_dig_markers_formula_rounds_down.sql.

set local lock_timeout = '2s';
set local statement_timeout = '60s';

CREATE OR REPLACE FUNCTION custom._automation_app_cursor_merge(p_old jsonb, p_new jsonb)
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
  -- ADV-3 N3: a dig marker (Gmail `before`, Slack `latest`) the handed-in cursor does not name stays: that cursor came
  -- from a check that started before the dig began. A finished dig names it explicitly as null, which wins.
  if v_old ? 'before' and not v_cur ? 'before' then
    v_cur := v_cur || jsonb_build_object('before', v_old -> 'before');
  end if;
  if v_old ? 'latest' and not v_cur ? 'latest' then
    v_cur := v_cur || jsonb_build_object('latest', v_old -> 'latest');
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

CREATE FUNCTION custom.automation_app_event(p_automation_id uuid, p_items jsonb, p_cursor jsonb, p_expected_owner text)
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
  -- ADV-3 N1: the check read ONE person's account. When the automation reads someone else's by now (it changed hands
  -- while the check was reading), nothing runs, no cursor or sentence is written and nothing is switched off.
  if (v_watch ->> 'owner') is distinct from p_expected_owner then
    return jsonb_build_object('ok', false, 'refused', true, 'ran', 0, 'says', 'This automation now reads someone else''s account, so this check changed nothing.');
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

CREATE OR REPLACE FUNCTION custom.automation_app_event(p_automation_id uuid, p_items jsonb, p_cursor jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- ADV-3 N1: the owner-bound door is custom.automation_app_event(…, p_expected_owner); this form hands it whoever
  -- owns the automation now (a server deployed before ADV-3). One body, one rule.
  return custom.automation_app_event(p_automation_id, p_items, p_cursor,
                                     custom.automation_app_watch(p_automation_id) ->> 'owner');
end
$function$;

CREATE FUNCTION custom.automation_app_note(p_automation_id uuid, p_says text, p_cursor jsonb, p_expected_owner text)
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
  v_watch := custom.automation_app_watch(p_automation_id);
  if v_watch is null then
    return jsonb_build_object('ok', false, 'says', 'There is no such automation.');
  end if;
  -- ADV-3 N1: the check read ONE person's account. When the automation reads someone else's by now (it changed hands
  -- while the check was reading), nothing runs, no cursor or sentence is written and nothing is switched off.
  if (v_watch ->> 'owner') is distinct from p_expected_owner then
    return jsonb_build_object('ok', false, 'refused', true, 'ran', 0, 'says', 'This automation now reads someone else''s account, so this check changed nothing.');
  end if;
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

CREATE OR REPLACE FUNCTION custom.automation_app_note(p_automation_id uuid, p_says text, p_cursor jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- ADV-3 N1: see custom.automation_app_note(…, p_expected_owner); this form hands it whoever owns it now.
  return custom.automation_app_note(p_automation_id, p_says, p_cursor,
                                    custom.automation_app_watch(p_automation_id) ->> 'owner');
end
$function$;

CREATE FUNCTION custom.automation_app_stop(p_automation_id uuid, p_says text, p_expected_owner text)
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
  -- ADV-3 N1: the same lock and row lock as the event and note doors, then the automation read again.
  perform pg_advisory_xact_lock(hashtextextended('automation-app-trigger:' || p_automation_id::text, 0));
  perform 1 from custom.record t where t.id = (v_watch ->> 'table_id')::uuid for update;
  v_watch := custom.automation_app_watch(p_automation_id);
  if v_watch is null then
    return jsonb_build_object('ok', false, 'says', 'There is no such automation.');
  end if;
  -- ADV-3 N1: the check read ONE person's account. When the automation reads someone else's by now (it changed hands
  -- while the check was reading), nothing runs, no cursor or sentence is written and nothing is switched off.
  if (v_watch ->> 'owner') is distinct from p_expected_owner then
    return jsonb_build_object('ok', false, 'refused', true, 'says', 'This automation now reads someone else''s account, so this check changed nothing.');
  end if;
  -- ADV-FIX-A 5: the owner left or the connection is gone: switched off, and why, on the automation.
  perform custom._automation_app_patch((v_watch ->> 'table_id')::uuid, p_automation_id,
            jsonb_build_object('enabled', false, 'app_checked_at', now(), 'app_stopped_at', now(),
                               'app_says', left(coalesce(nullif(btrim(coalesce(p_says, '')), ''), 'Switched off.'), 600)));
  return jsonb_build_object('ok', true, 'stopped', true);
end
$function$;

CREATE OR REPLACE FUNCTION custom.automation_app_stop(p_automation_id uuid, p_says text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- ADV-3 N1: see custom.automation_app_stop(…, p_expected_owner); this form hands it whoever owns it now.
  return custom.automation_app_stop(p_automation_id, p_says, custom.automation_app_watch(p_automation_id) ->> 'owner');
end
$function$;

CREATE FUNCTION custom._fxp_formula_type(p_target text, p_fields jsonb, p_rounds integer)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_cur jsonb := coalesce(p_fields, '[]'::jsonb);
  v_t   jsonb;
  v_i   int;
begin
  -- The answer for formula `p_target` of the field list `p_fields` ({id,key,label,type,config} each):
  -- 'date' | 'number' | 'text' | 'boolean' | 'unknown'. Lookups and rollups (config.via) stay unknown.
  -- ADV-3: `p_rounds` rounds; a chain of up to that many formulas settles (the two-argument form runs 9).
  for v_i in 1..greatest(coalesce(p_rounds, 0), 0) loop
    select coalesce(jsonb_agg(
             case when f ->> 'type' = 'formula' and not (coalesce(f -> 'config', '{}'::jsonb) ? 'via')
                       and jsonb_typeof(f -> 'config' -> 'expr') = 'object'
                  then case custom._fxp_type(f -> 'config' -> 'expr', v_cur)
                         when 'date'    then jsonb_set(jsonb_set(f, '{type}', '"range"'), '{config}', '{"kind":"date","_typed":true}')
                         when 'number'  then jsonb_set(jsonb_set(f, '{type}', '"range"'), '{config}', '{"_typed":true}')
                         when 'text'    then jsonb_set(f, '{type}', '"text"')
                         when 'boolean' then jsonb_set(f, '{type}', '"boolean"')
                         else f end
                  else f end), '[]'::jsonb)
      into v_t
      from jsonb_array_elements(p_fields) f;
    v_cur := v_t;
  end loop;
  return (select custom._fxp_type(f -> 'config' -> 'expr', v_cur)
            from jsonb_array_elements(p_fields) f
           where f ->> 'id' = p_target and jsonb_typeof(f -> 'config' -> 'expr') = 'object'
           limit 1);
end
$function$;

CREATE OR REPLACE FUNCTION custom._fxp_formula_type(p_target text, p_fields jsonb)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- The answer for formula `p_target` of the field list `p_fields`, typed in 9 rounds (FDT-2; the rounds live once, in
  -- custom._fxp_formula_type(text, jsonb, integer)).
  return custom._fxp_formula_type(p_target, p_fields, 9);
end
$function$;

CREATE OR REPLACE FUNCTION custom.formula_parse(p_organization_id uuid, p_table_id uuid, p_text text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_fields jsonb;
  v_tokens jsonb;
  v_r      jsonb;
  v_expr   jsonb;
  v_refs   jsonb := '[]'::jsonb;
  v_msg    text;
  v_at     text;
  v_text   text := p_text;
  v_types  jsonb;
  v_tr     jsonb;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.formula_parse');
  perform custom.assert_may_know_table(p_organization_id, p_table_id, 'custom.formula_parse');

  select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'key', f.data ->> 'key', 'label', f.data ->> 'label',
                                               'type', f.data ->> 'type', 'config', f.data -> 'config')
                            order by (f.data ->> 'sort')::numeric nulls last), '[]'::jsonb)
    into v_fields
    from custom.record f
   where f.organization_id = p_organization_id
     and f.table_id = custom.field_kernel_id()
     and f.data_class = 'field'
     and f.deleted_at is null
     and f.data ->> 'entity_definition_id' = p_table_id::text;

  -- NOTION'S SYNTAX: prop("Budget") * 2 is the same formula as {Budget} * 2.
  if coalesce(p_text, '') ~* '\mprop\s*\(' then
    select coalesce(jsonb_object_agg(k, t), '{}'::jsonb) into v_types
      from (select x.k, x.t from (
              select f ->> 'label' as k, f ->> 'type' as t from jsonb_array_elements(v_fields) f
              union all
              select f ->> 'key', f ->> 'type' from jsonb_array_elements(v_fields) f) x
             where x.k is not null) y;
    v_tr := custom.formula_translate_notion(p_text, v_types);
    if coalesce((v_tr ->> 'ok')::boolean, false) is not true then
      return jsonb_build_object('ok', false,
                                'error', 'This reads as a Notion formula, and it cannot be used here because ' || (v_tr ->> 'reason') || '.',
                                'position', 0, 'text', p_text);
    end if;
    v_text := v_tr ->> 'formula';
  end if;

  begin
    if btrim(coalesce(v_text, '')) = '' then
      raise exception 'This formula is empty.' using errcode = '22023', detail = '0';
    end if;
    v_tokens := custom._fxp_tokens(v_text);
    v_r := custom._fxp_level(v_tokens, 0, 0);
    if (v_tokens -> ((v_r ->> 'i')::integer)) ->> 't' <> 'end' then
      raise exception 'Nothing should follow the formula here — remove `%`.',
                      (v_tokens -> ((v_r ->> 'i')::integer)) ->> 'x'
        using errcode = '22023', detail = (v_tokens -> ((v_r ->> 'i')::integer)) ->> 'p';
    end if;
    v_r := custom._fxp_resolve(v_r -> 'n', v_fields, v_refs);
    v_expr := v_r -> 'n';
    v_refs := v_r -> 'refs';
  exception when invalid_parameter_value then
    get stacked diagnostics v_msg = message_text, v_at = pg_exception_detail;
    return jsonb_build_object('ok', false, 'error', v_msg,
                              'position', coalesce(nullif(v_at, '')::integer, 0), 'text', p_text);
  end;

  return jsonb_build_object('ok', true, 'expr', v_expr, 'references', v_refs,
                            -- ADV-3 N7: typed the way a date setting types it (custom._fxp_formula_type), so a
                            -- reference to a date formula "gives a date" here exactly when a calendar takes it.
                            'result_type', coalesce(custom._fxp_formula_type('',
                                             v_fields || jsonb_build_array(jsonb_build_object('id', '', 'type', 'formula',
                                                                           'config', jsonb_build_object('expr', v_expr)))),
                                             'unknown'),
                            'text', p_text);
end
$function$;

CREATE OR REPLACE FUNCTION custom._view_field_key(p_organization_id uuid, p_table_id uuid, p_path text, p_shape text, p_ref jsonb, p_known text[])
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_ref   text;
  v_doc   jsonb;
  v_dead  boolean;
  v_type  text;
  v_par   text;
  v_kind  text;
  v_label text;
  v_held  boolean;
  v_deep  boolean := false;
  v_cfg   jsonb;
  v_far   jsonb;
  v_ftab  text;
  v_flds  jsonb;
  v_fid   uuid;
  v_farid uuid;
begin
  if p_ref is null or jsonb_typeof(p_ref) <> 'string' or btrim(p_ref #>> '{}') = '' then
    raise exception '% names a Field, and nothing was named.', p_path
      using errcode = '22023', hint = 'Name the Field by its key or its id. Nothing was written.';
  end if;
  v_ref := p_ref #>> '{}';

  select f.data, f.deleted_at is not null, f.id into v_doc, v_dead, v_fid
    from custom.record f
   where f.organization_id = p_organization_id and f.data_class = 'field'
     and f.data ->> 'entity_definition_id' = p_table_id::text
     and (f.id = platform.uuid_or_null(v_ref) or f.data ->> 'key' = v_ref)
   order by (f.deleted_at is null) desc, f.updated_at desc
   limit 1;

  if v_doc is not null and v_ref = any (p_known) then
    return v_doc ->> 'key';
  end if;
  if v_doc is null and v_ref = any (p_known) then
    -- A word the view already held that is no Field of this Table now (a column since removed
    -- for good). Kept as it was; the screens skip a Field they cannot find.
    return v_ref;
  end if;
  if v_doc is null then
    raise exception '% names "%", which is not a field of this table.', p_path, v_ref
      using errcode = '22023', hint = 'A view names the fields of its own table, by key or id. Nothing was written.';
  end if;
  v_label := coalesce(nullif(v_doc ->> 'label', ''), v_doc ->> 'key');
  if v_dead and p_path <> 'presentation.hiddenFields' then
    -- (Hiding a column that is archived anyway harms nobody, so that one list takes it.)
    raise exception '% names %, which has been archived.', p_path, v_label
      using errcode = '22023', hint = 'An archived field is not shown to anyone, so a view cannot be built on it. Restore it first, or pick another. Nothing was written.';
  end if;

  v_type := v_doc ->> 'type';
  v_par  := coalesce(v_doc ->> 'parity_type', '');
  v_kind := coalesce(v_doc -> 'config' ->> 'kind', '');

  -- LANE 10 FDT: A DATE SETTING TAKES A FIELD WHOSE VALUE IS A DATE, stored or worked out (Airtable
  -- places a calendar or a timeline by a formula or a lookup that returns a date). A stored date
  -- column, as before; a formula whose answer is a date, typed by `custom._fxp_type` — the one rule
  -- the formula editor's "gives a date" uses; a lookup of ONE value whose picked column on the far
  -- table is a stored date or a date formula. A rollup is never one: `custom.rollup_value` adds up
  -- numbers only, so a rollup of dates is always empty and a calendar on it would show nothing.
  -- Everything else is refused with the same sentences as before.
  if p_shape = 'field:date' then
    v_held := v_type = 'range' and (v_kind in ('date', 'datetime') or v_par in ('date', 'datetime'));
    v_cfg := coalesce(v_doc -> 'config', '{}'::jsonb);
    if not v_held and v_type = 'formula' and not (v_cfg ? 'via') and jsonb_typeof(v_cfg -> 'expr') = 'object' then
      select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'key', f.data ->> 'key', 'label', f.data ->> 'label',
                                                   'type', f.data ->> 'type', 'config', f.data -> 'config')), '[]'::jsonb)
        into v_flds
        from custom.record f
       where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id()
         and f.data_class = 'field' and f.deleted_at is null
         and f.data ->> 'entity_definition_id' = p_table_id::text;
      -- FDT-2: a reference to another formula is typed by THAT formula (bounded, linear).
      v_held := coalesce(custom._fxp_formula_type(v_fid::text, v_flds) = 'date', false);
      -- ADV-3 N8: not a date in 9 rounds, but a date once every formula of the table is followed: the chain is longer
      -- than a date setting follows, and the person is told that, not "does not hold a date".
      v_deep := not v_held and coalesce(custom._fxp_formula_type(v_fid::text, v_flds,
                  (select count(*)::int + 1 from jsonb_array_elements(v_flds) f where f ->> 'type' = 'formula')) = 'date', false);
    elsif not v_held and v_type = 'formula' and v_cfg ? 'via' and not (v_cfg ? 'agg')
          and not coalesce((v_doc ->> 'multi')::boolean, false) then
      select f.data ->> 'relation_target' into v_ftab
        from custom.record f
       where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id()
         and f.data_class = 'field' and f.deleted_at is null
         and f.data ->> 'entity_definition_id' = p_table_id::text
         and f.data ->> 'key' = v_cfg ->> 'via'
       limit 1;
      if v_ftab is not null then
        select f.data, f.id into v_far, v_farid
          from custom.record f
         where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id()
           and f.data_class = 'field' and f.deleted_at is null
           and f.data ->> 'entity_definition_id' = v_ftab
           and f.data ->> 'key' = v_cfg ->> 'pick'
         limit 1;
      end if;
      if v_far ->> 'type' = 'range' then
        v_held := coalesce(v_far -> 'config' ->> 'kind', '') in ('date', 'datetime')
               or coalesce(v_far ->> 'parity_type', '') in ('date', 'datetime');
      elsif v_far ->> 'type' = 'formula' and not (v_far -> 'config' ? 'via')
            and jsonb_typeof(v_far -> 'config' -> 'expr') = 'object' then
        select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'key', f.data ->> 'key', 'label', f.data ->> 'label',
                                                     'type', f.data ->> 'type', 'config', f.data -> 'config')), '[]'::jsonb)
          into v_flds
          from custom.record f
         where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id()
           and f.data_class = 'field' and f.deleted_at is null
           and f.data ->> 'entity_definition_id' = v_ftab;
        v_held := coalesce(custom._fxp_formula_type(v_farid::text, v_flds) = 'date', false);
        -- ADV-3 N8: not a date in 9 rounds, but a date once every formula of the table is followed: the chain is longer
        -- than a date setting follows, and the person is told that, not "does not hold a date".
        v_deep := not v_held and coalesce(custom._fxp_formula_type(v_farid::text, v_flds,
                    (select count(*)::int + 1 from jsonb_array_elements(v_flds) f where f ->> 'type' = 'formula')) = 'date', false);
      end if;
    end if;
    v_held := coalesce(v_held, false);
  end if;
  if p_shape = 'field:number'
     and not (v_type = 'formula'
              or (v_type = 'range' and v_kind not in ('date', 'datetime', 'time')
                  and v_par not in ('date', 'datetime', 'time'))) then
    raise exception 'The board sums a number, a money or a percentage field under each column, and % holds none of those.', v_label
      using errcode = '22023', hint = 'Pick a number field to total. Nothing was written.';
  elsif p_shape = 'field:date' and not v_held then
    if v_deep then
      raise exception 'This formula (%) goes through more than 9 other formulas; a date setting follows at most 9.', v_label
        using errcode = '22023', hint = 'Pick a date field or a formula nearer its date. Nothing was written.';
    end if;
    -- LANE 10 VK: the same date test for every date setting; the sentence names the setting.
    if p_path = 'end_field' then
      raise exception 'A record''s end is a date, and % does not hold one.', v_label
        using errcode = '22023', hint = 'Pick a date field for where it ends. Nothing was written.';
    elsif p_path = 'start_field' then
      raise exception 'A timeline places a record by a date, and % does not hold one.', v_label
        using errcode = '22023', hint = 'Pick a date field for where it starts. Nothing was written.';
    end if;
    raise exception 'A calendar places a record by a date, and % does not hold one.', v_label
      using errcode = '22023', hint = 'Pick a date field. Nothing was written.';
  elsif p_shape = 'field:color' and v_type not in ('list', 'boolean') then
    raise exception 'Colour by gives one colour to each value of a choice, and % is not a choice.', v_label
      using errcode = '22023', hint = 'Pick a choice or a yes/no field to colour by. Nothing was written.';
  elsif p_shape = 'field:lane' and v_type not in ('list', 'relation', 'boolean', 'text') then
    raise exception 'A swimlane is one row for each value of a choice, a person, a link or a word, and % holds a %.', v_label, v_type
      using errcode = '22023', hint = 'Pick a choice, a person or a link field. Nothing was written.';
  end if;
  return v_doc ->> 'key';
end;
$function$;

INSERT INTO platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers) VALUES
 ('custom', 'automation_app_event', 'p_automation_id uuid, p_items jsonb, p_cursor jsonb, p_expected_owner text', ARRAY['uuid'::regtype, 'jsonb'::regtype, 'jsonb'::regtype, 'text'::regtype]::oid[],
  'Trusted backend only (custom.automation_app_watch: auth.uid() null and iam.is_trusted_backend()); refuses when the automation no longer reads p_expected_owner''s account.',
  '20261019051500_adv3_owner_bound_app_doors_dig_markers_formula_rounds.sql',
  'server_only: aidream''s connected-app trigger check starts one run per new Gmail / Calendar / Slack item, bound to the owner it read; a browser never calls it.', false, false),
 ('custom', 'automation_app_note', 'p_automation_id uuid, p_says text, p_cursor jsonb, p_expected_owner text', ARRAY['uuid'::regtype, 'text'::regtype, 'jsonb'::regtype, 'text'::regtype]::oid[],
  'Trusted backend only (custom.automation_app_watch: auth.uid() null and iam.is_trusted_backend()); refuses when the automation no longer reads p_expected_owner''s account.',
  '20261019051500_adv3_owner_bound_app_doors_dig_markers_formula_rounds.sql',
  'server_only: aidream''s connected-app trigger check writes its cursor or why it could not read the owner''s account, bound to the owner it read; a browser never calls it.', false, false),
 ('custom', 'automation_app_stop', 'p_automation_id uuid, p_says text, p_expected_owner text', ARRAY['uuid'::regtype, 'text'::regtype, 'text'::regtype]::oid[],
  'Trusted backend only (custom.automation_app_watch: auth.uid() null and iam.is_trusted_backend()); refuses when the automation no longer reads p_expected_owner''s account.',
  '20261019051500_adv3_owner_bound_app_doors_dig_markers_formula_rounds.sql',
  'server_only: aidream''s connected-app trigger check switches an automation off when its owner''s connection is gone, bound to the owner it read; a browser never calls it.', false, false);
