-- target: branch,production
-- lane: READ-SPEED-ORG-2
-- lock: custom
-- based-on: custom.carrying_edges_in(uuid) 1811e49043e5cc327f3aee89bcc33df2717ffead2782b9bab1e52c932016c55b
-- based-on: custom.read_door_granted_ids(uuid, uuid) a224575799b5c8f14ecb33c551ac26cdec4f5e7694ae1e11bbb411b9a63477e7
-- chair-step: Inverse of READ-SPEED-ORG-2 a: carrying_edges_in keeps edges by item type again; the writing branch of read_door_granted_ids joins again (the bodies before 20261020002000_readspeedorg2_a_a_record_walk_reads_only_edges_that_lead_to_a_record).

CREATE OR REPLACE FUNCTION custom.carrying_edges_in(p_organization_id uuid)
 RETURNS TABLE(container_type text, container_id uuid, item_type text, item_id uuid, conveys_max permission_level)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- THE CARRYING EDGES OF ONE ORGANIZATION THAT A RECORD WALK CAN USE (CARRYING-EDGES-PERF,
-- 2026-09-27): every edge whose item is a record, or is a container on some path down to a record.
-- An edge whose item can never lead to a record is left out — both callers walk to records only,
-- so no answer of theirs can depend on it. See the campaign file for the argument.
declare
  -- STORE-READ-PERF-4 (2026-09-29): THE SAME EDGES, ASKED ONCE PER ORGANIZATION PER READ-ONLY
  -- STATEMENT. The context tree and the data home ask this for every Table of an organization
  -- (custom.visible_set -> custom.read_door_carried_ids), and the answer is the organization's, not
  -- the Table's. It is kept in the statement memo (platform.memo_k_*: fenced by the statement,
  -- backend, seat and snapshot) and ONLY while the transaction has written nothing — a transaction that
  -- writes (and could add or remove an edge) asks every time, exactly as before.
  v_ro   boolean := pg_catalog.pg_current_xact_id_if_assigned() is null and p_organization_id is not null;
  -- The key names the SNAPSHOT too: a volatile caller running many statements in one client statement
  -- (each with its own snapshot under READ COMMITTED) never reads an answer an older snapshot gave.
  v_key  text := 'custom.carrying_edges_in:' || coalesce(p_organization_id::text, '-') || ':' || pg_catalog.pg_current_snapshot()::text;
  v_m    text;
  v_ct   text[];  v_ci uuid[];  v_it text[];  v_ii uuid[];  v_cm public.permission_level[];
begin
  if v_ro then
    v_m := platform.memo_k_get(v_key);
    if v_m is not null then
      return query
        select u.ct, u.ci, u.it, u.ii, u.cm
          from jsonb_to_recordset(v_m::jsonb)
            as u(ct text, ci uuid, it text, ii uuid, cm public.permission_level);
      return;
    end if;
  end if;

  select array_agg(q.ct), array_agg(q.ci), array_agg(q.it), array_agg(q.ii), array_agg(q.cm)
    into v_ct, v_ci, v_it, v_ii, v_cm
    from (
    with recursive
    -- arm 2's edges, once: the rule is a ROLE, so the types are the rows' own
    e2 as materialized (
      select case when cr.container_side = 'source' then a.source_type else a.target_type end as c_type,
             case when cr.container_side = 'source' then a.source_id   else a.target_id   end as c_id,
             case when cr.container_side = 'source' then a.target_type else a.source_type end as i_type,
             case when cr.container_side = 'source' then a.target_id   else a.source_id   end as i_id,
             cr.conveys_max as c_max
        from custom.carrying_rule cr
        -- one index probe per rule (idx_assoc_org_role_live), the organization's rows and the
        -- organization-less ones; never the organization's whole association set
        cross join lateral (
          select x.source_type, x.source_id, x.target_type, x.target_id
            from platform.associations x
           where x.organization_id = p_organization_id and x.role = cr.role and x.deleted_at is null
          union all
          select x.source_type, x.source_id, x.target_type, x.target_id
            from platform.associations x
           where x.organization_id is null and x.role = cr.role and x.deleted_at is null
        ) a
       where cr.is_active
    ),
    -- arm 1's rules, with the side each one names as the container
    r1 as materialized (
      select r.source_type, r.target_type, r.label, r.container_side, r.conveys_max,
             case when r.container_side = 'source' then r.source_type else r.target_type end as ct,
             case when r.container_side = 'source' then r.target_type else r.source_type end as it
        from platform.association_types r
       where r.is_active
         and r.container_side = any (array['source', 'target'])
    ),
    pairs as (
      select r1.ct, r1.it from r1
      union
      select e2.c_type, e2.i_type from e2
    ),
    -- the types that are a record, or can contain one at any depth
    reach (t) as (
      select 'record'::text
      union
      select p.ct from pairs p join reach on p.it = reach.t
    )
    -- arm 1 — platform.containment_edges, from the rules whose item can lead to a record
    select case when r.container_side = 'source' then a.source_type else a.target_type end,
           case when r.container_side = 'source' then a.source_id   else a.target_id   end,
           case when r.container_side = 'source' then a.target_type else a.source_type end,
           case when r.container_side = 'source' then a.target_id   else a.source_id   end,
           r.conveys_max
      from r1 r
      -- one index probe per rule (idx_assoc_org_pair_live), and only for a rule whose item can
      -- lead to a record
      cross join lateral (
        select x.source_type, x.source_id, x.target_type, x.target_id
          from platform.associations x
         where x.organization_id = p_organization_id
           and x.source_type = r.source_type and x.target_type = r.target_type
           and (r.label is null or r.label = x.label) and x.deleted_at is null
        union all
        select x.source_type, x.source_id, x.target_type, x.target_id
          from platform.associations x
         where x.organization_id is null
           and x.source_type = r.source_type and x.target_type = r.target_type
           and (r.label is null or r.label = x.label) and x.deleted_at is null
      ) a
     where r.it in (select reach.t from reach)
    union
    -- arm 2 — the custom.carrying_rule arm of custom.carrying_edges
    select e2.c_type, e2.c_id, e2.i_type, e2.i_id, e2.c_max
      from e2
     where e2.i_type in (select reach.t from reach)
    union
    -- arm 3 — A PORTAL'S NAMING FIELD (PORTAL, 2026-09-20). The record the Field points at is
    -- the container; the record holding the Field is the item. This is what makes "only theirs"
    -- answerable without a per-portal query: an outsider holding her own client record reaches
    -- exactly the records that name it, at the level the portal declared, through the same
    -- ladder as everything else on this platform.
    select 'record'::text, a.target_id, 'record'::text, a.source_id, pt.conveys_max
      from platform.associations a
      join custom.portal_table pt on pt.names_via_field_id = a.relation_field_id
      join custom.portal p on p.id = pt.portal_id and p.is_active
     where a.deleted_at is null
       and a.organization_id = p_organization_id
       and pt.organization_id = p_organization_id
       and a.source_type = 'record'
       and a.target_type = 'record'
    ) q(ct, ci, it, ii, cm);

  if v_ro then
    perform platform.memo_k_put(v_key,
      coalesce((select jsonb_agg(jsonb_build_object('ct', u.ct, 'ci', u.ci, 'it', u.it, 'ii', u.ii, 'cm', u.cm))
                  from unnest(v_ct, v_ci, v_it, v_ii, v_cm) as u(ct, ci, it, ii, cm)), '[]'::jsonb)::text);
  end if;
  return query select u.ct, u.ci, u.it, u.ii, u.cm from unnest(v_ct, v_ci, v_it, v_ii, v_cm) as u(ct, ci, it, ii, cm);
end
$function$
;

CREATE OR REPLACE FUNCTION custom.read_door_granted_ids(p_organization_id uuid, p_table_id uuid)
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- The ids of this organization's live records (of p_table_id, or of every Table when it is null)
-- that something ADDRESSES: a grant on the record, a membership held on the record, a library grant,
-- a closure row. Sorted, each once.
--
-- STORE-READ-PERF-4 (2026-09-29): THE SAME IDS, WORKED OUT ONCE PER ORGANIZATION PER READ-ONLY
-- STATEMENT. custom.visible_set asks this once per Table, and the context tree and the data home
-- walk every Table of an organization: the answer for all of them is one pass, kept in the
-- statement memo (platform.memo_k_*: fenced by the statement, backend, seat and snapshot) and ONLY while the
-- transaction has written nothing — a transaction that writes asks every time, exactly as before.
declare
  v_ro  boolean := pg_catalog.pg_current_xact_id_if_assigned() is null and p_organization_id is not null;
  v_key text := 'custom.granted_ids:' || coalesce(p_organization_id::text, '-') || ':' || pg_catalog.pg_current_snapshot()::text;  -- (the snapshot: see custom.carrying_edges_in)
  v_m   jsonb;
begin
  if not v_ro then
    return (
      select coalesce(array_agg(distinct r.id), '{}'::uuid[])
        from (
          -- a grant on the record (public.has_permission_for, iam.granted_level, iam.grant_addressed_level)
          select p.resource_id as id from iam.permissions p where p.resource_type = 'record'
          union all
          -- a membership held ON the record itself
          select m.container_id from iam.memberships m where m.container_type = 'record'
          -- the open library (public.user_can_read_via_library_grant, public.library_is_open)
          union all
          select g.entity_id from platform.entity_grants g where g.entity_type = 'record'
          -- the platform closure the access kernel pushes onto its own frontier
          union all
          select rr.item_id from platform.reachability rr where rr.item_type = 'record'
        ) h
        join custom.record r
          on r.organization_id = p_organization_id
         and r.id = h.id
         and r.deleted_at is null
         and (p_table_id is null or r.table_id is not distinct from p_table_id)
    );
  end if;

  v_m := nullif(platform.memo_k_get(v_key), '')::jsonb;
  -- HOT-DOORS-3 (2026-10-08): THE SAME IDS, EACH PROBED BY ITS KEY. The named ids (about 1,200 on the whole
  -- platform) were hash-joined against every live record of the organization (26,000 rows read to keep 10,
  -- 43 ms); each is now looked up by (organization, id) in this organization's one partition. Same ids.
  -- mx.read_page_set = off: the join as before (the proofs compare both on one snapshot).
  if v_m is null and coalesce(current_setting('mx.read_page_set', true), '') <> 'off' then
    select coalesce(jsonb_object_agg(z.tbl, z.ids), '{}'::jsonb) into v_m
      from (
        select coalesce(r.table_id::text, '-') as tbl, jsonb_agg(distinct r.id) as ids
          from (
            select distinct h0.id
              from (
                select p.resource_id as id from iam.permissions p where p.resource_type = 'record'
                union all
                select m.container_id from iam.memberships m where m.container_type = 'record'
                union all
                select g.entity_id from platform.entity_grants g where g.entity_type = 'record'
                union all
                select rr.item_id from platform.reachability rr where rr.item_type = 'record'
              ) h0
             where h0.id is not null
          ) h
          cross join lateral (
            select r0.id, r0.table_id
              from custom.record r0
             where r0.organization_id = p_organization_id
               and r0.id = h.id
               and r0.deleted_at is null
            offset 0
          ) r
         group by 1
      ) z;
    perform platform.memo_k_put(v_key, v_m::text);
  end if;
  if v_m is null then
    select coalesce(jsonb_object_agg(z.tbl, z.ids), '{}'::jsonb) into v_m
      from (
        select coalesce(r.table_id::text, '-') as tbl, jsonb_agg(distinct r.id) as ids
          from (
            select p.resource_id as id from iam.permissions p where p.resource_type = 'record'
            union all
            select m.container_id from iam.memberships m where m.container_type = 'record'
            union all
            select g.entity_id from platform.entity_grants g where g.entity_type = 'record'
            union all
            select rr.item_id from platform.reachability rr where rr.item_type = 'record'
          ) h
          join custom.record r
            on r.organization_id = p_organization_id
           and r.id = h.id
           and r.deleted_at is null
         group by 1
      ) z;
    perform platform.memo_k_put(v_key, v_m::text);
  end if;

  if p_table_id is null then
    return array(select distinct e::uuid from jsonb_each(v_m) t, jsonb_array_elements_text(t.value) e order by 1);
  end if;
  return array(select e::uuid from jsonb_array_elements_text(coalesce(v_m -> p_table_id::text, '[]'::jsonb)) e order by 1);
end
$function$
;
