-- target: branch,production
-- additive: yes
--   ADDS helpers (custom._fx_unit_norm, _fx_dl, _fx_arr, _fx_flat, _fx_flatten, _fx_months_between,
--   _fx_datetime_parse, _fx_ext) and REPLACES four bodies: custom.formula_node_kinds (+51 functions),
--   custom.formula_eval (routes them; ISERROR and the array functions read their arguments lazily;
--   DATEADD takes weeks, quarters, seconds, milliseconds; DATETIME_FORMAT writes a SET_TIMEZONE date in
--   its zone), custom._fxp_level (CREATED_TIME() and MODIFIED_TIME() may be typed by name),
--   custom._fxc_context_free (RECORD_ID and LAST_MODIFIED_TIME read the record, so are never planned).
--   No table, column, trigger, policy, grant or row is touched. Inverse:
--   migrations/inverse/formula_a_the_airtable_functions_are_all_here_down.sql
-- guard: custom/system_enabled
-- lock: custom
-- based-on: custom.formula_node_kinds() 71eab1368c6090a8fa151e5bc5848b2200bc29a5e28f44d552fdb2efe9f3a266
-- based-on: custom.formula_eval(uuid, jsonb, jsonb, jsonb) 8b2daf1122ea9783c94f7c4b7cc3b2acd678e5cc1fedc5dc635c786a94d09f14
-- based-on: custom._fxp_level(jsonb, integer, integer) 5076f14015d2afda5a4a926b6ede200b3a5d2a577d3ee84e0563d77c951ebadb
-- based-on: custom._fxc_context_free(jsonb) 2878e4b74b0e707c304e6e38409005ceab6a1ac55aa9a4f3cc39b0c15475b991
--
-- LANE AT-FORMULA (Airtable parity lane 2). Champion: support.airtable.com Formula field reference.
-- Every function takes Airtable's arguments in Airtable's order. Dates are UTC. Nothing here is a window-class lock.

set local statement_timeout = '60s';

-- ═════════════════════════════════════════════════════════════════════════════════════════
-- HELPERS (new, additive)
-- ═════════════════════════════════════════════════════════════════════════════════════════

-- Airtable's unit specifiers for DATEADD / DATETIME_DIFF / IS_SAME, as one canonical word.
-- Single letters are case-sensitive, as in Airtable: m = minute, M = month.
create function custom._fx_unit_norm(p_v jsonb, p_fn text)
returns text
language plpgsql
immutable
set search_path to 'pg_catalog'
as $fn$
declare
  v_raw text := btrim(custom._fx_text(p_v));
  v_low text := lower(v_raw);
begin
  if v_raw in ('ms') or v_low in ('millisecond', 'milliseconds') then return 'millisecond'; end if;
  if v_raw = 's' or v_low in ('second', 'seconds') then return 'second'; end if;
  if v_raw = 'm' or v_low in ('minute', 'minutes') then return 'minute'; end if;
  if v_raw = 'h' or v_low in ('hour', 'hours') then return 'hour'; end if;
  if v_raw = 'd' or v_low in ('day', 'days') then return 'day'; end if;
  if v_raw = 'w' or v_low in ('week', 'weeks') then return 'week'; end if;
  if v_raw = 'M' or v_low in ('month', 'months') then return 'month'; end if;
  if v_raw = 'Q' or v_low in ('quarter', 'quarters') then return 'quarter'; end if;
  if v_raw = 'y' or v_low in ('year', 'years') then return 'year'; end if;
  raise exception '`%` needs a unit such as ''days'', ''hours'' or ''months'' — got "%".', p_fn, v_raw using errcode = '22023';
end
$fn$;

-- A date as Airtable reads one: the ISO text the language writes, or M/D/YY(YY) and D Mon YYYY with
-- an optional time of day. UTC, as everywhere here.
create function custom._fx_dl(p_v jsonb, p_what text, out ts timestamp, out date_only boolean)
returns record
language plpgsql
immutable
set search_path to 'pg_catalog'
as $fn$
declare
  v_s text;
  m   text[];
  v_y integer;
  v_mo integer;
begin
  if jsonb_typeof(p_v) = 'string' then
    v_s := btrim(p_v #>> '{}');
    m := regexp_match(v_s, '^(\d{1,2})/(\d{1,2})/(\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$');
    if m is not null then
      v_y := m[3]::integer;
      if length(m[3]) = 2 then v_y := case when v_y < 69 then 2000 + v_y else 1900 + v_y end; end if;
      begin
        ts := make_timestamp(v_y, m[1]::integer, m[2]::integer, coalesce(m[4], '0')::integer, coalesce(m[5], '0')::integer,
                             coalesce(m[6], '0')::integer);
        date_only := m[4] is null;
        return;
      exception when others then
        raise exception '% needs a date, but got "%".', p_what, v_s using errcode = '22023';
      end;
    end if;
    m := regexp_match(v_s, '^(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$');
    if m is not null then
      v_mo := (select i from generate_series(1, 12) i
                where lower(to_char(make_date(2000, i, 1), 'FMMonth')) like lower(left(m[2], 3)) || '%' limit 1);
      if v_mo is not null then
        begin
          ts := make_timestamp(m[3]::integer, v_mo, m[1]::integer, coalesce(m[4], '0')::integer, coalesce(m[5], '0')::integer,
                               coalesce(m[6], '0')::integer);
          date_only := m[4] is null;
          return;
        exception when others then
          raise exception '% needs a date, but got "%".', p_what, v_s using errcode = '22023';
        end;
      end if;
    end if;
  end if;
  select d.ts, d.date_only into ts, date_only from custom._fx_date(p_v, p_what) d;
end
$fn$;

-- The items of a value that is a list (or the JSON text of one), a single value as a list of one.
create function custom._fx_arr(p_v jsonb)
returns jsonb
language plpgsql
immutable
set search_path to 'pg_catalog'
as $fn$
begin
  if p_v is null or jsonb_typeof(p_v) = 'null' then return '[]'::jsonb; end if;
  if jsonb_typeof(p_v) = 'array' then return p_v; end if;
  if jsonb_typeof(p_v) = 'string' and btrim(p_v #>> '{}') like '[%' then
    begin
      return (p_v #>> '{}')::jsonb;
    exception when others then
      null;
    end;
  end if;
  return jsonb_build_array(p_v);
end
$fn$;

-- Every item of the arguments, a list argument counting as all its items (one level).
create function custom._fx_flat(p_vals jsonb[])
returns jsonb
language sql
immutable
set search_path to 'pg_catalog'
as $fn$
  select coalesce(jsonb_agg(e.x order by u.i, e.j), '[]'::jsonb)
    from unnest(p_vals) with ordinality u(v, i),
         lateral jsonb_array_elements(case when jsonb_typeof(custom._fx_arr(u.v)) = 'array'
                                           then custom._fx_arr(u.v) else '[]'::jsonb end) with ordinality e(x, j)
$fn$;

-- ARRAYFLATTEN's recursion: nested lists spread out, empty items dropped.
create function custom._fx_flatten(p_v jsonb)
returns jsonb
language sql
immutable
set search_path to 'pg_catalog'
as $fn$
  select case
    when jsonb_typeof(p_v) = 'array' then
      coalesce((select jsonb_agg(f.x order by u.i, f.j)
                  from jsonb_array_elements(p_v) with ordinality u(x, i),
                       lateral jsonb_array_elements(
                         case when jsonb_typeof(u.x) = 'array' then custom._fx_flatten(u.x)
                              when custom._fx_blank(u.x) then '[]'::jsonb
                              else jsonb_build_array(u.x) end) with ordinality f(x, j)), '[]'::jsonb)
    when custom._fx_blank(p_v) then '[]'::jsonb
    else jsonb_build_array(p_v) end
$fn$;

-- DATETIME_DIFF's whole months from p_b to p_a, toward zero (moment's rule).
create function custom._fx_months_between(p_a timestamp, p_b timestamp)
returns integer
language plpgsql
immutable
set search_path to 'pg_catalog'
as $fn$
declare
  v_lo timestamp := least(p_a, p_b);
  v_hi timestamp := greatest(p_a, p_b);
  v_m  integer := (extract(year from v_hi)::integer - extract(year from v_lo)::integer) * 12
                  + extract(month from v_hi)::integer - extract(month from v_lo)::integer;
begin
  if v_lo + make_interval(months => v_m) > v_hi then v_m := v_m - 1; end if;
  return case when p_a >= p_b then v_m else -v_m end;
end
$fn$;

-- DATETIME_PARSE(text, format?, locale?): moment's input specifiers (English), UTC.
create function custom._fx_datetime_parse(p_text text, p_format text)
returns timestamp
language plpgsql
immutable
set search_path to 'pg_catalog'
as $fn$
declare
  c_months constant text[] := array['january','february','march','april','may','june','july','august','september','october','november','december'];
  v_re   text := '^';
  v_toks text[] := '{}';
  v_pos  integer := 1;
  v_m    text[];
  v_tok  text;
  v_got  text[];
  i      integer;
  v_y integer := 1970; v_mo integer := 1; v_d integer := 1; v_h integer := 0; v_mi integer := 0; v_s integer := 0;
  v_ms integer := 0; v_pm boolean; v_off integer := 0;
  v_idx integer;
begin
  while v_pos <= char_length(p_format) loop
    v_m := regexp_match(substr(p_format, v_pos), '^(YYYY|YY|MMMM|MMM|MM|M|DD|Do|D|dddd|ddd|HH|H|hh|h|mm|m|ss|s|SSS|A|a|ZZ|Z|\[[^\]]*\])');
    if v_m is null then
      v_re := v_re || regexp_replace(substr(p_format, v_pos, 1), '([\\.^$|?*+()\[\]{}])', '\\\1', 'g');
      v_pos := v_pos + 1;
      continue;
    end if;
    v_tok := v_m[1];
    v_pos := v_pos + char_length(v_tok);
    if left(v_tok, 1) = '[' then
      v_re := v_re || regexp_replace(substr(v_tok, 2, char_length(v_tok) - 2), '([\\.^$|?*+()\[\]{}])', '\\\1', 'g');
      continue;
    end if;
    v_toks := v_toks || v_tok;
    v_re := v_re || case v_tok
      when 'YYYY' then '(\d{4})' when 'YY' then '(\d{2})'
      when 'MMMM' then '([A-Za-z]{3,9})' when 'MMM' then '([A-Za-z]{3,4})'
      when 'Do' then '(\d{1,2})(?:st|nd|rd|th)'
      when 'dddd' then '([A-Za-z]+)' when 'ddd' then '([A-Za-z]+)'
      when 'SSS' then '(\d{3})' when 'A' then '([AaPp][Mm])' when 'a' then '([AaPp][Mm])'
      when 'ZZ' then '(Z|[+-]\d{2}:?\d{2})' when 'Z' then '(Z|[+-]\d{2}:?\d{2})'
      else '(\d{1,2})' end;
  end loop;
  v_got := regexp_match(btrim(p_text), v_re || '$');
  if v_got is null then
    raise exception '`DATETIME_PARSE` cannot read "%" as "%".', p_text, p_format using errcode = '22023';
  end if;
  for i in 1 .. cardinality(v_toks) loop
    v_tok := v_toks[i];
    case v_tok
      when 'YYYY' then v_y := v_got[i]::integer;
      when 'YY' then v_y := case when v_got[i]::integer < 69 then 2000 + v_got[i]::integer else 1900 + v_got[i]::integer end;
      when 'MMMM', 'MMM' then
        v_idx := (select k from generate_series(1, 12) k where left(c_months[k], 3) = lower(left(v_got[i], 3)) limit 1);
        if v_idx is null then
          raise exception '`DATETIME_PARSE` does not know the month "%".', v_got[i] using errcode = '22023';
        end if;
        v_mo := v_idx;
      when 'MM', 'M' then v_mo := v_got[i]::integer;
      when 'DD', 'D', 'Do' then v_d := v_got[i]::integer;
      when 'HH', 'H', 'hh', 'h' then v_h := v_got[i]::integer;
      when 'mm', 'm' then v_mi := v_got[i]::integer;
      when 'ss', 's' then v_s := v_got[i]::integer;
      when 'SSS' then v_ms := v_got[i]::integer;
      when 'A', 'a' then v_pm := upper(v_got[i]) = 'PM';
      when 'ZZ', 'Z' then
        if v_got[i] <> 'Z' then
          v_off := (case when left(v_got[i], 1) = '-' then -1 else 1 end)
                   * (substr(v_got[i], 2, 2)::integer * 60 + right(v_got[i], 2)::integer);
        end if;
      else null;
    end case;
  end loop;
  if v_pm is not null then
    v_h := (v_h % 12) + case when v_pm then 12 else 0 end;
  end if;
  begin
    return make_timestamp(v_y, v_mo, v_d, v_h, v_mi, v_s + v_ms / 1000.0) - make_interval(mins => v_off);
  exception when others then
    raise exception '`DATETIME_PARSE` read "%" as a date that does not exist.', p_text using errcode = '22023';
  end;
end
$fn$;

-- Airtable's numeric and text additions, array and date comparisons: one place, called by formula_eval
-- with every argument already worked out.
create function custom._fx_ext(p_organization_id uuid, p_op text, p_vals jsonb[], p_context jsonb)
returns jsonb
language plpgsql
stable
set search_path to 'pg_catalog'
as $fn$
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
      return to_jsonb(substr(custom._fx_text(v_a), greatest(v_x, 1)::integer, greatest(v_y, 0)::integer));
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
$fn$;

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
    ('fx.mid',        3, 3,    'text',    'MID(text, start, count)',         'Count characters of the text from the start place, counting from 1.'),
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

CREATE OR REPLACE FUNCTION custom._fxc_context_free(p_expr jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  -- Does this formula (part) need nothing of its record but the record's values? Constants,
  -- columns and the formula language's own functions do — except AUTONUMBER, CREATED_TIME,
  -- MODIFIED_TIME, and the Created by / Last changed by stamps (fx.created_by, fx.modified_by), which read the record itself. Anything else is a Rule node, whose answer can
  -- depend on the record's parent, its siblings or who is acting (custom.rule_context).
  with recursive n(e) as (
    select p_expr
    union all
    select a.value
      from n, jsonb_array_elements(case when jsonb_typeof(n.e) = 'object' and jsonb_typeof(n.e -> 'args') = 'array'
                                        then n.e -> 'args' else '[]'::jsonb end) a
  )
  -- The Rule nodes that read nothing but the values (custom.rule_eval): arithmetic and comparisons,
  -- joining words, AND / OR, present, length, matches. NOT is left out: its answer for an unknown
  -- depends on why the Rule is asked (p_context.purpose).
  select coalesce(bool_and(
           jsonb_typeof(n.e) = 'object'
           and ((select array_agg(k order by k) from jsonb_object_keys(n.e) k) in (array['const'], array['field'])
                or (left(coalesce(n.e ->> 'op', ''), 3) = 'fx.'
                    and (n.e ->> 'op') not in ('fx.autonumber', 'fx.created_time', 'fx.modified_time', 'fx.created_by', 'fx.modified_by', 'fx.record_id', 'fx.last_modified_time')
                    and (select array_agg(k order by k) from jsonb_object_keys(n.e) k) in (array['op'], array['args', 'op']))
                or ((n.e ->> 'op') in ('add', 'sub', 'mul', 'div', 'lt', 'lte', 'gt', 'gte', 'eq', 'ne',
                                       'and', 'or', 'present', 'length', 'matches')
                    and (select array_agg(k order by k) from jsonb_object_keys(n.e) k) = array['args', 'op'])
                or ((n.e ->> 'op') = 'concat'
                    and (select array_agg(k order by k) from jsonb_object_keys(n.e) k)
                        in (array['args', 'op'], array['args', 'op', 'separator'])))), false)
    from n;
$function$;
