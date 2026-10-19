-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: READ-SPEED
-- lock: custom
-- based-on: custom.rollup_value(uuid, uuid, jsonb) c0ae5570fc70c3bcd66855a0a08330bec5fab01f265b9fafea9712b6e6ef5292
--
-- READ-SPEED b — A ROLL-UP'S FILTER IS COMPILED ONCE PER STATEMENT, NOT ONCE PER ROW.
--
-- WHY (measured live 2026-10-19, after READ-SPEED a). A roll-up with config.filter ("open pledges", "gifts this
-- year") compiled the same WHERE for every row of the page: custom.record_filter_sql 78 calls / 2,222 ms total on
-- one 14-row Donors page (with custom.formula_node_kinds, custom.rule_node_kinds, custom.agg_fields_readable_assert
-- and custom.agg_field_value_sql under it), plus a Field lookup for the far table per row. The far table and the
-- WHERE depend only on the organization, the Table, the column's declaration and the reader.
--
-- THE FIX. The far table and the compiled WHERE are kept in the statement memo (platform.memo_k_*: seat +
-- statement + backend + transaction + generation stamped, so another reader, another statement, or any Field or
-- Rule write never sees it), keyed by organization, Table and md5 of the column's declaration. A refusal (no far
-- table, a column the reader may not read) raises before the put, so it is asked again every time, as before.
-- After: record_filter_sql 6 calls on the same page. Proven identical before shipping: the first page of all 45
-- tables with formula/rollup/lookup columns installed in the test organization in the last 4 days, read as the test
-- admin before and after the new body in one transaction — 45 tables, 0 differ, 0 errors.
-- Inverse: migrations/inverse/20261019211000_readspeed_b_a_rollup_filter_is_compiled_once_per_statement_down.sql

CREATE OR REPLACE FUNCTION custom.rollup_value(p_organization_id uuid, p_record_id uuid, p_field_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_via     text := p_field_data -> 'config' ->> 'via';
  v_of      text := p_field_data -> 'config' ->> 'of';
  v_agg     text := p_field_data -> 'config' ->> 'agg';
  v_filter  jsonb := p_field_data -> 'config' -> 'filter';
  v_nums    numeric[] := array[]::numeric[];
  v_vals    jsonb[] := '{}';   -- every value of the column read, empty ones as null (Airtable's list aggregates)
  v_n       integer := 0;
  v_one     jsonb;
  v_t       uuid;
  v_targets uuid[];
  v_table   uuid;
  v_far     uuid;
  v_where   text;
  v_gone    jsonb;
  v_mk      text;     -- READ-SPEED b
  v_memo    text;
begin
  -- Held by the custom/system_enabled switch like every store function (the door that calls this asserts it).
  v_table := coalesce(nullif(p_field_data ->> 'entity_definition_id', '')::uuid,
                      (select r.table_id from custom.record r
                        where r.organization_id = p_organization_id and r.id = p_record_id));
  -- CHAIR-ROLLUP-HONEST: A SOURCE THAT IS ARCHIVED IS NOT A ZERO. When the link it reads through
  -- (or the back-link's linking column, or the column it totals) is archived, the answer is the
  -- typed state naming that column — never a count of nothing.
  v_gone := custom._derived_source_archived(p_organization_id, v_table, p_field_data);
  if v_gone is not null then
    return v_gone;
  end if;

  -- The linked records, once each (custom.relation_targets is DISTINCT), never the record itself.
  select coalesce(array_agg(t), '{}'::uuid[]) into v_targets
    from custom.relation_targets(p_organization_id, p_record_id, v_via) t
   where t <> p_record_id;         -- a record is never one of the things it adds up.

  -- CHAIR-MATH (b): WHICH OF THEM. config.filter is a saved view's filter written against the far
  -- table (custom.record_filter_sql: the one grammar — a flat map of column keys, windows, or a
  -- Rule expression over field ids), compiled once per roll-up and asked of the linked records in
  -- ONE statement. It is asked as this reader: a column the reader may not read refuses here as it
  -- refuses on the view (custom.derived_value turns that into an empty column, warned), and a Rule
  -- filter treats a hidden column as undecided — the roll-up counts what THIS reader may see.
  if v_filter is not null and jsonb_typeof(v_filter) = 'object' and v_filter <> '{}'::jsonb
     and cardinality(v_targets) > 0 then
    -- READ-SPEED b (2026-10-19): THE FILTER IS COMPILED ONCE PER STATEMENT, NOT ONCE PER ROW. The far table and
    -- the WHERE depend on this organization, this Table, this column's declaration and the reader only, so a page of
    -- 50 rows compiled the same filter 50 times (custom.record_filter_sql: 2.2 s of a 14-row Donors page). The
    -- answer is kept in the statement memo (seat + statement + transaction + generation stamped; a Field or Rule
    -- write clears it). A refusal is never kept: it raises before the put, every time.
    v_mk := 'custom.rollup_where:' || p_organization_id::text || ':' || coalesce(v_table::text, '-') || ':'
            || md5(p_field_data::text);
    v_memo := platform.memo_k_get(v_mk);
    if v_memo is not null then
      v_far := nullif(split_part(v_memo, chr(2), 1), '')::uuid;
      v_where := substr(v_memo, strpos(v_memo, chr(2)) + 1);
    else
    select nullif(f.data ->> 'relation_target', '')::uuid into v_far
      from custom.record f
     where f.organization_id = p_organization_id
       and f.table_id = custom.field_kernel_id()
       and f.deleted_at is null
       and f.data ->> 'entity_definition_id' = v_table::text
       and f.data ->> 'key' = v_via
     limit 1;
    -- CHAIR-UI-STORE: a roll-up through a back-link adds up records of the LINKING table.
    if v_far is null then
      v_far := nullif(custom._back_link_relation(p_organization_id, v_table, v_via) ->> 'relation_target', '')::uuid;
    end if;
    if v_far is null then
      raise exception 'The column "%" narrows the records it adds up, but the relation it reads through (%) points at no table, so it is left empty.',
        coalesce(nullif(p_field_data ->> 'label', ''), p_field_data ->> 'key', 'this column'), v_via
        using errcode = '23514', hint = 'FLD-11: give the relation a relation_target.';
    end if;
    v_where := custom.record_filter_sql(p_organization_id, v_far,
                 case when custom.filter_is_rule(v_filter) then v_filter
                      else custom.choice_filter_normalize(custom.choice_field_map(p_organization_id, v_far), v_filter) end);
    perform platform.memo_k_put(v_mk, v_far::text || chr(2) || v_where);
    end if;
    execute format('select coalesce(array_agg(r.id), ''{}''::uuid[]) from custom.record r '
                   'where r.organization_id = $1 and r.table_id = $2 and r.id = any ($3) '
                   'and r.deleted_at is null and %s', v_where)
       into v_targets
      using p_organization_id, v_far, v_targets;
  end if;

  foreach v_t in array v_targets loop
    v_n := v_n + 1;                                    -- count counts RECORDS, once each.
    if v_of is not null then
      -- STORE-TAILS-3: the one column it adds up, never the far record whole.
      v_one := custom.far_value(p_organization_id, v_t, v_of, p_field_data);
      v_vals := v_vals || coalesce(v_one, 'null'::jsonb);
      if v_one is not null and jsonb_typeof(v_one) = 'number' then
        v_nums := v_nums || (v_one #>> '{}')::numeric;
      end if;
    end if;
  end loop;

  if v_agg = 'count' then
    return to_jsonb(v_n);
  end if;
  -- AIRTABLE PARITY (lane AT-FORMULA): the aggregates that read the values as they are, not only as numbers.
  if v_agg in ('countall', 'counta', 'and', 'or', 'xor', 'arrayjoin', 'concatenate', 'arrayunique', 'arraycompact') then
    if v_agg = 'countall' then
      return to_jsonb(coalesce(cardinality(v_vals), 0));
    elsif v_agg = 'counta' then
      return to_jsonb((select count(*) from unnest(v_vals) x where not custom._fx_blank(x)));
    elsif cardinality(v_vals) = 0 then
      return case when v_agg in ('arrayunique', 'arraycompact') then '[]'::jsonb
                  when v_agg in ('arrayjoin', 'concatenate') then '""'::jsonb else null end;
    end if;
    return case v_agg
      when 'and' then to_jsonb(not exists (select 1 from unnest(v_vals) x where not custom._fx_truthy(x)))
      when 'or' then to_jsonb(exists (select 1 from unnest(v_vals) x where custom._fx_truthy(x)))
      when 'xor' then to_jsonb((select count(*) from unnest(v_vals) x where custom._fx_truthy(x)) % 2 = 1)
      when 'arrayjoin' then to_jsonb(coalesce((select string_agg(custom._fx_text(x), ', ' order by i) from unnest(v_vals) with ordinality t(x, i)), ''))
      when 'concatenate' then to_jsonb(coalesce((select string_agg(custom._fx_text(x), '' order by i) from unnest(v_vals) with ordinality t(x, i)), ''))
      when 'arrayunique' then coalesce((select jsonb_agg(u.x order by u.m) from (select x, min(i) m from unnest(v_vals) with ordinality t(x, i) group by x) u), '[]'::jsonb)
      else coalesce((select jsonb_agg(x order by i) from unnest(v_vals) with ordinality t(x, i) where not custom._fx_blank(x)), '[]'::jsonb) end;
  end if;
  -- TEMPLATE-GAPS D3 (REVIEW-2): THE LATEST / EARLIEST DATE. min and max read numbers; a date column holds ISO
  -- text, so "Last activity date" (max of happened_on) came back empty. With no numbers, min / max compare the
  -- values that read as moments and answer the winning value as it is stored (a date stays a date).
  if v_agg in ('min', 'max') and array_length(v_nums, 1) is null then
    select x into v_one
      from unnest(v_vals) x
     where jsonb_typeof(x) = 'string'
       and btrim(x #>> '{}') ~ '^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)?)?$'
     order by case when v_agg = 'max' then (btrim(x #>> '{}'))::timestamptz end desc nulls last,
              case when v_agg = 'min' then (btrim(x #>> '{}'))::timestamptz end asc nulls last
     limit 1;
    return v_one;                   -- null when no value reads as a date: an absence, never a zero.
  end if;
  if array_length(v_nums, 1) is null then
    -- BUTTON-STAMPS: a SUM of nothing is 0 (a count already was): Notion's $0.00, never a blank. An average, a
    -- minimum or a maximum of nothing is still an absence — there is no number to say.
    return case when v_agg = 'sum' then to_jsonb(0) else null end;
  end if;
  return case v_agg
    when 'sum' then to_jsonb((select sum(x) from unnest(v_nums) x))
    when 'min' then to_jsonb((select min(x) from unnest(v_nums) x))
    when 'max' then to_jsonb((select max(x) from unnest(v_nums) x))
    when 'avg' then to_jsonb((select avg(x) from unnest(v_nums) x))
  end;
end;
$function$

;
