-- chair-step: lane ACCESS-BATCH-AGREE - its only REVOKEs take every grant off the three NEW internal functions it creates (server-only, called by security-definer doors); nothing that exists loses a grant, and no table, trigger, policy or row is touched.
-- Adds three internal functions (custom._entity_reference_allowed_for, custom._entity_reference_allowed, custom._entity_reference_pass) and replaces three bodies (custom._entity_reference_target_ok, custom.entity_reference_search, custom._entity_reference_lane). No table, trigger, policy or row is touched.
-- GRANT NAMED: none. The new functions are SECURITY DEFINER with every grant revoked (callers are the security-definer search, the write check and the back-link reader); the replaced doors keep their declared grants.
-- lane: ACCESS-BATCH-AGREE
-- lock: custom
-- Inverse: migrations/inverse/20261021270000_accessbatchagree_a_the_picker_gate_is_one_rule_in_set_form_down.sql
-- based-on: custom._entity_reference_target_ok(uuid, text, uuid) f5ba6fe64a2e89ebe894b7c906b73af4a9ddc532a45dc281ca8d4eec396c77d0
-- based-on: custom.entity_reference_search(uuid, text[], text, integer) 796ae851a9c3194c4155d7ebad766a28b4bda64383931b9474906d2e955543aa
-- based-on: custom._entity_reference_lane(uuid, text, text, uuid[], integer) 55571bf6a553eb54f924e9fd664e667114bbcf073cbe337b94c2b5d4219f259f
set local lock_timeout = '3s';
--
-- THE DEFECT. Two answers to one question: the link picker's gate (custom._entity_reference_target_ok: a live row, then
-- iam.has_access one id at a time) and the access kernel's set form (iam.has_access_for_many) were two separate homes.
-- LINK-PICKER-2 saw the set form admit kg_chunks rows the gate refused: those rows are soft-deleted (rag.kg_chunks.deleted_at),
-- which the kernel answers about (an owner may open a trashed row) and the gate refuses as not live. The kernel lanes
-- themselves agree for every kind sampled (census in the lane report).
--
-- THE FIX. One rule, one home: custom._entity_reference_allowed(org, kind, ids[]) = live rows of the kind's own table AND
-- iam.has_access_for_many(person, ids, viewer, kind). The per-row gate is that function asked about one id. The search
-- and its reference-search lane ask it in batches (custom._entity_reference_pass), list order kept, stopping at p_limit.
-- Nothing widens or narrows: every answer is the kernel's, exactly as before.

create or replace function custom._entity_reference_allowed_for(p_person uuid, p_organization_id uuid, p_token text, p_ids uuid[])
 returns setof uuid
 language plpgsql
 stable security definer
 set search_path to 'pg_catalog'
as $function$
-- ACCESS-BATCH-AGREE (2026-10-19). THE ONE GATE a record's link to a platform thing passes, in its SET form: of p_ids,
-- the ones that are a live row of the kind's own table AND that the signed-in person may open (iam.has_access_for_many,
-- the set form of the access kernel, at viewer) for p_person. A null p_person asks only whether the row is live (the
-- server lane and the store's owner, exactly as before). custom._entity_reference_allowed is this function for the
-- signed-in person, and custom._entity_reference_target_ok is that asked about one id, so the per-row and the batch
-- answers cannot drift apart.
declare
  v_sch  text;
  v_tab  text;
  v_sd   boolean;
  v_live uuid[];
begin
  if p_organization_id is null or nullif(p_token, '') is null or p_ids is null or cardinality(p_ids) = 0 then
    return;
  end if;
  if not exists (select 1 from platform.association_types r
                  where r.source_type = 'record' and r.target_type = p_token
                    and r.target_type <> 'record' and r.is_active) then
    return;
  end if;
  select s.schema_name, s.table_name into v_sch, v_tab
    from platform.entity_types e, platform.entity_read_source(p_token) s
   where e.token = p_token and e.is_active;
  if v_sch is null or v_tab is null or to_regclass(format('%I.%I', v_sch, v_tab)) is null then
    return;
  end if;
  select exists (select 1 from pg_attribute a
                  where a.attrelid = format('%I.%I', v_sch, v_tab)::regclass
                    and a.attname = 'deleted_at' and not a.attisdropped)
    into v_sd;
  execute format('select coalesce(array_agg(distinct t.id), ''{}''::uuid[]) from %I.%I t where t.id = any($1)%s', v_sch, v_tab,
                 case when v_sd then ' and t.deleted_at is null' else '' end)
     into v_live using p_ids;
  if cardinality(v_live) = 0 then
    return;
  end if;
  if p_person is not null then
    return query select m.target from iam.has_access_for_many(p_person, v_live, 'viewer', p_token) m where m.allowed;
    return;
  end if;
  return query select x from unnest(v_live) x;
end
$function$;
revoke all on function custom._entity_reference_allowed_for(uuid, uuid, text, uuid[]) from public, anon, authenticated;
insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values ('custom', '_entity_reference_allowed_for', 'p_person uuid, p_organization_id uuid, p_token text, p_ids uuid[]', array['uuid'::regtype,'uuid'::regtype,'text'::regtype,'uuid[]'::regtype]::oid[], 'server_only: p_ids are checked against the kind''s own table (live rows) and iam.has_access_for_many(p_person, ids, viewer, token); a null p_person asks liveness only.', '20261021270000_accessbatchagree_a_the_picker_gate_is_one_rule_in_set_form.sql', 'server_only: called only by custom._entity_reference_allowed, which passes the signed-in person (or none for the server lane and the store owner); no client ever names a person here.', false, false);

create or replace function custom._entity_reference_allowed(p_organization_id uuid, p_token text, p_ids uuid[])
 returns setof uuid
 language sql
 stable security definer
 set search_path to 'pg_catalog'
as $function$
  -- ACCESS-BATCH-AGREE: the one gate for the signed-in person (none on the server lane or for the store's owner).
  select a.a from custom._entity_reference_allowed_for(
           case when custom.query_principal() is not null and not custom.query_is_store_owner() then custom.query_principal() end,
           p_organization_id, p_token, p_ids) as a(a);
$function$;
revoke all on function custom._entity_reference_allowed(uuid, text, uuid[]) from public, anon, authenticated;
insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values ('custom', '_entity_reference_allowed', 'p_organization_id uuid, p_token text, p_ids uuid[]', array['uuid'::regtype,'text'::regtype,'uuid[]'::regtype]::oid[], 'server_only: p_ids are checked by custom._entity_reference_allowed_for for the signed-in person (custom.query_principal), the store owner and the server lane asking liveness only.', '20261021270000_accessbatchagree_a_the_picker_gate_is_one_rule_in_set_form.sql', 'server_only: called only by custom._entity_reference_target_ok and custom._entity_reference_pass inside the security-definer link search, the write check and the back-link reader.', false, false);

create or replace function custom._entity_reference_pass(p_organization_id uuid, p_token text, p_ids uuid[], p_titles text[], p_want integer)
 returns table(id uuid, title text, ord bigint)
 language sql
 stable security definer
 set search_path to 'pg_catalog'
as $function$
  -- ACCESS-BATCH-AGREE: the first p_want of a page of candidates (in their list order) that pass the ONE gate.
  select u.id, u.title, u.ord
    from unnest(p_ids, p_titles) with ordinality as u(id, title, ord)
   where u.id in (select a.a from custom._entity_reference_allowed(p_organization_id, p_token, p_ids) as a(a))
   order by u.ord
   limit greatest(coalesce(p_want, 0), 0);
$function$;
revoke all on function custom._entity_reference_pass(uuid, text, uuid[], text[], integer) from public, anon, authenticated;
insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values ('custom', '_entity_reference_pass', 'p_organization_id uuid, p_token text, p_ids uuid[], p_titles text[], p_want integer', array['uuid'::regtype,'text'::regtype,'uuid[]'::regtype,'text[]'::regtype,'int4'::regtype]::oid[], 'server_only: p_ids are checked by custom._entity_reference_allowed (the one gate); p_titles only travel with them.', '20261021270000_accessbatchagree_a_the_picker_gate_is_one_rule_in_set_form.sql', 'server_only: called only by custom.entity_reference_search and custom._entity_reference_lane, the link search that runs as its security-definer owner.', false, false);

CREATE OR REPLACE FUNCTION custom._entity_reference_target_ok(p_organization_id uuid, p_token text, p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
  -- ACCESS-BATCH-AGREE: the one gate (custom._entity_reference_allowed) asked about one id.
  if p_id is null then
    return false;
  end if;
  return exists (select 1 from custom._entity_reference_allowed(p_organization_id, p_token, array[p_id]));
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
  v_ids     uuid[];
  v_titles  text[];
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

    -- ONE GATE, ASKED LAZILY. Every candidate passes custom._entity_reference_allowed (iam.has_access_for_many), in list
    -- order, and the walk STOPS at the first p_limit that pass: the access check runs on a screenful of rows,
    -- never on every row the person could possibly reach (agent: 3.4 s of container walks before this).
    -- ACCESS-BATCH-AGREE: the candidates are asked in batches of what is still wanted (never fewer than 10), through
    -- custom._entity_reference_pass, the ONE gate in its set form; list order is kept and the walk stops at p_limit.
    v_scanned := 0;
    v_ids := '{}'; v_titles := '{}';
    for r in execute v_sql using v_acc loop
      v_scanned := v_scanned + 1;
      v_ids := v_ids || r.id; v_titles := v_titles || r.title;
      if cardinality(v_ids) >= greatest(v_limit - v_n, 10) then
        select v_pairs || coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'title', g.title) order by g.ord), '[]'::jsonb), v_n + count(*)
          into v_pairs, v_n
          from custom._entity_reference_pass(p_organization_id, v_token, v_ids, v_titles, v_limit - v_n) g;
        v_ids := '{}'; v_titles := '{}';
        exit when v_n >= v_limit;
      end if;
    end loop;
    if v_n < v_limit and cardinality(v_ids) > 0 then
      select v_pairs || coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'title', g.title) order by g.ord), '[]'::jsonb), v_n + count(*)
        into v_pairs, v_n
        from custom._entity_reference_pass(p_organization_id, v_token, v_ids, v_titles, v_limit - v_n) g;
    end if;
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
      v_ids := '{}'; v_titles := '{}';
      for r in execute replace(v_sql, ' order by ', ' and t.id = any($1) order by ') using custom._entity_reference_granted_ids(v_token) loop
        v_ids := v_ids || r.id; v_titles := v_titles || r.title;
        if cardinality(v_ids) >= greatest(v_limit - v_n, 10) then
          select v_pairs || coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'title', g.title) order by g.ord), '[]'::jsonb), v_n + count(*)
            into v_pairs, v_n
            from custom._entity_reference_pass(p_organization_id, v_token, v_ids, v_titles, v_limit - v_n) g;
          v_ids := '{}'; v_titles := '{}';
          exit when v_n >= v_limit;
        end if;
      end loop;
      if v_n < v_limit and cardinality(v_ids) > 0 then
        select v_pairs || coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'title', g.title) order by g.ord), '[]'::jsonb), v_n + count(*)
          into v_pairs, v_n
          from custom._entity_reference_pass(p_organization_id, v_token, v_ids, v_titles, v_limit - v_n) g;
      end if;
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
  v_ids uuid[];
  v_titles text[];
begin
  -- ACCESS-BATCH-AGREE: a page of 200 is asked of the ONE gate in its set form at once (custom._entity_reference_pass).
  loop
    select coalesce(array_agg(a.id order by a.o), '{}'), coalesce(array_agg(a.title order by a.o), '{}'), count(*)
      into v_ids, v_titles, v_page
      from public.reference_search_candidates(p_token, p_search, 200, p_ids, 'title', v_off) with ordinality as a(id, title, updated_at, o);
    for r in select g.id, g.title from custom._entity_reference_pass(p_organization_id, p_token, v_ids, v_titles, p_want - v_got) g order by g.ord loop
      id := r.id; title := r.title;
      return next;
      v_got := v_got + 1;
    end loop;
    if v_got >= p_want then return; end if;
    exit when v_page < 200;
    v_off := v_off + 200;
  end loop;
end
$function$;
