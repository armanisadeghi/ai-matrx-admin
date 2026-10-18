-- LANE ADV-FIX-A - close-out adversarial findings F1, F2, F3, F5, F9 (ADV-1). Plain SQL, one short transaction, ROLLED
-- BACK by its runner (lock_timeout 5s, statement_timeout 20s). Acts as admin@admin.com (and test@test.com for the
-- non-owner save) on admin's own "Wholesale Orders" table in Ashford Labs; nothing survives the rollback.
-- RED before 20261018150000_adv_fix_a_one_email_one_run_owner_bound_recorder_never_raises.sql:
--   A1 the same email handed in twice starts a second run; A2 an older cursor overwrites a newer one;
--   B1 a save by someone else keeps the automation on and reading the owner's mailbox; B2 the may-edit door is missing;
--   C1 an owner who left the organization still gets runs started; D1 a non-uuid text in an error report raises;
--   (E1, the GitHub waiting sentence, was already green: 20261018140000_mswrite_a fixed _automation_advance first;
--   it stays here as a regression clause.)
-- GREEN after: every clause passes; any RED clause is listed and the suite raises at the end.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '20s';
do $t$
declare
  v_org   uuid := 'c19a81b7-f65f-4c01-b04c-00f97f8b7e4d';
  v_table uuid := '10535f59-1def-471b-afa2-dd8609f0c2ad';
  v_admin uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_test  uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';
  v_ghost uuid := gen_random_uuid();
  v_out jsonb; v_id uuid; v_ev jsonb; v_w jsonb; v_item jsonb; v_run jsonb; v_eid uuid; v_row record;
  v_red text[] := '{}';
  v_ok boolean;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  v_out := custom.automation_declare(v_org, v_table, jsonb_build_object('name', 'ADV-FIX-A proof gmail',
             'trigger', jsonb_build_object('on', 'gmail_received', 'query', 'from:orders@example.com'),
             'actions', jsonb_build_array(jsonb_build_object('do', 'github_issue', 'repo', 'acme/website',
                          'title', 'Mail: {{trigger.body.subject}}', 'body', '{{trigger.body.snippet}}'))));
  v_id := (v_out ->> 'automation_id')::uuid;
  perform custom.automation_set_enabled(v_org, v_id, true);
  perform set_config('request.jwt.claims', '', true);

  -- A1 ONE EMAIL, ONE RUN: two checks that both read cursor C hand in the same email; only the first starts a run.
  v_ev := custom.automation_app_event(v_id, '[{"id": "m1", "subject": "Order 42", "snippet": "two boxes"}]'::jsonb,
                                      '{"after": 2000, "seen": ["m1"]}'::jsonb);
  if coalesce((v_ev ->> 'ran')::int, -1) <> 1 then raise exception 'setup: the first hand-in did not start one run: %', v_ev; end if;
  v_ev := custom.automation_app_event(v_id, '[{"id": "m1", "subject": "Order 42", "snippet": "two boxes"}]'::jsonb,
                                      '{"after": 1000, "seen": ["m1"]}'::jsonb);
  if coalesce((v_ev ->> 'ran')::int, -1) <> 0 then v_red := v_red || format('A1 RED: the same email started %s more run(s)', v_ev ->> 'ran');
  else raise notice 'A1 PASS - an email already seen starts nothing (skipped %)', v_ev ->> 'skipped'; end if;
  -- A2 the cursor is merged: the older check's cursor never moves it backwards, and the seen id is kept.
  select x into v_item from custom.record t, jsonb_array_elements(t.data -> 'automations') x where t.id = v_table and x ->> 'id' = v_id::text;
  if (v_item -> 'app_cursor' ->> 'after')::numeric <> 2000 or not (v_item -> 'app_cursor' -> 'seen') @> '["m1"]'::jsonb then
    v_red := v_red || format('A2 RED: cursor after the older check is %s', v_item -> 'app_cursor');
  else raise notice 'A2 PASS - the cursor kept the furthest point and the seen id'; end if;

  -- E1 the run waits on the GitHub step with a GitHub sentence.
  select r.data into v_run from custom.record r
   where r.id = (select (y ->> 0)::uuid from (select custom.automation_app_event(v_id, '[{"id": "m9", "subject": "Order 9"}]'::jsonb, '{"after": 2001}'::jsonb) -> 'run_ids' y) q);
  if v_run::text not like '%Waiting for the server to open the GitHub issue.%' then
    v_red := v_red || format('E1 RED: the waiting GitHub step says %s', (select string_agg(s ->> 'says', ' | ') from jsonb_array_elements(v_run -> 'steps') s));
  else raise notice 'E1 PASS - a waiting GitHub step says it is opening the GitHub issue'; end if;

  -- B2 the schedule-mirror route's door: a member at the editor level may, a stranger may not.
  begin
    execute 'select custom.automation_app_may_edit($1, $2)' into v_ok using v_id, v_admin;
    if not v_ok then v_red := v_red || 'B2 RED: the owner may not edit'::text; end if;
    execute 'select custom.automation_app_may_edit($1, $2)' into v_ok using v_id, v_ghost;
    if v_ok then v_red := v_red || 'B2 RED: a stranger may edit'::text; else raise notice 'B2 PASS - member at editor level yes, stranger no'; end if;
  exception when undefined_function then v_red := v_red || 'B2 RED: custom.automation_app_may_edit does not exist'::text;
  end;

  -- B1 OWNER-BOUND: test@test.com (also an admin of this table) saves admin's switched-on Gmail automation with a new
  -- search. It must not keep reading admin's mailbox: it re-binds to the saver, drops the cursor, and is switched off.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_test, 'role', 'authenticated')::text, true);
  v_out := custom.automation_declare(v_org, v_table, jsonb_build_object('name', 'ADV-FIX-A proof gmail',
             'trigger', jsonb_build_object('on', 'gmail_received', 'query', ''),
             'actions', jsonb_build_array(jsonb_build_object('do', 'github_issue', 'repo', 'acme/website', 'title', 'x'))), v_id);
  perform set_config('request.jwt.claims', '', true);
  v_w := custom.automation_app_watch(v_id);
  if v_w ->> 'owner' <> v_test::text or (v_w ->> 'enabled')::boolean or v_w -> 'cursor' <> 'null'::jsonb
     or not coalesce((v_out ->> 'rebound')::boolean, false) then
    v_red := v_red || format('B1 RED: after a non-owner save owner=%s enabled=%s cursor=%s says=%s', v_w ->> 'owner', v_w ->> 'enabled', v_w -> 'cursor', v_out ->> 'says');
  else raise notice 'B1 PASS - a non-owner save re-binds to the saver, drops the cursor, switches off: %', v_out ->> 'says'; end if;
  -- the owner saving their own automation keeps it as it was (still on, same owner)
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_test, 'role', 'authenticated')::text, true);
  perform custom.automation_set_enabled(v_org, v_id, true);
  v_out := custom.automation_declare(v_org, v_table, jsonb_build_object('name', 'ADV-FIX-A proof gmail 2',
             'trigger', jsonb_build_object('on', 'gmail_received', 'query', 'is:unread'),
             'actions', jsonb_build_array(jsonb_build_object('do', 'github_issue', 'repo', 'acme/website', 'title', 'x'))), v_id);
  perform set_config('request.jwt.claims', '', true);
  v_w := custom.automation_app_watch(v_id);
  if v_w ->> 'owner' <> v_test::text or not (v_w ->> 'enabled')::boolean then
    v_red := v_red || format('B1b RED: the owner''s own save changed owner=%s enabled=%s', v_w ->> 'owner', v_w ->> 'enabled');
  else raise notice 'B1b PASS - the owner''s own save keeps it on'; end if;

  -- C1 OWNER LEFT: the automation's owner is no longer a member (a made-up owner stands in, so no membership row is
  -- touched): the hand-in starts nothing, switches it off and says why.
  begin
    perform custom._automation_app_patch(v_table, v_id, jsonb_build_object('app_owner', v_ghost, 'created_by', v_ghost));
    v_ev := custom.automation_app_event(v_id, '[{"id": "m2", "subject": "Order 43"}]'::jsonb, '{"after": 3000}'::jsonb);
    v_w := custom.automation_app_watch(v_id);
    if coalesce((v_ev ->> 'ran')::int, 0) <> 0 or (v_w ->> 'enabled')::boolean or coalesce((v_w ->> 'owner_member')::boolean, true) then
      v_red := v_red || format('C1 RED: owner gone: event %s, enabled %s, owner_member %s', v_ev, v_w ->> 'enabled', v_w ->> 'owner_member');
    else raise notice 'C1 PASS - an owner who left starts nothing; switched off: %', v_ev ->> 'says'; end if;
  exception when others then
    v_red := v_red || format('C1 RED: the hand-in for an owner who left tried to run and failed (%s: %s)', sqlstate, left(sqlerrm, 160));
  end;
  -- C2 the server's stop door (connection gone) switches off with the sentence
  begin
    perform custom._automation_app_patch(v_table, v_id, jsonb_build_object('app_owner', v_test, 'enabled', true));
    execute 'select custom.automation_app_stop($1, $2)' using v_id, 'Switched off: No Google account is connected.';
    select x into v_item from custom.record t, jsonb_array_elements(t.data -> 'automations') x where t.id = v_table and x ->> 'id' = v_id::text;
    if (v_item ->> 'enabled')::boolean or v_item ->> 'app_says' not like 'Switched off:%' then
      v_red := v_red || format('C2 RED: stop left %s', v_item);
    else raise notice 'C2 PASS - the stop door switches off and says why'; end if;
  exception when undefined_function then v_red := v_red || 'C2 RED: custom.automation_app_stop does not exist'::text;
  end;

  -- D1 THE ERROR RECORDER NEVER RAISES: non-uuid ids and a bad time are stored as null, kept in context.
  begin
    v_eid := ops.record_system_error(jsonb_build_object('kind', 'adv_fix_a_test', 'error_text', 'bad ids',
               'user_id', 'not-a-uuid', 'occurred_in_organization_id', 'x', 'id', 'zz', 'conversation_id', 'nope',
               'occurred_at', 'yesterday-ish'));
    select * into v_row from ops.system_error where id = v_eid;
    if v_row.kind is distinct from 'adv_fix_a_test' or v_row.context -> 'unconvertible' ->> 'user_id' is distinct from 'not-a-uuid'
       or v_row.context -> 'unconvertible' ->> 'id' is distinct from 'zz' then
      v_red := v_red || format('D1 RED: stored kind %s context %s', v_row.kind, v_row.context);
    else raise notice 'D1 PASS - unconvertible values nulled and kept: %', v_row.context -> 'unconvertible'; end if;
  exception when others then
    v_red := v_red || format('D1 RED: the recorder raised %s: %s', sqlstate, sqlerrm);
  end;

  if cardinality(v_red) > 0 then
    raise exception 'RED (% clause(s)): %', cardinality(v_red), array_to_string(v_red, ' || ');
  end if;
  raise notice 'GREEN ADV-FIX-A: one email one run, merged cursor, owner-bound saves, may-edit door, owner-left stop, recorder never raises, GitHub waiting text';
end
$t$;
rollback;
