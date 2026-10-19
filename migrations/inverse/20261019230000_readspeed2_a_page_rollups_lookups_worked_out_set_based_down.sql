-- target: branch,production
-- lane: READ-SPEED-2
-- lock: custom
-- based-on: custom.rollup_value(uuid, uuid, jsonb) a5b6b4caa7295c5c5d682adadd7c9e77bd879e2607d6d9727e7aea9667b5620a
-- based-on: custom.lookup_value(uuid, uuid, jsonb) 1106eb4028725f69e42a4ebd33f519266021f479b777896558e8c2e4c91edcc4
-- based-on: custom.formula_value(uuid, uuid, jsonb, jsonb) e973d3828045b429629f296ebcd21142c784f1bb7f83fcd91c410321cc1bcf47
-- based-on: custom.rule_field_key(uuid, uuid) 97cf0a7a6d6b6b1b45b76678aceef642f04734a3ddcf2cf5c9e582462e2364f9
-- based-on: custom.rule_context(uuid, uuid) 6ebd332694efae1ed87ca75c486973c7c94fc2a49ecd1983966f748b12332fce
-- based-on: custom._derived_attempt(uuid, uuid, jsonb, jsonb) 20f35391b8b428537674beefa3c03c4a332ed7774883e93cad55670032f70599
-- based-on: custom.read_records_by_ids(uuid, uuid, uuid[], boolean) 78e8ed135bad40b98b27a4b056f6d43e78263630e7e5d7db7b02e31eb8983b30
-- based-on: custom.table_type_field(uuid, uuid) af1551cd85c2b95f5d7cc675e7d184d07bf6dd08b7278b72fcd112cbeddab4ee
-- Inverse of READ-SPEED-2 a: every body back as it was before (per row, no page prefetch, no per-read memo), and the
-- three new helpers dropped once nothing calls them.

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
  v_mk      text;     -- READ-SPEED b
  v_memo    text;
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
    -- READ-SPEED b (2026-10-19): THE FILTER IS COMPILED ONCE PER STATEMENT, NOT ONCE PER ROW. The far table and
    -- the WHERE depend on this organization, this Table, this column's declaration and the reader only, so a page of
    -- 50 rows compiled the same filter 50 times (custom.record_filter_sql: 2.2 s of a 14-row Donors page). The
    -- answer is kept in the statement memo (seat + statement + transaction + generation stamped; a Field or Rule
    -- write clears it). A refusal is never kept: it raises before the put, every time.
    v_mk := 'custom.rollup_where:' || p_organization_id::text || ':' || coalesce(v_table::text, '-') || ':'
            || md5(p_field_data::text);
    v_memo := platform.memo_k_get(v_mk);
    if v_memo is not null then
      v_far := nullif(split_part(v_memo, chr(2), 1), '')::uuid;
      v_where := substr(v_memo, strpos(v_memo, chr(2)) + 1);
    else
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
    perform platform.memo_k_put(v_mk, v_far::text || chr(2) || v_where);
    end if;
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
    -- BUTTON-STAMPS: a SUM of nothing is 0 (a count already was): Notion's $0.00, never a blank. An average, a
    -- minimum or a maximum of nothing is still an absence — there is no number to say.
    return case when v_agg = 'sum' then to_jsonb(0) else null end;
  end if;
  return case v_agg
    when 'sum' then to_jsonb((select sum(x) from unnest(v_nums) x))
    when 'min' then to_jsonb((select min(x) from unnest(v_nums) x))
    when 'max' then to_jsonb((select max(x) from unnest(v_nums) x))
    when 'avg' then to_jsonb((select avg(x) from unnest(v_nums) x))
  end;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.lookup_value(p_organization_id uuid, p_record_id uuid, p_field_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_via   text := p_field_data -> 'config' ->> 'via';
  v_pick  text := p_field_data -> 'config' ->> 'pick';
  v_multi boolean := coalesce((p_field_data ->> 'multi')::boolean, false);
  v_out   jsonb := '[]'::jsonb;
  v_one   jsonb;
  v_t     uuid;
  v_gone  jsonb;
begin
  -- CHAIR-ROLLUP-HONEST: the link it reads through, or the column it borrows, archived — the typed
  -- state naming that column, never an empty that looks like "nothing on the linked record".
  v_gone := custom._derived_source_archived(p_organization_id,
              coalesce(nullif(p_field_data ->> 'entity_definition_id', '')::uuid,
                       (select r.table_id from custom.record r
                         where r.organization_id = p_organization_id and r.id = p_record_id)),
              p_field_data);
  if v_gone is not null then
    return v_gone;
  end if;
  for v_t in select * from custom.relation_targets(p_organization_id, p_record_id, v_via) loop
    if v_t = p_record_id then
      continue;                     -- a record cannot look itself up through itself.
    end if;
    -- THE FAR SIDE, ONE COLUMN OF IT (STORE-TAILS-3). A lookup OF a computed Value, or of
    -- another lookup, still answers through the same precedence the whole-record reader uses —
    -- but only the picked column is worked out, so two tables that point at each other no
    -- longer work each other out whole, round and round, until the stack runs out.
    v_one := custom.far_value(p_organization_id, v_t, v_pick, p_field_data);
    if v_one is not null then
      v_out := v_out || jsonb_build_array(v_one);
    end if;
  end loop;
  if v_multi then
    return v_out;
  end if;
  return case when jsonb_array_length(v_out) = 0 then null else v_out -> 0 end;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.formula_value(p_organization_id uuid, p_record_id uuid, p_field_data jsonb, p_values jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_values jsonb;
  v_who    uuid;
  v_env    jsonb;
  v_born   timestamptz;
  v_rec    custom.record;
  v_rtype  text;
  v_tf     text;
  v_key    text;
  v_keys   text[];
  v_imp    jsonb;
  v_upd    timestamptz;
  v_val    jsonb;
  v_txt    text;
  v_person jsonb;
begin
  -- LANE 10 P4: WHO MADE IT AND WHO LAST CHANGED IT, the way Created time and Last changed time
  -- are filled: from the record's own stamps (custom.record.created_by / updated_by, which
  -- platform._stamp_actor writes from the writing actor), on read, never typed. The value is
  -- {id, name, actor}: the name is the organization's own (custom.history_people, the namer
  -- comments and history use), null for somebody who is not a member of it.
  -- V8 #4: WHO WROTE IS ALSO WHICH KIND OF WRITER. A system or an agent write leaves
  -- custom.record.updated_by naming the person before it; the write's own tier is on its values'
  -- envelopes (`_values.<key>.actor`: user, agent or system, with `on_behalf_of` for an agent).
  -- Last changed by reads the latest envelope; Created by the envelope stamped when the record was
  -- made. A system write answers {id: null, name: null, actor: "system"}; an agent's answers
  -- actor "agent" with the person it wrote for.
  if (p_field_data -> 'config' ->> 'system') in ('created_by', 'modified_by') then
    select case when (p_field_data -> 'config' ->> 'system') = 'created_by' then r.created_by else r.updated_by end,
           r.created_at,
           (select e.value from jsonb_each(case when jsonb_typeof(r.data -> '_values') = 'object' then r.data -> '_values' else '{}'::jsonb end) e
             where jsonb_typeof(e.value) = 'object' and e.value ? 'actor' and e.value ? 'at'
               -- Created by: a value first written (ver 1), the earliest. Last changed by: the latest
               -- write, and of writes in one moment the one with the most versions behind it.
               and ((p_field_data -> 'config' ->> 'system') = 'modified_by' or coalesce(e.value ->> 'ver', '1') = '1')
             order by case when (p_field_data -> 'config' ->> 'system') = 'created_by' then (e.value ->> 'at')::timestamptz end asc,
                      case when (p_field_data -> 'config' ->> 'system') = 'modified_by' then (e.value ->> 'at')::timestamptz end desc,
                      case when (p_field_data -> 'config' ->> 'system') = 'modified_by' then coalesce((e.value ->> 'ver')::numeric, 1) end desc
             limit 1)
      into v_who, v_born, v_env
      from custom.record r
     where r.organization_id = p_organization_id
       and r.id = p_record_id;
    -- NOTION-AUTO: A COLUMN MADE AUTOMATIC KEEPING ITS VALUES (custom.field_make_automatic) set the
    -- imported person aside in `_retired` under this key. Created by answers it for good (a record
    -- is created once); Last changed by answers it until somebody changes the record, then the real
    -- person. The person is a member's or an unmatched guest's Person record, or plain words.
    select e.value, r.updated_at into v_imp, v_upd
      from custom.record r,
           jsonb_array_elements(case when jsonb_typeof(r.data -> '_retired') = 'array' then r.data -> '_retired' else '[]'::jsonb end) with ordinality e(value, ord)
     where r.organization_id = p_organization_id and r.id = p_record_id
       and e.value ->> 'key' = p_field_data ->> 'key'
       and jsonb_typeof(e.value -> 'value') <> 'null'
     order by e.ord desc
     limit 1;
    if v_imp is not null
       and ((p_field_data -> 'config' ->> 'system') = 'created_by'
            or v_upd <= (v_imp ->> 'at')::timestamptz) then
      v_val := v_imp -> 'value';
      if jsonb_typeof(v_val) = 'array' then
        v_val := v_val -> 0;
      end if;
      if jsonb_typeof(v_val) = 'object' then
        v_val := coalesce(v_val -> 'id', v_val -> 'name', v_val -> 'email');
      end if;
      v_txt := v_val #>> '{}';
      if v_txt is not null and v_txt ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        select p.data into v_person from custom.record p
         where p.organization_id = p_organization_id and p.id = v_txt::uuid;
        return jsonb_strip_nulls(jsonb_build_object('id', v_txt, 'actor', 'user', 'imported', true,
          'name', coalesce(v_person ->> 'name', v_person ->> 'full_name', v_person ->> 'email'),
          'email', v_person ->> 'email'));
      elsif v_txt is not null and btrim(v_txt) <> '' then
        return jsonb_build_object('id', null, 'actor', 'user', 'imported', true, 'name', v_txt);
      end if;
    end if;
    -- A Created by envelope counts only when it was stamped as the record was made.
    if (p_field_data -> 'config' ->> 'system') = 'created_by' and v_env is not null
       and abs(extract(epoch from ((v_env ->> 'at')::timestamptz - v_born))) > 5 then
      v_env := null;
    end if;
    if v_env ->> 'actor' = 'system' then
      -- V11 #6: A SYSTEM WRITE NAMES WHO SET IT GOING, when the store knows: the envelope's
      -- on_behalf_of, else — for Created by — the record's own creator stamp (platform._stamp_actor
      -- writes the signed-in person there). Last changed by never borrows updated_by for a system
      -- write: that stamp still names whoever wrote before it.
      v_who := coalesce(nullif(v_env ->> 'on_behalf_of', '')::uuid,
                        case when (p_field_data -> 'config' ->> 'system') = 'created_by' then v_who end);
      return jsonb_build_object('id', v_who, 'actor', 'system',
                                'name', case when v_who is not null then custom.history_people(p_organization_id, array[v_who]) -> v_who::text -> 'name' end);
    end if;
    if v_env ->> 'actor' = 'agent' then
      v_who := coalesce(nullif(v_env ->> 'on_behalf_of', '')::uuid, v_who);
      return jsonb_build_object('id', v_who, 'actor', 'agent',
                                'name', case when v_who is not null then custom.history_people(p_organization_id, array[v_who]) -> v_who::text -> 'name' end);
    end if;
    if v_who is null then
      return 'null'::jsonb;
    end if;
    return jsonb_build_object('id', v_who, 'actor', 'user',
                              'name', custom.history_people(p_organization_id, array[v_who]) -> v_who::text -> 'name');
  end if;
  v_values := coalesce(p_values, custom.record_values(p_organization_id, p_record_id));
  -- REC-15's evaluator, not a second one: every Rule node, every refusal and REC-17's
  -- "by id, never by name" still come from custom.rule_eval, which custom.formula_eval hands
  -- them to unchanged. GRID-PRIMITIVES G3 adds the formula language's own `fx.*` nodes, and
  -- the three facts only a formula about ITS OWN record can use (its id, its column, its table:
  -- autonumber and the created / modified stamps). They ride under fx_* keys so no Rule node
  -- that reads the context (stage_count, sibling_count read `table_id`) answers differently.
  --
  -- CHAIR-MATH (a): A WORKED-OUT COLUMN THIS FORMULA READS IS WORKED OUT FIRST. The values a
  -- caller hands in are the stored row, the Rule layer's block and what was stamped at write
  -- time; a roll-up, a lookup or another read-time formula is none of those, so its key is
  -- absent and the evaluator read it as blank (0). Each such key is resolved here through
  -- custom.far_value — the one reader that refuses a circle by sentence instead of recursing —
  -- and only when it is absent, so a caller that already worked it out (custom.derived_values_of
  -- in dependency order) pays nothing more.
  if p_values is not null and p_record_id is not null then
    v_keys := custom.formula_field_keys(p_organization_id, p_field_data -> 'config' -> 'expr');
    if cardinality(v_keys) > 0 then
      select * into v_rec from custom.record
       where organization_id = p_organization_id and id = p_record_id;
      if v_rec.id is not null and v_rec.table_id is not null
         and v_rec.data_class not in ('kernel', 'relation') then
        v_tf := custom.table_type_field(v_rec.organization_id, v_rec.table_id);
        if v_tf is not null then
          v_rtype := v_rec.data ->> v_tf;
        end if;
        for v_key in
          select a.data ->> 'key'
            from custom.applicable_fields(v_rec.organization_id, v_rec.table_id, v_rtype) a
           where (a.data ->> 'key') = any (v_keys)
             and (a.data ->> 'key') is distinct from (p_field_data ->> 'key')
             and custom.parity_type(a.data) in ('lookup', 'rollup', 'formula')
             and coalesce(a.data ->> 'compute_on', '') = 'read'
             and not (v_values ? (a.data ->> 'key'))
        loop
          v_values := v_values || jsonb_build_object(v_key,
                        custom.far_value(p_organization_id, p_record_id, v_key, p_field_data));
        end loop;
      end if;
    end if;
  end if;

  return custom.formula_eval(p_organization_id, p_field_data -> 'config' -> 'expr',
                             v_values,
                             coalesce(custom.rule_context(p_organization_id, p_record_id), '{}'::jsonb)
                             || jsonb_build_object('fx_self_id', p_record_id,
                                                   'fx_field_key', p_field_data ->> 'key',
                                                   'fx_table_id', p_field_data ->> 'entity_definition_id'));
end;
$function$;

CREATE OR REPLACE FUNCTION custom.rule_field_key(p_organization_id uuid, p_field_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
#variable_conflict use_column
begin
  -- WRITE-PERF-2, LADDER-PERF's class on the rest of the write path. Everything between
  -- `begin` and `end` is this function's own SQL body, character for character; only the
  -- language moved, so its plan is cached for the session instead of being rebuilt on
  -- every single call.
  return (
  select f.data ->> 'key'
    from custom.record f
   where f.organization_id = p_organization_id
     and f.id = p_field_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null
  );
end
$function$;

CREATE OR REPLACE FUNCTION custom.rule_context(p_organization_id uuid, p_record_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
#variable_conflict use_column
begin
  -- WRITE-PERF-2, LADDER-PERF's class on the rest of the write path. Everything between
  -- `begin` and `end` is this function's own SQL body, character for character; only the
  -- language moved, so its plan is cached for the session instead of being rebuilt on
  -- every single call.
  return (
  -- ONE parent, read through W1-TABLE's own REC-7 reader, and NOTHING RECURSIVE. This body
  -- is the whole of REC-16's ceiling: an evaluator cannot reach a grandparent because the
  -- map it reads has one parent in it and no way to ask for another.
  select jsonb_build_object(
           'record_id',     r.id,
           'parent_id',     to_jsonb(custom.containment_parent(r.data)),
           'parent_values', coalesce(custom.record_values(p_organization_id,
                                       custom.containment_parent(r.data)), 'null'::jsonb))
    from custom.record r
   where r.organization_id = p_organization_id
     and r.id = p_record_id
     and r.deleted_at is null
  );
end
$function$;

CREATE OR REPLACE FUNCTION custom._derived_attempt(p_organization_id uuid, p_record_id uuid, p_field_data jsonb, p_values jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
-- CHAIR-SHEET-STORE (a): ONE worked-out column of one record, and WHY when it cannot be worked out.
--   {"v": <value>}                  worked out (the key is absent when the answer is SQL NULL)
--   {"e": "<plain-English reason>"} not worked out; the column is empty on this read
-- custom.derived_value is `-> 'v'` of this, exactly as it answered before; the read doors
-- (custom.record_values_step) also keep `-> 'e'` in the record's `_errors`.
declare
  v_parity text := custom.parity_type(p_field_data);
  v_value  jsonb;
  v_what   text;
  v_says   text;
begin
  v_value := case v_parity
    when 'lookup'  then custom.lookup_value(p_organization_id, p_record_id, p_field_data)
    when 'rollup'  then custom.rollup_value(p_organization_id, p_record_id, p_field_data)
    when 'formula' then custom.formula_value(p_organization_id, p_record_id, p_field_data, p_values)
    else null
  end;
  return case when v_value is null then '{}'::jsonb else jsonb_build_object('v', v_value) end;
exception
  -- 🚨 NEVER SWALLOWED: a refusal is an answer about ACCESS and belongs to the caller, and a
  -- cancelled or timed-out read has established nothing about this column at all. Both
  -- re-raise exactly as they arrived.
  when insufficient_privilege or query_canceled then
    raise;
  when others then
    raise warning 'custom.derived_value: the % column "%" (key %) could not be worked out for record %: % (%). The column is empty on this read; every other column and the record itself are unaffected. REMEDY: fix the Field''s own definition - REC-17 says a formula, a lookup and a rollup point at a Field by ID and never by name.',
      coalesce(v_parity, 'worked-out'),
      coalesce(p_field_data ->> 'label', p_field_data ->> 'key', '(unnamed)'),
      coalesce(p_field_data ->> 'key', '(no key)'),
      p_record_id, sqlerrm, sqlstate;
    v_what := case v_parity when 'lookup' then 'lookup' when 'rollup' then 'roll-up' else 'formula' end;
    -- The store's own refusals are already sentences ("This formula divides by zero.", a circle
    -- named by custom.far_value): they are kept word for word. Postgres's own words are not, so
    -- the common ones are said plainly and anything else keeps its words behind a plain lead-in.
    v_says := case
      when sqlerrm ~ '^[A-Z`"]' and sqlerrm ~ '[.!?]$' then sqlerrm
      when sqlstate = '22012' then format('This %s divides by zero.', v_what)
      when sqlstate = '22003' then format('This %s''s answer is too large to keep.', v_what)
      when sqlstate in ('22P02', '22007', '22008') then
        format('This %s reads a value that is not a number or a date where it needs one.', v_what)
      when sqlstate = '54001' then format('This %s reads itself in a circle.', v_what)
      else format('This %s could not be worked out: %s.', v_what, rtrim(sqlerrm, '.'))
    end;
    return jsonb_build_object('e', v_says);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.read_records_by_ids(p_organization_id uuid, p_table_id uuid, p_record_ids uuid[], p_by_id boolean DEFAULT false)
 RETURNS TABLE(id uuid, document jsonb, level permission_level)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_me       uuid := auth.uid();
  v_rec      record;
  v_set      record;
  v_mask     jsonb;
  v_visible  text[];
  v_declared text[];
  v_rv       text[];
  v_reveals  jsonb;    -- ACCESS-SETUP §12.1: the Table setup's row-scoped read cells for this reader, asked once per call   -- ACCESS-SETUP §12.1: this row's visible keys (row-scoped parts revealed)
  v_n        integer := coalesce(cardinality(p_record_ids), 0);
  v_rows     custom.record[];
  v_row      custom.record;
  v_levels   jsonb;
  v_cache    jsonb := '{}'::jsonb;
  v_vs       record;
  v_cr       jsonb;
  v_world_def boolean := false;
  v_seen     uuid[];  -- PERF-FIX-5
  v_mask_ready boolean := false;  -- HOT-DOORS-2
  v_mask_lvl   text;
begin
  if v_me is null then
    raise exception 'Nobody is signed in, so there is nothing to read.'
      using errcode = '42501',
            hint = 'DOOR-1: the read door resolves the reader from the session and takes no principal argument. Sign in, or call it from a lane that carries a person.';
  end if;
  -- CHAIR-WORLD-LANE-2: the wall first (as custom.assert_may_know_table asks it), then — for a person it admitted
  -- ONLY through the world lane — the one other way through: every row asked for is a definition row of a Public
  -- Table of this organization (the Table record itself, one of its Fields, or a choice of one of its Fields).
  -- Anything else, and every other person, meets custom.assert_may_know_table exactly as before.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.read_records_by_ids');
  v_world_def := custom.world_reader_reads_public_definition(p_organization_id, p_table_id, p_record_ids);
  if not v_world_def then
    perform custom.assert_may_know_table(p_organization_id, p_table_id, 'custom.read_records_by_ids');
  end if;

  -- NOTHING ASKED FOR IS NOT AN ERROR — it is an empty answer, and it costs nothing.
  if v_n = 0 then
    return;
  end if;

  -- THE SAME CEILING THE PAGE DOORS DECLARE, and it refuses above it by name rather than
  -- handing back a short list the caller cannot tell from a complete one.
  perform custom.page_size(p_organization_id, 'custom.read_records_by_ids', v_n, 200);

  -- STEP 1, ONCE: THE ONE LADDER decides WHICH rows. Identical call, identical arguments to
  -- the page door's. This is the question that must never be asked twice in two ways.
  -- PERF-FIX-5 (2026-10-08). A READ OF N IDS ASKS ABOUT THOSE N ROWS, NOT ABOUT THE WHOLE TABLE. On the Table kernel
  -- (the Table's own row, which every table page reads) custom.visible_set answers by walking the one ladder over EVERY live
  -- Table of the organization, to return one. Its kernel branch hands back nothing but "every Table is seen" or the seen list
  -- (no class, no granted answer), so the rows asked for are visible when she created them or when custom.tables_seen_among
  -- - the very walk the set builds its list from, here for these ids only, asked through iam.has_access_for_many first -
  -- sees them. Only where visible_set does not stop (an archived organization, a registered FK containment parent for record)
  -- and for a person admitted through the world lane; everything else, every other Table, asks visible_set as before.
  -- mx.read_by_ids_set = off: the whole set, as before (the proofs compare both on one snapshot).
  if p_table_id = custom.table_kernel_id()
     and not v_world_def
     and coalesce(current_setting('mx.read_by_ids_set', true), '') <> 'off'
     and not exists (select 1 from platform.entity_relationships er
                      where er.child_type = 'record' and er.kind in ('composition', 'containment'))
     and not exists (select 1 from iam.organizations o
                      where o.id = p_organization_id and o.archived_at is not null) then
    select coalesce(array_agg(g.id), '{}'::uuid[]) into v_seen
      from custom.tables_seen_among(v_me, array[p_organization_id], p_record_ids) g
     where g.seen and g.organization_id = p_organization_id;
    select false as o_all_visible, '{}'::platform.visibility[] as o_true_visibility, '{}'::uuid[] as o_granted_all,
           '{}'::uuid[] as o_granted_visible, v_seen as o_carried_visible, 0 as o_ladder_calls,
           false as o_fallback, null::text as o_note
      into v_set;
  else
    v_set := custom.visible_set(v_me, p_organization_id, p_table_id, 'viewer'::public.permission_level);
  end if;

  if v_set.o_fallback then
    raise notice '%', v_set.o_note;
  end if;

  -- STORE-READ-PERF-2: the rows first, in the door's own order, so the ladder can be asked about
  -- the whole set at once (custom.levels_of) instead of once per row inside custom.read_mask.
  select coalesce(array_agg(r order by r.created_at desc, r.id), '{}'::custom.record[]) into v_rows
      from custom.record r
     where r.organization_id = p_organization_id
       and r.table_id = p_table_id
       and r.deleted_at is null
       and r.id = any (p_record_ids)
       and ( case
               -- CHAIR-WORLD-LANE-2: definition rows of a Public Table, every one checked above, read at viewer.
               when v_world_def then
                 true
               -- The ladder could not answer in a bounded way, so each row is asked directly —
               -- `read_records`' fallback arm, and the same single call.
               when v_set.o_fallback then
                 custom.has_visibility(v_me, 'record', custom.record_org_hint(r.id, r.organization_id), 'viewer')
               -- Every live row of this Table is hers.
               when v_set.o_all_visible then
                 true
               -- A class she holds, WITH EXCEPTIONS: a granted id is never answered by its
               -- class (VIS-19), and containment only ever adds (VIS-6).
               when coalesce(array_length(v_set.o_true_visibility, 1), 0) > 0 then
                 ( r.created_by = v_me
                   or (r.visibility = any (v_set.o_true_visibility)
                       and not (r.id = any (v_set.o_granted_all)))
                   or r.id = any (v_set.o_granted_visible)
                   or r.id = any (v_set.o_carried_visible) )
               -- Nothing by class — `shared_only`, or a Table nobody shared with her.
               else
                 ( r.created_by = v_me
                   or r.id = any (v_set.o_granted_visible)
                   or r.id = any (v_set.o_carried_visible) )
             end )
  ;
  -- HOT-DOORS-3 (2026-10-08): every row here is a row of p_organization_id, so the levels are read in it
  -- (custom.levels_of, handed the organization in the statement memo: same answers, one partition). mx.read_page_set = off: as before.
  if coalesce(current_setting('mx.read_page_set', true), '') = 'off' then
    v_levels := custom.levels_of(v_me, (select array_agg(x.id) from unnest(v_rows) x));
  else
    perform platform.memo_k_put('custom.levels_of_org', p_organization_id::text);
    v_levels := custom.levels_of(v_me, (select array_agg(x.id) from unnest(v_rows) x));
    perform platform.memo_k_put('custom.levels_of_org', '');
  end if;

  foreach v_row in array v_rows
  loop
    select * into v_vs from custom.record_values_step(v_row, v_cache);
    v_cache := v_vs.o_cache;
    if v_cr is null then
      v_cr := custom.choice_render_plan(p_organization_id, p_table_id);
    end if;
    -- STEP 2, PER ROW: THE ONE MASK decides which FIELDS of it she may see, at the level she
    -- holds ON THIS RECORD. The same call `custom.read_record` makes for its one row.
    -- The row is in p_organization_id and p_table_id (the query above says so), which is the
    -- organization and Table custom.read_mask took the mask in; the rung is the set's answer.
    -- HOT-DOORS-2 (2026-10-08): THE FIELD QUESTION ONCE PER LEVEL, NOT ONCE PER ROW. The mask depends on the
    -- table, the reader and the level only; a page of 50 rows at one level asked it 50 times (0.6 ms each,
    -- 29 ms of a page). The rows are the same; a row at another level asks again.
    if not v_mask_ready
       or v_mask_lvl is distinct from (case when v_world_def then 'viewer' else (v_levels -> v_row.id::text ->> 'l') end) then
      v_mask_lvl := case when v_world_def then 'viewer' else (v_levels -> v_row.id::text ->> 'l') end;
      v_mask := custom.read_mask_for(v_me, p_organization_id, p_table_id,
                                     case when v_world_def then 'viewer'::public.permission_level
                                          else (v_levels -> v_row.id::text ->> 'l')::public.permission_level end, 'read');
      -- DOOR-N-5: id-keyed on request means EVERY declared Field's key, as the page doors do.
      select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_visible
        from jsonb_array_elements(v_mask -> 'visible') x;
      select coalesce(array_agg(x #>> '{}'), '{}'::text[]) into v_declared
        from jsonb_array_elements(v_mask -> 'declared') x;
      v_mask_ready := true;
    end if;

    id := v_row.id;
    if v_reveals is null then v_reveals := custom._store_row_reveals(v_me, p_table_id); end if;
    v_rv := case when jsonb_array_length(v_reveals) = 0 then v_visible
                 else custom.store_row_visible_with(v_reveals, v_me, v_row, v_visible) end;
    document := custom.choice_render_with(p_organization_id, p_table_id,
                  custom.mask_document(v_vs.o_doc, v_rv, v_mask -> 'notices', p_by_id,
                                       v_mask -> 'all_key_ids', v_declared), v_cr);
    -- BIG-VALUES-READERS: a value kept as a file carries its pointer, so every reader finds it.
    document := custom.with_whole_value_pointers(document, v_row.data -> '_values', v_row.data -> '_sources', v_rv, p_by_id, v_mask -> 'all_key_ids');
    -- CHAIR-RETIRED-VALUES: the values a tightened rule set aside, masked like the value they were.
    document := custom.with_retired(document, v_row.data -> '_retired', v_rv, v_declared);
    level := (v_mask ->> 'level')::public.permission_level;
    return next;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.table_type_field(p_organization_id uuid, p_table_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_answer text;
  v_key    text;
  v_hit    text;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_type_field');
  perform custom.assert_may_know_table(p_organization_id, p_table_id, 'custom.table_type_field');

  -- `to_jsonb`/`#>> '{}'` and not the bare text, so a Table that HAS no type field — a null
  -- answer, which is the common one — is a hit rather than a miss forever.
  v_key := 'tf:' || coalesce(p_organization_id::text, '-') || ':' || coalesce(p_table_id::text, '-');
  v_hit := platform.memo_k_get(v_key);
  if v_hit is not null then
    return v_hit::jsonb #>> '{}';
  end if;

  select t.data ->> 'type_field' into v_answer
    from custom.record t
   where t.organization_id = p_organization_id
     and t.id = p_table_id
     and t.table_id = custom.table_kernel_id()
     and t.deleted_at is null;
  perform platform.memo_k_put(v_key, coalesce(to_jsonb(v_answer), 'null'::jsonb)::text);
  return v_answer;
end;
$function$;

drop function if exists custom._page_derived_prefetch(uuid, uuid, uuid[]);
drop function if exists custom._far_values(uuid, uuid[], text, jsonb);
drop function if exists custom._rollup_agg(text, integer, jsonb[], numeric[]);
