-- additive: yes
--
-- It REPLACES one function body, `iam.has_access_for_many_in(uuid, uuid[], uuid[], text, text)`: the CTE admin_orgs
-- asks iam.is_client_lane() once for the statement (an initplan) instead of once per membership row. Same answer.
-- Inverse: migrations/inverse/w1_perf_a_access_many_asks_the_lane_once_down.sql.
--
-- W1-PERF (tables close-out, 2026-10-17). 160+ perf_watch_alert rows in 7 days on the record-store doors were all
-- MEMBER-seat twins (admin twins 85-235 ms p95). The member seat (test@test.com) holds 1,531 organizations (owner or
-- admin of 1,506). iam.is_client_lane() is STABLE plpgsql (never inlined), written bare in admin_orgs' WHERE, so it
-- ran once per membership row: 1,506 calls per set ask, three asks per page (custom.reaches_directly_many, top rung +
-- halving). Measured warm on live, probe-identical calls: 30 ms -> 13 ms per ask; read_records_page first_50@member
-- 342 -> 292 ms p50, first_50@member@large 252 -> 202 ms; full answers md5-identical before/after.
--
-- based-on: iam.has_access_for_many_in(uuid, uuid[], uuid[], text, text) 7edfef5694cde55062c757026b2d71a184ba5298ff6e3493fe67fce5b9e3dcb9

CREATE OR REPLACE FUNCTION iam.has_access_for_many_in(p_person uuid, p_targets uuid[], p_orgs uuid[], p_level text, p_type text DEFAULT 'record'::text)
 RETURNS TABLE(target uuid, allowed boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- HOT-DOORS-6 (2026-10-09). iam.has_access_for_many WITH THE ORGANIZATION EACH TARGET LIVES IN, when the
-- caller already holds it (p_orgs, parallel to p_targets; null, shorter, or a null element = not known). It is
-- a HINT, never a filter, exactly like custom.record_org_hint: a target found in its hinted organization is
-- read there (one partition of custom.record instead of sixteen: ~280 ms -> ~10 ms for admin@admin.com's 1,537
-- Tables); a target not found there, or with no hint, is read by id alone as before. A hinted hit counts as
-- the one row carrying that id - the same trust the kernel's own hinted row read (KERNEL-ORG-PRUNE) gives it,
-- true while record ids are unique across organizations (no constraint enforces it; KERNEL.md says so).
-- iam.has_access_for_many is this function with no hints, so the two never drift apart.
--
-- KERNEL-SHADOW (2026-10-07). THE SET FORM OF THE ACCESS KERNEL: one row per distinct non-null
-- target, `allowed` = iam.has_access_for(p_person, p_type, target, p_level) — the same answer,
-- resolved once for the whole set instead of once per target. The rule it implements, lane by lane,
-- is common-docs/systems/platform/access/KERNEL.md. It is SHADOW ONLY until Arman decides the swap:
-- iam.has_access_for_shadow asks both forms and returns the old one.
--
-- WHAT IS SET-BASED. The person is resolved once (organizations, admin seats, store switch,
-- member-lane level per organization and Table). The target rows are read in ONE statement. Grants,
-- record memberships, scope assignments and Library grants are one semi-join each over the set.
-- Every clock clause (a grant's expiry) is the statement's own now().
--
-- WHAT IS NOT, AND GOES TO THE ONE-AT-A-TIME KERNEL (iam.has_access_for, unchanged), so the answer is
-- the kernel's by construction:
--   * every type but `record` (the hot path; other types are a later wave, KERNEL.md § Waves);
--   * the whole call, when the registry no longer says what this body assumes about `record`
--     (a reference gate, an owner-only trash rule, a detail or child pointer, a containment or
--     composition parent, or a class whose "Only me" rows do not open to the organization);
--   * one target, when its id is carried by more than one row, when it sits in a global-readable
--     system organization (those arms read the row column T-13 retires, which this body may not), or
--     when platform.reachability holds a container for it.
-- A Confidential row is answered by custom.confidential_answer itself, exactly as the kernel asks it.
--
-- THE PUBLIC LANE: the kernel asks the row column T-13 retires (= 'public'), which this body may not
-- read. A row published_to_web marks, that no other lane opens, is asked of the kernel (KERNEL-SHADOW h).
-- Known one-way gap, fail-closed: a row the kernel would open ONLY because its row column says public
-- while published_to_web says false (possible only with the T-13 dual-write trigger bypassed) is
-- refused here; the shadow and the sweep report it as a disagreement.
declare
  v_req     public.permission_level;
  v_lanes   platform.lane_set;
  v_set_ok  boolean;
  v_pcm     text;  -- HOT-DOORS-4
begin
  if p_targets is null or cardinality(p_targets) = 0 then
    return;
  end if;
  -- KERNEL-SHADOW h: a NULL level is NOT viewer - the kernel answers a NULL level its own way (owner and
  -- organization admins only), so a NULL level, like a NULL or non-record type, goes to the kernel.
  v_req := p_level::public.permission_level;

  if p_person is null then
    return query select distinct x, false from unnest(p_targets) x where x is not null;
    return;
  end if;

  -- The registry facts this body is written against, asked of the same functions the kernel asks.
  v_set_ok := coalesce(p_type = 'record' and v_req is not null
    and exists (select 1 from platform.entity_types et
                 where et.token = 'record' and et.is_active
                   and et.schema_name = 'custom' and et.table_name = 'record'
                   and et.rls_variant is distinct from 'detail')
    and platform.reference_gate_columns('record') is null
    and not coalesce(platform.trash_is_owner_only('record'), false)
    and platform.detail_parent_columns('record') is null
    and platform.child_parent_columns('record') is null
    and not exists (select 1 from platform.entity_relationships er
                     where er.child_type = 'record' and er.kind in ('composition', 'containment'))
    and coalesce(iam.personal_opens_row('record', 'custom', 'record', null), false), false);

  if not v_set_ok then
    return query
      select u.x, coalesce(iam.has_access_for(p_person, p_type, u.x, v_req), false)
        from (select distinct x from unnest(p_targets) x where x is not null) u(x);
    return;
  end if;

  v_lanes := iam.class_lanes('record');

  -- HOT-DOORS-4 (2026-10-08): one cached plan per statement of this call (partitions pruned at run time) instead of
  -- a custom plan per call; put back when it returns. A plan choice, never an answer.
  if iam.kernel_batch_on(p_person) then
    v_pcm := pg_catalog.current_setting('plan_cache_mode');
    perform pg_catalog.set_config('plan_cache_mode', 'force_generic_plan', true);
  end if;
  return query
  with
  t as materialized (
    -- an id handed two different organizations gets no hint (read by id alone, as before)
    select u.x as id, case when count(distinct u.o) = 1 then min(u.o::text)::uuid end as hint
      from unnest(p_targets, p_orgs) u(x, o)
     where u.x is not null
     group by u.x
  ),
  -- The person, once.
  my_orgs as materialized (
    select distinct om.organization_id as org
      from iam.organization_member om
     where om.user_id = p_person
  ),
  global_orgs as materialized (
    select s.organization_id as org from iam.system_orgs s where s.global_readable
  ),
  -- ENTITY-IDS-3 (2026-10-09): public.is_org_admin_for and iam.has_org_access_for, each asked once for the person as a
  -- set instead of once per organization (~4 ms and ~2.6 ms an organization for a member of 1,532 of them). Same
  -- predicates: an owner/admin seat in a live organization (and, on a client lane asking about someone else, only in
  -- the caller's own organizations); a membership of a live organization, or a global-readable one for a super admin.
  admin_orgs as materialized (
    select om.organization_id as org
      from iam.organization_member om
      join iam.organizations oo on oo.id = om.organization_id and oo.archived_at is null
     where om.user_id = p_person and om.role in ('owner', 'admin')
       -- W1-PERF (2026-10-17): the lane question asked ONCE for the statement (an initplan), not once per membership
       -- row: a STABLE plpgsql function is never inlined, so a member of 1,506 organizations asked it 1,506 times per ask.
       and (not ((select iam.is_client_lane()) and p_person is distinct from (select auth.uid()))
            or om.organization_id in (select iam.my_orgs()))
  ),
  access_orgs as materialized (
    select om.organization_id as org
      from iam.organization_member om
      join iam.organizations oo on oo.id = om.organization_id and oo.archived_at is null
     where om.user_id = p_person
    union
    select g.org from global_orgs g where public.is_super_admin_for(p_person)
  ),
  -- The rows, once.
  -- HOT-DOORS-6: a hinted target read in its organization; every other target read by id alone, as before
  hit as materialized (
    select t.id, r.organization_id as org, r.created_by as owner, r.published_to_web as pub, r.table_id as tbl
      from t
      join custom.record r on r.organization_id = t.hint and r.id = t.id
     where t.hint is not null
  ),
  w as materialized (
    select h.id, h.org, h.owner, h.pub, h.tbl, 1::bigint as n_rows
      from hit h
    union all
    select t.id,
           r.organization_id as org,
           r.created_by      as owner,
           r.published_to_web as pub,
           r.table_id        as tbl,
           count(r.id) over (partition by t.id) as n_rows
      -- HOT-DOORS-6 b: the targets no hint found, as one hashed set difference (a per-row NOT EXISTS over the
      -- materialized hit list was planned as a nested loop: 1,855 x 928 comparisons, ~360 ms for admin@admin.com)
      from (select t2.id from t t2 except select h.id from hit h) t
      left join custom.record r on r.id = t.id
  ),
  -- Per organization the targets live in: archived, admin seat, member access, store switch.
  orgs as materialized (
    select o.org,
           exists (select 1 from iam.organizations x where x.id = o.org and x.archived_at is not null) as archived,
           -- ENTITY-IDS-2: both answer no outside the person's organizations (and, for has_org_access_for, the
           -- global-readable ones), so they are asked only there (~1.2 ms per organization otherwise)
           o.org in (select a.org from admin_orgs a) as is_admin,
           o.org in (select a.org from access_orgs a) as has_access,
           custom.store_is_open(o.org)              as store_open
      from (select distinct w.org from w where w.org is not null and w.n_rows = 1) o
  ),
  -- Per target: the semi-joins.
  x as materialized (
    select w.id, w.org, w.owner, w.pub, w.tbl, w.n_rows,
           o.archived, o.is_admin, o.has_access, o.store_open,
           (w.org in (select g.org from global_orgs g)) as in_global_org,
           exists (select 1 from platform.reachability rc
                    where rc.item_type = 'record' and rc.item_id = w.id) as has_container,
           -- the Confidential anchor is provably absent when no row of class `record` carries the
           -- id, or exactly one does whose Table is not Confidential and whose document names no
           -- parent (custom.confidential_anchor's own loop stops at that first row)
           (select count(c.id) = 0
                   or (count(c.id) = 1
                       and not coalesce(bool_or((select ct.data ->> 'level' from custom.record ct
                                                  where ct.organization_id = c.organization_id and ct.id = c.table_id
                                                    and ct.table_id = custom.table_kernel_id()) = 'confidential'), false)
                       and not coalesce(bool_or(jsonb_typeof(c.data -> 'parent_id') = 'string'), false))
              from custom.record c
             -- ENTITY-IDS-2: the Table read on its key (a scalar subquery, at most one row, the same answer as the
             -- left join it replaces); as a join the generic plan read every Table of the organization per target
             -- (~1.7 ms each)
             where c.organization_id = w.org and c.id = w.id and c.data_class = 'record') as anchor_free,
           exists (select 1 from platform.entity_grants eg
                    where eg.entity_type = 'record' and eg.entity_id = w.id) as has_library_row,
           -- public.has_permission_for, as a semi-join
           exists (select 1 from iam.permissions p
                    where p.resource_type = 'record' and p.resource_id = w.id
                      and coalesce(p.status, 'active') <> 'rejected'
                      and (p.expires_at is null or p.expires_at > now())
                      and (p.granted_to_user_id = p_person
                           or (p.granted_to_organization_id is not null
                               and p.granted_to_organization_id in (select m.org from my_orgs m)))
                      and case v_req
                            when 'viewer' then p.permission_level in ('viewer', 'commenter', 'edit_content', 'editor', 'admin')
                            when 'commenter' then p.permission_level in ('commenter', 'edit_content', 'editor', 'admin')
                            when 'edit_content' then p.permission_level in ('edit_content', 'editor', 'admin')
                            when 'editor' then p.permission_level in ('editor', 'admin')
                            when 'admin' then p.permission_level = 'admin'
                          end) as grant_hit,
           -- iam.grant_addressed_level(...) is not null: a grant addressed to this person speaks
           -- for this row, so the member lane's default does not (VIS-19)
           exists (select 1 from iam.permissions p
                    where p.resource_type = 'record' and p.resource_id = w.id
                      and p.status <> 'rejected'
                      and (p.expires_at is null or p.expires_at > now())
                      and coalesce(p.is_public, false) = false
                      and (p.granted_to_user_id = p_person
                           or p.granted_to_organization_id in (select m.org from my_orgs m))
                      and p.permission_level is not null) as addressed,
           -- a record membership (iam.membership_grant)
           exists (select 1 from iam.memberships m
                     join iam.membership_grant g
                       on g.member_role = m.role and g.container_type in ('record', '*')
                    where m.container_type = 'record' and m.container_id = w.id
                      and m.user_id = p_person and m.deleted_at is null
                      and g.confers >= v_req) as membership_hit,
           -- public._edu_can_read_via_assignment (the record arm)
           exists (select 1 from platform.associations_live a
                     join iam.memberships m
                       on m.container_type = 'scope' and m.container_id = a.target_id
                      and m.user_id = p_person and m.status = 'active' and m.deleted_at is null
                    where a.source_type = 'record' and a.source_id = w.id
                      and a.target_type = 'scope' and a.role = 'assignment') as edu_hit
      from w
      left join orgs o on o.org = w.org
  ),
  -- Which targets this body answers, and which still need the member lane's level.
  y as materialized (
    select x.*,
           (x.n_rows > 1 or x.in_global_org or x.has_container) as to_kernel,
           case when x.n_rows = 1 and not x.archived and not x.anchor_free
                     and not x.in_global_org and not x.has_container
                then custom.confidential_answer(p_person, x.id, v_req) end as conf
      from x
  ),
  early as materialized (
    select y.*,
           coalesce(y.n_rows = 1 and not y.to_kernel and not y.archived and y.conf is null
            and (
              (v_req = 'viewer' and y.has_library_row
                 and (public.user_can_read_via_library_grant(p_person, 'record', y.id)
                      or public.library_is_open('record', y.id)))
              or y.owner = p_person
              or y.grant_hit
              or y.membership_hit
              or (v_req = 'viewer' and y.edu_hit)
              or (v_lanes.org_role_lane and y.is_admin)
              or (v_lanes.org_member_lane and y.has_access and not y.store_open
                  and v_req <= 'editor'::public.permission_level)
            ), false) as early_yes  -- a row with no creator makes `owner = p_person` null, never yes
      from y
  ),
  -- The member lane's level (iam.member_lane_confers), per organization and Table, asked only
  -- where nothing earlier answered and only where the kernel itself would reach that arm.
  confers as materialized (
    select q.org, q.tbl,
           iam.member_lane_confers(p_person, q.org, 'record', null, q.tbl, true) as lvl
      from (select distinct e.org, e.tbl from early e
             where e.n_rows = 1 and not e.to_kernel and not e.archived and e.conf is null
               and not e.early_yes
               and not (v_req = 'viewer' and e.pub)
               and v_lanes.org_member_lane and e.has_access and e.store_open
               and not e.addressed) q
  )
  -- KERNEL-SHADOW h: one row per target (an id two rows carry is asked of the kernel once).
  select distinct on (e.id) e.id,
         case
           when e.to_kernel then coalesce(iam.has_access_for(p_person, 'record', e.id, v_req), false)
           when e.n_rows = 0 then false
           when e.archived then false
           when e.conf is not null then e.conf
           when e.early_yes then true
           -- KERNEL-SHADOW h: the public lane is never granted on published_to_web alone. A row it
           -- would open, and nothing else opens, is asked of the kernel, which reads the row column
           -- itself - so a row written with the T-13 dual-write trigger bypassed answers exactly as before.
           when v_req = 'viewer' and e.pub then coalesce(iam.has_access_for(p_person, 'record', e.id, v_req), false)
           else coalesce(
                  v_lanes.org_member_lane and e.has_access and e.store_open and not e.addressed
                  and v_req <= (select c.lvl from confers c
                                 where c.org = e.org and c.tbl is not distinct from e.tbl),
                  false)
         end
    from early e
   order by e.id;
  if v_pcm is not null then
    perform pg_catalog.set_config('plan_cache_mode', v_pcm, true);
  end if;
end;
$function$;
