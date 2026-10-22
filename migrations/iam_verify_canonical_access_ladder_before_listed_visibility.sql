-- based-on: iam.verify_canonical(text, text, text, text) 3ebaebabe97a73348e242b9f6bdca62a9663fb0167b6f6583a90737d0e6ca0fa
-- iam_verify_canonical_access_ladder_before_listed_visibility.sql
--
-- The visibility check in iam.verify_canonical carried two rules in the wrong order:
--   ELSIF v_is_listed OR v_shareable THEN FAIL 'listed/shareable entity requires visibility enum'
--   ELSIF variant='entity' AND data_class IN ('organization','private','confidential') THEN PASS
-- The second (ACCESS LADDER, 2026-09-29) says those three levels are COMPLETE without a row
-- visibility column — the T-13 guard refuses the column on Private/Confidential tables, and
-- Organization tables read through the member lane. Because the listed/shareable branch fired
-- first, every listed or shareable table at those levels FAILed with a demand the guard refuses
-- (10 tables on 2026-10-22, e.g. users.user_email_preferences, users.user_surface_state).
-- Fix: the access-ladder branch is evaluated before the listed/shareable branch. Nothing else
-- in the function changes; Public tables still need their column.
-- Live body patched in place: both branches are matched exactly once and swapped.

do $patch$
declare
  v_def    text;
  v_listed text := E'  ELSIF v_is_listed OR v_shareable THEN status:=''FAIL''; detail:=''listed/shareable entity requires visibility enum'';\n';
  v_start  int;
  v_end    int;
  v_ladder text;
  v_n      int;
begin
  v_def := pg_get_functiondef('iam.verify_canonical(text,text,text,text)'::regprocedure);
  v_n := (length(v_def) - length(replace(v_def, v_listed, ''))) / length(v_listed);
  if v_n <> 1 then raise exception 'listed branch found % times, expected 1', v_n; end if;

  -- the ladder block: from its comment header to the line before the final ELSE of this check
  v_start := strpos(v_def, E'  -- ACCESS LADDER (2026-09-29, lane B-BILLING).');
  v_end   := strpos(v_def, E'  ELSE status:=''WARN''; detail:=''no visibility enum (add + migrate is_public)''; END IF; RETURN NEXT;');
  if v_start = 0 or v_end = 0 or v_end < v_start then raise exception 'ladder block not found (start %, end %)', v_start, v_end; end if;
  v_ladder := substr(v_def, v_start, v_end - v_start);
  if strpos(v_ladder, 'ELSIF v_variant=''entity''') = 0 then raise exception 'ladder block shape changed'; end if;

  -- remove the ladder block from after the listed branch, put it before
  v_def := overlay(v_def placing '' from v_start for (v_end - v_start));
  v_def := replace(v_def, v_listed, v_ladder || v_listed);
  execute v_def;
end $patch$;

do $assert$
declare v_status text; v_detail text;
begin
  select status, detail into v_status, v_detail
    from iam.verify_canonical('users', 'user_email_preferences', 'user_email_preference')
   where check_name = 'visibility';
  if v_status is distinct from 'PASS' then
    raise exception 'user_email_preferences visibility still %: %', v_status, v_detail;
  end if;
end $assert$;
