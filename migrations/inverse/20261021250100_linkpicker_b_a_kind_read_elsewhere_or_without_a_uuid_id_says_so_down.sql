-- INVERSE of migrations/campaign/20261021250100_linkpicker_b_a_kind_read_elsewhere_or_without_a_uuid_id_says_so.sql (lane LINK-PICKER): restores both bodies as they were after linkpicker_a.
-- chair-step: restores two function bodies.
-- lock: custom
-- based-on: custom.entity_reference_search(uuid, text[], text, integer) d0fff7961fb40b9c90c46cbdc89d4b030c024429d043d39a5df9bd74a610c4ba
-- based-on: custom._entity_reference_target_ok(uuid, text, uuid) f5ba6fe64a2e89ebe894b7c906b73af4a9ddc532a45dc281ca8d4eec396c77d0
set local lock_timeout = '3s';

CREATE OR REPLACE FUNCTION custom.entity_reference_search(p_organization_id uuid, p_tokens text[], p_search text DEFAULT NULL::text, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
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

CREATE OR REPLACE FUNCTION custom._entity_reference_target_ok(p_organization_id uuid, p_token text, p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_sch  text;
  v_tab  text;
  v_sd   boolean;
  v_live boolean;
  v_me   uuid;
begin
  if p_organization_id is null or nullif(p_token, '') is null or p_id is null then
    return false;
  end if;
  if not exists (select 1 from platform.association_types r
                  where r.source_type = 'record' and r.target_type = p_token
                    and r.target_type <> 'record' and r.is_active) then
    return false;
  end if;
  select e.schema_name, e.table_name into v_sch, v_tab
    from platform.entity_types e where e.token = p_token and e.is_active;
  if v_sch is null then
    return false;
  end if;
  select exists (select 1 from pg_attribute a
                  where a.attrelid = format('%I.%I', v_sch, v_tab)::regclass
                    and a.attname = 'deleted_at' and not a.attisdropped)
    into v_sd;
  execute format('select exists (select 1 from %I.%I where id = $1%s)', v_sch, v_tab,
                 case when v_sd then ' and deleted_at is null' else '' end)
     into v_live using p_id;
  if not coalesce(v_live, false) then
    return false;
  end if;
  v_me := custom.query_principal();
  if v_me is not null and not custom.query_is_store_owner() then
    return coalesce(iam.has_access(p_token, p_id, 'viewer'::public.permission_level), false);
  end if;
  return true;
end
$function$;
