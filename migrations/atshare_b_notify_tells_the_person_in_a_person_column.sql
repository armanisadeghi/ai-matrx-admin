-- AT-SHARE-B / Airtable parity "Collaborator (user) notify": a notify step aimed at a Person column tells the PERSON.
-- A Person column stores the id of the person's Person record (custom.person_kernel_id()), and the notify step compared
-- that record id against organization membership, so every "Notify when assigned" run failed with "That person is not a
-- member of this organization" and nobody was told. The step now reads the account id the Person record names. Nothing
-- else in the step changes; an id that is already an account id behaves as before. Proof:
-- scripts/campaign-tests/atshare_b_notify_delivery.sql (RED before this file at clause 2, GREEN after).
-- based-on: custom._automation_step(uuid, uuid, uuid, jsonb, jsonb, jsonb, uuid, jsonb, integer, jsonb) e8c30968c8850017d0a7ba38322f463bbd62a81e48336b008c5dee328ade0cbf

CREATE OR REPLACE FUNCTION custom._automation_step(p_organization_id uuid, p_table_id uuid, p_record_id uuid, p_automation jsonb, p_byid jsonb, p_fields jsonb, p_change_id uuid, p_trigger jsonb, p_n integer, p_act jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
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
  v_req     bigint;
  v_out     jsonb;
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
          -- AT-SHARE-B (2026-10-17): a Person column keeps the id of the person's Person record (custom.person_kernel_id()),
          -- not their account id, so "tell the person in this column" read the record id, found no member by it, and
          -- refused every assignment ("That person is not a member of this organization"). The Person record names the
          -- account it stands for; an id that is already an account id is kept as it is.
          if v_act -> 'to' ? 'field' and v_to is not null then
            v_to := coalesce((select nullif(pr.data ->> 'user_id', '')::uuid from custom.record pr
                               where pr.id = v_to and pr.table_id = custom.person_kernel_id()), v_to);
          end if;
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
          -- DEFECTS B1: before queuing, settle any delivery that has waited over 10 minutes for an answer (no schedule).
          perform custom._automation_delivery_settle_stale(null);
          v_req := net.http_post(url := v_act ->> 'url',
                    body := jsonb_build_object('event', 'automation.fired', 'automation_id', v_a ->> 'id',
                              'automation', v_spec ->> 'name', 'table_id', p_table_id, 'record_id', p_record_id,
                              'operation', p_trigger ->> 'operation', 'changed_field_ids', p_trigger -> 'changed_field_ids', 'trigger', p_trigger ->> 'on'),
                    headers := '{"Content-Type": "application/json"}'::jsonb);
          -- DEFECTS 3: pg_net posts after this transaction commits, so nothing is SENT yet. The step says queued
          -- and carries the request id; custom.automation_delivery_tick writes Sent / Failed with the answer.
          insert into custom.automation_delivery (request_id, organization_id, automation_id, step_n, kind, url_host)
          values (v_req, p_organization_id, v_a ->> 'id', v_n, 'webhook', substring(v_act ->> 'url' from '^https?://([^/?#]+)'));
          v_stepsay := 'Queued the webhook; waiting for the address to answer.';
          v_out := jsonb_build_object('delivery', 'queued', 'request_id', v_req);

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
          -- transaction commits; the step says it is queued until Slack answers (DEFECTS 3).
          if v_act ->> 'url' !~ '^https://hooks\.slack\.com/' or not coalesce(files.is_safe_webhook_url(v_act ->> 'url'), false) then
            raise exception 'That Slack address is not a Slack incoming webhook any more, so nothing was sent.' using errcode = '22023';
          end if;
          v_text := custom._automation_fill(v_act ->> 'text', p_byid, p_fields);
          -- DEFECTS B1: before queuing, settle any delivery that has waited over 10 minutes for an answer (no schedule).
          perform custom._automation_delivery_settle_stale(null);
          v_req := net.http_post(url := v_act ->> 'url',
                    body := jsonb_build_object('text', v_text),
                    headers := '{"Content-Type": "application/json"}'::jsonb);
          insert into custom.automation_delivery (request_id, organization_id, automation_id, step_n, kind, url_host)
          values (v_req, p_organization_id, v_a ->> 'id', v_n, 'slack', 'hooks.slack.com');
          v_stepsay := 'Queued for Slack; waiting for Slack to answer: ' || left(v_text, 120);
          v_out := jsonb_build_object('delivery', 'queued', 'request_id', v_req);

        else
          raise exception 'This step is not one the store knows how to run (%).', coalesce(v_act ->> 'do', 'nothing') using errcode = '22023';
        end if;
        return jsonb_build_object('n', v_n, 'do', v_act ->> 'do', 'status', 'done', 'says', v_stepsay) || coalesce(v_out, '{}'::jsonb);
end
$function$;
