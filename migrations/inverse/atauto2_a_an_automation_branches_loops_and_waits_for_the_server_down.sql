-- chair-step: puts back custom._automation_run, _automation_check_timed, _automation_time_item, automation_declare and automation_test byte for byte as they were live before AT-AUTO2, and drops the functions AT-AUTO2 added (with their door rows). Runs, revisions and webhook samples written meanwhile stay as inert rows/keys.
-- lock: custom
-- lane: AT-AUTO2
--
delete from platform.client_callable_door where schema_name = 'custom' and function_name in ('automation_revisions', 'automation_revision_restore');
drop function if exists custom.automation_revision_restore(uuid, uuid, uuid);
drop function if exists custom.automation_revisions(uuid, uuid);
drop function if exists custom.automation_webhook_receive(uuid, text, jsonb);
drop function if exists custom.automation_claim_pending(text, integer, integer);
drop function if exists custom.automation_resume(uuid, jsonb, text, jsonb);
CREATE OR REPLACE FUNCTION custom._automation_run(p_organization_id uuid, p_table_id uuid, p_record_id uuid, p_automation jsonb, p_byid jsonb, p_fields jsonb, p_change_id uuid, p_trigger jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
-- NOTION-PROPS-2 (2026-10-08): ONE AUTOMATION'S RUN ON ONE ROW, lifted verbatim out of custom._automation_fire so a
-- button press (custom.button_press) runs an automation through exactly the steps a write does. Writes the
-- automation_run row and answers its id. No client lane: called by the fire trigger and the button door only.
declare
  c_depth_max constant integer := 3;
  v_a       jsonb := p_automation;
  v_spec    jsonb := p_automation -> 'spec';
  v_depth   integer := coalesce(nullif(current_setting('custom.automation_depth', true), '')::integer, 0);
  v_act     jsonb;
  v_n       integer;
  v_steps   jsonb;
  v_status  text;
  v_says    text;
  v_stepsay text;
  v_started timestamptz;
  v_me      uuid := custom.query_principal();
  v_patch   jsonb;
  k         text;
  v         jsonb;
  v_field   jsonb;
  v_tfields jsonb;
  v_rid     uuid;
  v_cand    uuid;
  v_cnt     integer;
  v_scan    integer;
  v_to      uuid;
  v_text    text;
  v_msg     text;
  v_hint    text;
  v_res     jsonb;
  v_run     uuid;
  v_subj    text;
  v_dl      text;
  -- AUTOMATIONS-AIRTABLE (2026-10-10): send email, send Slack message.
  v_addr    text;
  v_fv      text;
  v_why     text;
begin
  v_started := clock_timestamp();
  v_steps := '[]'::jsonb;
  v_status := 'ran';
  v_says := 'Every step finished.';
  v_n := 0;

  if v_depth >= c_depth_max then
    v_status := 'stopped';
    v_says := format('Stopped after %s rounds: this automation keeps changing the record that starts it.', c_depth_max);
  else
    perform set_config('custom.automation_depth', (v_depth + 1)::text, true);
    for v_act in select e from jsonb_array_elements(v_spec -> 'actions') e loop
      v_n := v_n + 1;
      v_stepsay := null;
      begin
        if v_act ->> 'do' = 'set' then
          v_patch := '{}'::jsonb;
          for k, v in select key, value from jsonb_each(v_act -> 'values') loop
            v_field := p_fields -> k;
            if v_field is null then
              raise exception 'A property this step sets is gone, so it cannot run until it is edited.' using errcode = '23503';
            end if;
            v_patch := v_patch || jsonb_build_object(v_field ->> 'key',
                         custom._action_coerce(v_field, custom._automation_value(v, p_byid, v_me), p_organization_id));
          end loop;
          perform custom.record_update(p_organization_id, p_record_id, v_patch);
          v_stepsay := 'Set ' || (select string_agg(f.value ->> 'label', ', ') from jsonb_each(p_fields) f
                                   where (v_act -> 'values') ? f.key) || ' on this row.';

        elsif v_act ->> 'do' = 'add_row' then
          v_tfields := custom._automation_fields(p_organization_id, (v_act ->> 'table_id')::uuid);
          v_patch := '{}'::jsonb;
          for k, v in select key, value from jsonb_each(v_act -> 'values') loop
            v_field := v_tfields -> k;
            if v_field is null then
              raise exception 'A property this step sets is gone, so it cannot run until it is edited.' using errcode = '23503';
            end if;
            v_patch := v_patch || jsonb_build_object(v_field ->> 'key',
                         custom._action_coerce(v_field, custom._automation_value(v, p_byid, v_me), p_organization_id));
          end loop;
          v_rid := custom.record_write(p_organization_id, (v_act ->> 'table_id')::uuid, v_patch);
          v_stepsay := 'Added a row to the other table.';
          v_steps := v_steps || jsonb_build_array(jsonb_build_object('n', v_n, 'do', 'add_row', 'status', 'done',
                       'says', v_stepsay, 'record_id', v_rid));
          continue;

        elsif v_act ->> 'do' = 'edit_rows' then
          v_tfields := custom._automation_fields(p_organization_id, (v_act ->> 'table_id')::uuid);
          v_cnt := 0;
          v_scan := 0;
          for v_cand in select x.id from custom.record x
                         where x.organization_id = p_organization_id and x.table_id = (v_act ->> 'table_id')::uuid
                           and x.data_class = 'record' and x.deleted_at is null
                         order by x.created_at limit 2000 loop
            v_scan := v_scan + 1;
            exit when v_cnt >= coalesce((v_act ->> 'limit')::integer, 100);
            v_res := custom.record_values(p_organization_id, v_cand);
            if custom._fx_truthy(custom.rule_eval(p_organization_id,
                 custom._automation_bind(v_act -> 'where', p_byid), v_res,
                 coalesce(custom.rule_context(p_organization_id, v_cand), '{}'::jsonb)
                   || jsonb_build_object('fx_self_id', v_cand, 'fx_table_id', (v_act ->> 'table_id')::uuid))) then
              v_patch := '{}'::jsonb;
              for k, v in select key, value from jsonb_each(v_act -> 'values') loop
                v_field := v_tfields -> k;
                if v_field is null then
                  raise exception 'A property this step sets is gone, so it cannot run until it is edited.' using errcode = '23503';
                end if;
                v_patch := v_patch || jsonb_build_object(v_field ->> 'key',
                             custom._action_coerce(v_field, custom._automation_value(v, p_byid, v_me), p_organization_id));
              end loop;
              perform custom.record_update(p_organization_id, v_cand, v_patch);
              v_cnt := v_cnt + 1;
            end if;
          end loop;
          v_stepsay := format('Edited %s row%s in the other table.', v_cnt, case when v_cnt = 1 then '' else 's' end);
          v_steps := v_steps || jsonb_build_array(jsonb_build_object('n', v_n, 'do', 'edit_rows', 'status', 'done',
                       'says', v_stepsay, 'edited', v_cnt));
          continue;

        elsif v_act ->> 'do' = 'notify' then
          v_to := case
            when v_act -> 'to' ? 'person' then (v_act -> 'to' ->> 'person')::uuid
            when v_act -> 'to' ? 'field' then case when (p_byid ->> (v_act -> 'to' ->> 'field'))
                   ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                   then (p_byid ->> (v_act -> 'to' ->> 'field'))::uuid end
            else nullif(v_a ->> 'created_by', '')::uuid end;
          if v_to is null then
            raise exception 'There is no person to tell: the property is empty on this row.' using errcode = '22023';
          end if;
          if not iam.is_org_member(v_to, p_organization_id) then
            raise exception 'That person is not a member of this organization.' using errcode = '22023';
          end if;
          v_text := v_act ->> 'text';
          for k, v in select key, value from jsonb_each(p_byid) loop
            v_text := replace(v_text, '{{' || k || '}}',
                        case when jsonb_typeof(v) = 'string' then v #>> '{}' when v is null or jsonb_typeof(v) = 'null' then '' else v::text end);
          end loop;
          -- HR-360-2 (2026-10-08): the action may carry its own SUBJECT and a LINK (both templated with the same
          -- {{property}} words as the text, plus {{record_id}} and {{organization_id}}), so the notice opens the
          -- thing it is about and its in-app and email subject says what happened. A link written with its origin is
          -- stored as the path (the notice router resolves a path against the reader's own host); only a path that
          -- starts with a slash is kept.
          v_subj := coalesce(nullif(btrim(v_act ->> 'subject'), ''), v_spec ->> 'name');
          v_dl   := nullif(btrim(v_act ->> 'link'), '');
          for k, v in select key, value from jsonb_each(p_byid) loop
            v_subj := replace(v_subj, '{{' || k || '}}',
                        case when jsonb_typeof(v) = 'string' then v #>> '{}' when v is null or jsonb_typeof(v) = 'null' then '' else v::text end);
            v_dl := replace(v_dl, '{{' || k || '}}',
                        case when jsonb_typeof(v) = 'string' then v #>> '{}' when v is null or jsonb_typeof(v) = 'null' then '' else v::text end);
          end loop;
          v_dl := replace(replace(v_dl, '{{record_id}}', p_record_id::text), '{{organization_id}}', p_organization_id::text);
          v_dl := regexp_replace(v_dl, '^https?://[^/]+', '');
          if v_dl is not null and left(v_dl, 1) <> '/' then v_dl := null; end if;
          -- NOTION-SMALL-2: a notice about a row opens that row when the step names no link of its own (a date-arrives
          -- reminder had a subject and a body but nothing to press).
          v_dl := coalesce(v_dl, '/data/' || p_table_id::text || '/r/' || p_record_id::text);
          -- round 3: the person's email address through the platform's own recipient resolver, so the notice's email
          -- channel has somewhere to go (it was skipped as no_contact_point when only the person was named).
          select r.address into v_addr from communication.resolve_channel_address('email', p_organization_id, 'user', v_to, null, null, null) r limit 1;
          v_res := communication.notify_from_sql(p_organization_id, 'records.changed', v_to, v_addr, null,
                     jsonb_build_object('notice', jsonb_build_object('body', v_text, 'subject', v_subj)),
                     v_dl, 'custom.record', p_record_id,
                     'automation:' || (v_a ->> 'id') || ':' || coalesce(p_change_id::text, gen_random_uuid()::text) || ':' || v_n::text);
          v_stepsay := coalesce(v_res ->> 'say', 'Told them.');

        elsif v_act ->> 'do' = 'webhook' then
          if not coalesce(files.is_safe_webhook_url(v_act ->> 'url'), false) then
            raise exception 'That webhook address is not a public https address any more, so nothing was sent.' using errcode = '22023';
          end if;
          perform net.http_post(url := v_act ->> 'url',
                    body := jsonb_build_object('event', 'automation.fired', 'automation_id', v_a ->> 'id',
                              'automation', v_spec ->> 'name', 'table_id', p_table_id, 'record_id', p_record_id,
                              'operation', p_trigger ->> 'operation', 'changed_field_ids', p_trigger -> 'changed_field_ids', 'trigger', p_trigger ->> 'on'),
                    headers := '{"Content-Type": "application/json"}'::jsonb);
          v_stepsay := 'Sent the webhook.';

        elsif v_act ->> 'do' = 'email' then
          -- AUTOMATIONS-AIRTABLE: one email through the platform's notification sender (communication.notify_from_sql,
          -- event custom.automation.email, drained by the server's email channel). Nothing queued = the step fails
          -- and says why.
          v_to := null;
          v_addr := null;
          if v_act -> 'to' ? 'address' then
            v_addr := v_act -> 'to' ->> 'address';
          elsif v_act -> 'to' ? 'person' then
            v_to := (v_act -> 'to' ->> 'person')::uuid;
          elsif v_act -> 'to' ? 'author' then
            v_to := nullif(v_a ->> 'created_by', '')::uuid;
          else
            v_fv := btrim(custom._automation_text_of(p_byid -> (v_act -> 'to' ->> 'field')));
            if v_fv = '' then
              raise exception 'There is nobody to email: the % property is empty on this row.',
                    coalesce(p_fields -> (v_act -> 'to' ->> 'field') ->> 'label', 'email') using errcode = '22023';
            elsif v_fv ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
              v_to := v_fv::uuid;
            elsif v_fv ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
              v_addr := lower(v_fv);
            else
              raise exception '"%" in the % property is not an email address, so nothing was sent.', left(v_fv, 80),
                    coalesce(p_fields -> (v_act -> 'to' ->> 'field') ->> 'label', 'email') using errcode = '22023';
            end if;
          end if;
          if v_to is not null then
            if not iam.is_org_member(v_to, p_organization_id) then
              raise exception 'That person is not a member of this organization, so nothing was sent.' using errcode = '22023';
            end if;
            -- round 3: the platform's recipient resolver, never a guess from auth directly.
            select r.address into v_addr from communication.resolve_channel_address('email', p_organization_id, 'user', v_to, null, null, null) r limit 1;
            if coalesce(v_addr, '') = '' then
              raise exception 'That person has no email address on their account, so nothing was sent.' using errcode = '22023';
            end if;
          end if;
          v_subj := custom._automation_fill(v_act ->> 'subject', p_byid, p_fields);
          v_text := custom._automation_fill(v_act ->> 'body', p_byid, p_fields);
          v_dl := case when p_record_id is not null then '/data/' || p_table_id::text || '/r/' || p_record_id::text
                       else '/data/' || p_table_id::text end;
          v_res := communication.notify_from_sql(p_organization_id, 'custom.automation.email', v_to, v_addr, null,
                     jsonb_build_object('notice', jsonb_build_object('body', v_text, 'subject', v_subj),
                                        'automation', jsonb_build_object('name', v_spec ->> 'name')),
                     v_dl, 'custom.record', p_record_id,
                     'automation:' || (v_a ->> 'id') || ':' || coalesce(p_change_id::text, gen_random_uuid()::text) || ':' || v_n::text);
          if not coalesce(v_res -> 'queued' ? 'email', false) then
            v_why := coalesce(v_res -> 'skipped' -> 0 ->> 'why', 'unknown');
            raise exception 'The email to % was not sent: %', v_addr,
                  case v_why
                    when 'event_not_declared' then 'this server does not send automation emails yet'
                    when 'event_disabled' then 'an administrator switched automation emails off'
                    when 'opted_out' then 'they turned these emails off'
                    when 'already_queued' then 'the same email was already sent for this change'
                    when 'address_not_for_channel' then 'that is not an email address'
                    else coalesce(v_res ->> 'say', v_why) end
                  using errcode = '22023';
          end if;
          v_stepsay := format('Emailed %s: %s', v_addr, left(v_subj, 120));

        elsif v_act ->> 'do' = 'slack' then
          -- AUTOMATIONS-AIRTABLE: a Slack incoming webhook in Slack's own format. pg_net posts after this
          -- transaction commits; the step says it was sent, the channel shows it.
          if v_act ->> 'url' !~ '^https://hooks\.slack\.com/' or not coalesce(files.is_safe_webhook_url(v_act ->> 'url'), false) then
            raise exception 'That Slack address is not a Slack incoming webhook any more, so nothing was sent.' using errcode = '22023';
          end if;
          v_text := custom._automation_fill(v_act ->> 'text', p_byid, p_fields);
          perform net.http_post(url := v_act ->> 'url',
                    body := jsonb_build_object('text', v_text),
                    headers := '{"Content-Type": "application/json"}'::jsonb);
          v_stepsay := 'Sent to Slack: ' || left(v_text, 120);

        elsif v_act ->> 'do' = 'agent' then
          v_steps := v_steps || jsonb_build_array(jsonb_build_object('n', v_n, 'do', 'agent', 'status', 'waiting',
                       'says', 'Waiting for a person: an agent''s changes are confirmed by a person. Open this record''s chat to ask it.',
                       'prompt', v_act ->> 'prompt'));
          if v_status = 'ran' then
            v_status := 'waiting';
            v_says := 'Waiting for a person to run the agent step.';
          end if;
          continue;
        end if;
        v_steps := v_steps || jsonb_build_array(jsonb_build_object('n', v_n, 'do', v_act ->> 'do', 'status', 'done', 'says', v_stepsay));
      exception when others then
        get stacked diagnostics v_msg = message_text, v_hint = pg_exception_hint;
        v_steps := v_steps || jsonb_build_array(jsonb_build_object('n', v_n, 'do', v_act ->> 'do', 'status', 'failed',
                     'says', v_msg, 'hint', v_hint));
        v_status := 'failed';
        v_says := format('Step %s did not run: %s', v_n, v_msg);
        exit;
      end;
    end loop;
    perform set_config('custom.automation_depth', v_depth::text, true);
  end if;

  insert into custom.record (organization_id, table_id, data_class, data)
  values (p_organization_id, null, 'automation_run', jsonb_build_object(
            'automation_id', v_a ->> 'id', 'automation', v_spec ->> 'name', 'table_id', p_table_id,
            'record_id', p_record_id, 'change_id', p_change_id, 'status', v_status, 'says', v_says,
            'trigger', p_trigger,
            'steps', v_steps, 'ran_by', v_me,
            'started_at', v_started, 'finished_at', clock_timestamp()))
  returning id into v_run;
  return v_run;
end
$function$;

CREATE OR REPLACE FUNCTION custom._automation_check_timed(p_organization_id uuid, p_table_id uuid, p_spec jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  c_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_trig  jsonb := case when jsonb_typeof(p_spec) = 'object' then p_spec -> 'trigger' end;
  v_on    text := case when jsonb_typeof(v_trig) = 'object' then v_trig ->> 'on' end;
  v_core  jsonb;
  v_err   jsonb := '{}'::jsonb;
  v_norm  jsonb;
  v_at    text;
  v_fld   jsonb;
  v_kind  text;
  v_every text;
  v_a     jsonb;
  v_i     integer := 0;
  v_n     numeric;
begin
  if v_on is null or v_on not in ('date_arrives', 'schedule') then
    return custom._automation_check(p_organization_id, p_table_id, p_spec);
  end if;

  v_core := custom._automation_check(p_organization_id, p_table_id,
              jsonb_set(p_spec, '{trigger}', jsonb_build_object('on', 'row_added')));
  if v_core ? '_errors' then
    v_err := v_core -> '_errors';
  end if;

  v_at := coalesce(nullif(btrim(v_trig ->> 'at'), ''), '09:00');
  if v_at !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    v_err := v_err || jsonb_build_object('trigger.at', 'Say the time of day as HH:MM on a 24-hour clock, like 09:00.');
  end if;

  if v_on = 'date_arrives' then
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
  else
    v_every := v_trig ->> 'every';
    if v_every is null or v_every not in ('day', 'week', 'month') then
      v_err := v_err || jsonb_build_object('trigger.every', 'Say how often: day, week or month.');
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
    -- A schedule has no row: whatever reads one is refused by name, never silently written as empty.
    if p_spec ? 'condition' and jsonb_typeof(p_spec -> 'condition') <> 'null' then
      v_err := v_err || jsonb_build_object('condition', 'A schedule has no row to test, so it has no condition. To act on some rows only, use an "edit rows" step with a filter.');
    end if;
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

  if v_err <> '{}'::jsonb then
    return jsonb_build_object('_errors', v_err);
  end if;
  return jsonb_build_object('spec', jsonb_set(v_core -> 'spec', '{trigger}', v_norm));
end
$function$;

CREATE OR REPLACE FUNCTION custom._automation_time_item(p_organization_id uuid, p_table_id uuid, p_automation jsonb, p_now timestamp with time zone)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_trig   jsonb := p_automation -> 'spec' -> 'trigger';
  v_on     text := v_trig ->> 'on';
  v_id     uuid := (p_automation ->> 'id')::uuid;
  v_zone   text := custom.day_zone(p_organization_id);
  v_cu     integer := coalesce((platform.knob_resolve('custom', 'automation_catch_up_hours', p_organization_id) #>> '{}')::integer, 48);
  v_fields jsonb := custom._automation_fields(p_organization_id, p_table_id);
  v_at     time := coalesce(v_trig ->> 'at', '09:00')::time;
  v_local  timestamp := p_now at time zone custom.day_zone(p_organization_id);
  v_since  timestamptz := coalesce(nullif(p_automation ->> 'updated_at', ''), nullif(p_automation ->> 'created_at', ''))::timestamptz;
  v_occ    timestamp;
  v_due    timestamptz;
  v_d      date;
  v_m0     date;
  v_key    text;
  v_n      integer;
  v_ran    integer := 0;
  v_fld    jsonb;
  v_off    integer;
  v_kind   text;
  x        record;
  v_values jsonb;
  v_byid   jsonb;
  v_ctx    jsonb;
  v_spec   jsonb := p_automation -> 'spec';
begin
  if v_on = 'schedule' then
    if v_trig ->> 'every' = 'day' then
      v_occ := v_local::date + v_at;
      if v_occ > v_local then v_occ := v_occ - interval '1 day'; end if;
    elsif v_trig ->> 'every' = 'week' then
      v_d := v_local::date - ((((extract(isodow from v_local::date))::integer - (v_trig ->> 'weekday')::integer) + 7) % 7);
      v_occ := v_d + v_at;
      if v_occ > v_local then v_occ := v_occ - interval '7 days'; end if;
    else
      v_m0 := date_trunc('month', v_local)::date;
      v_d := v_m0 + (least((v_trig ->> 'day')::integer, (extract(day from (v_m0 + interval '1 month' - interval '1 day')))::integer) - 1);
      v_occ := v_d + v_at;
      if v_occ > v_local then
        v_m0 := (v_m0 - interval '1 month')::date;
        v_d := v_m0 + (least((v_trig ->> 'day')::integer, (extract(day from (v_m0 + interval '1 month' - interval '1 day')))::integer) - 1);
        v_occ := v_d + v_at;
      end if;
    end if;
    v_due := v_occ at time zone v_zone;
    -- Never an occurrence from before she set it up / last edited / switched it on, and never a stale one.
    if v_due <= v_since or p_now - v_due > make_interval(hours => v_cu) then
      return 0;
    end if;
    v_key := (v_trig ->> 'every') || '|' || v_occ::date::text || '@' || to_char(v_at, 'HH24:MI')
             || coalesce('|' || (v_trig ->> 'weekday'), '') || coalesce('|' || (v_trig ->> 'day'), '');
    insert into custom.automation_fired (organization_id, automation_id, subject_id, fire_key)
    values (p_organization_id, v_id, p_table_id, v_key) on conflict do nothing;
    get diagnostics v_n = row_count;
    if v_n = 0 then return 0; end if;
    perform custom._automation_run(p_organization_id, p_table_id, null, p_automation, '{}'::jsonb, v_fields, null,
              jsonb_build_object('on', 'schedule', 'operation', 'time', 'via', 'schedule', 'changed_field_ids', '[]'::jsonb,
                                 'every', v_trig ->> 'every', 'fires_at', v_due));
    return 1;
  end if;

  -- DATE ARRIVES
  v_fld := v_fields -> (v_trig ->> 'field');
  if v_fld is null then
    raise exception 'The date property this automation waits for is gone, so it cannot run until it is edited.' using errcode = '23503';
  end if;
  v_kind := v_fld -> 'config' ->> 'kind';
  v_off := coalesce((v_trig ->> 'offset_days')::integer, 0);
  for x in
    select r.id, r.data ->> (v_fld ->> 'key') as dv
      from custom.record r
     where r.organization_id = p_organization_id and r.table_id = p_table_id
       and r.data_class = 'record' and r.deleted_at is null
       and nullif(r.data ->> (v_fld ->> 'key'), '') is not null
       and left(r.data ->> (v_fld ->> 'key'), 10) between to_char(v_local::date - v_off - (ceil(v_cu / 24.0)::integer + 2), 'YYYY-MM-DD')
                                                       and to_char(v_local::date - v_off + 2, 'YYYY-MM-DD')
     order by r.created_at
     limit 500
  loop
    if v_kind = 'date' then
      continue when x.dv !~ '^\d{4}-\d{2}-\d{2}' or not pg_input_is_valid(left(x.dv, 10), 'date');
      v_due := ((left(x.dv, 10)::date + v_off) + v_at) at time zone v_zone;
    else
      continue when not pg_input_is_valid(x.dv, 'timestamptz');
      v_due := x.dv::timestamptz + make_interval(days => v_off);
    end if;
    continue when v_due > p_now or p_now - v_due > make_interval(hours => v_cu);
    v_key := x.dv || '@' || v_off || '@' || to_char(v_at, 'HH24:MI');
    continue when exists (select 1 from custom.automation_fired f
                           where f.automation_id = v_id and f.subject_id = x.id and f.fire_key = v_key);

    v_values := custom.record_values(p_organization_id, x.id);
    continue when v_values is null;
    v_ctx := coalesce(custom.rule_context(p_organization_id, x.id), '{}'::jsonb)
             || jsonb_build_object('fx_self_id', x.id, 'fx_table_id', p_table_id);
    select coalesce(jsonb_object_agg(f.key, coalesce(v_values -> (f.value ->> 'key'), 'null'::jsonb)), '{}'::jsonb)
      into v_byid from jsonb_each(v_fields) f;
    if v_spec -> 'condition' is not null and jsonb_typeof(v_spec -> 'condition') = 'object' then
      begin
        continue when not custom._fx_truthy(custom.rule_eval(p_organization_id,
                         custom._automation_bind(v_spec -> 'condition', v_byid), v_values, v_ctx));
      exception when others then
        null;  -- a condition that cannot be worked out runs, exactly as it does for a row change
      end;
    end if;

    insert into custom.automation_fired (organization_id, automation_id, subject_id, fire_key)
    values (p_organization_id, v_id, x.id, v_key) on conflict do nothing;
    get diagnostics v_n = row_count;
    continue when v_n = 0;
    perform custom._automation_run(p_organization_id, p_table_id, x.id, p_automation, v_byid, v_fields, null,
              jsonb_build_object('on', 'date_arrives', 'operation', 'time', 'via', 'schedule', 'changed_field_ids', '[]'::jsonb,
                                 'date_value', x.dv, 'offset_days', v_off, 'fires_at', v_due));
    v_ran := v_ran + 1;
  end loop;
  return v_ran;
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

  v_ai_sched := (v_check -> 'spec' -> 'trigger' ->> 'on') in ('date_arrives', 'schedule')
                and jsonb_path_exists(v_check -> 'spec', '$.actions[*] ? (@.do == "agent")');

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
      v_was_ai := (e -> 'spec' -> 'trigger' ->> 'on') in ('date_arrives', 'schedule')
                  and jsonb_path_exists(e -> 'spec', '$.actions[*] ? (@.do == "agent")');
      if v_ai_sched and not coalesce(v_was_ai, false) then
        v_item := v_item || jsonb_build_object('enabled', false);
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
                'created_at', now(), 'created_by', v_me, 'updated_at', now(), 'updated_by', v_me));
    v_new := v_new || jsonb_build_array(v_item);
  end if;

  update custom.record set data = jsonb_set(data, '{automations}', v_new, true)
   where organization_id = p_organization_id and id = p_table_id and table_id = custom.table_kernel_id();

  return jsonb_build_object('ok', true, 'automation_id', v_id, 'table_id', p_table_id,
           'enabled', coalesce((v_item ->> 'enabled')::boolean, true), 'spec', v_check -> 'spec')
         || case when v_ai_sched then jsonb_build_object('ai_on_schedule', true,
                   'says', 'It runs an agent on a schedule, so it is saved switched off. Switch it on to start it.')
                 else '{}'::jsonb end;
end
$function$;

CREATE OR REPLACE FUNCTION custom.automation_test(p_organization_id uuid, p_automation_id uuid, p_record_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
-- AUTOMATIONS-AIRTABLE (2026-10-10): TEST AN AUTOMATION NOW (Airtable's "Test step / Run test"). Runs its actions once,
-- on the row the editor picks, without waiting for the trigger — whether it is switched on or not — through exactly
-- the run path a change takes (custom._automation_run), as the person testing, who edits the table. The run is written
-- to the history like any other (trigger.on = "test", the real trigger beside it) and says whether the row meets its
-- condition. A schedule needs no row; every other trigger needs one of this table's rows.
declare
  v_table  uuid;
  v_item   jsonb;
  v_rec    custom.record;
  v_values jsonb;
  v_fields jsonb;
  v_byid   jsonb := '{}'::jsonb;
  v_ctx    jsonb;
  v_met    boolean;
  v_run    uuid;
  v_row    jsonb;
  v_on     text;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.automation_test');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.automation_test');
  select h.table_id, h.item into v_table, v_item from custom._automation_home(p_organization_id, p_automation_id) h;
  if v_table is null or (v_item ->> 'archived_at') is not null then
    raise exception 'There is no such automation here.'
      using errcode = '23503', hint = 'It may have been archived, or it belongs to another organization. Nothing ran.';
  end if;
  perform custom.assert_client_may_change(p_organization_id, v_table, 'custom.automation_test',
                                          'editor'::public.permission_level, 'table');
  v_on := v_item -> 'spec' -> 'trigger' ->> 'on';
  v_fields := custom._automation_fields(p_organization_id, v_table);

  if p_record_id is null then
    if v_on <> 'schedule' then
      raise exception 'Pick a row to test it on.' using errcode = '22023',
            hint = 'Only an automation that runs on a schedule acts with no row.';
    end if;
  else
    if v_on = 'schedule' then
      raise exception 'An automation on a schedule acts with no row; test it without one.' using errcode = '22023';
    end if;
    select r.* into v_rec from custom.record r
     where r.organization_id = p_organization_id and r.id = p_record_id
       and r.table_id = v_table and r.data_class = 'record' and r.deleted_at is null;
    if v_rec.id is null then
      raise exception 'That row is not in this automation''s table.' using errcode = '23503',
            hint = 'It may have been archived. Nothing ran.';
    end if;
    perform custom.assert_client_may_change(p_organization_id, p_record_id, 'custom.automation_test',
                                            'editor'::public.permission_level, 'record');
    v_values := coalesce(custom.record_values(p_organization_id, p_record_id), '{}'::jsonb);
    select coalesce(jsonb_object_agg(f.key, coalesce(v_values -> (f.value ->> 'key'), 'null'::jsonb)), '{}'::jsonb)
      into v_byid from jsonb_each(v_fields) f;
    v_ctx := coalesce(custom.rule_context(p_organization_id, p_record_id), '{}'::jsonb)
             || jsonb_build_object('fx_self_id', p_record_id, 'fx_table_id', v_table);
    begin
      v_met := case
        when v_on = 'record_matches' and v_item -> 'spec' -> 'trigger' ? 'view_id' then
          coalesce(custom._fx_truthy(custom.rule_eval(p_organization_id, custom._automation_bind(
            coalesce(custom._automation_view_rule(p_organization_id, v_table, (v_item -> 'spec' -> 'trigger' ->> 'view_id')::uuid),
                     '{"const": true}'::jsonb), v_byid), v_values, v_ctx)), false)
        when jsonb_typeof(v_item -> 'spec' -> 'condition') = 'object' then
          coalesce(custom._fx_truthy(custom.rule_eval(p_organization_id,
            custom._automation_bind(v_item -> 'spec' -> 'condition', v_byid), v_values, v_ctx)), false)
        else true end;
    exception when others then
      v_met := null;
    end;
  end if;

  v_run := custom._automation_run(p_organization_id, v_table, p_record_id, v_item, v_byid, v_fields, null,
             jsonb_build_object('on', 'test', 'of', v_on, 'operation', 'test', 'via', 'test',
                                'changed_field_ids', '[]'::jsonb, 'condition_met', v_met));
  select r.data into v_row from custom.record r where r.organization_id = p_organization_id and r.id = v_run;
  return jsonb_build_object('ok', true, 'run_id', v_run, 'automation_id', p_automation_id, 'record_id', p_record_id,
           'status', v_row ->> 'status', 'says', v_row ->> 'says', 'steps', v_row -> 'steps', 'condition_met', v_met);
end
$function$;

drop function if exists custom._automation_advance(uuid);
drop function if exists custom._automation_step(uuid, uuid, uuid, jsonb, jsonb, jsonb, uuid, jsonb, integer, jsonb);
drop function if exists custom._automation_check_steps(uuid, uuid, jsonb, text, boolean, integer);
drop function if exists custom._automation_ids(jsonb);
drop function if exists custom._automation_number(jsonb, integer);
drop function if exists custom._automation_when(jsonb);
drop function if exists custom._automation_tok(jsonb, jsonb);
