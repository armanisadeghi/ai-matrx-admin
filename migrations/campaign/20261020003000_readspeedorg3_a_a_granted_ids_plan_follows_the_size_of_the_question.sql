-- target: branch,production
-- additive: yes
-- guard: custom/system_enabled
-- lane: READ-SPEED-ORG-3
-- lock: custom
-- based-on: custom.read_door_granted_ids(uuid, uuid) a224575799b5c8f14ecb33c551ac26cdec4f5e7694ae1e11bbb411b9a63477e7
--
-- READ-SPEED-ORG-3 a — THE GRANTED-IDS QUESTION TAKES THE PLAN THAT FITS ITS SIZE.
--
-- custom.read_door_granted_ids answers "which of this organization's records does something name" (a grant, a
-- membership on the record, a library grant, a closure row). READ-SPEED-ORG-2 made the writing branch probe each
-- of the ~2,300 named ids of the whole platform by (organization, id), as the read-only branch had since
-- HOT-DOORS-3. That helped the test admin's organization (22,700 records) and cost every small one a fixed
-- ~6,000 buffer reads: 0.6 ms -> 7 ms quiet, 2 -> 35 ms loaded. The median organization holds 6 records.
-- Now both branches count the question's records (index-only, at most c_few + 1 = 10,001) and, when there are at
-- most 10,000, join the named ids to them as before READ-SPEED-ORG-2 (~1,400 buffers, ~2 ms); larger ones keep the
-- probes. Same ids, same order, either way (each branch's two plans return the same sorted distinct set).
--
-- Proof (2026-10-20, rolled-back write transactions, ~/lane-resume/rso3/bench_granted*.py): old join, live probe,
-- this body (writing and forced read-only branch) equal for (org, null) and up to 50 Tables per org, in orgs of
-- 8, 46, 153, 209, 6,975, 22,753 and 26,099 records. Timings (median of 9, loaded DB) old/live/new writing:
-- 8 records 1.9/37.9/2.4 ms; 153 records 2.3/38.0/2.4; admin org 68.8/18.4/18.6.
-- Test: scripts/campaign-tests/readspeedorg3_a_granted_ids_small_org_reads_few_buffers.sql
-- Inverse: migrations/inverse/20261020003000_readspeedorg3_a_a_granted_ids_plan_follows_the_size_of_the_question_down.sql

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
  -- READ-SPEED-ORG-3 (2026-10-20): THE PLAN FOLLOWS THE SIZE OF THE QUESTION. Its records (archived ones too:
  -- an index-only count, and only the plan depends on it) are counted no further than c_few + 1. At most c_few
  -- (most organizations: the median holds 6 records): the named ids are joined to those records (~2 ms, as
  -- before READ-SPEED-ORG-2). More: each named id (~2,300 on the whole platform) is probed by (organization,
  -- id), a fixed cost that beats hashing tens of thousands of records. Same ids either way.
  c_few constant integer := 10000;
  v_few boolean;
begin
  if not v_ro then
    v_few := (select count(*) from (
                select 1 from custom.record r0
                 where r0.organization_id = p_organization_id
                   and (p_table_id is null or r0.table_id = p_table_id)
                 limit c_few + 1) z) <= c_few;
    if v_few then
      return (
        select coalesce(array_agg(distinct r.id), '{}'::uuid[])
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
           and (p_table_id is null or r.table_id is not distinct from p_table_id)
      );
    end if;
    -- READ-SPEED-ORG-2 (2026-10-19): A WRITING TRANSACTION PROBES EACH NAMED ID BY ITS KEY, as the
    -- read-only branch below does (HOT-DOORS-3). The plain join ran as a scan of every live record of
    -- the organization; each distinct named id is now one (organization, id) primary-key probe. Same ids.
    return (
      select coalesce(array_agg(distinct r.id), '{}'::uuid[])
        from (
          select distinct h0.id
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
            ) h0
           where h0.id is not null
        ) h
        cross join lateral (
          select r0.id
            from custom.record r0
           where r0.organization_id = p_organization_id
             and r0.id = h.id
             and r0.deleted_at is null
             and (p_table_id is null or r0.table_id is not distinct from p_table_id)
          offset 0
        ) r
    );
  end if;

  v_m := nullif(platform.memo_k_get(v_key), '')::jsonb;
  -- HOT-DOORS-3 (2026-10-08): THE SAME IDS, EACH PROBED BY ITS KEY. The named ids (about 1,200 on the whole
  -- platform) were hash-joined against every live record of the organization (26,000 rows read to keep 10,
  -- 43 ms); each is now looked up by (organization, id) in this organization's one partition. Same ids.
  -- mx.read_page_set = off: the join as before (the proofs compare both on one snapshot).
  if v_m is null then
    v_few := (select count(*) from (
                select 1 from custom.record r0
                 where r0.organization_id = p_organization_id
                 limit c_few + 1) z) <= c_few;
  end if;
  -- READ-SPEED-ORG-3: a small organization takes the join below (the plan sized to it), a large one the probes
  if v_m is null and not v_few and coalesce(current_setting('mx.read_page_set', true), '') <> 'off' then
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
