-- INVERSE of migrations/campaign/20261021250000_linkpicker_a_every_linkable_kind_can_be_searched_or_says_why_not.sql (lane LINK-PICKER): restores both bodies as they were and drops the helper.
-- chair-step: restores two function bodies, drops one function.
-- lock: custom,platform
-- based-on: custom.entity_reference_search(uuid, text[], text, integer) 9bb0747c2454fb7eb82f57470875d37e5dc33acfb5dea8ae6ebeae3e6c7cd325
-- based-on: platform.relation_label(uuid, text, uuid) 4f6439b3a5dacf14154469dfc8009b0a1f2c50e6b35bce33c9f25a2126c5548c
set local lock_timeout = '3s';


CREATE OR REPLACE FUNCTION custom.entity_reference_search(p_organization_id uuid, p_tokens text[], p_search text DEFAULT NULL::text, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_limit  integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_tokens text[];
  v_bad    text;
  v_token  text;
  v_out    jsonb := '[]'::jsonb;
  v_found  jsonb;
  v_sch    text;
  v_tab    text;
  v_title  text;
  v_extra  text;
  v_any    text;
  v_rows   jsonb;
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
    -- THE THIRD WAY IN (lane REFERENCE-CARRY, after the owner-seat walk found no AI model): a
    -- platform catalogue row (an AI model, a system agent) is neither the person's, nor in their
    -- organizations, nor granted to them by id — it is readable because it is public. So the kind's
    -- own table is searched by its title too, and the one gate below (iam.has_access through
    -- custom._entity_reference_target_ok) decides; read ten times deeper than asked. The statement is
    -- built only from the registry (schema, table, title column quoted %I; the words %L).
    select e.schema_name, e.table_name, e.title_column into v_sch, v_tab, v_title
      from platform.entity_types e where e.token = v_token and e.is_active;
    -- SCOPES-READS-ACCESS (2026-10-05): read where the rows live now (a scope from the record store).
    select s.schema_name, s.table_name into v_sch, v_tab from platform.entity_read_source(v_token) s;
    v_extra := '';
    if exists (select 1 from information_schema.columns c where c.table_schema = v_sch and c.table_name = v_tab and c.column_name = 'deleted_at') then
      v_extra := v_extra || ' and t.deleted_at is null';
    end if;
    if exists (select 1 from information_schema.columns c where c.table_schema = v_sch and c.table_name = v_tab and c.column_name = 'canonical_id') then
      v_extra := v_extra || ' and t.canonical_id is null';
    end if;
    if nullif(btrim(p_search), '') is not null then
      v_extra := v_extra || format(' and t.%I::text ilike %L', v_title, '%' || btrim(p_search) || '%');
    end if;
    v_any := format('select t.id, t.%I::text as title from %I.%I t where t.%I is not null%s order by t.%I limit %s',
                    v_title, v_sch, v_tab, v_title, v_extra, v_title, v_limit * 10);
    execute format('select coalesce(jsonb_agg(jsonb_build_object(''id'', s.id, ''title'', s.title)), ''[]''::jsonb) from (%s) s', v_any)
      into v_rows;

    -- TWO WAYS IN, ONE GATE. The platform's reference search enumerates what the person made or what
    -- lives in an organization they belong to; that is only a candidate list (organization is
    -- tenancy, never permission). Things SHARED with them from anywhere come in by id
    -- (iam.accessible_entity_candidates — grants, memberships, reach), searched by the same words.
    -- Every candidate then passes the store's own write check, which asks iam.has_access. The first
    -- list is read four times deeper than asked so the gate rarely leaves it short.
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
            select c.id, c.title from jsonb_to_recordset(v_rows) as c(id uuid, title text)
          ) r
         where custom._entity_reference_target_ok(p_organization_id, v_token, r.id)
         order by lower(r.title), r.id
         limit v_limit
      ) c;
    v_out := v_out || v_found;
  end loop;

  -- One list, by title, the first p_limit of every kind asked.
  select coalesce(jsonb_agg(x order by lower(x ->> 'label'), x ->> 'token', x ->> 'id'), '[]'::jsonb)
    into v_out
    from (select x from jsonb_array_elements(v_out) as e(x) order by lower(x ->> 'label') limit v_limit) s;
  return v_out;
end
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

drop function if exists custom._entity_reference_fallback_label(text, timestamptz, uuid);
