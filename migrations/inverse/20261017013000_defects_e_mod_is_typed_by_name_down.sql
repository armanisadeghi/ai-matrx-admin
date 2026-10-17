-- inverse of 20261017013000_defects_e_mod_is_typed_by_name.sql
-- lane: DEFECTS
-- lock: custom
CREATE OR REPLACE FUNCTION custom._fxp_level(p_tokens jsonb, p_i integer, p_level integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_ops   text[];
  v_left  jsonb;
  v_right jsonb;
  v_tok   jsonb;
  v_i     integer := p_i;
  v_r     jsonb;
  v_node  text;
  v_name  text;
  v_upper text;
  v_args  jsonb;
  v_spec  record;
  v_close jsonb;
  v_sep   jsonb;
begin
  if p_level <= 3 then
    v_ops := case p_level
               when 0 then array['=', '!=', '<>', '<', '<=', '>', '>=']
               when 1 then array['&']
               when 2 then array['+', '-']
               else        array['*', '/', '%'] end;
    v_r := custom._fxp_level(p_tokens, v_i, p_level + 1);
    v_left := v_r -> 'n'; v_i := (v_r ->> 'i')::integer;
    loop
      v_tok := p_tokens -> v_i;
      exit when v_tok ->> 't' <> 'operator' or not ((v_tok ->> 'x') = any (v_ops));
      v_r := custom._fxp_level(p_tokens, v_i + 1, p_level + 1);
      v_right := v_r -> 'n'; v_i := (v_r ->> 'i')::integer;
      v_node := case v_tok ->> 'x'
                  when '='  then 'fx.eq'  when '!=' then 'fx.ne' when '<>' then 'fx.ne'
                  when '<'  then 'fx.lt'  when '<=' then 'fx.lte' when '>' then 'fx.gt' when '>=' then 'fx.gte'
                  when '&'  then 'fx.concatenate'
                  when '+'  then 'fx.add' when '-' then 'fx.sub'
                  when '*'  then 'fx.mul' when '/' then 'fx.div' else 'fx.mod' end;
      v_left := jsonb_build_object('op', v_node, 'args', jsonb_build_array(v_left, v_right));
    end loop;
    return jsonb_build_object('n', v_left, 'i', v_i);
  end if;

  if p_level = 4 then
    v_tok := p_tokens -> v_i;
    if v_tok ->> 't' = 'operator' and v_tok ->> 'x' = '-' then
      v_r := custom._fxp_level(p_tokens, v_i + 1, 4);
      return jsonb_build_object('n', jsonb_build_object('op', 'fx.neg', 'args', jsonb_build_array(v_r -> 'n')),
                                'i', (v_r ->> 'i')::integer);
    end if;
    if v_tok ->> 't' = 'operator' and v_tok ->> 'x' = '+' then
      return custom._fxp_level(p_tokens, v_i + 1, 4);   -- a leading + is harmless; people type it
    end if;
    return custom._fxp_level(p_tokens, v_i, 5);
  end if;

  -- primary
  v_tok := p_tokens -> v_i;
  v_i := v_i + 1;
  if v_tok ->> 't' = 'number' then
    return jsonb_build_object('n', jsonb_build_object('const', (v_tok ->> 'x')::numeric), 'i', v_i);
  elsif v_tok ->> 't' = 'string' then
    return jsonb_build_object('n', jsonb_build_object('const', v_tok ->> 'x'), 'i', v_i);
  elsif v_tok ->> 't' = 'reference' then
    return jsonb_build_object('n', jsonb_build_object('ref', v_tok ->> 'x', 'at', (v_tok ->> 'p')::integer), 'i', v_i);
  elsif v_tok ->> 't' = 'paren-open' then
    v_r := custom._fxp_level(p_tokens, v_i, 0);
    v_close := p_tokens -> ((v_r ->> 'i')::integer);
    if v_close ->> 't' <> 'paren-close' then
      raise exception 'This opening bracket `(` never closes.' using errcode = '22023', detail = v_tok ->> 'p';
    end if;
    return jsonb_build_object('n', v_r -> 'n', 'i', (v_r ->> 'i')::integer + 1);
  elsif v_tok ->> 't' = 'identifier' then
    v_name := v_tok ->> 'x';
    v_upper := upper(v_name);
    if v_upper in ('TRUE', 'FALSE') then
      -- Airtable writes them TRUE() and FALSE(); both spellings are the same constant
      if (p_tokens -> v_i) ->> 't' = 'paren-open' and (p_tokens -> (v_i + 1)) ->> 't' = 'paren-close' then
        v_i := v_i + 2;
      end if;
      return jsonb_build_object('n', jsonb_build_object('const', v_upper = 'TRUE'), 'i', v_i);
    end if;
    select * into v_spec from custom.formula_node_kinds() k
     where k.node = 'fx.' || lower(v_upper)
       and k.node not in ('fx.add', 'fx.sub', 'fx.mul', 'fx.div', 'fx.mod', 'fx.neg',
                          'fx.eq', 'fx.ne', 'fx.lt', 'fx.lte', 'fx.gt', 'fx.gte',
                          'fx.autonumber');
    if v_spec.node is null then
      raise exception 'There is no function called `%`. A column goes in braces, like {%}.', v_name, v_name
        using errcode = '22023', detail = v_tok ->> 'p';
    end if;
    if (p_tokens -> v_i) ->> 't' <> 'paren-open' then
      raise exception '`%` needs brackets after it, like %.', v_upper, v_spec.signature
        using errcode = '22023', detail = v_tok ->> 'p';
    end if;
    v_i := v_i + 1;
    v_args := '[]'::jsonb;
    if (p_tokens -> v_i) ->> 't' = 'paren-close' then
      v_i := v_i + 1;
    else
      loop
        v_r := custom._fxp_level(p_tokens, v_i, 0);
        v_args := v_args || jsonb_build_array(v_r -> 'n');
        v_i := (v_r ->> 'i')::integer;
        v_sep := p_tokens -> v_i;
        v_i := v_i + 1;
        if v_sep ->> 't' = 'comma' then continue; end if;
        if v_sep ->> 't' = 'paren-close' then exit; end if;
        raise exception '`%` is missing a comma or its closing bracket.', v_upper
          using errcode = '22023', detail = v_sep ->> 'p';
      end loop;
    end if;
    if jsonb_array_length(v_args) < v_spec.min_args
       or (v_spec.max_args is not null and jsonb_array_length(v_args) > v_spec.max_args) then
      raise exception '`%` was given % value%. Use %.', v_upper, jsonb_array_length(v_args),
                      case when jsonb_array_length(v_args) = 1 then '' else 's' end, v_spec.signature
        using errcode = '22023', detail = v_tok ->> 'p';
    end if;
    return jsonb_build_object('n', jsonb_build_object('op', v_spec.node, 'args', v_args), 'i', v_i);
  elsif v_tok ->> 't' = 'end' then
    raise exception 'The formula stops before it is finished.' using errcode = '22023', detail = v_tok ->> 'p';
  end if;
  raise exception '`%` cannot start a value here.', v_tok ->> 'x' using errcode = '22023', detail = v_tok ->> 'p';
end
$function$;
