-- Inverse of row_pages_this_row_views.sql: the three replaced bodies as they were, the new doors gone.
CREATE OR REPLACE FUNCTION custom.record_filter_sql(p_organization_id uuid, p_table_id uuid, p_filter jsonb)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_who     uuid;
  v_level   public.permission_level;
  v_visible text[];
  v_mask    jsonb;
  v_sql     text;
  v_key     text;
  v_val     text;
  v_across  jsonb := '{}'::jsonb;
  v_head    text;
  v_tail    text;
  v_rel     jsonb;
  v_target  uuid;
  v_inner   text;
  v_parts   text[] := '{}';
begin
  if not custom.filter_is_rule(p_filter) then
    -- S2-PRIME AGG-FIELD-READ: a flat question may not narrow by a column its reader may not read
    -- — "the jobs whose cost is 2,600" answers the cost. Refused by the column's name, as the
    -- aggregate refuses measuring it. (A Rule expression treats such a column as undecided.)
    -- VISION-REACH W3 (2026-10-02): A CONDITION ACROSS A RELATION, ASKED OF THE STORE.
    -- `{"patient.referring_physician": "Dr. Samuel Okafor"}` — a key `<relation>.<field>` — means
    -- "this record's relation points at a record whose field is that". It used to be answered by
    -- reading EVERY page of the related table into the records tool and sending its matching ids
    -- back as a list (capped at 5,000). It is now one sub-select here: the related records this
    -- reader may see (custom.visible_predicate_sql on THAT table), narrowed by the related field
    -- through this same function (its readability check, its formula reading), the relation
    -- column itself checked readable on this table.
    if p_filter is not null and jsonb_typeof(p_filter) = 'object' then
      select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_across
        from jsonb_each(p_filter) e where strpos(e.key, '.') > 0;
      if v_across <> '{}'::jsonb then
        p_filter := (select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
                       from jsonb_each(p_filter) e where strpos(e.key, '.') = 0);
        for v_key in select k from jsonb_object_keys(v_across) k loop
          v_head := custom.agg_assert_key(split_part(v_key, '.', 1));
          v_tail := substr(v_key, char_length(v_head) + 2);
          select f.data into v_rel
            from custom.record f
           where f.organization_id = p_organization_id
             and f.table_id = custom.field_kernel_id()
             and f.deleted_at is null
             and (f.data ->> 'entity_definition_id')::uuid = p_table_id
             and f.data ->> 'key' = v_head
           limit 1;
          if v_rel is null or v_rel ->> 'type' <> 'relation' or nullif(v_rel ->> 'relation_target', '') is null then
            raise exception '"%" is not a relation of this table, so "%" cannot reach a field through it.', v_head, v_key
              using errcode = '22023',
                    hint = 'A condition across a relation is written <relation key>.<field key of the table it points at>. Nothing was read.';
          end if;
          v_target := (v_rel ->> 'relation_target')::uuid;
          perform custom.agg_fields_readable_assert(p_organization_id, p_table_id, array[v_head], 'viewer');
          v_inner := custom.record_filter_sql(p_organization_id, v_target,
                       custom.choice_filter_normalize(custom.choice_field_map(p_organization_id, v_target),
                                                      jsonb_build_object(v_tail, v_across -> v_key)));
          v_parts := v_parts || format(
            'exists (select 1 from jsonb_array_elements_text(case jsonb_typeof(%1$s) when ''array'' then %1$s '
            'when ''null'' then ''[]''::jsonb else jsonb_build_array(%1$s) end) x(id) '
            'where x.id in (select r.id::text from custom.record r where r.organization_id = %2$L::uuid '
            'and r.table_id = %3$L::uuid and r.deleted_at is null '
            'and coalesce(r.metadata ->> ''quarantine'', ''false'') <> ''true'' and %4$s and %5$s))',
            format('(case when jsonb_typeof(r.data -> %1$L) = ''object'' and (r.data -> %1$L) ? ''value'' '
                   'then r.data -> %1$L -> ''value'' else r.data -> %1$L end)', v_head),
            p_organization_id, v_target,
            custom.listed_predicate_sql(custom.query_principal(), p_organization_id, v_target,
                                         'viewer'::public.permission_level, 'r'),
            v_inner);
        end loop;
      end if;
      perform custom.agg_fields_readable_assert(p_organization_id, p_table_id,
                array(select jsonb_object_keys(p_filter)), 'viewer');
    end if;
    v_sql := custom.record_filter_sql(p_filter);
    -- VISION-REACH W3 (2026-10-02): A FILTER ON A WORKED-OUT COLUMN reads it as the record read
    -- reads it. A formula, lookup or roll-up column has no stored value, so `{"copay_tier":
    -- "High copay"}` matched no row (the stored `r.data` holds nothing under that key). Each such
    -- key's stored-value reading in the one fragment is swapped for the read path's own answer
    -- (custom.agg_field_value_sql — the same expression the aggregate measures with); a plain
    -- stored column is untouched, so no other filter gets slower.
    if p_filter is not null and jsonb_typeof(p_filter) = 'object' and v_sql <> 'true' then
      for v_key in select k from jsonb_object_keys(p_filter) k loop
        v_val := custom.agg_field_value_sql(p_organization_id, p_table_id, v_key);
        if v_val <> custom.agg_value_sql(v_key) then
          v_sql := replace(v_sql, custom.agg_value_sql(v_key), '(' || v_val || ')');
        end if;
      end loop;
    end if;
    if cardinality(v_parts) > 0 then
      v_sql := '(' || v_sql || ' and ' || array_to_string(v_parts, ' and ') || ')';
    end if;
    return v_sql;
  end if;

  -- WHICH COLUMNS THIS READER MAY SEE, asked the way the read door asks it: the reader's level
  -- on the TABLE, then the fields at that level. The server lane (no principal) sees every column.
  v_who := custom.query_principal();
  if v_who is not null then
    v_level := custom.effective_level(v_who, p_organization_id, p_table_id);
    -- READ-MASK-ONCE: the one mask's answer, memoised for the statement.
    v_mask := custom.read_mask_for(v_who, p_organization_id, p_table_id, v_level, 'read');
    select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_visible
      from jsonb_array_elements(v_mask -> 'visible') x;
  end if;

  return format('(custom.rule_truth(%s) is true)',
                custom.rule_filter_node_sql(p_organization_id, p_table_id, p_filter,
                                            custom.choice_field_map(p_organization_id, p_table_id),
                                            v_visible));
end;
$function$;

CREATE OR REPLACE FUNCTION custom.row_template_declare(p_organization_id uuid, p_table_id uuid, p_spec jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_id     uuid := nullif(p_spec ->> 'template_id', '')::uuid;
  v_name   text := nullif(btrim(p_spec ->> 'name'), '');
  v_values jsonb := case when jsonb_typeof(p_spec -> 'values') = 'object' then p_spec -> 'values' end;
  v_body   jsonb := case when jsonb_typeof(p_spec -> 'body') = 'object' then p_spec -> 'body' end;
  v_bad    text;
  v_known  text;
  v_found  uuid;   -- the existing template this call changes, or null for a new one
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.row_template_declare');
  -- EDITOR on the Table: a template is how everyone's new rows start, so it changes the Table.
  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.row_template_declare',
                                          'admin'::public.permission_level, 'table');
  perform custom.assert_store_door(p_organization_id, 'custom.row_template_declare');

  if p_table_id is null then
    raise exception 'A row template is a template OF a table — name the table.' using errcode = '22004';
  end if;

  -- NOTION-FIDELITY: a body is a page snapshot {"v": 1, "blocks": [...]}; anything else is refused by name.
  if p_spec ? 'body' and jsonb_typeof(p_spec -> 'body') <> 'null' then
    if v_body is null or (v_body ->> 'v') is distinct from '1' or jsonb_typeof(v_body -> 'blocks') <> 'array' then
      raise exception 'A template body is a page snapshot: {"v": 1, "blocks": [...]}.' using errcode = '22023',
            hint = 'It is the same body a row''s page holds; send it as pages upsert takes it. Nothing was written.';
    end if;
  end if;

  -- Same name on the same Table = that template (a declare is idempotent by name).
  if v_id is null and v_name is not null then
    select sv.id into v_id
      from platform.saved_view sv
     where sv.organization_id = p_organization_id and sv.deleted_at is null
       and sv.surface_key = 'custom/records/template' and sv.subject_id = p_table_id
       and lower(sv.name) = lower(v_name)
     limit 1;
  end if;

  if v_id is not null then
    select sv.id into v_found
      from platform.saved_view sv
     where sv.id = v_id and sv.organization_id = p_organization_id and sv.deleted_at is null
       and sv.surface_key = 'custom/records/template' and sv.subject_id = p_table_id
       for update;
    if v_found is null then
      raise exception 'There is no such row template on this table.' using errcode = '23503',
            detail = jsonb_build_object('template_id', v_id)::text;
    end if;
    -- Archive (never delete): {"template_id": …, "archived": true}.
    if (p_spec -> 'archived') = 'true'::jsonb then
      update platform.saved_view set deleted_at = now() where id = v_found and organization_id = p_organization_id;
      return v_found;
    end if;
  end if;

  if v_name is null and v_found is null then
    raise exception 'A row template needs a name — it is what a person picks it by.' using errcode = '23514';
  end if;
  if v_values is null and v_found is null then
    v_values := '{}'::jsonb;
  end if;

  -- Every value names a column of THIS table, by its key; a misspelling is refused by name.
  if v_values is not null then
    select x.k into v_bad
      from jsonb_object_keys(v_values) x(k)
     where not exists (select 1 from custom.field f
                        where f.organization_id = p_organization_id
                          and f.entity_definition_id = p_table_id and f.key = x.k)
     limit 1;
    if v_bad is not null then
      select string_agg(f.key, ', ' order by f.sort, f.key) into v_known
        from custom.field f
       where f.organization_id = p_organization_id and f.entity_definition_id = p_table_id;
      raise exception 'This table has no column "%", so the template cannot set it.', v_bad
        using errcode = '22023', hint = format('Its columns are: %s. Nothing was written.', coalesce(v_known, 'none'));
    end if;
  end if;

  if v_found is not null then
    update platform.saved_view
       set name = coalesce(v_name, name),
           definition = jsonb_build_object('table_id', p_table_id,
                                           'values', coalesce(v_values, definition -> 'values', '{}'::jsonb))
                        || case when v_body is not null then jsonb_build_object('body', v_body)
                                when definition ? 'body' then jsonb_build_object('body', definition -> 'body')
                                else '{}'::jsonb end,
           updated_at = now(), version = version + 1
     where id = v_found and organization_id = p_organization_id;
    return v_found;
  end if;

  insert into platform.saved_view
    (name, surface_key, subject_id, definition, organization_id, created_by)
  values (v_name, 'custom/records/template', p_table_id,
          jsonb_build_object('table_id', p_table_id, 'values', v_values)
            || case when v_body is not null then jsonb_build_object('body', v_body) else '{}'::jsonb end,
          p_organization_id, custom.query_principal())
  returning id into v_id;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION content.space_list(p_include_archived boolean DEFAULT false)
 RETURNS TABLE(id uuid, parent_id uuid, edge_position integer, title text, icon text, deleted_at timestamp with time zone, updated_at timestamp with time zone, version integer, organization_id uuid, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_uid   uuid := auth.uid();
  v_type  uuid;
  v_roots uuid[];
begin
  -- The person's Spaces: the share roots they can discover (owner, organization, grants — never
  -- reach), plus every sub-page under them through `sub_page` edges that the caller can open
  -- (the access kernel, like content.space_children — never the edge's organization).
  if v_uid is null then
    raise exception using errcode = '42501', message = 'Sign in to list your Spaces.';
  end if;
  select c.id into v_type from platform.categories c
   where c.dimension = 'document_type' and c.slug = 'space' and c.deleted_at is null
     and c.organization_id = '39c38960-d30c-4840-b0c1-c9960de95582'::uuid;
  v_roots := iam.discoverable_ids(v_uid, 'document', 'viewer'::public.permission_level, 0, false);

  return query
  with recursive tree(doc_id) as (
    select d.id from content.document d
     where d.id = any (v_roots) and d.document_type_id = v_type and d.format = 'spaces'
       and (p_include_archived or d.deleted_at is null)
    union
    select a.source_id
      from tree t
      join platform.associations a
        on a.target_type = 'document' and a.target_id = t.doc_id
       and a.source_type = 'document' and a.label = 'sub_page'
       and (a.deleted_at is null or p_include_archived)
     where iam.has_access('document', a.source_id, 'viewer'::public.permission_level)
  ),
  parent as (
    select distinct on (a.source_id) a.source_id, a.target_id, a.position
      from platform.associations a
      join tree t on t.doc_id = a.source_id
     where a.source_type = 'document' and a.target_type = 'document' and a.label = 'sub_page'
       and (a.deleted_at is null or p_include_archived)
     order by a.source_id, (a.deleted_at is null) desc, a.deleted_at desc nulls first, a.created_at desc
  )
  select d.id,
         case when exists (select 1 from tree t2 where t2.doc_id = p.target_id) then p.target_id end,
         case when exists (select 1 from tree t2 where t2.doc_id = p.target_id) then p.position end,
         d.title, d.icon, d.deleted_at, d.updated_at, d.version, d.organization_id, d.created_at
    from tree t
    join content.document d on d.id = t.doc_id and d.document_type_id = v_type
    left join parent p on p.source_id = d.id
   where p_include_archived or d.deleted_at is null;
end;
$function$;

delete from platform.client_callable_door where schema_name = 'content' and function_name in ('space_owning_row', 'row_page_ensure');
delete from platform.client_callable_door where schema_name = 'custom' and function_name = 'row_template_default';
drop function if exists content.space_owning_row(uuid);
drop function if exists content.row_page_ensure(uuid, uuid, text, jsonb);
drop function if exists custom.row_template_default(uuid, uuid);
drop function if exists content._space_row_of(uuid);
NOTIFY pgrst, 'reload schema';
