-- additive: yes
-- Replaces two function bodies (custom.entity_reference_search, platform.relation_label) and adds one internal helper. No table, trigger, policy or row is touched; locks nothing.
-- GRANT NAMED: none. The helper custom._entity_reference_fallback_label is a pure string function (reads no table, writes nothing); the two replaced doors keep their declared grants.
-- lane: LINK-PICKER
-- lock: custom,platform
-- Inverse: migrations/inverse/20261021250000_linkpicker_a_every_linkable_kind_can_be_searched_or_says_why_not_down.sql
-- based-on: custom.entity_reference_search(uuid, text[], text, integer) 3ca9b9ccaf879add701ec761f1ddeecfd44fb9b864c6ebd102532cf52894b386
-- based-on: platform.relation_label(uuid, text, uuid) a35a5a976bdee73636ef53b1acf331e986ce91ba0e9ddcb7bdf703a092b5a7c1
set local lock_timeout = '3s';
--
-- THE DEFECT (live, 2026-10-20). On a custom-table row page, "Pick" on a column pointing at "Pay period"
-- opened a picker that listed nothing. custom.entity_reference_search read the kind's title column
-- straight into format('%I', title) and the registry has NO title column for 917 of the 1104 kinds a
-- record can now link to (cfwrite_c_b made every kind with a row id a link target), so the call died with
-- "null values cannot be formatted as an SQL identifier"; another ~70 kinds died in
-- public.reference_search_candidates ("not reference-pickable with a title column"), 2 read a table that
-- is not where the rows live now (context.scope_types), and the picker then said "There is no pay period
-- you can open yet" under the refusal.
--
-- THE CLASS FIX. The search no longer assumes a title column.
--   * A kind with a usable title column and the pickable flag: the two reference-search ways in, as before.
--   * A kind with a usable title column, not flagged pickable: only the kind's own table, by title.
--   * A kind with NO title column: its own table (where platform.entity_read_source says the rows live),
--     the candidates being the rows the person made, the rows of the organization asked, and the rows
--     granted to them by id (iam.accessible_entity_candidates), each named by a label made of the kind's
--     words, the creation day and the first eight characters of the id (custom._entity_reference_fallback_label).
--   * EVERY candidate still passes custom._entity_reference_target_ok (live + iam.has_access). Nothing widens.
--   * A kind that has no table to list (or no id column) is refused BY NAME, in words, when no asked kind
--     can be searched; when others can, those answer and the refusal is not hidden by an empty list.
-- platform.relation_label gives the same fallback label to a kind with no title column (after the access
-- check), so a saved link reads as the thing, not as "something you have not been given access to".

create or replace function custom._entity_reference_fallback_label(p_kind_label text, p_created timestamptz, p_id uuid)
  returns text
  language sql
  immutable
  set search_path to 'pg_catalog'
as $function$
  select coalesce(nullif(btrim(p_kind_label), ''), 'Record') || ' · '
      || case when p_created is null then '' else to_char(p_created at time zone 'UTC', 'YYYY-MM-DD') || ' · ' end
      || left(p_id::text, 8)
$function$;

create or replace function custom.entity_reference_search(
  p_organization_id uuid,
  p_tokens text[],
  p_search text default null,
  p_limit integer default 20
) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path to 'pg_catalog'
as $function$
declare
  v_limit   integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_tokens  text[];
  v_bad     text;
  v_token   text;
  v_out     jsonb := '[]'::jsonb;
  v_found   jsonb;
  v_sch     text;
  v_tab     text;
  v_title   text;
  v_label   text;
  v_pick    boolean;
  v_rel     regclass;
  v_has_title boolean;
  v_extra   text;
  v_where   text;
  v_rows    jsonb;
  v_me      uuid := custom.query_principal();
  v_acc     uuid[];
  v_created text;
  v_searched integer := 0;
  v_why     text[] := '{}';
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.entity_reference_search');
  select coalesce(array_agg(distinct lower(btrim(t))), '{}') into v_tokens
    from unnest(coalesce(p_tokens, '{}')) as u(t)
   where nullif(btrim(t), '') is not null;
  if cardinality(v_tokens) = 0 then
    return '[]'::jsonb;
  end if;
  if cardinality(v_tokens) > 40 then
    raise exception 'At most 40 kinds are searched in one call, and this asked for %.', cardinality(v_tokens)
      using errcode = '22023', hint = 'REFERENCE-CARRY: narrow the kinds, or search one kind at a time.';
  end if;
  select t into v_bad
    from unnest(v_tokens) as u(t)
   where not exists (select 1 from custom.entity_reference_kinds() k where k.token = u.t)
   limit 1;
  if v_bad is not null then
    raise exception 'A reference cannot point at "%": it is not a kind of platform thing a record may point at.', v_bad
      using errcode = '22023',
            hint = 'REFERENCE-CARRY: the kinds are custom.entity_reference_kinds(). A file is a File column and a person a Person column.';
  end if;

  foreach v_token in array v_tokens loop
    select e.title_column, e.label, coalesce(e.reference_pickable, false)
      into v_title, v_label, v_pick
      from platform.entity_types e where e.token = v_token and e.is_active;
    -- Where the rows live NOW (a scope or context item is read from the record store, not its old table).
    select s.schema_name, s.table_name into v_sch, v_tab from platform.entity_read_source(v_token) s;
    v_rel := case when v_sch is null or v_tab is null then null else to_regclass(format('%I.%I', v_sch, v_tab)) end;
    if v_rel is null or not exists (select 1 from pg_attribute a where a.attrelid = v_rel and a.attname = 'id' and a.attnum > 0 and not a.attisdropped) then
      v_why := v_why || format('%s has no table of its own to list', coalesce(v_label, v_token));
      continue;
    end if;
    v_has_title := nullif(v_title, '') is not null
                   and exists (select 1 from pg_attribute a where a.attrelid = v_rel and a.attname = v_title and a.attnum > 0 and not a.attisdropped);
    v_searched := v_searched + 1;

    v_extra := '';
    if exists (select 1 from pg_attribute a where a.attrelid = v_rel and a.attname = 'deleted_at' and not a.attisdropped) then
      v_extra := v_extra || ' and t.deleted_at is null';
    end if;
    if exists (select 1 from pg_attribute a where a.attrelid = v_rel and a.attname = 'canonical_id' and not a.attisdropped) then
      v_extra := v_extra || ' and t.canonical_id is null';
    end if;
    v_created := case when exists (select 1 from pg_attribute a where a.attrelid = v_rel and a.attname = 'created_at' and not a.attisdropped)
                      then 't.created_at' else 'null::timestamptz' end;

    if v_has_title then
      -- THE KIND'S OWN TABLE, BY TITLE (platform catalogue rows: public AI models, system agents ...).
      if nullif(btrim(p_search), '') is not null then
        v_extra := v_extra || format(' and t.%I::text ilike %L', v_title, '%' || btrim(p_search) || '%');
      end if;
      execute format('select coalesce(jsonb_agg(jsonb_build_object(''id'', s.id, ''title'', s.title)), ''[]''::jsonb) from (select t.id, t.%I::text as title from %s t where t.%I is not null%s order by t.%I limit %s) s',
                     v_title, v_rel, v_title, v_extra, v_title, v_limit * 10)
        into v_rows;
    else
      -- NO TITLE COLUMN: the rows the person made, the organization's own, and what is granted to them by id.
      v_acc := iam.accessible_entity_candidates(v_token);
      v_where := format('t.id = any(%L::uuid[])', v_acc);
      if exists (select 1 from pg_attribute a where a.attrelid = v_rel and a.attname = 'organization_id' and not a.attisdropped) then
        v_where := v_where || format(' or t.organization_id = %L', p_organization_id);
      end if;
      if v_me is not null and exists (select 1 from pg_attribute a where a.attrelid = v_rel and a.attname = 'created_by' and not a.attisdropped) then
        v_where := v_where || format(' or t.created_by = %L', v_me);
      end if;
      if nullif(btrim(p_search), '') is not null then
        v_extra := v_extra || format(' and (custom._entity_reference_fallback_label(%L, %s, t.id) ilike %L)', coalesce(v_label, v_token), v_created, '%' || btrim(p_search) || '%');
      end if;
      execute format('select coalesce(jsonb_agg(jsonb_build_object(''id'', s.id, ''title'', s.title)), ''[]''::jsonb) from (select t.id, custom._entity_reference_fallback_label(%L, %s, t.id) as title from %s t where (%s)%s order by %s desc nulls last, t.id limit %s) s',
                     coalesce(v_label, v_token), v_created, v_rel, v_where, v_extra,
                     case when v_created = 't.created_at' then 't.created_at' else 't.id' end, v_limit * 10)
        into v_rows;
    end if;

    -- ONE GATE. The reference search's two ways in (what the person made or what lives in their
    -- organizations; what is granted by id) exist only for a kind with a title column that is flagged
    -- pickable; every candidate then passes custom._entity_reference_target_ok (iam.has_access).
    if v_has_title and v_pick then
      select coalesce(jsonb_agg(jsonb_build_object('token', v_token, 'id', c.id, 'label', c.title)), '[]'::jsonb)
        into v_found
        from (
          select r.id, r.title
            from (
              select a.id, a.title
                from public.reference_search_candidates(v_token, nullif(btrim(p_search), ''), v_limit * 4, null) as a(id, title)
              union
              select b.id, b.title
                from public.reference_search_candidates(v_token, nullif(btrim(p_search), ''), v_limit,
                                                        iam.accessible_entity_candidates(v_token)) as b(id, title)
              union
              select c2.id, c2.title from jsonb_to_recordset(v_rows) as c2(id uuid, title text)
            ) r
           where custom._entity_reference_target_ok(p_organization_id, v_token, r.id)
           order by lower(r.title), r.id
           limit v_limit
        ) c;
    else
      select coalesce(jsonb_agg(jsonb_build_object('token', v_token, 'id', c.id, 'label', c.title)), '[]'::jsonb)
        into v_found
        from (
          select r.id, r.title
            from jsonb_to_recordset(v_rows) as r(id uuid, title text)
           where custom._entity_reference_target_ok(p_organization_id, v_token, r.id)
           order by case when v_has_title then lower(r.title) end, r.title desc, r.id
           limit v_limit
        ) c;
    end if;
    v_out := v_out || v_found;
  end loop;

  -- Nothing could even be searched: say why, never an empty list.
  if v_searched = 0 and cardinality(v_why) > 0 then
    raise exception '%. A link to it cannot be picked from here yet.', array_to_string(v_why, '; ')
      using errcode = '22023', hint = 'LINK-PICKER: the kind registry names no readable table with an id column for this kind.';
  end if;

  -- One list, by title, the first p_limit of every kind asked.
  select coalesce(jsonb_agg(x order by lower(x ->> 'label'), x ->> 'token', x ->> 'id'), '[]'::jsonb)
    into v_out
    from (select x from jsonb_array_elements(v_out) as e(x) order by lower(x ->> 'label') limit v_limit) s;
  return v_out;
end
$function$;


create or replace function platform.relation_label(p_organization_id uuid, p_target_type text, p_target_id uuid)
 returns text
 language plpgsql
 stable security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_title text;
  v_col   text;
  v_sch   text;
  v_tab   text;
  v_me    uuid;
  v_kind  text;
  v_rel   regclass;
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

  select e.schema_name, e.table_name, nullif(e.title_column, ''), e.label
    into v_sch, v_tab, v_col, v_kind
    from platform.entity_types e
   where e.token = p_target_type
   limit 1;
  -- SCOPES-READS-ACCESS (2026-10-05): read where the rows live now (a scope from the record store).
  select s.schema_name, s.table_name into v_sch, v_tab from platform.entity_read_source(p_target_type) s;
  if v_sch is null or v_tab is null then
    return null;
  end if;
  v_rel := to_regclass(format('%I.%I', v_sch, v_tab));
  if v_rel is null then
    return null;
  end if;
  -- LINK-PICKER: a kind with no title column in the registry (917 of the kinds a record can link to)
  -- still names its rows — by the same fallback label the picker lists them under — never null.
  if v_col is not null and not exists (select 1 from pg_attribute a where a.attrelid = v_rel and a.attname = v_col and a.attnum > 0 and not a.attisdropped) then
    v_col := null;
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

  if v_col is null then
    if not exists (select 1 from pg_attribute a where a.attrelid = v_rel and a.attname = 'id' and a.attnum > 0 and not a.attisdropped) then
      return null;
    end if;
    execute format('select custom._entity_reference_fallback_label(%L, %s, id) from %s where id = $1 limit 1',
                   coalesce(v_kind, p_target_type),
                   case when exists (select 1 from pg_attribute a where a.attrelid = v_rel and a.attname = 'created_at' and not a.attisdropped)
                        then 'created_at' else 'null::timestamptz' end,
                   v_rel)
      into v_title using p_target_id;
    return v_title;
  end if;

  execute format('select %I::text from %I.%I where id = $1 limit 1', v_col, v_sch, v_tab)
    into v_title using p_target_id;
  return v_title;
end;
$function$;
