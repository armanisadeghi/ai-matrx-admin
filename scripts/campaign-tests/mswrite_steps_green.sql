-- MS-WRITE proof (run inside a rolled-back transaction): outlook_mail, outlook_calendar_event, teams_message steps.
-- RED before migration mswrite_a (the kinds are refused), GREEN after. Acts as admin@admin.com on admin's own table.
do $proof$
declare
  v_org   uuid := 'c19a81b7-f65f-4c01-b04c-00f97f8b7e4d';
  v_table uuid := '10535f59-1def-471b-afa2-dd8609f0c2ad';
  v_admin uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_out   jsonb;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  v_out := custom.automation_declare(v_org, v_table, jsonb_build_object('name', 'MSW proof mail',
             'trigger', jsonb_build_object('on', 'webhook'),
             'actions', jsonb_build_array(jsonb_build_object('do', 'outlook_mail', 'to', 'a@example.com', 'subject', 'Hi', 'body', 'There'))));
  if not coalesce((v_out ->> 'ok')::boolean, false) then raise exception 'RED outlook_mail refused: %', v_out; end if;
  v_out := custom.automation_declare(v_org, v_table, jsonb_build_object('name', 'MSW proof cal',
             'trigger', jsonb_build_object('on', 'webhook'),
             'actions', jsonb_build_array(jsonb_build_object('do', 'outlook_calendar_event', 'title', 'Sync', 'starts_at', '2026-11-01 10:00'))));
  if not coalesce((v_out ->> 'ok')::boolean, false) then raise exception 'RED outlook_calendar_event refused: %', v_out; end if;
  v_out := custom.automation_declare(v_org, v_table, jsonb_build_object('name', 'MSW proof teams',
             'trigger', jsonb_build_object('on', 'webhook'),
             'actions', jsonb_build_array(jsonb_build_object('do', 'teams_message',
               'channel_link', 'https://teams.microsoft.com/l/channel/19%3Aabc%40thread.tacv2/General?groupId=11111111-1111-1111-1111-111111111111&tenantId=22222222-2222-2222-2222-222222222222', 'message', 'hello'))));
  if not coalesce((v_out ->> 'ok')::boolean, false) then raise exception 'RED teams_message refused: %', v_out; end if;
  v_out := custom.automation_declare(v_org, v_table, jsonb_build_object('name', 'MSW proof teams bad',
             'trigger', jsonb_build_object('on', 'webhook'),
             'actions', jsonb_build_array(jsonb_build_object('do', 'teams_message', 'channel_link', 'not a link', 'message', 'x'))));
  if coalesce((v_out ->> 'ok')::boolean, true) or not (v_out -> '_errors') ? 'actions.0.channel_link' then
    raise exception 'RED a bad channel link must be refused by name: %', v_out; end if;
  v_out := custom.automation_declare(v_org, v_table, jsonb_build_object('name', 'MSW proof mail bad',
             'trigger', jsonb_build_object('on', 'webhook'),
             'actions', jsonb_build_array(jsonb_build_object('do', 'outlook_mail', 'to', '', 'subject', 'x', 'body', 'y'))));
  if coalesce((v_out ->> 'ok')::boolean, true) or not (v_out -> '_errors') ? 'actions.0.to' then
    raise exception 'RED an empty recipient must be refused by name: %', v_out; end if;
  raise notice 'GREEN MS-WRITE: outlook_mail, outlook_calendar_event, teams_message accepted; bad ones refused by name';
end
$proof$;
