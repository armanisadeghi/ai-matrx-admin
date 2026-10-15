-- target: branch,production
-- additive: yes
--   REPLACES custom._fx_ext (MID's start place counts from 0, as Airtable's own page shows) and
--   custom.formula_node_kinds (MID's help words). Inverse: migrations/inverse/formula_c_mid_counts_from_zero_down.sql
-- guard: custom/system_enabled
-- lock: custom
-- based-on: custom._fx_ext(uuid, text, jsonb[], jsonb) fdfa13838b0fb309ac41150a62783497e9c9c95a325602f76c4cb7f059ee65a0
-- based-on: custom.formula_node_kinds() fc801858a6602ba229175ccef35ca3d948c9c58001bc22a4c34206aedc596c49
-- LANE AT-FORMULA: Airtable's formula reference quotes MID("quick brown fox", 6, 5) => brown.

set local statement_timeout = '60s';

CREATE OR REPLACE FUNCTION custom._fx_ext(p_organization_id uuid, p_op text, p_vals jsonb[], p_context jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_n   integer := coalesce(cardinality(p_vals), 0);
  v_a   jsonb := case when v_n >= 1 then p_vals[1] end;
  v_b   jsonb := case when v_n >= 2 then p_vals[2] end;
  v_c   jsonb := case when v_n >= 3 then p_vals[3] end;
  v_x   numeric;
  v_y   numeric;
  v_z   numeric;
  v_s   text;
  v_t   text;
  v_u   text;
  v_d1  record;
  v_d2  record;
  v_ts  timestamp;
  v_ts2 timestamp;
  v_items jsonb;
  v_k   integer;
  v_i   integer;
  v_len integer;
  v_start integer;
  v_end   integer;
  v_fn  text := upper(substr(p_op, 4));
  v_str text;
begin
  case p_op
    when 'fx.true' then return 'true'::jsonb;
    when 'fx.false' then return 'false'::jsonb;
    when 'fx.error' then
      raise exception 'This formula returned ERROR().' using errcode = '22023';
    when 'fx.ceiling', 'fx.floor' then
      v_x := custom._fx_num(v_a, format('`%s`', v_fn));
      v_y := case when v_n > 1 then custom._fx_num(v_b, format('`%s`', v_fn)) else 1 end;
      if v_y = 0 then raise exception '`%` needs a significance other than 0.', v_fn using errcode = '22023'; end if;
      return to_jsonb(trim_scale((case when p_op = 'fx.ceiling' then ceil(v_x / v_y) else floor(v_x / v_y) end) * v_y));
    when 'fx.int' then
      return to_jsonb(floor(custom._fx_num(v_a, '`INT`')));
    when 'fx.power' then
      v_x := custom._fx_num(v_a, '`POWER`'); v_y := custom._fx_num(v_b, '`POWER`');
      begin
        return to_jsonb(trim_scale(round(power(v_x, v_y), 12)));
      exception when others then
        raise exception '`POWER` cannot raise % to %.', custom._fx_num_text(v_x), custom._fx_num_text(v_y) using errcode = '22023';
      end;
    when 'fx.sqrt' then
      v_x := custom._fx_num(v_a, '`SQRT`');
      if v_x < 0 then raise exception '`SQRT` needs a number of 0 or more, but got %.', custom._fx_num_text(v_x) using errcode = '22023'; end if;
      return to_jsonb(trim_scale(round(sqrt(v_x), 12)));
    when 'fx.exp' then
      v_x := custom._fx_num(v_a, '`EXP`');
      begin
        return to_jsonb(trim_scale(round(exp(v_x), 12)));
      exception when others then
        raise exception '`EXP` of % is too large to show.', custom._fx_num_text(v_x) using errcode = '22023';
      end;
    when 'fx.log' then
      v_x := custom._fx_num(v_a, '`LOG`');
      v_y := case when v_n > 1 then custom._fx_num(v_b, '`LOG`') else 10 end;
      if v_x <= 0 or v_y <= 0 or v_y = 1 then
        raise exception '`LOG` needs a number above 0 and a base above 0 other than 1.' using errcode = '22023';
      end if;
      return to_jsonb(trim_scale(round(log(v_y, v_x), 12)));
    when 'fx.roundup', 'fx.rounddown' then
      v_x := custom._fx_num(v_a, format('`%s`', v_fn));
      v_y := case when v_n > 1 then trunc(custom._fx_num(v_b, format('`%s`', v_fn))) else 0 end;
      v_z := power(10::numeric, v_y);
      return to_jsonb(trim_scale(sign(v_x) * (case when p_op = 'fx.roundup' then ceil(abs(v_x) * v_z) else floor(abs(v_x) * v_z) end) / v_z));
    when 'fx.even' then
      v_x := custom._fx_num(v_a, '`EVEN`');
      return to_jsonb(sign(v_x) * ceil(abs(v_x) / 2) * 2);
    when 'fx.odd' then
      v_x := custom._fx_num(v_a, '`ODD`');
      v_y := ceil(abs(v_x));
      if v_y % 2 = 0 then v_y := v_y + 1; end if;
      return to_jsonb(case when v_x < 0 then -v_y else v_y end);
    when 'fx.count' then
      return to_jsonb((select count(*) from jsonb_array_elements(custom._fx_flat(p_vals)) e
                        where not custom._fx_blank(e) and jsonb_typeof(e) <> 'boolean' and custom._fx_loose(e) is not null));
    when 'fx.counta' then
      return to_jsonb((select count(*) from jsonb_array_elements(custom._fx_flat(p_vals)) e where not custom._fx_blank(e)));
    when 'fx.countall' then
      return to_jsonb((select coalesce(sum(case when custom._fx_blank(v) then 1 else jsonb_array_length(custom._fx_arr(v)) end), 0)
                         from unnest(p_vals) v));
    when 'fx.value' then
      return to_jsonb(trim_scale(custom._fx_num(v_a, '`VALUE`')));
    when 'fx.mid' then
      v_x := trunc(custom._fx_num(v_b, '`MID`')); v_y := trunc(custom._fx_num(v_c, '`MID`'));
      -- Airtable's own page: MID("quick brown fox", 6, 5) is brown, so the start place counts from 0 (as FIND's start does)
      return to_jsonb(substr(custom._fx_text(v_a), greatest(v_x, 0)::integer + 1, greatest(v_y, 0)::integer));
    when 'fx.replace' then
      v_s := custom._fx_text(v_a);
      v_x := greatest(trunc(custom._fx_num(v_b, '`REPLACE`')), 1); v_y := greatest(trunc(custom._fx_num(v_c, '`REPLACE`')), 0);
      return to_jsonb(left(v_s, v_x::integer - 1) || custom._fx_text(p_vals[4]) || substr(v_s, (v_x + v_y)::integer));
    when 'fx.rept' then
      v_s := custom._fx_text(v_a);
      v_x := greatest(trunc(custom._fx_num(v_b, '`REPT`')), 0);
      if v_x * char_length(v_s) > 100000 then
        raise exception '`REPT` makes at most 100000 characters.' using errcode = '22023';
      end if;
      return to_jsonb(repeat(v_s, v_x::integer));
    when 'fx.search' then
      v_s := lower(custom._fx_text(v_a)); v_t := lower(custom._fx_text(v_b));
      v_x := case when v_n > 2 then greatest(trunc(custom._fx_num(v_c, '`SEARCH`')), 0) else 0 end;
      v_x := least(v_x, char_length(v_t));
      v_k := strpos(substr(v_t, v_x::integer + 1), v_s);
      if v_s = '' then return to_jsonb(v_x + 1); end if;
      return case when v_k = 0 then 'null'::jsonb else to_jsonb(v_k + v_x::integer) end;
    when 'fx.t' then
      return case when jsonb_typeof(v_a) = 'string' then v_a else 'null'::jsonb end;
    when 'fx.encode_url_component' then
      v_s := custom._fx_text(v_a);
      v_str := '';
      for v_i in 1 .. char_length(v_s) loop
        v_t := substr(v_s, v_i, 1);
        if v_t ~ '^[A-Za-z0-9_.!~*''()-]$' then
          v_str := v_str || v_t;
        else
          v_str := v_str || regexp_replace(upper(encode(convert_to(v_t, 'UTF8'), 'hex')), '(..)', '%\1', 'g');
        end if;
      end loop;
      return to_jsonb(v_str);
    when 'fx.xor' then
      return to_jsonb((select count(*) from jsonb_array_elements(custom._fx_flat(p_vals)) e where custom._fx_truthy(e)) % 2 = 1);
    when 'fx.is_before', 'fx.is_after' then
      select * into v_d1 from custom._fx_dl(v_a, format('`%s`', v_fn));
      select * into v_d2 from custom._fx_dl(v_b, format('`%s`', v_fn));
      return to_jsonb(case when p_op = 'fx.is_before' then v_d1.ts < v_d2.ts else v_d1.ts > v_d2.ts end);
    when 'fx.is_same' then
      select * into v_d1 from custom._fx_dl(v_a, '`IS_SAME`');
      select * into v_d2 from custom._fx_dl(v_b, '`IS_SAME`');
      v_u := case when v_n > 2 then custom._fx_unit_norm(v_c, 'IS_SAME') else 'second' end;
      if v_u = 'week' then
        return to_jsonb(date_trunc('week', v_d1.ts + interval '1 day') = date_trunc('week', v_d2.ts + interval '1 day'));
      end if;
      return to_jsonb(date_trunc(v_u, v_d1.ts) = date_trunc(v_u, v_d2.ts));
    when 'fx.hour', 'fx.minute', 'fx.second' then
      select * into v_d1 from custom._fx_dl(v_a, format('`%s`', v_fn));
      return to_jsonb(case p_op when 'fx.hour' then extract(hour from v_d1.ts)::integer
                                when 'fx.minute' then extract(minute from v_d1.ts)::integer
                                else floor(extract(second from v_d1.ts))::integer end);
    when 'fx.weekday' then
      select * into v_d1 from custom._fx_dl(v_a, '`WEEKDAY`');
      v_k := coalesce((select i - 1 from unnest(array['sunday','monday','tuesday','wednesday','thursday','friday','saturday'])
                          with ordinality d(n, i) where d.n = lower(btrim(custom._fx_text(v_b)))), 0);
      return to_jsonb((extract(dow from v_d1.ts)::integer - v_k + 7) % 7);
    when 'fx.weeknum' then
      select * into v_d1 from custom._fx_dl(v_a, '`WEEKNUM`');
      v_k := coalesce((select i - 1 from unnest(array['sunday','monday','tuesday','wednesday','thursday','friday','saturday'])
                          with ordinality d(n, i) where d.n = lower(btrim(custom._fx_text(v_b)))), 0);
      v_i := (extract(dow from date_trunc('year', v_d1.ts))::integer - v_k + 7) % 7;   -- how far into its week 1 January falls
      return to_jsonb((extract(doy from v_d1.ts)::integer - 1 + v_i) / 7 + 1);
    when 'fx.workday_diff' then
      select * into v_d1 from custom._fx_dl(v_a, '`WORKDAY_DIFF`');
      select * into v_d2 from custom._fx_dl(v_b, '`WORKDAY_DIFF`');
      declare
        v_hol date[] := '{}';
        v_h text;
        v_hd record;
        v_lo date := least(v_d1.ts::date, v_d2.ts::date);
        v_hi date := greatest(v_d1.ts::date, v_d2.ts::date);
      begin
        if v_n > 2 and not custom._fx_blank(v_c) then
          for v_h in select btrim(x, ' "[]') from unnest(string_to_array(case when jsonb_typeof(v_c) = 'array'
                       then (select string_agg(e #>> '{}', ',') from jsonb_array_elements(v_c) e)
                       else custom._fx_text(v_c) end, ',')) x loop
            continue when v_h = '';
            select * into v_hd from custom._fx_dl(to_jsonb(v_h), '`WORKDAY_DIFF`');
            v_hol := v_hol || v_hd.ts::date;
          end loop;
        end if;
        v_k := (select count(*) from generate_series(v_lo, v_hi, interval '1 day') g
                 where extract(isodow from g) < 6 and not (g::date = any (v_hol)));
        return to_jsonb(case when v_d2.ts::date >= v_d1.ts::date then v_k else -v_k end);
      end;
    when 'fx.datestr' then
      select * into v_d1 from custom._fx_dl(v_a, '`DATESTR`');
      return to_jsonb(to_char(v_d1.ts, 'YYYY-MM-DD'));
    when 'fx.timestr' then
      select * into v_d1 from custom._fx_dl(v_a, '`TIMESTR`');
      return to_jsonb(to_char(v_d1.ts, 'HH24:MI:SS'));
    when 'fx.datetime_parse' then
      if custom._fx_blank(v_a) then raise exception '`DATETIME_PARSE` needs a date, but that value is empty.' using errcode = '22023'; end if;
      if v_n > 1 and btrim(custom._fx_text(v_b)) <> '' then
        return to_jsonb(custom._fx_iso(custom._fx_datetime_parse(custom._fx_text(v_a), custom._fx_text(v_b)), false));
      end if;
      select * into v_d1 from custom._fx_dl(v_a, '`DATETIME_PARSE`');
      return to_jsonb(custom._fx_iso(v_d1.ts, false));
    when 'fx.datetime_diff' then
      select * into v_d1 from custom._fx_dl(v_a, '`DATETIME_DIFF`');
      select * into v_d2 from custom._fx_dl(v_b, '`DATETIME_DIFF`');
      v_u := case when v_n > 2 then custom._fx_unit_norm(v_c, 'DATETIME_DIFF') else 'second' end;
      if v_u in ('month', 'quarter', 'year') then
        v_k := custom._fx_months_between(v_d1.ts, v_d2.ts);
        return to_jsonb(trunc(v_k::numeric / case v_u when 'month' then 1 when 'quarter' then 3 else 12 end));
      end if;
      return to_jsonb(trunc(extract(epoch from (v_d1.ts - v_d2.ts)) * 1000
                            / case v_u when 'millisecond' then 1 when 'second' then 1000 when 'minute' then 60000
                                       when 'hour' then 3600000 when 'day' then 86400000 else 604800000 end));
    when 'fx.tonow', 'fx.fromnow' then
      -- TONOW(date) is how far the date is from now (negative once it is past); FROMNOW(date) is how long ago it was.
      select * into v_d1 from custom._fx_dl(v_a, format('`%s`', v_fn));
      v_u := case when v_n > 1 then custom._fx_unit_norm(v_b, v_fn) else 'day' end;
      v_ts := now() at time zone 'UTC';
      if v_u in ('month', 'quarter', 'year') then
        v_k := case when p_op = 'fx.tonow' then custom._fx_months_between(v_d1.ts, v_ts) else custom._fx_months_between(v_ts, v_d1.ts) end;
        return to_jsonb(trunc(v_k::numeric / case v_u when 'month' then 1 when 'quarter' then 3 else 12 end));
      end if;
      v_x := extract(epoch from (case when p_op = 'fx.tonow' then v_d1.ts - v_ts else v_ts - v_d1.ts end)) * 1000
             / case v_u when 'millisecond' then 1 when 'second' then 1000 when 'minute' then 60000
                        when 'hour' then 3600000 when 'day' then 86400000 else 604800000 end;
      return to_jsonb(trunc(v_x));
    when 'fx.set_timezone' then
      -- The instant, written as the wall clock of that zone with its offset. DATETIME_FORMAT writes that wall clock.
      select * into v_d1 from custom._fx_dl(v_a, '`SET_TIMEZONE`');
      v_s := btrim(custom._fx_text(v_b));
      begin
        v_ts := (v_d1.ts at time zone 'UTC') at time zone v_s;
      exception when others then
        raise exception '`SET_TIMEZONE` does not know the time zone "%".', v_s using errcode = '22023';
      end;
      return to_jsonb(to_char(v_ts, 'YYYY-MM-DD"T"HH24:MI:SS.MS') ||
                      (select case when o < interval '0' then '-' else '+' end || to_char(abs(extract(epoch from o))::integer / 3600, 'FM00') || ':' ||
                              to_char(abs(extract(epoch from o))::integer % 3600 / 60, 'FM00')
                         from (select ((v_ts - v_d1.ts)) as o) q));
    when 'fx.set_locale' then
      v_s := lower(btrim(custom._fx_text(v_b)));
      if v_s <> '' and v_s !~ '^en($|[-_])' then
        raise exception '`SET_LOCALE` has the English locale only; "%" is not available yet.', v_s using errcode = '22023';
      end if;
      return v_a;
    when 'fx.arrayunique' then
      return coalesce((select jsonb_agg(u.x order by u.i) from (select x, min(i) i from jsonb_array_elements(custom._fx_arr(v_a)) with ordinality t(x, i) group by x) u), '[]'::jsonb);
    when 'fx.arrayflatten' then
      return custom._fx_flatten(custom._fx_arr(v_a));
    when 'fx.arrayslice' then
      v_items := custom._fx_arr(v_a);
      v_len := jsonb_array_length(v_items);
      v_x := trunc(custom._fx_num(v_b, '`ARRAYSLICE`'));
      v_start := case when v_x > 0 then v_x::integer when v_x < 0 then v_len + v_x::integer + 1 else 1 end;
      if v_n > 2 then
        v_y := trunc(custom._fx_num(v_c, '`ARRAYSLICE`'));
        v_end := case when v_y > 0 then v_y::integer when v_y < 0 then v_len + v_y::integer + 1 else 0 end;
      else
        v_end := v_len;
      end if;
      v_start := greatest(v_start, 1); v_end := least(v_end, v_len);
      return coalesce((select jsonb_agg(u.x order by u.i) from jsonb_array_elements(v_items) with ordinality u(x, i)
                        where u.i between v_start and v_end), '[]'::jsonb);
    when 'fx.regex_extract' then
      v_t := custom._fx_regex(custom._fx_text(v_b), 'REGEX_EXTRACT');
      begin
        v_s := substring(custom._fx_text(v_a) from v_t);
      exception when invalid_regular_expression then
        raise exception '`REGEX_EXTRACT` cannot read the pattern "%".', custom._fx_text(v_b) using errcode = '22023';
      end;
      return case when v_s is null then 'null'::jsonb else to_jsonb(v_s) end;
    when 'fx.regex_replace' then
      v_t := custom._fx_regex(custom._fx_text(v_b), 'REGEX_REPLACE');
      begin
        return to_jsonb(regexp_replace(custom._fx_text(v_a), v_t,
                          regexp_replace(custom._fx_text(v_c), '\$([0-9])', '\\\1', 'g'), 'g'));
      exception when invalid_regular_expression then
        raise exception '`REGEX_REPLACE` cannot read the pattern "%".', custom._fx_text(v_b) using errcode = '22023';
      end;
    else
      raise exception 'The formula language lists % and custom._fx_ext does not work it out.', p_op using errcode = '22023';
  end case;
end
$function$;

CREATE OR REPLACE FUNCTION custom.formula_node_kinds()
 RETURNS TABLE(node text, min_args integer, max_args integer, result text, signature text, says text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  -- The older grid's FUNCTION_SPECS (features/data-tables/formulas.ts), and its operators,
  -- as the store's `fx.*` nodes. max_args null = any number.
  select * from (values
    ('fx.sum',         1, null::integer, 'number',  'SUM(number, …)',                  'Adds every value, ignoring empty ones.'),
    ('fx.min',         1, null, 'number',  'MIN(number, …)',                  'The smallest value, ignoring empty ones.'),
    ('fx.max',         1, null, 'number',  'MAX(number, …)',                  'The largest value, ignoring empty ones.'),
    ('fx.average',     1, null, 'number',  'AVERAGE(number, …)',              'The average of the values that are filled in. Empty values are not counted.'),
    ('fx.round',       1, 2,    'number',  'ROUND(number, places?)',          'Rounds to the given number of decimal places (0 when omitted). Halves round away from zero.'),
    ('fx.abs',         1, 1,    'number',  'ABS(number)',                     'The value without its minus sign.'),
    ('fx.len',         1, 1,    'number',  'LEN(text)',                       'How many characters the text has.'),
    ('fx.upper',       1, 1,    'text',    'UPPER(text)',                     'The text in capitals.'),
    ('fx.lower',       1, 1,    'text',    'LOWER(text)',                     'The text in lower case.'),
    ('fx.trim',        1, 1,    'text',    'TRIM(text)',                      'The text without leading or trailing spaces.'),
    ('fx.concatenate', 1, null, 'text',    'CONCATENATE(text, …)',            'Joins every value into one piece of text. The & operator is the same join.'),
    ('fx.left',        2, 2,    'text',    'LEFT(text, count)',               'The first few characters of the text.'),
    ('fx.right',       2, 2,    'text',    'RIGHT(text, count)',              'The last few characters of the text.'),
    ('fx.contains',    2, 2,    'boolean', 'CONTAINS(text, part)',            'Yes when the text contains that part. Upper and lower case are treated the same.'),
    ('fx.if',          2, 3,    'unknown', 'IF(condition, then, otherwise?)', 'The second value when the condition holds, otherwise the third (empty when omitted).'),
    ('fx.and',         1, null, 'boolean', 'AND(condition, …)',               'Yes when every condition holds.'),
    ('fx.or',          1, null, 'boolean', 'OR(condition, …)',                'Yes when at least one condition holds.'),
    ('fx.not',         1, 1,    'boolean', 'NOT(condition)',                  'Turns yes into no and no into yes.'),
    ('fx.blank',       0, 0,    'unknown', 'BLANK()',                         'An empty value, for comparing against or returning.'),
    ('fx.isblank',     1, 1,    'boolean', 'ISBLANK(value)',                  'Yes when the value is empty.'),
    ('fx.today',       0, 0,    'date',    'TODAY()',                         'Today''s date.'),
    ('fx.now',         0, 0,    'date',    'NOW()',                           'The current date and time.'),
    ('fx.datediff',    3, 3,    'number',  'DATEDIFF(from, to, ''days'' | ''hours'' | ''minutes'' | ''seconds'' | ''months'' | ''years'')', 'How far the second date is after the first. Negative when it is earlier.'),
    ('fx.year',        1, 1,    'number',  'YEAR(date)',                      'The four-digit year of the date.'),
    ('fx.month',       1, 1,    'number',  'MONTH(date)',                     'The month of the date, 1 to 12.'),
    ('fx.day',         1, 1,    'number',  'DAY(date)',                       'The day of the month, 1 to 31.'),
    ('fx.dateadd',     3, 3,    'date',    'DATEADD(date, count, ''days'' | ''hours'' | ''minutes'' | ''months'' | ''years'')', 'The date moved forward by that many units. Use a negative count to go back.'),
    -- VIEWS-AND-FIELDS F4: seven of Airtable's functions, in Airtable's argument order
    ('fx.switch',      2, null, 'unknown', 'SWITCH(value, match, result, …, otherwise?)', 'The result beside the first match for the value, else the last value.'),
    ('fx.find',        2, 3,    'number',  'FIND(part, text, start?)',        'Where the part first appears, counting from 1, or 0; a start skips that many characters.'),
    ('fx.substitute',  3, 4,    'text',    'SUBSTITUTE(text, old, new, which?)', 'The text with every old part replaced, or only the numbered one.'),
    ('fx.regex_match', 2, 2,    'boolean', 'REGEX_MATCH(text, pattern)',      'Yes when the text matches the pattern.'),
    ('fx.datetime_format', 1, 2, 'text',   'DATETIME_FORMAT(date, format?)', 'The date written in the format given, such as ''MMM D, YYYY'', in UTC.'),
    ('fx.workday',     2, 3,    'date',    'WORKDAY(start, days, holidays?)', 'The date that many working days on, skipping weekends and the holidays listed.'),
    ('fx.arrayjoin',   1, 2,    'text',    'ARRAYJOIN(values, separator?)',   'Every value of a list as one piece of text, ", " between them unless told.'),
    ('fx.arraycompact', 1, 1,   'unknown', 'ARRAYCOMPACT(values)',            'The list without its empty values.'),
    -- FORMULA-2: lists, and the words of one item of a list
    ('fx.current',     0, 0,    'unknown', 'CURRENT()',                    'The list item a MAP, FILTER, FIND, SOME, EVERY or SORT is working on.'),
    ('fx.index',       0, 0,    'number',  'INDEX()',                      'The place of that item in its list, counting from 0.'),
    ('fx.current1',    0, 0,    'unknown', 'CURRENT1()',                   'The first of the two items a SORT comparator is comparing.'),
    ('fx.current2',    0, 0,    'unknown', 'CURRENT2()',                   'The second of the two items a SORT comparator is comparing.'),
    ('fx.recprop',     2, 2,    'unknown', 'RECPROP(record, column)',      'One column of a linked record, by its label: RECPROP(CURRENT(), "Done").'),
    ('fx.map',         2, 2,    'unknown', 'MAP(list, each)',              'A list of what the second value works out to for every item of the list.'),
    ('fx.filter',      2, 2,    'unknown', 'FILTER(list, keep)',           'The items of the list for which the second value holds.'),
    ('fx.findfirst',   2, 2,    'unknown', 'FINDFIRST(list, test)',        'The first item of the list for which the test holds, else empty.'),
    ('fx.some',        2, 2,    'boolean', 'SOME(list, test)',             'Yes when the test holds for at least one item.'),
    ('fx.every',       2, 2,    'boolean', 'EVERY(list, test)',            'Yes when the test holds for every item (an empty list holds).'),
    ('fx.length',      1, 1,    'number',  'LENGTH(list or text)',         'How many items a list has, or how many characters a text has.'),
    ('fx.at',          2, 2,    'unknown', 'AT(list, place)',              'The item at that place, counting from 0 (a negative place counts from the end).'),
    ('fx.first',       1, 1,    'unknown', 'FIRST(list)',                  'The first item of the list.'),
    ('fx.last',        1, 1,    'unknown', 'LAST(list)',                   'The last item of the list.'),
    ('fx.sort',        1, 2,    'unknown', 'SORT(list, compare?)',         'The list in order. A comparison written with CURRENT1() and CURRENT2() sets the order.'),
    ('fx.unique',      1, 1,    'unknown', 'UNIQUE(list)',                 'The list with each item once.'),
    ('fx.reverse',     1, 1,    'unknown', 'REVERSE(list)',                'The list backwards.'),
    ('fx.slice',       2, 3,    'unknown', 'SLICE(list, from, to?)',       'The items from one place up to, not including, another (counting from 0).'),
    ('fx.join',        1, 2,    'text',    'JOIN(list, separator?)',       'Every item of the list as one piece of text, ", " between them unless told.'),
    ('fx.split',       2, 2,    'unknown', 'SPLIT(text, separator)',       'The text cut into a list at every separator.'),
    ('fx.includes',    2, 2,    'boolean', 'INCLUDES(list, value)',        'Yes when the list has that value as one of its items.'),
    ('fx.median',      1, null, 'number',  'MEDIAN(number, …)',            'The middle value, ignoring empty ones. A list counts as all its values.'),
    ('fx.regexreplace', 3, 4,   'text',    'REGEXREPLACE(text, pattern, new, all?)', 'The text with the first match of the pattern replaced, or every match when all is yes.'),
    -- the operators
    ('fx.add',         2, 2,    'number',  'a + b',  'A sum. An empty value counts as 0.'),
    ('fx.sub',         2, 2,    'number',  'a - b',  'A difference. An empty value counts as 0.'),
    ('fx.mul',         2, 2,    'number',  'a * b',  'A product. An empty value counts as 0.'),
    ('fx.div',         2, 2,    'number',  'a / b',  'A quotient. Dividing by zero is refused by name.'),
    ('fx.mod',         2, 2,    'number',  'a % b',  'What is left over after dividing. Dividing by zero is refused by name.'),
    ('fx.neg',         1, 1,    'number',  '-a',     'The value with its sign turned over.'),
    ('fx.eq',          2, 2,    'boolean', 'a = b',  'The same. Numbers compare as numbers, anything else as text; an empty value matches 0 and "".'),
    ('fx.ne',          2, 2,    'boolean', 'a != b', 'Not the same (also written <>).'),
    ('fx.lt',          2, 2,    'boolean', 'a < b',  'Less than.'),
    ('fx.lte',         2, 2,    'boolean', 'a <= b', 'At most.'),
    ('fx.gt',          2, 2,    'boolean', 'a > b',  'Greater than.'),
    ('fx.gte',         2, 2,    'boolean', 'a >= b', 'At least.'),
    -- AIRTABLE PARITY (lane AT-FORMULA): the functions Airtable has and the store did not
    ('fx.ceiling',    1, 2,    'number',  'CEILING(value, significance?)',   'Rounds up to the nearest multiple of the significance (1 when omitted).'),
    ('fx.floor',      1, 2,    'number',  'FLOOR(value, significance?)',     'Rounds down to the nearest multiple of the significance (1 when omitted).'),
    ('fx.int',        1, 1,    'number',  'INT(value)',                      'The greatest whole number that is not more than the value.'),
    ('fx.power',      2, 2,    'number',  'POWER(base, power)',              'The base raised to the power.'),
    ('fx.sqrt',       1, 1,    'number',  'SQRT(value)',                     'The square root of a number that is 0 or more.'),
    ('fx.exp',        1, 1,    'number',  'EXP(power)',                      'The number e raised to the power.'),
    ('fx.log',        1, 2,    'number',  'LOG(number, base?)',              'The logarithm of the number in the base (10 when omitted).'),
    ('fx.roundup',    1, 2,    'number',  'ROUNDUP(value, places?)',         'Rounds away from zero to the given number of decimal places.'),
    ('fx.rounddown',  1, 2,    'number',  'ROUNDDOWN(value, places?)',       'Rounds toward zero to the given number of decimal places.'),
    ('fx.even',       1, 1,    'number',  'EVEN(value)',                     'Rounds away from zero to the next even whole number.'),
    ('fx.odd',        1, 1,    'number',  'ODD(value)',                      'Rounds away from zero to the next odd whole number.'),
    ('fx.count',      1, null, 'number',  'COUNT(value, …)',                 'How many of the values are numbers. A list counts as all its values.'),
    ('fx.counta',     1, null, 'number',  'COUNTA(value, …)',                'How many of the values are not empty. A list counts as all its values.'),
    ('fx.countall',   1, null, 'number',  'COUNTALL(value, …)',              'How many values there are, empty ones too. A list counts as all its values.'),
    ('fx.value',      1, 1,    'number',  'VALUE(text)',                     'The text read as a number: "$1,000" is 1000.'),
    ('fx.mid',        3, 3,    'text',    'MID(text, start, count)',         'Count characters of the text from the start place, counting from 0 (MID("quick brown fox", 6, 5) is brown).'),
    ('fx.replace',    4, 4,    'text',    'REPLACE(text, start, count, new)', 'The text with count characters from the start place (counting from 1) swapped for the new text.'),
    ('fx.rept',       2, 2,    'text',    'REPT(text, times)',               'The text repeated that many times.'),
    ('fx.search',     2, 3,    'number',  'SEARCH(part, text, start?)',      'Where the part first appears, counting from 1, empty when it is not there. Upper and lower case are treated the same.'),
    ('fx.t',          1, 1,    'text',    'T(value)',                        'The value when it is text, otherwise empty.'),
    ('fx.encode_url_component', 1, 1, 'text', 'ENCODE_URL_COMPONENT(text)', 'The text made safe for a web address: "a & b" is a%20%26%20b.'),
    ('fx.xor',        1, null, 'boolean', 'XOR(condition, …)',               'Yes when an odd number of the conditions hold.'),
    ('fx.iserror',    1, 1,    'boolean', 'ISERROR(value)',                  'Yes when working out the value would be refused, such as 2 / 0.'),
    ('fx.error',      0, 0,    'unknown', 'ERROR()',                         'Makes the cell an error, for IF to return when a value is not allowed.'),
    ('fx.true',       0, 0,    'boolean', 'TRUE()',                          'Yes.'),
    ('fx.false',      0, 0,    'boolean', 'FALSE()',                         'No.'),
    ('fx.is_before',  2, 2,    'boolean', 'IS_BEFORE(date1, date2)',         'Yes when the first date is earlier than the second.'),
    ('fx.is_after',   2, 2,    'boolean', 'IS_AFTER(date1, date2)',          'Yes when the first date is later than the second.'),
    ('fx.is_same',    2, 3,    'boolean', 'IS_SAME(date1, date2, unit?)',    'Yes when the dates match down to the unit (''day'', ''hour'', …); to the second when no unit is given.'),
    ('fx.hour',       1, 1,    'number',  'HOUR(date)',                      'The hour of the date, 0 to 23 (UTC).'),
    ('fx.minute',     1, 1,    'number',  'MINUTE(date)',                    'The minute of the date, 0 to 59.'),
    ('fx.second',     1, 1,    'number',  'SECOND(date)',                    'The second of the date, 0 to 59.'),
    ('fx.weekday',    1, 2,    'number',  'WEEKDAY(date, startDay?)',        'The day of the week, 0 to 6. Weeks start on Sunday unless a day such as ''Monday'' is given.'),
    ('fx.weeknum',    1, 2,    'number',  'WEEKNUM(date, startDay?)',        'The week of the year; the week holding 1 January is week 1. Weeks start on Sunday unless a day is given.'),
    ('fx.workday_diff', 2, 3,  'number',  'WORKDAY_DIFF(start, end, holidays?)', 'The working days from the start date to the end date, both counted, skipping weekends and the holidays listed.'),
    ('fx.datestr',    1, 1,    'text',    'DATESTR(date)',                   'The date as YYYY-MM-DD.'),
    ('fx.timestr',    1, 1,    'text',    'TIMESTR(date)',                   'The time of day as HH:mm:ss.'),
    ('fx.datetime_parse', 1, 3, 'date',   'DATETIME_PARSE(text, format?, locale?)', 'Reads text as a date; the format names its parts, such as ''D MMM YYYY HH:mm''.'),
    ('fx.datetime_diff', 2, 3, 'number',  'DATETIME_DIFF(date1, date2, unit?)', 'The first date minus the second, in whole units (seconds when omitted). Negative when the second is later.'),
    ('fx.tonow',      1, 2,    'number',  'TONOW(date, unit?)',              'How far the date is from now, in whole days unless a unit is given. Negative once it is past.'),
    ('fx.fromnow',    1, 2,    'number',  'FROMNOW(date, unit?)',            'How long ago the date was, in whole days unless a unit is given.'),
    ('fx.set_timezone', 2, 2,  'date',    'SET_TIMEZONE(date, zone)',        'The date in another time zone, such as ''Australia/Sydney''. DATETIME_FORMAT writes it in that zone.'),
    ('fx.set_locale', 2, 2,    'date',    'SET_LOCALE(date, locale)',        'The date for a locale. Only English is available.'),
    ('fx.arrayunique', 1, 1,   'unknown', 'ARRAYUNIQUE(values)',             'The list with each item once.'),
    ('fx.arrayflatten', 1, 1,  'unknown', 'ARRAYFLATTEN(values)',            'The list with lists inside it spread out, empty items dropped.'),
    ('fx.arrayslice', 2, 3,    'unknown', 'ARRAYSLICE(values, start, end?)', 'The items from the start place to the end place, both counted from 1; a negative place counts from the end.'),
    ('fx.regex_extract', 2, 2, 'text',    'REGEX_EXTRACT(text, pattern)',    'The first part of the text that matches the pattern (its first bracketed group when it has one), empty when none does.'),
    ('fx.regex_replace', 3, 3, 'text',    'REGEX_REPLACE(text, pattern, new)', 'The text with every match of the pattern replaced.'),
    ('fx.record_id',  0, 0,    'text',    'RECORD_ID()',                     'The record''s own id.'),
    ('fx.last_modified_time', 0, null, 'date', 'LAST_MODIFIED_TIME(column, …)', 'When the record was last changed.'),
    -- the store's own column kinds (G5)
    ('fx.autonumber',  0, 0,    'number',  'AUTONUMBER()',    'The record''s number in this table: assigned once, when the record is first written, never reused.'),
    ('fx.created_time',0, 0,    'date',    'CREATED_TIME()',  'When the record was created.'),
    ('fx.modified_time',0, 0,   'date',    'MODIFIED_TIME()', 'When the record was last changed.')
  ) as t(node, min_args, max_args, result, signature, says)
$function$;
