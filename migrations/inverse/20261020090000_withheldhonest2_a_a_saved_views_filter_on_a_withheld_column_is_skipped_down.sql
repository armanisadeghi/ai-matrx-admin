-- target: branch,production
-- lane: WITHHELD-HONEST-2
-- lock: custom
-- based-on: custom.rule_filter_node_sql(uuid, uuid, jsonb, jsonb, text[]) 8f286e329861826479cdd82588d08141aa5eca4e77f6fd7922ad9f35fa88d348
-- Inverse of WITHHELD-HONEST-2 1: the three bodies as they were live on 2026-10-20, and the helper dropped.

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
      -- WITHHELD-HONEST: a column this reader cannot read is REFUSED by name (the one sentence custom.agg_fields_readable_assert
      -- speaks, detail withheld:<key>), never answered as 'unknown' (which was a 200 with no rows and no notice).
      perform custom.agg_fields_readable_assert(p_organization_id, p_table_id, array[v_key]);
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
      -- WITHHELD-HONEST: a column this reader cannot read is REFUSED by name (the one sentence custom.agg_fields_readable_assert
      -- speaks, detail withheld:<key>), never answered as 'unknown' (which was a 200 with no rows and no notice).
      perform custom.agg_fields_readable_assert(p_organization_id, p_table_id, array[v_key]);
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
      -- WITHHELD-HONEST: a column this reader cannot read is REFUSED by name (the one sentence custom.agg_fields_readable_assert
      -- speaks, detail withheld:<key>), never answered as 'unknown' (which was a 200 with no rows and no notice).
      perform custom.agg_fields_readable_assert(p_organization_id, p_table_id, array[v_key]);
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

CREATE OR REPLACE FUNCTION custom.read_records_page(p_organization_id uuid, p_table_id uuid, p_filter jsonb DEFAULT '{}'::jsonb, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT '[]'::jsonb, p_view_id uuid DEFAULT NULL::uuid, p_by_id boolean DEFAULT false, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_time_zone text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me        uuid := auth.uid();
  v_level     public.permission_level;
  v_mask      jsonb;
  v_visible   text[];
  v_computed  text[];
  v_choices   jsonb;
  v_limit     integer;
  v_offset    integer := greatest(coalesce(p_offset, 0), 0);
  v_where     text;
  v_order     text := '';
  v_term      text := nullif(btrim(coalesce(p_search, '')), '');
  v_sort      jsonb;
  v_key       text;
  v_dir       text;
  v_as        text;
  v_expr      text;
  v_labels    jsonb;
  v_view      record;
  v_positions jsonb := null;
  v_total     bigint;
  v_ids       uuid[];
  v_rows      jsonb;
  v_ignored   jsonb := '[]'::jsonb;
  v_plain     boolean;   -- CHAIR-ACCESS b: a page that asks nothing of the rows' values
  -- HOT-DOORS-3 (2026-10-08)
  v_new       boolean := coalesce(current_setting('mx.read_page_set', true), '') <> 'off';
  v_ctx       jsonb;
  v_listed    text;
  v_ksel      text := '';
  v_kord      text := '';
  v_ki        integer := 0;
  v_locked    bigint := 0;  -- WALK-FIXES D8
  v_pcm       text;         -- HOT-DOORS-4
  v_csort_n   bigint;       -- READ-SPEED f
  v_cv        text;
  v_cstore    boolean;      -- READ-SPEED-3: the kept values may answer this reader's sort
begin
  if v_me is null then
    raise exception 'Nobody is signed in, so there is nothing to read.'
      using errcode = '42501',
            hint = 'DOOR-1: the read door resolves the reader from the session and takes no principal argument. Sign in, or call it from a lane that carries a person.';
  end if;
  -- THE ORGANIZATION WALL, THEN THE TABLE — the same two questions, in the same order, that
  -- custom.read_records_matching asks on its first lines.
  -- HOT-DOORS-4 (2026-10-08): one cached plan per statement of this call (partitions pruned at run time) instead of
  -- a custom plan per call; put back when it returns. A plan choice, never an answer.
  if iam.kernel_batch_on(v_me) then
    v_pcm := pg_catalog.current_setting('plan_cache_mode');
    perform pg_catalog.set_config('plan_cache_mode', 'force_generic_plan', true);
  end if;
  perform custom.assert_client_may_reach(p_organization_id, 'custom.read_records_page');
  perform custom.assert_may_know_table(p_organization_id, p_table_id, 'custom.read_records_page');
  v_limit := custom.page_size(p_organization_id, 'custom.read_records_page', p_limit, 50);

  -- The field question, once: which columns this reader may see (search and sort read ONLY these).
  v_level := custom.effective_level(v_me, p_organization_id, p_table_id);
  v_mask := custom.read_mask_for(v_me, p_organization_id, p_table_id, v_level, 'read');
  select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_visible
    from jsonb_array_elements(v_mask -> 'visible') x;
  -- READ-SPEED f (2026-10-19): THE WORKED-OUT COLUMNS — formulas, roll-ups and lookups, worked out on read or kept
  -- at write. A sort by one of them sorts by its worked-out value (custom.record_value_one: exactly the value the
  -- page shows), never by the document key, which holds nothing for them.
  -- READ-SPEED-ORG (2026-10-19): ONE INDEX PROBE PER COLUMN OF THIS TABLE, never the organization's every Field.
  -- As a join under the generic plan this read every Field record of the organization (13,210 in the test admin's)
  -- and asked custom.parity_type of each: ~280 ms of a 10-row page, growing with the organization, not the table.
  select coalesce(array_agg(k.key), '{}'::text[]) into v_computed
    from jsonb_each_text(coalesce(v_mask -> 'all_key_ids', '{}'::jsonb)) k
   where custom.parity_type((select f.data from custom.record f
                              where f.organization_id = p_organization_id and f.id = k.value::uuid
                                and f.table_id = custom.field_kernel_id())) in ('lookup', 'rollup', 'formula');
  v_choices := coalesce(custom.choice_field_map(p_organization_id, p_table_id), '{}'::jsonb);

  -- ── the rows this reader may see that answer the question ──
  -- CHAIR-ACCESS b: on a PLAIN page (no search, no filter, no sort, no view) a row of a Confidential
  -- Table this person may not open, but which is listed for her ("Shown to"), is a row of the page
  -- too - as its HEADER only, {id, exists: true, submitted_at} (HR proof gap 4). Never when the page
  -- asks a question of the rows: a search hit, a filter match or a sort position on a row she may
  -- not read would say something about its values.
  v_plain := v_term is null
             and coalesce(p_filter, '{}'::jsonb) = '{}'::jsonb
             and (p_sort is null or jsonb_typeof(p_sort) <> 'array' or jsonb_array_length(p_sort) = 0)
             and p_view_id is null;
  -- HOT-DOORS-3 (2026-10-08): THE LIST FILTER IN THE SAME PASS AS THE PAGE. custom.listed_predicate_sql asks
  -- "is it listed for her" as `r.id in (select from custom.query_visible_ids(..))`: a second walk of the whole
  -- Table (25,000 rows through the "shown to" filter, then hashed) before the page's own walk. For one ordinary
  -- Table that list is, row for row, the rows the open predicate admits (custom.visible_set's answer, the same
  -- memoised answer custom.visible_predicate_sql reads) that are live, not quarantined and "shown to" her
  -- (platform.shown_to_lists with custom._record_shown_to_ctx for this organization and Table); the page's own
  -- WHERE already says live, not quarantined, this organization and this Table. So the page asks
  -- custom.visible_predicate_sql for the open predicate WITH the "shown to" filter (the context handed over in
  -- the statement memo around that one call: 'custom.visible_predicate_listed:<person>:<organization>:<Table>'),
  -- both are asked on the page's one walk, and the context is worked out once for both arms. The Table kernel
  -- (its list has memo branches of its own) and a principal that is not the session's person (the builder
  -- refuses that by name) still go through custom.listed_predicate_sql. mx.read_page_set = off: the page
  -- exactly as before (the proofs compare both on one snapshot).
  if v_new and p_table_id is not null and p_table_id is distinct from custom.table_kernel_id()
     and custom.query_principal() is not distinct from v_me then
    v_ctx := custom._record_shown_to_ctx(array[p_organization_id], p_table_id);
    perform platform.memo_k_put('custom.visible_predicate_listed:' || v_me::text || ':' || p_organization_id::text
                                || ':' || p_table_id::text, v_ctx::text);
    v_listed := custom.visible_predicate_sql(v_me, p_organization_id, p_table_id, 'viewer'::public.permission_level, 'r');
    perform platform.memo_k_put('custom.visible_predicate_listed:' || v_me::text || ':' || p_organization_id::text
                                || ':' || p_table_id::text, '');
  else
    v_listed := custom.listed_predicate_sql(v_me, p_organization_id, p_table_id,
                                            'viewer'::public.permission_level, 'r');
    if v_new and v_plain then
      v_ctx := custom._record_shown_to_ctx(array[p_organization_id], p_table_id);
    end if;
  end if;
  v_where := format($w$
      from custom.record r
     where r.organization_id = %L::uuid
       and r.table_id = %L::uuid
       and r.deleted_at is null
       and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
       and ((%s) or (%s))
       and %s$w$,
    p_organization_id, p_table_id,
    v_listed,
    case when v_plain
         -- (the second argument of shown_to_lists is the row column T-13 retires - a legacy fallback
         -- for rows with no shown_to; this door never read it and does not start now: null)
         then format('custom.confidential_header(%L::uuid, r.id) is not null and platform.shown_to_lists(r.shown_to, null, r.created_by, r.organization_id, %L::uuid, %L::jsonb)',
                     v_me, v_me, coalesce(v_ctx, custom._record_shown_to_ctx(array[p_organization_id], p_table_id)))
         else 'false' end,
    custom.record_filter_sql(p_organization_id, p_table_id,
      case when custom.filter_is_rule(coalesce(p_filter, '{}'::jsonb)) then p_filter
           else custom.choice_filter_normalize(v_choices, coalesce(p_filter, '{}'::jsonb)) end));

  -- ── the search: THE ONE SHARED PREDICATE (CHAIR-GRID). custom.record_search_sql is this door's own older
  -- ILIKE over the visible columns and the choice words, plus the typed matches (a date as a person writes
  -- it, a phone by its digits, an amount as the grid shows it), judged for this reader. custom.record_aggregate
  -- asks the same function with the same arguments, so a footer counts exactly the rows this page shows.
  if v_term is not null then
    v_where := v_where || ' and ' || custom.record_search_sql(p_organization_id, p_table_id, p_search, 'r', p_time_zone);
  end if;

  -- ── the order ──
  if p_sort is not null and jsonb_typeof(p_sort) = 'array' and jsonb_array_length(p_sort) > 0 then
    for v_sort in select s from jsonb_array_elements(p_sort) s loop
      v_key := v_sort ->> 'field';
      v_dir := case when lower(coalesce(v_sort ->> 'direction', 'asc')) = 'desc' then 'desc' else 'asc' end;
      v_as  := lower(coalesce(v_sort ->> 'as', 'text'));
      -- MONITOR-TRIAGE (2026-10-01): a sort on a column this reader cannot see — removed, or masked
      -- from their seat — is SKIPPED and named in `sort_ignored`, never a refused page. Ordering by
      -- it would leak the masked values' order, so it is not applied; the rest of the sort stands.
      if v_key is null or not (v_key = any (v_visible)) then
        v_ignored := v_ignored || to_jsonb(coalesce(v_key, ''));
        continue;
      end if;
      if v_key = any (v_computed) then
        -- READ-SPEED f: SORT BY A WORKED-OUT COLUMN (Airtable and Notion do). Every matching row's value is worked out
        -- once (in the matches, beside its id), then ordered like a plain column: a number as a number, a date as its
        -- ISO text, anything else as its lower-cased words, empty last in both directions. Worked out for every
        -- match, so it is bounded: above custom.computed_sort_ceiling() matches it refuses by name, never times out.
        if v_cstore is null then
          v_cstore := custom._computed_reader_ok(v_me, p_organization_id, p_table_id);
        end if;
        -- READ-SPEED-3: with kept values only the rows still to be worked out count against the ceiling.
        if v_csort_n is null and v_cstore
           and not (coalesce(custom._computed_tainted(p_organization_id, p_table_id) -> p_table_id::text, '[]'::jsonb) ? v_key) then
          execute 'select count(*) ' || v_where
               || ' and not exists (select 1 from custom.record_computed rc where rc.record_id = r.id and not rc.stale and rc.vals is not null)'
             into v_csort_n;
          if v_csort_n > custom.computed_sort_ceiling() then
            raise exception 'Sorting by "%" works out its value for every matching record, and % records match (the most is %).', v_key, v_csort_n, custom.computed_sort_ceiling()
              using errcode = '54000',
                    hint = 'Filter or search down to fewer records, or sort by a stored column. Nothing was read.';
          end if;
        end if;
        if v_csort_n is null then
          execute 'select count(*) ' || v_where into v_csort_n;   -- (v_where already carries the search)
          if v_csort_n > custom.computed_sort_ceiling() then
            raise exception 'Sorting by "%" works out its value for every matching record, and % records match (the most is %).', v_key, v_csort_n, custom.computed_sort_ceiling()
              using errcode = '54000',
                    hint = 'Filter or search down to fewer records, or sort by a stored column. Nothing was read.';
          end if;
        end if;
        v_ki := v_ki + 1;
        v_cv := case when v_cstore and not (coalesce(custom._computed_tainted(p_organization_id, p_table_id) -> p_table_id::text, '[]'::jsonb) ? v_key)
                     then format('custom._computed_sort_value(%L::uuid, r.id, %L)', p_organization_id, v_key)
                     else format('custom.record_value_one(%L::uuid, r.id, %L)', p_organization_id, v_key) end;
        v_ksel := v_ksel || ', ' || v_cv || ' as k' || v_ki;
        if v_as in ('number', 'integer') then
          v_kord := v_kord || format('custom._sort_number(m.k%s) %s nulls last, ', v_ki, v_dir);
          v_order := v_order || format('custom._sort_number(%s) %s nulls last, ', v_cv, v_dir);
        elsif v_as in ('date', 'datetime') then
          v_kord := v_kord || format('custom._sort_date(m.k%s) %s nulls last, ', v_ki, v_dir);
          v_order := v_order || format('custom._sort_date(%s) %s nulls last, ', v_cv, v_dir);
        else
          -- Asked as words (the default): a worked-out number still sorts as a number, then words as words.
          v_kord := v_kord || format('custom._sort_number(m.k%1$s) %2$s nulls last, custom._sort_text(m.k%1$s) %2$s nulls last, ', v_ki, v_dir);
          v_order := v_order || format('custom._sort_number(%1$s) %2$s nulls last, custom._sort_text(%1$s) %2$s nulls last, ', v_cv, v_dir);
        end if;
        continue;
      end if;
      if v_choices ? v_key then
        select coalesce(jsonb_object_agg(o.key, o.value ->> 'label'), '{}'::jsonb) into v_labels
          from jsonb_each(coalesce(v_choices -> v_key -> 'options', '{}'::jsonb)) o;
        v_expr := format('lower(coalesce(%L::jsonb ->> (r.data ->> %L), r.data ->> %L))', v_labels, v_key, v_key);
      elsif v_as in ('number', 'integer') then
        v_expr := format($x$case when (r.data ->> %L) ~ '^-?[0-9]+\.?[0-9]*$' then (r.data ->> %L)::numeric end$x$, v_key, v_key);
      elsif v_as in ('date', 'datetime') then
        -- An ISO date or instant sorts as its own text; anything else is not a date and sorts last.
        v_expr := format($x$case when (r.data ->> %L) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then (r.data ->> %L) end$x$, v_key, v_key);
      else
        v_expr := format('lower(r.data ->> %L)', v_key);
      end if;
      v_order := v_order || v_expr || ' ' || v_dir || ' nulls last, ';
      -- HOT-DOORS-3: the same key, kept beside the id so the page can be taken from the matches without
      -- numbering all of them.
      v_ki := v_ki + 1;
      v_ksel := v_ksel || ', ' || v_expr || ' as k' || v_ki;
      v_kord := v_kord || 'm.k' || v_ki || ' ' || v_dir || ' nulls last, ';
    end loop;
    -- Every key skipped: the read door's own order, exactly as if no sort was asked.
    if v_order = '' then
      v_ksel := ', r.created_at as k0';
      v_kord := 'm.k0 desc, m.id';
    else
      v_kord := v_kord || 'm.id';
    end if;
    v_order := case when v_order = '' then 'r.created_at desc, r.id' else v_order || 'r.id' end;
  elsif p_view_id is not null then
    select sv.* into v_view from platform.saved_view sv
     where sv.id = p_view_id and sv.organization_id = p_organization_id
       and sv.surface_key = 'custom/records' and sv.deleted_at is null
       and coalesce(sv.subject_id, nullif(sv.definition ->> 'table_id', '')::uuid) = p_table_id;
    if v_view.id is null then
      raise exception 'There is no such saved view on this table.' using errcode = '23503',
              hint = 'It may have been removed, or it may belong to another table or organization. Nothing was read.',
            detail = jsonb_build_object('view_id', p_view_id)::text;
    end if;
    if v_view.definition ->> 'order' is distinct from 'manual' then
      raise exception 'This view is ordered by its sort, not by hand.' using errcode = '22023',
        hint = 'Ask for its sort in p_sort instead of naming the view. Nothing was read.';
    end if;
    v_positions := coalesce(v_view.metadata -> 'record_positions', '{}'::jsonb);
    v_order := '($1 ->> r.id::text)::numeric nulls last, r.created_at, r.id';
    v_ksel := ', ($1 ->> r.id::text)::numeric as k1, r.created_at as k2';
    v_kord := 'm.k1 nulls last, m.k2, m.id';
  else
    -- No question about order: the read door's own order.
    v_order := 'r.created_at desc, r.id';
    v_ksel := ', r.created_at as k0';
    v_kord := 'm.k0 desc, m.id';
  end if;

  -- HOT-DOORS (2026-10-08): THE COUNT AND THE PAGE IN ONE PASS. The rows the page may show are found once
  -- (every predicate above, the visible-set walk inside it included) and both the total and this page's ids
  -- are read from that one set. Asked as two statements, custom.query_visible_ids walked the whole Table
  -- twice per page (a 25,000-row Table: 2 x 25,000 rows through the "shown to" filter). Same total, same
  -- ids in the same order. mx.read_page_one_pass = off: the two statements as before (the proofs compare
  -- both on one snapshot).
  if v_new and coalesce(current_setting('mx.read_page_one_pass', true), '') <> 'off' then
    -- HOT-DOORS-3 (2026-10-08): ONLY THE PAGE IS SORTED. The matches are found once, each with the keys it is
    -- ordered by; the total counts them and the page is the first v_limit after v_offset in that order (a
    -- top-N sort), instead of numbering every match with row_number() (a full sort of all 25,000) to keep
    -- 50. Every order ends in the row's id, so the order is total and the page holds the same ids in the
    -- same order.
    execute format('with m as materialized (select r.id%s %s) '
                   'select (select count(*) from m), '
                   'array(select m.id from m order by %s limit %s offset %s)',
                   v_ksel, v_where, v_kord, v_limit, v_offset)
       into v_total, v_ids
      using v_positions;
    if cardinality(v_ids) = 0 then
      v_ids := null;
    end if;
  elsif coalesce(current_setting('mx.read_page_one_pass', true), '') = 'off' then
    execute 'select count(*) ' || v_where into v_total;

    execute format('select array_agg(q.id order by q.n) from (select r.id, row_number() over (order by %s) as n %s order by n limit %s offset %s) q',
                   v_order, v_where, v_limit, v_offset)
       into v_ids
      using v_positions;
  else
    execute format('with m as materialized (select r.id, row_number() over (order by %s) as n %s) '
                   'select (select count(*) from m), '
                   '(select array_agg(q.id order by q.n) from (select m.id, m.n from m order by m.n limit %s offset %s) q)',
                   v_order, v_where, v_limit, v_offset)
       into v_total, v_ids
      using v_positions;
  end if;

  if v_ids is null then
    v_rows := '[]'::jsonb;
  else
    -- CHAIR-ACCESS b: an id the read door does not open is a header row (a Confidential row this
    -- person is not named on); an id that is neither is simply not a row of the page.
    if v_new then
      -- HOT-DOORS-3: the header is asked only of an id the read door did not open. Asked through a lateral join
      -- it was asked of every id of the page and thrown away (the planner flattens the lateral: 50 calls,
      -- ~26 ms); a scalar subquery in the CASE arm runs only when that arm is reached. Same rows.
      select coalesce(jsonb_agg(x.row order by x.n), '[]'::jsonb)
        into v_rows
        from (select o.n,
                     case when d.id is not null
                          then jsonb_build_object('id', d.id, 'document', d.document, 'level', d.level)
                          -- (the header from a function scan: read once; a subquery column was written out twice)
                          else (select jsonb_build_object('id', o.rid, 'document', h.hdr, 'level', null)
                                  from custom.confidential_header(v_me, o.rid) h(hdr)
                                 where h.hdr is not null) end as row
                from unnest(v_ids) with ordinality o(rid, n)
                left join custom.read_records_by_ids(p_organization_id, p_table_id, v_ids, coalesce(p_by_id, false)) d on d.id = o.rid
              -- (offset 0: the row is built once; flattened, the CASE was written out twice, in the list and the filter)
              offset 0) x
       where x.row is not null;
    else
    select coalesce(jsonb_agg(x.row order by x.n), '[]'::jsonb)
      into v_rows
      from (select o.n,
                   case when d.id is not null
                        then jsonb_build_object('id', d.id, 'document', d.document, 'level', d.level)
                        when h.hdr is not null
                        then jsonb_build_object('id', o.rid, 'document', h.hdr, 'level', null) end as row
              from unnest(v_ids) with ordinality o(rid, n)
              left join custom.read_records_by_ids(p_organization_id, p_table_id, v_ids, coalesce(p_by_id, false)) d on d.id = o.rid
              left join lateral (select custom.confidential_header(v_me, o.rid) as hdr) h on d.id is null) x
     where x.row is not null;
    end if;
  end if;

  -- WALK-FIXES D8 (2026-10-08): A SORTED PAGE OF THE WHOLE TABLE COUNTS WHAT IT LEAVES OUT. A sort places
  -- no header row (a position would say something about a value), so a Confidential table with a default
  -- sort answered a member "0 rows" where the plain page says "4 you can't open". The NUMBER of those rows
  -- says nothing about their values — the plain page shows them — so a sort-only page answers it as
  -- `locked`. Asked only on a Confidential or Private table; any other answer is unchanged.
  if not v_plain and v_term is null and coalesce(p_filter, '{}'::jsonb) = '{}'::jsonb and p_view_id is null
     and exists (select 1 from custom.record t where t.organization_id = p_organization_id and t.id = p_table_id
                    and t.data ->> 'level' in ('confidential', 'private')) then
    execute format($l$
      select count(*) from custom.record r
       where r.organization_id = %L::uuid and r.table_id = %L::uuid and r.deleted_at is null
         and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
         and not coalesce((%s), false)
         and custom.confidential_header(%L::uuid, r.id) is not null
         and platform.shown_to_lists(r.shown_to, null, r.created_by, r.organization_id, %L::uuid, %L::jsonb)$l$,
      p_organization_id, p_table_id, v_listed, v_me, v_me,
      coalesce(v_ctx, custom._record_shown_to_ctx(array[p_organization_id], p_table_id)))
      into v_locked;
  end if;

  if v_pcm is not null then
    perform pg_catalog.set_config('plan_cache_mode', v_pcm, true);
  end if;
  return jsonb_build_object('total', v_total, 'limit', v_limit, 'offset', v_offset, 'rows', v_rows,
                            'sort_ignored', v_ignored)
         || case when v_locked > 0 then jsonb_build_object('locked', v_locked) else '{}'::jsonb end;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.read_records_keyset(p_organization_id uuid, p_table_id uuid, p_filter jsonb DEFAULT '{}'::jsonb, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT '[]'::jsonb, p_after jsonb DEFAULT NULL::jsonb, p_limit integer DEFAULT 50, p_time_zone text DEFAULT NULL::text, p_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_door      constant text := 'custom.read_records_keyset';
  v_me        uuid := auth.uid();
  v_level     public.permission_level;
  v_mask      jsonb;
  v_visible   text[];
  v_computed  text[];
  v_choices   jsonb;
  v_limit     integer;
  v_where     text;
  v_order     text := '';
  v_term      text := nullif(btrim(coalesce(p_search, '')), '');
  v_sort      jsonb;
  v_key       text;
  v_dir       text;
  v_as        text;
  v_expr      text;
  v_labels    jsonb;
  v_exprs     text[] := '{}';   -- the order's keys, in order (r.id is always the last tie-break)
  v_dirs      text[] := '{}';
  v_types     text[] := '{}';   -- 'text' | 'numeric' | 'timestamptz': how a cursor value is read back
  v_keysql    text;
  v_total     bigint;
  v_ids       uuid[];
  v_keyvals   jsonb[];
  v_rows      jsonb;
  v_ignored   jsonb := '[]'::jsonb;
  v_plain     boolean;
  v_by_ids    boolean := p_ids is not null;
  v_fp        text;
  v_after     text := 'true';
  v_cur_keys  jsonb;
  v_cur_id    uuid;
  v_c         text;
  v_cursor    jsonb := null;
  i           integer;
begin
  if v_me is null then
    raise exception 'Nobody is signed in, so there is nothing to read.'
      using errcode = '42501',
            hint = 'DOOR-1: the read door resolves the reader from the session and takes no principal argument. Sign in, or call it from a lane that carries a person.';
  end if;
  -- THE ORGANIZATION WALL, THEN THE TABLE — the same two questions, in the same order, as custom.read_records_page.
  perform custom.assert_client_may_reach(p_organization_id, v_door);
  perform custom.assert_may_know_table(p_organization_id, p_table_id, v_door);
  -- Re-reading named rows: the page is as long as the list of ids, under the same ceiling.
  v_limit := custom.page_size(p_organization_id, v_door,
                              case when v_by_ids then greatest(coalesce(cardinality(p_ids), 0), 1) else p_limit end, 50);

  -- The field question, once (as the page door).
  v_level := custom.effective_level(v_me, p_organization_id, p_table_id);
  v_mask := custom.read_mask_for(v_me, p_organization_id, p_table_id, v_level, 'read');
  select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_visible
    from jsonb_array_elements(v_mask -> 'visible') x;
  select coalesce(array_agg(k.key), '{}'::text[]) into v_computed
    from jsonb_each_text(coalesce(v_mask -> 'all_key_ids', '{}'::jsonb)) k
    join custom.record f on f.id = k.value::uuid
   where f.data ->> 'type' = 'formula'
     and coalesce(f.data ->> 'compute_on', 'read') = 'read';
  v_choices := coalesce(custom.choice_field_map(p_organization_id, p_table_id), '{}'::jsonb);

  -- ── the rows this reader may see that answer the question — the page door's WHERE, word for word ──
  -- (CHAIR-ACCESS b: a PLAIN page — no search, no filter, no sort — also lists the HEADER of a Confidential row
  -- that is shown to this person but that she may not open.)
  v_plain := v_term is null
             and coalesce(p_filter, '{}'::jsonb) = '{}'::jsonb
             and (p_sort is null or jsonb_typeof(p_sort) <> 'array' or jsonb_array_length(p_sort) = 0);
  v_where := format($w$
      from custom.record r
     where r.organization_id = %L::uuid
       and r.table_id = %L::uuid
       and r.deleted_at is null
       and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
       and ((%s) or (%s))
       and %s$w$,
    p_organization_id, p_table_id,
    custom.listed_predicate_sql(v_me, p_organization_id, p_table_id,
                                 'viewer'::public.permission_level, 'r'),
    case when v_plain
         then format('custom.confidential_header(%L::uuid, r.id) is not null and platform.shown_to_lists(r.shown_to, null, r.created_by, r.organization_id, %L::uuid, %L::jsonb)',
                     v_me, v_me, custom._record_shown_to_ctx(array[p_organization_id], p_table_id))
         else 'false' end,
    custom.record_filter_sql(p_organization_id, p_table_id,
      case when custom.filter_is_rule(coalesce(p_filter, '{}'::jsonb)) then p_filter
           else custom.choice_filter_normalize(v_choices, coalesce(p_filter, '{}'::jsonb)) end));

  if v_term is not null then
    v_where := v_where || ' and ' || custom.record_search_sql(p_organization_id, p_table_id, p_search, 'r', p_time_zone);
  end if;

  -- ── the order: the page door's keys, each remembered so the cursor can say where a row sits ──
  if p_sort is not null and jsonb_typeof(p_sort) = 'array' and jsonb_array_length(p_sort) > 0 then
    for v_sort in select s from jsonb_array_elements(p_sort) s loop
      v_key := v_sort ->> 'field';
      v_dir := case when lower(coalesce(v_sort ->> 'direction', 'asc')) = 'desc' then 'desc' else 'asc' end;
      v_as  := lower(coalesce(v_sort ->> 'as', 'text'));
      if v_key is null or not (v_key = any (v_visible)) then
        v_ignored := v_ignored || to_jsonb(coalesce(v_key, ''));
        continue;
      end if;
      if v_key = any (v_computed) then
        raise exception 'The column "%" is worked out each time it is read, so the store keeps no value to sort the whole table by.', v_key
          using errcode = '0A000',
                hint = 'Sort by one of the columns it is worked out from, or have the column worked out when a record is saved (compute_on: write) so its value is kept. Nothing was read.';
      end if;
      if v_choices ? v_key then
        select coalesce(jsonb_object_agg(o.key, o.value ->> 'label'), '{}'::jsonb) into v_labels
          from jsonb_each(coalesce(v_choices -> v_key -> 'options', '{}'::jsonb)) o;
        v_expr := format('lower(coalesce(%L::jsonb ->> (r.data ->> %L), r.data ->> %L))', v_labels, v_key, v_key);
        v_types := v_types || 'text'::text;
      elsif v_as in ('number', 'integer') then
        v_expr := format($x$case when (r.data ->> %L) ~ '^-?[0-9]+\.?[0-9]*$' then (r.data ->> %L)::numeric end$x$, v_key, v_key);
        v_types := v_types || 'numeric'::text;
      elsif v_as in ('date', 'datetime') then
        v_expr := format($x$case when (r.data ->> %L) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then (r.data ->> %L) end$x$, v_key, v_key);
        v_types := v_types || 'text'::text;
      else
        v_expr := format('lower(r.data ->> %L)', v_key);
        v_types := v_types || 'text'::text;
      end if;
      v_exprs := v_exprs || v_expr;
      v_dirs  := v_dirs || v_dir;
      v_order := v_order || v_expr || ' ' || v_dir || ' nulls last, ';
    end loop;
    v_order := case when v_order = '' then 'r.created_at desc, r.id' else v_order || 'r.id' end;
  else
    v_order := 'r.created_at desc, r.id';
  end if;
  if v_order = 'r.created_at desc, r.id' then
    -- The read door's own order. created_at is NOT NULL, so "nulls last" in the cursor predicate below is the
    -- same order as the plain `desc` here. created_at and id never change, so on this order a row can never
    -- move across the cursor: nothing is skipped or repeated, whatever others write meanwhile.
    v_exprs := array['r.created_at']; v_dirs := array['desc']; v_types := array['timestamptz'];
  end if;
  -- NOTE: on a sort by a column, a row whose sorted value is CHANGED while someone pages can legitimately move
  -- across the cursor (it is answered again on a later page, or not at all). That is the row moving, not the
  -- door losing its place: rows that do not change are never skipped or repeated.

  -- The question a cursor is made under. A cursor is honoured only for exactly this question.
  v_fp := md5(jsonb_build_array(1, p_organization_id, p_table_id, coalesce(p_filter, '{}'::jsonb),
                                 v_term, p_time_zone, coalesce(p_sort, '[]'::jsonb), v_order)::text);

  if v_by_ids then
    -- RE-READ THESE ROWS: the same WHERE, narrowed to the named ids; the cursor is not consulted.
    v_where := v_where || format(' and r.id = any (%L::uuid[])', p_ids);
  else
    execute 'select count(*) ' || v_where into v_total;

    if p_after is not null and jsonb_typeof(p_after) <> 'null' then
      if jsonb_typeof(p_after) <> 'object' or (p_after ->> 'f') is distinct from v_fp then
        raise exception 'This page cursor was made for a different question, so it cannot say where the next page starts.'
          using errcode = '22023',
                hint = 'A cursor keeps its place only under the sort, filter and search it was made with, and while the columns you can see stay the same. Start from the first page, without a cursor. Nothing was read.';
      end if;
      v_cur_keys := p_after -> 'k';
      if jsonb_typeof(v_cur_keys) is distinct from 'array'
         or jsonb_array_length(v_cur_keys) <> cardinality(v_exprs)
         or jsonb_typeof(p_after -> 'id') is distinct from 'string' then
        raise exception 'This page cursor is damaged, so it cannot say where the next page starts.'
          using errcode = '22023',
                hint = 'Pass back the cursor exactly as the last page answered it, or start from the first page, without a cursor. Nothing was read.';
      end if;
      begin
        v_cur_id := (p_after ->> 'id')::uuid;
        for i in 1 .. cardinality(v_exprs) loop
          v_c := v_cur_keys ->> (i - 1);
          if v_c is not null and v_types[i] = 'numeric' then perform v_c::numeric;
          elsif v_c is not null and v_types[i] = 'timestamptz' then perform v_c::timestamptz;
          end if;
        end loop;
      exception when others then
        raise exception 'This page cursor is damaged, so it cannot say where the next page starts.'
          using errcode = '22023',
                hint = 'Pass back the cursor exactly as the last page answered it, or start from the first page, without a cursor. Nothing was read.';
      end;
      -- "AFTER THIS ROW", key by key: after on key 1, or equal on key 1 and after on key 2, …, or equal on every
      -- key and a greater id. Every key sorts NULLS LAST in either direction, so: a non-null cursor value has
      -- after it the values beyond it in its direction AND every null; a null cursor value has nothing after it
      -- on that key, and only nulls equal to it. (A row-value comparison is wrong for mixed directions and for
      -- nulls, so it is not used.) The values are quoted literals, read back as the type the key sorts as.
      v_after := format('r.id > %L::uuid', v_cur_id);
      for i in reverse cardinality(v_exprs) .. 1 loop
        v_c := v_cur_keys ->> (i - 1);
        if v_c is null then
          v_after := format('((%s) is null and (%s))', v_exprs[i], v_after);
        else
          v_after := format('((%1$s) %2$s %3$L::%4$s or (%1$s) is null or ((%1$s) = %3$L::%4$s and (%5$s)))',
                            v_exprs[i], case when v_dirs[i] = 'desc' then '<' else '>' end, v_c, v_types[i], v_after);
        end if;
      end loop;
    end if;
  end if;

  select 'jsonb_build_array(' || string_agg('to_jsonb(' || e || ')', ', ' order by n) || ')' into v_keysql
    from unnest(v_exprs) with ordinality u(e, n);

  -- One row more than the page, to know whether there is a next page.
  execute format('select array_agg(q.id order by q.n), array_agg(q.k order by q.n) from (select r.id, %s as k, row_number() over (order by %s) as n %s and (%s) order by n limit %s) q',
                 case when v_by_ids then 'null::jsonb' else v_keysql end, v_order, v_where, v_after,
                 case when v_by_ids then v_limit else v_limit + 1 end)
     into v_ids, v_keyvals;

  if not v_by_ids and coalesce(cardinality(v_ids), 0) > v_limit then
    v_cursor := jsonb_build_object('v', 1, 'f', v_fp, 'k', v_keyvals[v_limit], 'id', v_ids[v_limit]);
    v_ids := v_ids[1:v_limit];
  end if;

  if v_ids is null then
    v_rows := '[]'::jsonb;
  else
    -- As the page door: an id the read door opens is a row; an id it does not open is a header row (a
    -- Confidential row this person is not named on); an id that is neither is simply not a row of the page.
    -- Each opened row carries its version and organization, read from custom.record in this same statement (a
    -- STABLE function reads one snapshot throughout), so the document and its version cannot disagree. A header
    -- row carries no version: it says only that the row exists.
    select coalesce(jsonb_agg(x.row order by x.n), '[]'::jsonb)
      into v_rows
      from (select o.n,
                   case when d.id is not null
                        then jsonb_build_object('id', d.id, 'document', d.document, 'level', d.level,
                                                'version', rec.version, 'organization_id', rec.organization_id)
                        when h.hdr is not null
                        then jsonb_build_object('id', o.rid, 'document', h.hdr, 'level', null,
                                                'version', null, 'organization_id', p_organization_id) end as row
              from unnest(v_ids) with ordinality o(rid, n)
              left join custom.read_records_by_ids(p_organization_id, p_table_id, v_ids, false) d on d.id = o.rid
              left join custom.record rec on rec.id = d.id and rec.organization_id = p_organization_id
              left join lateral (select custom.confidential_header(v_me, o.rid) as hdr) h on d.id is null) x
     where x.row is not null;
  end if;

  return jsonb_build_object('rows', v_rows, 'total', v_total, 'limit', v_limit, 'cursor', v_cursor,
                            'sort_ignored', v_ignored);
end;
$function$;

DROP FUNCTION IF EXISTS custom.rule_filter_skip_withheld(uuid, uuid, jsonb, text[]);
