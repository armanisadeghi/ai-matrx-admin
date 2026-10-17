-- LANE DEFECTS 2 - A CHOICE IS FOUND BY THE WORDS A PERSON SEES AS WELL AS BY ITS KEY.
--
-- THE USE CASE. Ridgeback's dispatcher builds an automation: "find Jobs where Status is Waiting". The store
-- keeps the option's key ("waiting"); the dispatcher typed the label. It must find the waiting jobs, never
-- 0 records in silence. Not-equal must agree, and a plain text column keeps comparing as stored.
--
-- RED before 20261017011000_defects_b_a_choice_is_found_by_its_label_or_key.sql: C1 fails (label matches
-- nothing). Everything is synthesized in a throwaway organization and rolled back.

\set ON_ERROR_STOP on
\timing off
\set suite 'defects_b_a_choice_is_found_by_its_label_or_key_red_green.sql'
\set requires 'function:custom.rule_eval'
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
  v_org uuid; v_jobs uuid; v_status uuid; v_wo uuid; v_vals jsonb; v jsonb;
begin
  select dj.v into v_org from dj where k = 'org';
  select dj.v into v_jobs from dj where k = 'jobs';
  select f.id into v_status from custom.record f where f.organization_id = v_org and f.table_id = custom.field_kernel_id()
     and f.data ->> 'entity_definition_id' = v_jobs::text and f.data ->> 'key' = 'status' and f.deleted_at is null;
  select f.id into v_wo from custom.record f where f.organization_id = v_org and f.table_id = custom.field_kernel_id()
     and f.data ->> 'entity_definition_id' = v_jobs::text and f.data ->> 'key' = 'wo' and f.deleted_at is null;
  v_vals := '{"wo": "WO-1", "status": "waiting"}'::jsonb;

  -- C1 the label finds the option
  v := custom.rule_eval(v_org, jsonb_build_object('op', 'eq', 'args', jsonb_build_array(jsonb_build_object('field', v_status), '{"const": "Waiting"}'::jsonb)), v_vals, '{}'::jsonb);
  if v is distinct from 'true'::jsonb then raise exception 'C1 RED: Status = "Waiting" answered % on a waiting job', v; end if;
  -- C2 the key still finds it; another label does not
  v := custom.rule_eval(v_org, jsonb_build_object('op', 'eq', 'args', jsonb_build_array(jsonb_build_object('field', v_status), '{"const": "waiting"}'::jsonb)), v_vals, '{}'::jsonb);
  if v is distinct from 'true'::jsonb then raise exception 'C2: Status = "waiting" answered %', v; end if;
  v := custom.rule_eval(v_org, jsonb_build_object('op', 'eq', 'args', jsonb_build_array(jsonb_build_object('field', v_status), '{"const": "Done"}'::jsonb)), v_vals, '{}'::jsonb);
  if v is distinct from 'false'::jsonb then raise exception 'C2: Status = "Done" answered % on a waiting job', v; end if;
  -- C3 not-equal agrees, either side
  v := custom.rule_eval(v_org, jsonb_build_object('op', 'ne', 'args', jsonb_build_array('{"const": "WAITING"}'::jsonb, jsonb_build_object('field', v_status))), v_vals, '{}'::jsonb);
  if v is distinct from 'false'::jsonb then raise exception 'C3: "WAITING" <> Status answered % on a waiting job', v; end if;
  -- C4 a text column keeps comparing as stored
  v := custom.rule_eval(v_org, jsonb_build_object('op', 'eq', 'args', jsonb_build_array(jsonb_build_object('field', v_wo), '{"const": "wo-1"}'::jsonb)), v_vals, '{}'::jsonb);
  if v is distinct from 'false'::jsonb then raise exception 'C4: a text column became case-blind (WO-1 = wo-1 answered %)', v; end if;
  raise notice 'GREEN C1-C4: a choice is found by its label or key, ne agrees, text compares as stored.';
end
$t$;

rollback;
