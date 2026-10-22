-- based-on: platform.retrofit_entity(text, text, text, text, text, text, text, text, text, text) 735fa1bb539a5a6789704f113af6cc4d4ab8b0c609d974e407fdfec9b676bc2f
-- retrofit_entity_access_ladder_visibility_rule_cast_fix.sql
--
-- retrofit_entity_access_ladder_visibility_rule.sql compared platform.entity_types.data_class
-- (the enum platform.data_class) through coalesce(..., '') — '' is not a data_class value, so
-- EVERY retrofit_entity call raised 22P02 from 16:07Z. Read the class as text.

do $patch$
declare
  v_def text;
  v_old text := E'and coalesce((select et.data_class from platform.entity_types et\n';
  v_new text := E'and coalesce((select et.data_class::text from platform.entity_types et\n';
  v_n int;
begin
  v_def := pg_get_functiondef('platform.retrofit_entity(text,text,text,text,text,text,text,text,text,text)'::regprocedure);
  v_n := (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old);
  if v_n <> 1 then raise exception 'anchor found % times, expected 1', v_n; end if;
  execute replace(v_def, v_old, v_new);
end $patch$;
