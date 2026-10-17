-- inverse of 20261018050000_w2a_a_mod_takes_the_divisors_sign.sql
-- chair-step: put back the bodies 20261018050000_w2a_a_mod_takes_the_divisors_sign.sql replaced
-- lane: W2-A
-- lock: custom
CREATE OR REPLACE FUNCTION custom._fxc_apply(p_op text, p_vals jsonb[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_n     integer := coalesce(cardinality(p_vals), 0);
  v_a     jsonb;
  v_b     jsonb;
  v_one   jsonb;
  v_x     numeric;
  v_y     numeric;
  v_nums  numeric[] := '{}';
  v_s     text;
  v_t     text;
  v_u     text;
  v_an    boolean;
  v_bn    boolean;
  v_c     integer;
  v_i     integer;
  v_d1    timestamp;
  v_d2    timestamp;
  v_do    boolean;
begin
  -- ONE NODE OF A PLANNED FORMULA, its arguments already worked out (VISION-REACH W5, 2026-10-02).
  -- custom.formula_compile_sql writes a formula as nested calls of this function over the row's
  -- values, so the per-node work custom.formula_eval repeats on every record — the node catalogue,
  -- each column's Field look-up, custom.rule_eval's checks — is done ONCE, when the query is
  -- planned. Each branch is custom.formula_eval's own branch for that node, with its helpers
  -- (custom._fx_blank, _fx_truthy, _fx_loose, _fx_num, _fx_text, _fx_num_text, _fx_cmp, _fx_date,
  -- _fx_unit, _fx_iso) written out in place for the values they meet on every row — a JSON number,
  -- a plain string, a boolean, JSON null — because each of those is a function call with its own
  -- search_path and, for _fx_loose and _fx_date, its own subtransaction (measured: _fx_cmp alone
  -- 210 µs a call). Anything rarer (a string that might be a number) still asks the helper itself.
  --
  -- A FAILED ARGUMENT IS SQL NULL; a value never is (formula_eval answers JSON null for "empty").
  -- Where formula_eval raises — a value that is not a number or a date, an unknown unit, dividing
  -- by zero — custom.derived_value answers an empty column; here the same failure is SQL NULL,
  -- carried to the top, which reads as the same empty column. IF, AND and OR short-circuit exactly
  -- as formula_eval does: a failure formula_eval never reaches changes nothing. A cancelled
  -- statement (query_canceled) is never caught. Proven equal to custom.derived_value on every
  -- record of every formula Field, on the clone and on production
  -- (scripts/campaign-tests/visionreach_w5_formula_planned_equality.sql).

  -- ── short-circuit: IF, AND, OR (formula_eval's own order) ─────────────────────────────────
  if p_op = 'fx.if' then
    v_a := p_vals[1];
    if v_a is null then
      return null;
    end if;
    -- custom._fx_truthy
    if (case when v_a = 'null'::jsonb or v_a = '""'::jsonb then false
             when jsonb_typeof(v_a) = 'boolean' then (v_a #>> '{}')::boolean
             when jsonb_typeof(v_a) = 'number' then (v_a #>> '{}')::numeric <> 0
             else true end) then
      return p_vals[2];
    end if;
    if v_n > 2 then
      return p_vals[3];
    end if;
    return 'null'::jsonb;
  elsif p_op in ('fx.and', 'fx.or') then
    for v_i in 1 .. v_n loop
      v_a := p_vals[v_i];
      if v_a is null then
        return null;
      end if;
      v_an := case when v_a = 'null'::jsonb or v_a = '""'::jsonb then false
                   when jsonb_typeof(v_a) = 'boolean' then (v_a #>> '{}')::boolean
                   when jsonb_typeof(v_a) = 'number' then (v_a #>> '{}')::numeric <> 0
                   else true end;
      if p_op = 'fx.and' and not v_an then
        return 'false'::jsonb;
      end if;
      if p_op = 'fx.or' and v_an then
        return 'true'::jsonb;
      end if;
    end loop;
    return case when p_op = 'fx.and' then 'true'::jsonb else 'false'::jsonb end;
  end if;

  -- Every other node works every argument out first: one failed argument fails the node.
  if array_position(p_vals, null) is not null then
    return null;
  end if;
  v_a := p_vals[1];
  v_b := p_vals[2];

  -- ── Rule nodes (custom.rule_eval's own branches; custom._fxc_rule_sql plans them) ──────────
  -- No conversion at all: an empty side is an empty answer, = and != compare the JSON values
  -- themselves, and arithmetic or < > take two JSON numbers or refuse.
  if p_op in ('rule.add', 'rule.sub', 'rule.mul', 'rule.div', 'rule.lt', 'rule.lte', 'rule.gt', 'rule.gte',
              'rule.eq', 'rule.ne') then
    if jsonb_typeof(v_a) = 'null' or jsonb_typeof(v_b) = 'null' then
      return 'null'::jsonb;
    end if;
    if p_op = 'rule.eq' then
      return to_jsonb(v_a = v_b);
    elsif p_op = 'rule.ne' then
      return to_jsonb(v_a <> v_b);
    end if;
    if jsonb_typeof(v_a) <> 'number' or jsonb_typeof(v_b) <> 'number' then
      return null;   -- 'this rule compares numbers, and it was given …' (22023) in rule_eval
    end if;
    v_x := (v_a #>> '{}')::numeric;
    v_y := (v_b #>> '{}')::numeric;
    return case p_op
      when 'rule.lt'  then to_jsonb(v_x <  v_y)
      when 'rule.lte' then to_jsonb(v_x <= v_y)
      when 'rule.gt'  then to_jsonb(v_x >  v_y)
      when 'rule.gte' then to_jsonb(v_x >= v_y)
      when 'rule.add' then to_jsonb(v_x + v_y)
      when 'rule.sub' then to_jsonb(v_x - v_y)
      when 'rule.mul' then to_jsonb(v_x * v_y)
      -- 'this rule divides by nothing' (22012) in rule_eval
      else case when v_y = 0 then null else to_jsonb(v_x / v_y) end
    end;
  elsif p_op = 'rule.concat' then
    -- the first value is the separator; each part is already the words a person reads
    -- (custom._fxc_rule_sql asks custom.field_words for a column); empty parts are skipped
    v_t := v_a #>> '{}';
    v_s := null;
    for v_i in 2 .. v_n loop
      v_one := p_vals[v_i];
      continue when jsonb_typeof(v_one) = 'null';
      v_u := v_one #>> '{}';
      continue when nullif(btrim(v_u), '') is null;
      v_s := case when v_s is null then v_u else v_s || v_t || v_u end;
    end loop;
    return to_jsonb(coalesce(v_s, ''));
  end if;

  -- ── numbers: + − × ÷ % and unary minus ───────────────────────────────────────────────────
  -- custom._fx_num(v) is custom._fx_loose(v) or a refusal: JSON null and "" read 0, a number is
  -- itself, a boolean 1 or 0, a string is parsed by _fx_loose; anything else refuses.
  if p_op in ('fx.add', 'fx.sub', 'fx.mul', 'fx.div', 'fx.mod', 'fx.neg') then
    v_x := case when jsonb_typeof(v_a) = 'number' then (v_a #>> '{}')::numeric
                when v_a = 'null'::jsonb or v_a = '""'::jsonb then 0
                when jsonb_typeof(v_a) = 'boolean' then case when (v_a #>> '{}')::boolean then 1 else 0 end
                else custom._fx_loose(v_a) end;
    if p_op = 'fx.neg' then
      return case when v_x is null then null else to_jsonb(- v_x) end;
    end if;
    v_y := case when jsonb_typeof(v_b) = 'number' then (v_b #>> '{}')::numeric
                when v_b = 'null'::jsonb or v_b = '""'::jsonb then 0
                when jsonb_typeof(v_b) = 'boolean' then case when (v_b #>> '{}')::boolean then 1 else 0 end
                else custom._fx_loose(v_b) end;
    if v_x is null or v_y is null then
      return null;
    end if;
    return case p_op
      when 'fx.add' then to_jsonb(v_x + v_y)
      when 'fx.sub' then to_jsonb(v_x - v_y)
      when 'fx.mul' then to_jsonb(v_x * v_y)
      -- 'This formula divides by zero.' (22012) in formula_eval
      when 'fx.div' then case when v_y = 0 then null else to_jsonb(trim_scale(v_x / v_y)) end
      else case when v_y = 0 then null else to_jsonb(trim_scale(mod(v_x, v_y))) end
    end;
  end if;

  -- ── comparisons: custom._fx_cmp ──────────────────────────────────────────────────────────
  if p_op in ('fx.eq', 'fx.ne', 'fx.lt', 'fx.lte', 'fx.gt', 'fx.gte') then
    if (v_a = 'null'::jsonb or v_a = '""'::jsonb) and (v_b = 'null'::jsonb or v_b = '""'::jsonb) then
      v_c := 0;
    else
      -- "reads as a number": a JSON number, or a non-blank string _fx_loose can read. A string
      -- with no digit reads as a number only when it is nothing but , space $ € £ ¥ % (→ 0).
      v_an := jsonb_typeof(v_a) = 'number'
              or (jsonb_typeof(v_a) = 'string' and btrim(v_a #>> '{}') <> ''
                  and case when (v_a #>> '{}') ~ '[0-9]' then custom._fx_loose(v_a) is not null
                           else (v_a #>> '{}') ~ '^[,\s$€£¥%]*$' end);
      v_bn := jsonb_typeof(v_b) = 'number'
              or (jsonb_typeof(v_b) = 'string' and btrim(v_b #>> '{}') <> ''
                  and case when (v_b #>> '{}') ~ '[0-9]' then custom._fx_loose(v_b) is not null
                           else (v_b #>> '{}') ~ '^[,\s$€£¥%]*$' end);
      if ((v_a = 'null'::jsonb or v_a = '""'::jsonb) and v_bn)
         or ((v_b = 'null'::jsonb or v_b = '""'::jsonb) and v_an)
         or (v_an and v_bn) then
        v_x := coalesce(case when jsonb_typeof(v_a) = 'number' then (v_a #>> '{}')::numeric
                             when v_a = 'null'::jsonb or v_a = '""'::jsonb then 0
                             else custom._fx_loose(v_a) end, 0);
        v_y := coalesce(case when jsonb_typeof(v_b) = 'number' then (v_b #>> '{}')::numeric
                             when v_b = 'null'::jsonb or v_b = '""'::jsonb then 0
                             else custom._fx_loose(v_b) end, 0);
        v_c := case when v_x < v_y then -1 when v_x > v_y then 1 else 0 end;
      elsif jsonb_typeof(v_a) = 'boolean' or jsonb_typeof(v_b) = 'boolean' then
        v_an := case when v_a = 'null'::jsonb or v_a = '""'::jsonb then false
                     when jsonb_typeof(v_a) = 'boolean' then (v_a #>> '{}')::boolean
                     when jsonb_typeof(v_a) = 'number' then (v_a #>> '{}')::numeric <> 0
                     else true end;
        v_bn := case when v_b = 'null'::jsonb or v_b = '""'::jsonb then false
                     when jsonb_typeof(v_b) = 'boolean' then (v_b #>> '{}')::boolean
                     when jsonb_typeof(v_b) = 'number' then (v_b #>> '{}')::numeric <> 0
                     else true end;
        v_c := case when v_an = v_bn then 0 when v_an then 1 else -1 end;
      else
        v_s := case when jsonb_typeof(v_a) = 'null' then ''
                    when jsonb_typeof(v_a) = 'number' then custom._fx_num_text((v_a #>> '{}')::numeric)
                    when jsonb_typeof(v_a) in ('boolean', 'string') then v_a #>> '{}'
                    else v_a::text end;
        v_t := case when jsonb_typeof(v_b) = 'null' then ''
                    when jsonb_typeof(v_b) = 'number' then custom._fx_num_text((v_b #>> '{}')::numeric)
                    when jsonb_typeof(v_b) in ('boolean', 'string') then v_b #>> '{}'
                    else v_b::text end;
        v_c := case when v_s collate "C" < v_t collate "C" then -1
                    when v_s collate "C" > v_t collate "C" then 1 else 0 end;
      end if;
    end if;
    return to_jsonb(case p_op when 'fx.eq' then v_c = 0 when 'fx.ne' then v_c <> 0
                              when 'fx.lt' then v_c < 0 when 'fx.lte' then v_c <= 0
                              when 'fx.gt' then v_c > 0 else v_c >= 0 end);
  end if;

  -- ── text: custom._fx_text of each value ──────────────────────────────────────────────────
  if p_op in ('fx.concatenate', 'fx.upper', 'fx.lower', 'fx.trim', 'fx.len', 'fx.contains') then
    if p_op = 'fx.concatenate' then
      v_s := '';
      foreach v_one in array p_vals loop
        v_s := v_s || case when jsonb_typeof(v_one) = 'null' then ''
                           when jsonb_typeof(v_one) = 'number' then custom._fx_num_text((v_one #>> '{}')::numeric)
                           when jsonb_typeof(v_one) in ('boolean', 'string') then v_one #>> '{}'
                           else v_one::text end;
      end loop;
      return to_jsonb(v_s);
    end if;
    v_s := case when jsonb_typeof(v_a) = 'null' then ''
                when jsonb_typeof(v_a) = 'number' then custom._fx_num_text((v_a #>> '{}')::numeric)
                when jsonb_typeof(v_a) in ('boolean', 'string') then v_a #>> '{}'
                else v_a::text end;
    if p_op = 'fx.contains' then
      v_t := case when jsonb_typeof(v_b) = 'null' then ''
                  when jsonb_typeof(v_b) = 'number' then custom._fx_num_text((v_b #>> '{}')::numeric)
                  when jsonb_typeof(v_b) in ('boolean', 'string') then v_b #>> '{}'
                  else v_b::text end;
      return to_jsonb(strpos(lower(v_s), lower(v_t)) > 0);
    end if;
    return case p_op
      when 'fx.upper' then to_jsonb(upper(v_s))
      when 'fx.lower' then to_jsonb(lower(v_s))
      when 'fx.trim'  then to_jsonb(regexp_replace(v_s, '^\s+|\s+$', '', 'g'))
      else to_jsonb(char_length(v_s))
    end;
  end if;

  if p_op = 'fx.not' then
    return to_jsonb(not (case when v_a = 'null'::jsonb or v_a = '""'::jsonb then false
                              when jsonb_typeof(v_a) = 'boolean' then (v_a #>> '{}')::boolean
                              when jsonb_typeof(v_a) = 'number' then (v_a #>> '{}')::numeric <> 0
                              else true end));
  elsif p_op = 'fx.isblank' then
    return to_jsonb(v_a = 'null'::jsonb or v_a = '""'::jsonb);
  end if;

  -- ── dates: custom._fx_date (an ISO string, read in UTC), _fx_unit, _fx_iso ───────────────
  if p_op in ('fx.datediff', 'fx.dateadd', 'fx.year', 'fx.month', 'fx.day') then
    -- _fx_date: an empty value or anything but a string that reads as a date refuses.
    if jsonb_typeof(v_a) <> 'string' or v_a = '""'::jsonb then
      return null;
    end if;
    v_s := btrim(v_a #>> '{}');
    v_do := v_s ~ '^\d{4}-\d{2}-\d{2}$';
    begin
      if v_do then
        v_d1 := v_s::date::timestamp;
      else
        v_d1 := (v_s::timestamptz at time zone 'UTC');
      end if;
      if p_op = 'fx.year' then
        return to_jsonb(extract(year from v_d1)::integer);
      elsif p_op = 'fx.month' then
        return to_jsonb(extract(month from v_d1)::integer);
      elsif p_op = 'fx.day' then
        return to_jsonb(extract(day from v_d1)::integer);
      end if;
      -- _fx_unit: the third value's text, lower-cased and trimmed, one of the allowed units
      v_one := p_vals[3];
      v_u := lower(btrim(case when jsonb_typeof(v_one) = 'null' then ''
                              when jsonb_typeof(v_one) = 'number' then custom._fx_num_text((v_one #>> '{}')::numeric)
                              when jsonb_typeof(v_one) in ('boolean', 'string') then v_one #>> '{}'
                              else v_one::text end));
      if p_op = 'fx.datediff' then
        if jsonb_typeof(v_b) <> 'string' or v_b = '""'::jsonb then
          return null;
        end if;
        v_t := btrim(v_b #>> '{}');
        if v_t ~ '^\d{4}-\d{2}-\d{2}$' then
          v_d2 := v_t::date::timestamp;
        else
          v_d2 := (v_t::timestamptz at time zone 'UTC');
        end if;
        if not (v_u = any (array['days', 'hours', 'minutes'])) then
          return null;
        end if;
        return to_jsonb(trunc(extract(epoch from (v_d2 - v_d1))
                              / case v_u when 'days' then 86400 when 'hours' then 3600 else 60 end));
      end if;
      -- DATEADD
      v_x := trunc(case when jsonb_typeof(v_b) = 'number' then (v_b #>> '{}')::numeric
                        else custom._fx_num(v_b, '`DATEADD`') end);
      if not (v_u = any (array['days', 'months', 'years'])) then
        return null;
      end if;
      v_d2 := case v_u when 'days' then v_d1 + make_interval(days => v_x::integer)
                       when 'months' then v_d1 + make_interval(months => v_x::integer)
                       else v_d1 + make_interval(years => v_x::integer) end;
      return to_jsonb(case when v_do then to_char(v_d2, 'YYYY-MM-DD')
                           else to_char(v_d2, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end);
    exception when others then
      return null;
    end;
  end if;

  -- ── the rest, as formula_eval writes them, with its own helpers ──────────────────────────
  begin
    case p_op
      when 'fx.sum', 'fx.min', 'fx.max', 'fx.average' then
        foreach v_one in array p_vals loop
          if not (v_one = 'null'::jsonb or v_one = '""'::jsonb) then
            v_nums := v_nums || custom._fx_num(v_one, format('`%s`', upper(substr(p_op, 4))));
          end if;
        end loop;
        if p_op = 'fx.sum' then
          return to_jsonb(coalesce((select sum(x) from unnest(v_nums) x), 0));
        end if;
        if cardinality(v_nums) = 0 then return 'null'::jsonb; end if;
        if p_op = 'fx.min' then return to_jsonb((select min(x) from unnest(v_nums) x)); end if;
        if p_op = 'fx.max' then return to_jsonb((select max(x) from unnest(v_nums) x)); end if;
        return to_jsonb(trim_scale((select sum(x) from unnest(v_nums) x) / cardinality(v_nums)));
      when 'fx.round' then
        v_x := custom._fx_num(v_a, '`ROUND`');
        v_y := case when v_n > 1 then trunc(custom._fx_num(v_b, '`ROUND`')) else 0 end;
        return to_jsonb(round(v_x, v_y::integer));
      when 'fx.abs' then
        return to_jsonb(abs(custom._fx_num(v_a, '`ABS`')));
      when 'fx.left' then
        v_x := trunc(custom._fx_num(v_b, '`LEFT`'));
        return to_jsonb(left(custom._fx_text(v_a), greatest(0, v_x)::integer));
      when 'fx.right' then
        v_x := trunc(custom._fx_num(v_b, '`RIGHT`'));
        if v_x <= 0 then return '""'::jsonb; end if;
        return to_jsonb(right(custom._fx_text(v_a), v_x::integer));
      else
        return null;   -- never planned: custom.formula_compile_sql names every node it hands here
    end case;
  exception when others then
    return null;
  end;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.formula_eval(p_organization_id uuid, p_expr jsonb, p_values jsonb, p_context jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_only_ts timestamptz;
  v_op    text;
  v_args  jsonb;
  v_n     integer;
  v_spec  record;
  v_vals  jsonb[] := '{}';
  v_one   jsonb;
  v_a     jsonb;
  v_b     jsonb;
  v_x     numeric;
  v_y     numeric;
  v_nums  numeric[] := '{}';
  v_s     text;
  v_t     text;
  v_d1    record;
  v_d2    record;
  v_u     text;
  v_type  text;
  v_ts    timestamp;
  v_i     integer;
  v_k     integer;
  v_p     integer;
  v_el    jsonb;
begin
  if p_expr is null or jsonb_typeof(p_expr) <> 'object' then
    return custom.rule_eval(p_organization_id, p_expr, p_values, coalesce(p_context, '{}'::jsonb));
  end if;

  -- ── A COLUMN. What the older grid's `displayValueOf` seam did: a choice or a relation is
  -- the WORDS a person reads (so `{Status} = "No-show"` compares the label), everything else
  -- is its stored value; a list or an object reads as its JSON (normalizeCell).
  if p_expr ? 'field' and not (p_expr ? 'op') then
    v_a := custom.rule_eval(p_organization_id, p_expr, p_values, coalesce(p_context, '{}'::jsonb));
    if v_a is null or jsonb_typeof(v_a) = 'null' then
      return 'null'::jsonb;
    end if;
    select f.data ->> 'type' into v_type
      from custom.record f
     where f.organization_id = p_organization_id and f.id = (p_expr ->> 'field')::uuid
       and f.table_id = custom.field_kernel_id();
    if v_type in ('list', 'relation') then
      return to_jsonb(custom.field_words(p_organization_id, (p_expr ->> 'field')::uuid, v_a));
    end if;
    if jsonb_typeof(v_a) in ('array', 'object') then
      return to_jsonb(v_a::text);
    end if;
    return v_a;
  end if;

  v_op := p_expr ->> 'op';
  if v_op is null or left(v_op, 3) <> 'fx.' then
    -- Every node that is not the formula language's own is a Rule node, answered by the
    -- Rules' evaluator, unchanged — so every formula written before today answers the same.
    return custom.rule_eval(p_organization_id, p_expr, p_values, coalesce(p_context, '{}'::jsonb));
  end if;

  select * into v_spec from custom.formula_node_kinds() k where k.node = v_op;
  if v_spec.node is null then
    raise exception 'This formula asks for %, and the formula language has no such function.', v_op
      using errcode = '22023', hint = 'select node, signature from custom.formula_node_kinds() is the whole list.';
  end if;
  v_args := coalesce(p_expr -> 'args', '[]'::jsonb);
  if jsonb_typeof(v_args) <> 'array' then
    raise exception '`%` was given something that is not a list of values.', v_spec.signature using errcode = '22023';
  end if;
  v_n := jsonb_array_length(v_args);
  if v_n < v_spec.min_args or (v_spec.max_args is not null and v_n > v_spec.max_args) then
    raise exception '`%` was given % value%. Use %.', upper(substr(v_op, 4)), v_n,
                    case when v_n = 1 then '' else 's' end, v_spec.signature
      using errcode = '22023';
  end if;

  -- ── short-circuit: IF, AND, OR ──────────────────────────────────────────────────────────
  if v_op = 'fx.if' then
    if custom._fx_truthy(custom.formula_eval(p_organization_id, v_args -> 0, p_values, p_context)) then
      return custom.formula_eval(p_organization_id, v_args -> 1, p_values, p_context);
    end if;
    if v_n > 2 then
      return custom.formula_eval(p_organization_id, v_args -> 2, p_values, p_context);
    end if;
    return 'null'::jsonb;
  elsif v_op = 'fx.and' then
    for v_one in select e from jsonb_array_elements(v_args) e loop
      if not custom._fx_truthy(custom.formula_eval(p_organization_id, v_one, p_values, p_context)) then
        return 'false'::jsonb;
      end if;
    end loop;
    return 'true'::jsonb;
  elsif v_op = 'fx.or' then
    for v_one in select e from jsonb_array_elements(v_args) e loop
      if custom._fx_truthy(custom.formula_eval(p_organization_id, v_one, p_values, p_context)) then
        return 'true'::jsonb;
      end if;
    end loop;
    return 'false'::jsonb;
  elsif v_op = 'fx.switch' then
    -- SWITCH(value, match, result, …, otherwise?) — Airtable's order. Only the value, the
    -- matches up to the first that holds, and that one result are worked out; a match compares
    -- exactly as `=` does (numbers as numbers, an empty value matches BLANK()).
    v_a := coalesce(custom.formula_eval(p_organization_id, v_args -> 0, p_values, p_context), 'null'::jsonb);
    v_i := 1;
    while v_i + 1 < v_n loop
      if custom._fx_cmp(v_a, coalesce(custom.formula_eval(p_organization_id, v_args -> v_i, p_values, p_context),
                                      'null'::jsonb)) = 0 then
        return custom.formula_eval(p_organization_id, v_args -> (v_i + 1), p_values, p_context);
      end if;
      v_i := v_i + 2;
    end loop;
    if v_i < v_n then
      return custom.formula_eval(p_organization_id, v_args -> v_i, p_values, p_context);
    end if;
    return 'null'::jsonb;
  elsif v_op = 'fx.arrayjoin' then
    -- ARRAYJOIN(values, separator?) reads a COLUMN's stored list, not its words joined already:
    -- a many-choice column is each choice's own label, a link each record's own title. An empty
    -- item stays, as an empty piece between two separators — Airtable leaves removing them to
    -- ARRAYCOMPACT.
    v_s := case when v_n > 1
                then custom._fx_text(custom.formula_eval(p_organization_id, v_args -> 1, p_values, p_context))
                else ', ' end;
    v_a := custom._fx_items(p_organization_id, v_args -> 0, p_values, p_context);
    return to_jsonb(coalesce((select string_agg(custom._fx_text(u.x), v_s order by u.i)
                                from jsonb_array_elements(v_a) with ordinality u(x, i)), ''));
  elsif v_op = 'fx.arraycompact' then
    -- ARRAYCOMPACT(values): the list without empty items (null and ""). false, 0 and text of
    -- spaces stay, as in Airtable.
    v_a := custom._fx_items(p_organization_id, v_args -> 0, p_values, p_context);
    return coalesce((select jsonb_agg(u.x order by u.i)
                       from jsonb_array_elements(v_a) with ordinality u(x, i)
                      where not custom._fx_blank(u.x)), '[]'::jsonb);
  elsif v_op = 'fx.iserror' then
    -- ISERROR(expr): yes when working the expression out would refuse. A cancelled read is not an error answer.
    begin
      perform custom.formula_eval(p_organization_id, v_args -> 0, p_values, p_context);
      return 'false'::jsonb;
    exception when others then
      return 'true'::jsonb;
    end;
  elsif v_op in ('fx.arrayunique', 'fx.arrayflatten', 'fx.arrayslice') then
    -- the list arguments read as ARRAYJOIN reads them: a many-choice column's labels, a link's titles.
    v_a := custom._fx_items(p_organization_id, v_args -> 0, p_values, p_context);
    v_vals := array[v_a];
    for v_i in 1 .. v_n - 1 loop
      v_vals := v_vals || coalesce(custom.formula_eval(p_organization_id, v_args -> v_i, p_values, p_context), 'null'::jsonb);
    end loop;
    return custom._fx_ext(p_organization_id, v_op, v_vals, coalesce(p_context, '{}'::jsonb));
  end if;

  -- ── FORMULA-2: the list functions and the item words ─────────────────────────────────────
  if v_op in ('fx.current', 'fx.index', 'fx.current1', 'fx.current2', 'fx.recprop', 'fx.map', 'fx.filter', 'fx.findfirst',
              'fx.some', 'fx.every', 'fx.length', 'fx.at', 'fx.first', 'fx.last', 'fx.sort', 'fx.unique', 'fx.reverse',
              'fx.slice', 'fx.join', 'fx.split', 'fx.includes') then
    return custom._fx_listop(p_organization_id, v_op, v_args, p_values, coalesce(p_context, '{}'::jsonb));
  end if;

  -- ── the store's own kinds ───────────────────────────────────────────────────────────────
  if v_op = 'fx.autonumber' then
    return to_jsonb(custom._fx_autonumber(p_organization_id,
             nullif(p_context ->> 'fx_table_id', '')::uuid,
             nullif(p_context ->> 'fx_field_key', ''),
             nullif(p_context ->> 'fx_self_id', '')::uuid));
  elsif v_op = 'fx.record_id' then
    -- RECORD_ID(): the record's own id; a reader that has no record yet leaves it blank.
    return coalesce(to_jsonb(nullif(p_context ->> 'fx_self_id', '')), 'null'::jsonb);
  elsif v_op in ('fx.created_time', 'fx.modified_time', 'fx.last_modified_time') then
    select case when v_op = 'fx.created_time' then r.created_at else r.updated_at end into v_ts
      from custom.record r
     where r.organization_id = p_organization_id
       and r.id = nullif(p_context ->> 'fx_self_id', '')::uuid;
    -- AT-SHARE: a Last modified time column limited to chosen fields (config.only_fields) answers the latest moment
    -- ANY of those fields was written, read from the record's own per-field stamps (`_values.<key>.at`); a record
    -- none of them was ever written on answers blank. Without the option the column is the record's updated_at, as before.
    if v_op <> 'fx.created_time' and v_ts is not null then
      select max((r.data -> '_values' -> k ->> 'at')::timestamptz)
        into v_only_ts
        from custom.record r
        join custom.record f
          on f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id() and f.deleted_at is null
         and (f.data ->> 'entity_definition_id') = r.table_id::text
         and (f.data ->> 'key') = nullif(p_context ->> 'fx_field_key', '')
        cross join lateral jsonb_array_elements_text(
              case when jsonb_typeof(f.data -> 'config' -> 'only_fields') = 'array' then f.data -> 'config' -> 'only_fields' else '[]'::jsonb end) k
       where r.organization_id = p_organization_id
         and r.id = nullif(p_context ->> 'fx_self_id', '')::uuid;
      if exists (select 1 from custom.record r
                   join custom.record f on f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id() and f.deleted_at is null
                    and (f.data ->> 'entity_definition_id') = r.table_id::text
                    and (f.data ->> 'key') = nullif(p_context ->> 'fx_field_key', '')
                  where r.organization_id = p_organization_id and r.id = nullif(p_context ->> 'fx_self_id', '')::uuid
                    and jsonb_typeof(f.data -> 'config' -> 'only_fields') = 'array'
                    and jsonb_array_length(f.data -> 'config' -> 'only_fields') > 0) then
        v_ts := v_only_ts;
      end if;
    end if;
    if v_ts is null then
      return 'null'::jsonb;   -- a reader that has no record yet leaves it blank, never invents one
    end if;
    return to_jsonb(to_char((v_ts::timestamptz) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  elsif v_op = 'fx.blank' then
    return 'null'::jsonb;
  elsif v_op = 'fx.today' then
    return to_jsonb(to_char(now() at time zone custom.day_zone(p_organization_id), 'YYYY-MM-DD'));
  elsif v_op = 'fx.now' then
    return to_jsonb(to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  end if;

  -- ── everything else evaluates every argument first ─────────────────────────────────────
  for v_one in select e from jsonb_array_elements(v_args) e loop
    v_vals := v_vals || coalesce(custom.formula_eval(p_organization_id, v_one, p_values, p_context), 'null'::jsonb);
  end loop;
  v_a := case when v_n >= 1 then v_vals[1] end;
  v_b := case when v_n >= 2 then v_vals[2] end;

  case v_op
    when 'fx.sum', 'fx.min', 'fx.max', 'fx.average', 'fx.median' then
      -- a list given as a value counts as all its values (SUM over a roll-up, MAP(...) and the like).
      foreach v_one in array v_vals loop
        -- a list written as the JSON text of one (a list cell read as text) counts as all its values too
        if jsonb_typeof(v_one) = 'string' and btrim(v_one #>> '{}') like '[%' then
          v_one := custom._fx_arr(v_one);
        end if;
        if jsonb_typeof(v_one) = 'array' then
          for v_el in select e from jsonb_array_elements(v_one) e loop
            if not custom._fx_blank(v_el) then
              v_nums := v_nums || custom._fx_num(v_el, format('`%s`', upper(substr(v_op, 4))));
            end if;
          end loop;
        elsif not custom._fx_blank(v_one) then
          v_nums := v_nums || custom._fx_num(v_one, format('`%s`', upper(substr(v_op, 4))));
        end if;
      end loop;
      if v_op = 'fx.sum' then
        return to_jsonb(coalesce((select sum(x) from unnest(v_nums) x), 0));
      end if;
      if cardinality(v_nums) = 0 then return 'null'::jsonb; end if;
      if v_op = 'fx.median' then
        return to_jsonb(trim_scale((select avg(q.x) from (select x, row_number() over (order by x) rn, count(*) over () c
                                                            from unnest(v_nums) x) q
                                     where q.rn in ((q.c + 1) / 2, (q.c + 2) / 2))));
      end if;
      if v_op = 'fx.min' then return to_jsonb((select min(x) from unnest(v_nums) x)); end if;
      if v_op = 'fx.max' then return to_jsonb((select max(x) from unnest(v_nums) x)); end if;
      return to_jsonb(trim_scale((select sum(x) from unnest(v_nums) x) / cardinality(v_nums)));
    when 'fx.round' then
      v_x := custom._fx_num(v_a, '`ROUND`');
      v_y := case when v_n > 1 then trunc(custom._fx_num(v_b, '`ROUND`')) else 0 end;
      -- numeric round() rounds halves away from zero, which is the older grid's rule.
      return to_jsonb(round(v_x, v_y::integer));
    when 'fx.abs' then
      return to_jsonb(abs(custom._fx_num(v_a, '`ABS`')));
    when 'fx.len' then
      return to_jsonb(char_length(custom._fx_text(v_a)));
    when 'fx.upper' then
      return to_jsonb(upper(custom._fx_text(v_a)));
    when 'fx.lower' then
      return to_jsonb(lower(custom._fx_text(v_a)));
    when 'fx.trim' then
      return to_jsonb(regexp_replace(custom._fx_text(v_a), '^\s+|\s+$', '', 'g'));
    when 'fx.concatenate' then
      return to_jsonb((select string_agg(custom._fx_text(x), '' order by i)
                         from unnest(v_vals) with ordinality u(x, i)));
    when 'fx.left' then
      v_x := trunc(custom._fx_num(v_b, '`LEFT`'));
      return to_jsonb(left(custom._fx_text(v_a), greatest(0, v_x)::integer));
    when 'fx.right' then
      v_x := trunc(custom._fx_num(v_b, '`RIGHT`'));
      if v_x <= 0 then return '""'::jsonb; end if;
      return to_jsonb(right(custom._fx_text(v_a), v_x::integer));
    when 'fx.contains' then
      return to_jsonb(strpos(lower(custom._fx_text(v_a)), lower(custom._fx_text(v_b))) > 0);
    when 'fx.not' then
      return to_jsonb(not custom._fx_truthy(v_a));
    when 'fx.isblank' then
      return to_jsonb(custom._fx_blank(v_a));
    when 'fx.datediff' then
      select * into v_d1 from custom._fx_date(v_a, '`DATEDIFF`');
      select * into v_d2 from custom._fx_date(v_b, '`DATEDIFF`');
      v_u := custom._fx_unit(v_vals[3], array['days', 'hours', 'minutes', 'seconds', 'months', 'years'], 'DATEDIFF');
      if v_u in ('months', 'years') then
        -- whole calendar months (or years) from the first date to the second, toward zero.
        v_x := extract(year from age(v_d2.ts, v_d1.ts)) * 12 + extract(month from age(v_d2.ts, v_d1.ts));
        return to_jsonb(trunc(case v_u when 'years' then v_x / 12 else v_x end));
      end if;
      return to_jsonb(trunc(extract(epoch from (v_d2.ts - v_d1.ts))
                            / case v_u when 'days' then 86400 when 'hours' then 3600 when 'minutes' then 60 else 1 end));
    when 'fx.year' then
      select * into v_d1 from custom._fx_date(v_a, '`YEAR`');
      return to_jsonb(extract(year from v_d1.ts)::integer);
    when 'fx.month' then
      select * into v_d1 from custom._fx_date(v_a, '`MONTH`');
      return to_jsonb(extract(month from v_d1.ts)::integer);
    when 'fx.day' then
      select * into v_d1 from custom._fx_date(v_a, '`DAY`');
      return to_jsonb(extract(day from v_d1.ts)::integer);
    when 'fx.dateadd' then
      select * into v_d1 from custom._fx_date(v_a, '`DATEADD`');
      v_x := trunc(custom._fx_num(v_b, '`DATEADD`'));
      v_u := case custom._fx_unit_norm(v_vals[3], 'DATEADD')
               when 'day' then 'days' when 'month' then 'months' when 'year' then 'years' when 'hour' then 'hours'
               when 'minute' then 'minutes' when 'second' then 'seconds' when 'week' then 'weeks' when 'quarter' then 'quarters'
               else 'milliseconds' end;
      -- An interval of months clamps to the end of a shorter month, as the older grid does.
      v_ts := case v_u when 'days' then v_d1.ts + make_interval(days => v_x::integer)
                       when 'months' then v_d1.ts + make_interval(months => v_x::integer)
                       when 'hours' then v_d1.ts + make_interval(hours => v_x::integer)
                       when 'minutes' then v_d1.ts + make_interval(mins => v_x::integer)
                       when 'seconds' then v_d1.ts + make_interval(secs => v_x::integer)
                       when 'milliseconds' then v_d1.ts + make_interval(secs => v_x / 1000.0)
                       when 'weeks' then v_d1.ts + make_interval(days => 7 * v_x::integer)
                       when 'quarters' then v_d1.ts + make_interval(months => 3 * v_x::integer)
                       else v_d1.ts + make_interval(years => v_x::integer) end;
      -- a date with no time of day stays one when moved by days, months or years; hours and minutes need a time.
      return to_jsonb(custom._fx_iso(v_ts, v_d1.date_only and v_u in ('days', 'months', 'years', 'weeks', 'quarters')));
    when 'fx.find' then
      -- FIND(part, text, start?): Airtable's startFromPosition, which defaults to 0, is
      -- JavaScript's indexOf start — the number of characters skipped before the search. The
      -- answer counts from 1, and 0 means the part is not there. Upper and lower case differ.
      v_s := custom._fx_text(v_a);
      v_t := custom._fx_text(v_b);
      v_x := case when v_n > 2 then greatest(trunc(custom._fx_num(v_vals[3], '`FIND`')), 0) else 0 end;
      v_x := least(v_x, char_length(v_t));
      if v_s = '' then
        return to_jsonb(v_x + 1);
      end if;
      v_k := strpos(substr(v_t, v_x::integer + 1), v_s);
      return to_jsonb(case when v_k = 0 then 0 else v_k + v_x::integer end);
    when 'fx.substitute' then
      -- SUBSTITUTE(text, old, new, which?): every `old` replaced, or only the which-th one.
      v_s := custom._fx_text(v_a);
      v_t := custom._fx_text(v_b);
      v_u := custom._fx_text(v_vals[3]);
      if v_t = '' then
        return to_jsonb(v_s);
      end if;
      if v_n < 4 then
        return to_jsonb(replace(v_s, v_t, v_u));
      end if;
      v_x := trunc(custom._fx_num(v_vals[4], '`SUBSTITUTE`'));
      if v_x < 1 then
        raise exception '`SUBSTITUTE` counts which one to replace from 1, but was given %.', custom._fx_num_text(v_x)
          using errcode = '22023';
      end if;
      v_i := 0;   -- characters already passed
      v_k := 0;   -- occurrences seen
      loop
        v_p := strpos(substr(v_s, v_i + 1), v_t);
        exit when v_p = 0;
        v_i := v_i + v_p;
        v_k := v_k + 1;
        if v_k = v_x then
          return to_jsonb(left(v_s, v_i - 1) || v_u || substr(v_s, v_i + char_length(v_t)));
        end if;
        v_i := v_i + char_length(v_t) - 1;
      end loop;
      return to_jsonb(v_s);
    when 'fx.regex_match' then
      -- REGEX_MATCH(text, pattern), read as RE2 reads it (custom._fx_regex). Postgres's `~`
      -- answers yes/no without tracking captures, so the classic runaway shapes ((a+)+,
      -- (\w+\s?)+) run in milliseconds and are accepted, as RE2 accepts them. A pattern the
      -- database cannot read, or one too complex to compile (both 2201B), or one that runs past
      -- the statement's time is said in a plain sentence; a timeout keeps its own sqlstate
      -- (57014) so custom.derived_value still re-raises it as a cancelled read, never an empty
      -- cell. This is the only handler in the evaluator.
      v_t := custom._fx_regex(custom._fx_text(v_b), 'REGEX_MATCH');
      begin
        return to_jsonb(custom._fx_text(v_a) ~ v_t);
      exception
        when invalid_regular_expression then
          if sqlerrm like '%too complex%' then
            raise exception '`REGEX_MATCH` cannot work out a pattern this complex: "%".', custom._fx_text(v_b)
              using errcode = '22023';
          end if;
          raise exception '`REGEX_MATCH` cannot read the pattern "%".', custom._fx_text(v_b)
            using errcode = '22023';
        when query_canceled then
          raise exception '`REGEX_MATCH` took too long on this text. Try a simpler pattern.'
            using errcode = '57014';
      end;
    when 'fx.regexreplace' then
      -- REGEXREPLACE(text, pattern, new, all?): the pattern is read as RE2 reads it (custom._fx_regex); $1 in the new
      -- text is the first group, as in a Notion formula.
      v_t := custom._fx_regex(custom._fx_text(v_b), 'REGEXREPLACE');
      begin
        return to_jsonb(regexp_replace(custom._fx_text(v_a), v_t,
                          regexp_replace(custom._fx_text(v_vals[3]), '\$([0-9])', '\\\1', 'g'),
                          case when v_n > 3 and custom._fx_truthy(v_vals[4]) then 'g' else '' end));
      exception
        when invalid_regular_expression then
          raise exception '`REGEXREPLACE` cannot read the pattern "%".', custom._fx_text(v_b) using errcode = '22023';
      end;
    when 'fx.datetime_format' then
      select * into v_d1 from custom._fx_dl(v_a, '`DATETIME_FORMAT`');
      -- a date SET_TIMEZONE wrote (…+10:00) is written as that zone's own wall clock
      v_ts := case when jsonb_typeof(v_a) = 'string' and (v_a #>> '{}') ~ '\d[+-]\d{2}:\d{2}$'
                   then (left(v_a #>> '{}', char_length(v_a #>> '{}') - 6))::timestamp else v_d1.ts end;
      if v_n < 2 or btrim(custom._fx_text(v_b)) = '' then
        return to_jsonb(custom._fx_iso(v_ts, v_d1.date_only));
      end if;
      return to_jsonb(custom._fx_datetime_format(v_ts, custom._fx_text(v_b)));
    when 'fx.workday' then
      select * into v_d1 from custom._fx_date(v_a, '`WORKDAY`');
      v_x := trunc(custom._fx_num(v_b, '`WORKDAY`'));
      if abs(v_x) > 36500 then
        raise exception '`WORKDAY` moves at most 36500 working days, but was given %.', custom._fx_num_text(v_x)
          using errcode = '22023';
      end if;
      return to_jsonb(custom._fx_iso(
        custom._fx_workday(v_d1.ts, v_x::integer, case when v_n > 2 then v_vals[3] end), v_d1.date_only));
    when 'fx.add' then
      return to_jsonb(custom._fx_num(v_a, '`+`') + custom._fx_num(v_b, '`+`'));
    when 'fx.sub' then
      return to_jsonb(custom._fx_num(v_a, '`-`') - custom._fx_num(v_b, '`-`'));
    when 'fx.mul' then
      return to_jsonb(custom._fx_num(v_a, '`*`') * custom._fx_num(v_b, '`*`'));
    when 'fx.div', 'fx.mod' then
      v_y := custom._fx_num(v_b, case when v_op = 'fx.div' then '`/`' else '`%`' end);
      if v_y = 0 then
        raise exception 'This formula divides by zero.' using errcode = '22012';
      end if;
      v_x := custom._fx_num(v_a, case when v_op = 'fx.div' then '`/`' else '`%`' end);
      -- trim_scale: 142.5 / 3 is 47.5, not 47.5000000000000000 (a number reads as the older grid prints it).
      return to_jsonb(trim_scale(case when v_op = 'fx.div' then v_x / v_y else mod(v_x, v_y) end));
    when 'fx.neg' then
      return to_jsonb(- custom._fx_num(v_a, '`-`'));
    when 'fx.eq'  then return to_jsonb(custom._fx_cmp(v_a, v_b) = 0);
    when 'fx.ne'  then return to_jsonb(custom._fx_cmp(v_a, v_b) <> 0);
    when 'fx.lt'  then return to_jsonb(custom._fx_cmp(v_a, v_b) < 0);
    when 'fx.lte' then return to_jsonb(custom._fx_cmp(v_a, v_b) <= 0);
    when 'fx.gt'  then return to_jsonb(custom._fx_cmp(v_a, v_b) > 0);
    when 'fx.gte' then return to_jsonb(custom._fx_cmp(v_a, v_b) >= 0);
    when 'fx.true', 'fx.false', 'fx.error', 'fx.ceiling', 'fx.floor', 'fx.int', 'fx.power', 'fx.sqrt', 'fx.exp', 'fx.log',
         'fx.roundup', 'fx.rounddown', 'fx.even', 'fx.odd', 'fx.count', 'fx.counta', 'fx.countall', 'fx.value',
         'fx.mid', 'fx.replace', 'fx.rept', 'fx.search', 'fx.t', 'fx.encode_url_component', 'fx.xor',
         'fx.is_before', 'fx.is_after', 'fx.is_same', 'fx.hour', 'fx.minute', 'fx.second', 'fx.weekday', 'fx.weeknum',
         'fx.workday_diff', 'fx.datestr', 'fx.timestr', 'fx.datetime_parse', 'fx.datetime_diff', 'fx.tonow', 'fx.fromnow',
         'fx.set_timezone', 'fx.set_locale', 'fx.regex_extract', 'fx.regex_replace' then
      return custom._fx_ext(p_organization_id, v_op, v_vals, coalesce(p_context, '{}'::jsonb));
    else
      raise exception 'The formula language lists % and this evaluator does not work it out.', v_op
        using errcode = '22023', hint = 'That is a defect in custom.formula_eval, not in the formula.';
  end case;
end
$function$;

drop function if exists custom._fx_floored_mod(numeric, numeric);
