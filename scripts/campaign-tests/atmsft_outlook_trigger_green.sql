-- AT-MSFT proof (rolled back by its runner): the outlook_received trigger and Teams chat links on teams_message.
-- RED before migration 20261019200000_atmsft_a (outlook_received is not a trigger; a chat link is refused), GREEN after.
-- Acts as admin@admin.com on admin's own "Wholesale Orders" table; nothing survives the rollback.
do $proof$
declare
  v_org   uuid := 'c19a81b7-f65f-4c01-b04c-00f97f8b7e4d';
  v_table uuid := '10535f59-1def-471b-afa2-dd8609f0c2ad';
  v_admin uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_out   jsonb;
  v_id    uuid;
  v_ev    jsonb;
  v_run   jsonb;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  -- 1. an Outlook trigger is accepted, normalised and SAVED OFF; its step posts into a Teams CHAT
  v_out := custom.automation_declare(v_org, v_table, jsonb_build_object('name', 'AT-MSFT proof outlook',
             'trigger', jsonb_build_object('on', 'outlook_received', 'query', ' from:orders@example.com subject:invoice '),
             'actions', jsonb_build_array(jsonb_build_object('do', 'teams_message',
                          'channel_link', 'https://teams.microsoft.com/l/chat/19:meeting_abc123@thread.v2/conversations',
                          'message', 'Mail: {{trigger.body.subject}}'))));
  if not coalesce((v_out ->> 'ok')::boolean, false) then raise exception 'RED outlook declare refused: %', v_out; end if;
  if (v_out ->> 'enabled')::boolean then raise exception 'RED an app trigger must be saved off: %', v_out; end if;
  if v_out -> 'spec' -> 'trigger' <> '{"on": "outlook_received", "query": "from:orders@example.com subject:invoice"}'::jsonb then
    raise exception 'RED trigger not normalised: %', v_out -> 'spec' -> 'trigger'; end if;
  v_id := (v_out ->> 'automation_id')::uuid;
  -- 2. a condition and a non-text search are refused by name; a junk Teams link still is
  v_out := custom.automation_declare(v_org, v_table, jsonb_build_object('name', 'AT-MSFT proof bad query',
             'trigger', jsonb_build_object('on', 'outlook_received', 'query', 42),
             'actions', jsonb_build_array(jsonb_build_object('do', 'notify', 'to', jsonb_build_object('author', true), 'text', 'x'))));
  if coalesce((v_out ->> 'ok')::boolean, true) or not (v_out -> '_errors') ? 'trigger.query' then
    raise exception 'RED a numeric Outlook search must be refused: %', v_out; end if;
  v_out := custom.automation_declare(v_org, v_table, jsonb_build_object('name', 'AT-MSFT proof bad link',
             'trigger', jsonb_build_object('on', 'webhook'),
             'actions', jsonb_build_array(jsonb_build_object('do', 'teams_message', 'channel_link', 'https://example.com/chat', 'message', 'x'))));
  if coalesce((v_out ->> 'ok')::boolean, true) or not (v_out -> '_errors') ? 'actions.0.channel_link' then
    raise exception 'RED a junk Teams link must be refused: %', v_out; end if;
  -- 3. the server hands in one new email once the person switched it on: one run, waiting on the Teams post
  perform set_config('request.jwt.claims', '', true);
  v_ev := custom.automation_app_event(v_id, '[{"id": "AAMk1", "subject": "Hi"}]'::jsonb, '{"since": "2026-10-19T17:00:00Z"}'::jsonb, v_admin::text);
  if (v_ev ->> 'ran')::integer is distinct from 0 and v_ev ->> 'ran' is not null then raise exception 'RED an off automation ran: %', v_ev; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  perform custom.automation_set_enabled(v_org, v_id, true);
  perform set_config('request.jwt.claims', '', true);
  v_ev := custom.automation_app_event(v_id, '[{"id": "AAMk2", "subject": "Invoice 42", "from": "orders@example.com"}]'::jsonb,
                                      '{"since": "2026-10-19T17:50:00Z", "seen": ["AAMk2"]}'::jsonb, v_admin::text);
  if (v_ev ->> 'ran')::integer <> 1 then raise exception 'RED the Outlook event did not start one run: %', v_ev; end if;
  select r.data into v_run from custom.record r where r.id = (v_ev -> 'run_ids' ->> 0)::uuid;
  if v_run ->> 'status' is distinct from 'waiting' then raise exception 'RED the run should wait for the server Teams step: %', v_run; end if;
  if v_run::text not like '%Mail: Invoice 42%' then raise exception 'RED trigger.body did not reach the step: %', v_run; end if;
  raise notice 'GREEN AT-MSFT: outlook_received saved off + normalised, refused by name, one run per email waiting on a Teams chat post';
end
$proof$;
