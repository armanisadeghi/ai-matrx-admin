-- LANE AT-FIX-H 1 - A WEBHOOK THAT REFUSES FAILS THE RUN AND TELLS ITS OWNER.
--
-- THE USE CASE. Ridgeback's owner adds "post to our webhook" to an automation; the address refuses (pg_net answers
-- with an error, here "Couldn't resolve host name"). The run turns Failed ("Not delivered ...") AFTER it had finished,
-- and its owner must be told exactly like a step that fails inside the run: in-app, DM and email, with a link to the run.
--
-- RED before 20261019210000_atfixh_a_a_late_delivery_failure_tells_the_owner.sql: F1 fails (the run is Failed and
-- nobody was told). GREEN after: the owner has all three notices, the link opens the run, a second failure signal
-- does not announce it twice (F2), and a test run is never announced (F3).
-- pg_net never posts inside this rolled-back transaction; its answers are written into net._http_response by hand.

\set ON_ERROR_STOP on
\timing off
\set suite 'atfixh_a_a_late_delivery_failure_tells_the_owner_red_green.sql'
\set requires 'function:custom._automation_step'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local lock_timeout = '10s';
set local statement_timeout = '120s';

\i scripts/campaign-tests/_defects_jobs_fixture.sql

do $t$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_org uuid; v_jobs uuid; v_auto uuid; e jsonb; v_run uuid; v_run2 uuid; v_n integer; v_link text;
begin
  select dj.v into v_org from dj where k = 'org';
  select dj.v into v_jobs from dj where k = 'jobs';
  perform set_config('role', 'authenticated', true);
  v_auto := (custom.automation_declare(v_org, v_jobs, jsonb_build_object('name', 'Tell the webhook', 'enabled', true,
              'trigger', jsonb_build_object('on', 'row_added'),
              'actions', jsonb_build_array(jsonb_build_object('do', 'webhook', 'url', 'https://example.com/atfixh-a'))), null) ->> 'automation_id')::uuid;
  perform set_config('role', 'postgres', true);

  -- the run: the webhook step queued, the run finished ("ran"), trigger is a real one
  e := custom._automation_step(v_org, v_jobs, null, jsonb_build_object('id', v_auto, 'spec', jsonb_build_object('name', 'Tell the webhook')),
         '{}'::jsonb, '{}'::jsonb, null, '{"on": "row_added"}'::jsonb, 1, '{"do": "webhook", "url": "https://example.com/atfixh-a"}'::jsonb);
  insert into custom.record (organization_id, table_id, data_class, data)
  values (v_org, null, 'automation_run', jsonb_build_object('automation_id', v_auto, 'table_id', v_jobs, 'status', 'ran',
            'says', 'Every step finished.', 'trigger', '{"on": "row_added"}'::jsonb, 'steps', jsonb_build_array(e)))
  returning id into v_run;
  -- the address refuses: pg_net's own error row
  insert into net._http_response (id, status_code, content, timed_out, error_msg, created)
  values ((e ->> 'request_id')::bigint, null, null, false, 'Couldn''t resolve host name', now());

  if (select data ->> 'status' from custom.record where id = v_run) <> 'failed' then
    raise exception 'F0: the refused delivery did not fail the run (%)', (select data from custom.record where id = v_run);
  end if;
  select count(*), max(n.deep_link) into v_n, v_link from communication.notification n
   where n.dedupe_key like 'automation-failed:' || v_run::text || ':%' and n.recipient_user_id = c_admin;
  if v_n <> 3 then
    raise exception 'F1 RED: the run failed on a refused webhook and its owner got % of the 3 notices (in-app, DM, email)', v_n;
  end if;
  if v_link is null or v_link not like '/data/' || v_jobs::text || '?automation=' || v_auto::text || '&run=' || v_run::text || '%' then
    raise exception 'F1: the notice link does not open the run: %', v_link;
  end if;
  raise notice 'F1 PASS - 3 notices to the owner, link %', v_link;

  -- F2 a second failure signal for the same run does not announce it twice
  perform custom._automation_failed_run_notice(v_run);
  select count(*) into v_n from communication.notification n where n.dedupe_key like 'automation-failed:' || v_run::text || ':%';
  if v_n <> 3 then raise exception 'F2: announcing the same failed run again made % notices', v_n; end if;
  raise notice 'F2 PASS - one announcement per run';

  -- F3 a test run is never announced
  e := custom._automation_step(v_org, v_jobs, null, jsonb_build_object('id', v_auto, 'spec', jsonb_build_object('name', 'Tell the webhook')),
         '{}'::jsonb, '{}'::jsonb, null, '{"on": "test"}'::jsonb, 1, '{"do": "webhook", "url": "https://example.com/atfixh-a3"}'::jsonb);
  insert into custom.record (organization_id, table_id, data_class, data)
  values (v_org, null, 'automation_run', jsonb_build_object('automation_id', v_auto, 'table_id', v_jobs, 'status', 'ran',
            'says', 'Every step finished.', 'trigger', '{"on": "test"}'::jsonb, 'steps', jsonb_build_array(e)))
  returning id into v_run2;
  insert into net._http_response (id, status_code, content, timed_out, error_msg, created)
  values ((e ->> 'request_id')::bigint, null, null, false, 'Couldn''t resolve host name', now());
  select count(*) into v_n from communication.notification n where n.dedupe_key like 'automation-failed:' || v_run2::text || ':%';
  if v_n <> 0 then raise exception 'F3: a failed TEST run announced itself (% notices)', v_n; end if;
  raise notice 'F3 PASS - a test run stays quiet';
end
$t$;

do $t$ begin
  raise notice 'GREEN F1-F3: a webhook that refuses fails the run and tells its owner (in-app, DM, email, link to the run) once; a test run stays quiet.';
end
$t$;

rollback;
