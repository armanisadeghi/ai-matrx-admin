-- LANE DEFECTS 1 - "BRING IT BACK" ON A RECORD WHOSE UNIQUE VALUE WAS TAKEN SAYS WHY, IN THE STORE'S WORDS.
--
-- THE USE CASE. A dispatcher archives job WO-1 by mistake, a colleague files a new job under WO-1, then the
-- dispatcher presses "Bring it back". The store must refuse in its plain sentence ("Another record here
-- already has Work order # ..."), never "operator does not exist: jsonb ->> uuid".
--
-- RED before 20261017010000_defects_a_held_record_restore_says_why_not_jsonb_uuid.sql: H1 fails with
-- undefined_function. Everything is synthesized in a throwaway organization and rolled back.

\set ON_ERROR_STOP on
\timing off
\set suite 'defects_a_held_record_restore_says_why_red_green.sql'
\set requires 'function:custom._restore_guard_one|function:custom.record_restore'
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
  v_org uuid; v_table uuid; v_a uuid; v_b uuid; v_msg text; v_state text;
begin
  select v into v_org from dj where k = 'org';
  select v into v_table from dj where k = 'jobs';
  perform set_config('role', 'authenticated', true);
  v_a := custom.record_write(v_org, v_table, '{"wo": "WO-1"}'::jsonb);
  perform custom.record_delete(v_org, v_a);
  v_b := custom.record_write(v_org, v_table, '{"wo": "WO-1"}'::jsonb);

  -- H1: the restore is refused with the store's sentence
  begin
    perform custom.record_restore(v_org, v_a);
    raise exception 'H1: WO-1 came back although another live job holds WO-1';
  exception when others then
    get stacked diagnostics v_msg = message_text, v_state = returned_sqlstate;
  end;
  if v_state <> '23505' or v_msg not like 'Another record here already has Work order # "WO-1"%' then
    raise exception 'H1 RED: the held restore said [%] %', v_state, v_msg;
  end if;
  raise notice 'H1 PASS - refused in the store''s words: %', v_msg;

  -- H2: once the other job moves off WO-1, the restore brings it back
  perform custom.record_update(v_org, v_b, '{"wo": "WO-2"}'::jsonb, null);
  perform custom.record_restore(v_org, v_a);
  raise notice 'GREEN H1-H2: a held restore names the taken value; freed, it comes back.';
end
$t$;

rollback;
