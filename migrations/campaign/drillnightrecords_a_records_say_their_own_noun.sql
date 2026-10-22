-- lane DRILL-NIGHT-RECORDS (2026-10-22): the records a definition declares carry their own noun.
-- platform._drill_resolve passes records.noun through drill_describe, so "See these records" over an
-- hourly summary reads "executions" / "log lines", never the summary grain's "hours" (live defect 7).
-- based-on: platform._drill_resolve(uuid, text) 38b622b788c95ba71d1507cc0936c4bed41b2eed434cebbbf745fe065031e8d2
CREATE OR REPLACE FUNCTION platform._drill_resolve(p_organization_id uuid, p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  c_grains constant jsonb := '["year","quarter","month","week","day"]';
  v_decl   jsonb;
  v_prob   text[];
  v_et     record;
  v_fact   text;
  v_dims   jsonb := '[]';
  v_meas   jsonb := '[]';
  v_paths  jsonb := '[]';
  v_cols   jsonb := '{}';
  v_joins  jsonb := '[]';
  v_alias  jsonb;
  v_lanes  jsonb;
  v_lcols  jsonb := '{}';
  v_pk     text[];
  a        record;
  v_col    jsonb;
  v_fk     jsonb;
  v_label  text;
  v_nd     numeric;
  v_max    integer;
  v_vals   jsonb;
  v_first_choice text;
  v_first_time   text;
  v_first_sum    text;
  v_detail jsonb := '[]';
  j        jsonb;
  d        jsonb;
  v_from   text;
  v_a      text;
  v_c      text;
  v_def    jsonb;
  v_mode   text := 'invoker';
  v_hide   jsonb;
  v_rls    boolean;
  v_nostats text[] := '{}';
  v_rec    record;
  v_rcols  jsonb;
  v_rpk    text[];
  v_rx     jsonb;
  v_records jsonb;
  v_wm     regclass;
  -- LANE7-W3A (door 1): the API's view of an inferred table
  v_labels jsonb := '{}';
  v_reg    record;
  v_apicols jsonb := '[]';
  v_f      record;
  v_ft     text;
  v_cast   text;
  v_pub    text;
  v_has    jsonb;
  v_field_orgs uuid[];
  v_rows   uuid[];
  v_vis    uuid[];
  v_hidden text[];
  v_api_fast boolean := coalesce(current_setting('mx.api_fast', true), '') = '1';
begin
  if p_token is null or p_token !~ '^[a-z][a-z0-9_.]{0,62}$' then
    raise exception 'There is no table or definition called "%".', coalesce(p_token, '')
      using errcode = '22023', hint = 'Name a standard table by its registry token ("agent", "ai_model") or a declared definition by its key.';
  end if;

  v_decl := platform.drill_declared(p_token);
  if v_decl is not null then
    v_prob := platform.drill_definition_problems(v_decl);
    if cardinality(v_prob) > 0 then
      raise exception 'The declared definition "%" is not sound, so nothing was counted: %', p_token, array_to_string(v_prob, ' ')
        using errcode = '42P17', hint = 'Fix its *.drill.ts file and run the drill sync; the census check:drill-definitions-declare-lanes names the same problems.';
    end if;
    v_fact := v_decl ->> 'fact';
    v_mode := coalesce(v_decl ->> 'mode', 'invoker');
  else
    v_fact := p_token;
  end if;

  select e.token, e.schema_name, e.table_name, e.type, e.data_class::text as data_class, e.label,
         e.title_column, e.is_active, e.client_excluded_columns, e.governed_columns
    into v_et from platform.entity_types e where e.token = v_fact;
  -- SCOPES-REFS (2026-10-05): a token whose rows moved to the record store is read where they live
  -- (platform.entity_read_source: the scope / scope type views over custom.record), through the seat's
  -- own row rules — never the old context table, which holds no row made after the cutover.
  if v_et.token is not null then
    select s.schema_name, s.table_name into v_et.schema_name, v_et.table_name
      from platform.entity_read_source(v_fact) s;
  end if;
  if v_et.token is null or not v_et.is_active then
    raise exception 'There is no table or definition called "%".', p_token
      using errcode = '42704', hint = 'Name a standard table by its registry token or a declared definition by its key.';
  end if;
  if v_decl is null and (v_et.type in ('restricted', 'deprecated', 'system') or v_et.data_class = 'confidential') then
    raise exception 'The % table "%" is not offered for drilling by inference.', coalesce(nullif(v_et.data_class, 'organization'), v_et.type), p_token
      using errcode = '42501',
            hint = 'Restricted, deprecated and confidential tables are never offered; a System table only through a declared definition that names what it shows (a *.drill.ts file).';
  end if;
  -- A table this seat holds no SELECT on is not described (the answer would only be a refusal) —
  -- unless it is the fact of a DECLARED definer definition: that one is read by the definer step
  -- with every lane's rule compiled in (the validator refused it otherwise), so a server-only
  -- table such as a rollup may be its fact (lane DRILL-USAGE-PAGE). Its records are still read
  -- as the seat, and platform._drill_plan refuses them in words when the seat cannot read them.
  if v_mode <> 'definer'
     and not has_table_privilege(custom.caller_role(), format('%I.%I', v_et.schema_name, v_et.table_name), 'select') then
    raise exception 'You cannot read the % table, so it cannot be counted or grouped for you.', coalesce(v_et.label, p_token)
      using errcode = '42501', hint = 'It is read only by the platform itself.';
  end if;
  select c.relrowsecurity into v_rls from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = v_et.schema_name and c.relname = v_et.table_name;

  select coalesce(array_agg(att.attname::text order by array_position(k.conkey, att.attnum)), '{}')
    into v_pk
    from pg_constraint k
    join pg_attribute att on att.attrelid = k.conrelid and att.attnum = any (k.conkey)
   where k.conrelid = format('%I.%I', v_et.schema_name, v_et.table_name)::regclass and k.contype = 'p';
  -- a record-store view has no key constraint; its rows are keyed by id (SCOPES-REFS)
  if cardinality(v_pk) = 0 and exists (select 1 from pg_class v join pg_namespace vn on vn.oid = v.relnamespace
                                         where vn.nspname = v_et.schema_name and v.relname = v_et.table_name and v.relkind = 'v')
     and exists (select 1 from pg_attribute att where att.attrelid = format('%I.%I', v_et.schema_name, v_et.table_name)::regclass
                                                   and att.attname = 'id' and not att.attisdropped) then
    v_pk := array['id'];
  end if;

  v_alias := jsonb_build_object('', jsonb_build_object('schema', v_et.schema_name, 'table', v_et.table_name, 'alias', 't'));
  v_max := coalesce((platform.knob_resolve('drill', 'text_dimension_max_distinct', p_organization_id, auth.uid()) #>> '{}')::integer, 200);

  if v_decl is null or (v_decl ->> 'key' = v_fact and v_mode <> 'definer') then
    -- ── INFERENCE (d.3): the catalogue and the registry say what each column is. ──────────
    for a in
      select att.attname::text as col, att.attnum
        from pg_attribute att
       where att.attrelid = format('%I.%I', v_et.schema_name, v_et.table_name)::regclass
         and att.attnum > 0 and not att.attisdropped
       order by att.attnum
    loop
      v_col := platform._drill_column(v_et.schema_name, v_et.table_name, a.col);
      continue when (v_col ->> 'excluded')::boolean or (v_col ->> 'array')::boolean
                    or v_col ->> 'cat' = 'other' or a.col = 'deleted_at';
      -- column privileges: a column this seat may not select is not offered
      continue when not has_column_privilege(custom.caller_role(), format('%I.%I', v_et.schema_name, v_et.table_name), a.col, 'select');
      continue when a.col = any (v_pk) and cardinality(v_pk) = 1 and v_col ->> 'cat' = 'uuid';
      v_label := case a.col when 'created_at' then 'Added' when 'updated_at' then 'Last changed'
                            when 'created_by' then 'Added by' when 'updated_by' then 'Last changed by'
                            when 'organization_id' then 'Organization'
                            else initcap(regexp_replace(regexp_replace(a.col, '_id$', ''), '_', ' ', 'g')) end;
      v_labels := v_labels || jsonb_build_object(a.col, v_label);
      v_cols := v_cols || jsonb_build_object(a.col, v_col || jsonb_build_object('alias', 't'));
      -- LANE7-W3A: the Table API asks for columns, not for Dimensions and Measures — the
      -- per-column statistics, CHECK-list and foreign-key reads below are the drill page's
      continue when v_api_fast;

      if v_col ->> 'cat' = 'uuid' then
        v_fk := platform._drill_fk(v_et.schema_name, v_et.table_name, a.col, null);
        if v_fk is not null then
          v_cols := jsonb_set(v_cols, array[a.col, 'fk'], v_fk);
        end if;
        if a.col = 'organization_id' then
          v_lcols := v_lcols || jsonb_build_object('organization', a.col);
        end if;
        if a.col in ('created_by', 'user_id', 'owner_id') and not v_lcols ? 'mine'
           and (v_fk is null or v_fk ->> 'schema' in ('iam', 'auth')) then
          v_lcols := v_lcols || jsonb_build_object('mine', a.col);
        end if;
        if v_fk is not null or a.col in ('created_by', 'updated_by', 'user_id', 'owner_id') then
          v_dims := v_dims || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
            'key', a.col, 'label', v_label, 'from', a.col, 'kind', 'relation',
            'relation', jsonb_strip_nulls(jsonb_build_object(
              'token', coalesce(v_fk ->> 'token', case when a.col in ('created_by','updated_by','user_id','owner_id') then 'user' end),
              'person', case when (v_fk ->> 'schema') in ('iam', 'auth') or v_fk is null then true end)))));
          v_detail := v_detail || to_jsonb(a.col);
        end if;
      elsif v_col ->> 'cat' = 'bool' then
        v_dims := v_dims || jsonb_build_array(jsonb_build_object(
          'key', a.col, 'label', v_label, 'from', a.col, 'kind', 'boolean', 'cardinality', 'low'));
      elsif v_col ->> 'cat' = 'enum' then
        select jsonb_agg(jsonb_build_object('value', en.enumlabel, 'label', en.enumlabel) order by en.enumsortorder)
          into v_vals from pg_enum en
         where en.enumtypid = (select att.atttypid from pg_attribute att
                                where att.attrelid = format('%I.%I', v_et.schema_name, v_et.table_name)::regclass and att.attname = a.col);
        v_dims := v_dims || jsonb_build_array(jsonb_build_object(
          'key', a.col, 'label', v_label, 'from', a.col, 'kind', 'choice', 'cardinality', 'low', 'choices', coalesce(v_vals, '[]')));
        v_first_choice := coalesce(v_first_choice, a.col);
        v_detail := v_detail || to_jsonb(a.col);
      elsif v_col ->> 'cat' = 'text' then
        -- a CHECK (col = ANY (ARRAY[...])) list is a choice
        select jsonb_agg(jsonb_build_object('value', m[1], 'label', m[1]))
          into v_vals
          from pg_constraint k
          cross join lateral regexp_matches(pg_get_constraintdef(k.oid), '''((?:[^'']|'''')*)''::(?:text|character varying)', 'g') m
         where k.conrelid = format('%I.%I', v_et.schema_name, v_et.table_name)::regclass
           and k.contype = 'c' and k.conkey = array[a.attnum]
           and pg_get_constraintdef(k.oid) ~* ('^CHECK \(\(\(?' || a.col || '\)? = ANY \(ARRAY\[');
        if v_vals is not null then
          v_dims := v_dims || jsonb_build_array(jsonb_build_object(
            'key', a.col, 'label', v_label, 'from', a.col, 'kind', 'choice', 'cardinality', 'low', 'choices', v_vals));
          v_first_choice := coalesce(v_first_choice, a.col);
          v_detail := v_detail || to_jsonb(a.col);
        else
          -- free text is a dimension only while the planner's own statistics say it is a category
          select case when s.n_distinct >= 0 then s.n_distinct
                      else -s.n_distinct * greatest(c.reltuples, 0) end
            into v_nd
            from pg_stats s
            join pg_namespace n on n.nspname = s.schemaname
            join pg_class c on c.relnamespace = n.oid and c.relname = s.tablename
           where s.schemaname = v_et.schema_name and s.tablename = v_et.table_name and s.attname = a.col;
          if v_nd is null then
            v_nostats := v_nostats || a.col;
          end if;
          if v_nd is not null and v_nd >= 1 and v_nd <= v_max
             and not exists (select 1 from pg_stats s2 where s2.schemaname = v_et.schema_name
                               and s2.tablename = v_et.table_name and s2.attname = a.col and s2.n_distinct <= -0.5) then
            v_dims := v_dims || jsonb_build_array(jsonb_build_object(
              'key', a.col, 'label', v_label, 'from', a.col, 'kind', 'text',
              'cardinality', case when v_nd <= 24 then 'low' else 'medium' end));
            v_detail := v_detail || to_jsonb(a.col);
          elsif a.col = v_et.title_column then
            v_detail := v_detail || to_jsonb(a.col);
          end if;
        end if;
      elsif v_col ->> 'cat' = 'time' then
        v_dims := v_dims || jsonb_build_array(jsonb_build_object(
          'key', a.col, 'label', v_label, 'from', a.col, 'kind', 'time', 'grains', c_grains));
        v_paths := v_paths || jsonb_build_array(jsonb_build_object(
          'key', a.col, 'label', v_label || ' by period',
          'levels', (select jsonb_agg(a.col || ':' || (g #>> '{}')) from jsonb_array_elements(c_grains) g)));
        v_first_time := case when a.col = 'created_at' then a.col else coalesce(v_first_time, a.col) end;
        v_detail := v_detail || to_jsonb(a.col);
      elsif v_col ->> 'cat' = 'number' and a.col !~ '(_id|_ids)$' and not (a.col = any (v_pk)) then
        v_meas := v_meas
          || jsonb_build_array(jsonb_build_object('key', 'sum_' || a.col, 'label', 'Total ' || lower(v_label), 'op', 'sum', 'of', a.col, 'additive', true))
          || jsonb_build_array(jsonb_build_object('key', 'avg_' || a.col, 'label', 'Average ' || lower(v_label), 'op', 'avg', 'of', a.col, 'additive', false))
          || jsonb_build_array(jsonb_build_object('key', 'min_' || a.col, 'label', 'Lowest ' || lower(v_label), 'op', 'min', 'of', a.col, 'additive', false))
          || jsonb_build_array(jsonb_build_object('key', 'max_' || a.col, 'label', 'Highest ' || lower(v_label), 'op', 'max', 'of', a.col, 'additive', false));
        if a.col !~ '(^version$|order|position|sort|rank|index|priority|_count$|attempts|rating)' then
          v_first_sum := coalesce(v_first_sum, 'sum_' || a.col);
        end if;
        v_detail := v_detail || to_jsonb(a.col);
      end if;
    end loop;
    v_meas := jsonb_build_array(jsonb_build_object(
      'key', 'count', 'label', 'Number of ' || regexp_replace(lower(coalesce(nullif(v_et.label, ''), v_et.table_name)), '([^s])$', '\1s'),
      'op', 'count', 'unit', 'count', 'additive', true)) || v_meas;
    v_lanes := jsonb_build_array('organization')
               || case when v_lcols ? 'mine' then '["mine"]'::jsonb else '[]'::jsonb end
               || '["platform"]'::jsonb;
    if v_et.title_column is not null and not v_detail ? v_et.title_column
       and v_cols ? v_et.title_column then
      v_detail := to_jsonb(v_et.title_column) || v_detail;
    end if;
    v_def := jsonb_build_object(
      'key', v_fact,
      'label', coalesce(nullif(v_et.label, ''), initcap(replace(v_et.table_name, '_', ' '))),
      'grain', 'one row per ' || lower(coalesce(nullif(v_et.label, ''), v_et.table_name)),
      'lanes', v_lanes,
      'dimensions', v_dims,
      'measures', v_meas,
      'paths', v_paths,
      'detail', jsonb_build_object('columns', (select coalesce(jsonb_agg(x), '[]') from (select x from jsonb_array_elements(v_detail) x limit 12) s)),
      'default', jsonb_strip_nulls(jsonb_build_object(
        'by', case when v_first_choice is not null then jsonb_build_array(v_first_choice)
                   when v_first_time is not null then jsonb_build_array(v_first_time || ':month')
                   else '[]'::jsonb end,
        'show', case when v_first_sum is not null then jsonb_build_array('count', v_first_sum) else '["count"]'::jsonb end,
        'sort', jsonb_build_object('key', 'count', 'direction', 'desc'),
        'path', v_first_time)),
      'inferred', (select coalesce(jsonb_agg(x -> 'key'), '[]') from jsonb_array_elements(v_dims || v_meas) x));
  end if;

  if v_decl is not null then
    -- ── DECLARED: an override of the inferred table, or a fact over several ─────────────
    -- a fact over several tables, or a definer definition over a System fact no client reads (its
    -- own token): nothing is inferred; the declaration says every Dimension and Measure
    if v_decl ->> 'key' <> v_fact or v_mode = 'definer' then
      v_def := jsonb_build_object('key', v_decl ->> 'key', 'dimensions', '[]'::jsonb, 'measures', '[]'::jsonb,
                                  'paths', '[]'::jsonb, 'inferred', '[]'::jsonb);
      v_cols := '{}';
      v_lcols := coalesce(v_decl -> 'lane_columns', '{}');
    else
      v_lcols := v_lcols || coalesce(v_decl -> 'lane_columns', '{}');
    end if;
    for j in select x from jsonb_array_elements(coalesce(v_decl -> 'joins', '[]'::jsonb)) x loop
      v_from := j ->> 'from';
      v_a := case when position('.' in v_from) > 0 then split_part(v_from, '.', 1) else '' end;
      v_c := case when position('.' in v_from) > 0 then split_part(v_from, '.', 2) else v_from end;
      v_fk := platform._drill_fk(v_alias -> v_a ->> 'schema', v_alias -> v_a ->> 'table', v_c, j ->> 'token');
      v_joins := v_joins || jsonb_build_array(jsonb_build_object(
        'alias', 'j' || jsonb_array_length(v_joins), 'schema', v_fk ->> 'schema', 'table', v_fk ->> 'table',
        'on_alias', v_alias -> v_a ->> 'alias', 'on_column', v_c, 'to', v_fk ->> 'to'));
      v_alias := v_alias || jsonb_build_object(j ->> 'as', jsonb_build_object(
        'schema', v_fk ->> 'schema', 'table', v_fk ->> 'table', 'alias', 'j' || (jsonb_array_length(v_joins) - 1)));
    end loop;
    -- every column a declared dimension or measure reads, with its alias and type
    for v_from in
      select x ->> 'from' from jsonb_array_elements(coalesce(v_decl -> 'dimensions', '[]')) x
      union select x ->> 'of' from jsonb_array_elements(coalesce(v_decl -> 'measures', '[]')) x where x ? 'of'
      union select x ->> 'at_grain' from jsonb_array_elements(coalesce(v_decl -> 'measures', '[]')) x where x ? 'at_grain'
      union select x #>> '{}' from jsonb_array_elements(coalesce(v_decl -> 'detail' -> 'columns', '[]')) x
      union select x #>> '{}' from jsonb_each(coalesce(v_decl -> 'lane_columns', '{}')) e(k, x)
      union select e.x ->> 'column' from jsonb_each(coalesce(v_decl -> 'lane_rules', '{}')) e(k, x) where e.x ? 'column'
    loop
      continue when v_from is null or v_cols ? v_from;
      v_a := case when position('.' in v_from) > 0 then split_part(v_from, '.', 1) else '' end;
      v_c := case when position('.' in v_from) > 0 then split_part(v_from, '.', 2) else v_from end;
      continue when not v_alias ? v_a;
      v_col := platform._drill_column(v_alias -> v_a ->> 'schema', v_alias -> v_a ->> 'table', v_c);
      continue when v_col is null;
      if v_mode = 'invoker' and not has_column_privilege(custom.caller_role(),
           format('%I.%I', v_alias -> v_a ->> 'schema', v_alias -> v_a ->> 'table'), v_c, 'select') then
        raise exception 'This definition reads a column you cannot read (%), so it cannot be asked by you.', v_from
          using errcode = '42501';
      end if;
      v_fk := platform._drill_fk(v_alias -> v_a ->> 'schema', v_alias -> v_a ->> 'table', v_c, null);
      if v_fk is null and v_a <> '' and exists (
           select 1 from jsonb_array_elements(v_joins) jj
            where jj ->> 'alias' = v_alias -> v_a ->> 'alias' and jj ->> 'to' = v_c) then
        -- the join target's own key: the relation is that row itself
        select jsonb_build_object('schema', e.schema_name, 'table', e.table_name, 'to', v_c,
                                  'token', e.token, 'title', e.title_column)
          into v_fk from platform.entity_types e
         where e.schema_name = v_alias -> v_a ->> 'schema' and e.table_name = v_alias -> v_a ->> 'table';
      end if;
      v_cols := v_cols || jsonb_build_object(v_from, v_col || jsonb_build_object('alias', v_alias -> v_a ->> 'alias')
                                             || case when v_fk is not null then jsonb_build_object('fk', v_fk) else '{}'::jsonb end);
    end loop;
    v_hide := coalesce(v_decl -> 'hide', '[]');
    v_def := v_def || jsonb_strip_nulls(jsonb_build_object(
      'label', v_decl ->> 'label', 'grain', v_decl ->> 'grain', 'lanes', v_decl -> 'lanes',
      'detail', v_decl -> 'detail', 'default', v_decl -> 'default',
      -- the definition's built-in Saved views and findings (read-only; "Save a copy" makes a person's own)
      'views', v_decl -> 'views', 'findings', v_decl -> 'findings',
      -- what a record of this definition shows (the relation itself stays the door's)
      'records', case when v_decl ? 'records' then jsonb_strip_nulls(jsonb_build_object(
                   'fact', v_decl -> 'records' ->> 'fact', 'columns', v_decl -> 'records' -> 'columns',
                   'labels', v_decl -> 'records' -> 'labels',
                   -- lane DRILL-NIGHT-RECORDS: what ONE record is ("execution"), so "See these records" and their count
                   -- read in the records' own noun, never the summary grain's ("18,144 hours")
                   'noun', v_decl -> 'records' ->> 'noun')) end));

    -- THE RECORDS RELATION (decision 14): every column the definition reads, re-read from it, so the
    -- SAME compiler, the same filter and the same lane rule serve the number and its records.
    if v_decl ? 'records' then
      select rs.schema_name, rs.table_name, e.token into v_rec
        from platform.entity_types e cross join lateral platform.entity_read_source(e.token) rs  -- SCOPES-REFS
       where e.token = v_decl -> 'records' ->> 'fact' and e.is_active;
      if v_rec.token is null then
        raise exception 'The records of "%" are declared in "%", which is not in the registry.', v_decl ->> 'key', v_decl -> 'records' ->> 'fact'
          using errcode = '42P17';
      end if;
      v_rcols := '{}';
      for v_from, v_col in select key, value from jsonb_each(v_cols) loop
        if v_col ->> 'alias' = 't' then
          v_rx := platform._drill_column(v_rec.schema_name, v_rec.table_name, v_col ->> 'column');
          if v_rx is null then
            raise exception 'The records relation of "%" has no column "%" (the validator names this too).', v_decl ->> 'key', v_col ->> 'column'
              using errcode = '42P17';
          end if;
          v_rcols := v_rcols || jsonb_build_object(v_from, v_rx || jsonb_build_object('alias', 't'));
        else
          v_rcols := v_rcols || jsonb_build_object(v_from, v_col);
        end if;
      end loop;
      for v_from in select x #>> '{}' from jsonb_array_elements(v_decl -> 'records' -> 'columns') x union select 'created_at' loop
        continue when v_rcols ? v_from;
        v_rx := platform._drill_column(v_rec.schema_name, v_rec.table_name, v_from);
        continue when v_rx is null or (v_rx ->> 'excluded')::boolean;
        v_rcols := v_rcols || jsonb_build_object(v_from, v_rx || jsonb_build_object('alias', 't'));
      end loop;
      select coalesce(array_agg(att.attname::text order by array_position(k.conkey, att.attnum)), '{}')
        into v_rpk
        from pg_constraint k
        join pg_attribute att on att.attrelid = k.conrelid and att.attnum = any (k.conkey)
       where k.conrelid = format('%I.%I', v_rec.schema_name, v_rec.table_name)::regclass and k.contype = 'p';
      v_records := jsonb_build_object(
        'fact', jsonb_build_object('schema', v_rec.schema_name, 'table', v_rec.table_name, 'token', v_rec.token,
                                   'pk', to_jsonb(v_rpk),
                                   'deleted', (platform._drill_column(v_rec.schema_name, v_rec.table_name, 'deleted_at') is not null)),
        'cols', v_rcols,
        'columns', v_decl -> 'records' -> 'columns');
    end if;
    v_def := jsonb_set(v_def, '{dimensions}',
      (select coalesce(jsonb_agg(x order by o), '[]') from (
         select x, o from jsonb_array_elements(v_def -> 'dimensions') with ordinality e(x, o)
          where not exists (select 1 from jsonb_array_elements(coalesce(v_decl -> 'dimensions', '[]')) y where y ->> 'key' = x ->> 'key')
            and not v_hide ? (x ->> 'key')
         union all
         select x, 1000 + o from jsonb_array_elements(coalesce(v_decl -> 'dimensions', '[]')) with ordinality e(x, o)) s));
    v_def := jsonb_set(v_def, '{measures}',
      (select coalesce(jsonb_agg(x order by o), '[]') from (
         select x, o from jsonb_array_elements(v_def -> 'measures') with ordinality e(x, o)
          where not exists (select 1 from jsonb_array_elements(coalesce(v_decl -> 'measures', '[]')) y where y ->> 'key' = x ->> 'key')
            and not v_hide ? (x ->> 'key')
         union all
         select x, 1000 + o from jsonb_array_elements(coalesce(v_decl -> 'measures', '[]')) with ordinality e(x, o)) s));
    if v_decl ? 'paths' then
      v_def := jsonb_set(v_def, '{paths}', v_decl -> 'paths');
    end if;
  end if;

  -- ── LANE7-W3A (door 1): THE TABLE API'S COLUMNS, from the same inference ──────────────
  -- Every column this seat may read gets a stable api name: a real column is its column name,
  -- a custom field is cf:<its field id> (one field in one organization, never shared by two).
  -- The label is the column's own and never changes with scope. Custom fields are those of the
  -- seat's own organizations; each reads its value only on rows of its own organization, so two
  -- organizations' "Tier" fields are two columns and a row carries a value in at most one.
  if v_decl is null then
    select f.api_reach, f.api_reach_reason, f.api_writable_columns as writable, f.create_via,
           coalesce(f.search_columns, case when e.title_column is not null then array[e.title_column] end, '{}'::text[]) as search_columns,
           f.default_list_where, e.custom_fields_enabled
      into v_reg from platform.entity_types e cross join lateral platform.api_facts(e.token) f where e.token = v_fact;
    select jsonb_build_object(
             'organization_id', bool_or(att.attname = 'organization_id'),
             'created_by', bool_or(att.attname = 'created_by'),
             'published_to_web', bool_or(att.attname = 'published_to_web'),
             'deleted_at', bool_or(att.attname = 'deleted_at'),
             'version', bool_or(att.attname = 'version'),
             'custom_fields', bool_or(att.attname = 'custom_fields'))
      into v_has
      from pg_attribute att
     where att.attrelid = format('%I.%I', v_et.schema_name, v_et.table_name)::regclass
       and att.attnum > 0 and not att.attisdropped;
    v_hidden := coalesce(v_et.client_excluded_columns, '{}'::text[]) || array['custom_fields'];
    for a in
      select att.attname::text as col, att.atttypid::regtype::text as typ
        from pg_attribute att
       where att.attrelid = format('%I.%I', v_et.schema_name, v_et.table_name)::regclass
         and att.attnum > 0 and not att.attisdropped
       order by att.attnum
    loop
      -- THE API SHOWS EVERY REAL COLUMN THE SEAT MAY READ, except the ones named here, once:
      -- the registry's client_excluded_columns; custom_fields (its values are the cf: columns);
      -- and the access-ladder row column T-13 retires (no new reader may read it; shown_to and
      -- published_to_web carry its meaning). The drill's own Dimension rules do not narrow this.
      continue when a.col = any (v_hidden)
                 or a.typ = 'platform.' || a.col
                 or not has_column_privilege(custom.caller_role(), format('%I.%I', v_et.schema_name, v_et.table_name), a.col, 'select');
      if not v_cols ? a.col then
        v_col := platform._drill_column(v_et.schema_name, v_et.table_name, a.col);
        v_cols := v_cols || jsonb_build_object(a.col, jsonb_build_object(
          'alias', 't', 'column', a.col, 'type', v_col ->> 'type', 'cat', v_col ->> 'cat', 'array', v_col -> 'array'));
      end if;
      v_col := v_cols -> a.col;
      v_pub := case when coalesce((v_col ->> 'array')::boolean, false) then 'list'
                    when v_col ->> 'type' in ('jsonb', 'json') then 'json'
                    when v_col ? 'fk' then 'relation'
                    when v_col ->> 'cat' = 'bool' then 'checkbox'
                    when v_col ->> 'cat' = 'number' then 'number'
                    when v_col ->> 'cat' = 'enum' then 'choice'
                    when v_col ->> 'cat' = 'time' then case when v_col ->> 'type' = 'date' then 'date' else 'datetime' end
                    else 'text' end;
      v_apicols := v_apicols || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'api_name', a.col, 'name', coalesce(v_labels ->> a.col, a.col), 'type', v_pub,
        'writable', (a.col = any (v_reg.writable))
                    and has_column_privilege(custom.caller_role(), format('%I.%I', v_et.schema_name, v_et.table_name), a.col, 'update'),
        'indexed', exists (select 1 from pg_index i
                            where i.indrelid = format('%I.%I', v_et.schema_name, v_et.table_name)::regclass
                              and i.indkey[0] = (select att.attnum from pg_attribute att
                                                  where att.attrelid = i.indrelid and att.attname = a.col)),
        'choices', case when v_col ->> 'cat' = 'enum'
                        then (select jsonb_agg(en.enumlabel order by en.enumsortorder) from pg_enum en
                               where en.enumtypid = (v_col ->> 'type')::regtype) end)));
    end loop;
    if coalesce(v_reg.custom_fields_enabled, false) and coalesce((v_has ->> 'custom_fields')::boolean, false)
       and coalesce((v_has ->> 'organization_id')::boolean, false) then
      -- A row's custom fields are its OWN organization's: the seat's organizations, plus the
      -- organization of every row platform.api_sample_rows found her own SELECT returning (it
      -- runs as her, so the table's row rules decided; drill_describe / drill_rows hand the ids
      -- over in mx.api_rows). Ids are only trusted after iam.has_access says she may view each —
      -- the platform's one access answer, never a copy of the table's policies — so a forged
      -- list names no organization she cannot read. Only labels hang on this; every VALUE is
      -- still read as the seat in platform.drill_rows.
      v_field_orgs := array(select iam.my_orgs());
      begin
        v_rows := nullif(current_setting('mx.api_rows', true), '')::uuid[];
      exception when others then
        v_rows := null;
      end;
      if cardinality(v_rows) > 0 then
        execute format('select coalesce(array_agg(distinct t.organization_id), ''{}'') from %I.%I t where t.id = any ($1) and iam.has_access($2, t.id, ''viewer'')',
                       v_et.schema_name, v_et.table_name)
          into v_vis using v_rows, v_fact;
        v_field_orgs := v_field_orgs || v_vis;
      end if;
      for v_f in
        select f.id, f.organization_id, f.data, o.name as org_name
          from custom.record f
          left join iam.organizations o on o.id = f.organization_id
         where f.table_id = custom.field_kernel_id()
           and f.deleted_at is null
           and f.data ->> 'table_token' = v_fact
           and f.organization_id = any (v_field_orgs)
         order by coalesce((f.data ->> 'sort')::numeric, 100), f.data ->> 'label', f.id
      loop
        v_ft := coalesce(v_f.data ->> 'type', 'text');
        v_cast := case when coalesce((v_f.data ->> 'multi')::boolean, false) then 'jsonb'
                       when v_ft = 'number' then 'numeric'
                       when v_ft = 'boolean' then 'boolean'
                       else 'text' end;
        v_pub := case when v_cast = 'jsonb' then 'choices' when v_ft = 'list' then 'choice'
                      when v_ft = 'boolean' then 'checkbox' when v_ft = 'number' then 'number'
                      when v_ft = 'text' and coalesce(v_f.data ->> 'format', v_f.data -> 'config' ->> 'kind') in ('date', 'datetime', 'time', 'email', 'url', 'phone')
                        then v_f.data ->> 'format'
                      else v_ft end;
        v_cols := v_cols || jsonb_build_object('cf:' || v_f.id, jsonb_build_object(
          'alias', 't', 'column', null, 'custom', true, 'organization_id', v_f.organization_id,
          'key', v_f.data ->> 'key', 'type', v_cast,
          'cat', case v_cast when 'numeric' then 'number' when 'boolean' then 'bool' when 'text' then 'text' else 'other' end,
          'expr', format('(case when t.organization_id = %L::uuid then (t.custom_fields %s %L)%s end)',
                         v_f.organization_id, case when v_cast = 'jsonb' then '->' else '->>' end, v_f.data ->> 'key',
                         case when v_cast in ('jsonb', 'text') then '' else '::' || v_cast end)));
        v_apicols := v_apicols || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
          'api_name', 'cf:' || v_f.id, 'name', coalesce(v_f.data ->> 'label', v_f.data ->> 'key'), 'type', v_pub,
          'organization_id', v_f.organization_id, 'organization', v_f.org_name, 'custom', true, 'key', v_f.data ->> 'key',
          'writable', v_reg.api_reach = 'read_write', 'indexed', false,
          'required', case when (v_f.data ->> 'required')::boolean then true end,
          'unit', v_f.data ->> 'unit',
          -- AP-4 (2026-10-06): a custom CHOICE field says its live words and a LINK field the kinds
          -- it may point at, here in the one describer, so every reader of this description
          -- (drill_describe, drill_rows' columns, the Table API, platform.entity_columns) has them.
          'choices', case when v_ft = 'list'
                           and coalesce(nullif(v_f.data ->> 'options_table_id', ''),
                                        nullif(v_f.data -> 'config' ->> 'options_table_id', '')) is not null
                          then (select jsonb_agg(o.value ->> 'label'
                                                 order by (o.value ->> 'position')::integer nulls last, o.value ->> 'label')
                                  from jsonb_each(custom.choice_options(v_f.organization_id,
                                         coalesce(nullif(v_f.data ->> 'options_table_id', ''),
                                                  nullif(v_f.data -> 'config' ->> 'options_table_id', ''))::uuid)) o
                                 where not coalesce((o.value ->> 'retired')::boolean, false)) end,
          'links_to', case when jsonb_typeof(v_f.data -> 'config' -> 'allowed_types') = 'array'
                            and jsonb_array_length(v_f.data -> 'config' -> 'allowed_types') > 0
                           then v_f.data -> 'config' -> 'allowed_types' end)));
      end loop;
    end if;
    v_def := v_def || jsonb_build_object('api', jsonb_strip_nulls(jsonb_build_object(
      -- the name a person reads (custom.entity_table's rule: never the bare type word)
      'label', case when lower(coalesce(nullif(v_et.label, ''), v_et.type)) = lower(v_et.type)
                    then initcap(replace(v_et.table_name, '_', ' ')) else v_et.label end,
      'reach', coalesce(v_reg.api_reach, 'none'), 'reach_reason', v_reg.api_reach_reason,
      'writable_columns', to_jsonb(v_reg.writable), 'create_via', coalesce(v_reg.create_via, 'refuse'),
      'search_columns', to_jsonb(v_reg.search_columns),
      'has', v_has, 'columns', v_apicols))
      -- (kept whole: a fact whose value is null means "is null" and must not be stripped)
      || jsonb_build_object('default_list_where', v_reg.default_list_where));
  end if;

  -- how far a definer fact has counted: <schema>.<table>_watermark (covered_to), when it keeps one
  if v_mode = 'definer' then
    v_wm := to_regclass(format('%I.%I', v_et.schema_name, v_et.table_name || '_watermark'));
  end if;

  return v_def || jsonb_build_object(
    'source', jsonb_build_object('kind', 'entity', 'token', coalesce(v_decl ->> 'key', v_fact)),
    'mode', v_mode,
    'stale_after_knob', v_decl -> 'stale_after_knob',
    '_c', jsonb_build_object(
      'fact', jsonb_build_object('schema', v_et.schema_name, 'table', v_et.table_name, 'token', v_et.token,
                                 'pk', to_jsonb(v_pk), 'title', v_et.title_column, 'rls', v_rls,
                                 'deleted', (platform._drill_column(v_et.schema_name, v_et.table_name, 'deleted_at') is not null)),
      'joins', v_joins,
      'cols', v_cols,
      'lane_cols', v_lcols,
      'lane_rules', coalesce(v_decl -> 'lane_rules', '{}'))
      || case when v_records is not null then jsonb_build_object('records', v_records) else '{}'::jsonb end
      || case when v_wm is not null then jsonb_build_object('watermark', v_wm::text) else '{}'::jsonb end)
    || case when cardinality(v_nostats) > 0 then jsonb_build_object('says', jsonb_build_array(format(
         '%s text column%s (%s) %s no statistics yet, so %s not offered as a dimension; the next routine analysis of the table decides.',
         cardinality(v_nostats), case when cardinality(v_nostats) = 1 then '' else 's' end, array_to_string(v_nostats, ', '),
         case when cardinality(v_nostats) = 1 then 'has' else 'have' end,
         case when cardinality(v_nostats) = 1 then 'it is' else 'they are' end))) else '{}'::jsonb end;
end
$function$;
