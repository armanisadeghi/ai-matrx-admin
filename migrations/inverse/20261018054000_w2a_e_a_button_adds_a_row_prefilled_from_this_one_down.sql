-- inverse of 20261018054000_w2a_e_a_button_adds_a_row_prefilled_from_this_one.sql
-- chair-step: put back the bodies 20261018054000_w2a_e_a_button_adds_a_row_prefilled_from_this_one.sql replaced
-- lane: W2-A
-- lock: custom
CREATE OR REPLACE FUNCTION custom._field_kind_shape_ok(d jsonb, p_label text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_format text := d ->> 'format';
  v_type   text := d ->> 'type';
  v_system text := d -> 'config' ->> 'system';
  v_max    numeric;
  v_min    numeric;
begin
  if v_format = 'rating' then
    if v_type <> 'range' then
      raise exception 'The column "%" shows a rating, and a rating is a number of stars, not %.', p_label, custom.said(v_type, 'nothing')
        using errcode = '23514', hint = 'P4: a rating is behaviour range with format rating. Nothing was written.';
    end if;
    select max((r ->> 'value')::numeric) filter (where r ->> 'kind' = 'max'),
           min((r ->> 'value')::numeric) filter (where r ->> 'kind' = 'min')
      into v_max, v_min
      from jsonb_array_elements(coalesce(d -> 'rules', '[]'::jsonb)) r
     where r ->> 'kind' in ('min', 'max') and (r ->> 'value') ~ '^-?[0-9]+(\.[0-9]+)?$';
    -- A rating with no max Rule is out of 5 (the five rating columns the older grid's importer
    -- wrote carry none, measured on the main database 2026-10-02, and they keep working).
    if v_max is not null and (v_max <> trunc(v_max) or v_max < 1 or v_max > 10) then
      raise exception 'The rating "%" goes up to a whole number of stars from 1 to 10, and it says %.', p_label, v_max
        using errcode = '23514', hint = 'P4: a rating carries a max Rule of 1 to 10 - its top star - or none for 5. Nothing was written.';
    end if;
    if v_min is not null and v_min <> 0 then
      raise exception 'The rating "%" starts at no stars, so its lowest value is 0.', p_label
        using errcode = '23514', hint = 'P4: a rating''s min Rule, when it has one, is 0. Nothing was written.';
    end if;
    if coalesce((d ->> 'multi')::boolean, false) then
      raise exception 'The rating "%" holds one score, never a list.', p_label using errcode = '23514';
    end if;
  elsif v_format = 'duration' then
    if v_type <> 'range' or coalesce(d ->> 'unit', 'seconds') <> 'seconds' then
      raise exception 'The column "%" holds a length of time, and a length of time is a number of seconds.', p_label
        using errcode = '23514', hint = 'P4: a duration is behaviour range, format duration, unit seconds. Nothing was written.';
    end if;
  elsif v_format = 'status' then
    if v_type <> 'list' or coalesce((d ->> 'multi')::boolean, false) then
      raise exception 'The status "%" is one choice at a time, from its own list.', p_label
        using errcode = '23514', hint = 'P4: a status is a list Field that is not multi, with format status. Nothing was written.';
    end if;
    if d -> 'config' ? 'status_groups'
       and (jsonb_typeof(d -> 'config' -> 'status_groups') <> 'object'
            or exists (select 1 from jsonb_each(d -> 'config' -> 'status_groups') g
                        where g.value not in ('"todo"'::jsonb, '"in_progress"'::jsonb, '"done"'::jsonb))) then
      raise exception 'The status "%" puts a choice in a group that is not to do, in progress or done.', p_label
        using errcode = '23514', hint = 'P4: config.status_groups maps a choice key to todo, in_progress or done. Nothing was written.';
    end if;
  elsif v_format in ('address', 'barcode', 'rich_text') then
    if v_type <> 'text' then
      raise exception 'The column "%" holds % and that is kept as words, not %.', p_label,
                      case v_format when 'address' then 'an address' when 'barcode' then 'a barcode' else 'formatted text' end,
                      custom.said(v_type, 'nothing')
        using errcode = '23514', hint = 'P4: address, barcode and rich text are behaviour text with their format. Nothing was written.';
    end if;
    if v_format in ('address', 'rich_text') and coalesce((d ->> 'multi')::boolean, false) then
      raise exception 'The column "%" holds one %, never a list.', p_label,
                      case v_format when 'address' then 'address' else 'piece of text' end
        using errcode = '23514';
    end if;
  elsif v_format = 'button' then
    -- NOTION-PROPS-2: a button holds no value; config.button says what a press does.
    if v_type <> 'text' or coalesce((d ->> 'multi')::boolean, false) then
      raise exception 'The button "%" is a label and what a press does; it is kept as behaviour text, one per row.', p_label
        using errcode = '23514', hint = 'NOTION-PROPS-2: a button is behaviour text with format button. Nothing was written.';
    end if;
    if jsonb_typeof(d -> 'config' -> 'button') is distinct from 'object' then
      raise exception 'The button "%" needs its settings: at least a label.', p_label
        using errcode = '23514', hint = 'NOTION-PROPS-2: config.button = {"label": "…", "do": "open_url" | "run_automation" | "run_action"}. Nothing was written.';
    end if;
    if (d -> 'config' -> 'button' ->> 'do') is not null
       and (d -> 'config' -> 'button' ->> 'do') not in ('open_url', 'run_automation', 'run_action') then
      raise exception 'The button "%" can open a link, run an automation or run a row action, and it says "%".', p_label,
                      left(d -> 'config' -> 'button' ->> 'do', 40)
        using errcode = '23514', hint = 'NOTION-PROPS-2: do is open_url, run_automation or run_action. Nothing was written.';
    end if;
    if d -> 'config' -> 'button' ->> 'do' = 'open_url'
       and coalesce(d -> 'config' -> 'button' ->> 'url', '') !~* '^(https?://|mailto:|tel:|\{\{)' then
      raise exception 'The button "%" opens a link, and a link starts with https://, mailto: or tel:.', p_label
        using errcode = '23514', hint = 'NOTION-PROPS-2: {{field id}} in the link is filled from the row. Nothing was written.';
    end if;
    if d -> 'config' -> 'button' ->> 'do' = 'run_automation'
       and coalesce(d -> 'config' -> 'button' ->> 'automation_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'The button "%" runs an automation, and does not say which one.', p_label
        using errcode = '23514', hint = 'NOTION-PROPS-2: config.button.automation_id is one of this table''s automations. Nothing was written.';
    end if;
    if d -> 'config' -> 'button' ->> 'do' = 'run_action'
       and coalesce(d -> 'config' -> 'button' ->> 'action_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'The button "%" runs a row action, and does not say which one.', p_label
        using errcode = '23514', hint = 'NOTION-PROPS-2: config.button.action_id is one of this table''s row actions. Nothing was written.';
    end if;
  elsif v_format = 'count' then
    if v_type <> 'formula' or coalesce(d -> 'config' ->> 'agg', '') <> 'count' then
      raise exception 'The count "%" counts the records it points at, and it is set up to do something else.', p_label
        using errcode = '23514', hint = 'P4: a count is a roll-up whose config.agg is count. Nothing was written.';
    end if;
  end if;

  if d -> 'config' ? 'symbology' and jsonb_typeof(d -> 'config' -> 'symbology') <> 'null' then
    if v_format is distinct from 'barcode' then
      raise exception 'The column "%" is not a barcode, so it has no symbology.', p_label using errcode = '23514';
    end if;
    if not ((d -> 'config' ->> 'symbology') = any (custom.barcode_symbologies())) then
      raise exception 'The barcode "%" says it is %, and a barcode is one of %.', p_label, d -> 'config' ->> 'symbology',
                      array_to_string(custom.barcode_symbologies(), ', ')
        using errcode = '23514', hint = 'P4: leave symbology out to take any code a scanner reads. Nothing was written.';
    end if;
  end if;
  if d -> 'config' ? 'status_groups' and v_format is distinct from 'status' then
    raise exception 'The column "%" is not a status, so it has no groups.', p_label using errcode = '23514';
  end if;

  if v_system in ('created_by', 'modified_by') then
    if v_type <> 'formula' or coalesce(d ->> 'compute_on', '') <> 'read' then
      raise exception 'The column "%" says who % each record, and the store fills that in when it is read.', p_label,
                      case v_system when 'created_by' then 'made' else 'last changed' end
        using errcode = '23514', hint = 'P4: created_by and modified_by are formula Fields worked out on read. Nothing was written.';
    end if;
  end if;
end;
$function$;

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

CREATE OR REPLACE FUNCTION custom.field_kinds()
 RETURNS TABLE(kind text, behavior text, parity boolean, made_of text)
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO 'pg_catalog'
AS $function$
  select t.parity_type, t.behavior, true, t.made_of
    from custom.parity_field_types() t
  union all
  select * from (values
    ('text',      'text',     false, 'plain text: behaviour text with no format — it carries no parity type, which is exactly what custom.parity_type answers for it'),
    ('long_text', 'text',     false, 'behaviour text with format long and config.multiline, for several lines rather than one'),
    ('number',    'range',    false, 'a plain number: behaviour range with no date kind and neither the currency nor the percent format'),
    ('relation',  'relation', false, 'REL / FLD-11: a relation a person aims themselves — relation_target names a Table of this organization, and it is a BEHAVIOUR, never a parity type of its own'),
    ('signature', 'text',     false, 'VAL-10: behaviour text whose format is signature — the one shape custom.doc_sign accepts, sealed by custom.doc_signature_write and checked by custom.doc_signature_intact'),
    ('entity_reference', 'relation', false, 'SC-R / P12: a relation whose target mode is any (REL-8), restricted by config.allowed_types to the platform kinds it may name (custom.entity_reference_kinds() — agents, notes, web sites, workbooks, datasets, conversations …); each value is {token, id}, the edge a platform.associations row record → <token>. File and Person stay relations to their kernel Tables'),
    -- LANE 10 P4 (2026-10-02): nine kinds from Airtable's and SmartSuite's field lists. Each is an
    -- existing behaviour wearing a format (FLD-1's closed set holds); custom.field_kind_of reads
    -- each back; custom._field_kind_shape_ok and custom._kind_value_ok judge them.
    ('rating',      'range',    false, 'P4: behaviour range, format rating; a whole number of stars from 0 to its max Rule (1 to 10, default 5), shown as stars'),
    ('duration',    'range',    false, 'P4: behaviour range, format duration, unit seconds; a length of time kept as seconds, never below zero'),
    ('created_by',  'formula',  false, 'P4: a formula Field whose config.system is created_by: who made the record, {id, name}, filled by the store from the record''s writer on read and never typed'),
    ('modified_by', 'formula',  false, 'P4: a formula Field whose config.system is modified_by: who last changed the record, {id, name}, filled by the store on read and never typed'),
    ('status',      'list',     false, 'P4: a single-choice list with format status; config.status_groups puts each choice key in todo, in_progress or done (Notion''s Status)'),
    ('address',     'text',     false, 'P4: behaviour text, format address; the value is {street, city, region, postal_code, country}, every part optional, at least one filled'),
    ('barcode',     'text',     false, 'P4: behaviour text, format barcode; one printable line a scanner reads, config.symbology optional (custom.barcode_symbologies()), EAN/UPC digits and check digit enforced'),
    ('rich_text',   'text',     false, 'P4: behaviour text, format rich_text; Markdown with no raw HTML and no script links, shown formatted'),
    ('count',       'formula',  false, 'P4: a roll-up whose config.agg is count, with format count: how many records a many-relation points at, as a number of its own'),
    -- NOTION-PROPS-2 (2026-10-08): Notion's and Airtable's Button.
    ('button',      'text',     false, 'NOTION-PROPS-2: behaviour text, format button; holds no value. config.button says what a press does through custom.button_press: open_url (url, {{field id}} filled from the row), run_automation (one of the table''s automations, on this row) or run_action (one of its row actions, which sets fields); a button with no do yet is a label only')
  ) as extra(kind, behavior, parity, made_of);
$function$;
