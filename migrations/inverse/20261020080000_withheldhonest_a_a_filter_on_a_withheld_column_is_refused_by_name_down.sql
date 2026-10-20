-- target: branch,production
-- lane: WITHHELD-HONEST
-- lock: custom
-- based-on: custom.rule_filter_node_sql(uuid, uuid, jsonb, jsonb, text[]) 23835ca7eeb309aa745b1dcdb8b300be67fdaf0d7fa981427b0ffd242fe2413a
-- Inverse of WITHHELD-HONEST 1: a withheld column in a Rule filter answers as unknown again (the body as it was live on 2026-10-20).

CREATE OR REPLACE FUNCTION custom.rule_filter_node_sql(p_organization_id uuid, p_table_id uuid, p_node jsonb, p_map jsonb, p_visible text[])
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_op    text;
  v_sys   text;   -- TEMPLATE-GAPS D2
  v_cmp   boolean;
  v_mom   text;
  v_win   text;
  v_args  jsonb;
  v_key   text;
  v_parts text[] := '{}';
  v_sql   text;
  v_one   jsonb;
  v_a     jsonb;
  v_b     jsonb;
  v_fkey  text;
  v_const jsonb;
  v_i     integer;
  v_kind  text;
  v_who    uuid;
  v_level  public.permission_level;
  v_mask   jsonb;
  v_tvis   text[];
  v_rel    jsonb;
  v_target uuid;
  v_inner  text;
  v_cell   text;
  v_quant  text;
  v_pool   text;
  v_a_sql  text;
begin
  if p_node is null or jsonb_typeof(p_node) <> 'object' then
    raise exception 'this rule''s test is not written in a shape the system can work out'
      using errcode = '22023',
            hint = 'REC-15: a Rule expression is an object — one of the nodes custom.rule_node_kinds() lists.';
  end if;
  if p_node ?| array['field_name', 'field_key', 'field_label'] then
    raise exception 'this rule names a field instead of pointing at it'
      using errcode = '22023',
            hint = 'REC-17: a Rule references Fields by id, never by name — {"field": "<the field''s id>"}. A name changes and the rule would stop resolving; an id does not.';
  end if;

  v_op := p_node ->> 'op';
  if left(coalesce(v_op, ''), 3) = 'fx.'
     or v_op in ('previous', 'actor_at_least', 'stage_count', 'sibling_count', 'concat')
     or p_node ?| array['parent_field', 'merge_field', 'grandparent_field', 'ancestor_field'] then
    raise exception 'a filter cannot ask "%" of every record at once',
                    coalesce(v_op, (select k from jsonb_object_keys(p_node) k
                                     where k in ('parent_field', 'merge_field', 'grandparent_field', 'ancestor_field') limit 1))
      using errcode = '0A000',
            hint = 'A view''s filter compares a record''s own columns: is, is not, more / less than, at least / at most, matches, has been answered, how long, + − × ÷, and ALL / ANY / NOT groups of those, nested as deep as you like. What a write is doing (previous, who is moving it, how full a column is, a sibling like it), a parent''s or a merge field''s answer, a joined sentence and the formula functions are for Rules that judge one record, not for a list. Nothing was read.';
  end if;

  if p_node ? 'const' then
    return format('%L::jsonb', (p_node -> 'const')::text);
  end if;

  if p_node ? 'field' then
    if jsonb_typeof(p_node -> 'field') <> 'string'
       or (p_node ->> 'field') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'this rule points at a field with % instead of with its id', p_node ->> 'field'
        using errcode = '22023',
              hint = 'REC-17: {"field": "<the field''s id>"}. What is written here is not an id at all.';
    end if;
    select f.data ->> 'key' into v_key
      from custom.record f
     where f.organization_id = p_organization_id
       and f.id = (p_node ->> 'field')::uuid
       and f.table_id = custom.field_kernel_id()
       and f.deleted_at is null
       and (f.data ->> 'entity_definition_id')::uuid = p_table_id;
    if v_key is null then
      raise exception 'this filter points at a field that is not one of this table''s fields'
        using errcode = '23503',
              hint = 'REC-17 / FLD-8: a filter reaches a Field by its id, and the Field has to be a live field OF the table being read. A field that was deleted, or one of another table, answers nothing rather than something wrong.';
    end if;
    perform custom.agg_assert_key(v_key);
    if p_visible is not null and not (v_key = any (p_visible)) then
      -- HIDDEN FROM THIS READER, SO UNKNOWN TO THIS READER. The read door masks this column in
      -- every document it hands them; the filter answers about it the same way.
      return '''null''::jsonb';
    end if;
    -- AP-3 (2026-10-06): only a column the store WORKS OUT is read through record_values_of
    -- (which works out every read-time lookup, roll-up and formula of the row); a stored column is
    -- its stored value, the W1-RULE computed block winning exactly as in record_values_of.
    if exists (select 1 from custom.record f
                where f.organization_id = p_organization_id
                  and f.id = (p_node ->> 'field')::uuid
                  and f.table_id = custom.field_kernel_id()
                  and (custom.parity_type(f.data) in ('lookup', 'rollup', 'formula')
                       or f.data ->> 'type' in ('lookup', 'rollup', 'formula'))) then
      return format('(custom.record_values_of(r) -> %L)', v_key);
    end if;
    return format('coalesce(custom.computed_block(r.data -> ''_computed'') -> %1$L, r.data -> %1$L)', v_key);
  end if;

  v_args := coalesce(p_node -> 'args', '[]'::jsonb);
  if v_op is null then
    raise exception 'this rule''s test does not say what it does'
      using errcode = '22023',
            hint = 'REC-15: every expression node is a const, a field, a parent_field, or an op with its args. custom.rule_node_kinds() is the whole list.';
  end if;
  if not (v_op = any (select n.node from custom.rule_node_kinds() n)) then
    raise exception 'this rule asks the system to %, and it does not know how', v_op
      using errcode = '22023',
            hint = 'REC-15: select * from custom.rule_node_kinds() is the closed list of what a Rule can do. A node outside it is refused rather than ignored.';
  end if;
  if jsonb_typeof(v_args) <> 'array' then
    raise exception 'this rule''s % carries its arguments as a %, not as a list', v_op, jsonb_typeof(v_args)
      using errcode = '22023', hint = 'REC-15: {"op": "…", "args": [ … ]}.';
  end if;

  if v_op = 'and' then
    -- Innermost first: `case <truth of arg n> when false … when undecided … else true end`,
    -- wrapped outward, so arg 1 is asked first and each is asked once.
    v_sql := '''true''::jsonb';
    for v_i in reverse (jsonb_array_length(v_args) - 1)..0 loop
      v_sql := format(
        'case coalesce(custom.rule_truth(%s)::text, ''undecided'') when ''false'' then ''false''::jsonb when ''undecided'' then ''null''::jsonb else %s end',
        custom.rule_filter_node_sql(p_organization_id, p_table_id, v_args -> v_i, p_map, p_visible), v_sql);
    end loop;
    return '(' || v_sql || ')';
  elsif v_op = 'or' then
    for v_one in select e from jsonb_array_elements(v_args) e loop
      v_parts := array_append(v_parts, format('when custom.rule_truth(%s) is true then ''true''::jsonb',
                   custom.rule_filter_node_sql(p_organization_id, p_table_id, v_one, p_map, p_visible)));
    end loop;
    if cardinality(v_parts) = 0 then
      return '''false''::jsonb';
    end if;
    return '(case ' || array_to_string(v_parts, ' ') || ' else ''false''::jsonb end)';
  elsif v_op = 'not' then
    -- S2-PRIME (chair ruling 2026-09-24): a list is always a FILTER question, so NOT of an
    -- undecided answer is true here — exactly custom.rule_eval with purpose = 'filter'.
    return format(
      '(case coalesce(custom.rule_truth(%s)::text, ''undecided'') when ''undecided'' then ''true''::jsonb when ''true'' then ''false''::jsonb else ''true''::jsonb end)',
      custom.rule_filter_node_sql(p_organization_id, p_table_id, v_args -> 0, p_map, p_visible));
  elsif v_op in ('present', 'length') then
    return format('custom.rule_sql_op(%L, %s)', v_op,
                  custom.rule_filter_node_sql(p_organization_id, p_table_id, v_args -> 0, p_map, p_visible));
  end if;

  -- CHAIR-FILTER-DOORS: `within` — the Field's moment is in a half-open window. One leaf, so several
  -- ticked days are an `or` of them and Exclude is a `not`; undecided where the record has no moment.
  if v_op = 'within' then
    v_a := v_args -> 0;
    v_b := v_args -> 1;
    if jsonb_array_length(v_args) <> 2 or jsonb_typeof(v_a) is distinct from 'object' or not (v_a ? 'field') or v_a ? 'op'
       or jsonb_typeof(v_b) is distinct from 'object' or not (v_b ? 'const')
       or jsonb_typeof(v_b -> 'const') is distinct from 'object' then
      raise exception 'this filter''s "within" is not written as a column and a window'
        using errcode = '22023',
              hint = 'CHAIR-FILTER: {"op": "within", "args": [{"field": "<the field''s id>"}, {"const": {"from": "2026-09-01", "to": "2026-09-02"}}]} — from is included, to is not.';
    end if;
    select f.data ->> 'key', f.data -> 'config' ->> 'kind',
           case when jsonb_typeof(f.data -> 'config' -> 'only_fields') = 'array' and jsonb_array_length(f.data -> 'config' -> 'only_fields') > 0
                then null else f.data -> 'config' ->> 'system' end,
           (custom.parity_type(f.data) in ('lookup', 'rollup', 'formula') or f.data ->> 'type' in ('lookup', 'rollup', 'formula'))
      into v_key, v_kind, v_sys, v_cmp
      from custom.record f
     where f.organization_id = p_organization_id
       and f.id = nullif(v_a ->> 'field', '')::uuid
       and f.table_id = custom.field_kernel_id()
       and f.deleted_at is null
       and (f.data ->> 'entity_definition_id')::uuid = p_table_id;
    if v_key is null then
      raise exception 'this filter points at a field that is not one of this table''s fields'
        using errcode = '23503',
              hint = 'REC-17 / FLD-8: a filter reaches a Field by its id, and the Field has to be a live field OF the table being read. A field that was deleted, or one of another table, answers nothing rather than something wrong.';
    end if;
    perform custom.agg_assert_key(v_key);
    if p_visible is not null and not (v_key = any (p_visible)) then
      return '''null''::jsonb';
    end if;
    -- TEMPLATE-GAPS D2 (2026-10-17, REVIEW-2): A WORKED-OUT COLUMN'S MOMENT. "New this week" on a Created time column
    -- matched nothing: the window read the stored document, and a stamp is never stored. Created time / Last edited time
    -- ARE the record's created_at / updated_at; any other read-time column (a formula date, a max-date roll-up) is read
    -- as the row read works it out (custom.record_values_of), exactly as a field leaf of this function already is.
    v_win := custom.dashboard_window_sql(v_key, custom.relative_window_for_reader(v_b -> 'const', p_organization_id,
               v_key in ('created_at', 'updated_at') or v_kind = 'datetime' or v_sys in ('created_time', 'modified_time')));
    v_mom := custom.dashboard_moment_sql(v_key);
    if v_sys in ('created_time', 'modified_time') then
      v_win := replace(v_win, v_mom, case when v_sys = 'created_time' then 'r.created_at' else 'r.updated_at' end);
      v_mom := case when v_sys = 'created_time' then 'r.created_at' else 'r.updated_at' end;
    elsif coalesce(v_cmp, false) then
      v_win := replace(v_win, v_mom, format('(nullif(custom.record_values_of(r) ->> %L, ''''))::timestamptz', v_key));
      v_mom := format('(nullif(custom.record_values_of(r) ->> %L, ''''))::timestamptz', v_key);
    end if;
    return format('(case when (%1$s) is null then ''null''::jsonb when %2$s then ''true''::jsonb else ''false''::jsonb end)',
                  v_mom, v_win);
  end if;

  -- NOTION-Q (2026-10-14): THE LIST QUESTIONS. contains / not_contains / has_any / has_all / has_none / is_exactly /
  -- is_empty ask a column that holds a LIST (a multi-select, a relation) or text, through custom.filter_list_op — the
  -- same reading the flat filter uses. The words are choice labels, keys or ids, as `eq` takes them; a column
  -- hidden from this reader stays undecided.
  if v_op in ('contains', 'not_contains', 'has_any', 'has_all', 'has_none', 'is_exactly', 'is_empty', 'is_not_empty') then
    v_a := v_args -> 0;
    v_b := v_args -> 1;
    v_a_sql := custom.rule_filter_node_sql(p_organization_id, p_table_id, v_a, p_map, p_visible);
    if v_op not in ('is_empty', 'is_not_empty') and (jsonb_typeof(v_b) is distinct from 'object' or not (v_b ? 'const')) then
      raise exception 'this filter''s "%" compares a column with a fixed answer', v_op
        using errcode = '22023',
              hint = 'NOTION-Q: {"op": "has_any", "args": [{"field": "<the field''s id>"}, {"const": ["Instagram", "TikTok"]}]}.';
    end if;
    if v_a_sql = '''null''::jsonb' then
      return v_a_sql;
    end if;
    if v_op in ('is_empty', 'is_not_empty') then
      return format('custom.filter_list_op(%L, %s)', v_op, v_a_sql);
    end if;
    if jsonb_typeof(v_a) = 'object' and v_a ? 'field' and not (v_a ? 'op') and p_map is not null and p_map <> '{}'::jsonb then
      select f.data ->> 'key' into v_key
        from custom.record f
       where f.organization_id = p_organization_id
         and f.id = nullif(v_a ->> 'field', '')::uuid
         and f.table_id = custom.field_kernel_id()
         and f.deleted_at is null;
      if v_key is not null and p_map ? v_key then
        v_b := jsonb_build_object('const', custom.choice_words_normalize(p_map -> v_key, v_b -> 'const'));
      end if;
    end if;
    return format('custom.filter_list_op(%L, %s, %s)', v_op, v_a_sql,
                  custom.rule_filter_node_sql(p_organization_id, p_table_id, v_b, p_map, p_visible));
  end if;

  -- NOTION-Q (2026-10-14): A CONDITION ON THE RECORDS A RELATION POINTS AT — Notion's "any / every / none of the
  -- linked records match", Airtable's filter on a lookup. {"op": "linked", "match": "any", "args": [{"field":
  -- <relation field id>}, <condition on the linked table>]}. One sub-select, like the flat filter's
  -- `<relation>.<field>` key: the linked records THIS reader may see (what that table lets them open), the condition
  -- compiled over that table's own columns and the columns this reader may read there. A record nobody may
  -- see is not among the linked ones.
  if v_op = 'linked' then
    v_quant := coalesce(nullif(p_node ->> 'match', ''), 'any');
    if v_quant not in ('any', 'every', 'none') or jsonb_array_length(v_args) <> 2
       or jsonb_typeof(v_args -> 0) is distinct from 'object' or not ((v_args -> 0) ? 'field') or (v_args -> 0) ? 'op'
       or jsonb_typeof(v_args -> 1) is distinct from 'object' then
      raise exception 'this filter''s "linked" is not written as a relation column and a condition'
        using errcode = '22023',
              hint = 'NOTION-Q: {"op": "linked", "match": "any" | "every" | "none", "args": [{"field": "<the relation field''s id>"}, <a condition on the table it points at>]}.';
    end if;
    select f.data into v_rel
      from custom.record f
     where f.organization_id = p_organization_id
       and f.id = nullif((v_args -> 0) ->> 'field', '')::uuid
       and f.table_id = custom.field_kernel_id()
       and f.deleted_at is null
       and (f.data ->> 'entity_definition_id')::uuid = p_table_id;
    if v_rel is null or v_rel ->> 'type' <> 'relation' or nullif(v_rel ->> 'relation_target', '') is null then
      raise exception 'this filter reaches through a column that is not a relation of this table'
        using errcode = '23503',
              hint = 'NOTION-Q: "linked" takes the id of a relation column of the table being read.';
    end if;
    v_key := custom.agg_assert_key(v_rel ->> 'key');
    if p_visible is not null and not (v_key = any (p_visible)) then
      return '''null''::jsonb';
    end if;
    v_target := (v_rel ->> 'relation_target')::uuid;
    v_who := custom.query_principal();
    if v_who is not null then
      v_level := custom.effective_level(v_who, p_organization_id, v_target);
      v_mask := custom.read_mask_for(v_who, p_organization_id, v_target, v_level, 'read');
      select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_tvis
        from jsonb_array_elements(v_mask -> 'visible') x;
    end if;
    v_inner := custom.rule_filter_node_sql(p_organization_id, v_target, v_args -> 1,
                                           custom.choice_field_map(p_organization_id, v_target), v_tvis);
    v_cell := format('(case when jsonb_typeof(r.data -> %1$L) = ''object'' and (r.data -> %1$L) ? ''value'' '
                     'then r.data -> %1$L -> ''value'' else r.data -> %1$L end)', v_key);
    v_pool := format('select r.id::text from custom.record r where r.organization_id = %1$L::uuid '
                     'and r.table_id = %2$L::uuid and r.deleted_at is null '
                     'and coalesce(r.metadata ->> ''quarantine'', ''false'') <> ''true'' and %3$s',
                     p_organization_id, v_target,
                     custom.listed_predicate_sql(custom.query_principal(), p_organization_id, v_target,
                                                  'viewer'::public.permission_level, 'r'));
    return format(
      '(case when %1$s then ''true''::jsonb else ''false''::jsonb end)',
      case v_quant
        when 'every' then format(
          'not exists (select 1 from jsonb_array_elements_text(case jsonb_typeof(%1$s) when ''array'' then %1$s '
          'when ''null'' then ''[]''::jsonb else jsonb_build_array(%1$s) end) x(id) '
          'where x.id in (%2$s and (custom.rule_truth(%3$s) is not true)))', v_cell, v_pool, v_inner)
        else format(
          '%4$sexists (select 1 from jsonb_array_elements_text(case jsonb_typeof(%1$s) when ''array'' then %1$s '
          'when ''null'' then ''[]''::jsonb else jsonb_build_array(%1$s) end) x(id) '
          'where x.id in (%2$s and (custom.rule_truth(%3$s) is true)))', v_cell, v_pool, v_inner,
          case v_quant when 'none' then 'not ' else '' end)
      end);
  end if;

  -- NOTION-SMALL-2: "ME", resolved for whoever is READING. `eq` / `ne` of a column against the const
  -- {"me": true} asks the reader's own id at the moment the list is read, so one shared "My tasks" view
  -- answers each person with their own rows. A person column holding one id or a list of ids both work.
  if v_op in ('eq', 'ne') then
    v_a := v_args -> 0;
    v_b := v_args -> 1;
    if jsonb_typeof(v_b) = 'object' and v_b ? 'const' and jsonb_typeof(v_b -> 'const') = 'object' and (v_b -> 'const') ? 'me' then
      return format('custom.rule_is_me(%L, %s, %L)', v_op,
                    custom.rule_filter_node_sql(p_organization_id, p_table_id, v_a, p_map, p_visible), p_organization_id::text);
    elsif jsonb_typeof(v_a) = 'object' and v_a ? 'const' and jsonb_typeof(v_a -> 'const') = 'object' and (v_a -> 'const') ? 'me' then
      return format('custom.rule_is_me(%L, %s, %L)', v_op,
                    custom.rule_filter_node_sql(p_organization_id, p_table_id, v_b, p_map, p_visible), p_organization_id::text);
    end if;
  end if;

  -- The two-sided nodes. A choice compared with the words a person typed is compared against
  -- the stored key, exactly as the flat filter normalises it (CHOICE-VALUE).
  v_a := v_args -> 0;
  v_b := v_args -> 1;
  if v_op in ('eq', 'ne') and p_map is not null and p_map <> '{}'::jsonb then
    for v_i in 0..1 loop
      v_one   := case when v_i = 0 then v_a else v_b end;
      v_const := case when v_i = 0 then v_b else v_a end;
      continue when v_one is null or jsonb_typeof(v_one) <> 'object' or not (v_one ? 'field') or v_one ? 'op'
                 or v_const is null or jsonb_typeof(v_const) <> 'object' or not (v_const ? 'const')
                 or jsonb_typeof(v_const -> 'const') <> 'string';
      select f.data ->> 'key' into v_fkey
        from custom.record f
       where f.organization_id = p_organization_id
         and f.id = nullif(v_one ->> 'field', '')::uuid
         and f.table_id = custom.field_kernel_id()
         and f.deleted_at is null;
      if v_fkey is not null and p_map ? v_fkey
         and custom.choice_key_of(p_map -> v_fkey, v_const ->> 'const') is not null then
        v_const := jsonb_build_object('const', custom.choice_key_of(p_map -> v_fkey, v_const ->> 'const'));
        if v_i = 0 then v_b := v_const; else v_a := v_const; end if;
      end if;
    end loop;
  end if;
  return format('custom.rule_sql_op(%L, %s, %s)', v_op,
                custom.rule_filter_node_sql(p_organization_id, p_table_id, v_a, p_map, p_visible),
                custom.rule_filter_node_sql(p_organization_id, p_table_id, v_b, p_map, p_visible));
end;
$function$;
