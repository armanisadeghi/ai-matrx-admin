-- chair-step: the DELETEs named here are function-body text (bare scratch-table clears gaining WHERE true) and a guard regex; no row is deleted by this file.
-- Archiving, moving, copying or undoing a brand (or any record through platform.change_records) no longer
-- fails with "DELETE requires a WHERE clause" (21000). Seen live 2026-10-21 on /marketing/brands.
-- pg_safeupdate is preloaded for every PostgREST session (authenticator: session_preload_libraries =
-- supautils, safeupdate) and refuses a DELETE with no WHERE — even on a scratch table, even inside a
-- SECURITY DEFINER function. The change engine clears its scratch tables with bare `delete from x;`, so
-- every call from the app failed; its scenarios ran over a direct connection, where safeupdate is not
-- loaded, and passed. Second time this class shipped (reachability_rebuild_passes_safeupdate.sql, 09-26).
--
-- Part 1: every live function body carrying a bare DELETE gets `where true` (same rows, same lock).
-- Part 2: the class is closed — a function created with a bare DELETE is refused at CREATE time.
-- based-on: campaign_watch.reachability_rebuild(integer, integer, boolean) 59c97484f19a10b6d7800c738f0177622a062c94ad97a903cc3a4bce5cac4650
-- based-on: ops.check_items_apply_run(uuid, jsonb, text, text, boolean) 48091379ec4ba079b17ca8eba89713c0ed99270ec417472f13ec90dea1b0aed0
-- based-on: platform._chg_build(text, jsonb, uuid) 080c2f23522dfe094cfc6fe816933d51823ce12c248080dec61336f0154452ad
-- based-on: platform._chg_copy(text, uuid[], uuid, boolean, text) ae2349896e2f36255add2e19aa6ecfad51fd0fea7253713f2dafced8cb640186
-- based-on: platform._chg_outside_users(regclass, uuid[], boolean) 39188ac9edd336b9b78718d22cf44451419e7a2b1461ef38372418831d5be98c
-- based-on: platform._chg_records(text, text, uuid[], uuid, uuid, jsonb, boolean, text) aea3bf74d2e796c4c046d21f561d251c22e04f3219aee8e195f46f6b292c9c07
-- based-on: platform._chg_undo(uuid, boolean, text) 13bef1cb0127741aad8fe2a5a065d169259c759872fb71407ca9e31d1c39466c
-- based-on: platform.build_lifecycle_reference_map() dd850faf8e88675b52e09c1eb09c50388ff368b27d12f509f54fcd62b0cc6533


do $$
declare
  v_sig text;
  v_def text;
  v_new text;
begin
  foreach v_sig in array array[
    'campaign_watch.reachability_rebuild(integer,integer,boolean)',
    'ops.check_items_apply_run(uuid,jsonb,text,text,boolean)',
    'platform._chg_build(text,jsonb,uuid)',
    'platform._chg_copy(text,uuid[],uuid,boolean,text)',
    'platform._chg_outside_users(regclass,uuid[],boolean)',
    'platform._chg_records(text,text,uuid[],uuid,uuid,jsonb,boolean,text)',
    'platform._chg_undo(uuid,boolean,text)',
    'platform.build_lifecycle_reference_map()'
  ] loop
    v_def := pg_catalog.pg_get_functiondef(v_sig::regprocedure);
    v_new := pg_catalog.regexp_replace(v_def,
      '(\mdelete\s+from\s+[a-z0-9_."]+(\s+[a-z0-9_]+)?)\s*;', '\1 where true;', 'gi');
    if v_new = v_def then
      raise exception 'safeupdate fix: % has no bare DELETE to fix — the live body moved', v_sig;
    end if;
    execute v_new;
  end loop;
end $$;

-- build_lifecycle_reference_map() had no access decision on record; the replace above incurs that debt.
insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values ('platform', 'build_lifecycle_reference_map', '', array[]::oid[], 'Takes no arguments; rebuilds the lifecycle reference map from the catalog.', '20261021203000_change_engine_passes_safeupdate.sql',
        'server_only: aidream data_lifecycle reference_map.py calls it over the primary database connection; no client ever does.', false, false)
on conflict do nothing;

create or replace function platform._no_bare_delete_in_function()
 returns event_trigger
 language plpgsql
 set search_path to ''
as $function$
-- pg_safeupdate is preloaded for every PostgREST session and refuses any DELETE without a WHERE
-- (21000 "DELETE requires a WHERE clause"), scratch and temp tables included. A function that clears
-- a table with a bare DELETE works over a direct connection (tests, migrations) and fails for every
-- signed-in caller. Shipped twice: platform.rebuild_reachability (2026-09-26) and the whole change
-- engine behind brand archive/move/copy/undo (2026-10-21).
declare r record; v_name text;
begin
  for r in select * from pg_event_trigger_ddl_commands() where object_type in ('function', 'procedure') loop
    select p.oid::regprocedure::text into v_name from pg_proc p
     where p.oid = r.objid
       and p.prosrc ~* '\mdelete\s+from\s+[a-z0-9_."]+(\s+[a-z0-9_]+)?\s*;';
    if v_name is not null then
      raise exception 'no_bare_delete: % runs a DELETE with no WHERE. pg_safeupdate refuses it (21000) for every app caller over PostgREST, even on scratch tables.', v_name
        using errcode = '42P13',
              hint = 'Write `delete from <table> where true;` — same rows, same lock, and safeupdate lets it through.';
    end if;
  end loop;
end $function$;

drop event trigger if exists no_bare_delete_in_function;
create event trigger no_bare_delete_in_function on ddl_command_end
  when tag in ('CREATE FUNCTION', 'CREATE PROCEDURE', 'ALTER FUNCTION', 'ALTER PROCEDURE')
  execute function platform._no_bare_delete_in_function();
