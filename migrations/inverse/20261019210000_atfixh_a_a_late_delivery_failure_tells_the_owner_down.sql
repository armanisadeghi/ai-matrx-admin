-- inverse of 20261019210000_atfixh_a_a_late_delivery_failure_tells_the_owner: puts the two prior live bodies back, then drops the helper.
CREATE OR REPLACE FUNCTION custom._automation_delivery_settle(p_request_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
-- Settles ONE queued delivery: rewrites its step of the run as Sent (status code) or Failed (code, timeout or pg_net's
-- error) and fails the run on a failure; a request with no answer yet (called by hand) settles as never answered.
-- Answers false when nothing was queued under this id.
declare
  q       record;
  v_run   uuid;
  d       jsonb;
  v_steps jsonb;
  v_i     integer;
  v_ok    boolean;
  v_say   text;
  v_what  text;
begin
  select dq.*, r.id as resp_id, r.status_code, r.timed_out, r.error_msg into q
    from custom.automation_delivery dq
    left join net._http_response r on r.id = dq.request_id
   where dq.request_id = p_request_id;
  if not found then return false; end if;
  v_what := case q.kind when 'slack' then 'Slack' else coalesce(q.url_host, 'the address') end;
  v_ok := q.resp_id is not null and coalesce(q.timed_out, false) = false and q.error_msg is null
          and q.status_code between 200 and 299;
  v_say := case
    when v_ok then format('%s answered %s.', case q.kind when 'slack' then 'Sent to Slack; Slack' else 'Sent the webhook; ' || v_what end, q.status_code)
    when q.resp_id is null then format('Not delivered: %s never answered (waited %s minutes).', v_what,
                                       greatest(10, floor(extract(epoch from now() - q.created_at) / 60)::integer))
    when q.timed_out then format('Not delivered: %s did not answer in time.', v_what)
    when q.error_msg is not null then format('Not delivered to %s: %s', v_what, left(q.error_msg, 200))
    else format('Not delivered: %s answered %s.', v_what, q.status_code) end;

  select x.id, x.data into v_run, d
    from custom.record x
   where x.organization_id = q.organization_id and x.data_class = 'automation_run' and x.deleted_at is null
     and x.created_at >= q.created_at - interval '1 day'
     and x.data -> 'steps' @> jsonb_build_array(jsonb_build_object('request_id', q.request_id))
   order by x.created_at desc
   limit 1
   for update;
  if v_run is not null then
    v_steps := d -> 'steps';
    select (o.n - 1)::integer into v_i from jsonb_array_elements(v_steps) with ordinality o(e, n)
     where (o.e ->> 'request_id')::bigint = q.request_id limit 1;
    v_steps := jsonb_set(v_steps, array[v_i::text],
                 (v_steps -> v_i) || jsonb_build_object('status', case when v_ok then 'done' else 'failed' end,
                   'delivery', case when v_ok then 'sent' else 'failed' end,
                   'status_code', to_jsonb(q.status_code), 'says', v_say));
    d := d || jsonb_build_object('steps', v_steps);
    if not v_ok and coalesce(d ->> 'status', '') <> 'failed' then
      d := d || jsonb_build_object('status', 'failed', 'says', format('Step %s: %s', q.step_n, v_say));
    end if;
    update custom.record set data = d where id = v_run;
  end if;
  delete from custom.automation_delivery where request_id = q.request_id;
  return true;
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

      elsif v_do in ('script', 'run_mandate', 'gmail', 'sms', 'google_calendar_event', 'github_issue', 'outlook_mail', 'outlook_calendar_event', 'teams_message', 'slack_post') then
        -- THE SERVER RUNS IT: the run waits here, its place saved, until custom.automation_resume answers.
        r := custom._automation_tok(act, ctx);
        v_wait := true;
        v_pend := jsonb_build_object('n', v_n, 'do', v_do, 'act', r - '_n', 'index', ctx -> 'index', 'queued_at', now(), 'attempts', 0);
        v_steps := v_steps || jsonb_build_array(jsonb_build_object('n', v_n, 'do', v_do, 'status', 'waiting',
                     'says', case v_do when 'script' then 'Waiting for the server to run the script.' when 'run_mandate' then 'Waiting for the agent to answer.' when 'gmail' then 'Waiting for the server to send the email.' when 'sms' then 'Waiting for the server to send the text.' when 'github_issue' then 'Waiting for the server to open the GitHub issue.' when 'outlook_mail' then 'Waiting for the server to send the Outlook email.' when 'outlook_calendar_event' then 'Waiting for the server to change the Outlook calendar event.' when 'teams_message' then 'Waiting for the server to post the Teams message.' when 'slack_post' then 'Waiting for the server to post in Slack.' else 'Waiting for the server to change the calendar event.' end) || case when ctx ? 'index' and ctx -> 'index' <> 'null'::jsonb
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

drop function if exists custom._automation_failed_run_notice(uuid);
