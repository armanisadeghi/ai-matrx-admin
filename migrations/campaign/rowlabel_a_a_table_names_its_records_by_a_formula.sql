-- chair-step: ROW-LABEL-FORMULA. CREATES custom._row_label_text (helper, SECURITY INVOKER, no client grant) and two client doors custom.table_row_label / custom.table_row_label_set (SECURITY DEFINER; declared in platform.client_callable_door, GRANT EXECUTE to authenticated); REPLACES the bodies of custom._words_for, custom.records_search, custom.reverse_links_many, custom.entity_back_links, custom.agg_record_name and platform.relation_label (same signatures, same security) so a Table's row-label formula names its records everywhere a record is named. No table, column, index, trigger, policy or knob row is touched; the formula lives in the Table's own document (data.row_label_formula + data.row_label_expr).
-- lane: ROW-LABEL-FORMULA
-- lock: custom,platform
-- based-on: custom._words_for(uuid, uuid, jsonb, text, integer) 4ec715c0a07d0fe6f53e587239eb1a56b10bf2d2d3adb2f1ac36524ac29ffdb9
-- based-on: custom.records_search(text, integer, integer, uuid[], uuid[], boolean) 153bafccbad72e1749ae3ba46911a194c3273ed7125c1ffa8101547f7aefffe9
-- based-on: custom.reverse_links_many(uuid, uuid, uuid, uuid[], integer, integer) 3195eb88c6f3da2cbc9aa5cc1995b46b8f84aa01fe54dea0ab830e44bb3e08fd
-- based-on: custom.entity_back_links(uuid, text, uuid, integer, text) eb2222d7debbb82b3caba0f16ea9583c821a607cae388eab8a08f76d1af23be6
-- based-on: custom.agg_record_name(uuid, uuid, jsonb) 282a60de1972057400b5e0e1527343329632ef2234a12afbb357f0b9ae20844f
-- based-on: platform.relation_label(uuid, text, uuid) 6a714767403a3d9e9745f5e110be43a366ec962978f20b1a8d64cf114d9b7d54
-- Inverse: migrations/inverse/rowlabel_a_a_table_names_its_records_by_a_formula_down.sql
--
-- A TABLE NAMES ITS RECORDS BY A FORMULA (ROW-LABEL-FORMULA, 2026-10-10). The older Sheet named a row by several
-- columns joined, {First} & " " & {Last}; the store kept one column. A Table now keeps, beside title_field, a
-- row-label FORMULA over its own columns, parsed by custom.formula_parse and worked out by custom.formula_value
-- (the formula engine, unchanged - no second evaluator). When it is set and returns words for a record, those
-- words are the record's name; blank, or a formula that cannot be worked out for that record, falls back to the
-- single title column. Nothing is materialized: every name is read live, so a write to Last is the next read's
-- name (there is no copy to keep in sync).

CREATE OR REPLACE FUNCTION custom._row_label_text(p_organization_id uuid, p_table_id uuid, p_record_id uuid, p_expr jsonb)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v jsonb;
begin
  -- THE ONE PLACE A ROW-LABEL FORMULA IS WORKED OUT. p_expr is the parsed tree a Table keeps as
  -- data.row_label_expr; null means the Table has none. The evaluator is the formula field's own.
  if p_expr is null or jsonb_typeof(p_expr) <> 'object' then
    return null;
  end if;
  begin
    v := custom.formula_value(p_organization_id, p_record_id,
           jsonb_build_object('key', '__row_label__', 'type', 'formula',
                              'entity_definition_id', p_table_id::text,
                              'config', jsonb_build_object('expr', p_expr)), null);
  exception when others then
    return null;   -- a formula that cannot be worked out for this record names it by the title column
  end;
  return nullif(btrim(custom._fx_text(v)), '');
end
$function$;
revoke all on function custom._row_label_text(uuid, uuid, uuid, jsonb) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION custom.table_row_label(p_organization_id uuid, p_table_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me     uuid := custom.query_principal();
  v_owner  uuid;
  v_data   jsonb;
  v_text   text;
  v_parsed jsonb;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.table_row_label');
  perform custom.assert_may_know_table(p_organization_id, p_table_id, 'custom.table_row_label');
  select t.created_by, t.data into v_owner, v_data
    from custom.record t
   where t.organization_id = p_organization_id and t.id = p_table_id
     and t.table_id = custom.table_kernel_id() and t.deleted_at is null;
  if not found then
    raise exception 'That table is not in this organization.' using errcode = '02000',
      hint = 'The store is keyed (organization_id, id): open the table from its own organization. Nothing was read.';
  end if;
  v_text := nullif(v_data ->> 'row_label_formula', '');
  if v_text is not null then
    v_parsed := custom.formula_parse(p_organization_id, p_table_id, v_text);
  end if;
  return jsonb_build_object(
    'formula', v_text,
    'title_field', v_data -> 'title_field',
    'effective', case when v_data -> 'row_label_expr' is not null then 'formula' else 'column' end,
    'result_type', case when v_parsed is not null and (v_parsed ->> 'ok')::boolean then v_parsed -> 'result_type' end,
    'valid', v_text is null or coalesce((v_parsed ->> 'ok')::boolean, false),
    'error', case when v_parsed is not null and not (v_parsed ->> 'ok')::boolean then v_parsed ->> 'error' end,
    'can_change', custom.query_is_store_owner() or v_owner = v_me
                  or iam.has_access('record', p_table_id, 'admin'::public.permission_level));
end
$function$;

CREATE OR REPLACE FUNCTION custom.table_row_label_set(p_organization_id uuid, p_table_id uuid, p_formula text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me     uuid := custom.query_principal();
  v_owner  uuid;
  v_parsed jsonb;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.table_row_label_set');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_row_label_set');
  select t.created_by into v_owner
    from custom.record t
   where t.organization_id = p_organization_id and t.id = p_table_id
     and t.table_id = custom.table_kernel_id() and t.deleted_at is null
   for update;
  if not found then
    raise exception 'That table is not in this organization.' using errcode = '02000',
      hint = 'The store is keyed (organization_id, id): open the table from its own organization. Nothing was written.';
  end if;
  if not (custom.query_is_store_owner() or v_owner = v_me
          or iam.has_access('record', p_table_id, 'admin'::public.permission_level)) then
    raise exception 'Only the person who made this table (or someone with full access to it) can change how its records are named.'
      using errcode = '42501', hint = 'Nothing was written. Ask an owner of the table to change it, or to give you full access.';
  end if;

  -- A BLANK FORMULA CLEARS IT: the Table names its records by its title column again.
  if nullif(btrim(coalesce(p_formula, '')), '') is null then
    update custom.record
       set data = data - 'row_label_formula' - 'row_label_expr'
     where organization_id = p_organization_id and id = p_table_id and table_id = custom.table_kernel_id()
       and (data ? 'row_label_formula' or data ? 'row_label_expr');
    return custom.table_row_label(p_organization_id, p_table_id);
  end if;

  if length(p_formula) > 2000 then
    raise exception 'A row label formula is at most 2000 characters, and this one is %.', length(p_formula)
      using errcode = '22023', hint = 'Nothing was written.';
  end if;
  -- THE PARSE IS THE FORMULA FIELD'S OWN: it names an unknown column, a wrong function, a missing bracket,
  -- in a sentence with the position.
  v_parsed := custom.formula_parse(p_organization_id, p_table_id, p_formula);
  if not coalesce((v_parsed ->> 'ok')::boolean, false) then
    raise exception 'This row label formula cannot be used: %', coalesce(v_parsed ->> 'error', 'it could not be read.')
      using errcode = '22023', detail = coalesce(v_parsed ->> 'position', '0'),
            hint = 'Nothing was written. Write the formula over this table''s own columns, e.g. {First} & " " & {Last}.';
  end if;

  update custom.record
     set data = data || jsonb_build_object('row_label_formula', p_formula, 'row_label_expr', v_parsed -> 'expr')
   where organization_id = p_organization_id and id = p_table_id and table_id = custom.table_kernel_id();
  return custom.table_row_label(p_organization_id, p_table_id);
end
$function$;

CREATE OR REPLACE FUNCTION custom._words_for(p_organization_id uuid, p_record_id uuid, p_display jsonb DEFAULT NULL::jsonb, p_noun text DEFAULT NULL::text, p_hop integer DEFAULT 0)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_rec   custom.record;
  v_tab   jsonb;
  v_noun  text;
  v_me    uuid;
  v_cols  text[];
  v_sep   text;
  v_parts text[] := '{}'::text[];
  v_raw   text;
  v_one   text;
  v_fx    text;
  c       text;
  k_uuid  constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  if p_record_id is null then return null; end if;

  -- (a) THE LADDER DECIDES BEFORE THE NAME IS READ.
  v_me := custom.query_principal();
  if v_me is not null and not custom.has_visibility(v_me, 'record', p_record_id, 'viewer') then
    return platform.relation_withheld_label();
  end if;

  select r.* into v_rec from custom.record r
   where r.organization_id = p_organization_id and r.id = p_record_id;
  if not found then
    -- Not hers and not here read the same from outside, which is REC-29 working.
    return platform.relation_withheld_label();
  end if;

  select t.data into v_tab from custom.record t
   where t.organization_id = p_organization_id and t.id = v_rec.table_id;

  v_noun := lower(coalesce(nullif(p_noun, ''),
                           nullif(v_tab ->> 'label_singular', ''),
                           nullif(v_tab ->> 'name', ''),
                           'record'));

  -- (b) THE COLUMNS THIS FIELD NAMED, IN ORDER — the per-field override, and the whole
  --     reason "first name" + " " + "last name" is one string rather than two chips.
  if p_display is not null and jsonb_typeof(p_display -> 'columns') = 'array' then
    select array_agg(e.value #>> '{}' order by e.ordinality)
      into v_cols
      from jsonb_array_elements(p_display -> 'columns') with ordinality e;
    v_sep := coalesce(p_display ->> 'separator', ' ');

    foreach c in array coalesce(v_cols, '{}'::text[]) loop
      v_raw := nullif(btrim(coalesce(v_rec.data ->> c, '')), '');
      v_one := null;
      if v_raw is not null then
        if v_raw ~ k_uuid then
          -- (d) ONE HOP. A display column that is itself a relation reads as its own
          --     words, once, and the hop is gated by (a) exactly as this call was.
          if p_hop < 1 then
            v_one := custom._words_for(p_organization_id, v_raw::uuid, null, null, p_hop + 1);
          end if;
        else
          v_one := v_raw;   -- already the words somebody typed
        end if;
      end if;
      if nullif(btrim(coalesce(v_one, '')), '') is not null then
        v_parts := v_parts || v_one;
      end if;
    end loop;

    if array_length(v_parts, 1) is not null then
      return array_to_string(v_parts, coalesce(v_sep, ' '));
    end if;
    -- The named columns hold nothing on THIS record. Fall through to the Table's own
    -- answer rather than printing an empty chip: a screen never goes blank where a name
    -- belongs any more than it prints an id there.
  end if;

  -- (b2) THE TABLE'S OWN ROW-LABEL FORMULA (ROW-LABEL-FORMULA): a Table that names its records by
  --      several columns joined ({First} & " " & {Last}) keeps that formula in its document, and the
  --      one answer here is its result. A per-field override above still wins; a blank result or a
  --      formula that cannot be worked out for this record falls through to the single column below.
  v_fx := custom._row_label_text(p_organization_id, v_rec.table_id, p_record_id, v_tab -> 'row_label_expr');
  if v_fx is not null then
    return v_fx;
  end if;

  -- (c) THE TABLE'S OWN DEFAULT REFERENCE COLUMN, then the conventional names, then the
  --     first words the record holds — never a uuid-shaped one, because a bare id in
  --     `name` is the same lie as a bare id in `title_field`.
  v_raw := coalesce(nullif(v_rec.data ->> (v_tab ->> 'title_field'), ''),
                    nullif(v_rec.data ->> 'title', ''),
                    nullif(v_rec.data ->> 'name', ''),
                    nullif(v_rec.data ->> 'label', ''),
                    nullif(v_rec.data ->> 'full_name', ''),
                    nullif(v_rec.data ->> 'company', ''),
                    nullif(v_rec.data ->> 'subject', ''),
                    custom._first_words(v_rec.data));

  if v_raw is not null and v_raw !~ k_uuid then
    return v_raw;
  end if;

  if v_raw is not null and p_hop < 1 then
    v_one := custom._words_for(p_organization_id, v_raw::uuid, null, null, p_hop + 1);
    if nullif(btrim(coalesce(v_one, '')), '') is not null then
      return v_one;
    end if;
  end if;

  -- (d) The hop landed on another id, or on nothing: say so rather than print either.
  return 'an untitled ' || v_noun;
end
$function$;

CREATE OR REPLACE FUNCTION custom.records_search(p_search text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_table_ids uuid[] DEFAULT NULL::uuid[], p_organization_ids uuid[] DEFAULT NULL::uuid[], p_include_platform_tables boolean DEFAULT false)
 RETURNS TABLE(record_id uuid, table_id uuid, table_name text, name text, organization_id uuid, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me      uuid := custom.query_principal();
  v_q       text := nullif(btrim(coalesce(p_search, '')), '');
  v_like    text;
  v_limit   integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset  integer := greatest(coalesce(p_offset, 0), 0);
  v_cap     integer;
  v_orgs    uuid[];
  v_org     uuid;
  v_ids     uuid[];
  v_tids    uuid[];
  v_oids    uuid[];
  v_names   text[];
  v_tnames  text[];
  v_ats     timestamp with time zone[];
  v_kept    uuid[] := '{}'::uuid[];
  v_open    uuid[];
  v_part    uuid[];
  v_pair    record;
  v_pairs   integer := 0;
begin
  -- THE READER IS THE SESSION'S OWN PERSON. Nobody signed in: nothing is listed (the picker's empty state).
  if v_me is null then
    return;
  end if;
  if v_q is not null and length(v_q) > 200 then
    raise exception 'custom.records_search searches at most 200 characters; this search has %.', length(v_q)
      using errcode = '22023', hint = 'Search for a shorter phrase. Nothing was read.';
  end if;

  -- THE ORGANIZATIONS: hers, every one by default. A named one is decided first, in this door's own
  -- name (never an empty list that reads like "nothing there"); then the list is narrowed to it.
  if p_organization_ids is not null then
    foreach v_org in array p_organization_ids loop
      perform custom.assert_client_may_reach(v_org, 'custom.records_search');
    end loop;
  end if;
  v_orgs := array(
    select m.organization_id
      from iam.organization_member m
      join iam.organizations o on o.id = m.organization_id and o.archived_at is null
     where m.user_id = v_me
       and (p_organization_ids is null or m.organization_id = any (p_organization_ids)));
  if coalesce(cardinality(v_orgs), 0) = 0 then
    return;
  end if;

  -- THE CANDIDATES, in one scan: every live record of a Table she may be shown (app-kept Tables behind
  -- the switch), named like the search, ranked, newest first, capped at two pages (at least 200).
  v_cap  := least(greatest((v_offset + v_limit) * 2, 200), 1000);
  v_like := case when v_q is null then null
                 else '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%' end;
  with t as (
    select t.id, t.organization_id,
           coalesce(nullif(btrim(t.data ->> 'name'), ''), 'Untitled table') as nm,
           coalesce(nullif(btrim(t.data ->> 'title_field'), ''), 'name')  as tf,
           t.data -> 'row_label_expr' as fx
      from custom.record t
     where t.organization_id = any (v_orgs)
       and t.table_id = custom.table_kernel_id()
       and t.deleted_at is null
       and (p_table_ids is null or t.id = any (p_table_ids))
       and (p_include_platform_tables or not custom.table_kept_out_of_lists(t.data ->> 'kept_for'))
  ), c as (
    select r.id, r.table_id, r.organization_id, r.updated_at, t.nm,
           nullif(btrim(l.lbl), '') as name,
           case when v_q is null then 3
                when lower(l.lbl) = lower(v_q) then 0
                when lower(l.lbl) like lower(v_q) || '%' then 1
                when lower(l.lbl) like '% ' || lower(v_q) || '%' then 2
                else 3 end as rank
      from custom.record r
      join t on t.organization_id = r.organization_id and t.id = r.table_id
      -- ROW-LABEL-FORMULA: a Table with a row-label formula is searched, ranked and named by its
      -- result; every other Table keeps the single column (the CASE never calls the formula for it).
      cross join lateral (select case when t.fx is null then r.data ->> t.tf
                                      else coalesce(custom._row_label_text(r.organization_id, r.table_id, r.id, t.fx),
                                                    r.data ->> t.tf) end as lbl) l
     where r.organization_id = any (v_orgs)
       and r.data_class = 'record'
       and r.deleted_at is null
       and (v_like is null or l.lbl ilike v_like)
     order by 7, r.updated_at desc, r.id
     limit v_cap
  )
  select array_agg(c.id          order by c.rank, c.updated_at desc, c.id),
         array_agg(c.table_id    order by c.rank, c.updated_at desc, c.id),
         array_agg(c.organization_id order by c.rank, c.updated_at desc, c.id),
         array_agg(c.name        order by c.rank, c.updated_at desc, c.id),
         array_agg(c.nm          order by c.rank, c.updated_at desc, c.id),
         array_agg(c.updated_at  order by c.rank, c.updated_at desc, c.id)
    into v_ids, v_tids, v_oids, v_names, v_tnames, v_ats
    from c;
  if v_ids is null then
    return;
  end if;

  -- AN ORGANIZATION THAT TURNED THE STORE OFF lists nothing (custom.data_home_tables' rule), asked only
  -- of the organizations that hold candidates (a handful), never of every membership.
  v_open := array(select distinct x from unnest(v_oids) x where custom.store_is_open(x));

  -- THE ONE LIST RULE, once per candidate Table, best-ranked Table first. custom.listed_predicate_sql
  -- is the predicate every door that lists over a Table's rows is built from; a Table whose predicate
  -- refuses this reader (she may not know it) contributes nothing — the same as an invented id.
  -- THE WALK STOPS when the page is full: every Table not yet asked holds only rows ranked after its
  -- first candidate, so once the rows kept AHEAD of the next Table's first candidate fill the page,
  -- no unasked Table can change it.
  for v_pair in
    select u.o as org, u.t as tbl, min(u.n) as first_n,
           lead(min(u.n)) over (order by min(u.n)) as next_first_n
      from unnest(v_oids, v_tids) with ordinality as u(o, t, n)
     group by u.o, u.t
     order by min(u.n)
  loop
    continue when not (v_pair.org = any (v_open));
    begin
      execute format(
        'select coalesce(array_agg(r.id), ''{}''::uuid[]) from custom.record r '
        ' where r.organization_id = %L::uuid and r.table_id = %L::uuid and r.deleted_at is null '
        '   and r.id = any (%L::uuid[]) and %s',
        v_pair.org, v_pair.tbl,
        array(select u.i from unnest(v_ids, v_oids, v_tids) as u(i, o, t) where u.o = v_pair.org and u.t = v_pair.tbl),
        custom.listed_predicate_sql(v_me, v_pair.org, v_pair.tbl, 'viewer'::public.permission_level, 'r'))
        into v_part;
    exception when insufficient_privilege then
      v_part := '{}'::uuid[];
    end;
    v_kept := v_kept || coalesce(v_part, '{}'::uuid[]);
    v_pairs := v_pairs + 1;
    exit when v_pairs >= 200;
    exit when v_pair.next_first_n is not null
          and (select count(*) from unnest(v_ids) with ordinality as u(i, n)
                where u.n < v_pair.next_first_n and u.i = any (v_kept)) >= v_offset + v_limit;
  end loop;

  return query
    select u.id, u.tid, u.tnm, u.nm, u.oid, u.at
      from unnest(v_ids, v_tids, v_tnames, v_names, v_oids, v_ats) with ordinality as u(id, tid, tnm, nm, oid, at, n)
     where u.id = any (v_kept)
     order by u.n
    offset v_offset
     limit v_limit;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.reverse_links_many(p_organization_id uuid, p_table_id uuid, p_field_id uuid, p_record_ids uuid[], p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(record_id uuid, total integer, links jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_fx jsonb;
  v_source uuid;
  v_title  text;
  v_noun   text;
  v_me     uuid;
  v_pred   text;
  v_limit  integer := least(greatest(coalesce(p_limit, 10), 1), 50);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_n      integer := coalesce(cardinality(p_record_ids), 0);
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.reverse_links_many');
  perform custom.assert_may_know_table(p_organization_id, p_table_id, 'custom.reverse_links_many');
  if v_n > 200 then
    raise exception 'That is % records at once, and one call reads the links of up to 200.', v_n
      using errcode = '54000', hint = 'Send the records in groups of 200 or fewer.';
  end if;

  select c.source_table_id into v_source
    from custom.reverse_columns(p_organization_id, p_table_id) c
   where c.source_field_id = p_field_id;
  if v_source is null then
    raise exception 'That linked column is not one you can open on this table.'
      using errcode = '42501',
            hint = 'Open the table again to see the linked columns you have.';
  end if;

  select nullif(t.data ->> 'title_field', ''), lower(coalesce(nullif(btrim(t.data ->> 'label_singular'), ''), 'record')),
         t.data -> 'row_label_expr'
    into v_title, v_noun, v_fx
    from custom.record t
   where t.organization_id = p_organization_id and t.id = v_source;

  v_me := custom.query_principal();
  v_pred := case when v_me is null then 'true'
                 else custom.visible_predicate_sql(v_me, p_organization_id, v_source, 'viewer'::public.permission_level, 'r') end;

  -- THE PLAN IS FORCED BY SHAPE, NOT LEFT TO ESTIMATES. Measured on the clone: joining the edges to
  -- custom.record (or one CTE to another) let the planner pick a nested loop over every pair — 2,000
  -- links to one record took 6.4 s. So the edges are read first (one index range per record id), the
  -- linking records the caller may see are folded into ONE id -> title map, and each edge looks its
  -- title up in that map: linear in the links, whatever the estimates say.
  return query execute format($q$
    with ids as materialized (
      select distinct b.id as rid
        from unnest($4) u
        join custom.record b
          on b.organization_id = $1 and b.id = u and b.table_id = $9 and b.data_class = 'record'
    ), edges as materialized (
      select a.target_id as rid, a.source_id as sid, a.position, a.created_at
        from ids
        join platform.associations a
          on a.target_type = 'record'
         and a.target_id = ids.rid
         and a.deleted_at is null
         and a.organization_id = $1
         and a.relation_field_id = $3
    ), src as materialized (
      -- ONE ROW: {linking record id: its title}, only for the records the caller may see. A map,
      -- never a join back to the edges, so a record with thousands of links stays one pass.
      select coalesce(jsonb_object_agg(r.id::text, coalesce(to_jsonb(case when $10::jsonb is null then null
                                   else custom._row_label_text($1, $2, r.id, $10::jsonb) end), r.data -> $8)), '{}'::jsonb) as m
        from custom.record r
       where r.organization_id = $1
         and r.id = any (array(select distinct e.sid from edges e))
         and r.table_id = $2
         and r.data_class = 'record'
         and r.deleted_at is null
         and (%s)
    ), ranked as (
      -- The map is read once (a scalar subquery) and never carried in the rows being sorted.
      select e.rid, e.sid,
             row_number() over (partition by e.rid order by e.position nulls last, e.created_at, e.sid) as rn
        from edges e
       where (select src.m from src) ? e.sid::text
    ), per_record as (
      select k.rid,
             count(*)::integer as total,
             coalesce(jsonb_agg(jsonb_build_object('id', k.sid,
                                                   'words', custom._card_words($1, (select src.m from src) ->> k.sid::text, $7))
                                order by k.rn)
                        filter (where k.rn > $5 and k.rn <= $5 + $6), '[]'::jsonb) as links
        from ranked k
       group by k.rid
    )
    select ids.rid, coalesce(p.total, 0), coalesce(p.links, '[]'::jsonb)
      from ids
      left join per_record p on p.rid = ids.rid
  $q$, v_pred)
  using p_organization_id, v_source, p_field_id, p_record_ids, v_offset, v_limit, v_noun, coalesce(v_title, ''), p_table_id, v_fx;
end
$function$;

CREATE OR REPLACE FUNCTION custom.entity_back_links(p_organization_id uuid, p_token text, p_record_id uuid, p_limit integer DEFAULT 50, p_cursor text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_token  text := lower(btrim(coalesce(p_token, '')));
  v_limit  integer := coalesce(p_limit, 50);
  v_me     uuid;
  v_owner  boolean;
  v_kind   text;
  v_c_at   timestamptz;
  v_c_id   uuid;
  v_raw    text;
  v_items  jsonb;
  v_n      integer;
  v_next   text;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.entity_back_links');

  if v_token = '' or p_record_id is null then
    raise exception 'Name the record whose links you want: its kind and its id.'
      using errcode = '22023',
            hint = 'AP-4: custom.entity_back_links(organization, ''hr_employee'', <employee id>).';
  end if;
  if v_limit < 1 or v_limit > 200 then
    raise exception 'A page of links holds 1 to 200 rows, and this asked for %.', v_limit
      using errcode = '22023', hint = 'AP-4: ask a smaller page and follow next_cursor.';
  end if;

  select k.label into v_kind from custom.entity_reference_kinds() k where k.token = v_token;
  if v_kind is null then
    raise exception 'A custom row cannot link to "%": it is not a kind of platform thing a record may point at.', v_token
      using errcode = '22023',
            hint = 'select token, label from custom.entity_reference_kinds() lists every kind a link may name.';
  end if;

  if nullif(btrim(coalesce(p_cursor, '')), '') is not null then
    begin
      v_raw  := convert_from(decode(p_cursor, 'base64'), 'UTF8');
      v_c_at := split_part(v_raw, '|', 1)::timestamptz;
      v_c_id := split_part(v_raw, '|', 2)::uuid;
    exception when others then
      raise exception 'That page marker is not one this list gave out.'
        using errcode = '22023', hint = 'AP-4: pass next_cursor exactly as it came back, or null for the first page.';
    end;
    if v_c_at is null or v_c_id is null then
      raise exception 'That page marker is not one this list gave out.'
        using errcode = '22023', hint = 'AP-4: pass next_cursor exactly as it came back, or null for the first page.';
    end if;
  end if;

  v_me    := custom.query_principal();
  v_owner := custom.query_is_store_owner();

  -- THE TARGET, BEFORE ANY EDGE IS READ: a thing she may not open and an invented id say the same.
  if (v_me is null and not v_owner)
     or not custom._entity_reference_target_ok(p_organization_id, v_token, p_record_id) then
    raise exception 'There is no % you can open with that id.', lower(v_kind)
      using errcode = '02000',
            hint = 'DOOR-1: a record somebody has not shared with you is the same answer as a record that is not there.';
  end if;

  with page as (
    select a.id as edge_id, a.created_at as linked_at, a.role as field_key,
           r.id as rec_id, r.organization_id as rec_org, r.data as rec_data,
           t.id as table_id, t.data as table_data,
           f.id as field_id, f.data as field_data, ttl.title_type
      from platform.associations a
      join custom.record r
        on r.organization_id = a.organization_id and r.id = a.source_id
      join custom.record f
        on f.id = a.relation_field_id
      left join custom.record t
        on t.id = r.table_id
      left join lateral (
        select tf.data ->> 'type' as title_type
          from custom.record tf
         where tf.organization_id = r.organization_id
           and tf.table_id = custom.field_kernel_id()
           and tf.deleted_at is null
           and tf.data ->> 'entity_definition_id' = r.table_id::text
           and tf.data ->> 'key' = t.data ->> 'title_field'
         limit 1) ttl on true
     where a.target_type = v_token
       and a.target_id = p_record_id
       and a.deleted_at is null
       and a.source_type = 'record'
       and a.relation_field_id is not null
       and (v_c_at is null or (a.created_at, a.id) < (v_c_at, v_c_id))
       and r.deleted_at is null
       and r.data_class = 'record'
       and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
       and f.deleted_at is null
       and f.table_id = custom.field_kernel_id()
       and (v_owner
            or (v_me is not null
                and iam.has_access_for(v_me, 'record', r.id, 'viewer'::public.permission_level)
                and (custom.read_mask(r.organization_id, r.id, 'read') -> 'visible') ? a.role))
     order by a.created_at desc, a.id desc
     limit v_limit + 1
  ), numbered as (
    select p.*, row_number() over (order by p.linked_at desc, p.edge_id desc) as n from page p
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'record', jsonb_build_object(
              'token', 'record', 'id', x.rec_id,
              -- HR-360-2: a title typed into a plain text column is WORDS, never a pointer. A review's title is
              -- its reference (a uuid in a text field); read as a record id it came back as "A record you have
              -- not been given access to" for the very people the table names as readers. Only a title that
              -- lives in a relation-typed column is resolved (and withheld when it points at a hidden record).
              'label', coalesce(custom._row_label_text(x.rec_org, x.table_id, x.rec_id, x.table_data -> 'row_label_expr'),
                           case when x.title_type in ('text', 'long_text', 'email', 'phone', 'url')
                            and nullif(btrim(coalesce(x.rec_data ->> (x.table_data ->> 'title_field'), '')), '') is not null
                            then case when (x.rec_data ->> (x.table_data ->> 'title_field')) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                                      then coalesce(nullif(x.table_data ->> 'label_singular', ''), nullif(x.table_data ->> 'name', ''), 'record')
                                      else x.rec_data ->> (x.table_data ->> 'title_field') end
                            else custom._card_words(x.rec_org,
                                   coalesce(x.rec_data ->> (x.table_data ->> 'title_field'),
                                            (select l.cached_title from custom.external_link l
                                              where l.record_id = x.rec_id and l.organization_id = x.rec_org
                                              limit 1)),
                                   'record') end)),
           'table_id',        x.table_id,
           'table_label',     x.table_data ->> 'name',
           'field_id',        x.field_id,
           'field_key',       x.field_key,
           'field_label',     coalesce(nullif(x.field_data ->> 'label', ''), nullif(x.field_data ->> 'name', ''), x.field_key),
           'organization_id', x.rec_org,
           'linked_at',       x.linked_at)
           order by x.linked_at desc, x.edge_id desc) filter (where x.n <= v_limit), '[]'::jsonb),
         count(*),
         max(x.linked_at::text || '|' || x.edge_id::text) filter (where x.n = v_limit)
    into v_items, v_n, v_raw
    from numbered x;

  -- A NEXT PAGE EXISTS ONLY WHEN ONE MORE ROW THAN ASKED WAS FOUND; its marker is the last row shown.
  if v_n > v_limit then
    v_next := replace(encode(convert_to(v_raw, 'UTF8'), 'base64'), E'\n', '');
  end if;

  return jsonb_build_object(
    'target', jsonb_build_object('token', v_token, 'id', p_record_id,
                                 'label', platform.relation_label(p_organization_id, v_token, p_record_id)),
    'items', v_items,
    'next_cursor', v_next);
end
$function$;

CREATE OR REPLACE FUNCTION custom.agg_record_name(p_organization_id uuid, p_record_id uuid, p_state jsonb DEFAULT NULL::jsonb)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_state jsonb := p_state;
  v_noun  text;
  v_raw   text;
  v_out   text;
  v_fx    text;
begin
  -- A SUMMARY NAMES THINGS. "3 records changed" is a number; "Dana Whitfield,
  -- Marcus Reyes and one more arrived" is a notification somebody acts on, which
  -- is the whole difference between this and a dashboard tile.
  if p_record_id is null then return null; end if;

  -- The Table's own word for one of its records, and its own title column. Both
  -- are read from the record's Table rather than guessed, which is the whole of
  -- TAILS-2's finding.
  select lower(nullif(btrim(coalesce(t.data ->> 'label_singular', '')), '')),
         nullif(btrim(coalesce(t.data ->> 'title_field', '')), '')
    into v_noun, v_raw
    from custom.record r
    join custom.record t on t.organization_id = r.organization_id and t.id = r.table_id
   where r.organization_id = p_organization_id and r.id = p_record_id;

  -- ROW-LABEL-FORMULA: a Table that names its records by a formula names them so here too.
  select custom._row_label_text(r.organization_id, r.table_id, r.id, t.data -> 'row_label_expr') into v_fx
    from custom.record r
    join custom.record t on t.organization_id = r.organization_id and t.id = r.table_id
   where r.organization_id = p_organization_id and r.id = p_record_id;
  if v_fx is not null then
    return left(v_fx, 120);
  end if;

  if v_state is null then
    select r.data into v_state from custom.record r
     where r.organization_id = p_organization_id and r.id = p_record_id;
  end if;

  if v_state is not null then
    -- THE TABLE'S OWN TITLE COLUMN FIRST. `v_raw` still holds its key here.
    select coalesce(
             case when v_raw is null then null
                  else case when jsonb_typeof(v_state -> v_raw) = 'object' and (v_state -> v_raw) ? 'value'
                            then nullif(v_state -> v_raw ->> 'value', '')
                            else nullif(v_state ->> v_raw, '') end end,
             case when jsonb_typeof(v_state -> 'title') = 'object' and (v_state -> 'title') ? 'value'
                  then nullif(v_state -> 'title' ->> 'value', '') else nullif(v_state ->> 'title', '') end,
             case when jsonb_typeof(v_state -> 'name') = 'object' and (v_state -> 'name') ? 'value'
                  then nullif(v_state -> 'name' ->> 'value', '') else nullif(v_state ->> 'name', '') end,
             case when jsonb_typeof(v_state -> 'label') = 'object' and (v_state -> 'label') ? 'value'
                  then nullif(v_state -> 'label' ->> 'value', '') else nullif(v_state ->> 'label', '') end,
             case when jsonb_typeof(v_state -> 'full_name') = 'object' and (v_state -> 'full_name') ? 'value'
                  then nullif(v_state -> 'full_name' ->> 'value', '') else nullif(v_state ->> 'full_name', '') end,
             case when jsonb_typeof(v_state -> 'donor_name') = 'object' and (v_state -> 'donor_name') ? 'value'
                  then nullif(v_state -> 'donor_name' ->> 'value', '') else nullif(v_state ->> 'donor_name', '') end,
             case when jsonb_typeof(v_state -> 'customer_name') = 'object' and (v_state -> 'customer_name') ? 'value'
                  then nullif(v_state -> 'customer_name' ->> 'value', '') else nullif(v_state ->> 'customer_name', '') end,
             case when jsonb_typeof(v_state -> 'member_name') = 'object' and (v_state -> 'member_name') ? 'value'
                  then nullif(v_state -> 'member_name' ->> 'value', '') else nullif(v_state ->> 'member_name', '') end,
             case when jsonb_typeof(v_state -> 'company') = 'object' and (v_state -> 'company') ? 'value'
                  then nullif(v_state -> 'company' ->> 'value', '') else nullif(v_state ->> 'company', '') end,
             case when jsonb_typeof(v_state -> 'subject') = 'object' and (v_state -> 'subject') ? 'value'
                  then nullif(v_state -> 'subject' ->> 'value', '') else nullif(v_state ->> 'subject', '') end,
             case when jsonb_typeof(v_state -> 'email') = 'object' and (v_state -> 'email') ? 'value'
                  then nullif(v_state -> 'email' ->> 'value', '') else nullif(v_state ->> 'email', '') end,
             custom._first_words(v_state))
      into v_out;

    if v_out is not null then
      -- ONE HOP, UNDER THE LADDER. A title column that is a relation holds the
      -- other record's id; `_card_words` resolves exactly one hop, refuses to
      -- name a record this subscriber may not see, and never prints a uuid.
      return left(custom._card_words(p_organization_id, v_out, coalesce(v_noun, 'record')), 120);
    end if;
  end if;

  -- The state held no words at all — ask the live row, through the one resolver.
  v_out := custom.record_words(p_organization_id, p_record_id, coalesce(v_noun, 'record'));
  return left(coalesce(v_out, 'an untitled ' || coalesce(v_noun, 'record')), 120);
end;
$function$;

CREATE OR REPLACE FUNCTION platform.relation_label(p_organization_id uuid, p_target_type text, p_target_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_title text;
  v_col   text;
  v_sch   text;
  v_tab   text;
  v_me    uuid;
begin
  -- REL-14. The label is READ, never stored on the edge.
  --
  -- THE FAR END OF A RELATION IS A DIFFERENT RECORD, IN A DIFFERENT TABLE, AND THE READER MAY
  -- NOT HOLD IT. Until now this function answered the title to anybody who could call it, so
  -- the reverse side of a shared record told a member the names of records nobody had shared
  -- with her. The access question is asked BEFORE the title is read, and a reader who may not
  -- open the target is told so in words — `platform.relation_withheld_label()` — never given
  -- the title and never handed the bare id.
  perform custom.assert_client_may_reach(p_organization_id, 'platform.relation_label');

  v_me := custom.query_principal();

  if p_target_type = 'record' then
    if v_me is not null
       and not custom.query_is_store_owner()
       and exists (select 1 from custom.record r
                    where r.organization_id = p_organization_id and r.id = p_target_id)
       and not custom.has_visibility(v_me, 'record', p_target_id, 'viewer'::public.permission_level) then
      return platform.relation_withheld_label();
    end if;
    select coalesce(custom._row_label_text(r.organization_id, r.table_id, r.id, t.data -> 'row_label_expr'),
                    r.data ->> (t.data ->> 'title_field')) into v_title
      from custom.record r
      join custom.record t on t.id = r.table_id
     where r.id = p_target_id and r.deleted_at is null
       and (r.organization_id = p_organization_id or r.data_class = 'kernel')
     limit 1;
    if v_title is null then
      select l.cached_title into v_title
        from custom.external_link l
       where l.record_id = p_target_id and l.organization_id = p_organization_id
       limit 1;
    end if;
    if v_title is not null then
      v_title := custom._card_words(p_organization_id, v_title, 'record');
    end if;
    return v_title;
  end if;

  select e.schema_name, e.table_name, nullif(e.title_column, '')
    into v_sch, v_tab, v_col
    from platform.entity_types e
   where e.token = p_target_type
   limit 1;
  -- SCOPES-READS-ACCESS (2026-10-05): read where the rows live now (a scope from the record store).
  select s.schema_name, s.table_name into v_sch, v_tab from platform.entity_read_source(p_target_type) s;
  if v_col is null or v_sch is null or v_tab is null then
    return null;
  end if;

  -- ARGS-RULED (2026-09-21). THE SAME DECISION THE RECORD ARM MAKES, ASKED OF THE KERNEL THAT
  -- OWNS THIS TOKEN — and asked BEFORE the row is read, so a target the reader may not hold and
  -- an invented id answer the same sentence. `p_target_id` was, until this line, an id this
  -- door read out of whatever table `p_target_type` named, in whatever organization it lived in.
  if v_me is not null
     and not custom.query_is_store_owner()
     and not iam.has_access(p_target_type, p_target_id, 'viewer'::public.permission_level) then
    return platform.relation_withheld_label();
  end if;

  execute format('select %I::text from %I.%I where id = $1 limit 1', v_col, v_sch, v_tab)
    into v_title using p_target_id;
  return v_title;
end;
$function$;

-- The door rows FIRST, then the grants (platform.enforce_definer_client_grants fires on the grant).

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers, argument_rules)
values
  ('custom', 'table_row_label', 'p_organization_id uuid, p_table_id uuid',
   array['uuid'::regtype::oid, 'uuid'::regtype::oid],
   'How a Table names its records: the row-label formula it keeps (if any), the title column it falls back to, which of them is in force, whether the formula still reads and whether the caller may change it. Viewer rung on the Table; writes nothing.',
   'rowlabel_a_a_table_names_its_records_by_a_formula.sql', null, true, false,
   jsonb_build_object('version', '1', 'arguments', jsonb_build_object(
     'p_organization_id', jsonb_build_object('foreign', jsonb_build_object('bounded', true,
       'note', 'custom.assert_store_door decides it first; every row is read in this organization only.')),
     'p_table_id', jsonb_build_object('foreign', jsonb_build_object('bounded', true,
       'note', 'Read only as a Table of p_organization_id; custom.assert_may_know_table decides the viewer rung on it.'))))),
  ('custom', 'table_row_label_set', 'p_organization_id uuid, p_table_id uuid, p_formula text',
   array['uuid'::regtype::oid, 'uuid'::regtype::oid, 'text'::regtype::oid],
   'Set or clear the formula a Table names its records by ({First} & " " & {Last}). Parsed by custom.formula_parse against the Table''s own columns - an unknown column is refused in words and nothing is written; a blank formula clears it. The maker of the Table or someone with full access.',
   'rowlabel_a_a_table_names_its_records_by_a_formula.sql', null, true, false,
   jsonb_build_object('version', '1', 'arguments', jsonb_build_object(
     'p_organization_id', jsonb_build_object('foreign', jsonb_build_object('bounded', true,
       'note', 'custom.assert_store_door and custom.assert_client_may_reach decide it first; every row is read in this organization only.')),
     'p_table_id', jsonb_build_object('foreign', jsonb_build_object('bounded', true,
       'note', 'Read only as a Table of p_organization_id; the maker or full access (iam.has_access admin) decides any change.')),
     'p_formula', jsonb_build_object('type', 'text', 'check', 'at most 2000 characters; parsed by custom.formula_parse against the Table''s own columns; nothing is stored unless it parses.',
       'foreign', jsonb_build_object('not_a_leak', true)))));

grant execute on function custom.table_row_label(uuid, uuid) to authenticated;
grant execute on function custom.table_row_label_set(uuid, uuid, text) to authenticated;
