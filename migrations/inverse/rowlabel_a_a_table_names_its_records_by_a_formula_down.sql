-- chair-step: ROW-LABEL-FORMULA inverse. Restores the six function bodies as they were, drops the two doors (door rows first) and the helper. A Table's stored row_label_formula / row_label_expr keys are left in its document (nothing reads them once the bodies are restored).
-- lane: ROW-LABEL-FORMULA
-- lock: custom,platform
-- based-on: custom._words_for(uuid, uuid, jsonb, text, integer) b8bb3e8fb22c540225dc498ff6de790388809649122fd15b0cb611b45fb418ab
-- based-on: custom.records_search(text, integer, integer, uuid[], uuid[], boolean) a277f202bde88066d7080d2980477ae86deabf871e944ab88133a5436859c7b1
-- based-on: custom.reverse_links_many(uuid, uuid, uuid, uuid[], integer, integer) 28cb7eac57cf70aabd305bd1aec38ccc1cad92981e1ea1a532e202421ef3c19d
-- based-on: custom.entity_back_links(uuid, text, uuid, integer, text) fcdcbf8623bd679f50608fc847c012fa2231c31ba4a386a69eadb304c6e0a016
-- based-on: custom.agg_record_name(uuid, uuid, jsonb) 61c8751d07994bd5dc8f34a707afdee10390cd80c27424dc08e7d3ba29aa491f
-- based-on: platform.relation_label(uuid, text, uuid) a35a5a976bdee73636ef53b1acf331e986ce91ba0e9ddcb7bdf703a092b5a7c1

revoke execute on function custom.table_row_label(uuid, uuid) from authenticated;
revoke execute on function custom.table_row_label_set(uuid, uuid, text) from authenticated;
delete from platform.client_callable_door where schema_name = 'custom' and function_name in ('table_row_label', 'table_row_label_set');

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
           coalesce(nullif(btrim(t.data ->> 'title_field'), ''), 'name')  as tf
      from custom.record t
     where t.organization_id = any (v_orgs)
       and t.table_id = custom.table_kernel_id()
       and t.deleted_at is null
       and (p_table_ids is null or t.id = any (p_table_ids))
       and (p_include_platform_tables or not custom.table_kept_out_of_lists(t.data ->> 'kept_for'))
  ), c as (
    select r.id, r.table_id, r.organization_id, r.updated_at, t.nm,
           nullif(btrim(r.data ->> t.tf), '') as name,
           case when v_q is null then 3
                when lower(r.data ->> t.tf) = lower(v_q) then 0
                when lower(r.data ->> t.tf) like lower(v_q) || '%' then 1
                when lower(r.data ->> t.tf) like '% ' || lower(v_q) || '%' then 2
                else 3 end as rank
      from custom.record r
      join t on t.organization_id = r.organization_id and t.id = r.table_id
     where r.organization_id = any (v_orgs)
       and r.data_class = 'record'
       and r.deleted_at is null
       and (v_like is null or (r.data ->> t.tf) ilike v_like)
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

  select nullif(t.data ->> 'title_field', ''), lower(coalesce(nullif(btrim(t.data ->> 'label_singular'), ''), 'record'))
    into v_title, v_noun
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
      select coalesce(jsonb_object_agg(r.id::text, r.data -> $8), '{}'::jsonb) as m
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
  using p_organization_id, v_source, p_field_id, p_record_ids, v_offset, v_limit, v_noun, coalesce(v_title, ''), p_table_id;
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
              'label', case when x.title_type in ('text', 'long_text', 'email', 'phone', 'url')
                            and nullif(btrim(coalesce(x.rec_data ->> (x.table_data ->> 'title_field'), '')), '') is not null
                            then case when (x.rec_data ->> (x.table_data ->> 'title_field')) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                                      then coalesce(nullif(x.table_data ->> 'label_singular', ''), nullif(x.table_data ->> 'name', ''), 'record')
                                      else x.rec_data ->> (x.table_data ->> 'title_field') end
                            else custom._card_words(x.rec_org,
                                   coalesce(x.rec_data ->> (x.table_data ->> 'title_field'),
                                            (select l.cached_title from custom.external_link l
                                              where l.record_id = x.rec_id and l.organization_id = x.rec_org
                                              limit 1)),
                                   'record') end),
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
    select r.data ->> (t.data ->> 'title_field') into v_title
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

drop function custom.table_row_label(uuid, uuid);
drop function custom.table_row_label_set(uuid, uuid, text);
drop function custom._row_label_text(uuid, uuid, uuid, jsonb);
