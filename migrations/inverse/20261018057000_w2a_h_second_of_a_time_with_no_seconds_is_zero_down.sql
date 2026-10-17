-- inverse of 20261018057000_w2a_h_second_of_a_time_with_no_seconds_is_zero.sql
-- chair-step: put back the body 20261018057000_w2a_h_second_of_a_time_with_no_seconds_is_zero.sql replaced
-- lane: W2-A
-- lock: custom
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
      -- W2-A 1: a time of day (a time column's HH:MM[:SS]) is read as itself.
      if jsonb_typeof(v_a) = 'string' and (v_a #>> '{}') ~ '^[0-9]{1,2}:[0-5][0-9](:[0-5][0-9])?$' then
        return to_jsonb(split_part(v_a #>> '{}', ':', case p_op when 'fx.hour' then 1 when 'fx.minute' then 2 else 3 end)::integer
                        * case when p_op = 'fx.second' and split_part(v_a #>> '{}', ':', 3) = '' then 0 else 1 end);
      end if;
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
