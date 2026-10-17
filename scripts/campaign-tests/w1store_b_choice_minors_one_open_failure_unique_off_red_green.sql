-- LANE W1-STORE 4 - the review minors of the record store. Plain SQL, one short transaction, rolled back.
--
-- THE USE CASE. Ridgeback's dispatcher (a) finds jobs whose multi-select Tags is "Urgent" by the words she sees,
-- (b) has a Status whose labels were swapped (key "waiting" now reads "Done", key "done" reads "Waiting") and still
-- finds a job by typing a KEY, (c) wrote a bad "when a job matches" condition and must not get a failed run per edit,
-- (d) made a unique column not-unique again.
--
-- RED before 20261018020000 / 030000 / 040000: M1 (multi-select by label matches nothing), K1 (a key answered by
-- another option's label), F1 (one failed run per edit), U1 (the unique rule survives unique:false).
\set ON_ERROR_STOP on
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

\i scripts/campaign-tests/_defects_jobs_fixture.sql

do $t$
declare
  v_org uuid; v_jobs uuid; v_tags uuid; v_sw uuid; v_wo uuid; v_job uuid; v jsonb; v_n integer; v_rules jsonb; v_msg text;
  v_a uuid;
begin
  select dj.v into v_org from dj where k = 'org';
  select dj.v into v_jobs from dj where k = 'jobs';
  perform set_config('role', 'authenticated', true);
  perform custom.field_declare(v_org, v_jobs, '{"key": "tags", "label": "Tags", "type": "select", "multi": true, "options": ["Urgent", "Later"]}'::jsonb);
  perform custom.field_declare(v_org, v_jobs, '{"key": "sw", "label": "Swapped", "type": "select", "options": ["Waiting", "Done"]}'::jsonb);
  perform set_config('role', 'postgres', true);
  -- swap the two labels (the keys stay): key "waiting" now reads "Done", key "done" reads "Waiting"
  update custom.record o set data = jsonb_set(o.data, '{title}', to_jsonb(case o.data ->> 'title' when 'Waiting' then 'Done' else 'Waiting' end))
   where o.organization_id = v_org and o.table_id = (select (f.data #>> '{config,options_table_id}')::uuid from custom.record f
          where f.organization_id = v_org and f.table_id = custom.field_kernel_id() and f.data ->> 'entity_definition_id' = v_jobs::text and f.data ->> 'key' = 'sw');
  select f.id into v_tags from custom.record f where f.organization_id = v_org and f.table_id = custom.field_kernel_id()
     and f.data ->> 'entity_definition_id' = v_jobs::text and f.data ->> 'key' = 'tags' and f.deleted_at is null;
  select f.id into v_sw from custom.record f where f.organization_id = v_org and f.table_id = custom.field_kernel_id()
     and f.data ->> 'entity_definition_id' = v_jobs::text and f.data ->> 'key' = 'sw' and f.deleted_at is null;
  select f.id into v_wo from custom.record f where f.organization_id = v_org and f.table_id = custom.field_kernel_id()
     and f.data ->> 'entity_definition_id' = v_jobs::text and f.data ->> 'key' = 'wo' and f.deleted_at is null;

  -- M1 a multi-select holding exactly Urgent equals "Urgent" (label) and "urgent" (key); not "Later"; ne agrees
  v := custom.rule_eval(v_org, jsonb_build_object('op', 'eq', 'args', jsonb_build_array(jsonb_build_object('field', v_tags), '{"const": "Urgent"}'::jsonb)), '{"tags": ["urgent"]}'::jsonb, '{}'::jsonb);
  if v is distinct from 'true'::jsonb then raise exception 'M1 RED: Tags = "Urgent" answered % on an urgent job', v; end if;
  v := custom.rule_eval(v_org, jsonb_build_object('op', 'eq', 'args', jsonb_build_array(jsonb_build_object('field', v_tags), '{"const": "urgent"}'::jsonb)), '{"tags": ["urgent"]}'::jsonb, '{}'::jsonb);
  if v is distinct from 'true'::jsonb then raise exception 'M1 RED: Tags = "urgent" (key) answered %', v; end if;
  v := custom.rule_eval(v_org, jsonb_build_object('op', 'eq', 'args', jsonb_build_array(jsonb_build_object('field', v_tags), '{"const": "Later"}'::jsonb)), '{"tags": ["urgent"]}'::jsonb, '{}'::jsonb);
  if v is distinct from 'false'::jsonb then raise exception 'M2: Tags = "Later" answered % on an urgent job', v; end if;
  v := custom.rule_eval(v_org, jsonb_build_object('op', 'ne', 'args', jsonb_build_array(jsonb_build_object('field', v_tags), '{"const": "Urgent"}'::jsonb)), '{"tags": ["urgent"]}'::jsonb, '{}'::jsonb);
  if v is distinct from 'false'::jsonb then raise exception 'M3: Tags <> "Urgent" answered %', v; end if;
  v := custom.rule_eval(v_org, jsonb_build_object('op', 'eq', 'args', jsonb_build_array(jsonb_build_object('field', v_tags), '{"const": "Urgent"}'::jsonb)), '{"tags": ["urgent", "later"]}'::jsonb, '{}'::jsonb);
  if v is distinct from 'false'::jsonb then raise exception 'M4: two options equalled one word (%)', v; end if;
  raise notice 'M1-M4 PASS - multi-select by label and key';

  -- K1 the stored key "waiting" is labelled "Done"; typing the KEY "done" must NOT match it (the key names the other option)
  v := custom.rule_eval(v_org, jsonb_build_object('op', 'eq', 'args', jsonb_build_array(jsonb_build_object('field', v_sw), '{"const": "done"}'::jsonb)), '{"sw": "waiting"}'::jsonb, '{}'::jsonb);
  if v is distinct from 'false'::jsonb then raise exception 'K1 RED: key "done" matched the row stored "waiting" because its label reads Done (%)', v; end if;
  v := custom.rule_eval(v_org, jsonb_build_object('op', 'eq', 'args', jsonb_build_array(jsonb_build_object('field', v_sw), '{"const": "waiting"}'::jsonb)), '{"sw": "waiting"}'::jsonb, '{}'::jsonb);
  if v is distinct from 'true'::jsonb then raise exception 'K2: key "waiting" no longer finds its own row (%)', v; end if;
  v := custom.rule_eval(v_org, jsonb_build_object('op', 'eq', 'args', jsonb_build_array(jsonb_build_object('field', v_sw), '{"const": "Done"}'::jsonb)), '{"sw": "waiting"}'::jsonb, '{}'::jsonb);
  if v is distinct from 'true'::jsonb then raise exception 'K3: label "Done" no longer finds the row stored waiting (%)', v; end if;
  raise notice 'K1-K3 PASS - the key is decided first, then the label';

  -- F1 a bad record_matches condition writes ONE failed run however many edits follow
  perform set_config('role', 'authenticated', true);
  perform custom.automation_declare(v_org, v_jobs, jsonb_build_object(
    'name', 'Big work orders', 'enabled', true, 'trigger', jsonb_build_object('on', 'record_matches'),
    'condition', jsonb_build_object('op', 'gt', 'args', jsonb_build_array(jsonb_build_object('field', v_wo), '{"const": 3}'::jsonb)),
    'actions', jsonb_build_array(jsonb_build_object('do', 'add_row', 'table_id', v_jobs, 'values', jsonb_build_object(v_wo, 'LOG')))), null);
  v_job := custom.record_write(v_org, v_jobs, '{"wo": "WO-7", "status": "waiting"}'::jsonb);
  perform custom.record_update(v_org, v_job, '{"status": "done"}'::jsonb, null);
  perform custom.record_update(v_org, v_job, '{"status": "waiting"}'::jsonb, null);
  perform custom.record_update(v_org, v_job, '{"status": "done"}'::jsonb, null);
  perform set_config('role', 'postgres', true);
  select count(*) into v_n from custom.record where organization_id = v_org and data_class = 'automation_run'
     and data ->> 'automation' = 'Big work orders' and data ->> 'status' = 'failed';
  if v_n <> 1 then raise exception 'F1 RED: % failed runs for three edits of one bad condition (want 1)', v_n; end if;
  raise notice 'F1 PASS - one failed run for three edits';

  -- U1 unique:false takes the rule off (and the column then takes a duplicate)
  perform set_config('role', 'authenticated', true);
  perform custom.field_declare(v_org, v_jobs, '{"key": "inv", "label": "Invoice #", "type": "text", "unique": true}'::jsonb);
  perform set_config('role', 'postgres', true);
  select f.id into v_a from custom.record f where f.organization_id = v_org and f.table_id = custom.field_kernel_id()
     and f.data ->> 'entity_definition_id' = v_jobs::text and f.data ->> 'key' = 'inv';
  perform set_config('role', 'authenticated', true);
  perform custom.field_update(v_org, v_a, '{"unique": false}'::jsonb);
  perform set_config('role', 'postgres', true);
  select f.data -> 'rules' into v_rules from custom.record f where f.id = v_a and f.organization_id = v_org;
  if coalesce(v_rules, '[]'::jsonb) @> '[{"kind": "unique"}]'::jsonb then raise exception 'U1 RED: unique:false left the rule %', v_rules; end if;
  perform set_config('role', 'authenticated', true);
  perform custom.record_write(v_org, v_jobs, '{"wo": "WO-20", "inv": "I-1"}'::jsonb);
  perform custom.record_write(v_org, v_jobs, '{"wo": "WO-21", "inv": "I-1"}'::jsonb);
  raise notice 'GREEN M1-M4 K1-K3 F1 U1: choice minors, one open failure, unique:false';
end
$t$;
rollback;
