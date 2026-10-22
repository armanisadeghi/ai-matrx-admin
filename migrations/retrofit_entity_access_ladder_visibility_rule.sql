-- based-on: platform.retrofit_entity(text, text, text, text, text, text, text, text, text, text) 779f9672798863d98b76ef0dab1c6d88b3c6bae550c5ae498814ed4d11952e00
-- retrofit_entity_access_ladder_visibility_rule.sql
--
-- platform.retrofit_entity demanded a visibility column on every listed/shareable entity:
--   v_vis_req := v_variant = 'system' or (v_variant = 'entity' and (v_listed or v_shareable));
-- The access ladder (2026-09-29) and the certifier (iam.verify_canonical, fixed in
-- iam_verify_canonical_access_ladder_before_listed_visibility.sql) say an Organization,
-- Private or Confidential entity is COMPLETE without one, and the T-13 guard REFUSES the
-- column on Private/Confidential tables. So the retrofit asked for what the guard refuses:
-- canon lane 6 had to add base FKs by hand on three private shareable tables (2026-10-22).
-- Now the retrofit asks for visibility only where the certifier does.
-- Live body patched in place at a count-asserted anchor.

do $patch$
declare
  v_def    text;
  v_old    text := E'  v_vis_req   := v_variant = ''system'' or (v_variant = ''entity'' and (v_listed or v_shareable));\n';
  v_new    text := E'  v_vis_req   := v_variant = ''system'' or (v_variant = ''entity'' and (v_listed or v_shareable)\n'
               || E'                  -- access ladder: these three levels are complete without a row visibility column\n'
               || E'                  and coalesce((select et.data_class from platform.entity_types et\n'
               || E'                                 where et.token = p_token and et.is_active), '''')\n'
               || E'                      not in (''organization'', ''private'', ''confidential''));\n';
  v_n int;
begin
  v_def := pg_get_functiondef('platform.retrofit_entity(text,text,text,text,text,text,text,text,text,text)'::regprocedure);
  v_n := (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old);
  if v_n <> 1 then raise exception 'anchor found % times, expected 1', v_n; end if;
  execute replace(v_def, v_old, v_new);
end $patch$;
