-- lane: CHART-READ-2
-- lock: custom
-- based-on: custom.agg_sql(uuid, uuid, jsonb, jsonb, jsonb, jsonb, integer, text, jsonb, text, text) a69218debf799be9f7f87eb69c295d8500cffdc3d68d62716bad657857ee6d60
-- based-on: custom.record_aggregate(uuid, uuid, jsonb, jsonb, jsonb, jsonb, integer, text, jsonb, text, text) 8670d94fd46c83c3f8c9e22c1502a1d80397b8c6d27469a8c0ee5df2aadf7a02
-- based-on: custom.dashboard_run(uuid, uuid, jsonb, jsonb, text) 16c1d88c86ea0b615c8d5b2a9fe49983262a52506da329851874ee5184f1255e
-- based-on: custom.interface_chart(uuid, text) 70043935b865a0de07e053aadc4473cd08f1e5369917c95cb091842fe0d450f4
-- scope: Airtable rule - a CHART (and a dashboard number / chart tile) counts each option of a many-value column separately (a row with A and B
--   counts once under A and once under B); a GRID group-by groups by the exact combination. One home: custom.agg_sql takes split_multi
--   (default false: grid group-by, grid summaries, drill, subscriptions are unchanged), custom.record_aggregate passes it through,
--   custom.dashboard_run's blocks and custom.interface_chart (an outsider's chart) ask for it. Multi-links split by linked record id (the
--   client names them from the linked record's primary field as it does today); multi-selects by option. The two functions that gain an argument are re-created with a 12th argument that defaults to false, so every existing caller is untouched.
-- chair-step: replaces two functions by their longer-signature forms (the 11-argument custom.agg_sql and custom.record_aggregate are dropped; Postgres cannot add a defaulted argument any other way without making every short call ambiguous)
-- inverse: migrations/inverse/atcr2_b_a_chart_counts_each_part_of_a_many_value_column_down.sql

create or replace function custom.agg_split_parts(p_organization_id uuid, p_table_id uuid, p_key text, p_alias text)
 returns text[]
 language sql
 stable
 set search_path to 'pg_catalog'
as $function$
  -- ONE HOME FOR "COUNT EACH PART OF A MANY-VALUE COLUMN" (Airtable: a chart counts each option of a multi-select / each linked record
  -- separately). For a column that holds several values (multi-select, multi-link, several texts) answers {the join that opens one row per
  -- part, the SQL of one part: a choice token, or a linked record's id}; a row holding none is kept once with no part. Anything else: null.
  select case when exists (
           select 1 from custom.field fl
            where fl.organization_id = p_organization_id and fl.entity_definition_id = p_table_id
              and fl.key = custom.agg_assert_key(p_key) and coalesce(fl.multi, false) and fl.type in ('list', 'relation', 'text'))
         then array[
           format(' left join lateral jsonb_array_elements(case when jsonb_typeof(r.data -> %1$L) = ''array'' and jsonb_array_length(r.data -> %1$L) > 0 then r.data -> %1$L'
                  || ' when jsonb_typeof(r.data -> %1$L) in (''string'', ''number'') then jsonb_build_array(r.data -> %1$L) end) %2$I(part) on true ',
                  custom.agg_assert_key(p_key), p_alias),
           format('coalesce(%1$I.part ->> ''id'', %1$I.part ->> ''record_id'', %1$I.part #>> ''{}'')', p_alias)]
       end;
$function$;

drop function custom.agg_sql(uuid, uuid, jsonb, jsonb, jsonb, jsonb, integer, text, jsonb, text, text);
CREATE OR REPLACE FUNCTION custom.agg_sql(p_organization_id uuid, p_table_id uuid, p_group_by jsonb DEFAULT '[]'::jsonb, p_measures jsonb DEFAULT '[]'::jsonb, p_bucket jsonb DEFAULT NULL::jsonb, p_filter jsonb DEFAULT '{}'::jsonb, p_limit integer DEFAULT 200, p_required text DEFAULT 'viewer'::text, p_window jsonb DEFAULT NULL::jsonb, p_search text DEFAULT NULL::text, p_time_zone text DEFAULT NULL::text, p_split_multi boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_group_sel  text[] := '{}';
  v_group_lbl  text[] := '{}';
  v_group_kind text[] := '{}';
  v_meas_sel   text[] := '{}';
  v_key        text;
  v_op         text;
  v_by         text;
  m            jsonb;
  v_sql        text;
  v_val        text;
  v_cal        jsonb;
  v_tz         text;
  v_ws         text;
  v_window_sql text := 'true';
  v_read_keys  text[] := '{}';
  v_as         text;
  v_expr       text;
  v_dir        text;
  v_order      text;
  v_i          integer;
  v_lat_key    text[] := '{}';
  v_lat_expr   text[] := '{}';
  v_mom        text;
  v_blank_last text;
  v_kind       text;
  v_moment     text;
  v_label      text;
  v_parts      text[];
  v_split_keys text[] := '{}';
  v_split_sql  text := '';
begin
  if p_organization_id is null or p_table_id is null then
    raise exception 'custom.record_aggregate: the organization and the Table are both required'
      using errcode = '22004';
  end if;

  for v_key in select (e #>> '{}') from jsonb_array_elements(coalesce(p_group_by, '[]'::jsonb)) e loop
    -- CHART-READ-2: split_multi counts each part of a many-value column under its own group (charts); false keeps the exact combination
    v_parts := null;
    if p_split_multi then
      v_i := array_position(v_split_keys, v_key);
      if v_i is null then v_i := cardinality(v_split_keys) + 1; end if;
      v_parts := custom.agg_split_parts(p_organization_id, p_table_id, v_key, 's' || v_i);
      if v_parts is not null and array_position(v_split_keys, v_key) is null then
        v_split_keys := array_append(v_split_keys, v_key);
        v_split_sql := v_split_sql || v_parts[1];
      end if;
    end if;
    -- VISION-REACH W2: a group is read the way the record read reads it — a FORMULA column has
    -- no stored value, so it is worked out by the read path (custom.agg_field_value_sql).
    v_val := custom.agg_field_value_sql(p_organization_id, p_table_id, v_key);
    if v_val <> custom.agg_value_sql(v_key) then
      v_i := array_position(v_lat_key, v_key);
      if v_i is null then
        v_lat_key  := array_append(v_lat_key, v_key);
        v_lat_expr := array_append(v_lat_expr, v_val);
        v_i := cardinality(v_lat_key);
      end if;
      v_val := format('w.v%s', v_i);
    end if;
    if v_parts is not null then v_val := v_parts[2]; end if;
    v_group_sel := array_append(v_group_sel, v_val);
    v_group_lbl := array_append(v_group_lbl, quote_literal(custom.agg_assert_key(v_key)));
    -- CHAIR-SHEET-STORE (b): what the column holds, so its group key comes back as that (a number
    -- as a number, yes/no as true/false); grouping itself is unchanged.
    v_group_kind := array_append(v_group_kind, custom.agg_field_kind(p_organization_id, p_table_id, v_key));
    v_read_keys := array_append(v_read_keys, v_key);
  end loop;

  -- S3: THE ORGANIZATION'S CALENDAR, read once and only when a date is being cut.
  if (p_bucket is not null and jsonb_typeof(p_bucket) = 'object')
     or (p_window is not null and jsonb_typeof(p_window) = 'object') then
    v_cal := custom.agg_calendar(p_organization_id);
    v_tz  := v_cal ->> 'time_zone';
    v_ws  := v_cal ->> 'week_start';
  end if;

  if p_bucket is not null and jsonb_typeof(p_bucket) = 'object' then
    v_key := custom.agg_assert_key(p_bucket ->> 'key');
    v_read_keys := array_append(v_read_keys, v_key);
    v_by  := lower(coalesce(p_bucket ->> 'by', 'month'));
    if not (v_by = any (custom.agg_buckets())) then
      raise exception 'custom.record_aggregate: "%" is not a bucket', v_by
        using errcode = '22023',
              hint = format('Legal buckets: %s.', array_to_string(custom.agg_buckets(), ', '));
    end if;
    -- VISION-REACH W3: A DATE PERIOD OF A WORKED-OUT COLUMN reads the column as the record read
    -- reads it (custom.agg_field_value_sql, one lateral value a row), so "visits by follow-up
    -- week" buckets the formula's dates instead of one empty period.
    v_mom := custom.agg_moment_sql(v_key, v_tz);
    v_val := custom.agg_field_value_sql(p_organization_id, p_table_id, v_key);
    if v_val <> custom.agg_value_sql(v_key) then
      v_i := array_position(v_lat_key, v_key);
      if v_i is null then
        v_lat_key  := array_append(v_lat_key, v_key);
        v_lat_expr := array_append(v_lat_expr, v_val);
        v_i := cardinality(v_lat_key);
      end if;
      v_mom := replace(v_mom, custom.agg_value_sql(v_key), format('w.v%s', v_i));
    end if;
    v_group_sel := array_append(v_group_sel,
      format('custom.agg_local_label(custom.agg_period_start((%s) at time zone %L, %L, %L), %L)',
             v_mom, v_tz, v_by, v_ws, v_tz));
    v_group_lbl := array_append(v_group_lbl, quote_literal(v_key || '_' || v_by));
    v_group_kind := array_append(v_group_kind, null::text);   -- a period's label stays its text
  end if;

  -- S3: ONE HALF-OPEN WINDOW on one date, read in the SAME calendar as the bucket, so the
  -- window's first bucket and its first day are the same day. `from` and `to` arrive as
  -- moments custom.agg_compare_windows already judged; they are re-cast here, never spliced.
  if p_window is not null and jsonb_typeof(p_window) = 'object' then
    v_key := custom.agg_assert_key(p_window ->> 'key');
    v_read_keys := array_append(v_read_keys, v_key);
    -- VISION-REACH W3: a window on a worked-out date column reads it as the bucket does.
    v_mom := custom.agg_moment_sql(v_key, v_tz);
    v_val := custom.agg_field_value_sql(p_organization_id, p_table_id, v_key);
    if v_val <> custom.agg_value_sql(v_key) then
      v_i := array_position(v_lat_key, v_key);
      if v_i is null then
        v_lat_key  := array_append(v_lat_key, v_key);
        v_lat_expr := array_append(v_lat_expr, v_val);
        v_i := cardinality(v_lat_key);
      end if;
      v_mom := replace(v_mom, custom.agg_value_sql(v_key), format('w.v%s', v_i));
    end if;
    v_window_sql := format('(%1$s >= %2$L::timestamptz and %1$s < %3$L::timestamptz)',
                           v_mom,
                           (p_window ->> 'from')::timestamptz, (p_window ->> 'to')::timestamptz);
  end if;

  for m in select e from jsonb_array_elements(coalesce(p_measures, '[]'::jsonb)) e loop
    v_op := lower(coalesce(m ->> 'op', 'count'));
    -- DRILL-CUSTOM-PARITY: a measure may carry the NAME its answer is keyed by (`as`), so a
    -- measure asked by its contract name (custom.drill_resolve) comes back under that name.
    -- Judged by the same shape rule as a Field key; absent, the label is `<op>_<key>` as before.
    v_as := case when m ? 'as' and nullif(m ->> 'as', '') is not null
                 then custom.agg_assert_key(m ->> 'as') end;
    if not (v_op = any (custom.agg_operations())) then
      raise exception 'custom.record_aggregate: "%" is not a measure', v_op
        using errcode = '22023',
              hint = format('Legal measures: %s.', array_to_string(custom.agg_operations(), ', '));
    end if;
    if v_op = 'count' then
      v_expr := 'count(*)::numeric';
      v_meas_sel := array_append(v_meas_sel, quote_literal(coalesce(v_as, 'count')) || ', ' || v_expr);
    else
      v_key := custom.agg_assert_key(m ->> 'key');
      v_read_keys := array_append(v_read_keys, v_key);
      -- VISION-REACH W2 (the $640 / $1,440 defect, 2026-10-01): A FORMULA IS MEASURED AS IT IS
      -- READ. A formula, lookup or roll-up column has no stored value in `r.data` — it is worked
      -- out when the record is read — so reading `r.data` here summed nothing and answered NULL
      -- under a success. The value now comes from the SAME read path the record read uses
      -- (custom.record_value_one -> custom.derived_value -> custom.formula_eval), so every formula
      -- function, today's and any added later, is measured exactly as it is shown. A plain stored
      -- column is read straight out of the row as before.
      v_val := custom.agg_field_value_sql(p_organization_id, p_table_id, v_key);
      -- WORKED OUT ONCE A ROW. Every measure and group over the same worked-out column reads ONE
      -- lateral value (`w.v<n>`), so sum + average + maximum of a formula evaluate it once per row,
      -- not three times.
      if v_val <> custom.agg_value_sql(v_key) then
        v_i := array_position(v_lat_key, v_key);
        if v_i is null then
          v_lat_key  := array_append(v_lat_key, v_key);
          v_lat_expr := array_append(v_lat_expr, v_val);
          v_i := cardinality(v_lat_key);
        end if;
        v_val := format('w.v%s', v_i);
      end if;
      -- ── GRID-PRIMITIVES G1: THE SUMMARY BAR'S OTHER FOUR. ────────────────────────────
      -- BLANK is what the older grid's summary bar means by it (column-summaries.ts
      -- isBlank): no value, JSON null, or the empty string. An empty list is a value.
      -- VISION-REACH W5 (2026-10-02): A MEASURE IS TYPED BY WHAT THE COLUMN HOLDS. The earliest and
      -- latest of a DATE column — a datetime Field, the two stamps, or a formula answering a date
      -- (DATEADD) — are the earliest and latest moments, answered as the value itself
      -- ("2026-07-15"), where they used to die on `invalid input syntax for type numeric`. A
      -- formula answering TEXT or yes/no takes its first and last in plain character order. Adding
      -- up or averaging a date is refused by the column's name. Everything else is measured as a
      -- number, exactly as before.
      v_kind := null;
      if v_op in ('min', 'max', 'sum', 'avg', 'median', 'range') then
        v_kind := custom.agg_field_kind(p_organization_id, p_table_id, v_key);
      end if;
      if v_kind = 'date' and v_op in ('sum', 'avg', 'median') then
        select coalesce(nullif(f.data ->> 'label', ''), f.data ->> 'key') into v_label
          from custom.record f
         where f.organization_id = p_organization_id
           and f.table_id = custom.field_kernel_id()
           and f.deleted_at is null
           and (f.data ->> 'entity_definition_id')::uuid = p_table_id
           and f.data ->> 'key' = v_key
         limit 1;
        raise exception '% holds dates, so it can be counted or its earliest and latest found, but not %.',
          coalesce(v_label, v_key), case v_op when 'sum' then 'added up' else 'averaged' end
          using errcode = '22023', hint = 'Ask for min or max of it, or count. Nothing was measured.';
      end if;
      if v_kind = 'date' and v_op in ('min', 'max') then
        v_tz := coalesce(v_tz, custom.agg_calendar(p_organization_id) ->> 'time_zone');
        -- a value that is not a date has no moment and is passed over, never cast into an error
        v_moment := format(
          '(case when (%1$s) ~ ''^[0-9]{4}-[0-9]{2}-[0-9]{2}$'' and pg_input_is_valid(%1$s, ''date'') '
          'then ((%1$s)::date::timestamp at time zone %2$L) '
          'when pg_input_is_valid(%1$s, ''timestamptz'') then (%1$s)::timestamptz end)',
          v_val, coalesce(v_tz, 'UTC'));
        v_expr := format('(array_agg(%1$s order by %2$s %3$s) filter (where %2$s is not null))[1]',
                         v_val, v_moment, case v_op when 'min' then 'asc' else 'desc' end);
      elsif v_kind in ('text', 'boolean') and v_op in ('min', 'max')
            and v_val <> custom.agg_value_sql(v_key) then
        v_expr := format('%s(nullif(%s, '''') collate "C")', v_op, v_val);
      elsif v_op = 'median' then
        v_expr := format('(percentile_cont(0.5) within group (order by nullif(%s, '''')::numeric))::numeric', v_val);
      elsif v_op = 'filled' then
        v_expr := format('(count(*) filter (where nullif(%s, '''') is not null))::numeric', v_val);
      elsif v_op = 'empty' then
        v_expr := format('(count(*) filter (where nullif(%s, '''') is null))::numeric', v_val);
      -- SPACES N6 (Notion's calculation row): the share of rows with no value / a value, as a
      -- percent 0..100 of the rows asked; and the RANGE, largest minus smallest — for a date column
      -- the days between its earliest and latest moment.
      elsif v_op = 'percent_empty' then
        v_expr := format('(100.0 * count(*) filter (where nullif(%s, '''') is null) / nullif(count(*), 0))::numeric', v_val);
      elsif v_op = 'percent_filled' then
        v_expr := format('(100.0 * count(*) filter (where nullif(%s, '''') is not null) / nullif(count(*), 0))::numeric', v_val);
      elsif v_op = 'range' and v_kind = 'date' then
        v_tz := coalesce(v_tz, custom.agg_calendar(p_organization_id) ->> 'time_zone');
        v_moment := format(
          '(case when (%1$s) ~ ''^[0-9]{4}-[0-9]{2}-[0-9]{2}$'' and pg_input_is_valid(%1$s, ''date'') '
          'then ((%1$s)::date::timestamp at time zone %2$L) '
          'when pg_input_is_valid(%1$s, ''timestamptz'') then (%1$s)::timestamptz end)',
          v_val, coalesce(v_tz, 'UTC'));
        v_expr := format('(extract(epoch from (max(%1$s) - min(%1$s))) / 86400)::numeric', v_moment);
      elsif v_op = 'range' then
        v_expr := format('(max(nullif(%1$s, '''')::numeric) - min(nullif(%1$s, '''')::numeric))::numeric', v_val);
      elsif v_op = 'unique' then
        v_expr := format('(count(distinct nullif(%s, '''')))::numeric', v_val);
      else
        v_expr := format('%s(nullif(%s, '''')::numeric)::numeric', v_op, v_val);
      end if;
      v_meas_sel := array_append(v_meas_sel,
        quote_literal(coalesce(v_as, v_op || '_' || v_key)) || ', ' || v_expr);
    end if;
    -- VISION-REACH W2: TOP-N BY THE MEASURED VALUE. A measure may carry `order` ("desc" or
    -- "asc"); the first one that does orders the groups by its own value ("the five patients
    -- with the highest copay"). Absent, groups come back largest-first by row count, as always.
    if v_order is null and m ? 'order' then
      v_dir := lower(coalesce(m ->> 'order', ''));
      if v_dir not in ('desc', 'asc') then
        raise exception 'A measure is ordered "desc" or "asc", and this one says "%".', m ->> 'order'
          using errcode = '22023',
                hint = 'Leave `order` out to keep the groups largest-first by how many records each has. Nothing was read.';
      end if;
      v_order := format('%s %s nulls last', v_expr, v_dir);
    end if;
  end loop;
  -- S2-PRIME AGG-FIELD-READ: EVERY COLUMN THIS QUESTION READS — a measure's, a group's, the
  -- bucket's and the window's date — is one this reader may read, or the question is refused by
  -- that column's own name. Before this, a sum of a confidential column answered a member who may
  -- not read it. One check, here, so every door built on this SQL inherits it.
  perform custom.agg_fields_readable_assert(p_organization_id, p_table_id, v_read_keys, p_required);

  if cardinality(v_meas_sel) = 0 then
    v_meas_sel := array[quote_literal('count') || ', count(*)::numeric'];
  end if;

  -- LANE 11 NEED 10a (CHAIR-DOORS-2, 2026-10-02): A BLANK GROUP SORTS LAST. Groups came back
  -- largest-first, so when blank was the most common value it took the first slot, and inside a
  -- small limit it pushed a real value off the end. Every group expression (a Field's value or a
  -- date period's label, both text) now sorts blank (no value or the empty string) after every
  -- real value BEFORE any other order, so a blank never takes a slot a real value could fill.
  if cardinality(v_group_sel) > 0 then
    select string_agg(format('(nullif(%s, %L) is null)', v_group_sel[i], ''), ', ' order by i)
      into v_blank_last
      from generate_subscripts(v_group_sel, 1) i;
  end if;

  v_sql := format($q$
    select %s as groups,
           jsonb_build_object(%s) as measures,
           count(*)::bigint as row_count
      from custom.record r %s
     where r.organization_id = %L::uuid
       and r.table_id = %L::uuid
       and r.deleted_at is null
       and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
       and %s
       and %s
       and %s
       and %s
     %s
     order by %s
     limit %s
  $q$,
    case when cardinality(v_group_sel) = 0 then '''{}''::jsonb'
         else 'jsonb_build_object(' ||
              -- CHAIR-SHEET-STORE (b): A NUMBER GROUP COMES BACK A NUMBER. The key was always the
              -- column's text (`->>`), so "Qty 12" answered "12" and a chart, a filter built from the
              -- group and the retype count all read text. A number or yes/no column's key is now
              -- typed by custom.agg_group_value; a date stays its ISO text; everything else as before.
              (select string_agg(v_group_lbl[i] || ', ' ||
                        case when v_group_kind[i] in ('number', 'boolean')
                             then format('custom.agg_group_value(%s, %L)', v_group_sel[i], v_group_kind[i])
                             else v_group_sel[i] end, ', ')
                 from generate_subscripts(v_group_sel, 1) i) || ')' end,
    array_to_string(v_meas_sel, ', '),
    -- `offset 0` keeps the planner from folding the lateral back into each expression, which would
    -- work the column out once per mention again.
    v_split_sql || case when cardinality(v_lat_expr) = 0 then ''
         else 'cross join lateral (select ' ||
              (select string_agg(v_lat_expr[i] || ' as v' || i, ', ') from generate_subscripts(v_lat_expr, 1) i) ||
              ' offset 0) w' end,
    p_organization_id, p_table_id,
    custom.listed_predicate_sql(custom.query_principal(), p_organization_id, p_table_id,
                                 p_required::public.permission_level, 'r'),
    -- S2-PRIME FILTER-GROUPS: the one fragment, in either shape (flat map or Rule expression).
    custom.record_filter_sql(p_organization_id, p_table_id, p_filter),
    v_window_sql,
    -- CHAIR-GRID (grids review 3, lane H item 5f): THE GRID'S SEARCH — the page door's own predicate
    -- (custom.record_search_sql), so a summary counts exactly the rows the search shows. 'true' when blank.
    custom.record_search_sql(p_organization_id, p_table_id, p_search, 'r', p_time_zone),
    -- DRILL-CUSTOM-PARITY: GROUP BY THE EXPRESSIONS, never by position. The select list has ONE
    -- `groups` column, so `group by 1, 2` named `groups` and then `measures` — an aggregate — and
    -- every question with two groups, or a group and a date period, died with "aggregate
    -- functions are not allowed in GROUP BY" (measured on the main database 2026-09-29).
    case when cardinality(v_group_sel) = 0 then ''
         else 'group by ' || array_to_string(v_group_sel, ', ') end,
    coalesce(v_blank_last || ', ', '') || coalesce(v_order || ', count(*) desc', 'count(*) desc'),
    custom.page_size(p_organization_id, 'custom.record_aggregate', p_limit, 200));

  return v_sql;
end;
$function$;

drop function custom.record_aggregate(uuid, uuid, jsonb, jsonb, jsonb, jsonb, integer, text, jsonb, text, text);
CREATE OR REPLACE FUNCTION custom.record_aggregate(p_organization_id uuid, p_table_id uuid, p_group_by jsonb DEFAULT '[]'::jsonb, p_measures jsonb DEFAULT '[]'::jsonb, p_bucket jsonb DEFAULT NULL::jsonb, p_filter jsonb DEFAULT '{}'::jsonb, p_limit integer DEFAULT 200, p_required text DEFAULT 'viewer'::text, p_compare jsonb DEFAULT NULL::jsonb, p_search text DEFAULT NULL::text, p_time_zone text DEFAULT NULL::text, p_split_multi boolean DEFAULT false)
 RETURNS TABLE(groups jsonb, measures jsonb, row_count bigint, prior_groups jsonb, prior_measures jsonb, prior_row_count bigint, delta jsonb, compare jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_map    jsonb;
  v_row    record;
  v_filter jsonb;
  v_cmp    jsonb;
  v_bkey   text;
  v_by     text;
  v_ws     text;
  v_tz     text;
  v_cur    jsonb := '[]'::jsonb;
  v_pri    jsonb := '[]'::jsonb;
  v_match  jsonb;
  v_side   text;
  v_from   timestamp;
  v_res    jsonb;
  v_orig   jsonb;
  v_keep   jsonb := '[]'::jsonb;
  v_wh     jsonb := '{}'::jsonb;
  v_wm     jsonb := '{}'::jsonb;
  v_add    jsonb := '{}'::jsonb;
  v_m      jsonb;
  v_name   text;
  v_det    text;
  v_all    jsonb;
  v_first  boolean := true;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.record_aggregate');
  perform custom.assert_may_know_table(p_organization_id, p_table_id, 'custom.record_aggregate');

  -- DRILL-CUSTOM-PARITY: THE CONTRACT'S NAMES. A group may be a dimension (`status`, or a time
  -- dimension at a grain, `appointment_date:month`) and a measure may be its name
  -- (`sum_duration_minutes`, `count`, or one a table admin added) — the answer of
  -- custom.table_dimensions. They are turned into this door's own arguments HERE, once, for
  -- the reader asking, before anything is built; Field keys and {op, key} measures pass through
  -- untouched, so every older caller answers exactly as before.
  v_res := custom.drill_resolve(p_organization_id, p_table_id, p_group_by, p_measures, p_bucket);
  p_group_by := v_res -> 'group_by';
  p_measures := v_res -> 'measures';
  p_bucket   := v_res -> 'bucket';
  if p_bucket = 'null'::jsonb then p_bucket := null; end if;

  -- AGG-WITHHELD: A MEASURE OVER A COLUMN THIS READER MAY NOT READ IS A STATE, NEVER AN ERROR.
  -- Each measure's column is asked the read door's question on its own; a withheld one leaves the
  -- statement (so no number is ever computed from it) and comes back as the withheld marker under
  -- the name its answer would have had. The rest of the question answers as asked.
  v_orig := coalesce(p_measures, '[]'::jsonb);
  for v_m in select e from jsonb_array_elements(v_orig) e loop
    if jsonb_typeof(v_m) = 'object' and nullif(v_m ->> 'key', '') is not null
       and lower(coalesce(v_m ->> 'op', 'count')) <> 'count' then
      begin
        perform custom.agg_fields_readable_assert(p_organization_id, p_table_id, array[v_m ->> 'key'], p_required);
      exception when insufficient_privilege then
        get stacked diagnostics v_det = pg_exception_detail;
        if v_det is null or v_det not like 'withheld:%' then
          raise;
        end if;
        v_name := coalesce(nullif(v_m ->> 'as', ''), lower(coalesce(v_m ->> 'op', 'count')) || '_' || (v_m ->> 'key'));
        v_wh := v_wh || jsonb_build_object(v_name, null);
        v_wm := v_wm || jsonb_build_object(v_name, custom.agg_withheld_marker(p_organization_id, p_table_id, v_m ->> 'key', p_required));
        continue;
      end;
    end if;
    v_keep := v_keep || jsonb_build_array(v_m);
  end loop;
  p_measures := v_keep;
  -- HONEST-REFUSALS 2: the withheld explanation is said ONCE (on the first row only, `measures._withheld`);
  -- every row keeps `<measure>: null`. The client lifts the one note back onto every row it belongs to.
  v_add := v_wh;

  begin
  -- CHOICE-VALUE. One map per call: the filter is normalised to what is STORED before the
  -- statement is built, and the groups are named on the way out.
  v_map := custom.choice_field_map(p_organization_id, p_table_id);
  -- S2-PRIME FILTER-GROUPS: a Rule expression passes through to the one fragment; a flat map is
  -- normalised to what is stored, as before.
  v_filter := case when custom.filter_is_rule(p_filter) then p_filter
                   else custom.choice_filter_normalize(v_map, p_filter) end;

  if p_compare is null or jsonb_typeof(p_compare) = 'null' then
    for v_row in execute custom.agg_sql(p_organization_id, p_table_id, p_group_by, p_measures,
                                        p_bucket, v_filter, p_limit, p_required, null, p_search, p_time_zone, p_split_multi) loop
      groups          := custom.choice_render_groups(v_map, v_row.groups);
      measures        := v_row.measures || v_add
                         || case when v_first and v_wm <> '{}'::jsonb then jsonb_build_object('_withheld', v_wm) else '{}'::jsonb end;
      v_first         := false;
      row_count       := v_row.row_count;
      prior_groups    := null;
      prior_measures  := null;
      prior_row_count := null;
      delta           := null;
      compare         := null;
      return next;
    end loop;
    return;
  end if;

  -- ── S3: THE SAME QUESTION, TWICE, UNDER THE SAME PRINCIPAL ─────────────────────────────
  v_cmp := custom.agg_compare_windows(p_organization_id, p_compare, p_bucket);
  v_tz  := v_cmp ->> 'time_zone';
  v_ws  := v_cmp ->> 'week_start';
  -- The comparison names the period, so a window on the SAME date in the filter gives way to
  -- it; every other part of the filter narrows both series alike.
  v_filter := v_filter - (v_cmp ->> 'key');
  if p_bucket is not null and jsonb_typeof(p_bucket) = 'object' then
    v_by   := lower(coalesce(p_bucket ->> 'by', 'month'));
    v_bkey := (p_bucket ->> 'key') || '_' || v_by;
  end if;

  foreach v_side in array array['window', 'prior_window'] loop
    v_from := ((v_cmp -> v_side ->> 'from')::timestamptz) at time zone v_tz;
    for v_row in execute custom.agg_sql(p_organization_id, p_table_id, p_group_by, p_measures,
                                        p_bucket, v_filter, p_limit, p_required,
                                        jsonb_build_object('key', v_cmp ->> 'key',
                                                           'from', v_cmp -> v_side ->> 'from',
                                                           'to', v_cmp -> v_side ->> 'to'),
                                        p_search, p_time_zone, p_split_multi) loop
      -- A group is matched by its value; a bucket by its POSITION in its own window.
      if v_bkey is null then
        v_match := coalesce(v_row.groups, '{}'::jsonb);
      else
        v_match := (coalesce(v_row.groups, '{}'::jsonb) - v_bkey)
                   || jsonb_build_object('#', case when v_row.groups ->> v_bkey is null then null else
                        custom.agg_bucket_ordinal(v_by, v_from, left(v_row.groups ->> v_bkey, 19)::timestamp, v_ws) end);
      end if;
      if v_side = 'window' then
        v_cur := v_cur || jsonb_build_array(jsonb_build_object(
          'groups', custom.choice_render_groups(v_map, v_row.groups),
          'measures', v_row.measures, 'row_count', v_row.row_count, 'match', v_match));
      else
        v_pri := v_pri || jsonb_build_array(jsonb_build_object(
          'groups', custom.choice_render_groups(v_map, v_row.groups),
          'measures', v_row.measures, 'row_count', v_row.row_count, 'match', v_match));
      end if;
    end loop;
  end loop;

  return query
    select q.groups, q.measures || case when q.rn = 1 and v_wm <> '{}'::jsonb then jsonb_build_object('_withheld', v_wm) else '{}'::jsonb end,
           q.row_count, q.prior_groups, q.prior_measures, q.prior_row_count, q.delta, q.compare
      from (
    select c.e -> 'groups' as groups,
           coalesce(c.e -> 'measures', custom.agg_zero(p.e -> 'measures')) || v_add as measures,
           coalesce((c.e ->> 'row_count')::bigint, 0) as row_count,
           p.e -> 'groups' as prior_groups,
           coalesce(p.e -> 'measures', custom.agg_zero(c.e -> 'measures')) || v_add as prior_measures,
           coalesce((p.e ->> 'row_count')::bigint, 0) as prior_row_count,
           custom.agg_delta(coalesce(c.e -> 'measures', custom.agg_zero(p.e -> 'measures')),
                            coalesce(p.e -> 'measures', custom.agg_zero(c.e -> 'measures'))) as delta,
           -- The row's bucket POSITION rides with the windows, so a screen can name a
           -- position the current window has not reached yet ("week 6") without counting rows.
           v_cmp || jsonb_build_object('position', coalesce(c.e -> 'match' -> '#', p.e -> 'match' -> '#')) as compare,
           row_number() over (order by coalesce(c.e -> 'match' ->> '#', p.e -> 'match' ->> '#')::integer nulls last,
                                       coalesce((c.e ->> 'row_count')::bigint, 0) desc,
                                       coalesce((p.e ->> 'row_count')::bigint, 0) desc) as rn
      from (select e from jsonb_array_elements(v_cur) e) c
      full join (select e from jsonb_array_elements(v_pri) e) p
        on (c.e -> 'match') = (p.e -> 'match')) q
     order by q.rn;
  return;

  exception when insufficient_privilege then
    -- AGG-WITHHELD: a GROUP, a date bucket, a window or a FILTER reads a column this reader may not
    -- read. Nothing can be counted by it without leaking it, so the question is answered as ONE
    -- row whose every measure is the withheld state — never a number, never an error. A refusal
    -- that is not about a withheld column (no `withheld:` detail) is re-raised untouched.
    get stacked diagnostics v_det = pg_exception_detail;
    if v_det is null or v_det not like 'withheld:%' then
      raise;
    end if;
    v_all := '{}'::jsonb;
    v_wm  := '{}'::jsonb;
    for v_m in select e from jsonb_array_elements(v_orig) e loop
      v_name := case when jsonb_typeof(v_m) = 'string' then v_m #>> '{}'
                     when lower(coalesce(v_m ->> 'op', 'count')) = 'count' then coalesce(nullif(v_m ->> 'as', ''), 'count')
                     else coalesce(nullif(v_m ->> 'as', ''), lower(coalesce(v_m ->> 'op', 'count')) || '_' || (v_m ->> 'key')) end;
      v_all := v_all || jsonb_build_object(v_name, null);
      v_wm  := v_wm  || jsonb_build_object(v_name,
                 custom.agg_withheld_marker(p_organization_id, p_table_id, substr(v_det, 10), p_required));
    end loop;
    if v_all = '{}'::jsonb then
      v_all := jsonb_build_object('count', null);
      v_wm  := jsonb_build_object('count',
                 custom.agg_withheld_marker(p_organization_id, p_table_id, substr(v_det, 10), p_required));
    end if;
    v_all := v_all || jsonb_build_object('_withheld', v_wm);
    groups := '{}'::jsonb; measures := v_all; row_count := null;
    prior_groups := null; prior_measures := null; prior_row_count := null; delta := null; compare := null;
    return next;
    return;
  end;
end;
$function$;

grant execute on function custom.record_aggregate(uuid, uuid, jsonb, jsonb, jsonb, jsonb, integer, text, jsonb, text, text, boolean) to authenticated;
comment on function custom.record_aggregate(uuid, uuid, jsonb, jsonb, jsonb, jsonb, integer, text, jsonb, text, text, boolean) is $cm$AGT-N-8 + S3: group, bucket (in the organization's calendar), filter and measure inside the read door, over the rows this person may see. With p_compare the same question is answered over the current window and the prior one (previous period, same period last year, or a fixed baseline), one row per group with both series, the delta and the two windows; without it the answer is what it always was, and the four comparison columns are null. CHAIR-GRID: p_search narrows both series to the rows custom.read_records_page's search would show (custom.record_search_sql); blank or absent, nothing changes. p_time_zone is the reader's zone for that search's date matches (null = the organization's calendar). With p_split_multi a chart counts each part of a many-value column under its own group.$cm$;

-- the door re-declares itself under its longer signature (a client may ask for the split; nothing else about the contract moves)
update platform.client_callable_door
   set identity_args = identity_args || ', p_split_multi boolean',
       identity_argtypes = identity_argtypes || array['boolean'::regtype]::oid[],
       argument_rules = jsonb_set(argument_rules, '{arguments,p_split_multi}', jsonb_build_object(
         'type', 'boolean', 'check', 'a switch the function body reads after access is decided', 'foreign', jsonb_build_object('not_an_id', true),
         'optional', true, 'position', 12, 'null_rule', jsonb_build_object('means', 'false: the exact combination')))
 where schema_name = 'custom' and function_name = 'record_aggregate' and identity_args not like '%p_split_multi%';

CREATE OR REPLACE FUNCTION custom.dashboard_run(p_organization_id uuid, p_dashboard_id uuid, p_filter jsonb DEFAULT '{}'::jsonb, p_compare jsonb DEFAULT NULL::jsonb, p_grain text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_doc     jsonb;
  v_name    text;
  v_subject uuid;
  v_out     jsonb := '[]'::jsonb;
  v_rows    jsonb;
  v_block   jsonb;
  v_merged  jsonb;
  v_started timestamptz;
  v_grain   text;
  v_cmp     jsonb;
  v_windows jsonb;
  v_note    text;
  v_extra   jsonb;
  v_tgt     jsonb;
  v_mk      text;
  v_op      text;
  v_cur     numeric;
  v_pri     numeric;
  v_additive boolean;
  v_tval    numeric;
  v_tnote   text;
  b         jsonb;
  k         text;
  v_known   boolean;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.dashboard_run');

  select d.data into v_doc
    from custom.record d
   where d.organization_id = p_organization_id
     and d.id = p_dashboard_id
     and d.table_id = custom.presentation_kernel_id()
     and d.data_class = custom.dashboard_class()
     and d.deleted_at is null;
  if v_doc is null then
    raise exception 'There is no such dashboard in this organization.' using errcode = '02000',
            hint = 'A dashboard id from another organization reads as absent — organizations are hard walls (REC-29).',
            detail = jsonb_build_object('dashboard_id', p_dashboard_id)::text;
  end if;

  v_name    := v_doc ->> 'name';
  v_subject := nullif(v_doc ->> 'subject_table_id', '')::uuid;

  -- CHAIR-SEC (2026-10-02): OPENING A DASHBOARD IS THE DASHBOARD'S OWN SHARING, and every
  -- block is still asked of its own Table below. Defaults lean open: under the organization's
  -- default (custom/member_default_visibility = all_records) every member holds viewer on every
  -- dashboard; an organization that chose "only what is shared" sees only the dashboards shared
  -- with it, which is the choice it made, not a lock-out. The subject Table is still known-or-not.
  perform custom.assert_client_may_open(p_organization_id, p_dashboard_id, 'custom.dashboard_run',
                                        'viewer'::public.permission_level, 'dashboard');
  perform custom.assert_may_know_table(p_organization_id, v_subject, 'custom.dashboard_run');

  -- S3: THE CANVAS'S DATE GRAIN AND COMPARISON, judged once for the whole run — a picker that
  -- sends a grain the store does not cut is the caller's mistake, not eight blocks' mistakes.
  v_grain := lower(nullif(btrim(coalesce(p_grain, '')), ''));
  if v_grain is not null and not (v_grain = any (custom.agg_buckets())) then
    raise exception '"%" is not a date grain', v_grain
      using errcode = '22023',
            hint = format('A dashboard can be cut by %s.', array_to_string(custom.agg_buckets(), ', '));
  end if;
  if p_compare is not null and jsonb_typeof(p_compare) <> 'null' then
    perform custom.agg_compare_windows(p_organization_id,
      case when jsonb_typeof(p_compare) = 'object' and not (p_compare ? 'key')
           then p_compare || '{"key": "created_at"}'::jsonb else p_compare end, null);
  end if;

  for b in select e from jsonb_array_elements(coalesce(v_doc -> 'blocks', '[]'::jsonb)) e loop
    -- RE-JUDGED ON THE WAY OUT, NOT TRUSTED BECAUSE IT WAS JUDGED ON THE WAY IN. A Field
    -- can be deleted or renamed after a block was saved, and a block naming a Table THIS
    -- caller may not know is refused here by the same wall — so a canvas that reaches
    -- somebody else's Table loses that ONE block and answers the rest.
    begin
      v_block := custom.dashboard_block_normalize(p_organization_id, v_subject, b);
    exception when others then
      -- CHAIR-SEC (2026-10-02): A BLOCK ON A TABLE THIS READER MAY NOT KNOW SAYS NOTHING ABOUT
      -- IT. Its title and kind named the hidden Table's contents ("Open claims by insurer"), so
      -- the block answers the withheld STATE alone — a read never errors, a withheld block is a
      -- state — keeping only where it sits. A block on a Table she does know keeps its title
      -- and its refusal, exactly as before (a renamed Field is her business to see).
      v_known := true;
      begin
        perform custom.assert_may_know_table(p_organization_id,
                  coalesce(nullif(b ->> 'table_id', '')::uuid, v_subject), 'custom.dashboard_run');
      exception when others then
        v_known := false;
      end;
      if v_known then
        v_out := v_out || jsonb_strip_nulls(jsonb_build_object(
          'id', b -> 'id',
          'title', coalesce(b ->> 'title', 'Block'),
          'kind', coalesce(b ->> 'kind', 'number'),
          'refused', sqlerrm,
          'sqlstate', sqlstate));
      else
        v_out := v_out || jsonb_strip_nulls(jsonb_build_object(
          'id', b -> 'id',
          'span', b -> 'span',
          'withheld', true,
          'refused', 'Not shared with you',
          'sqlstate', '42501'));
      end if;
      continue;
    end;

    -- ONE FILTER BAR ACROSS EVERY PANEL (SCR-16, Linear Insights). The canvas's filter is
    -- merged over each block's own, and the block's own wins on a key they share.
    v_merged := coalesce(v_block -> 'filter', '{}'::jsonb);
    if p_filter is not null and jsonb_typeof(p_filter) = 'object' then
      for k in select kk from jsonb_object_keys(p_filter) kk loop
        if not (v_merged ? k) then
          v_merged := v_merged || jsonb_build_object(k, p_filter -> k);
        end if;
      end loop;
    end if;

    -- S3: the canvas's grain re-cuts every bucketed block; the block's own comparison wins over
    -- the canvas's, as its own filter does.
    if v_grain is not null and jsonb_typeof(v_block -> 'bucket') = 'object' then
      v_block := jsonb_set(v_block, '{bucket,by}', to_jsonb(v_grain));
    end if;
    v_cmp := null; v_windows := null; v_note := null;
    if v_block ->> 'kind' <> 'stuck' then
      v_cmp := coalesce(v_block -> 'compare',
                        case when p_compare is not null and jsonb_typeof(p_compare) = 'object' then p_compare end);
      if v_cmp is not null and nullif(v_cmp ->> 'key', '') is null
         and jsonb_typeof(v_block -> 'bucket') is distinct from 'object' then
        v_note := 'This block has no date to compare along, so it shows this period alone. Give it a bucket, or give its comparison a date field.';
        v_cmp := null;
      end if;
    end if;

    v_started := clock_timestamp();
    begin
      if v_cmp is not null then
        v_windows := custom.agg_compare_windows(p_organization_id, v_cmp,
                       case when jsonb_typeof(v_block -> 'bucket') = 'object' then v_block -> 'bucket' end);
      end if;
      if v_block ->> 'kind' = 'stuck' then
        select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) into v_rows
          from custom.dashboard_stuck(p_organization_id,
                                      (v_block ->> 'table_id')::uuid,
                                      v_block ->> 'state_key',
                                      (v_block ->> 'days')::integer,
                                      v_merged,
                                      (v_block ->> 'limit')::integer,
                                      'viewer') s;
      else
        select coalesce(jsonb_agg(
                 jsonb_build_object('groups', a.groups, 'measures', a.measures, 'row_count', a.row_count)
                 || case when v_cmp is null then '{}'::jsonb else jsonb_build_object(
                      'prior_groups', a.prior_groups, 'prior_measures', a.prior_measures,
                      'prior_row_count', a.prior_row_count, 'delta', a.delta,
                      'position', a.compare -> 'position') end), '[]'::jsonb)
          into v_rows
          from custom.record_aggregate(p_organization_id,
                                       (v_block ->> 'table_id')::uuid,
                                       coalesce(v_block -> 'group_by', '[]'::jsonb),
                                       coalesce(v_block -> 'measures', '[]'::jsonb),
                                       v_block -> 'bucket',
                                       v_merged,
                                       (v_block ->> 'limit')::integer,
                                       'viewer',
                                       v_cmp,
                                       p_split_multi => (v_block ->> 'kind') in ('number', 'bar', 'column', 'line', 'donut')) a;
      end if;
      -- AGG-WITHHELD: the aggregate door answers a column this reader may not read as a withheld
      -- STATE (null + `_withheld`), not an error; this block keeps saying so in its own words, as
      -- it did when that was a refusal — the other blocks still draw.
      if v_block ->> 'kind' <> 'stuck' and exists (
           select 1 from jsonb_array_elements(v_rows) r where r -> 'measures' ? '_withheld') then
        v_out := v_out || (v_block || jsonb_build_object(
          'refused', (select w.value ->> 'says'
                        from jsonb_array_elements(v_rows) r
                        cross join lateral jsonb_each(r -> 'measures' -> '_withheld') w
                       where r -> 'measures' ? '_withheld' limit 1),
          'sqlstate', '42501'));
        continue;
      end if;
    exception when others then
      -- NOTHING FAILS SILENTLY: one block that refuses is one block that says why, and the
      -- other seven still answer. A canvas that went blank because one Field was renamed
      -- would be the screen telling a lie about the whole organization.
      v_out := v_out || (v_block || jsonb_build_object('refused', sqlerrm, 'sqlstate', sqlstate));
      continue;
    end;

    -- ── S3: the totals and the target, worked out HERE from the rows the store just answered,
    -- so the tile, the chart and the ring can never disagree with each other ─────────────
    v_extra := '{}'::jsonb;
    if v_block ->> 'kind' <> 'stuck' then
      v_tgt := v_block -> 'target';
      v_mk := coalesce(v_tgt ->> 'measure',
                       case when (v_block -> 'measures' -> 0 ->> 'op') = 'count' or (v_block -> 'measures' -> 0 ->> 'op') is null
                            then 'count' else (v_block -> 'measures' -> 0 ->> 'op') || '_' || (v_block -> 'measures' -> 0 ->> 'key') end);
      v_op := split_part(v_mk, '_', 1);
      -- A total across groups is a sum only for a measure that adds up; an average of averages
      -- is not the average, so a one-row answer is the only total such a measure has.
      v_additive := v_op in ('count', 'sum', 'filled', 'empty');
      if v_additive or jsonb_array_length(v_rows) = 1 then
        select sum(case when jsonb_typeof(r -> 'measures' -> v_mk) = 'number' then (r -> 'measures' ->> v_mk)::numeric end),
               sum(case when jsonb_typeof(r -> 'prior_measures' -> v_mk) = 'number' then (r -> 'prior_measures' ->> v_mk)::numeric end)
          into v_cur, v_pri
          from jsonb_array_elements(v_rows) r;
        v_cur := coalesce(v_cur, case when v_additive then 0 end);
        if v_cmp is not null then
          v_pri := coalesce(v_pri, case when v_additive then 0 end);
        else
          v_pri := null;
        end if;
        v_extra := v_extra || jsonb_build_object('totals', jsonb_build_object(
          'measure', v_mk, 'current', v_cur, 'prior', v_pri,
          'change', v_cur - v_pri,
          'change_pct', case when v_pri is null or v_cur is null or v_pri = 0 then null
                             else round((v_cur - v_pri) / abs(v_pri) * 100, 1) end));
      else
        v_cur := null;
      end if;
      if v_tgt is not null then
        -- S3: A TARGET READ FROM A GOAL COLUMN is that column added up over exactly the records
        -- this block's own number read — the same merged filter, the same current window, the
        -- same reader through the same door — so the goal and the number cannot disagree about
        -- which jobs they are about. A column this reader may not read refuses the TARGET by
        -- name and the block still draws its number.
        v_tval := null; v_tnote := null;
        if v_tgt ? 'field' then
          begin
            perform custom.dashboard_target_field_assert(p_organization_id, (v_block ->> 'table_id')::uuid, v_tgt ->> 'field');
            select case when jsonb_typeof(a.measures -> ((v_tgt ->> 'op') || '_' || (v_tgt ->> 'field'))) = 'number'
                        then (a.measures ->> ((v_tgt ->> 'op') || '_' || (v_tgt ->> 'field')))::numeric end
              into v_tval
              from custom.record_aggregate(p_organization_id,
                                           (v_block ->> 'table_id')::uuid,
                                           '[]'::jsonb,
                                           jsonb_build_array(jsonb_build_object('op', v_tgt ->> 'op', 'key', v_tgt ->> 'field')),
                                           null,
                                           v_merged,
                                           1,
                                           'viewer',
                                           case when v_cmp is null then null
                                                else v_cmp || jsonb_build_object('key',
                                                       coalesce(nullif(v_cmp ->> 'key', ''), v_block -> 'bucket' ->> 'key')) end) a
             limit 1;
            if v_tval is null and v_tgt ->> 'op' = 'sum' then v_tval := 0; end if;
          exception when others then
            v_tval := null;
            v_tnote := sqlerrm;
          end;
        else
          v_tval := (v_tgt ->> 'value')::numeric;
        end if;
        v_extra := v_extra || jsonb_build_object('target', v_tgt || jsonb_build_object(
          'value', v_tval,
          'current', v_cur,
          'progress', case when v_cur is null or v_tval is null or v_tval = 0 then null
                           else round(v_cur / v_tval, 4) end,
          'pace', case
            when v_tval is null then null
            when jsonb_typeof(v_block -> 'bucket') is distinct from 'object' then null
            when v_tgt ->> 'per' = 'bucket' then v_tval
            when coalesce((v_windows ->> 'bucket_count')::integer, 0) > 0
              then round(v_tval / (v_windows ->> 'bucket_count')::integer, 2)
            else null end)
          || case when v_tnote is null then '{}'::jsonb else jsonb_build_object('refused', v_tnote) end);
      end if;
    end if;

    v_out := v_out || (v_block || v_extra || jsonb_build_object(
      'rows', v_rows,
      'filter', v_merged,
      'compare', v_windows,
      'ms', round(extract(epoch from (clock_timestamp() - v_started)) * 1000.0, 1))
      || case when v_note is null then '{}'::jsonb else jsonb_build_object('compare_refused', v_note) end);
  end loop;

  return jsonb_build_object(
    'dashboard_id', p_dashboard_id,
    'name', v_name,
    'subject_table_id', v_subject,
    'presentation', coalesce(v_doc -> 'presentation', '{}'::jsonb),
    'filter', coalesce(p_filter, '{}'::jsonb),
    'grain', v_grain,
    'compare', case when jsonb_typeof(p_compare) = 'object' then p_compare end,
    'calendar', custom.agg_calendar(p_organization_id),
    'blocks', v_out);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.interface_chart(p_interface_id uuid, p_chart_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_uid     uuid := auth.uid();
  d         custom.record;
  v_org     uuid;
  v_p       jsonb;
  v_builder boolean;
  v_member  boolean;
  v_chart   jsonb;
  v_table   uuid;
  v_trow    custom.record;
  v_allowed text[];
  v_groups  text[] := '{}';
  v_by      text;
  v_bkey    text;
  v_bucket  jsonb;
  v_cal     jsonb;
  v_tz      text;
  v_ws      text;
  v_measures jsonb;
  v_m       jsonb;
  v_op      text;
  v_key     text;
  v_where   text := 'true';
  v_flat    jsonb;
  v_map     jsonb;
  v_me      text;
  v_meonly  boolean := false;
  v_target  uuid;
  v_mine    text[];
  v_email   text;
  v_gsel    text[] := '{}';
  v_glbl    text[] := '{}';
  v_msel    text[] := '{}';
  v_read    text[] := '{}';
  v_kind    text;
  v_val     text;
  v_blank   text;
  v_rows    jsonb;
  v_limit   integer;
  v_started timestamptz := clock_timestamp();
  v_mk      text;
  v_cur     numeric;
  v_out     jsonb;
  v_orderby text;
  i         integer;
  k         text;
  v_lat_key  text[] := '{}';
  v_lat_expr text[] := '{}';
  v_gkind   text[] := '{}';
  v_mom     text;
  v_isf     boolean;
  v_parts   text[];
  v_split_keys text[] := '{}';
  v_split_sql  text := '';
  v_i       integer;
begin
  if v_uid is null or p_interface_id is null or nullif(btrim(coalesce(p_chart_id, '')), '') is null then
    return null;
  end if;
  select * into d from custom.record r
   where r.id = p_interface_id
     and r.table_id = custom.presentation_kernel_id()
     and r.data_class = custom.dashboard_class()
     and r.deleted_at is null
     and r.data -> 'presentation' ->> 'kind' = 'interface';
  if d.id is null or not iam.has_access_for(v_uid, 'record', d.id, 'viewer'::public.permission_level) then
    return null;
  end if;
  v_org := d.organization_id;
  v_p := coalesce(d.data -> 'presentation', '{}'::jsonb);
  v_builder := iam.has_access_for(v_uid, 'record', d.id, 'editor'::public.permission_level);
  v_member := iam.has_org_access(v_org);

  -- the chart, from what was PUBLISHED (a builder previewing the draft may also name a draft chart)
  select c into v_chart
    from jsonb_array_elements(case jsonb_typeof(v_p -> 'published' -> 'pages') when 'array' then v_p -> 'published' -> 'pages' else '[]'::jsonb end) pg,
         jsonb_array_elements(case jsonb_typeof(pg -> 'charts') when 'array' then pg -> 'charts' else '[]'::jsonb end) c
   where c ->> 'id' = p_chart_id
   limit 1;
  if v_chart is null and v_builder then
    select c into v_chart
      from jsonb_array_elements(case jsonb_typeof(v_p -> 'draft' -> 'pages') when 'array' then v_p -> 'draft' -> 'pages' else '[]'::jsonb end) pg,
           jsonb_array_elements(case jsonb_typeof(pg -> 'charts') when 'array' then pg -> 'charts' else '[]'::jsonb end) c
     where c ->> 'id' = p_chart_id
     limit 1;
  end if;
  if v_chart is null then
    return null;
  end if;
  v_table := case when coalesce(v_chart ->> 'subject', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                  then (v_chart ->> 'subject')::uuid end;
  select * into v_trow from custom.record t where t.id = v_table and t.organization_id = v_org and t.deleted_at is null;
  if v_trow.id is null then
    return null;
  end if;

  -- the columns the interface door exposes for this table, never any other
  select coalesce(array_agg(distinct fl.key), '{}') into v_allowed
    from custom.field fl
   where fl.entity_definition_id = v_table and fl.organization_id = v_org
     and coalesce(fl.sensitivity, 'internal') in ('public', 'internal')
     and (fl.type <> 'formula' or fl.config ->> 'system' in ('created_time', 'modified_time'));

  v_limit := least(greatest(coalesce(nullif(v_chart ->> 'limit', '')::integer, 200), 1), 500);
  v_cal := custom.agg_calendar(v_org);
  v_tz := v_cal ->> 'time_zone';
  v_ws := v_cal ->> 'week_start';

  -- every column the chart reads: groups, the date period, each measure's column
  if jsonb_typeof(v_chart -> 'groupBy') = 'array' then
    v_groups := array(select jsonb_array_elements_text(v_chart -> 'groupBy'));
  end if;
  v_bucket := case when jsonb_typeof(v_chart -> 'bucket') = 'object' then v_chart -> 'bucket' end;
  v_measures := case when jsonb_typeof(v_chart -> 'measures') = 'array' and jsonb_array_length(v_chart -> 'measures') > 0
                     then v_chart -> 'measures' else '[{"op":"count"}]'::jsonb end;
  v_read := v_groups;
  if v_bucket is not null then v_read := v_read || array[v_bucket ->> 'key']; end if;
  for v_m in select e from jsonb_array_elements(v_measures) e loop
    if lower(coalesce(v_m ->> 'op', 'count')) <> 'count' then v_read := v_read || array[v_m ->> 'key']; end if;
  end loop;
  foreach k in array v_read loop
    -- created_at / updated_at are real columns every reader of a row sees
    -- a worked-out column (a formula) is chartable only when every column it reads is one this reader sees
    if k is null or not (k = any (v_allowed) or k in ('created_at', 'updated_at')
                         or custom.interface_chart_formula_ok(v_org, v_table, k, v_allowed, 0)) then
      select exists (select 1 from custom.field fl where fl.entity_definition_id = v_table and fl.organization_id = v_org
                        and fl.key = k and fl.type = 'formula'
                        and coalesce(fl.sensitivity, 'internal') in ('public', 'internal')) into v_isf;
      return jsonb_build_object('id', v_chart ->> 'id', 'title', v_chart ->> 'title', 'kind', coalesce(v_chart ->> 'kind', 'bar'),
        'refused', case when coalesce(v_isf, false)
                        then 'This chart reads a formula that depends on a column that is not shared with you.'
                        else 'This chart reads a column that is not shared with you.' end,
        'sqlstate', '42501');
    end if;
  end loop;
  if cardinality(v_groups) > 2 then
    return jsonb_build_object('id', v_chart ->> 'id', 'title', v_chart ->> 'title', 'kind', coalesce(v_chart ->> 'kind', 'bar'),
      'refused', 'This chart groups by more columns than the shared view can draw.', 'sqlstate', '0A000');
  end if;

  -- the rows: the chart's own question (unset conditions ask nothing), as an interface element asks it
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_flat
    from jsonb_each(case jsonb_typeof(v_chart -> 'filter') when 'object' then v_chart -> 'filter' else '{}'::jsonb end) e
   where e.value <> 'null'::jsonb;
  v_map := custom.choice_field_map(v_org, v_table);
  if v_flat <> '{}'::jsonb then
    -- a filter on a column she does not see (or a formula over one) is refused like a group is: no rows, no counts, no column named
    begin
      v_where := v_where || ' and ' || custom.record_filter_sql(v_org, v_table,
        case when custom.filter_is_rule(v_flat) then v_flat else custom.choice_filter_normalize(v_map, v_flat) end);
    exception when sqlstate '42501' then
      return jsonb_build_object('id', v_chart ->> 'id', 'title', v_chart ->> 'title', 'kind', coalesce(v_chart ->> 'kind', 'bar'),
        'refused', 'This chart filters on a column that is not shared with you.', 'sqlstate', '42501');
    end;
  end if;

  -- "current user": a chart reads no more rows than the interface's own elements on this table show this reader
  select b ->> 'me_field', coalesce((b ->> 'me_only')::boolean, false) into v_me, v_meonly
    from jsonb_array_elements(case jsonb_typeof(v_p -> 'published' -> 'pages') when 'array' then v_p -> 'published' -> 'pages' else '[]'::jsonb end) pg,
         jsonb_array_elements(case jsonb_typeof(pg -> 'blocks') when 'array' then pg -> 'blocks' else '[]'::jsonb end) b
   where b ->> 'table_id' = v_table::text and nullif(b ->> 'me_field', '') is not null
   limit 1;
  if v_me is not null and (v_meonly or not v_member) then
    select fl.relation_target into v_target from custom.field fl
     where fl.entity_definition_id = v_table and fl.organization_id = v_org and fl.key = v_me
     limit 1;
    select lower(u.email) into v_email from auth.users u where u.id = v_uid;
    v_mine := array[v_uid::text] || case when v_email is not null then array[v_email] else '{}'::text[] end;
    if v_target is not null then
      v_mine := v_mine || coalesce(array(
        select p.id::text from custom.record p
         where p.table_id = v_target and p.deleted_at is null
           and (p.data ->> 'user_id' = v_uid::text or (v_email is not null and lower(p.data ->> 'email') = v_email))
         limit 50), '{}');
    end if;
    v_where := v_where || format(
      ' and exists (select 1 from jsonb_array_elements(case jsonb_typeof(r.data -> %1$L) when ''array'' then r.data -> %1$L'
      || ' when ''null'' then ''[]''::jsonb else jsonb_build_array(r.data -> %1$L) end) e'
      || ' where lower(coalesce(e ->> ''id'', e ->> ''record_id'', e #>> ''{}'')) = any (%2$L::text[]))', v_me, v_mine);
  end if;

  -- The interface door has decided this reader may read rows of this table (above); the read path's worked-out column asks the
  -- same question again (custom.assert_may_know_table, inside table_type_field) of a person who knows the table only through an
  -- interface. Give it the answer it keeps for exactly this seat, this statement, this table - nothing wider.
  perform platform.memo_k_put('w:k:' || v_org::text || ':' || v_table::text, '1');

  -- groups
  foreach k in array v_groups loop
    -- a formula is worked out by the read path (the same engine the members' chart and page read use), once per row
    v_val := custom.agg_field_value_sql(v_org, v_table, k);
    if v_val <> custom.agg_value_sql(k) then
      v_i := array_position(v_lat_key, k);
      if v_i is null then
        v_lat_key := array_append(v_lat_key, k);
        v_lat_expr := array_append(v_lat_expr, v_val);
        v_i := cardinality(v_lat_key);
      end if;
      v_val := format('w.v%s', v_i);
    end if;
    -- each part of a many-value column is counted under its own group, exactly as the members' chart counts it (agg_sql, split_multi)
    v_i := array_position(v_split_keys, k);
    if v_i is null then v_i := cardinality(v_split_keys) + 1; end if;
    v_parts := custom.agg_split_parts(v_org, v_table, k, 's' || v_i);
    if v_parts is not null then
      if array_position(v_split_keys, k) is null then
        v_split_keys := array_append(v_split_keys, k);
        v_split_sql := v_split_sql || v_parts[1];
      end if;
      v_val := v_parts[2];
    end if;
    v_gsel := v_gsel || v_val;
    v_glbl := v_glbl || quote_literal(k);
    v_gkind := array_append(v_gkind, custom.agg_field_kind(v_org, v_table, k));
  end loop;
  if v_bucket is not null then
    v_by := lower(coalesce(v_bucket ->> 'by', 'month'));
    if not (v_by = any (custom.agg_buckets())) then
      return jsonb_build_object('id', v_chart ->> 'id', 'title', v_chart ->> 'title', 'kind', coalesce(v_chart ->> 'kind', 'bar'),
        'refused', format('"%s" is not a date grain.', v_by), 'sqlstate', '22023');
    end if;
    v_bkey := v_bucket ->> 'key';
    v_mom := custom.agg_moment_sql(v_bkey, v_tz);
    v_val := custom.agg_field_value_sql(v_org, v_table, v_bkey);
    if v_val <> custom.agg_value_sql(v_bkey) then
      v_i := array_position(v_lat_key, v_bkey);
      if v_i is null then
        v_lat_key := array_append(v_lat_key, v_bkey);
        v_lat_expr := array_append(v_lat_expr, v_val);
        v_i := cardinality(v_lat_key);
      end if;
      v_mom := replace(v_mom, custom.agg_value_sql(v_bkey), format('w.v%s', v_i));
    end if;
    v_gsel := v_gsel || format('custom.agg_local_label(custom.agg_period_start((%s) at time zone %L, %L, %L), %L)',
                               v_mom, v_tz, v_by, v_ws, v_tz);
    v_glbl := v_glbl || quote_literal(v_bkey || '_' || v_by);
    v_gkind := array_append(v_gkind, null::text);
  end if;

  -- measures
  for v_m in select e from jsonb_array_elements(v_measures) e loop
    v_op := lower(coalesce(v_m ->> 'op', 'count'));
    if v_op = 'count' then
      v_msel := v_msel || (quote_literal('count') || ', count(*)::numeric');
    elsif v_op in ('sum', 'avg', 'min', 'max') then
      v_key := custom.agg_assert_key(v_m ->> 'key');
      v_val := custom.agg_field_value_sql(v_org, v_table, v_key);
      if v_val <> custom.agg_value_sql(v_key) then
        v_i := array_position(v_lat_key, v_key);
        if v_i is null then
          v_lat_key := array_append(v_lat_key, v_key);
          v_lat_expr := array_append(v_lat_expr, v_val);
          v_i := cardinality(v_lat_key);
        end if;
        v_val := format('w.v%s', v_i);
      end if;
      v_msel := v_msel || (quote_literal(v_op || '_' || v_key) || ', ' ||
        format('%s(case when pg_input_is_valid(nullif(btrim(%s), ''''), ''numeric'') then nullif(btrim(%s), '''')::numeric end)::numeric', v_op, v_val, v_val));
    else
      return jsonb_build_object('id', v_chart ->> 'id', 'title', v_chart ->> 'title', 'kind', coalesce(v_chart ->> 'kind', 'bar'),
        'refused', format('"%s" is not a measure the shared view can draw.', v_op), 'sqlstate', '0A000');
    end if;
  end loop;

  if cardinality(v_gsel) > 0 then
    select string_agg(format('(nullif(%s, %L) is null)', v_gsel[g], ''), ', ' order by g) into v_blank
      from generate_subscripts(v_gsel, 1) g;
    -- a date period reads oldest first; groups read largest first
    v_orderby := coalesce(v_blank || ', ', '') ||
                 case when v_bucket is not null then format('%s asc, count(*) desc', v_gsel[cardinality(v_gsel)]) else 'count(*) desc' end;
  else
    v_orderby := 'count(*) desc';
  end if;

  execute format($q$
    select coalesce(jsonb_agg(jsonb_build_object('groups', x.groups, 'measures', x.measures, 'row_count', x.row_count)), '[]'::jsonb)
      from (select %s as groups, jsonb_build_object(%s) as measures, count(*)::bigint as row_count
              from custom.record r %s
             where r.organization_id = %L::uuid and r.table_id = %L::uuid and r.deleted_at is null
               and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
               and %s
             %s
             order by %s
             limit %s) x
  $q$,
    case when cardinality(v_gsel) = 0 then '''{}''::jsonb'
         else 'jsonb_build_object(' || (select string_agg(v_glbl[g] || ', ' ||
                -- a number or yes/no group comes back as that, exactly as the members' chart answers it
                case when v_gkind[g] in ('number', 'boolean') then format('custom.agg_group_value(%s, %L)', v_gsel[g], v_gkind[g]) else v_gsel[g] end, ', ')
                from generate_subscripts(v_gsel, 1) g) || ')' end,
    array_to_string(v_msel, ', '),
    -- `offset 0` keeps the planner from working a formula out once per mention
    v_split_sql || case when cardinality(v_lat_expr) = 0 then ''
         else 'cross join lateral (select ' || (select string_agg(v_lat_expr[g] || ' as v' || g, ', ') from generate_subscripts(v_lat_expr, 1) g) || ' offset 0) w' end,
    v_org, v_table, v_where,
    case when cardinality(v_gsel) = 0 then '' else 'group by ' || array_to_string(v_gsel, ', ') end,
    v_orderby, v_limit)
  into v_rows;

  -- the group words (a choice stored "to_request" reads "To request"), exactly as the member door words them
  select coalesce(jsonb_agg(jsonb_set(r, '{groups}', custom.choice_render_groups(v_map, r -> 'groups'))), '[]'::jsonb) into v_rows
    from jsonb_array_elements(v_rows) r;

  -- the total, from the rows just answered (an additive measure only), so a tile and the chart agree
  v_mk := case when (v_measures -> 0 ->> 'op') is null or lower(v_measures -> 0 ->> 'op') = 'count' then 'count'
               else lower(v_measures -> 0 ->> 'op') || '_' || (v_measures -> 0 ->> 'key') end;
  v_out := jsonb_build_object(
    'id', v_chart ->> 'id', 'title', coalesce(v_chart ->> 'title', 'Chart'), 'kind', coalesce(v_chart ->> 'kind', 'bar'),
    'table_id', v_table, 'group_by', to_jsonb(v_groups), 'measures', v_measures, 'limit', v_limit,
    'rows', v_rows, 'ms', round(extract(epoch from clock_timestamp() - v_started) * 1000)::integer)
    || case when v_bucket is not null then jsonb_build_object('bucket', v_bucket) else '{}'::jsonb end
    || case when jsonb_typeof(v_chart -> 'filter') = 'object' then jsonb_build_object('filter', v_chart -> 'filter') else '{}'::jsonb end
    || case when jsonb_typeof(v_chart -> 'span') = 'number' then jsonb_build_object('span', v_chart -> 'span') else '{}'::jsonb end;
  if split_part(v_mk, '_', 1) in ('count', 'sum') then
    select sum(case when jsonb_typeof(r -> 'measures' -> v_mk) = 'number' then (r -> 'measures' ->> v_mk)::numeric end) into v_cur
      from jsonb_array_elements(v_rows) r;
    v_out := v_out || jsonb_build_object('totals', jsonb_build_object('measure', v_mk, 'current', coalesce(v_cur, 0)));
  end if;
  return v_out;
end
$function$;

select custom.reopen_declared_doors();
