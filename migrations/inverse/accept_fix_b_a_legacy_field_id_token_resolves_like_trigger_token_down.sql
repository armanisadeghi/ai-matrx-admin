-- chair-step: ACCEPT-FIX inverse - a bare field id token stays literal again
-- based-on: custom._automation_tok(jsonb, jsonb) e5f189d2df19d3bf286ecefe6b45db71e217b46fe246270f9ed0bc5c7f57b7d2
create or replace function custom._automation_tok(p_val jsonb, p_ctx jsonb)
 returns jsonb
 language plpgsql
 immutable
 set search_path to 'pg_catalog'
as $function$
declare
  c_one  constant text := '^\{\{\s*((?:step[0-9]+|trigger|item|index)(?:\.[^{}\s]+)?)\s*\}\}$';
  c_any  constant text := '\{\{\s*((?:step[0-9]+|trigger|item|index)(?:\.[^{}\s]+)?)\s*\}\}';
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
      return coalesce(p_ctx #> string_to_array(v_m[1], '.'), 'null'::jsonb);
    end if;
    for v_m in select regexp_matches(v_s, '(' || c_any || ')', 'g') loop
      v_s := replace(v_s, v_m[1], coalesce(custom._automation_text_of(p_ctx #> string_to_array(v_m[2], '.')), ''));
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
