-- lane: close-formula
-- lock: custom
-- additive: yes
-- based-on: custom.agg_value_text(jsonb) b934856ef781b33843cf1f8ce6440fb6555ea203c5d9534cf3498ee244496304
-- based-on: custom.filter_list_op(text, jsonb, jsonb) 05e6686c6ce2deeca1660635b7fa9ea45008007e4df9b8fd0f2c53ee20d1cf81
-- based-on: custom.record_filter_sql(jsonb) 5bde1ee47901fffe2bdc15c34fbd1ab3858dc10dcb7aa6b661917052451864ca
-- CLOSE-FORMULA (CD-FORMULA-06, 2026-10-22): "A formula column can be filtered like any other column."
-- "Total is 60.5" answered NO rows on a formula Total = ROUND({Qty} * {Price} * 1.1, 2). A worked-out number is a
-- numeric with the scale its arithmetic gave it, so its text is "60.50", and every text comparison of a cell with a
-- question ("60.5") failed: the flat equality the grid sends for one column (`{"total": 60.5}`), the Values list
-- (`{"total": [60.5, 11]}`), "is none of", and the same on a roll-up of a formula. The Rule form (`eq`) compared
-- numbers and was right, which is why "greater than" worked and "is" did not.
-- The class: a NUMBER compared as words. Fixed in the three places a cell or a question becomes words:
--   custom.agg_value_text      a worked-out value's text (formula, lookup, roll-up; what the aggregate and the flat
--                              filter read): a number is written in its shortest form (trim_scale), 60.50 -> 60.5.
--   custom.filter_list_op      every list question's words (flat lists, is_not, and the Rule list operators): a number
--                              element is its shortest form on BOTH sides.
--   custom.record_filter_sql(jsonb)  the flat equality's question: a number asked as 60.50 is asked as 60.5.
-- Text, choices, ids, dates and true/false are untouched. Guard: scripts/campaign-tests/closeformula_number_filter_green.sql
-- (RED without this file: "1 admin: Total is 60.5 answered []"; GREEN with it, as admin and as a member).

set lock_timeout = '3s';
set statement_timeout = '60s';

CREATE OR REPLACE FUNCTION custom.agg_value_text(p_value jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO 'pg_catalog'
AS $function$
  -- One worked-out Value as the text the aggregate casts: the ENVELOPE's value when there is one
  -- (`{"value": …}`), the scalar itself otherwise, NULL for no answer.
  -- CLOSE-FORMULA (2026-10-22): a number is written in its own shortest form, so 60.50 and 60.5 are one answer.
  select case when jsonb_typeof(p_value) = 'object' and p_value ? 'value' then
                case when jsonb_typeof(p_value -> 'value') = 'number' then trim_scale((p_value -> 'value')::numeric)::text
                     else p_value ->> 'value' end
              when p_value is null or jsonb_typeof(p_value) = 'null' then null
              when jsonb_typeof(p_value) = 'number' then trim_scale((p_value)::numeric)::text
              else p_value #>> '{}' end;
$function$;

CREATE OR REPLACE FUNCTION custom.filter_list_op(p_op text, p_a jsonb, p_b jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_a   text[];
  v_b   text[];
  v_res boolean;
begin
  -- NOTION-Q (2026-10-14): A CELL IS A LIST OF WORDS, WHATEVER IT HOLDS. A multi-select keeps an array of
  -- choice keys, a relation an array of record ids, a select or text ONE value, an empty cell nothing. Every
  -- list question (Notion: contains / does not contain / is empty / is not empty; Airtable: has any of /
  -- has all of / has none of / is exactly) is asked of that list of lower-cased words, so "Platforms
  -- contains Instagram" is true of ["Instagram","TikTok"] — it used to compare the whole list's text with
  -- one word and match no row. The answer is always true or false, never "undecided": an empty cell does
  -- not contain anything and IS empty.
  v_a := case coalesce(jsonb_typeof(p_a), 'null')
    when 'array' then coalesce((select array_agg(case when jsonb_typeof(e) = 'number' then trim_scale((e)::numeric)::text
                                                      else lower(btrim(e #>> '{}')) end) from jsonb_array_elements(p_a) e
                                 where jsonb_typeof(e) <> 'null' and btrim(e #>> '{}') <> ''), '{}'::text[])
    when 'null' then '{}'::text[]
    when 'string' then case when btrim(p_a #>> '{}') = '' then '{}'::text[] else array[lower(btrim(p_a #>> '{}'))] end
    when 'number' then array[trim_scale((p_a)::numeric)::text]
    else array[lower(p_a #>> '{}')] end;
  v_b := case coalesce(jsonb_typeof(p_b), 'null')
    when 'array' then coalesce((select array_agg(case when jsonb_typeof(e) = 'number' then trim_scale((e)::numeric)::text
                                                      else lower(btrim(e #>> '{}')) end) from jsonb_array_elements(p_b) e
                                 where jsonb_typeof(e) <> 'null'), '{}'::text[])
    when 'null' then '{}'::text[]
    when 'number' then array[trim_scale((p_b)::numeric)::text]
    else array[lower(btrim(p_b #>> '{}'))] end;

  if p_op = 'is_empty' then
    v_res := cardinality(v_a) = 0;
  elsif p_op = 'is_not_empty' then
    v_res := cardinality(v_a) > 0;
  elsif p_op in ('contains', 'not_contains') then
    -- One word in text is a substring (Notion's text "contains"); one word in a list is membership; several
    -- words are "any of them".
    if jsonb_typeof(p_a) = 'string' and jsonb_typeof(p_b) = 'string' then
      v_res := cardinality(v_b) > 0 and position(v_b[1] in lower(p_a #>> '{}')) > 0;
    else
      v_res := v_a && v_b;
    end if;
    if p_op = 'not_contains' then v_res := not v_res; end if;
  elsif p_op in ('has_any', 'any_of') then
    v_res := v_a && v_b;
  elsif p_op = 'has_all' then
    v_res := v_a @> v_b;
  elsif p_op in ('has_none', 'is_not') then
    v_res := not (v_a && v_b);
  elsif p_op = 'is_exactly' then
    v_res := v_a @> v_b and v_b @> v_a;
  else
    raise exception 'a list filter does not know how to "%"', p_op
      using errcode = '22023',
            hint = 'NOTION-Q: contains, not_contains, has_any, has_all, has_none, is_exactly, is_empty, is_not_empty.';
  end if;
  return to_jsonb(v_res);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.record_filter_sql(p_filter jsonb)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_where text[] := '{}';
  v_key   text;
begin
  -- S2-PRIME FILTER-GROUPS: A RULE EXPRESSION IS NOT A FLAT MAP, AND IS NEVER READ AS ONE. Read
  -- here, `{"op": "and", "args": [...]}` would become `op = 'and' and args = '[...]'` — a filter
  -- that silently matches nothing. It is compiled by the three-argument form, which knows the
  -- table its field ids belong to and which columns the reader may see.
  if custom.filter_is_rule(p_filter) then
    raise exception 'this filter is a Rule expression, and it has to be asked of a table'
      using errcode = '22023',
            hint = 'Call custom.record_filter_sql(organization, table, filter): it resolves every field id to that table''s own column and asks it over the reader''s visible columns. Nothing was read.';
  end if;

  -- DATA-V2-BASICS (BREAKER-1 F12), 2026-09-27: A FILTER THAT IS NOT A SET OF CONDITIONS IS
  -- REFUSED, NEVER READ AS "NO FILTER". `p_filter = "status"` (a bare string) answered as if
  -- nothing had been asked — the one probe of eight on the read door without an honest refusal.
  if p_filter is not null and jsonb_typeof(p_filter) not in ('object', 'null') then
    raise exception 'A filter is a set of column conditions, like {"status": "Verified"}, and this one is a %.', jsonb_typeof(p_filter)
      using errcode = '22023',
            hint = 'Send an object that names each column and what it must be, or leave the filter out to read every row. Nothing was read.';
  end if;

  -- A SCALAR IS AN EQUALITY. `null` IS UNSET. AN OBJECT IS A WINDOW. This is the shape
  -- `platform.saved_view.definition -> 'filters'` has always carried and the shape
  -- `custom.record_aggregate(p_filter)` has always taken — read here once, for both.
  if p_filter is not null and jsonb_typeof(p_filter) = 'object' then
    for v_key in select k from jsonb_object_keys(p_filter) k loop
      if jsonb_typeof(p_filter -> v_key) = 'object' then
        v_where := array_append(v_where, custom.dashboard_window_sql(v_key, p_filter -> v_key));
      elsif jsonb_typeof(p_filter -> v_key) = 'null' then
        -- LIMITS-FIX 2026-09-21 — THE THIRD STATE. A tick box has three answers: yes, no,
        -- and nobody has said yet. Asking for `null` used to compare the missing value
        -- against the empty string and answer NO ROWS.
        v_where := array_append(v_where, format('(%s) is null', custom.agg_value_sql(v_key)));
      else
        v_where := array_append(v_where,
          format('%s = %L', custom.agg_value_sql(v_key),
                 -- CLOSE-FORMULA (2026-10-22): a number asked as 60.50 is the number 60.5 (see the header).
                 case when jsonb_typeof(p_filter -> v_key) = 'number'
                      then trim_scale((p_filter -> v_key)::numeric)::text
                      else p_filter ->> v_key end));
      end if;
    end loop;
  end if;

  -- `true` rather than an empty string, so every caller writes `and (<this>)` and no caller
  -- has to remember whether the fragment brings its own conjunction.
  if cardinality(v_where) = 0 then
    return 'true';
  end if;
  return '(' || array_to_string(v_where, ' and ') || ')';
end;
$function$;
