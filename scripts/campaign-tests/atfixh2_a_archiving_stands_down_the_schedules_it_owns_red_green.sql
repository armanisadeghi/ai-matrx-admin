-- LANE AT-FIX-H2 1 - ARCHIVING A THING SWITCHES OFF THE SCHEDULES IT OWNS, AND RESTORING BRINGS BACK ONLY THOSE.
--
-- THE USE CASE. Ridgeback's owner archives the "new order email" automation. Its connected-app check kept running
-- every few minutes until the next tick noticed. Archiving a table or a base left the schedules of what it held on.
--
-- RED before 20261019230000_atfixh2_a_archiving_stands_down_the_schedules_it_owns.sql: S1 fails (the schedule is
-- still enabled after the automation is archived). GREEN after: S1-S5 pass - an automation, a table and a base each
-- stand their schedules down, a restore brings back exactly those, and a schedule that was already off stays off.

\set ON_ERROR_STOP on
\timing off
\set suite 'atfixh2_a_archiving_stands_down_the_schedules_it_owns_red_green.sql'
\set requires 'function:custom._automation_flip'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local lock_timeout = '10s';
set local statement_timeout = '120s';

\i scripts/campaign-tests/_defects_jobs_fixture.sql

create temp table s2 (k text primary key, v uuid) on commit drop;

do $t$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_org uuid; v_jobs uuid; v_auto uuid; v_auto2 uuid; v_task uuid; v_task_off uuid; v_trg uuid; v_en boolean; v_en_t boolean; v_res jsonb;
begin
  select dj.v into v_org from dj where k = 'org';
  select dj.v into v_jobs from dj where k = 'jobs';
  perform set_config('role', 'authenticated', true);
  v_auto := (custom.automation_declare(v_org, v_jobs, jsonb_build_object('name', 'New order email', 'enabled', false,
              'trigger', jsonb_build_object('on', 'row_added'),
              'actions', jsonb_build_array(jsonb_build_object('do', 'webhook', 'url', 'https://example.com/atfixh2'))), null) ->> 'automation_id')::uuid;
  v_auto2 := (custom.automation_declare(v_org, v_jobs, jsonb_build_object('name', 'Paused one', 'enabled', false,
              'trigger', jsonb_build_object('on', 'row_added'),
              'actions', jsonb_build_array(jsonb_build_object('do', 'webhook', 'url', 'https://example.com/atfixh2b'))), null) ->> 'automation_id')::uuid;
  perform set_config('role', 'postgres', true);
  insert into s2 values ('auto', v_auto), ('auto2', v_auto2);

  -- the schedules the connected-app switch makes (same shape as aidream sync_schedule): one ON, one already OFF
  v_task := gen_random_uuid(); v_task_off := gen_random_uuid(); v_trg := gen_random_uuid();
  insert into scheduler.sch_task (id, user_id, organization_id, kind, title, enabled, next_due_at, visibility, created_by, updated_by, taxonomy_node_id, metadata)
  values (v_task, c_admin, v_org, 'tool', 'Automation check: New order email', true, now() + interval '5 minutes', 'personal', c_admin, c_admin, 'c5d29fbf-fd62-40dd-afd0-9cd96d4cca93',
          jsonb_build_object('automation_app_trigger', v_auto, 'ai_calls', false, 'born', 'switch')),
         (v_task_off, c_admin, v_org, 'tool', 'Automation check: Paused one', false, null, 'personal', c_admin, c_admin, 'c5d29fbf-fd62-40dd-afd0-9cd96d4cca93',
          jsonb_build_object('automation_app_trigger', v_auto2, 'ai_calls', false, 'born', 'switch'));
  insert into scheduler.sch_trigger (id, task_id, user_id, organization_id, type, config, enabled, next_due_at, created_by, updated_by)
  values (v_trg, v_task, c_admin, v_org, 'cron', '{"expression": "*/5 * * * *", "tz": "UTC"}', true, now() + interval '5 minutes', c_admin, c_admin);
  insert into s2 values ('task', v_task), ('task_off', v_task_off), ('trg', v_trg);

  -- S1 archive the automation: its schedule is off
  perform set_config('role', 'authenticated', true);
  perform custom.automation_archive(v_org, v_auto);
  perform custom.automation_archive(v_org, v_auto2);
  perform set_config('role', 'postgres', true);
  select enabled into v_en from scheduler.sch_task where id = v_task;
  select enabled into v_en_t from scheduler.sch_trigger where id = v_trg;
  if v_en or v_en_t then
    raise exception 'S1 RED: the automation is archived and its check schedule is still on (task %, trigger %)', v_en, v_en_t;
  end if;
  raise notice 'S1 PASS - archiving the automation switched its schedule and trigger off';

  -- S2 restore: back to its prior state (on); the one that was already off stays off
  perform set_config('role', 'authenticated', true);
  perform custom.automation_restore(v_org, v_auto);
  perform custom.automation_restore(v_org, v_auto2);
  perform set_config('role', 'postgres', true);
  select enabled into v_en from scheduler.sch_task where id = v_task;
  select enabled into v_en_t from scheduler.sch_trigger where id = v_trg;
  if not (v_en and v_en_t) then raise exception 'S2: restoring the automation did not bring its schedule back (task %, trigger %)', v_en, v_en_t; end if;
  if (select enabled from scheduler.sch_task where id = v_task_off) then raise exception 'S2: a schedule that was already off was switched on by a restore'; end if;
  if (select metadata ? 'stood_down_by_archive' from scheduler.sch_task where id = v_task) then raise exception 'S2: the stand-down marker was left behind'; end if;
  raise notice 'S2 PASS - restore brought back exactly the schedule archive had switched off';

  -- S3 archive the TABLE the automation lives on: its schedule stands down; restoring the table brings it back
  perform set_config('role', 'authenticated', true);
  for i in 1..20 loop
    v_res := custom.table_archive(v_org, v_jobs, 1000, true);
    exit when coalesce((v_res ->> 'done')::boolean, false);
  end loop;
  raise notice 'table_archive answered %', v_res;
  perform set_config('role', 'postgres', true);
  select enabled into v_en from scheduler.sch_task where id = v_task;
  if v_en then raise exception 'S3: the table is archived and the schedule of its automation is still on'; end if;
  perform set_config('role', 'authenticated', true);
  for i in 1..20 loop
    v_res := custom.table_restore(v_org, v_jobs, 1000);
    exit when coalesce((v_res ->> 'done')::boolean, false);
  end loop;
  perform set_config('role', 'postgres', true);
  select enabled into v_en from scheduler.sch_task where id = v_task;
  if not v_en then raise exception 'S3: restoring the table did not bring the schedule back'; end if;
  if (select enabled from scheduler.sch_task where id = v_task_off) then raise exception 'S3: a schedule that was off came on with the table'; end if;
  raise notice 'S3 PASS - the table archive stood the schedule down and its restore brought it back';
end
$t$;

do $t$
declare
  c_admin constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  v_org uuid; v_home uuid; v_base uuid := gen_random_uuid(); v_task uuid := gen_random_uuid();
begin
  select dj.v into v_org from dj where k = 'org';
  select dj.v into v_home from dj where k = 'home';
  insert into custom.base (id, home_id, organization_id, name, created_by) values (v_base, v_home, v_org, 'Ridgeback base', c_admin);
  insert into scheduler.sch_task (id, user_id, organization_id, kind, title, enabled, next_due_at, visibility, created_by, updated_by, taxonomy_node_id, metadata)
  values (v_task, c_admin, v_org, 'tool', 'Snapshot of Ridgeback base', true, now() + interval '1 day', 'personal', c_admin, c_admin, 'c5d29fbf-fd62-40dd-afd0-9cd96d4cca93',
          jsonb_build_object('base_snapshot', v_base, 'ai_calls', false, 'born', 'toggle'));
  update custom.base set deleted_at = now() where id = v_base;
  if (select enabled from scheduler.sch_task where id = v_task) then raise exception 'S4: the base is archived and its snapshot schedule is still on'; end if;
  update custom.base set deleted_at = null where id = v_base;
  if not (select enabled from scheduler.sch_task where id = v_task) then raise exception 'S5: restoring the base did not bring its snapshot schedule back'; end if;
  raise notice 'S4/S5 PASS - a base archive stood its snapshot schedule down and the restore brought it back';
end
$t$;

do $t$ begin
  raise notice 'GREEN S1-S5: archiving an automation, a table or a base switches off the schedules it owns; a restore brings back exactly those.';
end
$t$;

rollback;
