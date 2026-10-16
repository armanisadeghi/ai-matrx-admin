-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: ACCEPT-FIX
-- lock: custom
-- based-on: custom._automation_tok(jsonb, jsonb) add7b68fac9d4cdd9555a1fdfd75976ccc35c5fc69901bcdefd947abd09b9d08
--
-- ACCEPT-FIX 1 - a legacy {{<field id>}} token resolves exactly like {{trigger.<field id>}} (the run's trigger values
-- carry every field by id and by key). It used to stay literal inside an agent step. Other roots are unchanged.
create or replace function custom._automation_tok(p_val jsonb, p_ctx jsonb)
 returns jsonb
 language plpgsql
 immutable
 set search_path to 'pg_catalog'
as $function$
declare
  c_one  constant text := '^\{\{\s*((?:step[0-9]+|trigger|item|index)(?:\.[^{}\s]+)?|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*\}\}$';
  c_any  constant text := '\{\{\s*((?:step[0-9]+|trigger|item|index)(?:\.[^{}\s]+)?|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*\}\}';
  v_s    text;
  v_m    text[];
  v_out  jsonb;
  v_k    text;
  v_v    jsonb;
begin
  if p_val is null then return null; end if;
  if jsonb_typeof(p_val) = 'string' then
    v_s := p_val #>> '{}';
    if v_s !~ c_any then return p_val; end if;
    v_m := regexp_match(v_s, c_one);
    if v_m is not null then
      return coalesce(p_ctx #> string_to_array(case when v_m[1] ~ '^[0-9a-f]{8}-' then 'trigger.' || v_m[1] else v_m[1] end, '.'), 'null'::jsonb);
    end if;
    for v_m in select regexp_matches(v_s, '(' || c_any || ')', 'g') loop
      v_s := replace(v_s, v_m[1], coalesce(custom._automation_text_of(p_ctx #> string_to_array(case when v_m[2] ~ '^[0-9a-f]{8}-' then 'trigger.' || v_m[2] else v_m[2] end, '.')), ''));
    end loop;
    return to_jsonb(v_s);
  elsif jsonb_typeof(p_val) = 'array' then
    select coalesce(jsonb_agg(custom._automation_tok(e, p_ctx) order by o), '[]'::jsonb) into v_out
      from jsonb_array_elements(p_val) with ordinality x(e, o);
    return v_out;
  elsif jsonb_typeof(p_val) = 'object' then
    v_out := '{}'::jsonb;
    for v_k, v_v in select key, value from jsonb_each(p_val) loop
      -- a group's own steps are resolved when they run, never ahead of time
      v_out := v_out || jsonb_build_object(v_k, case when v_k in ('actions', 'branches', 'else') then v_v
                                                     else custom._automation_tok(v_v, p_ctx) end);
    end loop;
    return v_out;
  end if;
  return p_val;
end
$function$;
