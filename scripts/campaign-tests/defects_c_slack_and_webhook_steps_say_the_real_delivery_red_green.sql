-- LANE DEFECTS 3 - A SLACK OR WEBHOOK STEP SAYS WHAT REALLY HAPPENED TO THE DELIVERY.
--
-- THE USE CASE. Ridgeback's owner adds "post to our webhook" to an automation and mistypes the address. The
-- run must never say "Sent" because the request was queued: it says Queued, then Failed with the answer
-- (here a 404), and the run fails; a good address ends as Sent with its 200.
--
-- RED before 20261017012000_defects_c_slack_and_webhook_steps_say_the_real_delivery.sql: D1 fails (the step
-- says "Sent the webhook." with no request id). pg_net never posts inside this rolled-back transaction; its
-- answers are written into net._http_response by hand, exactly as its worker writes them.

\set ON_ERROR_STOP on
\timing off
\set suite 'defects_c_slack_and_webhook_steps_say_the_real_delivery_red_green.sql'
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
  v_org uuid; v_jobs uuid; e1 jsonb; e2 jsonb; v_run1 uuid; v_run2 uuid; d jsonb;
  c_auto constant jsonb := '{"id": "defects-c-auto", "spec": {"name": "Tell the webhook"}}';
begin
  select dj.v into v_org from dj where k = 'org';
  select dj.v into v_jobs from dj where k = 'jobs';
  e1 := custom._automation_step(v_org, v_jobs, null, c_auto, '{}'::jsonb, '{}'::jsonb, null, '{"on": "test"}'::jsonb, 1,
          '{"do": "webhook", "url": "https://example.com/defects-c-wrong-path"}'::jsonb);
  e2 := custom._automation_step(v_org, v_jobs, null, c_auto, '{}'::jsonb, '{}'::jsonb, null, '{"on": "test"}'::jsonb, 1,
          '{"do": "webhook", "url": "https://example.com/defects-c-good"}'::jsonb);

  -- D1 queued is not sent
  if e1 ->> 'says' ilike 'sent%' or (e1 ->> 'request_id') is null or e1 ->> 'delivery' is distinct from 'queued' then
    raise exception 'D1 RED: a webhook step that was only queued said: % (entry %)', e1 ->> 'says', e1;
  end if;
  raise notice 'D1 PASS - %', e1 ->> 'says';

  insert into custom.record (organization_id, table_id, data_class, data)
  values (v_org, null, 'automation_run', jsonb_build_object('status', 'ran', 'says', 'Every step finished.', 'steps', jsonb_build_array(e1)))
  returning id into v_run1;
  insert into custom.record (organization_id, table_id, data_class, data)
  values (v_org, null, 'automation_run', jsonb_build_object('status', 'ran', 'says', 'Every step finished.', 'steps', jsonb_build_array(e2)))
  returning id into v_run2;
  insert into net._http_response (id, status_code, content, timed_out, error_msg, created)
  values ((e1 ->> 'request_id')::bigint, 404, 'not found', false, null, now()),
         ((e2 ->> 'request_id')::bigint, 200, 'ok', false, null, now());
  perform custom.automation_delivery_tick();

  -- D2 the wrong address fails the step and the run, naming the answer
  select data into d from custom.record where id = v_run1;
  if d -> 'steps' -> 0 ->> 'status' <> 'failed' or d -> 'steps' -> 0 ->> 'says' not like '%404%' or d ->> 'status' <> 'failed' then
    raise exception 'D2: a 404 delivery left the run as %', d;
  end if;
  raise notice 'D2 PASS - % / %', d -> 'steps' -> 0 ->> 'says', d ->> 'says';
  -- D3 the good address is Sent with its 200
  select data into d from custom.record where id = v_run2;
  if d -> 'steps' -> 0 ->> 'delivery' <> 'sent' or d -> 'steps' -> 0 ->> 'says' not like '%200%' or d ->> 'status' <> 'ran' then
    raise exception 'D3: a 200 delivery left the run as %', d;
  end if;
  raise notice 'GREEN D1-D3: queued says queued; a 404 fails the run by name; a 200 says Sent. (%)', d -> 'steps' -> 0 ->> 'says';
end
$t$;

rollback;
