-- lane: AT-INTERFACE
-- lock: custom
-- based-on: custom.interface_rows(uuid, text, uuid, integer, integer) d8aa903006663f921ff5a202a4facd6bc43cfa5f7766afe047e0148f300cdc58
-- scope: ONE interface serves the agency and its client. An element's "current user" column (me_field) now ALWAYS narrows the
--   rows for a viewer outside the interface's organization (a client contact sees only the rows that name her), and narrows a
--   member's rows only when the element says me_only. Before, an element without me_only showed every row to the client.
-- inverse: migrations/inverse/atinterface_b_a_client_contact_sees_only_rows_that_name_her_down.sql

create or replace function custom.interface_rows(p_interface_id uuid, p_element_id text, p_record_id uuid default null,
                                                 p_limit integer default 200, p_offset integer default 0)
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
  v_el      jsonb;
  v_table   uuid;
  v_trow    custom.record;
  v_builder boolean;
  v_member  boolean;
  v_want    text[];
  v_fields  jsonb;
  v_keys    text[];
  v_where   text := 'true';
  v_expr    jsonb;
  v_flat    jsonb;
  v_view    platform.saved_view;
  v_def     jsonb := '{}'::jsonb;
  v_me      text;
  v_target  uuid;
  v_mine    text[];
  v_email   text;
  v_order   text := 'r.created_at, r.id';
  v_sorts   text[] := '{}';
  s         jsonb;
  v_rows    jsonb;
  v_total   integer;
  v_refs    jsonb := '{}'::jsonb;
  v_labels  jsonb := '{}'::jsonb;
  f         record;
  v_limit   integer := least(greatest(coalesce(p_limit, 200), 1), 500);
  v_offset  integer := greatest(coalesce(p_offset, 0), 0);
begin
  if v_uid is null or p_interface_id is null or nullif(btrim(coalesce(p_element_id, '')), '') is null then
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

  -- the element, from what was PUBLISHED; a builder previewing the draft may also name a draft element
  select b into v_el
    from jsonb_array_elements(case jsonb_typeof(v_p -> 'published' -> 'pages') when 'array' then v_p -> 'published' -> 'pages' else '[]'::jsonb end) pg,
         jsonb_array_elements(case jsonb_typeof(pg -> 'blocks') when 'array' then pg -> 'blocks' else '[]'::jsonb end) b
   where b ->> 'id' = p_element_id
   limit 1;
  if v_el is null and v_builder then
    select b into v_el
      from jsonb_array_elements(case jsonb_typeof(v_p -> 'draft' -> 'pages') when 'array' then v_p -> 'draft' -> 'pages' else '[]'::jsonb end) pg,
           jsonb_array_elements(case jsonb_typeof(pg -> 'blocks') when 'array' then pg -> 'blocks' else '[]'::jsonb end) b
     where b ->> 'id' = p_element_id
     limit 1;
  end if;
  if v_el is null or coalesce(v_el ->> 'kind', '') not in ('list', 'layout', 'review', 'number') then
    return null;
  end if;
  v_table := case when coalesce(v_el ->> 'table_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                  then (v_el ->> 'table_id')::uuid end;
  select * into v_trow from custom.record t where t.id = v_table and t.organization_id = v_org and t.deleted_at is null;
  if v_trow.id is null then
    return null;
  end if;

  -- the columns this element shows: its own list (plus the columns its layout is drawn by), else every column
  if jsonb_typeof(v_el -> 'columns') = 'array' and jsonb_array_length(v_el -> 'columns') > 0 then
    v_want := array(select jsonb_array_elements_text(v_el -> 'columns'))
              || array_remove(array[v_el ->> 'group_field', v_el ->> 'date_field', v_el ->> 'end_field', v_el ->> 'image_field',
                                    v_trow.data ->> 'title_field'], null)
              || coalesce(array(select jsonb_array_elements_text(g -> 'fields')
                                  from jsonb_array_elements(case jsonb_typeof(v_el -> 'field_groups') when 'array' then v_el -> 'field_groups' else '[]'::jsonb end) g
                                 where jsonb_typeof(g -> 'fields') = 'array'), '{}');
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'key', fl.key, 'label', coalesce(nullif(fl.label, ''), fl.name, fl.key), 'type', fl.type,
           'multi', coalesce(fl.multi, false), 'system', fl.config ->> 'system',
           'relation_target', fl.relation_target, 'format', fl.format, 'sort', fl.sort) order by fl.sort, fl.key), '[]'::jsonb),
         coalesce(array_agg(fl.key order by fl.sort, fl.key), '{}')
    into v_fields, v_keys
    from (select distinct on (fl0.key) fl0.* from custom.field fl0
           where fl0.entity_definition_id = v_table and fl0.organization_id = v_org
             and coalesce(fl0.sensitivity, 'internal') in ('public', 'internal')
             and (fl0.type <> 'formula' or fl0.config ->> 'system' in ('created_time', 'modified_time'))
             and (v_want is null or fl0.key = any (v_want))
           order by fl0.key, fl0.sort) fl;

  -- the element's saved view, when it names one of this table
  if coalesce(v_el ->> 'view_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select * into v_view from platform.saved_view sv
     where sv.id = (v_el ->> 'view_id')::uuid and sv.organization_id = v_org and sv.deleted_at is null;
    if v_view.id is not null and coalesce(v_view.subject_id, nullif(v_view.definition ->> 'table_id', '')::uuid) = v_table then
      v_def := coalesce(v_view.definition, '{}'::jsonb);
    end if;
  end if;

  -- the element's own question (unset conditions ask nothing), then the view's
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_flat
    from jsonb_each(case jsonb_typeof(v_el -> 'filter') when 'object' then v_el -> 'filter' else '{}'::jsonb end) e
   where e.value <> 'null'::jsonb;
  foreach v_expr in array array[v_flat, v_def -> 'where', v_def -> 'filters']
  loop
    if v_expr is not null and jsonb_typeof(v_expr) = 'object' and v_expr <> '{}'::jsonb then
      v_where := v_where || ' and ' || custom.record_filter_sql(v_org, v_table,
        case when custom.filter_is_rule(v_expr) then v_expr
             else custom.choice_filter_normalize(custom.choice_field_map(v_org, v_table), v_expr) end);
    end if;
  end loop;

  -- "current user": only the rows whose person column points at the viewer's own record
  v_me := nullif(v_el ->> 'me_field', '');
  -- (AT-INTERFACE b) for somebody OUTSIDE the organization the rule always holds; for a member only when me_only says so
  if v_me is not null and (coalesce((v_el ->> 'me_only')::boolean, false) or not v_member) then
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

  if p_record_id is not null then
    v_where := v_where || format(' and r.id = %L::uuid', p_record_id);
  end if;

  execute format('select count(*)::integer from custom.record r where r.organization_id = %L::uuid and r.table_id = %L::uuid and r.deleted_at is null and %s',
                 v_org, v_table, v_where)
    into v_total;
  if v_el ->> 'kind' = 'number' then
    return jsonb_build_object('count', v_total, 'table', coalesce(v_trow.data ->> 'name', v_trow.data ->> 'title'));
  end if;

  -- the element's sort, else the view's (up to five), by stored value
  foreach v_expr in array array[v_el -> 'sort', v_def -> 'sorts']
  loop
    if array_length(v_sorts, 1) is null and jsonb_typeof(v_expr) = 'array' then
      for s in select e from jsonb_array_elements(v_expr) e limit 5 loop
        if (s ->> 'field') = any (v_keys) then
          v_sorts := v_sorts || format('r.data -> %L %s nulls last', s ->> 'field',
                                       case when lower(coalesce(s ->> 'direction', 'asc')) = 'desc' then 'desc' else 'asc' end);
        end if;
      end loop;
    end if;
  end loop;
  if array_length(v_sorts, 1) > 0 then
    v_order := array_to_string(v_sorts, ', ') || ', r.created_at, r.id';
  end if;

  execute format($q$
    select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'created_at', q.created_at, 'updated_at', q.updated_at, 'document', q.vals) order by q.n), '[]'::jsonb)
      from (select r.id, r.created_at, r.updated_at, row_number() over (order by %s) as n,
                   coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(r.data) e where e.key = any (%L::text[])), '{}'::jsonb) as vals
              from custom.record r
             where r.organization_id = %L::uuid and r.table_id = %L::uuid and r.deleted_at is null and %s
             order by %s
             limit %s offset %s) q
  $q$, v_order, v_keys, v_org, v_table, v_where, v_order, v_limit, v_offset)
  into v_rows;

  -- the words of what the cells point at, and choice values in their own words
  select coalesce(jsonb_object_agg(x.id, custom.record_words(v_org, x.id::uuid)), '{}'::jsonb) into v_refs
    from (select distinct c.id
            from jsonb_array_elements(v_rows) row_,
                 jsonb_each(row_ -> 'document') cell,
                 jsonb_array_elements(case jsonb_typeof(cell.value) when 'array' then cell.value else jsonb_build_array(cell.value) end) el,
                 lateral (select case jsonb_typeof(el) when 'string' then el #>> '{}'
                                                       when 'object' then coalesce(el ->> 'id', el ->> 'record_id') end as id) c
           where cell.key in (select fl ->> 'key' from jsonb_array_elements(v_fields) fl where fl ->> 'relation_target' is not null)
             and c.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           limit 2000) x;
  for f in
    select fl.key, fl.options_table_id
      from custom.field fl
     where fl.entity_definition_id = v_table and fl.organization_id = v_org
       and fl.key = any (v_keys) and fl.options_table_id is not null
  loop
    v_labels := v_labels || jsonb_build_object(f.key, coalesce((
      select jsonb_object_agg(lower(regexp_replace(o.data ->> 'title', '[^A-Za-z0-9]+', '', 'g')), o.data ->> 'title')
        from custom.record o
       where o.table_id = f.options_table_id and o.organization_id = v_org and o.deleted_at is null
         and o.data ->> 'title' is not null), '{}'::jsonb));
  end loop;

  return jsonb_build_object(
    'table', coalesce(v_trow.data ->> 'name', v_trow.data ->> 'title'), 'title_field', v_trow.data ->> 'title_field',
    'fields', v_fields, 'rows', v_rows, 'count', v_total, 'truncated', v_total > v_offset + v_limit,
    'refs', v_refs, 'labels', v_labels);
end
$function$;
comment on function custom.interface_rows(uuid, text, uuid, integer, integer) is
  'AT-INTERFACE - the rows ONE element of an Interface exposes, for a person the interface was shared with (no organization membership needed). Null unless the caller holds Viewer on the interface record and the element is published (builders may also name a draft element). Reads only that element''s table, its filter, its saved view, its current-user rule (me_field: always for a viewer outside the organization, for members only with me_only), its shown columns (never above internal sensitivity), at most 500 rows a call; p_record_id narrows to one row of that set. A number element answers {count}.';

