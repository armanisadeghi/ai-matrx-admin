-- target: branch,production
-- additive: yes
--   REPLACES custom.formula_eval (SUM, MIN, MAX, AVERAGE and MEDIAN count a list written as JSON text as all its
--   values, as they already did a list value) and custom._fxp_level (TRUE() and FALSE() read as the constants
--   TRUE and FALSE). Inverse: migrations/inverse/formula_b_true_with_brackets_and_a_list_text_sums_down.sql
-- guard: custom/system_enabled
-- lock: custom
-- based-on: custom.formula_eval(uuid, jsonb, jsonb, jsonb) efce736e456dd97f2ad0ff2eba847b3867cbfcbcfda686eecb9b713dd031a42f
-- based-on: custom._fxp_level(jsonb, integer, integer) f2a0532f5891c3b8b7868e980233397b15485063c3a49450061d2be0605245c7
-- LANE AT-FORMULA follow-up to formula_a_the_airtable_functions_are_all_here.sql: found by the two-evaluator parity run.

set local statement_timeout = '60s';

CREATE OR REPLACE FUNCTION custom.formula_eval(p_organization_id uuid, p_expr jsonb, p_values jsonb, p_context jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
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
