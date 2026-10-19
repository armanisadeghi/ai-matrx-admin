-- lane: CHART-READ-2
-- chair-step: restores the previous body of custom.interface_chart (AT-FIX-G1b) and drops the formula helper
-- inverse of: migrations/campaign/atcr2_a_an_outsiders_chart_can_cut_by_a_formula.sql
create or replace function custom.interface_chart(p_interface_id uuid, p_chart_id text)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to 'pg_catalog'
as $function$
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
    if k is null or not (k = any (v_allowed) or k in ('created_at', 'updated_at')) then
      return jsonb_build_object('id', v_chart ->> 'id', 'title', v_chart ->> 'title', 'kind', coalesce(v_chart ->> 'kind', 'bar'),
        'refused', 'This chart reads a column that is not shared with you.', 'sqlstate', '42501');
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
    v_where := v_where || ' and ' || custom.record_filter_sql(v_org, v_table,
      case when custom.filter_is_rule(v_flat) then v_flat else custom.choice_filter_normalize(v_map, v_flat) end);
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

  -- groups
  foreach k in array v_groups loop
    v_val := custom.agg_value_sql(k);
    v_gsel := v_gsel || v_val;
    v_glbl := v_glbl || quote_literal(k);
  end loop;
  if v_bucket is not null then
    v_by := lower(coalesce(v_bucket ->> 'by', 'month'));
    if not (v_by = any (custom.agg_buckets())) then
      return jsonb_build_object('id', v_chart ->> 'id', 'title', v_chart ->> 'title', 'kind', coalesce(v_chart ->> 'kind', 'bar'),
        'refused', format('"%s" is not a date grain.', v_by), 'sqlstate', '22023');
    end if;
    v_bkey := v_bucket ->> 'key';
    v_gsel := v_gsel || format('custom.agg_local_label(custom.agg_period_start((%s) at time zone %L, %L, %L), %L)',
                               custom.agg_moment_sql(v_bkey, v_tz), v_tz, v_by, v_ws, v_tz);
    v_glbl := v_glbl || quote_literal(v_bkey || '_' || v_by);
  end if;

  -- measures
  for v_m in select e from jsonb_array_elements(v_measures) e loop
    v_op := lower(coalesce(v_m ->> 'op', 'count'));
    if v_op = 'count' then
      v_msel := v_msel || (quote_literal('count') || ', count(*)::numeric');
    elsif v_op in ('sum', 'avg', 'min', 'max') then
      v_key := custom.agg_assert_key(v_m ->> 'key');
      v_val := custom.agg_value_sql(v_key);
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
              from custom.record r
             where r.organization_id = %L::uuid and r.table_id = %L::uuid and r.deleted_at is null
               and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
               and %s
             %s
             order by %s
             limit %s) x
  $q$,
    case when cardinality(v_gsel) = 0 then '''{}''::jsonb'
         else 'jsonb_build_object(' || (select string_agg(v_glbl[g] || ', ' || v_gsel[g], ', ') from generate_subscripts(v_gsel, 1) g) || ')' end,
    array_to_string(v_msel, ', '),
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
drop function if exists custom.interface_chart_formula_ok(uuid, uuid, text, text[], integer);
