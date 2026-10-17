-- LANE W1-STORE 2 - THE ERROR RECORDER NEVER REFUSES. Plain SQL, one short transaction, rolled back.
-- RED before 20261018010000_w1store_a_the_error_recorder_never_refuses.sql: R1/R2 fail (the error was stored as a
-- 'system_error_write_refused' stand-in with the real one buried in context.original).
begin;
set local lock_timeout = '5s';
set local statement_timeout = '20s';
do $t$
declare
  v_id uuid; v_row record; v_ghost uuid := gen_random_uuid(); v_dup uuid := gen_random_uuid();
begin
  -- R1 an error naming a user that does not exist is stored AS ITSELF, user nulled and noted
  v_id := ops.record_system_error(jsonb_build_object('kind', 'w1store_test', 'error_text', 'ghost user', 'user_id', v_ghost));
  select * into v_row from ops.system_error where id = v_id;
  if v_row.kind <> 'w1store_test' then raise exception 'R1 RED: stored as % instead of the error itself (%)', v_row.kind, v_row.context ->> 'refusal'; end if;
  if v_row.user_id is not null or v_row.context ->> 'unknown_user_id' is distinct from v_ghost::text then
    raise exception 'R1 RED: user % / context %', v_row.user_id, v_row.context; end if;
  raise notice 'R1 PASS - ghost user nulled and noted';
  -- R2 a coding-tool source_app (the table CHECK) and an unknown organization are nulled and noted too
  v_id := ops.record_system_error(jsonb_build_object('kind', 'w1store_test', 'error_text', 'bad refs', 'source_app', 'codex',
            'organization_id', v_ghost::text, 'occurred_in_organization_id', v_ghost::text));
  select * into v_row from ops.system_error where id = v_id;
  if v_row.kind <> 'w1store_test' or v_row.source_app is not null or v_row.context ->> 'refused_source_app' <> 'codex'
     or v_row.context ->> 'unknown_organization_id' is distinct from v_ghost::text then
    raise exception 'R2 RED: kind % source_app % context %', v_row.kind, v_row.source_app, v_row.context; end if;
  raise notice 'R2 PASS - coding-tool source and unknown organization nulled and noted';
  -- R3 a duplicate id gets a fresh id, the first kept
  perform ops.record_system_error(jsonb_build_object('kind', 'w1store_test', 'error_text', 'first', 'id', v_dup::text));
  v_id := ops.record_system_error(jsonb_build_object('kind', 'w1store_test', 'error_text', 'second', 'id', v_dup::text));
  if v_id = v_dup or (select kind from ops.system_error where id = v_id) <> 'w1store_test' then raise exception 'R3 RED: duplicate id was not replaced'; end if;
  raise notice 'R3 PASS - duplicate id replaced';
  -- R4 a good error is stored exactly as before
  v_id := ops.record_system_error(jsonb_build_object('kind', 'w1store_test', 'error_text', 'fine'));
  if (select context from ops.system_error where id = v_id) <> '{}'::jsonb then raise exception 'R4: a clean error gained context'; end if;
  raise notice 'GREEN R1-R4: the recorder never refuses';
end
$t$;
rollback;
