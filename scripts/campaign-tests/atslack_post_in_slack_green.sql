-- AT-SLACK proof (run inside a rolled-back transaction): the slack_post step {channel, message}.
-- RED before migration 20261019190000_atslack_a (the kind is refused), GREEN after. Acts as admin@admin.com on admin's own table.
do $proof$
declare
  v_org   uuid := 'c19a81b7-f65f-4c01-b04c-00f97f8b7e4d';
  v_table uuid := '10535f59-1def-471b-afa2-dd8609f0c2ad';
  v_admin uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_out   jsonb;
  v_id    uuid;
  v_secret text;
  v_res   jsonb;
  v_row   jsonb;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  -- 1. a Slack message trigger with a Post in Slack step is accepted, normalised, and saved off
  v_out := custom.automation_declare(v_org, v_table, jsonb_build_object('name', 'ATSLACK proof relay',
             'trigger', jsonb_build_object('on', 'slack_message', 'channel', 'C0123ABC'),
             'actions', jsonb_build_array(jsonb_build_object('do', 'slack_post', 'channel', ' #general ', 'message', 'Seen: {{trigger.body.text}}'))));
  if not coalesce((v_out ->> 'ok')::boolean, false) then raise exception 'RED slack_post refused: %', v_out; end if;
  if (v_out ->> 'enabled')::boolean then raise exception 'RED an app trigger must be saved off: %', v_out; end if;
  if v_out -> 'spec' -> 'actions' -> 0 <> '{"do": "slack_post", "channel": "#general", "message": "Seen: {{trigger.body.text}}"}'::jsonb then
    raise exception 'RED slack_post not normalised: %', v_out -> 'spec' -> 'actions' -> 0; end if;
  -- 2. bad shapes are refused by name
  v_out := custom.automation_declare(v_org, v_table, jsonb_build_object('name', 'ATSLACK proof bad channel',
             'trigger', jsonb_build_object('on', 'webhook'),
             'actions', jsonb_build_array(jsonb_build_object('do', 'slack_post', 'channel', 'not a channel', 'message', 'x'))));
  if coalesce((v_out ->> 'ok')::boolean, true) or not (v_out -> '_errors') ? 'actions.0.channel' then
    raise exception 'RED a bad channel must be refused by name: %', v_out; end if;
  v_out := custom.automation_declare(v_org, v_table, jsonb_build_object('name', 'ATSLACK proof no message',
             'trigger', jsonb_build_object('on', 'webhook'),
             'actions', jsonb_build_array(jsonb_build_object('do', 'slack_post', 'channel', 'general', 'message', ' '))));
  if coalesce((v_out ->> 'ok')::boolean, true) or not (v_out -> '_errors') ? 'actions.0.message' then
    raise exception 'RED an empty message must be refused by name: %', v_out; end if;
  -- 3. a webhook run waits for the server at the Slack step, with the token resolved, and the answer finishes it
  v_out := custom.automation_declare(v_org, v_table, jsonb_build_object('name', 'ATSLACK proof hook',
             'trigger', jsonb_build_object('on', 'webhook'),
             'actions', jsonb_build_array(jsonb_build_object('do', 'slack_post', 'channel', '{{trigger.body.room}}', 'message', 'Order {{trigger.body.n}}'))));
  if not coalesce((v_out ->> 'ok')::boolean, false) then raise exception 'RED tokenised slack_post refused: %', v_out; end if;
  v_id := (v_out ->> 'automation_id')::uuid;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  select x ->> 'webhook_secret' into v_secret from custom.record t, jsonb_array_elements(t.data -> 'automations') x
   where t.id = v_table and x ->> 'id' = v_id::text;
  if v_secret is null then raise exception 'RED no webhook secret for the proof hook'; end if;
  v_res := custom.automation_webhook_receive(v_id, v_secret, jsonb_build_object('room', 'general', 'n', 42));
  if (v_res ->> 'http')::integer <> 200 or v_res ->> 'status' <> 'waiting' then raise exception 'RED the run did not wait at the Slack step: %', v_res; end if;
  select data into v_row from custom.record where id = (v_res ->> 'run_id')::uuid;
  if v_row -> 'pending' ->> 'do' <> 'slack_post' or v_row -> 'pending' -> 'act' ->> 'channel' <> 'general'
     or v_row -> 'pending' -> 'act' ->> 'message' <> 'Order 42' then
    raise exception 'RED pending is not the resolved Slack step: %', v_row -> 'pending'; end if;
  if not exists (select 1 from jsonb_array_elements(v_row -> 'steps') e where e ->> 'says' = 'Waiting for the server to post in Slack.') then
    raise exception 'RED the waiting sentence is missing: %', v_row -> 'steps'; end if;
  perform custom.automation_resume((v_res ->> 'run_id')::uuid, '{"posted": true, "ts": "1.2"}'::jsonb, null, null);
  select data into v_row from custom.record where id = (v_res ->> 'run_id')::uuid;
  if not exists (select 1 from jsonb_array_elements(v_row -> 'steps') e where e ->> 'says' = 'Posted in Slack.') then
    raise exception 'RED the answered sentence is missing: %', v_row -> 'steps'; end if;
  raise notice 'GREEN AT-SLACK: slack_post accepted, refused by name when wrong, waits for the server, answered as Posted in Slack.';
end
$proof$;
