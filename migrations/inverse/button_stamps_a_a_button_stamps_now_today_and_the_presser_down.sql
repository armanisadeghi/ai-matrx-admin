-- Inverse of migrations/campaign/button_stamps_a_a_button_stamps_now_today_and_the_presser.sql.
CREATE OR REPLACE FUNCTION custom._row_template_values_now(p_organization_id uuid, p_values jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_out  jsonb := '{}'::jsonb;
  e      record;
  v_tz   text;
  v_day  date;
  v_txt  text;
begin
  if p_values is null or jsonb_typeof(p_values) <> 'object' then
    return coalesce(p_values, '{}'::jsonb);
  end if;
  for e in select key, value from jsonb_each(p_values) loop
    if jsonb_typeof(e.value) = 'string' and left(e.value #>> '{}', 1) = '@' then
      if v_tz is null then
        v_tz := coalesce(custom.day_zone(p_organization_id), 'UTC');
        v_day := (now() at time zone v_tz)::date;
      end if;
      begin
        v_txt := custom._template_date(e.value #>> '{}', v_day, v_tz);
        v_out := v_out || jsonb_build_object(e.key, v_txt);
        continue;
      exception when others then
        null;
      end;
    end if;
    v_out := v_out || jsonb_build_object(e.key, e.value);
  end loop;
  return v_out;
end;
$function$;

CREATE OR REPLACE FUNCTION custom._action_check(p_organization_id uuid, p_table_id uuid, p_actions jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_a      jsonb;
  v_s      jsonb;
  v_out    jsonb := '[]'::jsonb;
  v_steps  jsonb;
  v_names  text[] := '{}';
  v_ids    text[] := '{}';
  v_seen   text[];
  v_name   text;
  v_kind   text;
  v_set    text;
  v_field  jsonb;
  v_parsed jsonb;
  v_max_a  integer := coalesce((platform.knob_resolve('custom', 'row_actions_max', p_organization_id) #>> '{}')::integer, 24);
  v_max_s  integer := coalesce((platform.knob_resolve('custom', 'row_action_steps_max', p_organization_id) #>> '{}')::integer, 60);
  v_id     text;
begin
  if p_actions is null or jsonb_typeof(p_actions) = 'null' then
    return '[]'::jsonb;
  end if;
  if jsonb_typeof(p_actions) <> 'array' then
    raise exception 'A table''s row actions are a list, and what was sent is a %.', jsonb_typeof(p_actions)
      using errcode = '22023', hint = 'Send the whole list; an empty list removes every action. Nothing was written.';
  end if;
  if jsonb_array_length(p_actions) > v_max_a then
    raise exception 'A table can have at most % row actions, and % were sent.', v_max_a, jsonb_array_length(p_actions)
      using errcode = '22023', hint = 'The ceiling is the organization knob custom/row_actions_max. Nothing was written.';
  end if;

  for v_a in select e from jsonb_array_elements(p_actions) e loop
    if jsonb_typeof(v_a) <> 'object' then
      raise exception 'Each row action is a button with a name, and one of these is not.' using errcode = '22023';
    end if;
    v_name := btrim(coalesce(v_a ->> 'name', ''));
    if v_name = '' then
      raise exception 'A row action needs a name — it is the words on the button.' using errcode = '22023';
    end if;
    if char_length(v_name) > 80 then
      raise exception 'The row action "%…" has a name longer than 80 characters.', left(v_name, 20) using errcode = '22023';
    end if;
    if lower(v_name) = any (v_names) then
      raise exception 'Two row actions are called "%".', v_name
        using errcode = '22023', hint = 'Two buttons with the same words cannot be told apart. Nothing was written.';
    end if;
    v_names := v_names || lower(v_name);
    v_id := coalesce(nullif(v_a ->> 'id', ''), gen_random_uuid()::text);
    if v_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'A row action is found by its id, and that id is not one the store gave out.' using errcode = '22023', hint = 'Leave id out for a new action; keep the id the store returned for an existing one.',
            detail = jsonb_build_object('action_id', v_id)::text;
    end if;
    if v_id = any (v_ids) then
      raise exception 'Two row actions share one id.' using errcode = '22023',
            detail = jsonb_build_object('action_id', v_id)::text;
    end if;
    v_ids := v_ids || v_id;
    if nullif(v_a ->> 'color', '') is not null and not ((v_a ->> 'color') = any (custom.decoration_colors())) then
      raise exception 'The button "%" is colored "%", which is not one of the table colors.', v_name, v_a ->> 'color'
        using errcode = '22023', hint = format('The colors are %s, or none. Nothing was written.', array_to_string(custom.decoration_colors(), ', '));
    end if;
    v_kind := coalesce(nullif(v_a ->> 'kind', ''), 'update');
    if v_kind not in ('update', 'agent') then
      raise exception 'The row action "%" is a "%", and an action either changes the record or asks an agent.', v_name, v_kind
        using errcode = '22023', hint = 'kind is "update" or "agent". Nothing was written.';
    end if;

    if v_kind = 'agent' then
      if btrim(coalesce(v_a ->> 'prompt', '')) = '' then
        raise exception 'The row action "%" asks an agent, and does not say what to ask.', v_name
          using errcode = '22023', hint = 'Say what the agent should do with the record — it opens the record''s chat with those words. Nothing was written.';
      end if;
      v_out := v_out || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'id', v_id, 'name', v_name, 'kind', 'agent', 'prompt', btrim(v_a ->> 'prompt'),
        'color', nullif(v_a ->> 'color', ''), 'icon', left(nullif(btrim(v_a ->> 'icon'), ''), 64),
        'confirm', coalesce((v_a ->> 'confirm')::boolean, false))));
      continue;
    end if;

    if jsonb_typeof(v_a -> 'steps') is distinct from 'array' or jsonb_array_length(v_a -> 'steps') = 0 then
      raise exception 'The row action "%" changes nothing yet — add at least one change.', v_name using errcode = '22023';
    end if;
    if jsonb_array_length(v_a -> 'steps') > v_max_s then
      raise exception 'The row action "%" changes more than % columns.', v_name, v_max_s
        using errcode = '22023', hint = 'The ceiling is the organization knob custom/row_action_steps_max. Nothing was written.';
    end if;
    v_steps := '[]'::jsonb;
    v_seen := '{}';
    for v_s in select e from jsonb_array_elements(v_a -> 'steps') e loop
      select jsonb_build_object('id', f.id, 'key', f.data ->> 'key', 'label', f.data ->> 'label',
                                'type', f.data ->> 'type', 'source', f.data ->> 'source', 'config', f.data -> 'config')
        into v_field
        from custom.record f
       where f.organization_id = p_organization_id
         and f.table_id = custom.field_kernel_id()
         and f.data_class = 'field'
         and f.deleted_at is null
         and f.data ->> 'entity_definition_id' = p_table_id::text
         and (v_s ->> 'field') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         and f.id = (v_s ->> 'field')::uuid;
      if v_field is null then
        raise exception 'The row action "%" changes a column that is not in this table.', v_name
          using errcode = '23503', hint = 'REC-17: a step names a column of this Table by its id. Nothing was written.';
      end if;
      if v_field ->> 'type' = 'formula' or v_field ->> 'source' = 'formula' then
        raise exception 'The row action "%" sets "%", which is worked out by the store and cannot be set.', v_name, v_field ->> 'label'
          using errcode = '22023', hint = 'FLD-9. Nothing was written.';
      end if;
      if (v_field ->> 'id') = any (v_seen) then
        raise exception 'The row action "%" changes "%" twice.', v_name, v_field ->> 'label' using errcode = '22023';
      end if;
      v_seen := v_seen || (v_field ->> 'id');
      v_set := coalesce(v_s ->> 'set', '');
      if v_set = 'value' then
        if custom._fx_blank(v_s -> 'value') then
          raise exception 'The row action "%" sets "%" to nothing — type the value, or choose Clear.', v_name, v_field ->> 'label'
            using errcode = '22023';
        end if;
        v_steps := v_steps || jsonb_build_array(jsonb_build_object('field', v_field ->> 'id', 'set', 'value', 'value', v_s -> 'value'));
      elsif v_set = 'clear' then
        v_steps := v_steps || jsonb_build_array(jsonb_build_object('field', v_field ->> 'id', 'set', 'clear'));
      elsif v_set in ('compute', 'formula') then
        if nullif(btrim(coalesce(v_s ->> 'formula_text', v_s ->> 'expression', '')), '') is not null then
          v_parsed := custom.formula_parse(p_organization_id, p_table_id, coalesce(v_s ->> 'formula_text', v_s ->> 'expression'));
          if not coalesce((v_parsed ->> 'ok')::boolean, false) then
            raise exception 'The row action "%" works "%" out with a formula that cannot be read: %', v_name, v_field ->> 'label', v_parsed ->> 'error'
              using errcode = '22023', hint = format('At character %s. Nothing was written.', coalesce((v_parsed ->> 'position')::integer, 0) + 1);
          end if;
          v_steps := v_steps || jsonb_build_array(jsonb_build_object('field', v_field ->> 'id', 'set', 'compute',
                       'formula_text', coalesce(v_s ->> 'formula_text', v_s ->> 'expression'), 'expr', v_parsed -> 'expr'));
        elsif jsonb_typeof(v_s -> 'expr') = 'object' then
          v_steps := v_steps || jsonb_build_array(jsonb_build_object('field', v_field ->> 'id', 'set', 'compute', 'expr', v_s -> 'expr'));
        else
          raise exception 'The row action "%" works "%" out, and does not say how.', v_name, v_field ->> 'label'
            using errcode = '22023', hint = 'Give the step formula_text (like {Visit fee} - {Deposit taken}) or an expr. Nothing was written.';
        end if;
      else
        raise exception 'A step of "%" says "%", and a step sets a value, clears, or computes.', v_name, coalesce(nullif(v_set, ''), 'nothing')
          using errcode = '22023';
      end if;
    end loop;
    v_out := v_out || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'id', v_id, 'name', v_name, 'kind', 'update', 'steps', v_steps,
      'color', nullif(v_a ->> 'color', ''), 'icon', left(nullif(btrim(v_a ->> 'icon'), ''), 64),
      'confirm', coalesce((v_a ->> 'confirm')::boolean, false))));
  end loop;
  return v_out;
end
$function$;

CREATE OR REPLACE FUNCTION custom.action_run(p_organization_id uuid, p_action_id uuid, p_record_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_table    uuid;
  v_tdoc     jsonb;
  v_action   jsonb;
  v_step     jsonb;
  v_fields   jsonb;
  v_field    jsonb;
  v_rid      uuid;
  v_rec      custom.record;
  v_patch    jsonb;
  v_val      jsonb;
  v_values   jsonb;
  v_ctx      jsonb;
  v_refused  jsonb := '[]'::jsonb;
  v_one      jsonb;
  v_done     jsonb := '[]'::jsonb;
  v_ver      integer;
  v_msg      text;
  v_hint     text;
  v_state    text;
  v_whole    text;
  v_named    boolean;
  v_title    text;
  v_max      integer;
  v_n        integer;
  v_run      uuid;      -- CHAIR-DOORS-4: the run row
  k          text;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.action_run');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.action_run');

  -- The action is found inside THIS organization's Tables only, and only on a Table this
  -- person may know; any other id answers exactly as an invented one.
  select t.id, t.data into v_table, v_tdoc
    from custom.record t
   where t.organization_id = p_organization_id
     and t.table_id = custom.table_kernel_id()
     and t.deleted_at is null
     and t.data -> 'row_actions' @> jsonb_build_array(jsonb_build_object('id', p_action_id::text))
   limit 1;
  if v_table is null then
    raise exception 'There is no such row action here.' using errcode = '23503', hint = 'It may have been removed from its table, or it belongs to another organization. Nothing was changed.',
            detail = jsonb_build_object('action_id', p_action_id)::text;
  end if;
  perform custom.assert_may_know_table(p_organization_id, v_table, 'custom.action_run');
  select a into v_action from jsonb_array_elements(v_tdoc -> 'row_actions') a where a ->> 'id' = p_action_id::text;

  if v_action ->> 'kind' = 'agent' then
    raise exception '"%" asks an agent, and an agent is not a fixed change, so it does not run here.', v_action ->> 'name'
      using errcode = '22023',
            hint = 'Open the record''s chat with the action''s prompt (the record-chat launcher does); the agent proposes its changes and a person confirms them. Nothing was changed.';
  end if;

  v_n := coalesce(cardinality(p_record_ids), 0);
  if v_n = 0 then
    raise exception '"%" was run on no records.', v_action ->> 'name'
      using errcode = '22023', hint = 'Select the records it should change. Nothing was changed.';
  end if;
  v_max := coalesce((platform.knob_resolve('custom', 'action_run_records_max', p_organization_id) #>> '{}')::integer, 5000);
  if v_n > v_max then
    raise exception '"%" can run on at most % records at once, and % were selected.', v_action ->> 'name', v_max, v_n
      using errcode = '54000',
            hint = 'Run it on a filtered view in parts. The ceiling is the organization knob custom/action_run_records_max. Nothing was changed.';
  end if;

  -- The columns the steps name, read once.
  select coalesce(jsonb_object_agg(f.id::text, jsonb_build_object('key', f.data ->> 'key', 'label', f.data ->> 'label',
                                   'type', f.data ->> 'type', 'config', f.data -> 'config')), '{}'::jsonb)
    into v_fields
    from custom.record f
   where f.organization_id = p_organization_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null
     and f.data ->> 'entity_definition_id' = v_table::text;
  for v_step in select e from jsonb_array_elements(v_action -> 'steps') e loop
    if not (v_fields ? (v_step ->> 'field')) then
      raise exception '"%" changes a column that is gone, so it cannot run until it is edited.', v_action ->> 'name'
        using errcode = '23503', hint = 'custom.row_actions names the step under stale. Nothing was changed.';
    end if;
  end loop;
  v_title := coalesce(nullif(v_tdoc ->> 'title_field', ''), 'name');

  foreach v_rid in array p_record_ids loop
    select * into v_rec from custom.record r
     where r.organization_id = p_organization_id and r.id = v_rid and r.table_id = v_table
       and r.data_class = 'record' and r.deleted_at is null;
    if v_rec.id is null then
      v_refused := v_refused || jsonb_build_array(jsonb_build_object('record_id', v_rid, 'record', null, 'field_id', null, 'field', null,
                     'says', format('This record is not a live record of %s.', coalesce(v_tdoc ->> 'name', 'this table'))));
      continue;
    end if;

    -- The patch, worked out against THIS record's own values (row-actions.ts compileRowAction).
    v_values := custom.record_values(p_organization_id, v_rid);
    v_ctx := coalesce(custom.rule_context(p_organization_id, v_rid), '{}'::jsonb)
             || jsonb_build_object('fx_self_id', v_rid, 'fx_table_id', v_table);
    v_patch := '{}'::jsonb;
    begin
      for v_step in select e from jsonb_array_elements(v_action -> 'steps') e loop
        v_field := v_fields -> (v_step ->> 'field');
        v_val := case v_step ->> 'set'
                   when 'clear' then 'null'::jsonb
                   when 'value' then v_step -> 'value'
                   else custom.formula_eval(p_organization_id, v_step -> 'expr', v_values, v_ctx) end;
        v_patch := v_patch || jsonb_build_object(v_field ->> 'key', custom._action_coerce(v_field, v_val, p_organization_id));
      end loop;
    exception when others then
      get stacked diagnostics v_msg = message_text;
      v_refused := v_refused || jsonb_build_array(jsonb_build_object('record_id', v_rid,
                     'record', v_rec.data ->> v_title, 'field_id', v_step ->> 'field', 'field', v_field ->> 'label',
                     'says', format('"%s": %s', v_field ->> 'label', v_msg)));
      continue;
    end;

    -- The write, through the store's own door. A refusal is tried again one column at a time
    -- so it names the FIELD; only this record's attempt is rolled back.
    begin
      v_ver := custom.record_update(p_organization_id, v_rid, v_patch);
      v_done := v_done || jsonb_build_array(jsonb_build_object('record_id', v_rid, 'version', v_ver));
    exception when others then
      get stacked diagnostics v_whole = message_text, v_hint = pg_exception_hint, v_state = returned_sqlstate;
      v_named := false;
      -- A record this person may not change is refused as a RECORD, not column by column.
      for k in select x from jsonb_object_keys(v_patch) x where v_state <> '42501' loop
        begin
          perform custom.record_update(p_organization_id, v_rid, jsonb_build_object(k, v_patch -> k));
          raise exception using errcode = 'P0001', message = 'gridprim action probe passed';
        exception when others then
          get stacked diagnostics v_msg = message_text, v_state = returned_sqlstate;
          if v_msg <> 'gridprim action probe passed' then
            v_named := true;
            select value into v_field from jsonb_each(v_fields) where value ->> 'key' = k;
            v_refused := v_refused || jsonb_build_array(jsonb_build_object('record_id', v_rid,
                           'record', v_rec.data ->> v_title,
                           'field_id', (select key from jsonb_each(v_fields) where value ->> 'key' = k),
                           'field', v_field ->> 'label', 'code', v_state, 'says', v_msg));
          end if;
        end;
      end loop;
      if not v_named then
        -- The columns pass one by one and fail together (a rule that compares two of them).
        v_refused := v_refused || jsonb_build_array(jsonb_build_object('record_id', v_rid,
                       'record', v_rec.data ->> v_title, 'field_id', null, 'field', null, 'code', v_state, 'says', v_whole));
      end if;
    end;
  end loop;

  if jsonb_array_length(v_refused) > 0 then
    v_one := v_refused -> 0;
    raise exception '"%" changed nothing: % of the % selected records refused it. First: %',
      v_action ->> 'name', (select count(distinct r ->> 'record_id') from jsonb_array_elements(v_refused) r), v_n,
      case when v_one ->> 'record' is not null then (v_one ->> 'record') || ' — ' else '' end
      || case when v_one ->> 'field' is not null then (v_one ->> 'field') || ': ' || (v_one ->> 'says') else v_one ->> 'says' end
      using errcode = '23514',
            detail = v_refused::text,
            hint = 'The selection is one change: it happens for every record or for none. DETAIL lists every record and field that refused and why; fix those (or run the action on the others) and run it again.';
  end if;

  -- THE RUN ROW (CHAIR-DOORS-4, lane 11 need 1d-b): what ran, on which records, by whom, when, and how
  -- it went — a row of the store itself (data_class action_run, no Table, the way checklist runs are
  -- kept), read back by custom.record_runs. A refused selection raises above and so leaves no row:
  -- the door's contract is that nothing is written, and that includes this.
  insert into custom.record (organization_id, table_id, data_class, data)
  values (p_organization_id, null, 'action_run', jsonb_build_object(
            'action_id',  p_action_id,
            'action',     v_action ->> 'name',
            'table_id',   v_table,
            'record_ids', (select coalesce(jsonb_agg(d -> 'record_id'), '[]'::jsonb) from jsonb_array_elements(v_done) d),
            'ran',        jsonb_array_length(v_done),
            'selected',   v_n,
            'outcome',    'ran',
            'ran_by',     custom.query_principal(),
            'ran_at',     now()))
  returning id into v_run;

  return jsonb_build_object('action_id', p_action_id, 'action', v_action ->> 'name', 'table_id', v_table,
                            'ran', jsonb_array_length(v_done), 'records', v_done, 'run_id', v_run);
end
$function$;

DROP FUNCTION IF EXISTS custom._stamp_check(text, jsonb, jsonb);
DROP FUNCTION IF EXISTS custom._stamp_value(uuid, jsonb, jsonb);
DROP FUNCTION IF EXISTS custom._stamp_token(uuid, text);
