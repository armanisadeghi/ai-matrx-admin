-- LANE DEFECTS 7 - A COLUMN DECLARED `unique: true` REFUSES A DUPLICATE.
--
-- THE USE CASE. Ridgeback's owner adds an "Invoice #" column through fieldDeclare and says it is unique. A second
-- job with the same invoice number must be refused in the store's sentence, exactly as a column declared through
-- declareTable (which sends rules: [{kind: unique}]) is.
--
-- RED before 20261017014000_defects_f_unique_true_is_the_unique_rule.sql: U1 fails (the duplicate is saved).
-- Everything is synthesized in a throwaway organization and rolled back.

\set ON_ERROR_STOP on
\timing off
\set suite 'defects_f_unique_true_is_enforced_red_green.sql'
\set requires 'function:custom.field_declare|function:custom._field_document_for'
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
  v_org uuid; v_jobs uuid; v_msg text; v_rules jsonb;
begin
  select dj.v into v_org from dj where k = 'org';
  select dj.v into v_jobs from dj where k = 'jobs';
  perform set_config('role', 'authenticated', true);
  perform custom.field_declare(v_org, v_jobs, '{"key": "inv", "label": "Invoice #", "type": "text", "unique": true}'::jsonb);
  perform custom.record_write(v_org, v_jobs, '{"wo": "WO-1", "inv": "INV-9"}'::jsonb);
  begin
    perform custom.record_write(v_org, v_jobs, '{"wo": "WO-2", "inv": "INV-9"}'::jsonb);
    v_msg := null;
  exception when unique_violation then v_msg := sqlerrm;
  end;
  if v_msg is null then raise exception 'U1 RED: a column declared unique: true took a second INV-9'; end if;
  raise notice 'U1 PASS - %', v_msg;
  -- U2 saying it both ways keeps ONE rule
  perform custom.field_declare(v_org, v_jobs, '{"key": "inv2", "label": "Invoice 2", "type": "text", "unique": true, "rules": [{"kind": "unique"}]}'::jsonb);
  perform set_config('role', 'postgres', true);
  select f.data -> 'rules' into v_rules from custom.record f where f.organization_id = v_org and f.table_id = custom.field_kernel_id()
     and f.data ->> 'entity_definition_id' = v_jobs::text and f.data ->> 'key' = 'inv2';
  if jsonb_array_length(v_rules) <> 1 then raise exception 'U2: unique said twice gave rules %', v_rules; end if;
  raise notice 'GREEN U1-U2: unique: true refuses a duplicate by name; said twice it is one rule.';
end
$t$;

rollback;
