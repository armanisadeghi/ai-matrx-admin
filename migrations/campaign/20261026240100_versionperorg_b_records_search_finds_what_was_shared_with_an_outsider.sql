-- chair-step: replaces custom.records_search in place: it also searches the Tables shared with the reader (a Table share or a record share, in force), so an outsider finds what was shared with her; the Table's own list rule still decides the rows
-- lane: VERSION-PER-ORG
-- based-on: custom.records_search(text, integer, integer, uuid[], uuid[], boolean) a277f202bde88066d7080d2980477ae86deabf871e944ab88133a5436859c7b1
--
-- VERSION-PER-ORG b — RECORDS SEARCH FINDS WHAT WAS SHARED WITH AN OUTSIDER (ACCESS-REVOKE out-of-brief defect).
-- The search listed candidates only from the reader's own organizations, so a person reached by a Table share (or a
-- record share) in an organization she does not belong to found nothing. Now the candidate Tables are: every Table of
-- her organizations (as before) plus every Table shared with her, or whose record was shared with her, while the
-- grant is in force (iam.grant_in_force). No second rule: each candidate Table's rows still pass through
-- custom.listed_predicate_sql (the one list rule), which admits exactly the shared rows.
-- Test: scripts/campaign-tests/versionperorg_b_records_search_finds_what_was_shared_with_an_outsider.py
-- Inverse: migrations/inverse/20261026240100_versionperorg_b_records_search_finds_what_was_shared_with_an_outsider_down.sql
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
  v_shared  uuid[];
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
  -- AND THE TABLES SHARED WITH HER (VERSION-PER-ORG b): a Table share, or a record share's Table, in force
  -- (iam.grant_in_force, the kernel's own test), to her or to one of her organizations, wherever it lives. They
  -- are only candidates: the Table's own list rule below still decides which of their rows she is shown.
  v_shared := array(
    select distinct case when s.table_id = custom.table_kernel_id() then s.id else s.table_id end
      from iam.permissions p
      join custom.record s on s.id = p.resource_id and s.deleted_at is null
     where p.resource_type = 'record'
       and (p.granted_to_user_id = v_me or p.granted_to_organization_id = any (v_orgs))
       and iam.grant_in_force(p.status, p.expires_at)
       and (p_organization_ids is null or s.organization_id = any (p_organization_ids)));
  if coalesce(cardinality(v_orgs), 0) = 0 and coalesce(cardinality(v_shared), 0) = 0 then
    return;
  end if;
  v_orgs := array(select distinct x from unnest(v_orgs || array(
              select s.organization_id from custom.record s where s.id = any (v_shared))) x);

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
       and (t.id = any (v_shared)
            or exists (select 1 from iam.organization_member m where m.user_id = v_me and m.organization_id = t.organization_id))
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
