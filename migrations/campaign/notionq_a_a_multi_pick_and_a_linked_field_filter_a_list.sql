-- target: branch,production
-- additive: yes
--   ADDS three invoker functions (custom.filter_list_op, custom.choice_words_normalize, custom.filter_list_op_words; none
--   granted, none a door) and REPLACES four bodies: custom.rule_sql_op (a list compared with a word is "contains"),
--   custom.rule_node_kinds (eight filter-only nodes), custom.rule_filter_node_sql (compiles them) and the three-argument
--   custom.record_filter_sql (list questions on a column; any / every / none of the linked records). No table, trigger,
--   policy, index, grant or stored row changes; no new client-callable door. Inverse:
--   migrations/inverse/notionq_a_a_multi_pick_and_a_linked_field_filter_a_list_down.sql.
-- guard: custom/system_enabled
-- lock: custom
-- lane: NOTION-Q
-- based-on: custom.rule_sql_op(text, jsonb, jsonb) 906375b3042775283f568159374b350dca5339d9a3fee22a5779ae513a4a2b4a
-- based-on: custom.rule_node_kinds() f65eb3465d320339da3225fe9fc54eff9f7f0687b8576e99dc19e47c6e335b7d
-- based-on: custom.rule_filter_node_sql(uuid, uuid, jsonb, jsonb, text[]) 0a543631b7aea9017b9d6413df1ef8565e0fa908421224f5a7f6890b30480667
-- based-on: custom.record_filter_sql(uuid, uuid, jsonb) ee10ab961b666737c7078469f67a287b2a180531ac904144b8b2786357d5a1b9
--
-- NOTION-Q (2026-10-14). A MULTI-PICK FIELD FILTERS, AND A LIST FILTERS BY A LINKED TABLE'S FIELD.
-- A migrating agent reported (1) "filtering on multi-pick fields returns nothing" and (7) "you can't list posts
-- filtered by a linked table's field". ROOT CAUSES. (1) a multi-select / relation cell is an ARRAY; the flat filter
-- compared the array's text with one word, and the Rule compiler compared jsonb array = jsonb string, never equal.
-- ROW-PAGE-VIEWS had fixed only relation columns, only in the flat filter. (7) the flat filter's relation.field key
-- meant "some linked record has exactly this value": no "is not", no every / none, and a Rule expression had no way
-- to reach across a relation at all.

-- 1. THE ONE READING OF A LIST-VALUED CELL, written once and called by both the flat filter and the Rule compiler.
CREATE FUNCTION custom.filter_list_op(p_op text, p_a jsonb, p_b jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_a   text[];
  v_b   text[];
  v_res boolean;
begin
  -- NOTION-Q (2026-10-14): A CELL IS A LIST OF WORDS, WHATEVER IT HOLDS. A multi-select keeps an array of
  -- choice keys, a relation an array of record ids, a select or text ONE value, an empty cell nothing. Every
  -- list question (Notion: contains / does not contain / is empty / is not empty; Airtable: has any of /
  -- has all of / has none of / is exactly) is asked of that list of lower-cased words, so "Platforms
  -- contains Instagram" is true of ["Instagram","TikTok"] — it used to compare the whole list's text with
  -- one word and match no row. The answer is always true or false, never "undecided": an empty cell does
  -- not contain anything and IS empty.
  v_a := case coalesce(jsonb_typeof(p_a), 'null')
    when 'array' then coalesce((select array_agg(lower(btrim(e #>> '{}'))) from jsonb_array_elements(p_a) e
                                 where jsonb_typeof(e) <> 'null' and btrim(e #>> '{}') <> ''), '{}'::text[])
    when 'null' then '{}'::text[]
    when 'string' then case when btrim(p_a #>> '{}') = '' then '{}'::text[] else array[lower(btrim(p_a #>> '{}'))] end
    else array[lower(p_a #>> '{}')] end;
  v_b := case coalesce(jsonb_typeof(p_b), 'null')
    when 'array' then coalesce((select array_agg(lower(btrim(e #>> '{}'))) from jsonb_array_elements(p_b) e
                                 where jsonb_typeof(e) <> 'null'), '{}'::text[])
    when 'null' then '{}'::text[]
    else array[lower(btrim(p_b #>> '{}'))] end;

  if p_op = 'is_empty' then
    v_res := cardinality(v_a) = 0;
  elsif p_op = 'is_not_empty' then
    v_res := cardinality(v_a) > 0;
  elsif p_op in ('contains', 'not_contains') then
    -- One word in text is a substring (Notion's text "contains"); one word in a list is membership; several
    -- words are "any of them".
    if jsonb_typeof(p_a) = 'string' and jsonb_typeof(p_b) = 'string' then
      v_res := cardinality(v_b) > 0 and position(v_b[1] in lower(p_a #>> '{}')) > 0;
    else
      v_res := v_a && v_b;
    end if;
    if p_op = 'not_contains' then v_res := not v_res; end if;
  elsif p_op in ('has_any', 'any_of') then
    v_res := v_a && v_b;
  elsif p_op = 'has_all' then
    v_res := v_a @> v_b;
  elsif p_op in ('has_none', 'is_not') then
    v_res := not (v_a && v_b);
  elsif p_op = 'is_exactly' then
    v_res := v_a @> v_b and v_b @> v_a;
  else
    raise exception 'a list filter does not know how to "%"', p_op
      using errcode = '22023',
            hint = 'NOTION-Q: contains, not_contains, has_any, has_all, has_none, is_exactly, is_empty, is_not_empty.';
  end if;
  return to_jsonb(v_res);
end;
$function$;

-- The words a person typed for a choice column, as the choice KEYS the cells store (a label, a key or an option id —
-- a list of them or one). A word that names no choice stays as typed, so a filter that matches nothing says so.
CREATE FUNCTION custom.choice_words_normalize(p_field jsonb, p_const jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select case coalesce(jsonb_typeof(p_const), 'null')
    when 'array' then coalesce((select jsonb_agg(case when jsonb_typeof(e) = 'string'
                                                       and custom.choice_key_of(p_field, e #>> '{}') is not null
                                                      then to_jsonb(custom.choice_key_of(p_field, e #>> '{}')) else e end)
                                   from jsonb_array_elements(p_const) e), '[]'::jsonb)
    when 'string' then case when custom.choice_key_of(p_field, p_const #>> '{}') is not null
                            then to_jsonb(custom.choice_key_of(p_field, p_const #>> '{}')) else p_const end
    else p_const end;
$function$;

-- The operator words a flat filter's value may carry: {"Platforms": {"has_any": ["Instagram", "TikTok"]}}.
CREATE FUNCTION custom.filter_list_op_words()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select array['contains', 'not_contains', 'has_any', 'has_all', 'has_none', 'is_exactly', 'is_empty', 'is_not_empty', 'is_not', 'any_of'];
$function$;

-- 2. Rule nodes: a list column compared with a word.
CREATE OR REPLACE FUNCTION custom.rule_sql_op(p_op text, p_a jsonb, p_b jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
begin
  if p_op = 'present' then
    -- NOTION-Q: a list with nothing in it has not been answered (a multi-select with no choice, a relation with no link).
    return to_jsonb(p_a is not null and jsonb_typeof(p_a) <> 'null'
                    and not (jsonb_typeof(p_a) = 'array' and jsonb_array_length(p_a) = 0));
  elsif p_op = 'length' then
    if p_a is null or jsonb_typeof(p_a) = 'null' then return 'null'::jsonb; end if;
    if jsonb_typeof(p_a) <> 'string' then
      raise exception 'this rule measures how long something is, and it was given a %', jsonb_typeof(p_a)
        using errcode = '22023', hint = 'REC-15: length takes words.';
    end if;
    return to_jsonb(length(p_a #>> '{}'));
  end if;

  if p_a is null or jsonb_typeof(p_a) = 'null' or p_b is null or jsonb_typeof(p_b) = 'null' then
    return 'null'::jsonb;
  end if;

  -- NOTION-Q (2026-10-14): A LIST IS NEVER EQUAL TO A WORD, SO "IS" ON A LIST COLUMN IS "CONTAINS". A multi-select
  -- (or a relation) holds an array; `Platforms is Instagram` compared the whole array with the string and matched
  -- no row. A list against a word asks whether the list holds it; a list against a list asks whether they hold the
  -- same members (Airtable's "is exactly"); `ne` is the opposite of either.
  if p_op in ('eq', 'ne') and (jsonb_typeof(p_a) = 'array' or jsonb_typeof(p_b) = 'array') then
    if (case when jsonb_typeof(p_a) = 'array' and jsonb_typeof(p_b) = 'array'
             then custom.filter_list_op('is_exactly', p_a, p_b)
             else custom.filter_list_op('contains', p_a, p_b) end) = 'true'::jsonb then
      return to_jsonb(p_op = 'eq');
    end if;
    return to_jsonb(p_op = 'ne');
  end if;

  if p_op = 'eq' then
    return to_jsonb(p_a = p_b);
  elsif p_op = 'ne' then
    return to_jsonb(p_a <> p_b);
  elsif p_op = 'matches' then
    -- NOTION-Q: words searched in a list column are searched in each of its entries (the grid header's text filter on a
    -- multi-select used to be refused as "checks how words are written, and it was given a array").
    if jsonb_typeof(p_a) = 'array' and jsonb_typeof(p_b) = 'string' then
      return to_jsonb(exists (select 1 from jsonb_array_elements_text(p_a) e where e ~ (p_b #>> '{}')));
    end if;
    if jsonb_typeof(p_a) <> 'string' or jsonb_typeof(p_b) <> 'string' then
      raise exception 'this rule checks how words are written, and it was given a % and a %',
                      jsonb_typeof(p_a), jsonb_typeof(p_b)
        using errcode = '22023', hint = 'REC-15: matches takes words and a pattern.';
    end if;
    return to_jsonb((p_a #>> '{}') ~ (p_b #>> '{}'));
  end if;

  if jsonb_typeof(p_a) <> 'number' or jsonb_typeof(p_b) <> 'number' then
    raise exception 'this rule compares numbers, and it was given a % and a %',
                    jsonb_typeof(p_a), jsonb_typeof(p_b)
      using errcode = '22023',
            hint = format('REC-15: %s works on numbers. Nothing is converted for you, because a converted comparison answers about a different value.', p_op);
  end if;

  if p_op = 'lt'  then return to_jsonb((p_a #>> '{}')::numeric <  (p_b #>> '{}')::numeric);
  elsif p_op = 'lte' then return to_jsonb((p_a #>> '{}')::numeric <= (p_b #>> '{}')::numeric);
  elsif p_op = 'gt'  then return to_jsonb((p_a #>> '{}')::numeric >  (p_b #>> '{}')::numeric);
  elsif p_op = 'gte' then return to_jsonb((p_a #>> '{}')::numeric >= (p_b #>> '{}')::numeric);
  elsif p_op = 'add' then return to_jsonb((p_a #>> '{}')::numeric +  (p_b #>> '{}')::numeric);
  elsif p_op = 'sub' then return to_jsonb((p_a #>> '{}')::numeric -  (p_b #>> '{}')::numeric);
  elsif p_op = 'mul' then return to_jsonb((p_a #>> '{}')::numeric *  (p_b #>> '{}')::numeric);
  elsif p_op = 'div' then
    if (p_b #>> '{}')::numeric = 0 then
      raise exception 'this rule divides by nothing'
        using errcode = '22012', hint = 'REC-15: div. The rule needs a different test, not a different number.';
    end if;
    return to_jsonb((p_a #>> '{}')::numeric / (p_b #>> '{}')::numeric);
  end if;

  raise exception 'this rule asks the system to %, and a filter does not know how', p_op
    using errcode = '22023',
          hint = 'custom.rule_filter_node_sql hands this function only the comparison, arithmetic and word nodes. Reaching here is a defect in that compiler, not in the rule.';
end;
$function$;

-- 3. The closed list of nodes.
CREATE OR REPLACE FUNCTION custom.rule_node_kinds()
 RETURNS TABLE(node text, evaluated_by text, note text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select * from (values
    ('const',         'W1-RULE',        'a literal JSON value'),
    ('field',         'W1-RULE',        'REC-17: the record''s own Value for the Field with this ID'),
    ('parent_field',  'W1-RULE-APPLY',  'REC-16: the PARENT''s Value for the Field with this ID, ONE level up and no further — a second level is refused by name, at save time and at evaluation'),
    ('merge_field',   'W5-MERGE-B',     'DYN-4: the answer a merge field resolves to, by ID — storable today so a Rule and a merge field can be seen to depend on each other, and refused by name at evaluation until W5-MERGE-B lands it'),
    ('previous',      'PIPELINES',      'the Value this record HELD for the Field with this ID before this write — absent on an insert, which leaves the leaf undecided rather than false'),
    ('actor_at_least','PIPELINES',      'whether the person making this write holds at least the named level on this record — a rung of the one ladder, asked as a question rather than compared as a word'),
    ('stage_count',   'PIPELINES',      'how many live records of this Table are already in the named stage, not counting the one being written — what a work-in-progress limit counts'),
    ('sibling_count', 'STAGE-RULES',    'how many OTHER live records of this record''s own Table match it on every Field named in `same` and answer differently on every Field named in `differs` — the cross-record question "is there a second quote from a different contractor", asked about records rather than about quotes'),
    ('eq',            'W1-RULE',        'two answers are the same'),
    ('ne',            'W1-RULE',        'two answers differ'),
    ('lt',            'W1-RULE',        'less than, numbers only'),
    ('lte',           'W1-RULE',        'at most, numbers only'),
    ('gt',            'W1-RULE',        'greater than, numbers only'),
    ('gte',           'W1-RULE',        'at least, numbers only'),
    ('and',           'W1-RULE',        'every argument is true'),
    ('or',            'W1-RULE',        'some argument is true'),
    ('not',           'W1-RULE',        'the opposite'),
    ('add',           'W1-RULE',        'a sum'),
    ('sub',           'W1-RULE',        'a difference'),
    ('mul',           'W1-RULE',        'a product'),
    ('div',           'W1-RULE',        'a quotient; dividing by nothing is refused by name'),
    ('concat',        'W1-RULE',        'words joined'),
    ('length',        'W1-RULE',        'how long the words are'),
    ('present',       'W1-RULE',        'there is an answer at all'),
    ('matches',       'W1-RULE',        'the words are written the expected way'),
    ('within',        'CHAIR-FILTER',   'a list filter only: the Field''s date or moment falls in the half-open window {"from","to"} (from included, to not) — args [{"field"}, {"const": {"from","to"}}]; several days are an `or` of these, Exclude is a `not`'),
    ('contains',      'NOTION-Q',       'a list filter only: a list column holds the word (a multi-select option, a linked record), or text holds it as a substring — args [{"field"}, {"const": word}]'),
    ('not_contains',  'NOTION-Q',       'a list filter only: the opposite of contains; an empty cell does not contain anything, so it counts'),
    ('has_any',       'NOTION-Q',       'a list filter only: the list holds at least one of the words — args [{"field"}, {"const": [words]}]'),
    ('has_all',       'NOTION-Q',       'a list filter only: the list holds every one of the words'),
    ('has_none',      'NOTION-Q',       'a list filter only: the list holds none of the words'),
    ('is_exactly',    'NOTION-Q',       'a list filter only: the list holds exactly these words, in any order'),
    ('is_empty',      'NOTION-Q',       'a list filter only: the cell holds nothing (no choice, no linked record, no text) — args [{"field"}]; "is not empty" is a `not` of it'),
    ('is_not_empty',  'NOTION-Q',       'a list filter only: the cell holds something — args [{"field"}]'),
    ('linked',        'NOTION-Q',       'a list filter only: a condition on the records a RELATION column points at — {"op": "linked", "match": "any" | "every" | "none", "args": [{"field": "<relation field id>"}, <a condition written with the field ids of the table it points at>]}; any = at least one linked record meets it, every = all of them (a row with no links passes), none = none of them')
  ) as t(node, evaluated_by, note)
  -- GRID-PRIMITIVES G6: the formula language's nodes, worked out by custom.formula_eval, which
  -- custom.rule_eval hands them to. One list, read from where it is kept.
  union all
  select k.node, 'GRID-PRIMITIVES G3 (custom.formula_eval)', k.signature || ' — ' || k.says
    from custom.formula_node_kinds() k;
$function$;

-- 4. The Rule compiler.
CREATE OR REPLACE FUNCTION custom.rule_filter_node_sql(p_organization_id uuid, p_table_id uuid, p_node jsonb, p_map jsonb, p_visible text[])
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_op    text;
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
    select f.data ->> 'key', f.data -> 'config' ->> 'kind' into v_key, v_kind
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
    return format('(case when (%1$s) is null then ''null''::jsonb when %2$s then ''true''::jsonb else ''false''::jsonb end)',
                  custom.dashboard_moment_sql(v_key),
                  custom.dashboard_window_sql(v_key, custom.relative_window_for_reader(v_b -> 'const', p_organization_id,
                                                                             v_key in ('created_at', 'updated_at') or v_kind = 'datetime')));
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

-- 5. The flat filter.
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
