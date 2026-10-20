-- Inverse of migrations/campaign/20261021270000_accessbatchagree_a_the_picker_gate_is_one_rule_in_set_form.sql: the three bodies as they were, and the two internal functions dropped.
set local lock_timeout = '3s';
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
  select s.schema_name, s.table_name into v_sch, v_tab
    from platform.entity_types e, platform.entity_read_source(p_token) s
   where e.token = p_token and e.is_active;
  if v_sch is null or v_tab is null or to_regclass(format('%I.%I', v_sch, v_tab)) is null then
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
  v_pairs   jsonb;
  v_n       integer;
  v_scanned integer;
  v_sql     text;
  r         record;
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
    if v_rel is null then
      v_why := v_why || format('%s has no table of its own to list', coalesce(v_label, v_token));
      continue;
    end if;
    if not exists (select 1 from pg_attribute a where a.attrelid = v_rel and a.attname = 'id' and a.atttypid = 'uuid'::regtype and a.attnum > 0 and not a.attisdropped) then
      v_why := v_why || format('%s is not identified by a uuid, which a link needs', coalesce(v_label, v_token));
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

    v_pairs := '[]'::jsonb;
    v_n := 0;
    if v_has_title then
      -- THE KIND'S OWN TABLE, BY TITLE (platform catalogue rows: public AI models, system agents ...).
      if nullif(btrim(p_search), '') is not null then
        v_extra := v_extra || format(' and t.%I::text ilike %L', v_title, '%' || btrim(p_search) || '%');
      end if;
      v_sql := format('select t.id, t.%I::text as title from %s t where t.%I is not null%s order by t.%I, t.id limit %s',
                      v_title, v_rel, v_title, v_extra, v_title, v_limit * 10);
    else
      -- NO TITLE COLUMN: the rows the person made, the organization's own, and what is granted to them by id.
      -- The granted ids are a SUPERSET (custom._entity_reference_granted_ids: no container walk); the gate below
      -- is what decides, one row at a time, and stops at the first p_limit that pass.
      v_acc := custom._entity_reference_granted_ids(v_token);
      v_where := 't.id = any($1)';
      if exists (select 1 from pg_attribute a where a.attrelid = v_rel and a.attname = 'organization_id' and not a.attisdropped) then
        v_where := v_where || format(' or t.organization_id = %L', p_organization_id);
      end if;
      if v_me is not null and exists (select 1 from pg_attribute a where a.attrelid = v_rel and a.attname = 'created_by' and not a.attisdropped) then
        v_where := v_where || format(' or t.created_by = %L', v_me);
      end if;
      if nullif(btrim(p_search), '') is not null then
        v_extra := v_extra || format(' and (custom._entity_reference_fallback_label(%L, %s, t.id) ilike %L)', coalesce(v_label, v_token), v_created, '%' || btrim(p_search) || '%');
      end if;
      v_sql := format('select t.id, custom._entity_reference_fallback_label(%L, %s, t.id) as title from %s t where (%s)%s order by %s desc nulls last, t.id limit %s',
                      coalesce(v_label, v_token), v_created, v_rel, v_where, v_extra,
                      case when v_created = 't.created_at' then 't.created_at' else 't.id' end, v_limit * 10);
    end if;

    -- ONE GATE, ASKED LAZILY. Every candidate passes custom._entity_reference_target_ok (iam.has_access), in list
    -- order, and the walk STOPS at the first p_limit that pass: the access check runs on a screenful of rows,
    -- never on every row the person could possibly reach (agent: 3.4 s of container walks before this).
    v_scanned := 0;
    for r in execute v_sql using v_acc loop
      v_scanned := v_scanned + 1;
      if custom._entity_reference_target_ok(p_organization_id, v_token, r.id) then
        v_pairs := v_pairs || jsonb_build_array(jsonb_build_object('id', r.id, 'title', r.title));
        v_n := v_n + 1;
        exit when v_n >= v_limit;
      end if;
    end loop;
    -- The walk above is in list order through the access gate, so when it fills a screenful (or reaches the end of
    -- the table) it IS the answer. Only when it stopped short at the scan window does a kind with a title column that
    -- is flagged pickable try the reference search's two ways in: what the person made or what lives in their
    -- organizations (paged lazily through the reference search), and what is granted by id (the kind's own table
    -- restricted to the granted ids, walked lazily; the reference search's own by-id way gates EVERY id before it
    -- sorts, 14.6 s for agent).
    if v_has_title and v_pick and v_n < v_limit and v_scanned >= v_limit * 10 then
      v_pairs := v_pairs
        || coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'title', l.title))
                       from custom._entity_reference_lane(p_organization_id, v_token, nullif(btrim(p_search), ''), null, v_limit) l), '[]'::jsonb);
      v_n := 0;
      for r in execute replace(v_sql, ' order by ', ' and t.id = any($1) order by ') using custom._entity_reference_granted_ids(v_token) loop
        if custom._entity_reference_target_ok(p_organization_id, v_token, r.id) then
          v_pairs := v_pairs || jsonb_build_array(jsonb_build_object('id', r.id, 'title', r.title));
          v_n := v_n + 1;
          exit when v_n >= v_limit;
        end if;
      end loop;
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('token', v_token, 'id', c.id, 'label', coalesce(nullif(btrim(c.title), ''), custom._entity_reference_fallback_label(v_label, null, c.id))) order by c.rn), '[]'::jsonb)
      into v_found
      from (
        select d.id, d.title,
               row_number() over (order by case when v_has_title then lower(d.title) end, d.title desc, d.id) as rn
          from (select distinct on (r2.id) r2.id, r2.title
                  from jsonb_to_recordset(v_pairs) as r2(id uuid, title text)
                 order by r2.id) d
         order by rn
         limit v_limit
      ) c;
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

CREATE OR REPLACE FUNCTION custom._entity_reference_lane(p_organization_id uuid, p_token text, p_search text, p_ids uuid[], p_want integer)
 RETURNS TABLE(id uuid, title text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_off integer := 0;
  v_got integer := 0;
  v_page integer;
  r record;
begin
  loop
    v_page := 0;
    for r in select a.id, a.title
               from public.reference_search_candidates(p_token, p_search, 200, p_ids, 'title', v_off) as a(id, title, updated_at)
    loop
      v_page := v_page + 1;
      if custom._entity_reference_target_ok(p_organization_id, p_token, r.id) then
        id := r.id; title := r.title;
        return next;
        v_got := v_got + 1;
        if v_got >= p_want then return; end if;
      end if;
    end loop;
    exit when v_page < 200;
    v_off := v_off + 200;
  end loop;
end
$function$;

delete from platform.client_callable_door where schema_name = 'custom' and function_name in ('_entity_reference_pass', '_entity_reference_allowed', '_entity_reference_allowed_for');
drop function if exists custom._entity_reference_pass(uuid, text, uuid[], text[], integer);
drop function if exists custom._entity_reference_allowed(uuid, text, uuid[]);
drop function if exists custom._entity_reference_allowed_for(uuid, uuid, text, uuid[]);
