-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: BUILD-CONN
-- lock: custom
-- based-on: custom._automation_check_timed(uuid, uuid, jsonb) c51e0878db817a6cd25b6a236434cb8132618bdc7ba51a0dc53dff849ce1e84e
-- based-on: custom._automation_check_steps(uuid, uuid, jsonb, text, boolean, integer) 7607579145b52d601d277a9a3a9f195ef5f7fb18e9fe62bedaab6921a805c424
-- based-on: custom._automation_advance(uuid) bf581332672fe4272bbe20d5f5f13d94c720712e187e50184e37ed0409ba79df
-- based-on: custom.automation_declare(uuid, uuid, jsonb, uuid) 130d0a73b25bee5f56ea14f5db9dcc314943dadd20774e42e017825165ea7444
-- based-on: custom.automation_resume(uuid, jsonb, text, jsonb) db187c21ddc19c71f773863e49ddd39fb1beecbbe7ad8911f052587359703c5d
--
-- BC-1 - two table-automation action steps, both run by the server as the automation's owner:
--   app_tool {connection, tool, arguments, items_path?}: ANY tool on ANY of the owner's connected apps (Asana, Jira via
--     Atlassian, Box, Salesforce, Linear, Notion …) - one step for every app, no per-app code (aidream
--     services/automations/app_tool_step.py, the door of the workflow step connection.call_tool).
--   document {template_id, record}: renders the record through a custom.doc_template into a frozen custom.doc_render.
-- Bodies are the live bodies with the two kinds added beside slack_post (check_steps branches + step list, advance wait
-- list + sentence, check_timed / declare server-step paths, resume sentence). Priced at the existing knob
-- automation.app_action_points. Inverse: migrations/inverse/20261021280000_bc_a_any_connected_app_and_document_steps_down.sql.
CREATE OR REPLACE FUNCTION custom._automation_check_timed(p_organization_id uuid, p_table_id uuid, p_spec jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  c_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  c_tok  constant text := '\{\{\s*(step[0-9]+|trigger|item|index)';
  v_trig  jsonb := case when jsonb_typeof(p_spec) = 'object' then p_spec -> 'trigger' end;
  v_on    text := case when jsonb_typeof(v_trig) = 'object' then v_trig ->> 'on' end;
  v_v2    boolean;
  v_rowless boolean;
  v_core  jsonb;
  v_steps jsonb;
  v_err   jsonb := '{}'::jsonb;
  v_norm  jsonb;
  v_at    text;
  v_fld   jsonb;
  v_kind  text;
  v_every text;
  v_a     jsonb;
  v_i     integer := 0;
  v_n     numeric;
  k       text;
  v_e     jsonb;
begin
  v_v2 := jsonb_typeof(p_spec) = 'object' and (
            v_on = 'webhook'
            or v_on in ('gmail_received', 'calendar_event', 'slack_message', 'outlook_received')
            or (v_on = 'schedule' and v_trig ->> 'every' in ('hour', 'minutes'))
            or (jsonb_typeof(p_spec -> 'actions') = 'array' and (
                  jsonb_path_exists(p_spec, '$.actions[*] ? (@.do == "if" || @.do == "for_each" || @.do == "find" || @.do == "archive" || @.do == "update" || @.do == "script" || @.do == "run_mandate" || @.do == "gmail" || @.do == "sms" || @.do == "google_calendar_event" || @.do == "github_issue" || @.do == "outlook_mail" || @.do == "outlook_calendar_event" || @.do == "teams_message" || @.do == "slack_post" || @.do == "app_tool" || @.do == "document")')
                  or (p_spec -> 'actions')::text ~ c_tok)));
  if not v_v2 and (v_on is null or v_on not in ('date_arrives', 'schedule')) then
    return custom._automation_check(p_organization_id, p_table_id, p_spec);
  end if;
  v_rowless := v_on in ('webhook', 'schedule', 'gmail_received', 'calendar_event', 'slack_message', 'outlook_received');

  if v_v2 then
    -- name, trigger and condition through the store's checker, with one stand-in step; the steps are walked below
    v_core := custom._automation_check(p_organization_id, p_table_id,
                jsonb_build_object('name', p_spec -> 'name',
                  'trigger', case when v_on in ('webhook', 'schedule', 'date_arrives', 'gmail_received', 'calendar_event', 'slack_message', 'outlook_received') then jsonb_build_object('on', 'row_added') else v_trig end,
                  'condition', case when v_rowless then null else p_spec -> 'condition' end,
                  'actions', jsonb_build_array(jsonb_build_object('do', 'notify', 'to', jsonb_build_object('author', true), 'text', 'x'))));
  else
    v_core := custom._automation_check(p_organization_id, p_table_id,
                jsonb_set(p_spec, '{trigger}', jsonb_build_object('on', 'row_added')));
  end if;
  if v_core ? '_errors' then
    v_err := v_core -> '_errors';
  end if;

  if v_on = 'webhook' then
    v_norm := jsonb_build_object('on', 'webhook');
    if p_spec ? 'condition' and jsonb_typeof(p_spec -> 'condition') <> 'null' then
      v_err := v_err || jsonb_build_object('condition', 'A webhook has no row to test. To branch on its payload, use a conditional group.');
    end if;
  elsif v_on in ('gmail_received', 'calendar_event', 'slack_message', 'outlook_received') then
    -- W2-E: a connected-app trigger. The server checks the owner's own connected account on the automation's own
    -- schedule (made when the person switches it on) and starts one run per new item; the item is {{trigger.body.…}}.
    if p_spec ? 'condition' and jsonb_typeof(p_spec -> 'condition') <> 'null' then
      v_err := v_err || jsonb_build_object('condition', 'A connected-app trigger has no row to test. To branch on the item, use a conditional group.');
    end if;
    if v_on = 'outlook_received' then
      -- AT-MSFT: a new email in the owner's Outlook inbox (Mail.ReadBasic envelopes; aidream app_triggers.poll_outlook).
      if v_trig ? 'query' and jsonb_typeof(v_trig -> 'query') not in ('string', 'null') then
        v_err := v_err || jsonb_build_object('trigger.query', 'Write the Outlook search as text, like from:orders@shop.com subject:invoice.');
      elsif length(coalesce(v_trig ->> 'query', '')) > 500 then
        v_err := v_err || jsonb_build_object('trigger.query', 'Keep the Outlook search under 500 characters.');
      end if;
      v_norm := jsonb_strip_nulls(jsonb_build_object('on', 'outlook_received', 'query', nullif(btrim(coalesce(v_trig ->> 'query', '')), '')));
    elsif v_on = 'gmail_received' then
      if v_trig ? 'query' and jsonb_typeof(v_trig -> 'query') not in ('string', 'null') then
        v_err := v_err || jsonb_build_object('trigger.query', 'Write the Gmail search as text, like from:orders@shop.com has:attachment.');
      elsif length(coalesce(v_trig ->> 'query', '')) > 500 then
        v_err := v_err || jsonb_build_object('trigger.query', 'Keep the Gmail search under 500 characters.');
      end if;
      v_norm := jsonb_strip_nulls(jsonb_build_object('on', 'gmail_received', 'query', nullif(btrim(coalesce(v_trig ->> 'query', '')), '')));
    elsif v_on = 'calendar_event' then
      if coalesce(v_trig ->> 'when', 'starts') not in ('starts', 'created') then
        v_err := v_err || jsonb_build_object('trigger.when', 'Say when it runs: when an event starts or when one is created.');
      end if;
      v_n := case when jsonb_typeof(v_trig -> 'minutes_before') = 'number' then (v_trig ->> 'minutes_before')::numeric else 0 end;
      if v_n is null or v_n <> trunc(v_n) or v_n not between 0 and 1440 then
        v_err := v_err || jsonb_build_object('trigger.minutes_before', 'Say how many whole minutes before the start, 0 to 1440.');
      end if;
      v_norm := jsonb_build_object('on', 'calendar_event', 'when', coalesce(v_trig ->> 'when', 'starts'))
                || case when coalesce(v_trig ->> 'when', 'starts') = 'starts' then jsonb_build_object('minutes_before', coalesce(v_n, 0)::integer) else '{}'::jsonb end;
    else
      if jsonb_typeof(v_trig -> 'channel') is distinct from 'string' or btrim(v_trig ->> 'channel') = '' then
        v_err := v_err || jsonb_build_object('trigger.channel', 'Say which Slack channel to watch.');
      end if;
      v_norm := jsonb_strip_nulls(jsonb_build_object('on', 'slack_message', 'channel', btrim(coalesce(v_trig ->> 'channel', '')),
                  'contains', nullif(btrim(coalesce(v_trig ->> 'contains', '')), '')));
    end if;
  elsif v_on = 'date_arrives' then
    v_at := coalesce(nullif(btrim(v_trig ->> 'at'), ''), '09:00');
    if v_at !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      v_err := v_err || jsonb_build_object('trigger.at', 'Say the time of day as HH:MM on a 24-hour clock, like 09:00.');
    end if;
    v_fld := case when jsonb_typeof(v_trig -> 'field') = 'string' and (v_trig ->> 'field') ~* c_uuid
                  then custom._automation_fields(p_organization_id, p_table_id) -> (v_trig ->> 'field') end;
    v_kind := v_fld -> 'config' ->> 'kind';
    if v_fld is null or v_fld ->> 'type' <> 'range' or coalesce(v_kind, '') not in ('date', 'datetime') then
      v_err := v_err || jsonb_build_object('trigger.field', 'Name the date property to wait for, by its id, from this table.');
    end if;
    v_n := case when jsonb_typeof(v_trig -> 'offset_days') = 'number' then (v_trig ->> 'offset_days')::numeric end;
    if v_trig ? 'offset_days' and (v_n is null or v_n <> trunc(v_n) or abs(v_n) > 365) then
      v_err := v_err || jsonb_build_object('trigger.offset_days', 'Say how many whole days before (negative) or after (positive) the date, up to 365.');
    end if;
    v_norm := jsonb_build_object('on', 'date_arrives', 'field', v_trig ->> 'field',
                'offset_days', coalesce((v_trig ->> 'offset_days')::numeric::integer, 0), 'at', v_at);
  elsif v_on = 'schedule' then
    v_every := v_trig ->> 'every';
    if v_every is null or v_every not in ('day', 'week', 'month', 'hour', 'minutes') then
      v_err := v_err || jsonb_build_object('trigger.every', 'Say how often: minutes, hour, day, week or month.');
    elsif v_every = 'minutes' then
      v_n := case when jsonb_typeof(v_trig -> 'minutes') = 'number' then (v_trig ->> 'minutes')::numeric end;
      if v_n is null or v_n not in (5, 10, 15, 30) then
        v_err := v_err || jsonb_build_object('trigger.minutes', 'Every 5, 10, 15 or 30 minutes.');
      end if;
      v_norm := jsonb_build_object('on', 'schedule', 'every', 'minutes', 'minutes', coalesce(v_n, 15)::integer);
    elsif v_every = 'hour' then
      v_n := case when jsonb_typeof(v_trig -> 'hours') = 'number' then (v_trig ->> 'hours')::numeric else 1 end;
      if v_n is null or v_n not in (1, 2, 3, 4, 6, 8, 12) then
        v_err := v_err || jsonb_build_object('trigger.hours', 'Every 1, 2, 3, 4, 6, 8 or 12 hours.');
      end if;
      v_norm := jsonb_build_object('on', 'schedule', 'every', 'hour', 'hours', coalesce(v_n, 1)::integer);
      v_n := case when jsonb_typeof(v_trig -> 'minute') = 'number' then (v_trig ->> 'minute')::numeric else 0 end;
      if v_n is null or v_n not between 0 and 59 or v_n <> trunc(v_n) then
        v_err := v_err || jsonb_build_object('trigger.minute', 'Say the minute past the hour, 0 to 59.');
      else
        v_norm := v_norm || jsonb_build_object('minute', v_n::integer);
      end if;
    else
      v_at := coalesce(nullif(btrim(v_trig ->> 'at'), ''), '09:00');
      if v_at !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
        v_err := v_err || jsonb_build_object('trigger.at', 'Say the time of day as HH:MM on a 24-hour clock, like 09:00.');
      end if;
      v_norm := jsonb_build_object('on', 'schedule', 'every', v_every, 'at', v_at);
      if v_every = 'week' then
        v_n := case when jsonb_typeof(v_trig -> 'weekday') = 'number' then (v_trig ->> 'weekday')::numeric end;
        if v_n is null or v_n not between 1 and 7 or v_n <> trunc(v_n) then
          v_err := v_err || jsonb_build_object('trigger.weekday', 'Say which day of the week: 1 is Monday, 7 is Sunday.');
        else
          v_norm := v_norm || jsonb_build_object('weekday', (v_trig ->> 'weekday')::numeric::integer);
        end if;
      elsif v_every = 'month' then
        v_n := case when jsonb_typeof(v_trig -> 'day') = 'number' then (v_trig ->> 'day')::numeric end;
        if v_n is null or v_n not between 1 and 31 or v_n <> trunc(v_n) then
          v_err := v_err || jsonb_build_object('trigger.day', 'Say which day of the month, 1 to 31 (a short month runs on its last day).');
        else
          v_norm := v_norm || jsonb_build_object('day', (v_trig ->> 'day')::numeric::integer);
        end if;
      end if;
    end if;
    -- A schedule has no row: whatever reads one is refused by name, never silently written as empty.
    if p_spec ? 'condition' and jsonb_typeof(p_spec -> 'condition') <> 'null' then
      v_err := v_err || jsonb_build_object('condition', 'A schedule has no row to test, so it has no condition. To act on some rows only, use an "edit rows" step with a filter.');
    end if;
    if not v_v2 then
      for v_a in select e from jsonb_array_elements(case when jsonb_typeof(p_spec -> 'actions') = 'array' then p_spec -> 'actions' else '[]'::jsonb end) e loop
        if v_a ->> 'do' = 'set' then
          v_err := v_err || jsonb_build_object('actions.' || v_i, 'On a schedule there is no row for "set" to change. Use "add row" or "edit rows" with a filter.');
        elsif v_a ->> 'do' in ('notify', 'email') and (v_a -> 'to') ? 'field' then
          v_err := v_err || jsonb_build_object('actions.' || v_i || '.to', 'On a schedule there is no row to read a person from. Name the person.');
        elsif jsonb_path_exists(v_a, '$.**."from"') or jsonb_path_exists(v_a, '$.**."trigger"') then
          v_err := v_err || jsonb_build_object('actions.' || v_i, 'On a schedule there is no row to copy from or to match against; write the value itself.');
        end if;
        v_i := v_i + 1;
      end loop;
    end if;
  else
    v_norm := v_core -> 'spec' -> 'trigger';
  end if;

  if v_v2 then
    if jsonb_typeof(p_spec -> 'actions') <> 'array' or jsonb_array_length(p_spec -> 'actions') = 0 then
      v_err := v_err || jsonb_build_object('actions', 'An automation needs at least one action.');
    else
      v_steps := custom._automation_check_steps(p_organization_id, p_table_id, p_spec -> 'actions', 'actions', v_rowless, 0);
      v_err := v_err || (v_steps -> 'errors');
      if (v_steps ->> 'count')::integer > 50 then
        v_err := v_err || jsonb_build_object('actions', 'An automation has at most 50 steps, groups included.');
      end if;
    end if;
  end if;

  if v_err <> '{}'::jsonb then
    return jsonb_build_object('_errors', v_err);
  end if;
  if v_v2 then
    return jsonb_build_object('spec', jsonb_strip_nulls(jsonb_build_object('name', v_core -> 'spec' -> 'name', 'trigger', v_norm,
             'condition', case when v_rowless then null else v_core -> 'spec' -> 'condition' end))
             || jsonb_build_object('actions', v_steps -> 'actions'));
  end if;
  return jsonb_build_object('spec', jsonb_set(v_core -> 'spec', '{trigger}', v_norm));
end
$function$;

CREATE OR REPLACE FUNCTION custom._automation_check_steps(p_organization_id uuid, p_table_id uuid, p_acts jsonb, p_path text, p_rowless boolean, p_depth integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  c_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  c_tok  constant text := '\{\{\s*(step[0-9]+|trigger|item|index)';
  c_ops  constant text[] := array['equals','not_equals','contains','not_contains','gt','gte','lt','lte','empty','not_empty','is_true'];
  v_err  jsonb := '{}'::jsonb;
  v_out  jsonb := '[]'::jsonb;
  v_cnt  integer := 0;
  v_i    integer := 0;
  a      jsonb;
  b      jsonb;
  c      jsonb;
  p      text;
  v_do   text;
  v_norm jsonb;
  v_sub  jsonb;
  v_bs   jsonb;
  v_tgt  uuid;
  v_chk  jsonb;
  v_core jsonb;
  v_e    jsonb;
  k      text;
  v_msg  text;
  v_bi   integer;
  v_cl   jsonb;
begin
  if jsonb_typeof(p_acts) <> 'array' then
    return jsonb_build_object('actions', '[]'::jsonb, 'errors', jsonb_build_object(p_path, 'A group holds a list of steps.'), 'count', 0);
  end if;
  for a in select e from jsonb_array_elements(p_acts) e loop
    p := p_path || '.' || v_i::text;
    v_i := v_i + 1;
    v_cnt := v_cnt + 1;
    v_do := case when jsonb_typeof(a) = 'object' then a ->> 'do' end;
    v_norm := null;
    if v_do in ('if', 'for_each') and p_depth >= 3 then
      v_err := v_err || jsonb_build_object(p, 'Groups nest at most three deep.');
    elsif v_do = 'if' then
      if jsonb_typeof(a -> 'branches') <> 'array' or jsonb_array_length(a -> 'branches') not between 1 and 10 then
        v_err := v_err || jsonb_build_object(p || '.branches', 'A conditional group has 1 to 10 paths, each with a condition and its steps.');
      else
        v_bs := '[]'::jsonb;
        v_bi := 0;
        for b in select e from jsonb_array_elements(a -> 'branches') e loop
          v_cl := case when jsonb_typeof(b -> 'when') = 'object' then coalesce(b -> 'when' -> 'all', b -> 'when' -> 'any') end;
          if jsonb_typeof(v_cl) <> 'array' or jsonb_array_length(v_cl) = 0
             or exists (select 1 from jsonb_array_elements(v_cl) x
                         where jsonb_typeof(x) <> 'object' or not (x ->> 'is' = any (c_ops)) or not x ? 'value') then
            v_err := v_err || jsonb_build_object(p || '.branches.' || v_bi || '.when',
                       'Say the condition as {"all": [{"value": "{{step1.first.tier}}", "is": "equals", "to": "VIP"}]} (or "any").');
          end if;
          v_sub := custom._automation_check_steps(p_organization_id, p_table_id, coalesce(b -> 'actions', '[]'::jsonb),
                     p || '.branches.' || v_bi || '.actions', p_rowless, p_depth + 1);
          v_err := v_err || (v_sub -> 'errors');
          v_cnt := v_cnt + (v_sub ->> 'count')::integer;
          v_bs := v_bs || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('label', left(nullif(btrim(b ->> 'label'), ''), 60),
                    'when', b -> 'when', 'actions', v_sub -> 'actions')));
          v_bi := v_bi + 1;
        end loop;
        v_norm := jsonb_build_object('do', 'if', 'branches', v_bs);
        if a ? 'else' and jsonb_typeof(a -> 'else') = 'array' then
          v_sub := custom._automation_check_steps(p_organization_id, p_table_id, a -> 'else', p || '.else', p_rowless, p_depth + 1);
          v_err := v_err || (v_sub -> 'errors');
          v_cnt := v_cnt + (v_sub ->> 'count')::integer;
          v_norm := v_norm || jsonb_build_object('else', v_sub -> 'actions');
        end if;
      end if;
    elsif v_do = 'for_each' then
      if jsonb_typeof(a -> 'list') <> 'string' or (a ->> 'list') !~ c_tok then
        v_err := v_err || jsonb_build_object(p || '.list', 'Say which list to repeat over, as a token: {{step2.records}} or {{trigger.body.items}}.');
      elsif jsonb_typeof(a -> 'actions') <> 'array' or jsonb_array_length(a -> 'actions') = 0 then
        v_err := v_err || jsonb_build_object(p || '.actions', 'A repeating group needs at least one step to repeat.');
      else
        v_sub := custom._automation_check_steps(p_organization_id, p_table_id, a -> 'actions', p || '.actions', p_rowless, p_depth + 1);
        v_err := v_err || (v_sub -> 'errors');
        v_cnt := v_cnt + (v_sub ->> 'count')::integer;
        v_norm := jsonb_build_object('do', 'for_each', 'list', btrim(a ->> 'list'), 'actions', v_sub -> 'actions');
      end if;
    elsif v_do = 'find' then
      v_tgt := case when (a ->> 'table_id') ~* c_uuid then (a ->> 'table_id')::uuid end;
      if v_tgt is null or not exists (select 1 from custom.record t where t.organization_id = p_organization_id
            and t.id = v_tgt and t.table_id = custom.table_kernel_id() and t.deleted_at is null) then
        v_err := v_err || jsonb_build_object(p || '.table_id', 'The table to find records in is not in this organization.');
      elsif a ? 'where' and jsonb_typeof(a -> 'where') not in ('object', 'null') then
        v_err := v_err || jsonb_build_object(p || '.where', 'Say which records to find as a filter on that table.');
      else
        begin
          if jsonb_typeof(a -> 'where') = 'object' then
            perform custom.rule_eval(p_organization_id, custom._automation_bind(
              custom._automation_tok(a -> 'where', '{}'::jsonb), '{}'::jsonb), '{}'::jsonb, '{}'::jsonb);
          end if;
          v_norm := jsonb_strip_nulls(jsonb_build_object('do', 'find', 'table_id', v_tgt,
                      'where', case when jsonb_typeof(a -> 'where') = 'object' then a -> 'where' end,
                      'limit', least(greatest(coalesce((a ->> 'limit')::integer, 50), 1), 200)));
        exception when others then
          get stacked diagnostics v_msg = message_text;
          v_err := v_err || jsonb_build_object(p || '.where', 'The filter cannot be worked out: ' || v_msg);
        end;
      end if;
    elsif v_do in ('archive', 'update') then
      v_tgt := case when (a ->> 'table_id') ~* c_uuid then (a ->> 'table_id')::uuid end;
      if (v_do = 'update' or a ? 'table_id') and (v_tgt is null or not exists (select 1 from custom.record t
            where t.organization_id = p_organization_id and t.id = v_tgt and t.table_id = custom.table_kernel_id() and t.deleted_at is null)) then
        v_err := v_err || jsonb_build_object(p || '.table_id', 'The table those records are in is not in this organization.');
      elsif jsonb_typeof(a -> 'record') not in ('string', 'array') or (jsonb_typeof(a -> 'record') = 'string'
            and (a ->> 'record') !~ c_tok and (a ->> 'record') !~* c_uuid) then
        v_err := v_err || jsonb_build_object(p || '.record', 'Say which record: a token like {{trigger.record_id}}, {{step2.records}} or {{item.id}}.');
      elsif v_do = 'archive' then
        v_norm := jsonb_strip_nulls(jsonb_build_object('do', 'archive', 'record', a -> 'record', 'table_id', v_tgt));
      else
        v_e := custom._automation_values_errors(p_organization_id, v_tgt, p_table_id,
                 (select coalesce(jsonb_object_agg(x.key, case when jsonb_typeof(x.value) = 'string' and (x.value #>> '{}') ~ c_tok
                                                              then 'null'::jsonb else x.value end), '{}'::jsonb)
                    from jsonb_each(case when jsonb_typeof(a -> 'values') = 'object' then a -> 'values' else '{}'::jsonb end) x),
                 p || '.values');
        if jsonb_typeof(a -> 'values') <> 'object' or a -> 'values' = '{}'::jsonb then
          v_err := v_err || jsonb_build_object(p || '.values', 'Say which properties to set.');
        elsif v_e <> '{}'::jsonb then
          v_err := v_err || v_e;
        else
          v_norm := jsonb_build_object('do', 'update', 'table_id', v_tgt, 'record', a -> 'record', 'values', a -> 'values');
        end if;
      end if;
    elsif v_do = 'script' then
      if jsonb_typeof(a -> 'code') <> 'string' or btrim(a ->> 'code') = '' then
        v_err := v_err || jsonb_build_object(p || '.code', 'A script step needs its JavaScript.');
      elsif char_length(a ->> 'code') > 20000 then
        v_err := v_err || jsonb_build_object(p || '.code', 'A script is at most 20,000 characters.');
      elsif a ? 'inputs' and jsonb_typeof(a -> 'inputs') not in ('object', 'null') then
        v_err := v_err || jsonb_build_object(p || '.inputs', 'Inputs are named values: {"order": "{{trigger.body}}"}.');
      else
        v_norm := jsonb_build_object('do', 'script', 'code', a ->> 'code',
                    'inputs', case when jsonb_typeof(a -> 'inputs') = 'object' then a -> 'inputs' else '{}'::jsonb end,
                    'timeout_ms', least(greatest(coalesce((a ->> 'timeout_ms')::integer, 10000), 500), 30000),
                    'memory_mb', least(greatest(coalesce((a ->> 'memory_mb')::integer, 64), 16), 256));
      end if;
    elsif v_do = 'run_mandate' then
      if jsonb_typeof(a -> 'mandate_key') is distinct from 'string' or btrim(a ->> 'mandate_key') = '' then
        v_err := v_err || jsonb_build_object(p || '.mandate_key', 'Pick the job the agent does.');
      elsif a ? 'variables' and jsonb_typeof(a -> 'variables') not in ('object', 'null') then
        v_err := v_err || jsonb_build_object(p || '.variables', 'Variables are named values.');
      else
        v_norm := jsonb_strip_nulls(jsonb_build_object('do', 'run_mandate', 'mandate_key', btrim(a ->> 'mandate_key'),
                    'variables', case when jsonb_typeof(a -> 'variables') = 'object' then a -> 'variables' else '{}'::jsonb end,
                    'input', a -> 'input'));
      end if;
    elsif v_do = 'gmail' then
      if jsonb_typeof(a -> 'to') is distinct from 'string' or btrim(a ->> 'to') = '' then
        v_err := v_err || jsonb_build_object(p || '.to', 'Say who the email goes to.');
      elsif jsonb_typeof(a -> 'subject') is distinct from 'string' or jsonb_typeof(a -> 'body') is distinct from 'string' then
        v_err := v_err || jsonb_build_object(p, 'An email needs a subject and a message.');
      else
        v_norm := jsonb_build_object('do', 'gmail', 'to', btrim(a ->> 'to'), 'subject', a ->> 'subject', 'body', a ->> 'body');
      end if;
    elsif v_do = 'google_calendar_event' then
      if coalesce(a ->> 'action', 'create') not in ('create', 'update', 'cancel') then
        v_err := v_err || jsonb_build_object(p || '.action', 'A calendar step creates, updates or cancels an event.');
      elsif coalesce(a ->> 'action', 'create') = 'create'
            and (jsonb_typeof(a -> 'title') is distinct from 'string' or btrim(a ->> 'title') = '') then
        v_err := v_err || jsonb_build_object(p || '.title', 'Say what the event is called.');
      elsif coalesce(a ->> 'action', 'create') = 'create'
            and (jsonb_typeof(a -> 'starts_at') is distinct from 'string' or btrim(a ->> 'starts_at') = '') then
        v_err := v_err || jsonb_build_object(p || '.starts_at', 'Say when the event starts.');
      elsif coalesce(a ->> 'action', 'create') in ('update', 'cancel')
            and (jsonb_typeof(a -> 'event_id') is distinct from 'string' or btrim(a ->> 'event_id') = '') then
        v_err := v_err || jsonb_build_object(p || '.event_id', 'Say which event: use the event id an earlier calendar step made.');
      else
        v_norm := jsonb_strip_nulls(jsonb_build_object('do', 'google_calendar_event', 'action', coalesce(a ->> 'action', 'create'),
                    'event_id', nullif(btrim(a ->> 'event_id'), ''), 'title', a ->> 'title',
                    'starts_at', nullif(btrim(a ->> 'starts_at'), ''), 'ends_at', nullif(btrim(a ->> 'ends_at'), ''),
                    'duration_minutes', case when a ->> 'duration_minutes' ~ '^[0-9]{1,5}$' then (a ->> 'duration_minutes')::integer end,
                    'timezone', nullif(btrim(a ->> 'timezone'), ''), 'attendees', a ->> 'attendees',
                    'description', a ->> 'description', 'notify', case when jsonb_typeof(a -> 'notify') = 'boolean' then a -> 'notify' end));
      end if;
    elsif v_do = 'github_issue' then
      if jsonb_typeof(a -> 'repo') is distinct from 'string' or (a ->> 'repo') !~ '^\s*[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\s*$' then
        v_err := v_err || jsonb_build_object(p || '.repo', 'Name the repository as owner/name, like acme/website.');
      elsif jsonb_typeof(a -> 'title') is distinct from 'string' or btrim(a ->> 'title') = '' then
        v_err := v_err || jsonb_build_object(p || '.title', 'Say what the issue is called.');
      else
        v_norm := jsonb_strip_nulls(jsonb_build_object('do', 'github_issue', 'repo', btrim(a ->> 'repo'), 'title', a ->> 'title',
                    'body', a ->> 'body', 'labels', nullif(btrim(coalesce(a ->> 'labels', '')), '')));
      end if;
    elsif v_do = 'outlook_mail' then
      if jsonb_typeof(a -> 'to') is distinct from 'string' or btrim(a ->> 'to') = '' then
        v_err := v_err || jsonb_build_object(p || '.to', 'Say who the Outlook email goes to.');
      elsif jsonb_typeof(a -> 'subject') is distinct from 'string' or jsonb_typeof(a -> 'body') is distinct from 'string' then
        v_err := v_err || jsonb_build_object(p, 'An Outlook email needs a subject and a message.');
      else
        v_norm := jsonb_build_object('do', 'outlook_mail', 'to', btrim(a ->> 'to'), 'subject', a ->> 'subject', 'body', a ->> 'body');
      end if;
    elsif v_do = 'outlook_calendar_event' then
      if coalesce(a ->> 'action', 'create') not in ('create', 'update', 'cancel') then
        v_err := v_err || jsonb_build_object(p || '.action', 'An Outlook calendar step creates, updates or cancels an event.');
      elsif coalesce(a ->> 'action', 'create') = 'create'
            and (jsonb_typeof(a -> 'title') is distinct from 'string' or btrim(a ->> 'title') = '') then
        v_err := v_err || jsonb_build_object(p || '.title', 'Say what the event is called.');
      elsif coalesce(a ->> 'action', 'create') = 'create'
            and (jsonb_typeof(a -> 'starts_at') is distinct from 'string' or btrim(a ->> 'starts_at') = '') then
        v_err := v_err || jsonb_build_object(p || '.starts_at', 'Say when the event starts.');
      elsif coalesce(a ->> 'action', 'create') in ('update', 'cancel')
            and (jsonb_typeof(a -> 'event_id') is distinct from 'string' or btrim(a ->> 'event_id') = '') then
        v_err := v_err || jsonb_build_object(p || '.event_id', 'Say which event: use the event id an earlier Outlook calendar step made.');
      else
        v_norm := jsonb_strip_nulls(jsonb_build_object('do', 'outlook_calendar_event', 'action', coalesce(a ->> 'action', 'create'),
                    'event_id', nullif(btrim(a ->> 'event_id'), ''), 'title', a ->> 'title',
                    'starts_at', nullif(btrim(a ->> 'starts_at'), ''), 'ends_at', nullif(btrim(a ->> 'ends_at'), ''),
                    'duration_minutes', case when a ->> 'duration_minutes' ~ '^[0-9]{1,5}$' then (a ->> 'duration_minutes')::integer end,
                    'timezone', nullif(btrim(a ->> 'timezone'), ''), 'attendees', a ->> 'attendees',
                    'description', a ->> 'description', 'notify', case when jsonb_typeof(a -> 'notify') = 'boolean' then a -> 'notify' end));
      end if;
    elsif v_do = 'app_tool' then
      -- BUILD-CONN: ONE step for every connected app (any tool on any of the owner's connections); the server calls it.
      if jsonb_typeof(a -> 'connection') is distinct from 'string' or btrim(a ->> 'connection') = '' then
        v_err := v_err || jsonb_build_object(p || '.connection', 'Pick the connected app this step uses.');
      elsif jsonb_typeof(a -> 'tool') is distinct from 'string' or btrim(a ->> 'tool') = '' then
        v_err := v_err || jsonb_build_object(p || '.tool', 'Pick what this step does in that app.');
      elsif a ? 'arguments' and jsonb_typeof(a -> 'arguments') is distinct from 'object' then
        v_err := v_err || jsonb_build_object(p || '.arguments', 'The step''s arguments must be named values.');
      else
        v_norm := jsonb_strip_nulls(jsonb_build_object('do', 'app_tool', 'connection', btrim(a ->> 'connection'), 'tool', btrim(a ->> 'tool'),
                    'arguments', coalesce(a -> 'arguments', '{}'::jsonb), 'items_path', nullif(btrim(coalesce(a ->> 'items_path', '')), '')));
      end if;
    elsif v_do = 'document' then
      -- BUILD-CONN: render a record through one of its table's document templates (custom.doc_template), as the owner.
      if jsonb_typeof(a -> 'template_id') is distinct from 'string' or (a ->> 'template_id') !~* c_uuid then
        v_err := v_err || jsonb_build_object(p || '.template_id', 'Pick the document template this step fills in.');
      elsif jsonb_typeof(a -> 'record') is distinct from 'string' or btrim(a ->> 'record') = '' then
        v_err := v_err || jsonb_build_object(p || '.record', 'Say which record the document is made from.');
      else
        v_norm := jsonb_build_object('do', 'document', 'template_id', a ->> 'template_id', 'record', btrim(a ->> 'record'));
      end if;
    elsif v_do = 'slack_post' then
      if jsonb_typeof(a -> 'channel') is distinct from 'string'
         or (btrim(a ->> 'channel') !~ '^#?[A-Za-z0-9][A-Za-z0-9._-]{0,79}$' and position('{{' in (a ->> 'channel')) = 0) then
        v_err := v_err || jsonb_build_object(p || '.channel', 'Say which Slack channel, like general or C0123ABC.');
      elsif jsonb_typeof(a -> 'message') is distinct from 'string' or btrim(a ->> 'message') = '' then
        v_err := v_err || jsonb_build_object(p || '.message', 'Say what the Slack message says.');
      else
        v_norm := jsonb_build_object('do', 'slack_post', 'channel', btrim(a ->> 'channel'), 'message', a ->> 'message');
      end if;
    elsif v_do = 'teams_message' then
      if jsonb_typeof(a -> 'channel_link') is distinct from 'string' or (a ->> 'channel_link') !~ '(/l/channel/.*groupId=|/l/(chat|message)/19(:|%3[aA]))' then
        v_err := v_err || jsonb_build_object(p || '.channel_link', 'Paste a Teams link: Get link to channel on a channel, or Copy link on a message in the chat.');
      elsif jsonb_typeof(a -> 'message') is distinct from 'string' or btrim(a ->> 'message') = '' then
        v_err := v_err || jsonb_build_object(p || '.message', 'Say what the Teams message says.');
      else
        v_norm := jsonb_build_object('do', 'teams_message', 'channel_link', btrim(a ->> 'channel_link'), 'message', a ->> 'message');
      end if;
    elsif v_do = 'sms' then
      if jsonb_typeof(a -> 'to') is distinct from 'string' or btrim(a ->> 'to') = '' then
        v_err := v_err || jsonb_build_object(p || '.to', 'Say which phone number the text goes to.');
      elsif jsonb_typeof(a -> 'message') is distinct from 'string' or btrim(a ->> 'message') = '' then
        v_err := v_err || jsonb_build_object(p || '.message', 'Say what the text says.');
      else
        v_norm := jsonb_build_object('do', 'sms', 'to', btrim(a ->> 'to'), 'message', a ->> 'message');
      end if;
    elsif v_do is null or v_do not in ('set', 'add_row', 'edit_rows', 'notify', 'email', 'slack', 'webhook', 'agent') then
      v_err := v_err || jsonb_build_object(p, 'Each step is one of: set, add_row, edit_rows, find, update, archive, notify, email, slack, webhook, agent, script, run_mandate, gmail, sms, google_calendar_event, github_issue, outlook_mail, outlook_calendar_event, teams_message, slack_post, app_tool, document, if, for_each.');
    elsif p_rowless and v_do = 'set' then
      v_err := v_err || jsonb_build_object(p, 'With no triggering row there is no row for "set" to change. Use "update" with a record token, or "add row".');
    elsif p_rowless and v_do in ('notify', 'email') and (a -> 'to') ? 'field' then
      v_err := v_err || jsonb_build_object(p || '.to', 'With no triggering row there is no row to read a person from. Name the person or an address.');
    elsif p_rowless and (jsonb_path_exists(a, '$.**."from"') or jsonb_path_exists(a, '$.** ? (@.type() == "object" && exists(@."trigger"))')) then
      v_err := v_err || jsonb_build_object(p, 'With no triggering row there is no row to copy from or to match against; use a token like {{trigger.body.x}}.');
    else
      -- the store's own kinds: judged by the store's own checker, a token standing in as an empty value
      v_chk := a;
      if jsonb_typeof(a -> 'values') = 'object' then
        v_chk := jsonb_set(v_chk, '{values}', (select coalesce(jsonb_object_agg(x.key,
                   case when jsonb_typeof(x.value) = 'string' and (x.value #>> '{}') ~ c_tok then 'null'::jsonb else x.value end), '{}'::jsonb)
                   from jsonb_each(a -> 'values') x));
      end if;
      if jsonb_typeof(a -> 'to') = 'object' and (a -> 'to' ->> 'address') ~ c_tok then
        v_chk := jsonb_set(v_chk, '{to,address}', '"token@example.com"'::jsonb);
      end if;
      if jsonb_typeof(a -> 'where') = 'object' then
        v_chk := jsonb_set(v_chk, '{where}', custom._automation_tok(a -> 'where', '{}'::jsonb));
      end if;
      v_core := custom._automation_check(p_organization_id, p_table_id,
                  jsonb_build_object('name', 'step', 'trigger', jsonb_build_object('on', 'row_added'), 'actions', jsonb_build_array(v_chk)));
      if v_core ? '_errors' then
        for k, v_e in select key, value from jsonb_each(v_core -> '_errors') loop
          v_err := v_err || jsonb_build_object(regexp_replace(k, '^actions\.0', p), v_e);
        end loop;
      else
        v_norm := v_core -> 'spec' -> 'actions' -> 0;
        if a ? 'values' then v_norm := v_norm || jsonb_build_object('values', a -> 'values'); end if;
        if jsonb_typeof(a -> 'to') = 'object' and (a -> 'to' ->> 'address') ~ c_tok then
          v_norm := jsonb_set(v_norm, '{to,address}', a -> 'to' -> 'address');
        end if;
        if a ? 'where' then v_norm := v_norm || jsonb_build_object('where', a -> 'where'); end if;
      end if;
    end if;
    if v_norm is not null then
      v_out := v_out || jsonb_build_array(v_norm);
    end if;
  end loop;
  return jsonb_build_object('actions', v_out, 'errors', v_err, 'count', v_cnt);
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

      elsif v_do in ('script', 'run_mandate', 'gmail', 'sms', 'google_calendar_event', 'github_issue', 'outlook_mail', 'outlook_calendar_event', 'teams_message', 'slack_post', 'app_tool', 'document') then
        -- THE SERVER RUNS IT: the run waits here, its place saved, until custom.automation_resume answers.
        r := custom._automation_tok(act, ctx);
        v_wait := true;
        v_pend := jsonb_build_object('n', v_n, 'do', v_do, 'act', r - '_n', 'index', ctx -> 'index', 'queued_at', now(), 'attempts', 0);
        v_steps := v_steps || jsonb_build_array(jsonb_build_object('n', v_n, 'do', v_do, 'status', 'waiting',
                     'says', case v_do when 'script' then 'Waiting for the server to run the script.' when 'run_mandate' then 'Waiting for the agent to answer.' when 'gmail' then 'Waiting for the server to send the email.' when 'sms' then 'Waiting for the server to send the text.' when 'github_issue' then 'Waiting for the server to open the GitHub issue.' when 'outlook_mail' then 'Waiting for the server to send the Outlook email.' when 'outlook_calendar_event' then 'Waiting for the server to change the Outlook calendar event.' when 'teams_message' then 'Waiting for the server to post the Teams message.' when 'slack_post' then 'Waiting for the server to post in Slack.' when 'app_tool' then 'Waiting for the server to call the connected app.' when 'document' then 'Waiting for the server to make the document.' else 'Waiting for the server to change the calendar event.' end) || case when ctx ? 'index' and ctx -> 'index' <> 'null'::jsonb
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

  -- A FAILED RUN TELLS ITS OWNER: the one home is custom._automation_failed_run_notice (a late delivery failure uses it too).
  if v_status = 'failed' then
    perform custom._automation_failed_run_notice(p_run_id);
  end if;
  return v_status;
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
                 and jsonb_path_exists(v_check -> 'spec', '$.actions.** ? (@.do == "agent" || @.do == "script" || @.do == "run_mandate" || @.do == "gmail" || @.do == "sms" || @.do == "google_calendar_event" || @.do == "github_issue" || @.do == "outlook_mail" || @.do == "outlook_calendar_event" || @.do == "teams_message" || @.do == "slack_post" || @.do == "app_tool" || @.do == "document")'))
                or coalesce((v_check -> 'spec' -> 'trigger' ->> 'every') in ('minutes', 'hour'), false)
                -- W2-E: a connected-app trigger checks the person's account on a schedule: saved off, switching it on is theirs.
                or coalesce((v_check -> 'spec' -> 'trigger' ->> 'on') in ('gmail_received', 'calendar_event', 'slack_message', 'outlook_received'), false);

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
                   and jsonb_path_exists(e -> 'spec', '$.actions.** ? (@.do == "agent" || @.do == "script" || @.do == "run_mandate" || @.do == "gmail" || @.do == "sms" || @.do == "google_calendar_event" || @.do == "github_issue" || @.do == "outlook_mail" || @.do == "outlook_calendar_event" || @.do == "teams_message" || @.do == "slack_post" || @.do == "app_tool" || @.do == "document")'))
                  or coalesce((e -> 'spec' -> 'trigger' ->> 'every') in ('minutes', 'hour'), false)
                  or coalesce((e -> 'spec' -> 'trigger' ->> 'on') in ('gmail_received', 'calendar_event', 'slack_message', 'outlook_received'), false);
      if v_ai_sched and not coalesce(v_was_ai, false) then
        v_item := v_item || jsonb_build_object('enabled', false);
      end if;
      if (v_check -> 'spec' -> 'trigger' ->> 'on') in ('gmail_received', 'calendar_event', 'slack_message', 'outlook_received') and v_me is not null then
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
                   'says', case when (v_check -> 'spec' -> 'trigger' ->> 'on') in ('gmail_received', 'calendar_event', 'slack_message', 'outlook_received')
                                then 'It checks a connected account every few minutes, so it is saved switched off. Switch it on to start it.'
                                when (v_check -> 'spec' -> 'trigger' ->> 'every') in ('minutes', 'hour')
                                then 'It runs every few minutes or hours, so it is saved switched off. Switch it on to start it.'
                                else 'It runs an agent, a script, an email or a text on a schedule, so it is saved switched off. Switch it on to start it.' end)
                 else '{}'::jsonb end;
end
$function$;

CREATE OR REPLACE FUNCTION custom.automation_resume(p_run_id uuid, p_output jsonb, p_error text DEFAULT NULL::text, p_logs jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  d       jsonb;
  v_org   uuid;
  v_p     jsonb;
  v_n     integer;
  v_steps jsonb;
  v_entry jsonb;
  v_st    jsonb;
  v_held  text;
  v_res   text;
  v_logs  jsonb := case when jsonb_typeof(p_logs) = 'array' then
                     (select coalesce(jsonb_agg(left(custom._automation_text_of(e), 500) order by o), '[]'::jsonb)
                        from jsonb_array_elements(p_logs) with ordinality x(e, o) where o <= 200)
                   else '[]'::jsonb end;
begin
  if auth.uid() is not null or not iam.is_trusted_backend() then
    raise exception 'Only the platform server answers automation steps.' using errcode = '42501';
  end if;
  select r.organization_id, r.data into v_org, d from custom.record r
   where r.id = p_run_id and r.data_class = 'automation_run' and r.deleted_at is null for update;
  if d is null or not d ? 'pending' then
    return jsonb_build_object('ok', false, 'says', 'That run is not waiting for the server.');
  end if;
  v_p := d -> 'pending';
  v_n := (v_p ->> 'n')::integer;
  -- the waiting entry for this step becomes its answer
  select coalesce(jsonb_agg(e order by o), '[]'::jsonb) into v_steps
    from jsonb_array_elements(coalesce(d -> 'steps', '[]'::jsonb)) with ordinality x(e, o)
   where not ((e ->> 'n')::integer = v_n and e ->> 'status' = 'waiting');
  v_entry := jsonb_build_object('n', v_n, 'do', v_p ->> 'do',
               'status', case when p_error is null then 'done' else 'failed' end,
               'says', coalesce(left(p_error, 600), case v_p ->> 'do' when 'script' then 'Ran the script.' when 'run_mandate' then 'The agent answered.' when 'gmail' then 'Sent the email.' when 'sms' then 'Sent the text.' when 'google_calendar_event' then 'Changed the calendar event.' when 'github_issue' then 'Opened the GitHub issue.' when 'outlook_mail' then 'Sent the Outlook email.' when 'outlook_calendar_event' then 'Changed the Outlook calendar event.' when 'teams_message' then 'Posted the Teams message.' when 'slack_post' then 'Posted in Slack.' when 'app_tool' then 'The connected app answered.' when 'document' then 'Made the document.' else 'Done.' end),
               'logs', v_logs)
             || case when v_p ? 'index' and v_p -> 'index' <> 'null'::jsonb then jsonb_build_object('index', v_p -> 'index') else '{}'::jsonb end
             || case when p_error is null and p_output is not null
                     then jsonb_build_object('output_text', left(p_output::text, 2000)) else '{}'::jsonb end;
  v_steps := v_steps || jsonb_build_array(v_entry);
  v_st := d -> 'state';
  v_st := jsonb_set(v_st, '{ctx}', (v_st -> 'ctx') || jsonb_build_object('step' || v_n,
            jsonb_build_object('output', coalesce(p_output, 'null'::jsonb), 'logs', v_logs)));
  if p_error is not null then
    v_st := v_st || jsonb_build_object('status', 'failed', 'says', format('Step %s did not run: %s', v_n, left(p_error, 600)));
  end if;
  update custom.record set data = (d - 'pending') || jsonb_build_object('steps', v_steps, 'state', v_st, 'status', 'running')
   where id = p_run_id;
  -- carry on as the person the run acts for
  v_held := current_setting('request.jwt.claims', true);
  if v_st ->> 'principal' is not null then
    perform set_config('request.jwt.claims', jsonb_build_object('sub', v_st ->> 'principal', 'role', 'authenticated')::text, true);
  end if;
  v_res := custom._automation_advance(p_run_id);
  perform set_config('request.jwt.claims', coalesce(v_held, ''), true);
  select r.data into d from custom.record r where r.id = p_run_id;
  return jsonb_build_object('ok', true, 'run_id', p_run_id, 'status', d ->> 'status', 'says', d ->> 'says');
end
$function$;
