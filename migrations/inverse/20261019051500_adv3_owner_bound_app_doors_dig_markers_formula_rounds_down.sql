-- chair-step: undo FIX-ADV3's store half: drop the owner-bound connected-app doors and the any-rounds formula typing, and restore the cursor merge, the three old door bodies, _fxp_formula_type(text, jsonb), formula_parse and _view_field_key as they were
-- inverse of 20261019051500_adv3_owner_bound_app_doors_dig_markers_formula_rounds.sql
-- lane: FIX-ADV3
-- lock: custom,platform
-- based-on: custom._automation_app_cursor_merge(jsonb, jsonb) 75390caf06968315eded6f9fe01e1513c9b869a10a2ad53b32b53bdb9e3da1f5
-- based-on: custom.automation_app_event(uuid, jsonb, jsonb) a2a6808621945ecd34d3cbfe82c53b8897cb6d7d872e46d9818166f208cc6715
-- based-on: custom.automation_app_note(uuid, text, jsonb) f27195355fc342868ee06d10e40d4b51677fe1d7af401844e5e280bebdd303cf
-- based-on: custom.automation_app_stop(uuid, text) 09fe486bc9ac5e6b2bd7f4e4d9387598852e148aae77ab32e9471dfd9e91a593
-- based-on: custom._fxp_formula_type(text, jsonb) d7ee7c33f593e7f47dacc037bdbc41a81549c68177a1b9f090848f8c13a89a41
-- based-on: custom.formula_parse(uuid, uuid, text) b79528bcd727adfa1bfdfb858d04ffbde2eb0c62877d4a1aaf700942ed062141
-- based-on: custom._view_field_key(uuid, uuid, text, text, jsonb, text[]) 4761233cc52df699aa8213d3f15c1fc334c3073c42768e44ec4d73da0c0bcb9d

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

CREATE OR REPLACE FUNCTION custom.automation_app_stop(p_automation_id uuid, p_says text)
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

CREATE OR REPLACE FUNCTION custom._fxp_formula_type(p_target text, p_fields jsonb)
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
  for v_i in 1..9 loop
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
                            'result_type', custom._fxp_type(v_expr, v_fields), 'text', p_text);
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

DELETE FROM platform.client_callable_door
 WHERE schema_name = 'custom'
   AND ((function_name = 'automation_app_event' AND identity_args = 'p_automation_id uuid, p_items jsonb, p_cursor jsonb, p_expected_owner text')
     OR (function_name = 'automation_app_note' AND identity_args = 'p_automation_id uuid, p_says text, p_cursor jsonb, p_expected_owner text')
     OR (function_name = 'automation_app_stop' AND identity_args = 'p_automation_id uuid, p_says text, p_expected_owner text'));
DROP FUNCTION custom.automation_app_event(uuid, jsonb, jsonb, text);
DROP FUNCTION custom.automation_app_note(uuid, text, jsonb, text);
DROP FUNCTION custom.automation_app_stop(uuid, text, text);
DROP FUNCTION custom._fxp_formula_type(text, jsonb, integer);
