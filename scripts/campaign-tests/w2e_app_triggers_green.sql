-- W2-E proof (rolled back by its runner): connected-app triggers and the github_issue step.
-- RED before migration w2e_a (the trigger is refused / the doors do not exist), GREEN after.
-- Acts as admin@admin.com on admin's own "Wholesale Orders" table; nothing survives the rollback.
do $proof$
declare
  v_org   uuid := 'c19a81b7-f65f-4c01-b04c-00f97f8b7e4d';
  v_table uuid := '10535f59-1def-471b-afa2-dd8609f0c2ad';
  v_admin uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_out   jsonb;
  v_id    uuid;
  v_watch jsonb;
  v_ev    jsonb;
  v_run   jsonb;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  -- 1. a Gmail trigger with a GitHub issue step is accepted, normalised and SAVED OFF
  v_out := custom.automation_declare(v_org, v_table, jsonb_build_object('name', 'W2E proof gmail',
             'trigger', jsonb_build_object('on', 'gmail_received', 'query', ' from:orders@example.com '),
             'actions', jsonb_build_array(jsonb_build_object('do', 'github_issue', 'repo', 'acme/website',
                          'title', 'Mail: {{trigger.body.subject}}', 'body', '{{trigger.body.snippet}}'))));
  if not coalesce((v_out ->> 'ok')::boolean, false) then raise exception 'RED gmail declare refused: %', v_out; end if;
  if (v_out ->> 'enabled')::boolean then raise exception 'RED an app trigger must be saved off: %', v_out; end if;
  if v_out -> 'spec' -> 'trigger' <> '{"on": "gmail_received", "query": "from:orders@example.com"}'::jsonb then
    raise exception 'RED trigger not normalised: %', v_out -> 'spec' -> 'trigger'; end if;
  v_id := (v_out ->> 'automation_id')::uuid;
  -- 2. calendar and slack triggers are accepted; bad shapes are refused by name
  v_out := custom.automation_declare(v_org, v_table, jsonb_build_object('name', 'W2E proof cal',
             'trigger', jsonb_build_object('on', 'calendar_event', 'when', 'starts', 'minutes_before', 10),
             'actions', jsonb_build_array(jsonb_build_object('do', 'notify', 'to', jsonb_build_object('author', true), 'text', '{{trigger.body.title}}'))));
  if not coalesce((v_out ->> 'ok')::boolean, false) then raise exception 'RED calendar declare refused: %', v_out; end if;
  v_out := custom.automation_declare(v_org, v_table, jsonb_build_object('name', 'W2E proof slack',
             'trigger', jsonb_build_object('on', 'slack_message'), 'actions', jsonb_build_array(jsonb_build_object('do', 'notify', 'to', jsonb_build_object('author', true), 'text', 'x'))));
  if coalesce((v_out ->> 'ok')::boolean, true) or not (v_out -> '_errors') ? 'trigger.channel' then
    raise exception 'RED slack without channel must be refused: %', v_out; end if;
  v_out := custom.automation_declare(v_org, v_table, jsonb_build_object('name', 'W2E proof bad repo',
             'trigger', jsonb_build_object('on', 'webhook'), 'actions', jsonb_build_array(jsonb_build_object('do', 'github_issue', 'repo', 'not a repo', 'title', 'x'))));
  if coalesce((v_out ->> 'ok')::boolean, true) or not (v_out -> '_errors') ? 'actions.0.repo' then
    raise exception 'RED bad repo must be refused: %', v_out; end if;
  -- 3. the server's doors: a person cannot call them; the server reads the watch, notes, and starts runs
  begin
    perform custom.automation_app_event(v_id, '[]'::jsonb, '{}'::jsonb);  -- as the signed-in person: refused
    raise exception 'RED a signed-in person reached the server door';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims', '', true);
  v_watch := custom.automation_app_watch(v_id);
  if v_watch ->> 'owner' <> v_admin::text or (v_watch ->> 'enabled')::boolean then raise exception 'RED watch wrong: %', v_watch; end if;
  perform custom.automation_app_note(v_id, 'No Google account with Gmail reading is connected.', '{"after": 1}'::jsonb);
  -- switched off: an event keeps the cursor and runs nothing
  v_ev := custom.automation_app_event(v_id, '[{"id": "m1", "subject": "Hi"}]'::jsonb, '{"after": 2}'::jsonb);
  if (v_ev ->> 'ran')::integer <> 0 then raise exception 'RED an off automation ran: %', v_ev; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  perform custom.automation_set_enabled(v_org, v_id, true);
  perform set_config('request.jwt.claims', '', true);
  v_ev := custom.automation_app_event(v_id, '[{"id": "m2", "subject": "Order 42", "snippet": "two boxes"}]'::jsonb, '{"after": 3}'::jsonb);
  if (v_ev ->> 'ran')::integer <> 1 then raise exception 'RED the event did not start one run: %', v_ev; end if;
  select r.data into v_run from custom.record r where r.id = (v_ev -> 'run_ids' ->> 0)::uuid;
  if v_run ->> 'status' is distinct from 'waiting' then raise exception 'RED the run should wait for the server github step: %', v_run; end if;
  if v_run::text not like '%Mail: Order 42%' then raise exception 'RED trigger.body did not reach the step: %', v_run; end if;
  select x into v_watch from custom.record t, jsonb_array_elements(t.data -> 'automations') x where t.id = v_table and x ->> 'id' = v_id::text;
  if v_watch -> 'app_cursor' <> '{"after": 3}'::jsonb or v_watch ? 'app_says' then raise exception 'RED cursor/says not kept: %', v_watch; end if;
  raise notice 'GREEN W2-E: app triggers saved off, refused by name, watch/note/event doors, run waits on github_issue with trigger.body filled';
end
$proof$;
