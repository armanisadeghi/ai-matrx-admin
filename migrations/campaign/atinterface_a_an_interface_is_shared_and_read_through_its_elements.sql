-- lane: AT-INTERFACE
-- lock: custom,platform
-- scope: Airtable Interface Designer parity on the Page model. An Interface is a dashboard record (custom.record in the
--   presentation kernel, data_class 'dashboard') whose presentation.kind is 'interface': its pages live in presentation.draft
--   (what builders edit) and presentation.published (what everybody else sees), with presentation.versions as the publish
--   history. No table changes: custom.dashboard_declare already stores presentation as given.
--   Adds two NEW doors (no existing function is replaced, so no based-on line):
--     . custom.interface_read(p_interface_id)            - the interface as this viewer may see it
--     . custom.interface_rows(p_interface_id, p_element_id, p_record_id, p_limit, p_offset) - the rows ONE element exposes
-- inverse: migrations/inverse/atinterface_a_an_interface_is_shared_and_read_through_its_elements_down.sql
--
-- THE NEW WAY IN (access-ladder.md "Sharing sits outside the ladder"; never a tightening). Sharing the INTERFACE record through
-- the one share dialog (custom.share_grant, View / Comment / Edit) is enough to open it. A person who is not a member of the
-- organization - a client contact - reads the interface through these two doors and nothing else: exactly the published
-- elements, each element's own question (its filter, its saved view, its "current user" rule), the columns the element shows,
-- never a column above 'internal' sensitivity, at most 500 rows a call. Members keep reading through their usual doors, under
-- their own principal; these doors add no reach to anything a member already had.
--
-- "CURRENT USER" (Airtable's current-user filter). An element may carry me_field (a person / relation column) and me_only: true.
-- The door then keeps only rows whose me_field points at a record of that column's target table that is the viewer's own
-- (its user_id is the viewer, or its email is the viewer's sign-in email). It is applied in the store, so a client contact
-- never receives another client's rows.

create or replace function custom.interface_read(p_interface_id uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_uid   uuid := auth.uid();
  d       custom.record;
  v_level text;
  v_p     jsonb;
  v_member boolean;
begin
  if v_uid is null or p_interface_id is null then
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
  v_level := case
    when iam.has_access_for(v_uid, 'record', d.id, 'admin'::public.permission_level) then 'admin'
    when iam.has_access_for(v_uid, 'record', d.id, 'editor'::public.permission_level) then 'editor'
    when iam.has_access_for(v_uid, 'record', d.id, 'edit_content'::public.permission_level) then 'edit_content'
    when iam.has_access_for(v_uid, 'record', d.id, 'commenter'::public.permission_level) then 'commenter'
    else 'viewer' end;
  v_member := iam.has_org_access(d.organization_id);
  v_p := coalesce(d.data -> 'presentation', '{}'::jsonb);
  -- the draft and the history are the builders' own; everybody else sees only what was published
  if v_level not in ('admin', 'editor') then
    v_p := v_p - 'draft' - 'versions';
  end if;
  return jsonb_build_object(
    'id', d.id, 'organization_id', d.organization_id,
    'table_id', nullif(d.data ->> 'subject_table_id', '')::uuid,
    'name', d.data ->> 'name', 'version', d.version, 'updated_at', d.updated_at,
    'level', v_level, 'member', v_member,
    'presentation', v_p,
    'blocks', case when v_member then coalesce(d.data -> 'blocks', '[]'::jsonb) else '[]'::jsonb end);
end
$function$;
comment on function custom.interface_read(uuid) is
  'AT-INTERFACE - one Interface (a dashboard record with presentation.kind = interface) as the caller may see it: null unless the caller holds Viewer on the interface record (its own share, or the organization lane). Builders (Editor, Full) get the draft and the publish history; everybody else only presentation.published. member says whether the caller is in the organization (members read elements through their own doors; others through custom.interface_rows).';

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
  if v_me is not null and coalesce((v_el ->> 'me_only')::boolean, false) then
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
  'AT-INTERFACE - the rows ONE element of an Interface exposes, for a person the interface was shared with (no organization membership needed). Null unless the caller holds Viewer on the interface record and the element is published (builders may also name a draft element). Reads only that element''s table, its filter, its saved view, its current-user rule (me_field + me_only), its shown columns (never above internal sensitivity), at most 500 rows a call; p_record_id narrows to one row of that set. A number element answers {count}.';

-- ── the doors declare themselves ─────────────────────────────────────────────────────────────────────────────
insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers, anonymous_purpose, argument_rules)
values
  ('custom', 'interface_read', 'p_interface_id uuid', array['uuid'::regtype]::oid[],
   'Opens one Interface for the interface screen: its published pages for anybody it is shared with, its draft and publish history for its builders.',
   'atinterface_a_an_interface_is_shared_and_read_through_its_elements.sql', null, true, false, null,
   jsonb_build_object('version', 1, 'declared_by', 'atinterface_a_an_interface_is_shared_and_read_through_its_elements.sql',
     'declared_at', '2026-10-15 lane AT-INTERFACE, read from the body and exercised in scripts/campaign-tests/atinterface_green.sql',
     'arguments', jsonb_build_object('p_interface_id', jsonb_build_object(
       'type', 'uuid', 'position', 1, 'optional', false, 'entity', 'record', 'access', 'Viewer on the interface record (iam.has_access_for)',
       'check', 'The row must be a live presentation-kernel dashboard record with presentation.kind = interface, and iam.has_access_for(auth.uid(), ''record'', id, ''viewer'') must be true, before anything of it is returned; draft and versions only at Editor or above.',
       'foreign', jsonb_build_object('note', 'null, for an id that is not there, not an interface, archived, or not shared with the caller alike', 'not_a_leak', true, 'same_as_invented', true),
       'null_rule', jsonb_build_object('means', 'null'),
       'verified', 'exercised from three seats (owner, outside person shared View, outside person not shared) in scripts/campaign-tests/atinterface_green.sql, rolled back')))),
  ('custom', 'interface_rows', 'p_interface_id uuid, p_element_id text, p_record_id uuid, p_limit integer, p_offset integer',
   array['uuid'::regtype, 'text'::regtype, 'uuid'::regtype, 'int4'::regtype, 'int4'::regtype]::oid[],
   'Reads the rows one published element of an Interface exposes (its filter, view, current-user rule and shown columns), for a person the interface is shared with.',
   'atinterface_a_an_interface_is_shared_and_read_through_its_elements.sql', null, true, false, null,
   jsonb_build_object('version', 1, 'declared_by', 'atinterface_a_an_interface_is_shared_and_read_through_its_elements.sql',
     'declared_at', '2026-10-15 lane AT-INTERFACE, read from the body and exercised in scripts/campaign-tests/atinterface_green.sql',
     'arguments', jsonb_build_object(
       'p_interface_id', jsonb_build_object(
         'type', 'uuid', 'position', 1, 'optional', false, 'entity', 'record', 'access', 'Viewer on the interface record',
         'check', 'Same decision as custom.interface_read, taken first.',
         'foreign', jsonb_build_object('note', 'null for anything not a shared, live interface', 'not_a_leak', true, 'same_as_invented', true),
         'null_rule', jsonb_build_object('means', 'null'),
         'verified', 'scripts/campaign-tests/atinterface_green.sql, rolled back'),
       'p_element_id', jsonb_build_object(
         'type', 'text', 'position', 2, 'optional', false, 'entity', null,
         'entity_reason', 'An element id is a key inside the interface record''s own presentation, not a record; it is looked up only inside the interface already decided on.',
         'check', 'Must name an element of kind list, layout, review or number in presentation.published.pages (or the draft, for an Editor); its table must be a live table of the interface''s organization.',
         'foreign', jsonb_build_object('note', 'null for an element of another interface, an unpublished one, or one of another kind', 'not_a_leak', true, 'same_as_invented', true),
         'null_rule', jsonb_build_object('means', 'null'),
         'verified', 'scripts/campaign-tests/atinterface_green.sql, rolled back'),
       'p_record_id', jsonb_build_object(
         'type', 'uuid', 'position', 3, 'optional', true, 'entity', 'record', 'access', 'none of its own: it only narrows the element''s own row set',
         'check', 'Added as r.id = p_record_id to the element''s where clause; a row outside the element''s set answers no row.',
         'foreign', jsonb_build_object('note', 'an empty row list, the same as a row that is not there', 'not_a_leak', true, 'same_as_invented', true),
         'null_rule', jsonb_build_object('means', 'every row of the element'),
         'verified', 'scripts/campaign-tests/atinterface_green.sql, rolled back'),
       'p_limit', jsonb_build_object('type', 'int4', 'position', 4, 'optional', true, 'entity', null, 'entity_reason', 'a page size',
         'check', 'clamped to 1..500', 'null_rule', jsonb_build_object('means', '200'), 'verified', 'by reading the body'),
       'p_offset', jsonb_build_object('type', 'int4', 'position', 5, 'optional', true, 'entity', null, 'entity_reason', 'a page offset',
         'check', 'clamped to 0 and up', 'null_rule', jsonb_build_object('means', '0'), 'verified', 'by reading the body'))))
on conflict do nothing;

grant execute on function custom.interface_read(uuid) to authenticated;
grant execute on function custom.interface_rows(uuid, text, uuid, integer, integer) to authenticated;

select custom.reopen_declared_doors();
