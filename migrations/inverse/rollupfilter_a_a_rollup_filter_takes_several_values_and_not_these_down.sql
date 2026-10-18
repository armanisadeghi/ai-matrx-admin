-- chair-step: the INVERSE of migrations/campaign/rollupfilter_a_a_rollup_filter_takes_several_values_and_not_these.sql.
--   Restores custom.record_filter_sql(uuid, uuid, jsonb) exactly as it stood on production before that file
--   (no `{"not": ..}` form). A roll-up already declared with a `not` filter then refuses to read, so remove such
--   filters first. Re-base on production's current body before running after any later file replaced it.
--
-- based-on: custom.record_filter_sql(uuid, uuid, jsonb) 26a9ac7bb2d12c46566662a25b052585588fd2695b0abf91e20dbce6bdca03bb

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
  v_jv     jsonb;
  v_quant   text;
  v_map     jsonb;
  v_cell    text;
  v_op      text;
  v_arg     jsonb;
begin
  if not custom.filter_is_rule(p_filter) then
    -- DRILL-CUSTOM-PARITY (2026-10-17): WHO ADDED THE RECORD. `{"created_by": "me" | <person id> | [ids] | null}`
    -- narrows by the record's own creator, so a count in the "mine" lane and the records it opens read the
    -- same rows. A Table that has its own Field called created_by keeps that Field's meaning.
    if jsonb_typeof(p_filter) = 'object' and p_filter ? 'created_by'
       and not exists (select 1 from custom.field fd where fd.organization_id = p_organization_id
                         and fd.entity_definition_id = p_table_id and fd.key = 'created_by') then
      v_jv := p_filter -> 'created_by';
      p_filter := p_filter - 'created_by';
      if jsonb_typeof(v_jv) = 'null' then
        v_parts := v_parts || 'r.created_by is null'::text;
      else
        if exists (select 1 from jsonb_array_elements(case when jsonb_typeof(v_jv) = 'array' then v_jv else jsonb_build_array(v_jv) end) x
                    where jsonb_typeof(x) <> 'string' or ((x #>> '{}') <> 'me' and (x #>> '{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')) then
          raise exception 'created_by is "me", a person''s id, or a list of them.' using errcode = '22023';
        end if;
        v_parts := v_parts || format('r.created_by = any (%L::uuid[])',
          (select array_agg(case when x #>> '{}' = 'me' then coalesce(custom.query_principal()::text, '00000000-0000-0000-0000-000000000000') else x #>> '{}' end)
             from jsonb_array_elements(case when jsonb_typeof(v_jv) = 'array' then v_jv else jsonb_build_array(v_jv) end) x));
      end if;
    end if;
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
          -- NOTION-Q (2026-10-14): ANY / EVERY / NONE OF THE LINKED RECORDS. `{"client.client_type": "Past Client"}`
          -- keeps its meaning (at least one linked record is one). A condition that SAYS no — is_not, not_contains,
          -- has_none — means no linked record breaks it, so "client is not Past Client" lists a post with no
          -- client too, as Airtable and Notion do. `"link": "any" | "every" | "none"` says it outright.
          v_jv := v_across -> v_key;
          v_quant := null;
          if jsonb_typeof(v_jv) = 'object' and v_jv ? 'link' then
            v_quant := v_jv ->> 'link';
            v_jv := v_jv - 'link';
            if v_quant not in ('any', 'every', 'none') or v_jv = '{}'::jsonb then
              raise exception '"link" says any, every or none of the linked records, and it needs a condition beside it'
                using errcode = '22023',
                      hint = 'NOTION-Q: {"client.client_type": {"is_not": "Past Client", "link": "every"}}. Nothing was read.';
            end if;
          end if;
          if v_quant is null then
            v_quant := case when jsonb_typeof(v_jv) = 'object' and v_jv ?| array['is_not', 'not_contains', 'has_none']
                            then 'every' else 'any' end;
          end if;
          v_inner := custom.record_filter_sql(p_organization_id, v_target,
                       custom.choice_filter_normalize(custom.choice_field_map(p_organization_id, v_target),
                                                      jsonb_build_object(v_tail, v_jv)));
          v_parts := v_parts || format(
            '%6$sexists (select 1 from jsonb_array_elements_text(case jsonb_typeof(%1$s) when ''array'' then %1$s '
            'when ''null'' then ''[]''::jsonb else jsonb_build_array(%1$s) end) x(id) '
            'where x.id in (select r.id::text from custom.record r where r.organization_id = %2$L::uuid '
            'and r.table_id = %3$L::uuid and r.deleted_at is null '
            'and coalesce(r.metadata ->> ''quarantine'', ''false'') <> ''true'' and %4$s and %5$s))',
            format('(case when jsonb_typeof(r.data -> %1$L) = ''object'' and (r.data -> %1$L) ? ''value'' '
                   'then r.data -> %1$L -> ''value'' else r.data -> %1$L end)', v_head),
            p_organization_id, v_target,
            custom.listed_predicate_sql(custom.query_principal(), p_organization_id, v_target,
                                         'viewer'::public.permission_level, 'r'),
            case when v_quant = 'every' then format('(%s) is not true', v_inner) else v_inner end,
            case v_quant when 'none' then 'not ' when 'every' then 'not ' else '' end);
        end loop;
      end if;
      -- ROW-PAGE-VIEWS (2026-10-14): A SCALAR ON A RELATION COLUMN MEANS "CONTAINS". A relation keeps a
      -- list of record ids whatever its cardinality, so `{"client": "<id>"}` compared the whole list's
      -- text with one id and matched no row — a view "filtered to this client" showed nothing, and the
      -- Spaces block fell back to every client's rows. A string asks "the list holds this id"; a list of
      -- strings asks "the list holds any of these". Only THIS table's relation columns are read this
      -- way (by the field's own type); every other key reaches the equality below untouched.
      for v_key in
        select e.key from jsonb_each(p_filter) e
         where jsonb_typeof(e.value) in ('string', 'array')
           and exists (select 1 from custom.record f
                        where f.organization_id = p_organization_id
                          and f.table_id = custom.field_kernel_id()
                          and f.deleted_at is null
                          and (f.data ->> 'entity_definition_id')::uuid = p_table_id
                          and f.data ->> 'key' = e.key
                          and f.data ->> 'type' = 'relation')
      loop
        perform custom.agg_fields_readable_assert(p_organization_id, p_table_id, array[v_key], 'viewer');
        v_parts := v_parts || format(
          '((case jsonb_typeof(%1$s) when ''array'' then %1$s when ''string'' then jsonb_build_array(%1$s) '
          'else ''[]''::jsonb end) ?| %2$L::text[])',
          format('(case when jsonb_typeof(r.data -> %1$L) = ''object'' and (r.data -> %1$L) ? ''value'' '
                 'then r.data -> %1$L -> ''value'' else r.data -> %1$L end)', custom.agg_assert_key(v_key)),
          coalesce((select array_agg(x.v)
                      from jsonb_array_elements_text(case jsonb_typeof(p_filter -> v_key)
                                                       when 'array' then p_filter -> v_key
                                                       else jsonb_build_array(p_filter -> v_key) end) x(v)),
                   '{}'::text[]));
        p_filter := p_filter - v_key;
      end loop;
      -- NOTION-Q (2026-10-14): THE LIST QUESTIONS, ASKED OF THIS TABLE'S OWN COLUMNS. A multi-select keeps an array of
      -- choices, so `{"platforms": "Instagram"}` compared the whole array's text with one word and matched no row.
      -- Now: a word on a multi-select means "the list holds it", a list of words means "holds any of them" (on any
      -- column — `{"status": ["Draft", "Scheduled"]}` is "is either"), and an object of operator words asks
      -- exactly: {"contains" | "not_contains" | "has_any" | "has_all" | "has_none" | "is_exactly": word(s),
      -- "is_empty" | "is_not_empty": true, "is_not": word(s)}. A choice word is a label, key or id, as an `=` takes it.
      v_map := custom.choice_field_map(p_organization_id, p_table_id);
      for v_key in
        select e.key from jsonb_each(p_filter) e
         where (jsonb_typeof(e.value) = 'object' and e.value ?| custom.filter_list_op_words())
            or jsonb_typeof(e.value) = 'array'
            or (jsonb_typeof(e.value) = 'string' and coalesce((v_map -> e.key ->> 'multi')::boolean, false))
      loop
        perform custom.agg_fields_readable_assert(p_organization_id, p_table_id, array[v_key], 'viewer');
        v_cell := custom.agg_field_value_sql(p_organization_id, p_table_id, v_key);
        v_cell := case when v_cell <> custom.agg_value_sql(v_key)
                       then format('(custom.record_values_of(r) -> %L)', custom.agg_assert_key(v_key))
                       else format('(case when jsonb_typeof(r.data -> %1$L) = ''object'' and (r.data -> %1$L) ? ''value'' '
                                   'then r.data -> %1$L -> ''value'' else r.data -> %1$L end)', custom.agg_assert_key(v_key)) end;
        v_jv := p_filter -> v_key;
        if jsonb_typeof(v_jv) = 'object' then
          for v_op, v_arg in select o.key, o.value from jsonb_each(v_jv) o loop
            if not (v_op = any (custom.filter_list_op_words())) then
              raise exception '"%" is not a list question a filter knows', v_op
                using errcode = '22023',
                      hint = 'NOTION-Q: contains, not_contains, has_any, has_all, has_none, is_exactly, is_empty, is_not_empty, is_not. Nothing was read.';
            end if;
            if v_op in ('is_empty', 'is_not_empty') then
              v_arg := 'null'::jsonb;
              -- {"is_empty": false} is "is not empty"
              if (v_jv -> v_op) = 'false'::jsonb then
                v_op := case v_op when 'is_empty' then 'is_not_empty' else 'is_empty' end;
              end if;
            elsif v_map ? v_key then
              v_arg := custom.choice_words_normalize(v_map -> v_key, v_arg);
            end if;
            v_parts := v_parts || format('(custom.filter_list_op(%L, %s, %L::jsonb) = ''true''::jsonb)', v_op, v_cell, v_arg::text);
          end loop;
        else
          v_arg := case when v_map ? v_key then custom.choice_words_normalize(v_map -> v_key, v_jv) else v_jv end;
          v_parts := v_parts || format('(custom.filter_list_op(%L, %s, %L::jsonb) = ''true''::jsonb)',
                                       case when jsonb_typeof(v_jv) = 'array' then 'has_any' else 'contains' end,
                                       v_cell, v_arg::text);
        end if;
        p_filter := p_filter - v_key;
      end loop;
      perform custom.agg_fields_readable_assert(p_organization_id, p_table_id,
                array(select jsonb_object_keys(p_filter)), 'viewer');
    end if;
    -- TEMPLATE-GAPS (c), 2026-10-17: A FLAT WINDOW MAY BE RELATIVE. `{"logged_on": {"relative": "this_month"}}` —
    -- "points logged this month" on a roll-up, "due in the next 7 days" on a saved view's flat filters — is
    -- resolved HERE, where the organization is known, to the {from, to} the one window reader takes, in the
    -- READER's zone and week start (custom.relative_window_for_reader, the same the `within` Rule node uses). The
    -- organization-less custom.record_filter_sql(jsonb) still refuses an unresolved relative window by name.
    if p_filter is not null and jsonb_typeof(p_filter) = 'object' then
      select coalesce(jsonb_object_agg(e.key,
               case when jsonb_typeof(e.value) = 'object' and e.value ? 'relative'
                    then custom.relative_window_for_reader(e.value, p_organization_id,
                           e.key in ('created_at', 'updated_at')
                           or exists (select 1 from custom.record f
                                       where f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id()
                                         and f.deleted_at is null and (f.data ->> 'entity_definition_id')::uuid = p_table_id
                                         and f.data ->> 'key' = e.key and f.data -> 'config' ->> 'kind' = 'datetime'))
                    else e.value end), '{}'::jsonb)
        into p_filter
        from jsonb_each(p_filter) e;
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
$function$
;
