-- lane: VIEW-LINK-2
-- chair-step: puts the reading back without the choice_order key
CREATE OR REPLACE FUNCTION custom._saved_view_public_read(p_view_id uuid, p_org uuid, p_namespace text, p_notice text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_view   platform.saved_view;
  v_table  uuid;
  v_trow   custom.record;
  v_def    jsonb;
  v_hidden text[];
  v_hidden_ids text[];
  v_fields jsonb;
  v_keys   text[];
  v_where  text := 'true';
  v_expr   jsonb;
  v_order  text := 'r.created_at, r.id';
  v_sorts  text[] := '{}';
  s        jsonb;
  v_rows   jsonb;
  v_n      integer;
  v_refs   jsonb := '{}'::jsonb;
  v_labels jsonb := '{}'::jsonb;
  f        record;
  v_limit  constant integer := 500;
begin
  select * into v_view from platform.saved_view sv
   where sv.id = p_view_id and sv.organization_id = p_org and sv.deleted_at is null;
  if v_view.id is null then
    return null;
  end if;
  v_def := coalesce(v_view.definition, '{}'::jsonb);
  v_table := coalesce(v_view.subject_id, nullif(v_def ->> 'table_id', '')::uuid);

  select * into v_trow from custom.record t where t.id = v_table and t.organization_id = p_org;
  if v_trow.id is null then
    return null;
  end if;
  if v_trow.deleted_at is not null then
    -- the view is real and was published on purpose: say what happened to it, never show its rows
    return jsonb_build_object('state', 'archived', 'title', v_view.name, 'namespace', p_namespace, 'notice', p_notice);
  end if;

  v_hidden := coalesce(array(select jsonb_array_elements_text(coalesce(v_def -> 'presentation' -> 'hiddenFields', '[]'::jsonb))), '{}');
  v_hidden_ids := coalesce(array(select jsonb_array_elements_text(coalesce(v_def -> 'hidden_fields', '[]'::jsonb))), '{}');

  -- the fields the view shows: its table's fields, not hidden by the view, not above internal
  -- sensitivity, and not computed ones whose value is not stored (stamps are read from the row)
  select coalesce(jsonb_agg(jsonb_build_object(
           'key', fl.key, 'label', coalesce(nullif(fl.label, ''), fl.name, fl.key), 'type', fl.type,
           'multi', coalesce(fl.multi, false), 'system', fl.config ->> 'system',
           'relation_target', fl.relation_target, 'format', fl.format) order by fl.sort, fl.key), '[]'::jsonb),
         coalesce(array_agg(fl.key order by fl.sort, fl.key), '{}')
    into v_fields, v_keys
    from custom.field fl
   where fl.entity_definition_id = v_table and fl.organization_id = p_org
     and fl.key <> all (v_hidden) and fl.id::text <> all (v_hidden_ids)
     and coalesce(fl.sensitivity, 'internal') in ('public', 'internal')
     and (fl.type <> 'formula' or fl.config ->> 'system' in ('created_time', 'modified_time'));

  -- the view's own question: its rule, then its flat map, each compiled by the list door's builder
  foreach v_expr in array array[v_def -> 'where', v_def -> 'filters']
  loop
    if v_expr is not null and jsonb_typeof(v_expr) = 'object' and v_expr <> '{}'::jsonb then
      v_where := v_where || ' and ' || custom.record_filter_sql(p_org, v_table,
        case when custom.filter_is_rule(v_expr) then v_expr
             else custom.choice_filter_normalize(custom.choice_field_map(p_org, v_table), v_expr) end);
    end if;
  end loop;

  -- the view's own sort (up to five), by stored value; the table's order otherwise
  if jsonb_typeof(v_def -> 'sorts') = 'array' then
    for s in select e from jsonb_array_elements(v_def -> 'sorts') e limit 5 loop
      if (s ->> 'field') = any (v_keys) then
        v_sorts := v_sorts || format('r.data -> %L %s nulls last', s ->> 'field',
                                     case when lower(coalesce(s ->> 'direction', 'asc')) = 'desc' then 'desc' else 'asc' end);
      end if;
    end loop;
    if array_length(v_sorts, 1) > 0 then
      v_order := array_to_string(v_sorts, ', ') || ', r.created_at, r.id';
    end if;
  end if;

  execute format($q$
    select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'created_at', q.created_at, 'updated_at', q.updated_at, 'values', q.vals)), '[]'::jsonb),
           count(*)::integer
      from (select r.id, r.created_at, r.updated_at,
                   coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(r.data) e where e.key = any (%L::text[])), '{}'::jsonb) as vals
              from custom.record r
             where r.organization_id = %L::uuid and r.table_id = %L::uuid and r.deleted_at is null and %s
             order by %s
             limit %s) q
  $q$, v_keys, p_org, v_table, v_where, v_order, v_limit)
  into v_rows, v_n;

  -- the words of what the cells point at: related records and people by their names...
  select coalesce(jsonb_object_agg(x.id, custom.record_words(p_org, x.id::uuid)), '{}'::jsonb) into v_refs
    from (select distinct c.id
            from jsonb_array_elements(v_rows) row_,
                 jsonb_each(row_ -> 'values') cell,
                 jsonb_array_elements(case jsonb_typeof(cell.value) when 'array' then cell.value else jsonb_build_array(cell.value) end) el,
                 lateral (select case jsonb_typeof(el) when 'string' then el #>> '{}'
                                                       when 'object' then coalesce(el ->> 'id', el ->> 'record_id') end as id) c
           where cell.key in (select fl ->> 'key' from jsonb_array_elements(v_fields) fl where fl ->> 'relation_target' is not null)
             and c.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           limit 2000) x;

  -- ...and choice values in their own words
  for f in
    select fl.key, fl.options_table_id
      from custom.field fl
     where fl.entity_definition_id = v_table and fl.organization_id = p_org
       and fl.key = any (v_keys) and fl.options_table_id is not null
  loop
    v_labels := v_labels || jsonb_build_object(f.key, coalesce((
      select jsonb_object_agg(lower(regexp_replace(o.data ->> 'title', '[^A-Za-z0-9]+', '', 'g')), o.data ->> 'title')
        from custom.record o
       where o.table_id = f.options_table_id and o.organization_id = p_org and o.deleted_at is null
         and o.data ->> 'title' is not null), '{}'::jsonb));
  end loop;

  return jsonb_build_object(
    'state', 'open', 'title', v_view.name, 'table', coalesce(v_trow.data ->> 'name', v_trow.data ->> 'title'),
    'layout', coalesce(v_def ->> 'layout', 'grid'),
    'group_field', v_def ->> 'group_field', 'date_field', v_def ->> 'date_field', 'end_field', v_def ->> 'end_field',
    'board_hide_empty', coalesce(v_def -> 'presentation' ->> 'boardHideEmpty', 'false') = 'true',
    'namespace', p_namespace, 'notice', p_notice,
    'fields', v_fields, 'rows', v_rows, 'count', v_n, 'truncated', v_n >= v_limit,
    'refs', v_refs, 'labels', v_labels);
end
$function$;
