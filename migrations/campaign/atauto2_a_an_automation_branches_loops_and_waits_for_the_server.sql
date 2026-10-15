-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: AT-AUTO2
-- lock: custom
-- based-on: custom._automation_run(uuid, uuid, uuid, jsonb, jsonb, jsonb, uuid, jsonb) 7ba0e8c59da9b567cf7a01c2ce7b118df00f8056b90bafc8f02b84dd3030c232
-- based-on: custom._automation_check_timed(uuid, uuid, jsonb) 5aacf5564be8415847f2b0d7c1188a181dcab6b35706fee9d36d0d62fefb3e77
-- based-on: custom._automation_time_item(uuid, uuid, jsonb, timestamp with time zone) 9bba1380e1480de7fb49a532de7d43f0f594c692f1dcf7581a7d89c975cbf393
-- based-on: custom.automation_declare(uuid, uuid, jsonb, uuid) cc904a4490f969858e477d846befa80ecf2a6206a79be876a58845126a7d926c
-- based-on: custom.automation_test(uuid, uuid, uuid) 2a45943270e13165d675577bc24226333039d9668aca6939753a1e542cad6d6f
--
-- AT-AUTO2 — AN AUTOMATION BRANCHES, REPEATS, FINDS, ARCHIVES, RUNS A SCRIPT, STARTS FROM A WEBHOOK, KEEPS ITS VERSIONS.
-- WHY. Airtable parity (common-docs systems/data/custom-data/AIRTABLE-PARITY.md §7-8): a table's automations could not
-- start from an inbound webhook, run hourly or every few minutes, find records for later steps, archive records,
-- branch (if / else if / else), repeat for each item of a list, run a script, keep a version per save, or tell their
-- owner when a run failed.
-- WHAT, ON THE ONE ENGINE (never a parallel one). custom._automation_run still writes ONE automation_run row per run;
-- its steps are now interpreted by custom._automation_advance from an explicit stack kept on that row, so a step only
-- the server can do (script) makes the run WAIT with its place saved; aidream's worker claims it
-- (custom.automation_claim_pending), runs the script in the owner's sandbox, meters it to points, and answers with
-- custom.automation_resume, which carries on from that exact step. The store's own step kinds run through
-- custom._automation_step, lifted verbatim from the earlier _automation_run body. Step outputs are tokens:
-- {{stepN.records}}, {{stepN.first.<field key>}}, {{trigger.body.<path>}}, {{item.<path>}}, {{index}}.
-- A spec using none of the new shapes is checked exactly as before (byte-equal), so MAKE-AUTODUP reuse holds.
-- NO BLIND PAID AUTOMATIONS: every-N-minutes / every-N-hours schedules and a script or agent on any time trigger are
-- saved switched OFF; the person switches them on.
-- Inverse: migrations/inverse/atauto2_a_an_automation_branches_loops_and_waits_for_the_server_down.sql.
--
-- ── 1. TOKENS, CONDITIONS, STEP NUMBERS ───────────────────────────────────────────────────────────────────────
-- A token names a value a run already has: {{trigger.<field key or id>}}, {{trigger.body.<path>}} (a webhook's
-- payload), {{stepN.<path>}} (an earlier step's output: a find's records/first/count/ids, a script's output,
-- an added row's record_id), {{item.<path>}} / {{index}} inside a repeating group. A string that IS one token
-- becomes that value itself (a list stays a list); a token inside longer words is written into them as text.
-- Tokens of any other root ({{<field id>}}, {Field name}) are left for the step's own filler, unchanged.
create function custom._automation_tok(p_val jsonb, p_ctx jsonb)
 returns jsonb
 language plpgsql
 immutable
 set search_path to 'pg_catalog'
as $function$
declare
  c_one  constant text := '^\{\{\s*((?:step[0-9]+|trigger|item|index)(?:\.[^{}\s]+)?)\s*\}\}$';
  c_any  constant text := '\{\{\s*((?:step[0-9]+|trigger|item|index)(?:\.[^{}\s]+)?)\s*\}\}';
  v_s    text;
  v_m    text[];
  v_out  jsonb;
  v_k    text;
  v_v    jsonb;
begin
  if p_val is null then return null; end if;
  if jsonb_typeof(p_val) = 'string' then
    v_s := p_val #>> '{}';
    if v_s !~ c_any then return p_val; end if;
    v_m := regexp_match(v_s, c_one);
    if v_m is not null then
      return coalesce(p_ctx #> string_to_array(v_m[1], '.'), 'null'::jsonb);
    end if;
    for v_m in select regexp_matches(v_s, '(' || c_any || ')', 'g') loop
      v_s := replace(v_s, v_m[1], coalesce(custom._automation_text_of(p_ctx #> string_to_array(v_m[2], '.')), ''));
    end loop;
    return to_jsonb(v_s);
  elsif jsonb_typeof(p_val) = 'array' then
    select coalesce(jsonb_agg(custom._automation_tok(e, p_ctx) order by o), '[]'::jsonb) into v_out
      from jsonb_array_elements(p_val) with ordinality x(e, o);
    return v_out;
  elsif jsonb_typeof(p_val) = 'object' then
    v_out := '{}'::jsonb;
    for v_k, v_v in select key, value from jsonb_each(p_val) loop
      -- a group's own steps are resolved when they run, never ahead of time
      v_out := v_out || jsonb_build_object(v_k, case when v_k in ('actions', 'branches', 'else') then v_v
                                                     else custom._automation_tok(v_v, p_ctx) end);
    end loop;
    return v_out;
  end if;
  return p_val;
end
$function$;

-- A group's condition: {"all"|"any": [{"value": <token or literal>, "is": <op>, "to": <token or literal>}]}, already
-- resolved. Ops: equals, not_equals, contains, not_contains, gt, gte, lt, lte, empty, not_empty, is_true.
-- Text compares without case; numbers compare as numbers when both sides are numbers.
create function custom._automation_when(p_when jsonb)
 returns boolean
 language plpgsql
 immutable
 set search_path to 'pg_catalog'
as $function$
declare
  v_any  boolean := jsonb_typeof(p_when) = 'object' and p_when ? 'any';
  v_list jsonb := case when jsonb_typeof(p_when) = 'object' and p_when ? 'any' then p_when -> 'any'
                       when jsonb_typeof(p_when) = 'object' and p_when ? 'all' then p_when -> 'all'
                       else jsonb_build_array(p_when) end;
  c      jsonb;
  l      jsonb;
  r      jsonb;
  lt     text;
  rt     text;
  ok     boolean;
  v_num  constant text := '^\s*-?[0-9]+(\.[0-9]+)?\s*$';
begin
  if jsonb_typeof(v_list) <> 'array' or jsonb_array_length(v_list) = 0 then return true; end if;
  for c in select e from jsonb_array_elements(v_list) e loop
    l := c -> 'value';
    r := c -> 'to';
    lt := lower(btrim(coalesce(custom._automation_text_of(l), '')));
    rt := lower(btrim(coalesce(custom._automation_text_of(r), '')));
    ok := case c ->> 'is'
      when 'equals' then lt = rt
      when 'not_equals' then lt <> rt
      when 'contains' then case when jsonb_typeof(l) = 'array'
                                then exists (select 1 from jsonb_array_elements(l) x where lower(btrim(coalesce(custom._automation_text_of(x), ''))) = rt)
                                else strpos(lt, rt) > 0 end
      when 'not_contains' then case when jsonb_typeof(l) = 'array'
                                then not exists (select 1 from jsonb_array_elements(l) x where lower(btrim(coalesce(custom._automation_text_of(x), ''))) = rt)
                                else strpos(lt, rt) = 0 end
      when 'empty' then lt = '' or l is null or jsonb_typeof(l) = 'null' or l = '[]'::jsonb or l = '{}'::jsonb
      when 'not_empty' then not (lt = '' or l is null or jsonb_typeof(l) = 'null' or l = '[]'::jsonb or l = '{}'::jsonb)
      when 'is_true' then lt in ('true', '1', 'yes', 'on', 'checked')
      when 'gt' then case when lt ~ v_num and rt ~ v_num then lt::numeric > rt::numeric else lt > rt end
      when 'gte' then case when lt ~ v_num and rt ~ v_num then lt::numeric >= rt::numeric else lt >= rt end
      when 'lt' then case when lt ~ v_num and rt ~ v_num then lt::numeric < rt::numeric else lt < rt end
      when 'lte' then case when lt ~ v_num and rt ~ v_num then lt::numeric <= rt::numeric else lt <= rt end
      else false end;
    if v_any and ok then return true; end if;
    if not v_any and not ok then return false; end if;
  end loop;
  return not v_any;
end
$function$;

-- Steps are numbered in the order they are written, groups' steps included (step 1, the if as step 2, its
-- branches' steps 3 and 4, ...), so {{stepN}} names one step however the run travels. Stamped as _n at run time only;
-- a stored spec never carries it.
create function custom._automation_number(p_acts jsonb, p_start integer)
 returns jsonb
 language plpgsql
 immutable
 set search_path to 'pg_catalog'
as $function$
declare
  v_n    integer := p_start;
  v_out  jsonb := '[]'::jsonb;
  a      jsonb;
  b      jsonb;
  v_bs   jsonb;
  v_sub  jsonb;
begin
  for a in select e from jsonb_array_elements(coalesce(p_acts, '[]'::jsonb)) e loop
    v_n := v_n + 1;
    a := a || jsonb_build_object('_n', v_n);
    if a ->> 'do' = 'if' then
      v_bs := '[]'::jsonb;
      for b in select e from jsonb_array_elements(coalesce(a -> 'branches', '[]'::jsonb)) e loop
        v_sub := custom._automation_number(b -> 'actions', v_n);
        v_n := (v_sub ->> 'n')::integer;
        v_bs := v_bs || jsonb_build_array(b || jsonb_build_object('actions', v_sub -> 'acts'));
      end loop;
      a := a || jsonb_build_object('branches', v_bs);
      if a ? 'else' then
        v_sub := custom._automation_number(a -> 'else', v_n);
        v_n := (v_sub ->> 'n')::integer;
        a := a || jsonb_build_object('else', v_sub -> 'acts');
      end if;
    elsif a ->> 'do' = 'for_each' then
      v_sub := custom._automation_number(a -> 'actions', v_n);
      v_n := (v_sub ->> 'n')::integer;
      a := a || jsonb_build_object('actions', v_sub -> 'acts');
    end if;
    v_out := v_out || jsonb_build_array(a);
  end loop;
  return jsonb_build_object('acts', v_out, 'n', v_n);
end
$function$;

-- The ids a step names: one id, a record {id}, a list of either, or a find's whole output {records}.
create function custom._automation_ids(p_val jsonb)
 returns uuid[]
 language sql
 immutable
 set search_path to 'pg_catalog'
as $function$
  select coalesce(array_agg(distinct x::uuid), '{}'::uuid[]) from (
    select case when jsonb_typeof(e) = 'string' then e #>> '{}' when jsonb_typeof(e) = 'object' then e ->> 'id' end as x
      from jsonb_array_elements(case
        when jsonb_typeof(p_val) = 'array' then p_val
        when jsonb_typeof(p_val) = 'object' and jsonb_typeof(p_val -> 'records') = 'array' then p_val -> 'records'
        when p_val is null or jsonb_typeof(p_val) = 'null' then '[]'::jsonb
        else jsonb_build_array(p_val) end) e
  ) s where x ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
$function$;
-- ── 1b. ONE STEP of the store's own kinds ─────────────────────────────────────────────────────────────────────
create function custom._automation_step(p_organization_id uuid, p_table_id uuid, p_record_id uuid,
  p_automation jsonb, p_byid jsonb, p_fields jsonb, p_change_id uuid, p_trigger jsonb, p_n integer, p_act jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
as $function$
-- AT-AUTO2 (2026-10-15): set, add_row, edit_rows, notify, webhook, email and slack, lifted VERBATIM out of
-- custom._automation_run so the interpreter (custom._automation_advance) runs each exactly as a flat run did.
-- Answers the step's entry; a step that cannot run RAISES and the caller writes it as failed.
declare
  v_act     jsonb := p_act;
  v_n       integer := p_n;
  v_a       jsonb := p_automation;
  v_spec    jsonb := p_automation -> 'spec';
  v_stepsay text;
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
  v_res     jsonb;
  v_subj    text;
  v_dl      text;
  v_addr    text;
  v_fv      text;
  v_why     text;
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
          return jsonb_build_object('n', v_n, 'do', 'add_row', 'status', 'done', 'says', v_stepsay, 'record_id', v_rid,
                   'output', jsonb_build_object('record_id', v_rid));

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
          return jsonb_build_object('n', v_n, 'do', 'edit_rows', 'status', 'done', 'says', v_stepsay, 'edited', v_cnt,
                   'output', jsonb_build_object('edited', v_cnt));

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

        else
          raise exception 'This step is not one the store knows how to run (%).', coalesce(v_act ->> 'do', 'nothing') using errcode = '22023';
        end if;
        return jsonb_build_object('n', v_n, 'do', v_act ->> 'do', 'status', 'done', 'says', v_stepsay);
end
$function$;

-- ── 2. CHECKING THE NEW STEPS ─────────────────────────────────────────────────────────────────────────────────
-- Walks a list of steps (and every group's own steps), answering {actions, errors, count}. The store's own step kinds
-- are judged by custom._automation_check exactly as before, one at a time, with any token standing in as an empty
-- value (a token is only known at run time); the token itself is what is kept.
create function custom._automation_check_steps(p_organization_id uuid, p_table_id uuid, p_acts jsonb, p_path text, p_rowless boolean, p_depth integer)
 returns jsonb
 language plpgsql
 stable
 set search_path to 'pg_catalog'
as $function$
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
    elsif v_do is null or v_do not in ('set', 'add_row', 'edit_rows', 'notify', 'email', 'slack', 'webhook', 'agent') then
      v_err := v_err || jsonb_build_object(p, 'Each step is one of: set, add_row, edit_rows, find, update, archive, notify, email, slack, webhook, agent, script, if, for_each.');
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
-- ── 3. THE STEP INTERPRETER: groups, repeats, finds, archives, updates, and steps the server runs ───────────────
-- A run's place is an explicit stack of step lists kept on the run row (data.state), so a run that reaches a step
-- only the server can do (a script) WAITS there with that place saved, and custom.automation_resume carries on from
-- exactly that step — inside a branch or the 7th time round a repeat — once the server has its answer.
create function custom._automation_advance(p_run_id uuid)
 returns text
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
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

      elsif v_do = 'script' then
        -- THE SERVER RUNS IT: the run waits here, its place saved, until custom.automation_resume answers.
        r := custom._automation_tok(act, ctx);
        v_wait := true;
        v_pend := jsonb_build_object('n', v_n, 'do', v_do, 'act', r - '_n', 'index', ctx -> 'index', 'queued_at', now(), 'attempts', 0);
        v_steps := v_steps || jsonb_build_array(jsonb_build_object('n', v_n, 'do', v_do, 'status', 'waiting',
                     'says', 'Waiting for the server to run the script.') || case when ctx ? 'index' and ctx -> 'index' <> 'null'::jsonb
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
-- ── 4. ONE RUN: written first, then interpreted (custom._automation_advance) ───────────────────────────────────
create or replace function custom._automation_run(p_organization_id uuid, p_table_id uuid, p_record_id uuid, p_automation jsonb, p_byid jsonb, p_fields jsonb, p_change_id uuid, p_trigger jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
as $function$
-- NOTION-PROPS-2 (2026-10-08): ONE AUTOMATION'S RUN ON ONE ROW, shared by the change feed, a button press, a test,
-- the clock and (AT-AUTO2) a webhook. AT-AUTO2 (2026-10-15): the steps are interpreted by custom._automation_advance
-- (groups, repeats, finds, step outputs, server steps); the store's own step kinds run through custom._automation_step,
-- lifted verbatim from this function's earlier body, so a flat run writes the same steps it always did.
declare
  c_depth_max constant integer := 3;
  v_depth   integer := coalesce(nullif(current_setting('custom.automation_depth', true), '')::integer, 0);
  v_me      uuid := custom.query_principal();
  v_trigctx jsonb;
  v_run     uuid;
  v_status  text := 'running';
  v_says    text := null;
begin
  -- the triggering row as tokens read it: by field id and by field key, plus its id and a webhook's payload
  select coalesce(jsonb_object_agg(f.value ->> 'key', coalesce(p_byid -> f.key, 'null'::jsonb)), '{}'::jsonb)
    into v_trigctx from jsonb_each(coalesce(p_fields, '{}'::jsonb)) f where f.value ->> 'key' is not null;
  v_trigctx := v_trigctx || coalesce(p_byid, '{}'::jsonb)
               || jsonb_build_object('record_id', p_record_id, 'body', coalesce(p_trigger -> 'body', 'null'::jsonb));
  if v_depth >= c_depth_max then
    v_status := 'stopped';
    v_says := format('Stopped after %s rounds: this automation keeps changing the record that starts it.', c_depth_max);
  end if;
  insert into custom.record (organization_id, table_id, data_class, data)
  values (p_organization_id, null, 'automation_run', (jsonb_build_object(
            'automation_id', p_automation ->> 'id', 'automation', p_automation -> 'spec' ->> 'name', 'table_id', p_table_id,
            'record_id', p_record_id, 'change_id', p_change_id, 'status', v_status, 'says', v_says,
            'trigger', p_trigger, 'steps', '[]'::jsonb, 'ran_by', v_me,
            'started_at', clock_timestamp(),
            'finished_at', case when v_status = 'stopped' then clock_timestamp() end))
          || case when v_status = 'stopped' then '{}'::jsonb else jsonb_build_object('state', jsonb_build_object(
               'automation', p_automation - 'revisions', 'byid', coalesce(p_byid, '{}'::jsonb), 'principal', v_me,
               'ctx', jsonb_build_object('trigger', v_trigctx),
               'stack', jsonb_build_array(jsonb_build_object('acts',
                          custom._automation_number(p_automation -> 'spec' -> 'actions', 0) -> 'acts', 'i', 0)),
               'total', 0, 'status', 'ran', 'says', 'Every step finished.')) end)
  returning id into v_run;
  if v_status <> 'stopped' then
    perform custom._automation_advance(v_run);
  end if;
  return v_run;
end
$function$;

-- ── 5. THE SERVER'S SIDE: claim a waiting step, answer it ─────────────────────────────────────────────────────
-- Backend only (iam.is_trusted_backend): aidream's automation worker claims a run waiting on a server step, runs
-- it (a script in the owner's sandbox, metered to points), and answers with custom.automation_resume.
create function custom.automation_claim_pending(p_worker text, p_limit integer default 5, p_lease_seconds integer default 180)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  x      record;
  v_out  jsonb := '[]'::jsonb;
  v_p    jsonb;
begin
  if auth.uid() is not null or not iam.is_trusted_backend() then
    raise exception 'Only the platform server claims automation steps.' using errcode = '42501';
  end if;
  for x in
    select r.id, r.organization_id, r.data from custom.record r
     where r.data_class = 'automation_run' and r.deleted_at is null and r.table_id is null
       and r.data ? 'pending' and r.data ->> 'status' = 'waiting'
       and coalesce((r.data -> 'pending' ->> 'lease_until')::timestamptz, '-infinity') < now()
     order by r.created_at
     limit least(greatest(coalesce(p_limit, 5), 1), 50)
     for update skip locked
  loop
    v_p := x.data -> 'pending';
    if coalesce((v_p ->> 'attempts')::integer, 0) >= 3 then
      perform custom.automation_resume(x.id, null, 'The server could not run this step after 3 tries.', null);
      continue;
    end if;
    v_p := v_p || jsonb_build_object('lease_until', now() + make_interval(secs => greatest(coalesce(p_lease_seconds, 180), 30)),
                                     'worker', left(coalesce(p_worker, 'worker'), 80),
                                     'attempts', coalesce((v_p ->> 'attempts')::integer, 0) + 1);
    update custom.record set data = jsonb_set(data, '{pending}', v_p) where id = x.id;
    v_out := v_out || jsonb_build_array(jsonb_build_object('run_id', x.id, 'organization_id', x.organization_id,
               'table_id', x.data ->> 'table_id', 'automation_id', x.data ->> 'automation_id',
               'automation', x.data ->> 'automation',
               'principal', x.data -> 'state' ->> 'principal', 'pending', v_p));
  end loop;
  return v_out;
end
$function$;

create function custom.automation_resume(p_run_id uuid, p_output jsonb, p_error text default null, p_logs jsonb default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
as $function$
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
               'says', coalesce(left(p_error, 600), case when v_p ->> 'do' = 'script' then 'Ran the script.' else 'Done.' end),
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

-- ── 6. THE INBOUND WEBHOOK ────────────────────────────────────────────────────────────────────────────────────
-- Backend only: aidream's POST /api/automations/hooks/{automation_id}/{secret} hands the payload here. The secret is
-- the automation's own (custom.automation_declare made it); a wrong one answers exactly like an unknown automation.
-- Every payload is kept as the automation's sample (its test run uses it); a switched-off automation keeps the sample
-- and does not run.
create function custom.automation_webhook_receive(p_automation_id uuid, p_secret text, p_body jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_org   uuid;
  v_table uuid;
  v_item  jsonb;
  v_doc   jsonb;
  v_new   jsonb := '[]'::jsonb;
  e       jsonb;
  v_who   uuid;
  v_held  text;
  v_run   uuid;
  v_row   jsonb;
begin
  if auth.uid() is not null or not iam.is_trusted_backend() then
    raise exception 'Only the platform server delivers webhooks.' using errcode = '42501';
  end if;
  if octet_length(coalesce(p_body, 'null'::jsonb)::text) > 102400 then
    return jsonb_build_object('ok', false, 'http', 413, 'says', 'The payload is larger than 100 KB.');
  end if;
  select t.organization_id, t.id, x into v_org, v_table, v_item
    from custom.record t, jsonb_array_elements(t.data -> 'automations') x
   where t.data_class = 'table' and t.deleted_at is null and t.table_id = custom.table_kernel_id()
     and t.data -> 'automations' @> jsonb_build_array(jsonb_build_object('id', p_automation_id::text))
     and x ->> 'id' = p_automation_id::text
   limit 1;
  if v_item is null or v_item -> 'spec' -> 'trigger' ->> 'on' is distinct from 'webhook'
     or coalesce(v_item ->> 'webhook_secret', '') = '' or v_item ->> 'webhook_secret' is distinct from p_secret
     or (v_item ->> 'archived_at') is not null then
    return jsonb_build_object('ok', false, 'http', 404, 'says', 'There is no such webhook.');
  end if;
  -- keep the payload as the automation's sample
  select t.data into v_doc from custom.record t where t.id = v_table for update;
  for e in select x from jsonb_array_elements(v_doc -> 'automations') x loop
    v_new := v_new || jsonb_build_array(case when e ->> 'id' = p_automation_id::text
               then e || jsonb_build_object('webhook_sample', jsonb_build_object('body', p_body, 'at', now())) else e end);
  end loop;
  update custom.record set data = jsonb_set(data, '{automations}', v_new, true) where id = v_table;
  if not coalesce((v_item ->> 'enabled')::boolean, false) then
    return jsonb_build_object('ok', true, 'http', 202, 'ran', false,
             'says', 'This automation is switched off. The payload was kept as its sample.');
  end if;
  v_who := coalesce(nullif(v_item ->> 'created_by', '')::uuid, nullif(v_item ->> 'updated_by', '')::uuid);
  v_held := current_setting('request.jwt.claims', true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_who, 'role', 'authenticated')::text, true);
  v_run := custom._automation_run(v_org, v_table, null, v_item, '{}'::jsonb, custom._automation_fields(v_org, v_table), null,
             jsonb_build_object('on', 'webhook', 'operation', 'webhook', 'via', 'webhook', 'changed_field_ids', '[]'::jsonb,
                                'body', p_body));
  perform set_config('request.jwt.claims', coalesce(v_held, ''), true);
  select r.data into v_row from custom.record r where r.id = v_run;
  return jsonb_build_object('ok', true, 'http', 200, 'ran', true, 'run_id', v_run, 'status', v_row ->> 'status', 'says', v_row ->> 'says');
end
$function$;
-- ── 7. THE CHECK: webhook trigger, hourly / every-N-minutes schedules, and the new steps ───────────────────────
-- A spec using none of AT-AUTO2's shapes is judged exactly as before (byte-equal normalization, so MAKE-AUTODUP's
-- reuse still recognizes it).
create or replace function custom._automation_check_timed(p_organization_id uuid, p_table_id uuid, p_spec jsonb)
 returns jsonb
 language plpgsql
 stable
 set search_path to 'pg_catalog'
as $function$
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
            or (v_on = 'schedule' and v_trig ->> 'every' in ('hour', 'minutes'))
            or (jsonb_typeof(p_spec -> 'actions') = 'array' and (
                  jsonb_path_exists(p_spec, '$.actions[*] ? (@.do == "if" || @.do == "for_each" || @.do == "find" || @.do == "archive" || @.do == "update" || @.do == "script")')
                  or (p_spec -> 'actions')::text ~ c_tok)));
  if not v_v2 and (v_on is null or v_on not in ('date_arrives', 'schedule')) then
    return custom._automation_check(p_organization_id, p_table_id, p_spec);
  end if;
  v_rowless := v_on in ('webhook', 'schedule');

  if v_v2 then
    -- name, trigger and condition through the store's checker, with one stand-in step; the steps are walked below
    v_core := custom._automation_check(p_organization_id, p_table_id,
                jsonb_build_object('name', p_spec -> 'name',
                  'trigger', case when v_on in ('webhook', 'schedule', 'date_arrives') then jsonb_build_object('on', 'row_added') else v_trig end,
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
-- ── 8. THE CLOCK: every N minutes and every N hours ──
create or replace function custom._automation_time_item(p_organization_id uuid, p_table_id uuid, p_automation jsonb, p_now timestamp with time zone)
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
  if v_on = 'schedule' and v_trig ->> 'every' in ('minutes', 'hour') then
    -- AT-AUTO2 (2026-10-15): every N minutes / every N hours at :MM. The latest slot at or before now, in the
    -- organization's zone; a slot missed by more than one hour is skipped, never caught up (no burst of runs).
    if v_trig ->> 'every' = 'minutes' then
      v_occ := date_trunc('hour', v_local)
               + make_interval(mins => (floor(extract(minute from v_local) / (v_trig ->> 'minutes')::integer) * (v_trig ->> 'minutes')::integer)::integer);
    else
      v_occ := date_trunc('hour', v_local) + make_interval(mins => coalesce((v_trig ->> 'minute')::integer, 0));
      if v_occ > v_local then v_occ := v_occ - interval '1 hour'; end if;
      v_occ := v_occ - make_interval(hours => (extract(hour from v_occ)::integer % coalesce((v_trig ->> 'hours')::integer, 1)));
    end if;
    v_due := v_occ at time zone v_zone;
    if v_due <= v_since or p_now - v_due > interval '1 hour' then
      return 0;
    end if;
    v_key := (v_trig ->> 'every') || '|' || to_char(v_occ, 'YYYY-MM-DD"T"HH24:MI');
    insert into custom.automation_fired (organization_id, automation_id, subject_id, fire_key)
    values (p_organization_id, v_id, p_table_id, v_key) on conflict do nothing;
    get diagnostics v_n = row_count;
    if v_n = 0 then return 0; end if;
    perform custom._automation_run(p_organization_id, p_table_id, null, p_automation, '{}'::jsonb, v_fields, null,
              jsonb_build_object('on', 'schedule', 'operation', 'time', 'via', 'schedule', 'changed_field_ids', '[]'::jsonb,
                                 'every', v_trig ->> 'every', 'fires_at', v_due));
    return 1;
  end if;

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
-- ── 9. DECLARE: webhook secret, born-off schedules, and every save a version ──
create or replace function custom.automation_declare(p_organization_id uuid, p_table_id uuid, p_spec jsonb, p_automation_id uuid DEFAULT NULL::uuid)
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

  -- AT-AUTO2 (2026-10-15): a script is paid work like an agent, so a script on a time is saved off too; and a schedule
  -- that runs every N minutes or hours is saved off whatever its steps (no blind paid automations): switching it on is
  -- the person's own act.
  v_ai_sched := ((v_check -> 'spec' -> 'trigger' ->> 'on') in ('date_arrives', 'schedule')
                 and jsonb_path_exists(v_check -> 'spec', '$.actions.** ? (@.do == "agent" || @.do == "script")'))
                or coalesce((v_check -> 'spec' -> 'trigger' ->> 'every') in ('minutes', 'hour'), false);

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
                   and jsonb_path_exists(e -> 'spec', '$.actions.** ? (@.do == "agent" || @.do == "script")'))
                  or coalesce((e -> 'spec' -> 'trigger' ->> 'every') in ('minutes', 'hour'), false);
      if v_ai_sched and not coalesce(v_was_ai, false) then
        v_item := v_item || jsonb_build_object('enabled', false);
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
         || case when v_ai_sched then jsonb_build_object('ai_on_schedule', true,
                   'says', case when (v_check -> 'spec' -> 'trigger' ->> 'every') in ('minutes', 'hour')
                                then 'It runs every few minutes or hours, so it is saved switched off. Switch it on to start it.'
                                else 'It runs an agent or a script on a schedule, so it is saved switched off. Switch it on to start it.' end)
                 else '{}'::jsonb end;
end
$function$;
-- ── 10. A TEST RUN of a webhook automation uses its sample payload ──
create or replace function custom.automation_test(p_organization_id uuid, p_automation_id uuid, p_record_id uuid DEFAULT NULL::uuid)
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
    if v_on not in ('schedule', 'webhook') then
      raise exception 'Pick a row to test it on.' using errcode = '22023',
            hint = 'Only an automation that runs on a schedule or from a webhook acts with no row.';
    end if;
  else
    if v_on in ('schedule', 'webhook') then
      raise exception 'An automation on a schedule or a webhook acts with no row; test it without one.' using errcode = '22023';
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
                                'changed_field_ids', '[]'::jsonb, 'condition_met', v_met)
             -- AT-AUTO2: a webhook's test run reads the last payload it received (its sample)
             || case when v_on = 'webhook' then jsonb_build_object('body', coalesce(v_item -> 'webhook_sample' -> 'body', '{}'::jsonb)) else '{}'::jsonb end);
  select r.data into v_row from custom.record r where r.organization_id = p_organization_id and r.id = v_run;
  return jsonb_build_object('ok', true, 'run_id', v_run, 'automation_id', p_automation_id, 'record_id', p_record_id,
           'status', v_row ->> 'status', 'says', v_row ->> 'says', 'steps', v_row -> 'steps', 'condition_met', v_met);
end
$function$;
-- ── 11. REVISION HISTORY: list an automation's versions, restore one ──────────────────────────────────────────
create function custom.automation_revisions(p_organization_id uuid, p_automation_id uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_table uuid;
  v_out   jsonb;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.automation_revisions');
  select h.table_id into v_table from custom._automation_home(p_organization_id, p_automation_id) h;
  if v_table is null then
    raise exception 'There is no such automation here.' using errcode = '23503',
          hint = 'It may belong to another organization. Nothing was read.';
  end if;
  perform custom.assert_may_know_table(p_organization_id, v_table, 'custom.automation_revisions');
  select coalesce(jsonb_agg(jsonb_build_object('revision_id', r.id, 'at', r.data ->> 'at', 'by', r.data ->> 'by',
           'note', r.data ->> 'note', 'enabled', r.data -> 'enabled', 'spec', r.data -> 'spec') order by r.data ->> 'at' desc), '[]'::jsonb)
    into v_out
    from (select x.id, x.data, x.created_at from custom.record x
           where x.organization_id = p_organization_id and x.data_class = 'automation_revision' and x.deleted_at is null
             and x.table_id is null and x.data ->> 'automation_id' = p_automation_id::text
           order by x.data ->> 'at' desc limit 50) r;
  return jsonb_build_object('automation_id', p_automation_id, 'table_id', v_table, 'revisions', v_out);
end
$function$;

create function custom.automation_revision_restore(p_organization_id uuid, p_automation_id uuid, p_revision_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_table uuid;
  v_spec  jsonb;
begin
  select h.table_id into v_table from custom._automation_home(p_organization_id, p_automation_id) h;
  select x.data -> 'spec' into v_spec from custom.record x
   where x.organization_id = p_organization_id and x.id = p_revision_id and x.data_class = 'automation_revision'
     and x.deleted_at is null and x.data ->> 'automation_id' = p_automation_id::text;
  if v_table is null or v_spec is null then
    raise exception 'There is no such version of this automation.' using errcode = '23503',
          hint = 'It may belong to another automation or organization. Nothing was changed.';
  end if;
  -- the restore is one more save, through the one door that saves (its checks, its permission, its new version)
  return custom.automation_declare(p_organization_id, v_table, v_spec, p_automation_id);
end
$function$;

-- ── 12. DOORS ─────────────────────────────────────────────────────────────────────────────────────────────────
-- Client doors: the two revision doors (signed_in_callers = true: signed_in_door_holds_its_grant grants them at
-- commit). Backend-only (no door row, so platform.enforce_definer_client_grants keeps clients off them):
-- automation_claim_pending, automation_resume, automation_webhook_receive; each also refuses any caller with an
-- auth.uid() or that is not a trusted backend.
insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers, anonymous_purpose, argument_rules)
values
  ('custom', 'automation_revisions', 'p_organization_id uuid, p_automation_id uuid', array['uuid'::regtype, 'uuid'::regtype]::oid[],
   'Lists the saved versions of one automation for its Versions panel (spec, when, who).',
   'atauto2_a_an_automation_branches_loops_and_waits_for_the_server.sql', null, true, false, null,
   jsonb_build_object('version', 1, 'declared_by', 'atauto2_a_an_automation_branches_loops_and_waits_for_the_server.sql',
     'declared_at', '2026-10-15 lane AT-AUTO2, read from the body and exercised in scripts/campaign-tests/atauto2_green.sql',
     'arguments', jsonb_build_object(
       'p_organization_id', jsonb_build_object('type', 'uuid', 'position', 1, 'optional', false, 'entity', 'organization',
         'access', 'custom.assert_client_may_reach (member of the organization, store open)',
         'check', 'custom.assert_client_may_reach(p_organization_id) before anything is read.',
         'foreign', jsonb_build_object('note', 'refused by name: not a member', 'not_a_leak', true, 'same_as_invented', false),
         'null_rule', jsonb_build_object('means', 'refused'),
         'verified', 'scripts/campaign-tests/atauto2_green.sql, rolled back'),
       'p_automation_id', jsonb_build_object('type', 'uuid', 'position', 2, 'optional', false, 'entity', 'record',
         'entity_reason', 'An automation is an item inside its table record''s automations list; its table is the entity checked.',
         'access', 'custom.assert_may_know_table on the automation''s own table',
         'check', 'custom._automation_home(p_organization_id, p_automation_id) finds its table inside this organization only; then assert_may_know_table.',
         'foreign', jsonb_build_object('note', 'There is no such automation here (23503), the same for another organization''s and an invented id', 'not_a_leak', true, 'same_as_invented', true),
         'null_rule', jsonb_build_object('means', 'refused'),
         'verified', 'scripts/campaign-tests/atauto2_green.sql, rolled back')))),
  ('custom', 'automation_revision_restore', 'p_organization_id uuid, p_automation_id uuid, p_revision_id uuid',
   array['uuid'::regtype, 'uuid'::regtype, 'uuid'::regtype]::oid[],
   'Restores one saved version of an automation by declaring it again through custom.automation_declare (its checks and its admin-on-table permission).',
   'atauto2_a_an_automation_branches_loops_and_waits_for_the_server.sql', null, true, false, null,
   jsonb_build_object('version', 1, 'declared_by', 'atauto2_a_an_automation_branches_loops_and_waits_for_the_server.sql',
     'declared_at', '2026-10-15 lane AT-AUTO2, read from the body and exercised in scripts/campaign-tests/atauto2_green.sql',
     'arguments', jsonb_build_object(
       'p_organization_id', jsonb_build_object('type', 'uuid', 'position', 1, 'optional', false, 'entity', 'organization',
         'access', 'custom.automation_declare''s own gates (store door, reach, admin on the table)',
         'check', 'Passed to custom.automation_declare, which asserts reach and admin on the table before writing.',
         'foreign', jsonb_build_object('note', 'refused by name', 'not_a_leak', true, 'same_as_invented', false),
         'null_rule', jsonb_build_object('means', 'refused'),
         'verified', 'scripts/campaign-tests/atauto2_green.sql, rolled back'),
       'p_automation_id', jsonb_build_object('type', 'uuid', 'position', 2, 'optional', false, 'entity', 'record',
         'entity_reason', 'An automation is an item inside its table record; the table is the entity checked by automation_declare.',
         'access', 'admin on the automation''s table (custom.automation_declare)',
         'check', 'custom._automation_home inside this organization only; the revision must name this automation.',
         'foreign', jsonb_build_object('note', 'There is no such version of this automation (23503)', 'not_a_leak', true, 'same_as_invented', true),
         'null_rule', jsonb_build_object('means', 'refused'),
         'verified', 'scripts/campaign-tests/atauto2_green.sql, rolled back'),
       'p_revision_id', jsonb_build_object('type', 'uuid', 'position', 3, 'optional', false, 'entity', 'record',
         'entity_reason', 'A revision row (data_class automation_revision) has no access of its own; it is read only as a version of the automation already decided on.',
         'access', 'none of its own',
         'check', 'Must be an automation_revision row of this organization whose automation_id is p_automation_id.',
         'foreign', jsonb_build_object('note', 'There is no such version of this automation (23503)', 'not_a_leak', true, 'same_as_invented', true),
         'null_rule', jsonb_build_object('means', 'refused'),
         'verified', 'scripts/campaign-tests/atauto2_green.sql, rolled back'))));

-- Server-only definers declare who calls them (no client ever does).
insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values
  ('custom', '_automation_step',
   'p_organization_id uuid, p_table_id uuid, p_record_id uuid, p_automation jsonb, p_byid jsonb, p_fields jsonb, p_change_id uuid, p_trigger jsonb, p_n integer, p_act jsonb',
   array['uuid'::regtype, 'uuid'::regtype, 'uuid'::regtype, 'jsonb'::regtype, 'jsonb'::regtype, 'jsonb'::regtype, 'uuid'::regtype, 'jsonb'::regtype, 'int4'::regtype, 'jsonb'::regtype]::oid[],
   'p_organization_id/p_table_id/p_record_id come from the run row custom._automation_advance already holds (written by the store''s own triggers or doors after their access checks); NULL record = a run with no row.',
   'atauto2_a_an_automation_branches_loops_and_waits_for_the_server.sql',
   'server_only: called only by custom._automation_advance while it interprets a run the store itself started; no client ever calls one step.', false, false),
  ('custom', '_automation_advance', 'p_run_id uuid', array['uuid'::regtype]::oid[],
   'p_run_id is an automation_run row written by custom._automation_run or resumed by custom.automation_resume; NULL or unknown answers null and does nothing.',
   'atauto2_a_an_automation_branches_loops_and_waits_for_the_server.sql',
   'server_only: called by custom._automation_run and custom.automation_resume only, inside the store''s own run path; no client lane.', false, false),
  ('custom', 'automation_claim_pending', 'p_worker text, p_limit integer, p_lease_seconds integer', array['text'::regtype, 'int4'::regtype, 'int4'::regtype]::oid[],
   'No entity argument; refuses any caller with an auth.uid() or that is not iam.is_trusted_backend().',
   'atauto2_a_an_automation_branches_loops_and_waits_for_the_server.sql',
   'server_only: aidream''s automation step worker claims runs waiting on a server step (scripts); a browser never claims work.', false, false),
  ('custom', 'automation_resume', 'p_run_id uuid, p_output jsonb, p_error text, p_logs jsonb', array['uuid'::regtype, 'jsonb'::regtype, 'text'::regtype, 'jsonb'::regtype]::oid[],
   'p_run_id must be a run waiting on a server step; anything else answers ok=false. Refuses any caller with an auth.uid() or not a trusted backend.',
   'atauto2_a_an_automation_branches_loops_and_waits_for_the_server.sql',
   'server_only: aidream''s automation step worker answers the step it claimed (script output, logs, or error); a browser never answers.', false, false),
  ('custom', 'automation_webhook_receive', 'p_automation_id uuid, p_secret text, p_body jsonb', array['uuid'::regtype, 'text'::regtype, 'jsonb'::regtype]::oid[],
   'p_automation_id with p_secret must match a live webhook automation''s own secret; a wrong pair answers exactly like an unknown id (404). Refuses any caller with an auth.uid() or not a trusted backend.',
   'atauto2_a_an_automation_branches_loops_and_waits_for_the_server.sql',
   'server_only: aidream''s POST /api/automations/hooks/{id}/{secret} delivers inbound webhook payloads; the outside caller holds only the URL.', false, false);
