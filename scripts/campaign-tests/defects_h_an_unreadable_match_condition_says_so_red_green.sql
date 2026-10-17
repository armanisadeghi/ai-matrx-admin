-- LANE DEFECTS 4 follow-up - "WHEN A RECORD MATCHES" WITH A CONDITION THE STORE CANNOT WORK OUT SAYS SO.
--
-- THE USE CASE. Ridgeback's owner writes "when a job matches Work order # > 3" (words compared as a number). Every
-- edit must still save, and the automation must say why it did not run - never stay quiet.
--
-- RED before 20261017016000_defects_h_an_unreadable_match_condition_says_so.sql: H1 finds no failed run.
-- Everything is synthesized in a throwaway organization and rolled back.

\set ON_ERROR_STOP on
\timing off
\set suite 'defects_h_an_unreadable_match_condition_says_so_red_green.sql'
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
  v_org uuid; v_jobs uuid; v_wo uuid; v_job uuid; v_says text; v_saved text;
begin
  select dj.v into v_org from dj where k = 'org';
  select dj.v into v_jobs from dj where k = 'jobs';
  select f.id into v_wo from custom.record f where f.organization_id = v_org and f.table_id = custom.field_kernel_id()
     and f.data ->> 'entity_definition_id' = v_jobs::text and f.data ->> 'key' = 'wo' and f.deleted_at is null;
  perform set_config('role', 'authenticated', true);
  perform custom.automation_declare(v_org, v_jobs, jsonb_build_object(
    'name', 'Big work orders', 'enabled', true, 'trigger', jsonb_build_object('on', 'record_matches'),
    'condition', jsonb_build_object('op', 'gt', 'args', jsonb_build_array(jsonb_build_object('field', v_wo), '{"const": 3}'::jsonb)),
    'actions', jsonb_build_array(jsonb_build_object('do', 'add_row', 'table_id', v_jobs,
                 'values', jsonb_build_object(v_wo, 'LOG')))), null);
  v_job := custom.record_write(v_org, v_jobs, '{"wo": "WO-7", "status": "waiting"}'::jsonb);
  perform custom.record_update(v_org, v_job, '{"status": "done"}'::jsonb, null);
  perform set_config('role', 'postgres', true);
  select data ->> 'status' into v_saved from custom.record where id = v_job;
  if v_saved is distinct from 'done' then raise exception 'H0: the edit that fired the automation did not save (%)', v_saved; end if;
  select data ->> 'says' into v_says from custom.record
   where organization_id = v_org and data_class = 'automation_run' and data ->> 'automation' = 'Big work orders'
     and data ->> 'status' = 'failed' order by created_at desc limit 1;
  if v_says is null or v_says not like 'The condition could not be worked out%' then
    raise exception 'H1 RED: an unreadable record_matches condition left no failed run (says %)', v_says;
  end if;
  raise notice 'GREEN H0-H1: the edit saved; the automation says: %', v_says;
end
$t$;

rollback;
