-- additive: yes
--
-- It REPLACES three function bodies: custom.rule_filter_node_sql, custom.rollup_value, custom.formula_eval.
-- Inverse: migrations/inverse/template_gaps_g_stamps_in_day_windows_dates_in_rollup_min_max_down.sql.
--
-- TEMPLATE-GAPS D2 / D3 (common-docs projects/spaces-templates/reports/REVIEW-2.md):
--   D2  a `within` window on a Created time / Last edited time column (and any read-time column) read the stored
--       document and matched nothing — "New this week" was empty on 12 rows made today.
--   D3  a max / min roll-up of a DATE column was empty (numbers only), and DATEDIFF over that empty answer raised ("!")
--       where the planned path and Notion answer blank. YEAR / MONTH / DAY of an empty date likewise.
--
-- based-on: custom.rule_filter_node_sql(uuid, uuid, jsonb, jsonb, text[]) c75b6c2ab2a18296d1a0abe233c2756febdfe46c96cf62ce0ca35508eaf3a0a8
-- based-on: custom.rollup_value(uuid, uuid, jsonb) 9b1f1807e76972d267e837f74447cb0469687a1ea3ad646b44533f54093b7d27
-- based-on: custom.formula_eval(uuid, jsonb, jsonb, jsonb) ec8cad511da6f967ebb2fbc94f194e0537f59d0f14ccebd7856612886f8f9eb3

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
    return null;                    -- nothing to work out is an absence, never a zero.
  end if;
  return case v_agg
    when 'sum' then to_jsonb((select sum(x) from unnest(v_nums) x))
    when 'min' then to_jsonb((select min(x) from unnest(v_nums) x))
    when 'max' then to_jsonb((select max(x) from unnest(v_nums) x))
    when 'avg' then to_jsonb((select avg(x) from unnest(v_nums) x))
  end;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.formula_eval(p_organization_id uuid, p_expr jsonb, p_values jsonb, p_context jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_only_ts timestamptz;
  v_op    text;
  v_args  jsonb;
  v_n     integer;
  v_spec  record;
  v_vals  jsonb[] := '{}';
  v_one   jsonb;
  v_a     jsonb;
  v_b     jsonb;
  v_x     numeric;
  v_y     numeric;
  v_nums  numeric[] := '{}';
  v_s     text;
  v_t     text;
  v_d1    record;
  v_d2    record;
  v_u     text;
  v_type  text;
  v_ts    timestamp;
  v_i     integer;
  v_k     integer;
  v_p     integer;
  v_el    jsonb;
begin
  if p_expr is null or jsonb_typeof(p_expr) <> 'object' then
    return custom.rule_eval(p_organization_id, p_expr, p_values, coalesce(p_context, '{}'::jsonb));
  end if;

  -- ── A COLUMN. What the older grid's `displayValueOf` seam did: a choice or a relation is
  -- the WORDS a person reads (so `{Status} = "No-show"` compares the label), everything else
  -- is its stored value; a list or an object reads as its JSON (normalizeCell).
  if p_expr ? 'field' and not (p_expr ? 'op') then
    v_a := custom.rule_eval(p_organization_id, p_expr, p_values, coalesce(p_context, '{}'::jsonb));
    if v_a is null or jsonb_typeof(v_a) = 'null' then
      return 'null'::jsonb;
    end if;
    select f.data ->> 'type' into v_type
      from custom.record f
     where f.organization_id = p_organization_id and f.id = (p_expr ->> 'field')::uuid
       and f.table_id = custom.field_kernel_id();
    if v_type in ('list', 'relation') then
      return to_jsonb(custom.field_words(p_organization_id, (p_expr ->> 'field')::uuid, v_a));
    end if;
    if jsonb_typeof(v_a) in ('array', 'object') then
      return to_jsonb(v_a::text);
    end if;
    return v_a;
  end if;

  v_op := p_expr ->> 'op';
  if v_op is null or left(v_op, 3) <> 'fx.' then
    -- Every node that is not the formula language's own is a Rule node, answered by the
    -- Rules' evaluator, unchanged — so every formula written before today answers the same.
    return custom.rule_eval(p_organization_id, p_expr, p_values, coalesce(p_context, '{}'::jsonb));
  end if;

  select * into v_spec from custom.formula_node_kinds() k where k.node = v_op;
  if v_spec.node is null then
    raise exception 'This formula asks for %, and the formula language has no such function.', v_op
      using errcode = '22023', hint = 'select node, signature from custom.formula_node_kinds() is the whole list.';
  end if;
  v_args := coalesce(p_expr -> 'args', '[]'::jsonb);
  if jsonb_typeof(v_args) <> 'array' then
    raise exception '`%` was given something that is not a list of values.', v_spec.signature using errcode = '22023';
  end if;
  v_n := jsonb_array_length(v_args);
  if v_n < v_spec.min_args or (v_spec.max_args is not null and v_n > v_spec.max_args) then
    raise exception '`%` was given % value%. Use %.', upper(substr(v_op, 4)), v_n,
                    case when v_n = 1 then '' else 's' end, v_spec.signature
      using errcode = '22023';
  end if;

  -- ── short-circuit: IF, AND, OR ──────────────────────────────────────────────────────────
  if v_op = 'fx.if' then
    if custom._fx_truthy(custom.formula_eval(p_organization_id, v_args -> 0, p_values, p_context)) then
      return custom.formula_eval(p_organization_id, v_args -> 1, p_values, p_context);
    end if;
    if v_n > 2 then
      return custom.formula_eval(p_organization_id, v_args -> 2, p_values, p_context);
    end if;
    return 'null'::jsonb;
  elsif v_op = 'fx.and' then
    for v_one in select e from jsonb_array_elements(v_args) e loop
      if not custom._fx_truthy(custom.formula_eval(p_organization_id, v_one, p_values, p_context)) then
        return 'false'::jsonb;
      end if;
    end loop;
    return 'true'::jsonb;
  elsif v_op = 'fx.or' then
    for v_one in select e from jsonb_array_elements(v_args) e loop
      if custom._fx_truthy(custom.formula_eval(p_organization_id, v_one, p_values, p_context)) then
        return 'true'::jsonb;
      end if;
    end loop;
    return 'false'::jsonb;
  elsif v_op = 'fx.switch' then
    -- SWITCH(value, match, result, …, otherwise?) — Airtable's order. Only the value, the
    -- matches up to the first that holds, and that one result are worked out; a match compares
    -- exactly as `=` does (numbers as numbers, an empty value matches BLANK()).
    v_a := coalesce(custom.formula_eval(p_organization_id, v_args -> 0, p_values, p_context), 'null'::jsonb);
    v_i := 1;
    while v_i + 1 < v_n loop
      if custom._fx_cmp(v_a, coalesce(custom.formula_eval(p_organization_id, v_args -> v_i, p_values, p_context),
                                      'null'::jsonb)) = 0 then
        return custom.formula_eval(p_organization_id, v_args -> (v_i + 1), p_values, p_context);
      end if;
      v_i := v_i + 2;
    end loop;
    if v_i < v_n then
      return custom.formula_eval(p_organization_id, v_args -> v_i, p_values, p_context);
    end if;
    return 'null'::jsonb;
  elsif v_op = 'fx.arrayjoin' then
    -- ARRAYJOIN(values, separator?) reads a COLUMN's stored list, not its words joined already:
    -- a many-choice column is each choice's own label, a link each record's own title. An empty
    -- item stays, as an empty piece between two separators — Airtable leaves removing them to
    -- ARRAYCOMPACT.
    v_s := case when v_n > 1
                then custom._fx_text(custom.formula_eval(p_organization_id, v_args -> 1, p_values, p_context))
                else ', ' end;
    v_a := custom._fx_items(p_organization_id, v_args -> 0, p_values, p_context);
    return to_jsonb(coalesce((select string_agg(custom._fx_text(u.x), v_s order by u.i)
                                from jsonb_array_elements(v_a) with ordinality u(x, i)), ''));
  elsif v_op = 'fx.arraycompact' then
    -- ARRAYCOMPACT(values): the list without empty items (null and ""). false, 0 and text of
    -- spaces stay, as in Airtable.
    v_a := custom._fx_items(p_organization_id, v_args -> 0, p_values, p_context);
    return coalesce((select jsonb_agg(u.x order by u.i)
                       from jsonb_array_elements(v_a) with ordinality u(x, i)
                      where not custom._fx_blank(u.x)), '[]'::jsonb);
  elsif v_op = 'fx.iserror' then
    -- ISERROR(expr): yes when working the expression out would refuse. A cancelled read is not an error answer.
    begin
      perform custom.formula_eval(p_organization_id, v_args -> 0, p_values, p_context);
      return 'false'::jsonb;
    exception when others then
      return 'true'::jsonb;
    end;
  elsif v_op in ('fx.arrayunique', 'fx.arrayflatten', 'fx.arrayslice') then
    -- the list arguments read as ARRAYJOIN reads them: a many-choice column's labels, a link's titles.
    v_a := custom._fx_items(p_organization_id, v_args -> 0, p_values, p_context);
    v_vals := array[v_a];
    for v_i in 1 .. v_n - 1 loop
      v_vals := v_vals || coalesce(custom.formula_eval(p_organization_id, v_args -> v_i, p_values, p_context), 'null'::jsonb);
    end loop;
    return custom._fx_ext(p_organization_id, v_op, v_vals, coalesce(p_context, '{}'::jsonb));
  end if;

  -- ── FORMULA-2: the list functions and the item words ─────────────────────────────────────
  if v_op in ('fx.current', 'fx.index', 'fx.current1', 'fx.current2', 'fx.recprop', 'fx.map', 'fx.filter', 'fx.findfirst',
              'fx.some', 'fx.every', 'fx.length', 'fx.at', 'fx.first', 'fx.last', 'fx.sort', 'fx.unique', 'fx.reverse',
              'fx.slice', 'fx.join', 'fx.split', 'fx.includes') then
    return custom._fx_listop(p_organization_id, v_op, v_args, p_values, coalesce(p_context, '{}'::jsonb));
  end if;

  -- ── the store's own kinds ───────────────────────────────────────────────────────────────
  if v_op = 'fx.autonumber' then
    return to_jsonb(custom._fx_autonumber(p_organization_id,
             nullif(p_context ->> 'fx_table_id', '')::uuid,
             nullif(p_context ->> 'fx_field_key', ''),
             nullif(p_context ->> 'fx_self_id', '')::uuid));
  elsif v_op = 'fx.record_id' then
    -- RECORD_ID(): the record's own id; a reader that has no record yet leaves it blank.
    return coalesce(to_jsonb(nullif(p_context ->> 'fx_self_id', '')), 'null'::jsonb);
  elsif v_op in ('fx.created_time', 'fx.modified_time', 'fx.last_modified_time') then
    select case when v_op = 'fx.created_time' then r.created_at else r.updated_at end into v_ts
      from custom.record r
     where r.organization_id = p_organization_id
       and r.id = nullif(p_context ->> 'fx_self_id', '')::uuid;
    -- AT-SHARE: a Last modified time column limited to chosen fields (config.only_fields) answers the latest moment
    -- ANY of those fields was written, read from the record's own per-field stamps (`_values.<key>.at`); a record
    -- none of them was ever written on answers blank. Without the option the column is the record's updated_at, as before.
    if v_op <> 'fx.created_time' and v_ts is not null then
      select max((r.data -> '_values' -> k ->> 'at')::timestamptz)
        into v_only_ts
        from custom.record r
        join custom.record f
          on f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id() and f.deleted_at is null
         and (f.data ->> 'entity_definition_id') = r.table_id::text
         and (f.data ->> 'key') = nullif(p_context ->> 'fx_field_key', '')
        cross join lateral jsonb_array_elements_text(
              case when jsonb_typeof(f.data -> 'config' -> 'only_fields') = 'array' then f.data -> 'config' -> 'only_fields' else '[]'::jsonb end) k
       where r.organization_id = p_organization_id
         and r.id = nullif(p_context ->> 'fx_self_id', '')::uuid;
      if exists (select 1 from custom.record r
                   join custom.record f on f.organization_id = p_organization_id and f.table_id = custom.field_kernel_id() and f.deleted_at is null
                    and (f.data ->> 'entity_definition_id') = r.table_id::text
                    and (f.data ->> 'key') = nullif(p_context ->> 'fx_field_key', '')
                  where r.organization_id = p_organization_id and r.id = nullif(p_context ->> 'fx_self_id', '')::uuid
                    and jsonb_typeof(f.data -> 'config' -> 'only_fields') = 'array'
                    and jsonb_array_length(f.data -> 'config' -> 'only_fields') > 0) then
        v_ts := v_only_ts;
      end if;
    end if;
    if v_ts is null then
      return 'null'::jsonb;   -- a reader that has no record yet leaves it blank, never invents one
    end if;
    return to_jsonb(to_char((v_ts::timestamptz) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  elsif v_op = 'fx.blank' then
    return 'null'::jsonb;
  elsif v_op = 'fx.today' then
    return to_jsonb(to_char(now() at time zone custom.day_zone(p_organization_id), 'YYYY-MM-DD'));
  elsif v_op = 'fx.now' then
    return to_jsonb(to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  end if;

  -- ── everything else evaluates every argument first ─────────────────────────────────────
  for v_one in select e from jsonb_array_elements(v_args) e loop
    v_vals := v_vals || coalesce(custom.formula_eval(p_organization_id, v_one, p_values, p_context), 'null'::jsonb);
  end loop;
  v_a := case when v_n >= 1 then v_vals[1] end;
  v_b := case when v_n >= 2 then v_vals[2] end;

  case v_op
    when 'fx.sum', 'fx.min', 'fx.max', 'fx.average', 'fx.median' then
      -- a list given as a value counts as all its values (SUM over a roll-up, MAP(...) and the like).
      foreach v_one in array v_vals loop
        -- a list written as the JSON text of one (a list cell read as text) counts as all its values too
        if jsonb_typeof(v_one) = 'string' and btrim(v_one #>> '{}') like '[%' then
          v_one := custom._fx_arr(v_one);
        end if;
        if jsonb_typeof(v_one) = 'array' then
          for v_el in select e from jsonb_array_elements(v_one) e loop
            if not custom._fx_blank(v_el) then
              v_nums := v_nums || custom._fx_num(v_el, format('`%s`', upper(substr(v_op, 4))));
            end if;
          end loop;
        elsif not custom._fx_blank(v_one) then
          v_nums := v_nums || custom._fx_num(v_one, format('`%s`', upper(substr(v_op, 4))));
        end if;
      end loop;
      if v_op = 'fx.sum' then
        return to_jsonb(coalesce((select sum(x) from unnest(v_nums) x), 0));
      end if;
      if cardinality(v_nums) = 0 then return 'null'::jsonb; end if;
      if v_op = 'fx.median' then
        return to_jsonb(trim_scale((select avg(q.x) from (select x, row_number() over (order by x) rn, count(*) over () c
                                                            from unnest(v_nums) x) q
                                     where q.rn in ((q.c + 1) / 2, (q.c + 2) / 2))));
      end if;
      if v_op = 'fx.min' then return to_jsonb((select min(x) from unnest(v_nums) x)); end if;
      if v_op = 'fx.max' then return to_jsonb((select max(x) from unnest(v_nums) x)); end if;
      return to_jsonb(trim_scale((select sum(x) from unnest(v_nums) x) / cardinality(v_nums)));
    when 'fx.round' then
      v_x := custom._fx_num(v_a, '`ROUND`');
      v_y := case when v_n > 1 then trunc(custom._fx_num(v_b, '`ROUND`')) else 0 end;
      -- numeric round() rounds halves away from zero, which is the older grid's rule.
      return to_jsonb(round(v_x, v_y::integer));
    when 'fx.abs' then
      return to_jsonb(abs(custom._fx_num(v_a, '`ABS`')));
    when 'fx.len' then
      return to_jsonb(char_length(custom._fx_text(v_a)));
    when 'fx.upper' then
      return to_jsonb(upper(custom._fx_text(v_a)));
    when 'fx.lower' then
      return to_jsonb(lower(custom._fx_text(v_a)));
    when 'fx.trim' then
      return to_jsonb(regexp_replace(custom._fx_text(v_a), '^\s+|\s+$', '', 'g'));
    when 'fx.concatenate' then
      return to_jsonb((select string_agg(custom._fx_text(x), '' order by i)
                         from unnest(v_vals) with ordinality u(x, i)));
    when 'fx.left' then
      v_x := trunc(custom._fx_num(v_b, '`LEFT`'));
      return to_jsonb(left(custom._fx_text(v_a), greatest(0, v_x)::integer));
    when 'fx.right' then
      v_x := trunc(custom._fx_num(v_b, '`RIGHT`'));
      if v_x <= 0 then return '""'::jsonb; end if;
      return to_jsonb(right(custom._fx_text(v_a), v_x::integer));
    when 'fx.contains' then
      return to_jsonb(strpos(lower(custom._fx_text(v_a)), lower(custom._fx_text(v_b))) > 0);
    when 'fx.not' then
      return to_jsonb(not custom._fx_truthy(v_a));
    when 'fx.isblank' then
      return to_jsonb(custom._fx_blank(v_a));
    when 'fx.datediff' then
      -- TEMPLATE-GAPS D3: an empty date answers empty, never an error (Notion's dateBetween, and exactly what the
      -- planned path, custom._fxc_apply, already answers) — "Days since last touch" over no activity is blank.
      if custom._fx_blank(v_a) or custom._fx_blank(v_b) then return 'null'::jsonb; end if;
      select * into v_d1 from custom._fx_date(v_a, '`DATEDIFF`');
      select * into v_d2 from custom._fx_date(v_b, '`DATEDIFF`');
      v_u := custom._fx_unit(v_vals[3], array['days', 'hours', 'minutes', 'seconds', 'months', 'years'], 'DATEDIFF');
      if v_u in ('months', 'years') then
        -- whole calendar months (or years) from the first date to the second, toward zero.
        v_x := extract(year from age(v_d2.ts, v_d1.ts)) * 12 + extract(month from age(v_d2.ts, v_d1.ts));
        return to_jsonb(trunc(case v_u when 'years' then v_x / 12 else v_x end));
      end if;
      return to_jsonb(trunc(extract(epoch from (v_d2.ts - v_d1.ts))
                            / case v_u when 'days' then 86400 when 'hours' then 3600 when 'minutes' then 60 else 1 end));
    when 'fx.year' then
      if custom._fx_blank(v_a) then return 'null'::jsonb; end if;
      select * into v_d1 from custom._fx_date(v_a, '`YEAR`');
      return to_jsonb(extract(year from v_d1.ts)::integer);
    when 'fx.month' then
      if custom._fx_blank(v_a) then return 'null'::jsonb; end if;
      select * into v_d1 from custom._fx_date(v_a, '`MONTH`');
      return to_jsonb(extract(month from v_d1.ts)::integer);
    when 'fx.day' then
      if custom._fx_blank(v_a) then return 'null'::jsonb; end if;
      select * into v_d1 from custom._fx_date(v_a, '`DAY`');
      return to_jsonb(extract(day from v_d1.ts)::integer);
    when 'fx.dateadd' then
      select * into v_d1 from custom._fx_date(v_a, '`DATEADD`');
      v_x := trunc(custom._fx_num(v_b, '`DATEADD`'));
      v_u := case custom._fx_unit_norm(v_vals[3], 'DATEADD')
               when 'day' then 'days' when 'month' then 'months' when 'year' then 'years' when 'hour' then 'hours'
               when 'minute' then 'minutes' when 'second' then 'seconds' when 'week' then 'weeks' when 'quarter' then 'quarters'
               else 'milliseconds' end;
      -- An interval of months clamps to the end of a shorter month, as the older grid does.
      v_ts := case v_u when 'days' then v_d1.ts + make_interval(days => v_x::integer)
                       when 'months' then v_d1.ts + make_interval(months => v_x::integer)
                       when 'hours' then v_d1.ts + make_interval(hours => v_x::integer)
                       when 'minutes' then v_d1.ts + make_interval(mins => v_x::integer)
                       when 'seconds' then v_d1.ts + make_interval(secs => v_x::integer)
                       when 'milliseconds' then v_d1.ts + make_interval(secs => v_x / 1000.0)
                       when 'weeks' then v_d1.ts + make_interval(days => 7 * v_x::integer)
                       when 'quarters' then v_d1.ts + make_interval(months => 3 * v_x::integer)
                       else v_d1.ts + make_interval(years => v_x::integer) end;
      -- a date with no time of day stays one when moved by days, months or years; hours and minutes need a time.
      return to_jsonb(custom._fx_iso(v_ts, v_d1.date_only and v_u in ('days', 'months', 'years', 'weeks', 'quarters')));
    when 'fx.find' then
      -- FIND(part, text, start?): Airtable's startFromPosition, which defaults to 0, is
      -- JavaScript's indexOf start — the number of characters skipped before the search. The
      -- answer counts from 1, and 0 means the part is not there. Upper and lower case differ.
      v_s := custom._fx_text(v_a);
      v_t := custom._fx_text(v_b);
      v_x := case when v_n > 2 then greatest(trunc(custom._fx_num(v_vals[3], '`FIND`')), 0) else 0 end;
      v_x := least(v_x, char_length(v_t));
      if v_s = '' then
        return to_jsonb(v_x + 1);
      end if;
      v_k := strpos(substr(v_t, v_x::integer + 1), v_s);
      return to_jsonb(case when v_k = 0 then 0 else v_k + v_x::integer end);
    when 'fx.substitute' then
      -- SUBSTITUTE(text, old, new, which?): every `old` replaced, or only the which-th one.
      v_s := custom._fx_text(v_a);
      v_t := custom._fx_text(v_b);
      v_u := custom._fx_text(v_vals[3]);
      if v_t = '' then
        return to_jsonb(v_s);
      end if;
      if v_n < 4 then
        return to_jsonb(replace(v_s, v_t, v_u));
      end if;
      v_x := trunc(custom._fx_num(v_vals[4], '`SUBSTITUTE`'));
      if v_x < 1 then
        raise exception '`SUBSTITUTE` counts which one to replace from 1, but was given %.', custom._fx_num_text(v_x)
          using errcode = '22023';
      end if;
      v_i := 0;   -- characters already passed
      v_k := 0;   -- occurrences seen
      loop
        v_p := strpos(substr(v_s, v_i + 1), v_t);
        exit when v_p = 0;
        v_i := v_i + v_p;
        v_k := v_k + 1;
        if v_k = v_x then
          return to_jsonb(left(v_s, v_i - 1) || v_u || substr(v_s, v_i + char_length(v_t)));
        end if;
        v_i := v_i + char_length(v_t) - 1;
      end loop;
      return to_jsonb(v_s);
    when 'fx.regex_match' then
      -- REGEX_MATCH(text, pattern), read as RE2 reads it (custom._fx_regex). Postgres's `~`
      -- answers yes/no without tracking captures, so the classic runaway shapes ((a+)+,
      -- (\w+\s?)+) run in milliseconds and are accepted, as RE2 accepts them. A pattern the
      -- database cannot read, or one too complex to compile (both 2201B), or one that runs past
      -- the statement's time is said in a plain sentence; a timeout keeps its own sqlstate
      -- (57014) so custom.derived_value still re-raises it as a cancelled read, never an empty
      -- cell. This is the only handler in the evaluator.
      v_t := custom._fx_regex(custom._fx_text(v_b), 'REGEX_MATCH');
      begin
        return to_jsonb(custom._fx_text(v_a) ~ v_t);
      exception
        when invalid_regular_expression then
          if sqlerrm like '%too complex%' then
            raise exception '`REGEX_MATCH` cannot work out a pattern this complex: "%".', custom._fx_text(v_b)
              using errcode = '22023';
          end if;
          raise exception '`REGEX_MATCH` cannot read the pattern "%".', custom._fx_text(v_b)
            using errcode = '22023';
        when query_canceled then
          raise exception '`REGEX_MATCH` took too long on this text. Try a simpler pattern.'
            using errcode = '57014';
      end;
    when 'fx.regexreplace' then
      -- REGEXREPLACE(text, pattern, new, all?): the pattern is read as RE2 reads it (custom._fx_regex); $1 in the new
      -- text is the first group, as in a Notion formula.
      v_t := custom._fx_regex(custom._fx_text(v_b), 'REGEXREPLACE');
      begin
        return to_jsonb(regexp_replace(custom._fx_text(v_a), v_t,
                          regexp_replace(custom._fx_text(v_vals[3]), '\$([0-9])', '\\\1', 'g'),
                          case when v_n > 3 and custom._fx_truthy(v_vals[4]) then 'g' else '' end));
      exception
        when invalid_regular_expression then
          raise exception '`REGEXREPLACE` cannot read the pattern "%".', custom._fx_text(v_b) using errcode = '22023';
      end;
    when 'fx.datetime_format' then
      select * into v_d1 from custom._fx_dl(v_a, '`DATETIME_FORMAT`');
      -- a date SET_TIMEZONE wrote (…+10:00) is written as that zone's own wall clock
      v_ts := case when jsonb_typeof(v_a) = 'string' and (v_a #>> '{}') ~ '\d[+-]\d{2}:\d{2}$'
                   then (left(v_a #>> '{}', char_length(v_a #>> '{}') - 6))::timestamp else v_d1.ts end;
      if v_n < 2 or btrim(custom._fx_text(v_b)) = '' then
        return to_jsonb(custom._fx_iso(v_ts, v_d1.date_only));
      end if;
      return to_jsonb(custom._fx_datetime_format(v_ts, custom._fx_text(v_b)));
    when 'fx.workday' then
      select * into v_d1 from custom._fx_date(v_a, '`WORKDAY`');
      v_x := trunc(custom._fx_num(v_b, '`WORKDAY`'));
      if abs(v_x) > 36500 then
        raise exception '`WORKDAY` moves at most 36500 working days, but was given %.', custom._fx_num_text(v_x)
          using errcode = '22023';
      end if;
      return to_jsonb(custom._fx_iso(
        custom._fx_workday(v_d1.ts, v_x::integer, case when v_n > 2 then v_vals[3] end), v_d1.date_only));
    when 'fx.add' then
      return to_jsonb(custom._fx_num(v_a, '`+`') + custom._fx_num(v_b, '`+`'));
    when 'fx.sub' then
      return to_jsonb(custom._fx_num(v_a, '`-`') - custom._fx_num(v_b, '`-`'));
    when 'fx.mul' then
      return to_jsonb(custom._fx_num(v_a, '`*`') * custom._fx_num(v_b, '`*`'));
    when 'fx.div', 'fx.mod' then
      v_y := custom._fx_num(v_b, case when v_op = 'fx.div' then '`/`' else '`%`' end);
      if v_y = 0 then
        raise exception 'This formula divides by zero.' using errcode = '22012';
      end if;
      v_x := custom._fx_num(v_a, case when v_op = 'fx.div' then '`/`' else '`%`' end);
      -- trim_scale: 142.5 / 3 is 47.5, not 47.5000000000000000 (a number reads as the older grid prints it).
      return to_jsonb(trim_scale(case when v_op = 'fx.div' then v_x / v_y else custom._fx_floored_mod(v_x, v_y) end));
    when 'fx.neg' then
      return to_jsonb(- custom._fx_num(v_a, '`-`'));
    when 'fx.eq'  then return to_jsonb(custom._fx_cmp(v_a, v_b) = 0);
    when 'fx.ne'  then return to_jsonb(custom._fx_cmp(v_a, v_b) <> 0);
    when 'fx.lt'  then return to_jsonb(custom._fx_cmp(v_a, v_b) < 0);
    when 'fx.lte' then return to_jsonb(custom._fx_cmp(v_a, v_b) <= 0);
    when 'fx.gt'  then return to_jsonb(custom._fx_cmp(v_a, v_b) > 0);
    when 'fx.gte' then return to_jsonb(custom._fx_cmp(v_a, v_b) >= 0);
    when 'fx.true', 'fx.false', 'fx.error', 'fx.ceiling', 'fx.floor', 'fx.int', 'fx.power', 'fx.sqrt', 'fx.exp', 'fx.log',
         'fx.roundup', 'fx.rounddown', 'fx.even', 'fx.odd', 'fx.count', 'fx.counta', 'fx.countall', 'fx.value',
         'fx.mid', 'fx.replace', 'fx.rept', 'fx.search', 'fx.t', 'fx.encode_url_component', 'fx.xor',
         'fx.is_before', 'fx.is_after', 'fx.is_same', 'fx.hour', 'fx.minute', 'fx.second', 'fx.weekday', 'fx.weeknum',
         'fx.workday_diff', 'fx.datestr', 'fx.timestr', 'fx.datetime_parse', 'fx.datetime_diff', 'fx.tonow', 'fx.fromnow',
         'fx.set_timezone', 'fx.set_locale', 'fx.regex_extract', 'fx.regex_replace' then
      return custom._fx_ext(p_organization_id, v_op, v_vals, coalesce(p_context, '{}'::jsonb));
    else
      raise exception 'The formula language lists % and this evaluator does not work it out.', v_op
        using errcode = '22023', hint = 'That is a defect in custom.formula_eval, not in the formula.';
  end case;
end
$function$;
