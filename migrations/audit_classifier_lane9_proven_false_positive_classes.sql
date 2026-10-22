-- based-on: audit.classify_broken_function(oid, text, text, text) 7eeb17d1f81fd7058d8712388570bf454af191473fc5ac468bcbdacfdfd990fa
-- audit_classifier_lane9_proven_false_positive_classes.sql
--
-- Three checker blind spots, each PROVEN on 2026-10-22 by executing the live code (canon lane 9):
--  1. 40P01 "deadlock detected" raised while plpgsql_check was analysing (public.cleanup_guest_accounts)
--     — the checker's own run collided with live traffic; nothing about the function was checked.
--     Now 'unchecked', exactly like the 57014 checker timeout.
--  2. record "X" is not assigned yet, where the body fills X with a dynamic `EXECUTE … INTO X`
--     (platform.set_home) — the checker cannot see a dynamic INTO. Suppressed only when the body
--     carries `execute … into X` for that exact record.
--  3. 42601 syntax error at or near "{" where the body loops a constant text ARRAY and splices the
--     element into format('%s') (chat.move_coding_conversations_to_organization, iam.org_test_sweep —
--     all 19/24 dynamic statements executed cleanly in a rolled-back run): the checker substitutes the
--     whole array literal for the element. Suppressed only when the body both loops over an array
--     (FOREACH … IN ARRAY, or unnest(array[…])) and builds SQL with format(…%s…).
-- A runtime probe failure (level runtime_error) is decided earlier and stays real.

do $patch$
declare
  v_def text; v_n int;
  a1 text := E'  if p_sqlstate = ''57014'' then\n';
  b1 text := E'  if p_sqlstate in (''57014'', ''40P01'') then  -- checker timeout or deadlock while analysing\n';
  a2 text := E'    -- The loop reads a transition table the checker cannot see (class 2).\n';
  b2 text := E'    -- X is filled by a dynamic EXECUTE … INTO X, which the checker cannot see.\n'
          || E'    if v_def ~* (''execute\\s[^;]*\\minto\\s+'' || v_unassigned || ''\\M'') then\n'
          || E'      return query select ''suppressed''::text, ''dynamic_execute_into''::text; return;\n'
          || E'    end if;\n';
  a3 text := E'  v_def := pg_get_functiondef(p_func_oid);\n';
  b3 text := E'\n  -- a constant text array looped and spliced into format(''%s''): the checker pastes the whole array literal\n'
          || E'  if p_sqlstate = ''42601'' and p_message = ''syntax error at or near "{"''\n'
          || E'     and v_def ~* ''(foreach\\s+\\w+\\s+in\\s+array|unnest\\s*\\(\\s*array\\s*\\[)''\n'
          || E'     and v_def ~* ''format\\s*\\([^;]*%s'' then\n'
          || E'    return query select ''suppressed''::text, ''array_literal_in_format''::text; return;\n'
          || E'  end if;\n';
begin
  v_def := pg_get_functiondef('audit.classify_broken_function(oid,text,text,text)'::regprocedure);
  v_n := (length(v_def) - length(replace(v_def, a1, ''))) / length(a1); if v_n <> 1 then raise exception 'a1 %', v_n; end if;
  v_n := (length(v_def) - length(replace(v_def, a2, ''))) / length(a2); if v_n <> 1 then raise exception 'a2 %', v_n; end if;
  v_n := (length(v_def) - length(replace(v_def, a3, ''))) / length(a3); if v_n <> 1 then raise exception 'a3 %', v_n; end if;
  v_def := replace(v_def, a1, b1);
  v_def := replace(v_def, a2, b2 || a2);
  v_def := replace(v_def, a3, a3 || b3);
  execute v_def;
end $patch$;

do $assert$
declare v text; probe oid := 'audit.refresh_log_recount()'::regprocedure::oid;
begin
  select severity into v from audit.classify_broken_function('public.cleanup_guest_accounts(integer,integer,boolean,boolean,integer)'::regprocedure, 'error', '40P01', 'deadlock detected');
  if v is distinct from 'unchecked' then raise exception '1: deadlock %', v; end if;
  select severity into v from audit.classify_broken_function('platform.set_home(text,uuid,uuid,integer)'::regprocedure, 'error', '55000', 'record "v_cur" is not assigned yet');
  if v is distinct from 'suppressed' then raise exception '2: dynamic into %', v; end if;
  select severity into v from audit.classify_broken_function('platform.set_home(text,uuid,uuid,integer)'::regprocedure, 'error', '55000', 'record "v_never_used_anywhere" is not assigned yet');
  if v is distinct from 'real' then raise exception '2b: unrelated record %', v; end if;
  select severity into v from audit.classify_broken_function('iam.org_test_sweep(boolean,integer)'::regprocedure, 'error', '42601', 'syntax error at or near "{"');
  if v is distinct from 'suppressed' then raise exception '3: array literal %', v; end if;
  select severity into v from audit.classify_broken_function(probe, 'error', '42601', 'syntax error at or near "{"');
  if v is distinct from 'real' then raise exception '3b: plain function %', v; end if;
  select severity into v from audit.classify_broken_function(probe, 'error', '42P10', 'there is no unique or exclusion constraint matching the ON CONFLICT specification');
  if v is distinct from 'real' then raise exception 'floor %', v; end if;
end $assert$;
