-- LANE DEFECTS 3 - A SLACK OR WEBHOOK STEP SAYS WHAT REALLY HAPPENED TO THE DELIVERY.
--
-- THE USE CASE. Ridgeback's owner adds "post to our webhook" to an automation and mistypes the address. The
-- run must never say "Sent" because the request was queued: it says Queued, then Failed with the answer
-- (here a 404), and the run fails; a good address ends as Sent with its 200.
--
-- RED before 20261017012000_defects_c_slack_and_webhook_steps_say_the_real_delivery.sql: D1 fails (the step
-- says "Sent the webhook." with no request id). pg_net never posts inside this rolled-back transaction; its
-- answers are written into net._http_response by hand, exactly as its worker writes them.
--
-- D2/D3 RED before 20261017015000_defects_g_a_delivery_settles_when_pg_net_answers.sql (nothing settles without the
-- one-minute schedule that file removes); D4: a settle that breaks never fails pg_net's insert and is recorded.

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
  -- (follow-up 20261017015000: pg_net's own answer row settles the step; nothing is called, no schedule runs)

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
end
$t$;

-- D5/D6 (review B1): an answer that never lands settles as Failed with no schedule - when the next delivery is queued
-- (D5) and when the automation's runs are read (D6). RED before 20261017018000_defects_j_a_lost_delivery_answer_settles_without_a_schedule.sql.
do $t$
declare
  v_org uuid; v_jobs uuid; e jsonb; v_run uuid; d jsonb; v_auto uuid; v_wo uuid;
begin
  select dj.v into v_org from dj where k = 'org';
  select dj.v into v_jobs from dj where k = 'jobs';
  -- D5
  e := custom._automation_step(v_org, v_jobs, null, '{"id": "defects-c-d5", "spec": {"name": "x"}}'::jsonb, '{}'::jsonb, '{}'::jsonb, null,
         '{"on": "test"}'::jsonb, 1, '{"do": "webhook", "url": "https://example.com/defects-c-d5"}'::jsonb);
  insert into custom.record (organization_id, table_id, data_class, data)
  values (v_org, null, 'automation_run', jsonb_build_object('status', 'ran', 'says', 'Every step finished.', 'steps', jsonb_build_array(e)))
  returning id into v_run;
  update custom.automation_delivery set created_at = now() - interval '11 minutes' where request_id = (e ->> 'request_id')::bigint;
  perform custom._automation_step(v_org, v_jobs, null, '{"id": "defects-c-d5b", "spec": {"name": "x"}}'::jsonb, '{}'::jsonb, '{}'::jsonb, null,
         '{"on": "test"}'::jsonb, 1, '{"do": "webhook", "url": "https://example.com/defects-c-d5b"}'::jsonb);
  select data into d from custom.record where id = v_run;
  if d -> 'steps' -> 0 ->> 'status' <> 'failed' or d -> 'steps' -> 0 ->> 'says' not like '%never answered%' then
    raise exception 'D5 RED: a delivery with no answer for 11 minutes still says % after the next one was queued', d -> 'steps' -> 0 ->> 'says';
  end if;
  raise notice 'D5 PASS - %', d -> 'steps' -> 0 ->> 'says';
  -- D6
  select f.id into v_wo from custom.record f where f.organization_id = v_org and f.table_id = custom.field_kernel_id()
     and f.data ->> 'entity_definition_id' = v_jobs::text and f.data ->> 'key' = 'wo' and f.deleted_at is null;
  perform set_config('role', 'authenticated', true);
  v_auto := (custom.automation_declare(v_org, v_jobs, jsonb_build_object('name', 'Tell the webhook', 'enabled', true,
              'trigger', jsonb_build_object('on', 'row_added'),
              'actions', jsonb_build_array(jsonb_build_object('do', 'webhook', 'url', 'https://example.com/defects-c-d6'))), null) ->> 'automation_id')::uuid;
  perform set_config('role', 'postgres', true);
  e := custom._automation_step(v_org, v_jobs, null, jsonb_build_object('id', v_auto, 'spec', jsonb_build_object('name', 'Tell the webhook')),
         '{}'::jsonb, '{}'::jsonb, null, '{"on": "test"}'::jsonb, 1, '{"do": "webhook", "url": "https://example.com/defects-c-d6"}'::jsonb);
  insert into custom.record (organization_id, table_id, data_class, data)
  values (v_org, null, 'automation_run', jsonb_build_object('automation_id', v_auto, 'status', 'ran', 'says', 'Every step finished.', 'steps', jsonb_build_array(e)))
  returning id into v_run;
  update custom.automation_delivery set created_at = now() - interval '11 minutes' where request_id = (e ->> 'request_id')::bigint;
  perform set_config('role', 'authenticated', true);
  d := custom.automation_runs(v_auto, 50, null, v_org);
  perform set_config('role', 'postgres', true);
  if d -> 'runs' -> 0 -> 'steps' -> 0 ->> 'status' <> 'failed' then
    raise exception 'D6 RED: reading the runs showed a delivery 11 minutes without an answer as %', d -> 'runs' -> 0 -> 'steps' -> 0 ->> 'says';
  end if;
  raise notice 'D6 PASS - the runs read says: %', d -> 'runs' -> 0 -> 'steps' -> 0 ->> 'says';
end
$t$;

-- D4 (runs LAST: it plants a broken settle for the rest of this transaction): a settle that breaks is recorded in ops.system_error and pg_net's own insert still lands.
create or replace function custom._automation_delivery_settle(p_request_id bigint) returns boolean
  language plpgsql as $f$ begin raise exception 'defects-d4 planted break'; end $f$;
do $t$
declare v_org uuid; v_jobs uuid; e jsonb; v_n int;
begin
  select dj.v into v_org from dj where k = 'org';
  select dj.v into v_jobs from dj where k = 'jobs';
  e := custom._automation_step(v_org, v_jobs, null, '{"id": "defects-c-auto", "spec": {"name": "x"}}'::jsonb, '{}'::jsonb, '{}'::jsonb, null,
         '{"on": "test"}'::jsonb, 1, '{"do": "webhook", "url": "https://example.com/defects-c-d4"}'::jsonb);
  insert into net._http_response (id, status_code, content, timed_out, error_msg, created)
  values ((e ->> 'request_id')::bigint, 500, 'x', false, null, now());
  select count(*) into v_n from ops.system_error
   where kind = 'automation_delivery_settle_failed' and context ->> 'request_id' = e ->> 'request_id' and error_text like '%defects-d4 planted break%';
  if v_n <> 1 then raise exception 'D4: a broken settle was not recorded (% rows)', v_n; end if;
  raise notice 'D4 PASS - the broken settle was recorded and pg_net''s insert landed';
end
$t$;

do $t$ begin
  raise notice 'GREEN D1-D6: queued says queued; pg_net''s answer settles it (404 fails the run by name, 200 says Sent); no answer in 10 minutes fails it when the next delivery is queued or the runs are read; a broken settle is recorded, never fails pg_net.';
end
$t$;

rollback;
