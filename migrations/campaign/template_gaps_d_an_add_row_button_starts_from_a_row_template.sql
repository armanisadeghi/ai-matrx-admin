-- additive: yes
--
-- It REPLACES one function body, `custom.button_press(uuid, uuid, uuid)`: an add_row button may name a row template.
-- Inverse: migrations/inverse/template_gaps_d_an_add_row_button_starts_from_a_row_template_down.sql.
--
-- TEMPLATE-GAPS R3 (1) — "Log workout" / "New 1:1": the new row starts from a row template of the target table
-- (config.button.template_id), with the press's prefill on top ("@row" links it back to the pressed row).
--
-- based-on: custom.button_press(uuid, uuid, uuid) 1c9c22a5fbe53517f7f53897d997958f8876a36c90a368460fec39dd8339e31c

CREATE OR REPLACE FUNCTION custom.button_press(p_organization_id uuid, p_record_id uuid, p_field_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
-- NOTION-PROPS-2 (2026-10-08): PRESS A BUTTON ON A ROW. The button column's config.button says what a press does:
--   run_action      one of the table's row actions on this row, through custom.action_run (its own rights,
--                   confirm and steps — that is how a button sets fields);
--   run_automation  one of the table's automations on this row, through custom._automation_run (the steps a
--                   write would run), as an editor of the row; answers the run's status and words;
--   add_row         (W2-A) a new row in this table or config.button.table_id's, prefilled from this row (prefill),
--                   through custom.record_write; answers its record_id for the client to open;
--   open_url        answers the link with every {{field id}} filled from the row, each value percent-encoded
--                   unless it begins the link (WALK-FIXES D3); the client opens it.
-- A button with nothing set up yet (Notion's importer brings label only) is refused by name.
declare
  v_rec    custom.record;
  v_field  jsonb;
  v_btn    jsonb;
  v_do     text;
  v_label  text;
  v_auto   jsonb;
  v_values jsonb;
  v_fields jsonb;
  v_byid   jsonb;
  v_url    text;
  v_run    uuid;
  v_row    jsonb;
  v_txt    text;
  k        text;
  v        jsonb;
  -- AUTOMATIONS-AIRTABLE (2026-10-10): automations whose trigger is "button pressed" on this button.
  v_listen jsonb;
  v_runs   jsonb := '[]'::jsonb;
  v_ctx    jsonb;
  v_pick   jsonb;
  v_target uuid;   -- W2-A 2: the table an add_row press adds to
  v_new    jsonb;
  v_new_id uuid;
  v_tpl    jsonb;   -- TEMPLATE-GAPS R3 (1): the row template's preset values
begin
  perform custom.assert_store_door(p_organization_id, 'custom.button_press');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.button_press');

  select r.* into v_rec from custom.record r
   where r.organization_id = p_organization_id and r.id = p_record_id
     and r.data_class = 'record' and r.deleted_at is null;
  if v_rec.id is null then
    raise exception 'There is no such row here.' using errcode = '23503',
          hint = 'It may have been archived, or it belongs to another organization. Nothing ran.';
  end if;
  perform custom.assert_client_may_open(p_organization_id, p_record_id, 'custom.button_press',
                                        'viewer'::public.permission_level, 'record');

  select f.data into v_field from custom.record f
   where f.organization_id = p_organization_id and f.id = p_field_id
     and f.table_id = custom.field_kernel_id() and f.deleted_at is null
     and f.data ->> 'entity_definition_id' = v_rec.table_id::text;
  if v_field is null or custom.field_kind_of(v_field) is distinct from 'button' then
    raise exception 'That is not a button on this row''s table.' using errcode = '22023',
          hint = 'NOTION-PROPS-2: pass the id of a button column of the row''s own table. Nothing ran.';
  end if;
  v_btn := coalesce(v_field -> 'config' -> 'button', '{}'::jsonb);
  v_do := v_btn ->> 'do';
  v_label := coalesce(nullif(btrim(v_btn ->> 'label'), ''), v_field ->> 'label', 'This button');
  -- AUTOMATIONS-AIRTABLE (2026-10-10): A PRESS IS ALSO A TRIGGER. Every switched-on automation of this table whose
  -- trigger is {"on":"button_pressed","field":<this button>} runs on this row (its condition asked first), as an
  -- editor of the row, before whatever the button itself does. A button set up to do nothing but start them is a
  -- button whose press runs them.
  select coalesce(jsonb_agg(a order by a ->> 'created_at'), '[]'::jsonb) into v_listen
    from custom.record t, jsonb_array_elements(coalesce(t.data -> 'automations', '[]'::jsonb)) a
   where t.organization_id = p_organization_id and t.id = v_rec.table_id and t.table_id = custom.table_kernel_id()
     and (a ->> 'archived_at') is null and coalesce((a ->> 'enabled')::boolean, false)
     and a -> 'spec' -> 'trigger' ->> 'on' = 'button_pressed'
     and a -> 'spec' -> 'trigger' ->> 'field' = p_field_id::text;
  if jsonb_array_length(v_listen) > 0 then
    perform custom.assert_client_may_change(p_organization_id, p_record_id, 'custom.button_press',
                                            'editor'::public.permission_level, 'record');
    v_values := coalesce(custom.record_values(p_organization_id, p_record_id), '{}'::jsonb);
    v_fields := custom._automation_fields(p_organization_id, v_rec.table_id);
    select coalesce(jsonb_object_agg(f.key, coalesce(v_values -> (f.value ->> 'key'), 'null'::jsonb)), '{}'::jsonb)
      into v_byid from jsonb_each(v_fields) f;
    v_ctx := coalesce(custom.rule_context(p_organization_id, p_record_id), '{}'::jsonb)
             || jsonb_build_object('fx_self_id', p_record_id, 'fx_table_id', v_rec.table_id);
    for v_auto in select e from jsonb_array_elements(v_listen) e loop
      if jsonb_typeof(v_auto -> 'spec' -> 'condition') = 'object' then
        begin
          continue when not coalesce(custom._fx_truthy(custom.rule_eval(p_organization_id,
                           custom._automation_bind(v_auto -> 'spec' -> 'condition', v_byid), v_values, v_ctx)), false);
        exception when others then
          null;  -- a condition that cannot be worked out runs, and the run says what failed
        end;
      end if;
      v_run := custom._automation_run(p_organization_id, v_rec.table_id, p_record_id, v_auto, v_byid, v_fields, null,
                 jsonb_build_object('on', 'button_pressed', 'field', p_field_id, 'operation', 'pressed'));
      select r.data into v_row from custom.record r where r.organization_id = p_organization_id and r.id = v_run;
      v_runs := v_runs || jsonb_build_array(jsonb_build_object('run_id', v_run, 'automation', v_row ->> 'automation',
                  'status', v_row ->> 'status', 'says', v_row ->> 'says'));
    end loop;
    if v_do is null then
      if jsonb_array_length(v_runs) = 0 then
        return jsonb_build_object('do', 'run_automation', 'label', v_label, 'run_id', null, 'automation', null,
                 'status', 'skipped', 'says', 'This row does not meet the conditions of the automations this button starts.',
                 'runs', v_runs);
      end if;
      select x into v_pick from jsonb_array_elements(v_runs) with ordinality as e(x, n)
       order by (x ->> 'status' = 'failed') desc, n desc limit 1;
      return jsonb_build_object('do', 'run_automation', 'label', v_label, 'run_id', v_pick ->> 'run_id',
               'automation', v_pick ->> 'automation', 'status', v_pick ->> 'status', 'says', v_pick ->> 'says',
               'runs', v_runs);
    end if;
  end if;

  if v_do is null then
    raise exception '"%" has nothing set up to do yet.', v_label using errcode = '22023',
          hint = 'Open the column''s settings and choose what a press does: open a link, run an automation or run a row action.';
  end if;

  if v_do = 'run_action' then
    return jsonb_build_object('do', 'run_action', 'label', v_label,
             'result', custom.action_run(p_organization_id, (v_btn ->> 'action_id')::uuid, array[p_record_id]));
  end if;

  v_values := coalesce(custom.record_values(p_organization_id, p_record_id), '{}'::jsonb);
  v_fields := custom._automation_fields(p_organization_id, v_rec.table_id);
  select coalesce(jsonb_object_agg(f.key, coalesce(v_values -> (f.value ->> 'key'), 'null'::jsonb)), '{}'::jsonb)
    into v_byid from jsonb_each(v_fields) f;

  -- W2-A 2: ADD A ROW. A new row in this table, or in the table config.button.table_id names, prefilled from the pressed
  -- row by config.button.prefill ({new row's key: pressed row's key, or "@row" for the pressed row's id, which a link
  -- column back to this table takes). It goes through custom.record_write, the store's create door, so the presser's
  -- own right to add to that table decides; the client opens the answered record_id.
  if v_do = 'add_row' then
    v_target := coalesce(nullif(v_btn ->> 'table_id', '')::uuid, v_rec.table_id);
    -- W2-A 2b: "@row" into a link column that holds more than one (relation_max > 1) goes as a one-item list, the
    -- shape record_write keeps for it; a one-link takes the bare id.
    select coalesce(jsonb_object_agg(e.key, case when e.value #>> '{}' = '@row' then
                                                    case when coalesce((tf.data ->> 'relation_max')::integer, 1) > 1
                                                         then jsonb_build_array(p_record_id::text) else to_jsonb(p_record_id::text) end
                                                  else v_values -> (e.value #>> '{}') end), '{}'::jsonb)
      into v_new
      from jsonb_each(case when jsonb_typeof(v_btn -> 'prefill') = 'object' then v_btn -> 'prefill' else '{}'::jsonb end) e
      left join custom.record tf
        on tf.organization_id = p_organization_id and tf.table_id = custom.field_kernel_id() and tf.deleted_at is null
       and tf.data ->> 'entity_definition_id' = v_target::text and tf.data ->> 'key' = e.key and tf.data ->> 'type' = 'relation';
    -- TEMPLATE-GAPS R3 (1): NOTION'S "NEW 1:1" — the new row starts from one of the target table's row templates
    -- (config.button.template_id, custom.row_template_declare), its preset values under the press's own prefill
    -- (a prefilled value wins). A template that is gone, or of another table, is refused by name, never ignored.
    if nullif(v_btn ->> 'template_id', '') is not null then
      select sv.definition -> 'values' into v_tpl
        from platform.saved_view sv
       where sv.organization_id = p_organization_id and sv.id = (v_btn ->> 'template_id')::uuid
         and sv.deleted_at is null and sv.surface_key = 'custom/records/template' and sv.subject_id = v_target;
      if not found then
        raise exception 'This button starts its new row from a row template that is no longer on that table.' using errcode = '23503',
              hint = 'Pick another template in the button''s settings, or leave the template out. Nothing was added.';
      end if;
      v_new := coalesce(case when jsonb_typeof(v_tpl) = 'object' then v_tpl end, '{}'::jsonb) || jsonb_strip_nulls(v_new);
    end if;
    v_new_id := custom.record_write(p_organization_id, v_target, jsonb_strip_nulls(v_new));
    return jsonb_build_object('do', 'add_row', 'label', v_label, 'table_id', v_target, 'record_id', v_new_id)
           || case when nullif(v_btn ->> 'template_id', '') is not null then jsonb_build_object('template_id', v_btn ->> 'template_id') else '{}'::jsonb end;
  end if;

  if v_do = 'open_url' then
    v_url := v_btn ->> 'url';
    for k, v in select key, value from jsonb_each(v_byid) loop
      v_txt := case when jsonb_typeof(v) = 'string' then v #>> '{}'
                    when v is null or jsonb_typeof(v) = 'null' then '' else v::text end;
      -- WALK-FIXES D3 (2026-10-08): a value that BEGINS the link (a column holding a whole address) goes in
      -- as it is; anywhere else it is one part of the link and is percent-encoded, so "Demolish old cabinets"
      -- arrives as q=Demolish%20old%20cabinets and an & or # in a row's value never breaks the link.
      if left(v_url, length('{{' || k || '}}')) = '{{' || k || '}}' then
        v_url := v_txt || substr(v_url, length('{{' || k || '}}') + 1);
      end if;
      v_url := replace(v_url, '{{' || k || '}}',
                 (select coalesce(string_agg(case when t.c ~ '^[A-Za-z0-9_.~-]$' then t.c
                                                  else upper(regexp_replace(encode(convert_to(t.c, 'UTF8'), 'hex'), '(..)', '%\1', 'g')) end,
                                             '' order by t.n), '')
                    from regexp_split_to_table(v_txt, '') with ordinality as t(c, n)));
    end loop;
    if v_url !~* '^(https?://|mailto:|tel:)' then
      raise exception '"%" opens a link, and with this row''s values it is not one.', v_label using errcode = '22023',
            hint = 'A link starts with https://, mailto: or tel:. Nothing was opened.';
    end if;
    return jsonb_build_object('do', 'open_url', 'label', v_label, 'url', v_url);
  end if;

  -- run_automation: it changes things, so the presser edits this row.
  perform custom.assert_client_may_change(p_organization_id, p_record_id, 'custom.button_press',
                                          'editor'::public.permission_level, 'record');
  select a into v_auto
    from custom.record t, jsonb_array_elements(coalesce(t.data -> 'automations', '[]'::jsonb)) a
   where t.organization_id = p_organization_id and t.id = v_rec.table_id
     and a ->> 'id' = v_btn ->> 'automation_id' and (a ->> 'archived_at') is null;
  if v_auto is null then
    raise exception '"%" runs an automation this table no longer has.', v_label using errcode = '23503',
          hint = 'Choose another automation in the column''s settings. Nothing ran.';
  end if;
  v_run := custom._automation_run(p_organization_id, v_rec.table_id, p_record_id, v_auto, v_byid, v_fields, null,
             jsonb_build_object('on', 'button_pressed', 'field', p_field_id, 'operation', 'pressed'));
  select r.data into v_row from custom.record r where r.organization_id = p_organization_id and r.id = v_run;
  return jsonb_build_object('do', 'run_automation', 'label', v_label, 'run_id', v_run,
           'automation', v_row ->> 'automation', 'status', v_row ->> 'status', 'says', v_row ->> 'says');
end
$function$;
