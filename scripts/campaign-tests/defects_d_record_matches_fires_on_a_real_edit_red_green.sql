-- LANE DEFECTS 4 - "WHEN A RECORD MATCHES" FIRES ON A REAL EDIT, WITH THE CONDITION WRITTEN IN A PERSON'S WORDS.
--
-- THE USE CASE. Ridgeback's owner builds "when a job matches Status = Done, log it". A dispatcher moves a job
-- from Waiting to Done. The automation must run on that edit (it used to run only from Test, because the
-- condition said "Done" and the store keeps the key "done", so the row never came to match).
--
-- RED before 20261017011000_defects_b_a_choice_is_found_by_its_label_or_key.sql: M1 fails (no run).
-- Everything is synthesized in a throwaway organization and rolled back.

\set ON_ERROR_STOP on
\timing off
\set suite 'defects_d_record_matches_fires_on_a_real_edit_red_green.sql'
\set requires 'function:custom.automation_declare|function:custom._automation_fire'
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
  v_org uuid; v_jobs uuid; v_status uuid; v_wo uuid; v_job uuid; v_runs int; v_all int;
begin
  select dj.v into v_org from dj where k = 'org';
  select dj.v into v_jobs from dj where k = 'jobs';
  select f.id into v_status from custom.record f where f.organization_id = v_org and f.table_id = custom.field_kernel_id()
     and f.data ->> 'entity_definition_id' = v_jobs::text and f.data ->> 'key' = 'status' and f.deleted_at is null;
  select f.id into v_wo from custom.record f where f.organization_id = v_org and f.table_id = custom.field_kernel_id()
     and f.data ->> 'entity_definition_id' = v_jobs::text and f.data ->> 'key' = 'wo' and f.deleted_at is null;
  perform set_config('role', 'authenticated', true);
  perform custom.automation_declare(v_org, v_jobs, jsonb_build_object(
    'name', 'Log finished jobs', 'enabled', true, 'trigger', jsonb_build_object('on', 'record_matches'),
    'condition', jsonb_build_object('op', 'eq', 'args', jsonb_build_array(jsonb_build_object('field', v_status), '{"const": "Done"}'::jsonb)),
    'actions', jsonb_build_array(jsonb_build_object('do', 'add_row', 'table_id', v_jobs,
                 'values', jsonb_build_object(v_wo, 'LOG-{{trigger.' || v_wo || '}}'))) ), null);
  v_job := custom.record_write(v_org, v_jobs, '{"wo": "WO-7", "status": "waiting"}'::jsonb);
  perform custom.record_update(v_org, v_job, '{"status": "done"}'::jsonb, null);
  perform set_config('role', 'postgres', true);
  select count(*) into v_runs from custom.record
   where organization_id = v_org and data_class = 'automation_run' and data ->> 'automation' = 'Log finished jobs';
  select count(*) into v_all from custom.record
   where organization_id = v_org and table_id = v_jobs and data_class = 'record' and data ->> 'wo' like 'LOG-%';
  if v_runs <> 1 or v_all <> 1 then
    raise exception 'M1 RED: moving a job Waiting -> Done ran "Log finished jobs" % time(s) and logged % row(s) (want 1 and 1)', v_runs, v_all;
  end if;
  -- M2 staying Done does not fire again
  perform set_config('role', 'authenticated', true);
  perform custom.record_update(v_org, v_job, '{"a": 3}'::jsonb, null);
  perform set_config('role', 'postgres', true);
  select count(*) into v_runs from custom.record
   where organization_id = v_org and data_class = 'automation_run' and data ->> 'automation' = 'Log finished jobs';
  if v_runs <> 1 then raise exception 'M2: an edit that kept the job Done fired again (% runs)', v_runs; end if;
  raise notice 'GREEN M1-M2: a real edit into Done fires once; staying Done does not fire again.';
end
$t$;

rollback;
