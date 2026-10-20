-- chair-step: replaces 9 public/agent list readers and 4 custom candidate readers in place so a revoked (archived, expired) grant counts nowhere; one new SQL helper iam.grant_in_force; no table, trigger or grant touched
-- additive: yes
-- guard: custom/system_enabled
-- lane: ACCESS-REVOKE
-- lock: custom
-- based-on: public.agx_get_list(integer, integer) 646ae448c62704a578226c9b410df917234ff003fdbaac6a0f97a799a0b7603c
-- based-on: public.agx_get_shared_for_chat(text) a90e8cbce91e0108ee92f34f769829d2e83ec9e5c698fb7a715fcf76a4ec7e48
-- based-on: public.agx_get_shared_with_me(text) 42a60b5b21c7517efb2005b1f9cf94c9e169c4268d83986b7f6640574eea416f
-- based-on: public.agx_search(text, boolean, integer, integer) 31fc2aaada47ea054c06c86806817fee55eec1cda6acd78bc861ffc38d9f00b4
-- based-on: agent.list_rows_by_ids(uuid[]) 385d7a2509ed5a203ad36de24017ee0453df990c2b2c05fa8f8bab11ba9eb1f7
-- based-on: public.agx_get_shortcuts_for_context(uuid, uuid) 10ad056debc64780554ff58640be5f0421859ea4625f4a0391111643e87187ef
-- based-on: public.agx_get_shortcuts_for_context_m(uuid, uuid) 2e756567bf5735000c2a1cdafee63e92f315a5bc7c9ddae356fe82fa4345daa0
-- based-on: public.cvx_deep_hits(text) f8a8bedc01ce8589ded95adc07a6cddb9fd269bc7c8afd6118a8be4e17da665b
-- based-on: public.get_cx_conversations_shared_with_me() ea47173506b28fa94443ff0925644b9809af88a2cf9251cfc41a17cdb8967e09
-- based-on: custom.read_door_granted_ids(uuid, uuid) fb3b0ece336243e3bc6f85f3ca32cd444bbee621e7684079c95731324e249fec
-- based-on: custom.tables_seen_once_per_group(uuid, uuid[]) 90364ec4bedd3231aeb7733af8980381743c4a4e3b3b5513c9c245fe3be1636d
-- based-on: custom.tables_seen_among(uuid, uuid[], uuid[]) 352e57f7615f03010bf40311a4660e57c2f6aabe6b3c0d2813094268cfcb6543
-- based-on: custom.seen_among(uuid, uuid[]) f2437fba7374a520b792b825414667ec6d98f0f21b8824d033d855444b694564
--
-- ACCESS-REVOKE a — A REVOKED GRANT IS IN FORCE NOWHERE.
--
-- A share is revoked by archiving its iam.permissions row (iam.remove_grant: status 'archived', expires_at = now();
-- the trigger iam._removed_grant_ends_now makes every removal end now). The access kernel (iam.granted_level,
-- iam.grant_addressed_level, public.has_permission_for) counts a row only while status <> 'rejected' and it has not
-- expired, so the kernel and every door built on it refuse a revoked person at once (proved for 19 record doors:
-- scripts/campaign-tests/accessrevoke_a_a_revoked_share_opens_no_door.py).
--
-- But thirteen SECURITY DEFINER readers re-typed "a grant exists" without that rule:
--   * NINE LISTS LEAKED. A revoked agent share still listed the agent (name, description, tags, owner email) in
--     public.agx_get_shared_with_me, public.agx_get_shared_for_chat, public.agx_search, public.agx_get_list and
--     agent.list_rows_by_ids; a revoked agent-shortcut share still listed the shortcut
--     (public.agx_get_shortcuts_for_context, _m); a revoked chat share still listed the chat (title, status,
--     message count) in public.get_cx_conversations_shared_with_me and matched it in public.cvx_deep_hits.
--     The kernel said no to all of them (iam.has_access false, the table's RLS showed 0 rows).
--     The NOT EXISTS de-duplication arms get the same rule, so an agent whose direct share was revoked still
--     lists through the organization arm when the organization reaches it.
--   * FOUR CANDIDATE READERS were only slow. custom.read_door_granted_ids, custom.tables_seen_once_per_group,
--     custom.tables_seen_among and custom.seen_among name the records that must be asked one at a time; a revoked
--     grant kept a record named, which turned off "the whole Table" for its owner (visible_set.o_all_visible) and
--     with it kept-value serving (larkspur Jobs: 30 revoked shares). Nothing was readable through them: every named
--     record is asked of the ladder. A record membership counts only while not deleted (the kernel's own arm,
--     iam.has_access_for_many_in).
-- THE ONE RULE is now a function, iam.grant_in_force(status, expires_at): the kernel's predicate word for word (SQL,
-- inlined). Since: these readers never had it (read_door_granted_ids from 2026-09-19, commit 655d245384; the
-- READ-SPEED-ORG-2 and -3 bodies, both inverses included, carried the same arms).
--
-- Test: scripts/campaign-tests/accessrevoke_a_a_revoked_share_opens_no_door.py (RED before, GREEN after).
-- Inverse: migrations/inverse/20261025240000_accessrevoke_a_a_revoked_grant_is_in_force_nowhere_down.sql

CREATE FUNCTION iam.grant_in_force(p_status text, p_expires_at timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 STABLE PARALLEL SAFE
AS $function$
  -- THE ONE RULE for "this iam.permissions row grants anything right now": the predicate iam.granted_level,
  -- iam.grant_addressed_level and public.has_permission_for apply. A revoked share is archived with expires_at = now().
  select coalesce(p_status, 'active') <> 'rejected' and (p_expires_at is null or p_expires_at > pg_catalog.now())
$function$;
COMMENT ON FUNCTION iam.grant_in_force(text, timestamp with time zone) IS
  'ACCESS-REVOKE: the one rule for a grant in force (not rejected, not expired; a revoke archives and expires). Every reader of iam.permissions that treats a row as a grant applies it.';

CREATE OR REPLACE FUNCTION public.agx_get_list(p_limit integer DEFAULT NULL::integer, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, agent_type text, name text, description text, model_id uuid, category text, tags text[], is_active boolean, is_archived boolean, is_favorite boolean, created_by uuid, organization_id uuid, task_id uuid, source_agent_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, is_owner boolean, access_level text, shared_by_email text, orchestra jsonb, offering_id uuid, organization_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid();
BEGIN
  RETURN QUERY
  WITH my_orgs AS (
    SELECT om.organization_id FROM iam.organization_member om WHERE om.user_id = v_uid
  ),
  -- The platform access reader, set-wise (iam.accessible_entity_ids is the twin of iam.has_access_for).
  viewable AS MATERIALIZED (SELECT unnest(iam.accessible_entity_ids('agent', 'viewer', 100000)) AS rid),
  editable AS MATERIALIZED (SELECT unnest(iam.accessible_entity_ids('agent', 'editor', 100000)) AS rid),
  all_agents AS (
    SELECT a.id, a.agent_type, a.name, a.description, a.model_id, a.category, a.tags,
           a.is_active, a.is_archived, platform.my_favorite('agent', a.id) AS is_favorite, a.created_by, a.organization_id, a.task_id, a.source_agent_id, a.created_at, a.updated_at,
           true AS is_owner, 'owner'::text AS access_level, NULL::text AS shared_by_email
    FROM agent.definition a
    WHERE a.created_by = v_uid AND a.agent_type = 'user'
      AND a.deleted_at IS NULL
    UNION ALL
    SELECT a.id, a.agent_type, a.name, a.description, a.model_id, a.category, a.tags,
           a.is_active, a.is_archived, platform.my_favorite('agent', a.id) AS is_favorite, a.created_by, a.organization_id, a.task_id, a.source_agent_id, a.created_at, a.updated_at,
           false, perm.permission_level::text, u_owner.email
    FROM agent.definition a
    INNER JOIN iam.permissions perm ON perm.resource_type = 'agent' and iam.grant_in_force(perm.status, perm.expires_at) AND perm.resource_id = a.id AND perm.granted_to_user_id = v_uid
    LEFT JOIN auth.users u_owner ON u_owner.id = a.created_by
    WHERE a.created_by != v_uid
      AND a.deleted_at IS NULL
    UNION ALL
    SELECT DISTINCT ON (a.id) a.id, a.agent_type, a.name, a.description, a.model_id, a.category, a.tags,
           a.is_active, a.is_archived, platform.my_favorite('agent', a.id) AS is_favorite, a.created_by, a.organization_id, a.task_id, a.source_agent_id, a.created_at, a.updated_at,
           false, perm.permission_level::text, u_owner.email
    FROM agent.definition a
    INNER JOIN iam.permissions perm ON perm.resource_type = 'agent' and iam.grant_in_force(perm.status, perm.expires_at) AND perm.resource_id = a.id
      AND perm.granted_to_organization_id IN (SELECT mo.organization_id FROM my_orgs mo)
    LEFT JOIN auth.users u_owner ON u_owner.id = a.created_by
    WHERE a.created_by != v_uid
      AND a.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM iam.permissions p2 WHERE p2.resource_type = 'agent' and iam.grant_in_force(p2.status, p2.expires_at) AND p2.resource_id = a.id AND p2.granted_to_user_id = v_uid)
    UNION ALL
    -- Organization-level reach (the access ladder): agents the platform access reader says the person can open
    -- with no explicit permission row. The reader decides, not this list.
    SELECT a.id, a.agent_type, a.name, a.description, a.model_id, a.category, a.tags,
           a.is_active, a.is_archived, platform.my_favorite('agent', a.id) AS is_favorite, a.created_by, a.organization_id, a.task_id, a.source_agent_id, a.created_at, a.updated_at,
           false,
           CASE WHEN a.id IN (SELECT e.rid FROM editable e) THEN 'editor' ELSE 'viewer' END,
           u_owner.email
    FROM agent.definition a
    LEFT JOIN auth.users u_owner ON u_owner.id = a.created_by
    WHERE a.id IN (SELECT v.rid FROM viewable v)
      AND a.agent_type = 'user'
      AND a.created_by != v_uid
      AND a.deleted_at IS NULL
      AND a.organization_id IN (SELECT mo.organization_id FROM my_orgs mo)
      AND NOT EXISTS (SELECT 1 FROM iam.permissions p3 WHERE p3.resource_type = 'agent' and iam.grant_in_force(p3.status, p3.expires_at) AND p3.resource_id = a.id
                        AND (p3.granted_to_user_id = v_uid OR p3.granted_to_organization_id IN (SELECT mo.organization_id FROM my_orgs mo)))
  ),
  page AS (
    SELECT * FROM all_agents
    ORDER BY all_agents.is_favorite DESC, all_agents.updated_at DESC, all_agents.id
    LIMIT p_limit OFFSET p_offset
  )
  SELECT p.*, o.orchestra,
    CASE WHEN d.settings->>'offering_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (d.settings->>'offering_id')::uuid END,
    (SELECT org.name FROM iam.organizations org WHERE org.id = p.organization_id)
  FROM page p
  LEFT JOIN agx_orchestra_badges() o ON o.agent_id = p.id
  LEFT JOIN agent.definition d ON d.id = p.id
  ORDER BY p.is_favorite DESC, p.updated_at DESC, p.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.agx_get_shared_for_chat(p_archived text DEFAULT 'active'::text)
 RETURNS TABLE(id uuid, name text, permission_level text, owner_email text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.id, a.name, perm.permission_level::text, u.email
  FROM agent.definition a
  INNER JOIN iam.permissions perm ON perm.resource_type = 'agent' and iam.grant_in_force(perm.status, perm.expires_at) AND perm.resource_id = a.id AND perm.granted_to_user_id = (select auth.uid())
  LEFT JOIN auth.users u ON u.id = a.created_by
  WHERE a.created_by != (select auth.uid()) AND a.is_active AND a.deleted_at IS NULL
    AND (CASE lower(coalesce(p_archived, 'active'))
           WHEN 'all' THEN TRUE
           WHEN 'archived' THEN a.is_archived IS TRUE
           ELSE a.is_archived IS NOT TRUE END)
  ORDER BY a.name;
$function$;

CREATE OR REPLACE FUNCTION public.agx_get_shared_with_me(p_archived text DEFAULT 'active'::text)
 RETURNS TABLE(id uuid, name text, description text, agent_type text, category text, tags text[], owner_id uuid, owner_email text, permission_level text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.id, a.name, a.description, a.agent_type, a.category, a.tags, a.created_by, u.email, perm.permission_level::text, a.created_at, a.updated_at
  FROM agent.definition a
  INNER JOIN iam.permissions perm ON perm.resource_type = 'agent' and iam.grant_in_force(perm.status, perm.expires_at) AND perm.resource_id = a.id AND perm.granted_to_user_id = (select auth.uid())
  LEFT JOIN auth.users u ON u.id = a.created_by
  WHERE a.created_by != (select auth.uid()) AND a.deleted_at IS NULL
    AND (CASE lower(coalesce(p_archived, 'active'))
           WHEN 'all' THEN TRUE
           WHEN 'archived' THEN a.is_archived IS TRUE
           ELSE a.is_archived IS NOT TRUE END)
  ORDER BY a.name;
$function$;

CREATE OR REPLACE FUNCTION public.agx_search(p_query text, p_deep boolean DEFAULT false, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, agent_type text, name text, description text, model_id uuid, category text, tags text[], is_active boolean, is_archived boolean, is_favorite boolean, created_by uuid, organization_id uuid, task_id uuid, source_agent_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, is_owner boolean, access_level text, shared_by_email text, match_score integer, match_field text, orchestra jsonb, offering_id uuid, organization_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid  uuid := auth.uid();
  v_q    text := lower(btrim(coalesce(p_query, '')));
  v_like text;
BEGIN
  IF v_uid IS NULL OR v_q = '' THEN RETURN; END IF;

  v_like := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  RETURN QUERY
  WITH accessible AS (
    SELECT a.id, a.agent_type, a.name, a.description, a.model_id, a.category, a.tags,
           a.is_active, a.is_archived, platform.my_favorite('agent', a.id) AS is_favorite, a.created_by, a.organization_id, a.task_id, a.source_agent_id, a.created_at, a.updated_at,
           true AS is_owner, 'owner'::text AS access_level, NULL::text AS shared_by_email,
           a.messages
    FROM agent.definition a
    WHERE a.created_by = v_uid AND a.agent_type = 'user'
      AND a.deleted_at IS NULL
    UNION ALL
    SELECT a.id, a.agent_type, a.name, a.description, a.model_id, a.category, a.tags,
           a.is_active, a.is_archived, platform.my_favorite('agent', a.id) AS is_favorite, a.created_by, a.organization_id, a.task_id, a.source_agent_id, a.created_at, a.updated_at,
           false, perm.permission_level::text, u_owner.email, a.messages
    FROM agent.definition a
    INNER JOIN iam.permissions perm ON perm.resource_type = 'agent' and iam.grant_in_force(perm.status, perm.expires_at) AND perm.resource_id = a.id AND perm.granted_to_user_id = v_uid
    LEFT JOIN auth.users u_owner ON u_owner.id = a.created_by
    WHERE a.created_by != v_uid
      AND a.deleted_at IS NULL
    UNION ALL
    SELECT DISTINCT ON (a.id) a.id, a.agent_type, a.name, a.description, a.model_id, a.category, a.tags,
           a.is_active, a.is_archived, platform.my_favorite('agent', a.id) AS is_favorite, a.created_by, a.organization_id, a.task_id, a.source_agent_id, a.created_at, a.updated_at,
           false, perm.permission_level::text, u_owner.email, a.messages
    FROM agent.definition a
    INNER JOIN iam.permissions perm ON perm.resource_type = 'agent' and iam.grant_in_force(perm.status, perm.expires_at) AND perm.resource_id = a.id
      AND perm.granted_to_organization_id IN (SELECT om.organization_id FROM iam.organization_member om WHERE om.user_id = v_uid)
    LEFT JOIN auth.users u_owner ON u_owner.id = a.created_by
    WHERE a.created_by != v_uid
      AND a.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM iam.permissions p2 WHERE p2.resource_type = 'agent' and iam.grant_in_force(p2.status, p2.expires_at) AND p2.resource_id = a.id AND p2.granted_to_user_id = v_uid)
    UNION ALL
    -- ADMIN APPS keep full access: a platform admin on /administration (lane open + admin
    -- identity, both inside is_platform_admin) finds every agent not already reachable above.
    SELECT a.id, a.agent_type, a.name, a.description, a.model_id, a.category, a.tags,
           a.is_active, a.is_archived, platform.my_favorite('agent', a.id) AS is_favorite, a.created_by, a.organization_id, a.task_id, a.source_agent_id, a.created_at, a.updated_at,
           false, 'admin'::text, u_owner.email, a.messages
    FROM agent.definition a
    LEFT JOIN auth.users u_owner ON u_owner.id = a.created_by
    WHERE public.is_platform_admin()
      AND a.deleted_at IS NULL
      AND NOT (a.created_by = v_uid AND a.agent_type = 'user')
      AND NOT EXISTS (SELECT 1 FROM iam.permissions pa WHERE pa.resource_type = 'agent' and iam.grant_in_force(pa.status, pa.expires_at) AND pa.resource_id = a.id AND pa.granted_to_user_id = v_uid)
      AND NOT EXISTS (SELECT 1 FROM iam.permissions pb WHERE pb.resource_type = 'agent' and iam.grant_in_force(pb.status, pb.expires_at) AND pb.resource_id = a.id
            AND pb.granted_to_organization_id IN (SELECT om.organization_id FROM iam.organization_member om WHERE om.user_id = v_uid))
  ),
  scored AS (
    SELECT c.*,
      ( CASE WHEN lower(c.id::text) = v_q THEN 100000
             WHEN lower(c.id::text) LIKE v_like THEN 5000 ELSE 0 END
      + CASE WHEN lower(coalesce(c.name,'')) = v_q THEN 10000
             WHEN lower(coalesce(c.name,'')) LIKE v_q || '%' THEN 5000
             WHEN lower(coalesce(c.name,'')) LIKE v_like THEN 2000 ELSE 0 END
      + CASE WHEN lower(coalesce(c.description,'')) = v_q THEN 1000
             WHEN lower(coalesce(c.description,'')) LIKE v_like THEN 500 ELSE 0 END
      + CASE WHEN lower(coalesce(c.category,'')) LIKE v_like THEN 300 ELSE 0 END
      + CASE WHEN EXISTS (SELECT 1 FROM unnest(coalesce(c.tags, '{}'::text[])) t WHERE lower(t) LIKE v_like) THEN 300 ELSE 0 END
      + CASE WHEN lower(coalesce(c.model_id::text,'')) LIKE v_like THEN 100 ELSE 0 END
      + CASE WHEN lower(coalesce(c.agent_type,'')) LIKE v_like THEN 100 ELSE 0 END
      + CASE WHEN lower(coalesce(c.shared_by_email,'')) LIKE v_like THEN 200 ELSE 0 END
      + CASE WHEN p_deep AND lower(coalesce(c.messages::text,'')) LIKE v_like THEN 50 ELSE 0 END
      )::integer AS match_score,
      CASE
        WHEN lower(c.id::text) = v_q OR lower(c.id::text) LIKE v_like THEN 'id'
        WHEN lower(coalesce(c.name,'')) LIKE v_like THEN 'name'
        WHEN lower(coalesce(c.description,'')) LIKE v_like THEN 'description'
        WHEN lower(coalesce(c.category,'')) LIKE v_like THEN 'category'
        WHEN EXISTS (SELECT 1 FROM unnest(coalesce(c.tags, '{}'::text[])) t WHERE lower(t) LIKE v_like) THEN 'tags'
        WHEN lower(coalesce(c.shared_by_email,'')) LIKE v_like THEN 'shared_by_email'
        WHEN lower(coalesce(c.model_id::text,'')) LIKE v_like THEN 'model'
        WHEN lower(coalesce(c.agent_type,'')) LIKE v_like THEN 'agent_type'
        WHEN p_deep AND lower(coalesce(c.messages::text,'')) LIKE v_like THEN 'prompt'
        ELSE NULL
      END AS match_field
    FROM accessible c
  ),
  page AS (
    SELECT s.id, s.agent_type, s.name, s.description, s.model_id, s.category, s.tags,
           s.is_active, s.is_archived, s.is_favorite, s.created_by, s.organization_id, s.task_id, s.source_agent_id, s.created_at, s.updated_at,
           s.is_owner, s.access_level, s.shared_by_email, s.match_score, s.match_field
    FROM scored s
    WHERE s.match_score > 0
    ORDER BY s.match_score DESC, s.is_favorite DESC, s.updated_at DESC, s.id
    LIMIT p_limit OFFSET p_offset
  )
  SELECT p.*, o.orchestra,
    CASE WHEN d.settings->>'offering_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (d.settings->>'offering_id')::uuid END,
    (SELECT org.name FROM iam.organizations org WHERE org.id = p.organization_id)
  FROM page p
  LEFT JOIN agx_orchestra_badges() o ON o.agent_id = p.id
  LEFT JOIN agent.definition d ON d.id = p.id
  ORDER BY p.match_score DESC, p.is_favorite DESC, p.updated_at DESC, p.id;
END;
$function$;

CREATE OR REPLACE FUNCTION agent.list_rows_by_ids(p_ids uuid[])
 RETURNS TABLE(id uuid, agent_type text, name text, description text, model_id uuid, category text, tags text[], is_active boolean, is_archived boolean, is_favorite boolean, created_by uuid, organization_id uuid, task_id uuid, source_agent_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, is_owner boolean, access_level text, shared_by_email text, orchestra jsonb, offering_id uuid, organization_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- The rows public.agx_get_list_full() returns, for the given ids only (2026-10-17, chat.route_seed's pinned
-- agents). Same five lanes, same columns, same derivations; the organization-reach lane asks the per-row kernel
-- (iam.has_access_for, the twin of iam.accessible_entity_ids) about these ids instead of building the whole set.
-- Keep in step with public.agx_get_list / public.agx_get_list_full.
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or coalesce(cardinality(p_ids), 0) = 0 then return; end if;
  return query
  with ids as materialized (select distinct u as id from unnest(p_ids) u),
  my_orgs as (select om.organization_id from iam.organization_member om where om.user_id = v_uid),
  rows_ as (
    select a.id, a.agent_type, a.name, a.description, a.model_id, a.category, a.tags,
           a.is_active, a.is_archived, platform.my_favorite('agent', a.id) as is_favorite, a.created_by, a.organization_id,
           a.task_id, a.source_agent_id, a.created_at, a.updated_at,
           true as is_owner, 'owner'::text as access_level, null::text as shared_by_email
    from agent.definition a join ids on ids.id = a.id
    where a.created_by = v_uid and a.agent_type = 'user' and a.deleted_at is null
    union all
    select a.id, a.agent_type, a.name, a.description, a.model_id, a.category, a.tags,
           a.is_active, a.is_archived, platform.my_favorite('agent', a.id), a.created_by, a.organization_id,
           a.task_id, a.source_agent_id, a.created_at, a.updated_at,
           false, perm.permission_level::text, u_owner.email
    from agent.definition a join ids on ids.id = a.id
    join iam.permissions perm on perm.resource_type = 'agent' and iam.grant_in_force(perm.status, perm.expires_at) and perm.resource_id = a.id and perm.granted_to_user_id = v_uid
    left join auth.users u_owner on u_owner.id = a.created_by
    where a.created_by != v_uid and a.deleted_at is null
    union all
    select distinct on (a.id) a.id, a.agent_type, a.name, a.description, a.model_id, a.category, a.tags,
           a.is_active, a.is_archived, platform.my_favorite('agent', a.id), a.created_by, a.organization_id,
           a.task_id, a.source_agent_id, a.created_at, a.updated_at,
           false, perm.permission_level::text, u_owner.email
    from agent.definition a join ids on ids.id = a.id
    join iam.permissions perm on perm.resource_type = 'agent' and iam.grant_in_force(perm.status, perm.expires_at) and perm.resource_id = a.id
      and perm.granted_to_organization_id in (select mo.organization_id from my_orgs mo)
    left join auth.users u_owner on u_owner.id = a.created_by
    where a.created_by != v_uid and a.deleted_at is null
      and not exists (select 1 from iam.permissions p2 where p2.resource_type = 'agent' and iam.grant_in_force(p2.status, p2.expires_at) and p2.resource_id = a.id and p2.granted_to_user_id = v_uid)
    union all
    select a.id, a.agent_type, a.name, a.description, a.model_id, a.category, a.tags,
           a.is_active, a.is_archived, platform.my_favorite('agent', a.id), a.created_by, a.organization_id,
           a.task_id, a.source_agent_id, a.created_at, a.updated_at,
           false,
           case when iam.has_access_for(v_uid, 'agent', a.id, 'editor') then 'editor' else 'viewer' end,
           u_owner.email
    from agent.definition a join ids on ids.id = a.id
    left join auth.users u_owner on u_owner.id = a.created_by
    where a.agent_type = 'user' and a.created_by != v_uid and a.deleted_at is null
      and a.organization_id in (select mo.organization_id from my_orgs mo)
      and not exists (select 1 from iam.permissions p3 where p3.resource_type = 'agent' and iam.grant_in_force(p3.status, p3.expires_at) and p3.resource_id = a.id
                        and (p3.granted_to_user_id = v_uid or p3.granted_to_organization_id in (select mo.organization_id from my_orgs mo)))
      and iam.has_access_for(v_uid, 'agent', a.id, 'viewer')
  )
  select r.*, o.orchestra,
    case when d.settings->>'offering_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (d.settings->>'offering_id')::uuid end,
    (select org.name from iam.organizations org where org.id = r.organization_id)
  from rows_ r
  left join agx_orchestra_badges() o on o.agent_id = r.id
  left join agent.definition d on d.id = r.id
  union all
  select a.id, a.agent_type, a.name, a.description, a.model_id, a.category, a.tags, a.is_active, a.is_archived,
    platform.my_favorite('agent', a.id), a.created_by, a.organization_id, a.task_id, a.source_agent_id, a.created_at,
    a.updated_at, false, 'system'::text, null::text, o.orchestra,
    case when a.settings->>'offering_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (a.settings->>'offering_id')::uuid end,
    (select org.name from iam.organizations org where org.id = a.organization_id)
  from agent.definition a join ids on ids.id = a.id
  left join agx_orchestra_badges() o on o.agent_id = a.id
  where a.agent_type = 'builtin' and a.is_active = true and a.deleted_at is null
    -- agx_get_list_full's builtin lane (own, or internal+ in a global-readable system org) asked of the kernel;
    -- 612/612 builtins agree for admin@admin.com and test@test.com (2026-10-17). T-13 forbids new readers of the row column.
    and (a.created_by = v_uid or iam.has_access_for(v_uid, 'agent', a.id, 'viewer'));
end;
$function$;

CREATE OR REPLACE FUNCTION public.agx_get_shortcuts_for_context(p_project_id uuid DEFAULT NULL::uuid, p_task_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(shortcut_id uuid, category_id uuid, label text, description text, icon_name text, keyboard_shortcut text, sort_order integer, resolved_id uuid, is_version boolean, is_behind boolean, agent_id uuid, agent_version_id uuid, current_version integer, use_latest boolean, enabled_features jsonb, scope_mappings jsonb, context_mappings jsonb, display_mode text, allow_chat boolean, auto_run boolean, show_variable_panel boolean, variables_panel_style text, show_definition_messages boolean, show_definition_message_content boolean, hide_reasoning boolean, hide_tool_results boolean, show_pre_execution_gate boolean, pre_execution_message text, bypass_gate_seconds integer, default_user_input text, default_variables jsonb, context_overrides jsonb, llm_overrides jsonb, shortcut_user_id uuid, shortcut_org_id uuid, shortcut_project_id uuid, shortcut_task_id uuid, agent_name text, agent_variable_definitions jsonb, agent_context_policies jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  -- rca5d_j: the shortcuts the caller may open, asked of the kernel once.
  v_sc_ids uuid[] := iam.accessible_entity_ids('agent_shortcut', 'viewer'::public.permission_level);
BEGIN
  RETURN QUERY
  -- rca5d_g: the agent each returned shortcut runs is asked of the kernel — once per DISTINCT agent
  -- in the result — and its name is null when the caller may not open it. The shortcut, its label and
  -- the agent id stay (running it is the server's own question). Order is the inner query's order.
  WITH q AS MATERIALIZED (
    SELECT row_number() OVER () AS rn__, t.*
      FROM (
  SELECT
    s.id, s.category_id, s.label, s.description, s.icon_name, s.keyboard_shortcut, s.sort_order,
    CASE
      WHEN s.agent_id IS NULL THEN NULL
      WHEN s.use_latest THEN s.agent_id
      WHEN COALESCE(av.version_number, a.version) >= a.version THEN s.agent_id
      ELSE s.agent_version_id
    END,
    CASE
      WHEN s.agent_id IS NULL THEN false
      WHEN s.use_latest THEN false
      WHEN COALESCE(av.version_number, a.version) >= a.version THEN false
      ELSE true
    END,
    CASE
      WHEN s.agent_id IS NULL THEN false
      WHEN s.use_latest THEN false
      ELSE a.version > COALESCE(av.version_number, a.version)
    END,
    s.agent_id, s.agent_version_id, a.version, s.use_latest,
    s.enabled_features, s.scope_mappings, s.context_mappings,
    s.display_mode, s.allow_chat, s.auto_run,
    s.show_variable_panel, s.variables_panel_style,
    s.show_definition_messages, s.show_definition_message_content,
    s.hide_reasoning, s.hide_tool_results,
    s.show_pre_execution_gate, s.pre_execution_message, s.bypass_gate_seconds,
    s.default_user_input, s.default_variables, s.context_overrides, s.llm_overrides,
    s.created_by, s.organization_id, sp.target_id, st.target_id,
    CASE WHEN s.agent_id IS NULL THEN NULL
         WHEN s.use_latest OR COALESCE(av.version_number, a.version) >= a.version THEN a.name
         ELSE av.name END,
    CASE WHEN s.agent_id IS NULL THEN NULL
         WHEN s.use_latest OR COALESCE(av.version_number, a.version) >= a.version THEN a.variable_definitions
         ELSE av.variable_definitions END,
    CASE WHEN s.agent_id IS NULL THEN NULL
         WHEN s.use_latest OR COALESCE(av.version_number, a.version) >= a.version THEN a.context_policies
         ELSE av.context_policies END
  FROM agent.shortcut s
  LEFT JOIN agent.definition a ON a.id = s.agent_id AND a.deleted_at IS NULL
  LEFT JOIN agent.definition_version av ON av.id = s.agent_version_id
  LEFT JOIN LATERAL (
    SELECT x.target_id FROM platform.associations_live x
    WHERE x.source_type = 'agent_shortcut' AND x.source_id = s.id AND x.target_type = 'project'
    ORDER BY x.created_at LIMIT 1
  ) sp ON true
  LEFT JOIN LATERAL (
    SELECT x.target_id FROM platform.associations_live x
    WHERE x.source_type = 'agent_shortcut' AND x.source_id = s.id AND x.target_type = 'task'
    ORDER BY x.created_at LIMIT 1
  ) st ON true
  WHERE s.is_active = true
    AND (
      -- RC-A5d (rca5d_c): the project / task a shortcut is attached to is asked (DD-205): naming a
      -- record you may not open lists none of its shortcuts (their labels and agent names leaked).
      (p_project_id IS NOT NULL AND sp.target_id = p_project_id AND iam.assoc_side_readable('project', sp.target_id) AND s.id = ANY(v_sc_ids))
      OR (p_task_id IS NOT NULL AND st.target_id = p_task_id AND iam.assoc_side_readable('task', st.target_id) AND s.id = ANY(v_sc_ids))
      OR EXISTS (
        SELECT 1 FROM iam.permissions p
        WHERE p.resource_type = 'agent_shortcut' and iam.grant_in_force(p.status, p.expires_at)
          AND p.resource_id = s.id
          AND (
            p.granted_to_user_id = (select auth.uid())
            OR p.granted_to_organization_id IN (
              SELECT organization_id FROM iam.organization_member WHERE user_id = (select auth.uid())
            )
          )
      )
    )
  ORDER BY s.category_id, s.sort_order
      ) AS t(o_shortcut_id, o_category_id, o_label, o_description, o_icon_name, o_keyboard_shortcut, o_sort_order, o_resolved_id, o_is_version, o_is_behind, o_agent_id, o_agent_version_id, o_current_version, o_use_latest, o_enabled_features, o_scope_mappings, o_context_mappings, o_display_mode, o_allow_chat, o_auto_run, o_show_variable_panel, o_variables_panel_style, o_show_definition_messages, o_show_definition_message_content, o_hide_reasoning, o_hide_tool_results, o_show_pre_execution_gate, o_pre_execution_message, o_bypass_gate_seconds, o_default_user_input, o_default_variables, o_context_overrides, o_llm_overrides, o_shortcut_user_id, o_shortcut_org_id, o_shortcut_project_id, o_shortcut_task_id, o_agent_name, o_agent_variable_definitions, o_agent_context_policies)
  ), ok AS (
    SELECT d.aid, iam.has_access('agent', d.aid, 'viewer'::public.permission_level) AS ok
      FROM (SELECT DISTINCT q.o_agent_id AS aid FROM q WHERE q.o_agent_id IS NOT NULL) d
  )
  SELECT q.o_shortcut_id,
         q.o_category_id,
         q.o_label,
         q.o_description,
         q.o_icon_name,
         q.o_keyboard_shortcut,
         q.o_sort_order,
         q.o_resolved_id,
         q.o_is_version,
         q.o_is_behind,
         q.o_agent_id,
         q.o_agent_version_id,
         q.o_current_version,
         q.o_use_latest,
         q.o_enabled_features,
         q.o_scope_mappings,
         q.o_context_mappings,
         q.o_display_mode,
         q.o_allow_chat,
         q.o_auto_run,
         q.o_show_variable_panel,
         q.o_variables_panel_style,
         q.o_show_definition_messages,
         q.o_show_definition_message_content,
         q.o_hide_reasoning,
         q.o_hide_tool_results,
         q.o_show_pre_execution_gate,
         q.o_pre_execution_message,
         q.o_bypass_gate_seconds,
         q.o_default_user_input,
         q.o_default_variables,
         q.o_context_overrides,
         q.o_llm_overrides,
         q.o_shortcut_user_id,
         q.o_shortcut_org_id,
         q.o_shortcut_project_id,
         q.o_shortcut_task_id,
         CASE WHEN ok.ok THEN q.o_agent_name END,
         q.o_agent_variable_definitions,
         q.o_agent_context_policies
    FROM q LEFT JOIN ok ON ok.aid = q.o_agent_id
   ORDER BY q.rn__;
END;
$function$;

CREATE OR REPLACE FUNCTION public.agx_get_shortcuts_for_context_m(p_project_id uuid DEFAULT NULL::uuid, p_task_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(shortcut_id uuid, category_id uuid, label text, description text, icon_name text, keyboard_shortcut text, sort_order integer, resolved_id uuid, is_version boolean, is_behind boolean, agent_id uuid, agent_version_id uuid, current_version integer, use_latest boolean, enabled_features jsonb, scope_mappings jsonb, context_mappings jsonb, display_mode text, allow_chat boolean, auto_run boolean, show_variable_panel boolean, variables_panel_style text, show_definition_messages boolean, show_definition_message_content boolean, hide_reasoning boolean, hide_tool_results boolean, show_pre_execution_gate boolean, pre_execution_message text, bypass_gate_seconds integer, default_user_input text, default_variables jsonb, context_overrides jsonb, llm_overrides jsonb, shortcut_user_id uuid, shortcut_org_id uuid, shortcut_project_id uuid, shortcut_task_id uuid, agent_name text, agent_variable_definitions jsonb, agent_context_policies jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  -- rca5d_g: the agent each returned shortcut runs is asked of the kernel — once per DISTINCT agent
  -- in the result — and its name is null when the caller may not open it. The shortcut, its label and
  -- the agent id stay (running it is the server's own question). Order is the inner query's order.
  WITH q AS MATERIALIZED (
    SELECT row_number() OVER () AS rn__, t.*
      FROM (
  SELECT
    s.id, s.category_id, s.label, s.description, s.icon_name, s.keyboard_shortcut, s.sort_order,
    CASE
      WHEN s.agent_id IS NULL THEN NULL
      WHEN s.use_latest THEN s.agent_id
      WHEN COALESCE(av.version_number, a.version) >= a.version THEN s.agent_id
      ELSE s.agent_version_id
    END,
    CASE
      WHEN s.agent_id IS NULL THEN false
      WHEN s.use_latest THEN false
      WHEN COALESCE(av.version_number, a.version) >= a.version THEN false
      ELSE true
    END,
    CASE
      WHEN s.agent_id IS NULL THEN false
      WHEN s.use_latest THEN false
      ELSE a.version > COALESCE(av.version_number, a.version)
    END,
    s.agent_id, s.agent_version_id, a.version, s.use_latest,
    s.enabled_features, s.scope_mappings, s.context_mappings,
    s.display_mode, s.allow_chat, s.auto_run,
    s.show_variable_panel, s.variables_panel_style,
    s.show_definition_messages, s.show_definition_message_content,
    s.hide_reasoning, s.hide_tool_results,
    s.show_pre_execution_gate, s.pre_execution_message, s.bypass_gate_seconds,
    s.default_user_input, s.default_variables, s.context_overrides, s.llm_overrides,
    s.created_by, s.organization_id, sp.target_id, st.target_id,
    CASE WHEN s.agent_id IS NULL THEN NULL
         WHEN s.use_latest OR COALESCE(av.version_number, a.version) >= a.version THEN a.name
         ELSE av.name END,
    CASE WHEN s.agent_id IS NULL THEN NULL
         WHEN s.use_latest OR COALESCE(av.version_number, a.version) >= a.version THEN a.variable_definitions
         ELSE av.variable_definitions END,
    CASE WHEN s.agent_id IS NULL THEN NULL
         WHEN s.use_latest OR COALESCE(av.version_number, a.version) >= a.version THEN a.context_policies
         ELSE av.context_policies END
  FROM mandate.vw_shortcut s
  LEFT JOIN agent.definition a ON a.id = s.agent_id AND a.deleted_at IS NULL
  LEFT JOIN agent.definition_version av ON av.id = s.agent_version_id
  LEFT JOIN LATERAL (
    SELECT x.target_id FROM platform.associations_live x
    WHERE x.source_type = 'agent_shortcut' AND x.source_id = s.id AND x.target_type = 'project'
    ORDER BY x.created_at LIMIT 1
  ) sp ON true
  LEFT JOIN LATERAL (
    SELECT x.target_id FROM platform.associations_live x
    WHERE x.source_type = 'agent_shortcut' AND x.source_id = s.id AND x.target_type = 'task'
    ORDER BY x.created_at LIMIT 1
  ) st ON true
  WHERE s.is_active = true
    AND (
      -- RC-A5d (rca5d_c): the project / task a shortcut is attached to is asked (DD-205): naming a
      -- record you may not open lists none of its shortcuts (their labels and agent names leaked).
      (p_project_id IS NOT NULL AND sp.target_id = p_project_id AND iam.assoc_side_readable('project', sp.target_id))
      OR (p_task_id IS NOT NULL AND st.target_id = p_task_id AND iam.assoc_side_readable('task', st.target_id))
      OR EXISTS (
        SELECT 1 FROM iam.permissions p
        WHERE p.resource_type = 'agent_shortcut' and iam.grant_in_force(p.status, p.expires_at)
          AND p.resource_id = s.id
          AND (
            p.granted_to_user_id = (select auth.uid())
            OR p.granted_to_organization_id IN (
              SELECT organization_id FROM iam.organization_member WHERE user_id = (select auth.uid())
            )
          )
      )
    )
  ORDER BY s.category_id, s.sort_order
      ) AS t(o_shortcut_id, o_category_id, o_label, o_description, o_icon_name, o_keyboard_shortcut, o_sort_order, o_resolved_id, o_is_version, o_is_behind, o_agent_id, o_agent_version_id, o_current_version, o_use_latest, o_enabled_features, o_scope_mappings, o_context_mappings, o_display_mode, o_allow_chat, o_auto_run, o_show_variable_panel, o_variables_panel_style, o_show_definition_messages, o_show_definition_message_content, o_hide_reasoning, o_hide_tool_results, o_show_pre_execution_gate, o_pre_execution_message, o_bypass_gate_seconds, o_default_user_input, o_default_variables, o_context_overrides, o_llm_overrides, o_shortcut_user_id, o_shortcut_org_id, o_shortcut_project_id, o_shortcut_task_id, o_agent_name, o_agent_variable_definitions, o_agent_context_policies)
  ), ok AS (
    SELECT d.aid, iam.has_access('agent', d.aid, 'viewer'::public.permission_level) AS ok
      FROM (SELECT DISTINCT q.o_agent_id AS aid FROM q WHERE q.o_agent_id IS NOT NULL) d
  )
  SELECT q.o_shortcut_id,
         q.o_category_id,
         q.o_label,
         q.o_description,
         q.o_icon_name,
         q.o_keyboard_shortcut,
         q.o_sort_order,
         q.o_resolved_id,
         q.o_is_version,
         q.o_is_behind,
         q.o_agent_id,
         q.o_agent_version_id,
         q.o_current_version,
         q.o_use_latest,
         q.o_enabled_features,
         q.o_scope_mappings,
         q.o_context_mappings,
         q.o_display_mode,
         q.o_allow_chat,
         q.o_auto_run,
         q.o_show_variable_panel,
         q.o_variables_panel_style,
         q.o_show_definition_messages,
         q.o_show_definition_message_content,
         q.o_hide_reasoning,
         q.o_hide_tool_results,
         q.o_show_pre_execution_gate,
         q.o_pre_execution_message,
         q.o_bypass_gate_seconds,
         q.o_default_user_input,
         q.o_default_variables,
         q.o_context_overrides,
         q.o_llm_overrides,
         q.o_shortcut_user_id,
         q.o_shortcut_org_id,
         q.o_shortcut_project_id,
         q.o_shortcut_task_id,
         CASE WHEN ok.ok THEN q.o_agent_name END,
         q.o_agent_variable_definitions,
         q.o_agent_context_policies
    FROM q LEFT JOIN ok ON ok.aid = q.o_agent_id
   ORDER BY q.rn__;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cvx_deep_hits(p_search text)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH hits AS (
    -- The ONE place the trigram index is driven. Definer, so the policy's
    -- non-leakproof barrier is not in the way; the access shapes below are
    -- the barrier instead. Matches the VISIBLE text blocks only
    -- (chat.message_search_text, the same text the full-text door reads), so
    -- cx_message_text_trgm_idx serves it; thinking, tool calls and tool
    -- results are not searched (2026-09-30: the old whole-content trigram
    -- index made message saves hit the statement timeout).
    SELECT DISTINCT m.conversation_id
    FROM chat.message m
    WHERE nullif(btrim(coalesce(p_search, '')), '') IS NOT NULL
      AND m.deleted_at IS NULL AND m.is_visible_to_user IS TRUE
      AND chat.message_search_text(m.content) ILIKE '%'||btrim(p_search)||'%'
  )
  SELECT h.conversation_id
  FROM hits h
  JOIN chat.conversation c ON c.id = h.conversation_id AND c.deleted_at IS NULL
  WHERE auth.uid() IS NOT NULL
    AND (
      c.created_by = auth.uid()
      OR (c.organization_id IN (SELECT iam.my_orgs())
          AND c.visibility IN ('internal','public'))
      OR EXISTS (
        SELECT 1 FROM iam.permissions p
        WHERE p.resource_type = 'conversation' and iam.grant_in_force(p.status, p.expires_at) AND p.resource_id = c.id
          AND (p.granted_to_user_id = auth.uid()
               OR p.granted_to_organization_id IN (
                 SELECT om.organization_id FROM iam.organization_member om
                 WHERE om.user_id = auth.uid()))
      )
    );
$function$;

CREATE OR REPLACE FUNCTION public.get_cx_conversations_shared_with_me()
 RETURNS TABLE(id uuid, title text, status text, message_count integer, created_at timestamp with time zone, updated_at timestamp with time zone, permission_level text, owner_email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- THE TOKEN THE SHARING DOORS WRITE (ARGS-RULED-2, 2026-09-24). Every share of a chat is written
  -- as resource_type 'conversation' (public.share_resource_with_user / _with_org); this function
  -- read 'cx_conversation', a token retired when the table moved to chat.conversation, so it
  -- returned nothing to anybody. It now returns the SAME lane public.cvx_list_scoped('shared')
  -- serves: a grant to me by name, or to an organization I am a member of — one row per chat, my
  -- own grant winning over my organization's — never a chat I own.
  RETURN QUERY
  SELECT DISTINCT ON (c.id)
         c.id, c.title, c.status, c.message_count, c.created_at, c.updated_at,
         p.permission_level::text, u.email::text AS owner_email
    FROM iam.permissions p
    JOIN chat.conversation c ON c.id = p.resource_id
    JOIN auth.users u ON u.id = c.created_by
   WHERE p.resource_type = 'conversation' and iam.grant_in_force(p.status, p.expires_at)
     AND (p.granted_to_user_id = (SELECT auth.uid())
          OR p.granted_to_organization_id IN (SELECT om.organization_id FROM iam.organization_member om
                                               WHERE om.user_id = (SELECT auth.uid())))
     AND c.created_by IS DISTINCT FROM (SELECT auth.uid())
     AND c.deleted_at IS NULL
     AND c.status IS DISTINCT FROM 'archived'
   ORDER BY c.id, (p.granted_to_user_id IS NULL), c.updated_at DESC;
END;
$function$;

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
            select p.resource_id as id from iam.permissions p where p.resource_type = 'record' and iam.grant_in_force(p.status, p.expires_at)
            union all
            select m.container_id from iam.memberships m where m.container_type = 'record' and m.deleted_at is null
            union all
            select g.entity_id from platform.entity_grants g where g.entity_type = 'record'
            union all
            select rr.item_id from platform.reachability rr where rr.item_type = 'record'
          ) h
          join custom.record r
            on r.organization_id = p_organization_id
           and r.id = h.id
           and r.deleted_at is null
           -- PAGE-BUNDLE-SPEED (2026-10-20): `=` is an index condition, `is not distinct from` never is; the same rows
           -- (a named Table is not null, and a null one is answered by the left arm).
           and (p_table_id is null or r.table_id = p_table_id)
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
              select p.resource_id as id from iam.permissions p where p.resource_type = 'record' and iam.grant_in_force(p.status, p.expires_at)
              union all
              -- a membership held ON the record itself
              select m.container_id from iam.memberships m where m.container_type = 'record' and m.deleted_at is null
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
             and (p_table_id is null or r0.table_id = p_table_id)
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
                select p.resource_id as id from iam.permissions p where p.resource_type = 'record' and iam.grant_in_force(p.status, p.expires_at)
                union all
                select m.container_id from iam.memberships m where m.container_type = 'record' and m.deleted_at is null
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
            select p.resource_id as id from iam.permissions p where p.resource_type = 'record' and iam.grant_in_force(p.status, p.expires_at)
            union all
            select m.container_id from iam.memberships m where m.container_type = 'record' and m.deleted_at is null
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
$function$;

CREATE OR REPLACE FUNCTION custom.tables_seen_once_per_group(p_user_id uuid, p_organization_ids uuid[])
 RETURNS TABLE(organization_id uuid, id uuid, seen boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET plan_cache_mode TO 'force_generic_plan'
AS $function$
-- STORE-READ-PERF-3 (2026-09-28). WHICH TABLES THIS PERSON SEES IN THESE ORGANIZATIONS: the one
-- ladder's own viewer answer about every live row of the Table kernel, asked once per group of
-- Tables it cannot tell apart instead of once per Table.
--
-- `seen` is exactly what custom.visible_set's Table-kernel loop answered about each live Table at
-- viewer, one ladder walk per Table (0.55 ms for a Table she owns, 9 ms for one in an organization
-- that shares only what is shared, and the data home asks it for every organization she is in). On
-- a Table that answer is custom.reaches_directly (arms 1 to 3b and the scope arm) OR arm 4
-- (custom.table_has_a_visible_record: something inside it opens to her). The two halves:
--
-- 1. custom.reaches_directly ONCE PER SIGNATURE. What that walk reads about one record is (i) its
--    own columns; (ii) rows that NAME it by id: a grant (iam.permissions), a membership held on it
--    (record or scope), a library grant (platform.entity_grants), a closure row
--    (platform.reachability), a scope assignment or a portal relation (platform.associations), an
--    owned relation record (arm 3b, found from data->parent_id); (iii) its carrying edges
--    (custom.carrying_edges_of), recursing into each container through the same three. So a Table
--    named by nothing in (ii), whose id no second row carries, whose parent_id is well formed, and
--    whose ONE container is a record named by nothing, carried by one row and carried by nothing
--    itself, answers exactly like every other such Table whose own columns and whose container's
--    columns are the same. The signature is those columns: the whole row but its id, content and
--    clocks, a superset of what the ladder reads, so it can only split a group, never merge two
--    that differ. It is custom.levels_of's argument (STORE-READ-PERF-2) taken one carrying edge up
--    to a leaf container. One container only: custom.addressed_cap_specific takes the first
--    container at the nearest depth, and two at one depth come out in an order their ids decide.
--    Every other Table is asked on its own, through custom.levels_of (the same viewer answer).
--    EVERY Table is asked on its own when the registry gives `record` a per-row input no signature
--    carries: an FK containment parent, a reference gate, a detail or child parent pointer, a row
--    class column, the detail variant, owner-only trash.
-- 2. ARM 4, in its own terms and only where it could say yes: she created a live record in the
--    Table; else the viewer answer about each id custom.read_door_granted_ids names (when no more
--    than the ceiling) and about each record something other than the Table carries
--    (custom.carrying_edges_in, once per organization); more carried candidates than the ceiling,
--    where custom.table_has_a_visible_record's own LIMIT picks, are answered by it.
--
-- THE MEMO. Group answers live in this call's loop. As it returns it also leaves each
-- organization's answer in the STATEMENT memo (platform.memo_k_put: fenced by the statement, the
-- backend, the transaction's first write and the seat), so the per-organization custom.visible_set
-- calls the same door statement makes next read it instead of walking again. Nothing is stored
-- anywhere else, and nothing outlives the statement.
--
-- STORE-READ-PERF-5 (2026-09-30): the walk itself moved, unchanged, into custom.tables_seen_among
-- (asked here for every live Table); this function keeps the memo — the shortcut below and the
-- per-organization entries it leaves — exactly as before.
declare
  v_r_org   uuid[] := '{}';  v_r_id uuid[] := '{}';  v_r_seen boolean[] := '{}';
  v_arm     record;
  v_hd6     boolean := custom.hot_doors_6_on(p_user_id);
begin
  if p_organization_ids is null or cardinality(p_organization_ids) = 0 then
    return;
  end if;

  -- STORE-READ-PERF-4: ASKED AGAIN IN THE SAME STATEMENT (a door that primes, then a door it calls that
  -- primes again), the answer is the one this statement already worked out — read from the memo when
  -- every organization asked has its entry for this person, statement and snapshot.
  if pg_catalog.pg_current_xact_id_if_assigned() is null and p_user_id is not null
     and not exists (select 1 from unnest(p_organization_ids) x
                      where x is not null
                        and platform.memo_k_get('custom.tables_unseen:' || p_user_id::text || ':' || x::text
                                                || ':' || pg_catalog.pg_current_snapshot()::text) is null) then
    return query
      select x.org, y.id::uuid, true
        from (select distinct o as org from unnest(p_organization_ids) o where o is not null) x
        cross join lateral unnest(string_to_array(nullif(platform.memo_k_get(
               'custom.tables_seen:' || p_user_id::text || ':' || x.org::text || ':' || pg_catalog.pg_current_snapshot()::text), ''), ',')) y(id)
      union all
      select x.org, y.id::uuid, false
        from (select distinct o as org from unnest(p_organization_ids) o where o is not null) x
        cross join lateral unnest(string_to_array(nullif(platform.memo_k_get(
               'custom.tables_unseen:' || p_user_id::text || ':' || x.org::text || ':' || pg_catalog.pg_current_snapshot()::text), ''), ',')) y(id);
    perform platform.memo_k_put('custom.tables_seen_orgs:' || p_user_id::text || ':' || pg_catalog.pg_current_snapshot()::text,
                                coalesce((select string_agg(distinct x::text, ',') from unnest(p_organization_ids) x where x is not null), ''));
    return;
  end if;

  select coalesce(array_agg(g.organization_id), '{}'), coalesce(array_agg(g.id), '{}'), coalesce(array_agg(g.seen), '{}')
    into v_r_org, v_r_id, v_r_seen
    from custom.tables_seen_among(p_user_id, p_organization_ids, null) g;

  -- The statement memo, one pair of entries per organization asked (an organization with no live
  -- Table gets empty answers too, so its caller does not walk it again): the Tables she sees, and
  -- the Table-kernel ids custom.read_door_granted_ids names there — the same query, answered once
  -- for every organization, so custom.visible_set can take its grant ceiling from it.
  for v_arm in
    select o.org,
           coalesce((select string_agg(u.id::text, ',' order by u.id)
                       from unnest(v_r_org, v_r_id, v_r_seen) as u(org, id, seen)
                      where u.org = o.org and u.seen), '') as seen_ids,
           coalesce((select string_agg(u.id::text, ',' order by u.id)
                       from unnest(v_r_org, v_r_id, v_r_seen) as u(org, id, seen)
                      where u.org = o.org and not u.seen), '') as unseen_ids,
           coalesce(gr.ids, '') as granted_ids
      from (select distinct x as org from unnest(p_organization_ids) x where x is not null) o
      left join (
        select r.organization_id as org, string_agg(distinct r.id::text, ',') as ids
          from (
            select p.resource_id as id from iam.permissions p where p.resource_type = 'record' and iam.grant_in_force(p.status, p.expires_at)
            union all select m.container_id from iam.memberships m where m.container_type = 'record' and m.deleted_at is null
            union all select g.entity_id from platform.entity_grants g where g.entity_type = 'record'
            union all select rr.item_id from platform.reachability rr where rr.item_type = 'record'
          ) h
          join custom.record r
            on r.id = h.id and r.deleted_at is null
           and r.organization_id = any (p_organization_ids)
           and r.table_id is not distinct from custom.table_kernel_id()
         where not v_hd6
         group by 1
        union all
        -- HOT-DOORS-6 (2026-10-09): the same rows, found from the other side - the live Tables of these
        -- organizations (read in their organizations), kept when any of the four sources names the id - instead
        -- of every grant, membership, Library grant and closure row in the platform probing all sixteen partitions.
        select r.organization_id as org, string_agg(distinct r.id::text, ',') as ids
          from custom.record r
         where v_hd6
           and r.organization_id = any (p_organization_ids)
           and r.table_id = custom.table_kernel_id()
           and r.deleted_at is null
           and r.id in (select p.resource_id from iam.permissions p where p.resource_type = 'record' and iam.grant_in_force(p.status, p.expires_at)
                        union all select m.container_id from iam.memberships m where m.container_type = 'record' and m.deleted_at is null
                        union all select g.entity_id from platform.entity_grants g where g.entity_type = 'record'
                        union all select rr.item_id from platform.reachability rr where rr.item_type = 'record')
         group by 1
      ) gr on gr.org = o.org
  loop
    -- STORE-READ-PERF-4: only while the transaction has written nothing (see custom.visible_set).
    exit when pg_catalog.pg_current_xact_id_if_assigned() is not null;
    perform platform.memo_k_put('custom.tables_seen:' || coalesce(p_user_id::text, '-') || ':' || v_arm.org::text
                                || ':' || pg_catalog.pg_current_snapshot()::text,
                                v_arm.seen_ids);
    perform platform.memo_k_put('custom.tables_unseen:' || coalesce(p_user_id::text, '-') || ':' || v_arm.org::text
                                || ':' || pg_catalog.pg_current_snapshot()::text,
                                v_arm.unseen_ids);
    perform platform.memo_k_put('custom.kernel_granted:' || v_arm.org::text || ':' || pg_catalog.pg_current_snapshot()::text, v_arm.granted_ids);
  end loop;

  if pg_catalog.pg_current_xact_id_if_assigned() is null and p_user_id is not null then
    -- The organizations this statement asked about, for custom.query_visible_ids' one pass over them.
    perform platform.memo_k_put('custom.tables_seen_orgs:' || p_user_id::text || ':' || pg_catalog.pg_current_snapshot()::text,
                                coalesce((select string_agg(distinct x::text, ',') from unnest(p_organization_ids) x where x is not null), ''));
  end if;
  return query select u.org, u.id, u.seen from unnest(v_r_org, v_r_id, v_r_seen) as u(org, id, seen);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.tables_seen_among(p_user_id uuid, p_organization_ids uuid[], p_among uuid[])
 RETURNS TABLE(organization_id uuid, id uuid, seen boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET plan_cache_mode TO 'force_generic_plan'
AS $function$
-- STORE-READ-PERF-5 (2026-09-30). THE TABLE WALK OF custom.tables_seen_once_per_group, AMONG NAMED TABLES.
--
-- The body of custom.tables_seen_once_per_group (STORE-READ-PERF-3: the one ladder's viewer answer
-- about each live Table, asked once per group of Tables it cannot tell apart — its header has the
-- argument), moved here unchanged except for one line: with p_among, only the live Tables of these
-- organizations whose ids are in p_among are walked (null: every live Table, which is how
-- tables_seen_once_per_group calls it). A Table's answer never depends on which other Tables are
-- walked beside it: its group key is its own columns and its own container's, every member of a
-- group answers alike, and arm 4 is asked per Table. It reads and writes NO memo — that stays
-- tables_seen_once_per_group's, which is the only caller that asks for every Table.
declare
  v_ceiling integer := custom.read_door_ladder_ceiling();
  v_solo    boolean;
  v_ids     uuid[];  v_orgs uuid[];  v_keys text[];
  v_prev_k  text;
  v_prev_v  boolean;
  v_left_id uuid[] := '{}';  v_left_org uuid[] := '{}';
  v_r_org   uuid[] := '{}';  v_r_id uuid[] := '{}';  v_r_seen boolean[] := '{}';
  v_i       integer;
  v_seen    boolean;
  v_cand    uuid;
  v_arm     record;
  v_one     jsonb;
  v_org     uuid;
  v_reps    jsonb;  -- PERF-FIX-2: the one viewer answer of each group's first Table, asked as one set
  -- PERF-FIX-4: the Tables the set kernel already opens (see below), and the rest
  v_all     uuid[];
  v_fast    uuid[] := '{}';  v_fast_org uuid[] := '{}';
  v_among   uuid[] := p_among;
  v_all_org uuid[];  -- HOT-DOORS-6: the organization of each v_all Table, read in the same statement
  v_hd6     boolean := custom.hot_doors_6_on(p_user_id);
  v_orgmap  jsonb;   -- HOT-DOORS-6 c: Table id -> its organization (null when two organizations hold the id)
begin
  if p_organization_ids is null or cardinality(p_organization_ids) = 0 then
    return;
  end if;

  v_solo := p_user_id is null
         or exists (select 1 from platform.entity_relationships er
                     where er.child_type = 'record' and er.kind in ('composition', 'containment'))
         or platform.reference_gate_columns('record') is not null
         or platform.detail_parent_columns('record') is not null
         or platform.child_parent_columns('record') is not null
         or platform.row_class_column('record') is not null
         or platform.trash_is_owner_only('record')
         or exists (select 1 from platform.entity_types et
                     where et.token = 'record' and et.is_active and et.rls_variant = 'detail');

  -- PERF-FIX-4 (2026-10-07). KERNEL FIRST. Every live Table asked here is first put to the set form of the
  -- access kernel (iam.has_access_for_many, the very answer custom.reaches_directly_many hands to
  -- custom.reaches_directly) at viewer, ONCE. A Table it opens, that ONE row carries, whose parent_id cannot
  -- make custom.containment_parent raise, with no Confidential anchor, in an organization that is not
  -- archived, is one custom.reaches_directly answers true at its kernel step (viewer is the level floor) -
  -- so it is seen, whatever group it would have joined: its group's first Table would have been asked that
  -- same question and said yes for all of them. Those Tables are answered here and leave the walk; the walk
  -- below runs, unchanged, over the rest (a Table's answer never depends on which other Tables are walked
  -- beside it - see the header). Only while the transaction has written nothing (the set form's own rule),
  -- the knob access/kernel_set_form is on for this person, nothing makes every Table walk alone, and
  -- mx.data_home_set is not off; a failure of the set form is a WARNING and the whole walk runs as before.
  if not v_solo and pg_catalog.pg_current_xact_id_if_assigned() is null
     and coalesce(current_setting('mx.data_home_set', true), '') <> 'off'
     and 'viewer'::public.permission_level <= custom.level_floor()
     and iam.kernel_set_form_on(p_user_id) then
    -- HOT-DOORS-6 (2026-10-09): each Table's organization rides with it (one statement, same rows, same order)
    select coalesce(array_agg(x.id), '{}'::uuid[]), coalesce(array_agg(x.organization_id), '{}'::uuid[])
      into v_all, v_all_org
      from custom.record x
     where x.organization_id = any (p_organization_ids)
       and x.table_id = custom.table_kernel_id()
       and x.deleted_at is null
       and (p_among is null or x.id = any (p_among));
    if not v_hd6 then
      v_all_org := null;
    else
      -- HOT-DOORS-6 c: one keyed lookup per opened Table instead of a join the planner ran as a nested loop
      -- (1,539 x 1,855 comparisons, ~100 ms for admin@admin.com)
      select coalesce(jsonb_object_agg(g.id::text, case when g.n = 1 then g.org end), '{}'::jsonb)
        into v_orgmap
        from (select a.id, min(a.org::text) as org, count(distinct a.org) as n
                from unnest(v_all, v_all_org) a(id, org) group by a.id) g;
    end if;
    begin
      -- HOT-DOORS-6: the set form is told each Table's organization (a hint: read there, never filtered by
      -- it), and each opened Table's row is read in that organization (k.org) instead of in all sixteen
      -- partitions. Off (custom.hot_doors_6_on false): no hints, every read by id alone, as before.
      with k as materialized (
        select distinct m.target as id, (v_orgmap ->> m.target::text)::uuid as org
          from iam.has_access_for_many_in(p_user_id, v_all, v_all_org, 'viewer', 'record') m
         where m.allowed is true
      )
      select coalesce(array_agg(k.id), '{}'::uuid[]), coalesce(array_agg(r.org), '{}'::uuid[])
        into v_fast, v_fast_org
        from k
        cross join lateral (
          select count(*) as n,
                 min(w.organization_id::text)::uuid as org,
                 coalesce(bool_and(w.data -> 'parent_id' is null or jsonb_typeof(w.data -> 'parent_id') = 'null'
                                   or (jsonb_typeof(w.data -> 'parent_id') = 'string'
                                       and (w.data ->> 'parent_id') ~* '^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$')), false) as parent_ok,
                 count(*) filter (where w.data_class = 'record') as n_rec,
                 coalesce(bool_or(w.data_class = 'record' and (tk.data ->> 'level') = 'confidential'), false) as conf_tbl,
                 coalesce(bool_or(w.data_class = 'record' and jsonb_typeof(w.data -> 'parent_id') = 'string'), false) as has_parent
            -- HOT-DOORS-6 d: two arms, so the hinted one is pruned to the Table's own partition (an OR of the two
            -- conditions planned as a read by id in all sixteen)
            from (select w1.* from custom.record w1
                   where k.org is not null and w1.organization_id = k.org and w1.id = k.id
                  union all
                  select w2.* from custom.record w2
                   where k.org is null and w2.id = k.id) w
            left join custom.record tk
              on tk.organization_id = w.organization_id and tk.id = w.table_id and tk.table_id = custom.table_kernel_id()
        ) r
       where r.n = 1 and r.parent_ok
         and (r.n_rec = 0 or (r.n_rec = 1 and not r.conf_tbl and not r.has_parent))
         and r.org = any (p_organization_ids)
         and not exists (select 1 from iam.organizations o where o.id = r.org and o.archived_at is not null);
    exception when others then
      v_fast := '{}';  v_fast_org := '{}';  v_all := null;
      raise warning 'KERNEL-SET-FORM: iam.has_access_for_many failed in custom.tables_seen_among (% %); walking every Table',
        sqlstate, sqlerrm;
    end;
    -- the drift guard rides this call too (a slice: the guard compares one at a time)
    if v_all is not null and iam.kernel_shadow_on(p_user_id) then
      perform iam.has_access_for_shadow(p_user_id, v_all[1:300], 'viewer', 'record', 'custom.tables_seen_among');
    end if;
    if cardinality(v_fast) > 0 then
      v_among := array(select a.id from unnest(v_all) a(id) except select f.id from unnest(v_fast) f(id));
      if cardinality(v_among) = 0 then
        return query select u.org, u.id, true from unnest(v_fast_org, v_fast) as u(org, id);
        return;
      end if;
    end if;
  end if;

  with
  t as materialized (
    select x.id, x.organization_id as org, x.table_id,
           -- THE ROW'S OWN COLUMNS, every one but its id, its content and its clocks: a superset of
           -- the columns the ladder reads about a row, whatever they are called.
           (to_jsonb(x) - array['id','data','metadata','custom_fields','created_at','updated_at','updated_by','version','deleted_at']) as cols,
           -- custom.containment_parent raises on anything but one uuid; such a Table walks alone,
           -- so it raises exactly where it always did.
           (x.data -> 'parent_id' is null or jsonb_typeof(x.data -> 'parent_id') = 'null'
            or (jsonb_typeof(x.data -> 'parent_id') = 'string'
                and (x.data ->> 'parent_id') ~* '^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$')) as parent_ok
      from custom.record x
     where x.organization_id = any (p_organization_ids)
       and x.table_id = custom.table_kernel_id()
       and x.deleted_at is null
       and (v_among is null or x.id = any (v_among))
  ),
  tid as materialized (select array_agg(t.id) as v from t),
  te as materialized (
    select a.target_id as item, a.source_type as c_type, a.source_id as c_id, ty.conveys_max
      from platform.associations a
      join platform.association_types ty
        on ty.source_type = a.source_type and ty.target_type = a.target_type
       and (ty.label is null or ty.label = a.label)
     where a.deleted_at is null and ty.is_active and ty.container_side = 'source'
       and a.target_type = 'record' and a.target_id = any ((select tid.v from tid)::uuid[])
    union
    select a.source_id, a.target_type, a.target_id, ty.conveys_max
      from platform.associations a
      join platform.association_types ty
        on ty.source_type = a.source_type and ty.target_type = a.target_type
       and (ty.label is null or ty.label = a.label)
     where a.deleted_at is null and ty.is_active and ty.container_side = 'target'
       and a.source_type = 'record' and a.source_id = any ((select tid.v from tid)::uuid[])
    union
    select a.target_id, a.source_type, a.source_id, cr.conveys_max
      from platform.associations a
      join custom.carrying_rule cr on cr.role = a.role and cr.is_active
     where a.deleted_at is null and cr.container_side = 'source'
       and a.target_type = 'record' and a.target_id = any ((select tid.v from tid)::uuid[])
    union
    select a.source_id, a.target_type, a.target_id, cr.conveys_max
      from platform.associations a
      join custom.carrying_rule cr on cr.role = a.role and cr.is_active
     where a.deleted_at is null and cr.container_side = 'target'
       and a.source_type = 'record' and a.source_id = any ((select tid.v from tid)::uuid[])
    union
    select x.id, 'record'::text, x.table_id, 'admin'::public.permission_level
      from t x
      join custom.record tt on tt.id = x.table_id and tt.organization_id = x.org and tt.deleted_at is null
     -- (carrying_edges_of also asks the row's level here; leaving that out can only ADD an edge,
     -- and an edge to the row's own Table makes it walk alone below.)
     where x.table_id <> x.id
    union
    select a.source_id, 'record'::text, a.target_id, pt.conveys_max
      from platform.associations a
      join custom.portal_table pt on pt.names_via_field_id = a.relation_field_id
      join custom.portal p on p.id = pt.portal_id and p.is_active
     where a.deleted_at is null and a.source_type = 'record' and a.target_type = 'record'
       and a.source_id = any ((select tid.v from tid)::uuid[])
  ),
  cid as materialized (
    select array_agg(distinct te.c_id) as v from te where te.c_type = 'record'
  ),
  cx as materialized (
    select x.id, x.organization_id, x.table_id, x.deleted_at, (to_jsonb(x) - array['id','data','metadata','custom_fields','created_at','updated_at','updated_by','version','deleted_at']) as cols
      from custom.record x
     where x.id = any ((select cid.v from cid)::uuid[])
  ),
  ce as materialized (
    select a.target_id as item
      from platform.associations a
      join platform.association_types ty
        on ty.source_type = a.source_type and ty.target_type = a.target_type
       and (ty.label is null or ty.label = a.label)
     where a.deleted_at is null and ty.is_active and ty.container_side = 'source'
       and a.target_type = 'record' and a.target_id = any ((select cid.v from cid)::uuid[])
    union
    select a.source_id
      from platform.associations a
      join platform.association_types ty
        on ty.source_type = a.source_type and ty.target_type = a.target_type
       and (ty.label is null or ty.label = a.label)
     where a.deleted_at is null and ty.is_active and ty.container_side = 'target'
       and a.source_type = 'record' and a.source_id = any ((select cid.v from cid)::uuid[])
    union
    select a.target_id
      from platform.associations a
      join custom.carrying_rule cr on cr.role = a.role and cr.is_active
     where a.deleted_at is null and cr.container_side = 'source'
       and a.target_type = 'record' and a.target_id = any ((select cid.v from cid)::uuid[])
    union
    select a.source_id
      from platform.associations a
      join custom.carrying_rule cr on cr.role = a.role and cr.is_active
     where a.deleted_at is null and cr.container_side = 'target'
       and a.source_type = 'record' and a.source_id = any ((select cid.v from cid)::uuid[])
    union
    select x.id
      from cx x
      join custom.record tt on tt.id = x.table_id and tt.organization_id = x.organization_id and tt.deleted_at is null
     where x.table_id is not null and x.table_id <> x.id
       and x.deleted_at is null
    union
    select a.source_id
      from platform.associations a
      join custom.portal_table pt on pt.names_via_field_id = a.relation_field_id
      join custom.portal p on p.id = pt.portal_id and p.is_active
     where a.deleted_at is null and a.source_type = 'record' and a.target_type = 'record'
       and a.source_id = any ((select cid.v from cid)::uuid[])
  ),
  allid as materialized (
    select (select tid.v from tid) || coalesce((select cid.v from cid), '{}'::uuid[]) as v
  ),
  named as materialized (
    select p.resource_id as id from iam.permissions p
     where p.resource_type = 'record' and iam.grant_in_force(p.status, p.expires_at) and p.resource_id = any ((select allid.v from allid)::uuid[])
    union
    select m.container_id from iam.memberships m
     where m.container_type in ('record', 'scope') and m.container_id = any ((select allid.v from allid)::uuid[])
    union
    select g.entity_id from platform.entity_grants g
     where g.entity_type = 'record' and g.entity_id = any ((select allid.v from allid)::uuid[])
    union
    select rr.item_id from platform.reachability rr
     where rr.item_type = 'record' and rr.item_id = any ((select allid.v from allid)::uuid[])
    union
    select rr.container_id from platform.reachability rr
     where rr.container_type = 'record' and rr.container_id = any ((select allid.v from allid)::uuid[])
    union
    select a.source_id from platform.associations a
     where a.source_type = 'record' and a.source_id = any ((select allid.v from allid)::uuid[])
       and (a.target_type <> 'record' or a.relation_field_id is not null)
    union
    select a.target_id from platform.associations a
     where a.target_type = 'record' and a.target_id = any ((select allid.v from allid)::uuid[])
       and (a.source_type <> 'record' or a.relation_field_id is not null)
    union
    -- arm 3b's owned relation rows (custom.reaches_directly), found through the store's GIN index:
    -- every row that arm could match holds kind = owned.
    select nullif(rel.data ->> 'to', '')::uuid from custom.record rel
     where rel.organization_id = any (p_organization_ids)
       and rel.data @> '{"kind": "owned"}'::jsonb
       and rel.data ->> 'to' = any ((select tid.v from tid)::text[])
  ),
  cxa as materialized (
    select y.id, count(*) as n,
           (array_agg(jsonb_build_array(true, y.cols, y.deleted_at is null)))[1] as k
      from cx y
     group by y.id
  ),
  cattr as materialized (
    select c.c_id,
           coalesce(x.k, jsonb_build_array(false, null, null)) as k,
           coalesce(x.n, 0) as rows_with_id,
           (c.c_id in (select named.id from named) or c.c_id in (select ce.item from ce)) as unsimple
      from (select unnest((select cid.v from cid)::uuid[]) as c_id) c
      left join cxa x on x.id = c.c_id
  ),
  tdup as materialized (
    select d.id from custom.record d
     where d.id = any ((select tid.v from tid)::uuid[])
     group by d.id having count(*) > 1
  ),
  tagg as materialized (
    select te.item,
           -- more than one container: custom.addressed_cap_specific takes the FIRST container at the
           -- nearest depth, and two at one depth come out in an order their ids decide.
           (bool_or(te.c_type <> 'record' or ca.c_id is null or ca.unsimple or ca.rows_with_id <> 1
                    or te.c_id = te.item or te.c_id = t.table_id)
            or count(distinct (te.c_type, te.c_id)) > 1) as bad,
           jsonb_agg(jsonb_build_array(ca.k, te.conveys_max) order by jsonb_build_array(ca.k, te.conveys_max)::text) as sig
      from te
      join t on t.id = te.item
      left join cattr ca on ca.c_id = te.c_id and te.c_type = 'record'
     group by te.item
  ),
  keyed as materialized (
    select t.id, t.org,
           -- null: an id two rows carry (asked through custom.levels_of, which reads it the way the
           -- ladder does); ['alone', id]: walked on its own; otherwise the signature.
           case
             when t.id in (select tdup.id from tdup) then null
             when v_solo or t.id in (select named.id from named) or coalesce(g.bad, false) or not t.parent_ok
               then jsonb_build_array('alone', t.id)::text
             else jsonb_build_array(t.cols, coalesce(g.sig, '[]'::jsonb))::text
           end as key
      from t
      left join tagg g on g.item = t.id
  )
  select array_agg(k.id order by k.key nulls first, k.id), array_agg(k.org order by k.key nulls first, k.id),
         array_agg(k.key order by k.key nulls first, k.id)
    into v_ids, v_orgs, v_keys
    from keyed k;
  -- Sorted by signature: a signature's answer is the one just asked. A Table walked alone has a
  -- signature of its own. An id two rows carry is asked through custom.levels_of, all together.
  v_one := custom.levels_of(p_user_id,
             array(select v_ids[i] from generate_subscripts(v_ids, 1) i where v_keys[i] is null));
  -- PERF-FIX-2: each group's first Table (the one the loop below used to ask about on its own) is asked
  -- in one set call - the same custom.reaches_directly answer, through custom.reaches_directly_many.
  select coalesce(jsonb_object_agg(m.target::text, m.reaches), '{}'::jsonb) into v_reps
    from custom.reaches_directly_many(p_user_id,
           array(select v_ids[i] from generate_subscripts(v_ids, 1) i
                  where v_keys[i] is not null and (i = 1 or v_keys[i] is distinct from v_keys[i - 1])),
           'record', 'viewer'::public.permission_level) m;
  for v_i in 1 .. coalesce(cardinality(v_ids), 0) loop
    if v_keys[v_i] is null then
      v_r_org := v_r_org || v_orgs[v_i]; v_r_id := v_r_id || v_ids[v_i];
      v_r_seen := v_r_seen || coalesce((v_one -> v_ids[v_i]::text ->> 's')::boolean, false);
      continue;
    end if;
    if v_keys[v_i] is distinct from v_prev_k then
      v_prev_v := (v_reps ->> v_ids[v_i]::text)::boolean;
      v_prev_k := v_keys[v_i];
    end if;
    if v_prev_v then
      v_r_org := v_r_org || v_orgs[v_i]; v_r_id := v_r_id || v_ids[v_i]; v_r_seen := v_r_seen || true;
    else
      v_left_id := v_left_id || v_ids[v_i]; v_left_org := v_left_org || v_orgs[v_i];
    end if;
  end loop;

  if cardinality(v_left_id) > 0 then
    for v_arm in
      with l as materialized (select * from unnest(v_left_id, v_left_org) as l(id, org)),
      own as materialized (
        select distinct r.organization_id as org, r.table_id as id
          from custom.record r
         where (r.organization_id, r.table_id) in (select l.org, l.id from l)
           and r.deleted_at is null
           and r.created_by = p_user_id
      ),
      granted as materialized (
        select r.organization_id as org, r.table_id as tbl, array_agg(distinct r.id) as ids
          from (
            select p.resource_id as id from iam.permissions p where p.resource_type = 'record' and iam.grant_in_force(p.status, p.expires_at)
            union all select m.container_id from iam.memberships m where m.container_type = 'record' and m.deleted_at is null
            union all select g.entity_id from platform.entity_grants g where g.entity_type = 'record'
            union all select rr.item_id from platform.reachability rr where rr.item_type = 'record'
          ) h
          join custom.record r on r.id = h.id and r.deleted_at is null
           and (r.organization_id, r.table_id) in (select l.org, l.id from l)
         group by 1, 2
      ),
      ed as materialized (
        select o.org, e.container_type, e.container_id, e.item_id
          from (select distinct l.org from l) o
          cross join lateral custom.carrying_edges_in(o.org) e
         where e.item_type = 'record'
      ),
      edr as materialized (
        -- PERF-FIX-3: the carried rows are found by their own id FIRST (a few hundred edges, each one
        -- primary-key probe). Joined the other way round the planner drove from every Table of the
        -- organization and read every one of its rows for every edge (32,399 index scans of 26 rows
        -- for one organization of 179 Tables; 540 ms to find no row).
        select r.organization_id as org, r.table_id as tbl, ed.item_id, ed.container_type, ed.container_id
          from ed
          join custom.record r on r.organization_id = ed.org and r.id = ed.item_id and r.deleted_at is null
      ),
      carried as materialized (
        select e.org, e.tbl, array_agg(distinct e.item_id) as ids
          from edr e
         where (e.org, e.tbl) in (select l.org, l.id from l)
           and not (e.container_type = 'record' and e.container_id = e.tbl)
         group by 1, 2
      )
      select l.id, l.org,
             exists (select 1 from own where own.org = l.org and own.id = l.id) as own,
             g.ids as g_ids, c.ids as c_ids
        from l
        left join granted g on g.org = l.org and g.tbl = l.id
        left join carried c on c.org = l.org and c.tbl = l.id
    loop
      v_seen := v_arm.own;
      if not v_seen and coalesce(cardinality(v_arm.c_ids), 0) > v_ceiling then
        -- more candidates than the function's own LIMIT: it chooses which; let it.
        v_seen := custom.table_has_a_visible_record(p_user_id, v_arm.org, v_arm.id);
      elsif not v_seen then
        if coalesce(cardinality(v_arm.g_ids), 0) <= v_ceiling then
          foreach v_cand in array coalesce(v_arm.g_ids, '{}'::uuid[]) loop
            if custom._seen_one(p_user_id, v_cand) then
              v_seen := true; exit;
            end if;
          end loop;
        end if;
        if not v_seen then
          foreach v_cand in array coalesce(v_arm.c_ids, '{}'::uuid[]) loop
            if custom._seen_one(p_user_id, v_cand) then
              v_seen := true; exit;
            end if;
          end loop;
        end if;
      end if;
      v_r_org := v_r_org || v_arm.org; v_r_id := v_r_id || v_arm.id; v_r_seen := v_r_seen || v_seen;
    end loop;
  end if;

  return query select u.org, u.id, u.seen from unnest(v_r_org, v_r_id, v_r_seen) as u(org, id, seen)
               union all
               select u.org, u.id, true from unnest(v_fast_org, v_fast) as u(org, id);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.seen_among(p_user_id uuid, p_ids uuid[])
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- STORE-READ-PERF-5 (2026-09-30). WHICH OF THESE RECORDS THIS PERSON SEES — the "s" half of
-- custom.levels_of, without the rung.
--
-- public.get_scope_tree and public.get_user_full_context asked custom.levels_of about every scope of
-- an organization and read only its "s"; levels_of also works out "l" (custom.effective_level, ~11 ms
-- a class against ~6 ms for the viewer answer), so two thirds of the call answered a question
-- nobody read.
--
-- THE ANSWER, per id, is exactly levels_of's "s" (the one ladder's viewer answer, the read door's
-- own check), asked the way levels_of asks it:
--   * an ordinary record (one row with that id, not a row of the kernel Table) that no row names
--     is asked once per CLASS — its organization, its Table, whether it is live, whether this person
--     created it, and every other column of its row as a whole (to_jsonb of the row minus id, content
--     and clocks: a superset of the columns levels_of keys on, so a class here never spans two of
--     levels_of's) — through custom.reaches_directly, which is the ladder's whole viewer answer for a
--     record outside the kernel Table (the ladder's other arm reads only kernel rows);
--   * a NAMED record (the same naming rows levels_of lists: a grant, a membership on it, a library
--     grant, a closure row, a carrying association from either side), and every record while
--     `record` has a registered FK containment parent, walks alone on custom.reaches_directly;
--   * an id with no row, two rows, no Table, or a row of the kernel Table is answered by
--     custom.levels_of itself.
declare
  v_memo   jsonb := '{}'::jsonb;
  v_out    uuid[] := '{}'::uuid[];
  v_fk     boolean;
  v_kernel uuid := custom.table_kernel_id();
  v_key    text;
  v_s      boolean;
  r        record;
begin
  if p_user_id is null or p_ids is null or cardinality(p_ids) = 0 then
    return v_out;
  end if;

  v_fk := exists (select 1 from platform.entity_relationships er
                   where er.child_type = 'record' and er.kind in ('composition', 'containment'));

  for r in
    with
    u as materialized (select distinct x.id from unnest(p_ids) x(id) where x.id is not null),
    x as materialized (select z.* from custom.record z where z.id = any (p_ids)),
    xn as materialized (select x.id, count(*) as n from x group by x.id),
    x1 as materialized (select distinct on (x.id) x.* from x order by x.id),
    -- The rows that NAME a record, exactly the arms custom.levels_of tests per id, asked once for
    -- the whole set (the same predicates, as unions over "= any (p_ids)").
    named as materialized (
      select p.resource_id as id from iam.permissions p
       where p.resource_type = 'record' and iam.grant_in_force(p.status, p.expires_at) and p.resource_id = any (p_ids)
      union
      select m.container_id from iam.memberships m
       where m.container_type in ('record', 'scope') and m.container_id = any (p_ids)
      union
      select g.entity_id from platform.entity_grants g
       where g.entity_type = 'record' and g.entity_id = any (p_ids)
      union
      select rr.item_id from platform.reachability rr
       where rr.item_type = 'record' and rr.item_id = any (p_ids)
      union
      select a.target_id from platform.associations a
       where a.deleted_at is null and a.target_type = 'record' and a.target_id = any (p_ids)
         and ( exists (select 1 from platform.association_types t
                        where t.source_type = a.source_type and t.target_type = a.target_type
                          and (t.label is null or t.label = a.label)
                          and t.is_active and t.container_side = 'source')
            or exists (select 1 from custom.carrying_rule cr
                        where cr.role = a.role and cr.is_active and cr.container_side = 'source'))
      union
      select a.source_id from platform.associations a
       where a.deleted_at is null and a.source_type = 'record' and a.source_id = any (p_ids)
         and ( a.target_type = 'scope'
            or a.relation_field_id is not null and exists (
                 select 1 from custom.portal_table pt where pt.names_via_field_id = a.relation_field_id)
            or exists (select 1 from platform.association_types t
                        where t.source_type = a.source_type and t.target_type = a.target_type
                          and (t.label is null or t.label = a.label)
                          and t.is_active and t.container_side = 'target')
            or exists (select 1 from custom.carrying_rule cr
                        where cr.role = a.role and cr.is_active and cr.container_side = 'target'))
    )
    select u.id, x1.organization_id, x1.table_id, x1.deleted_at is null as live,
           x1.created_by is not distinct from p_user_id as own,
           (to_jsonb(x1) - array['id','data','metadata','custom_fields','created_at','updated_at',
                                 'updated_by','version','deleted_at','created_by']) as cols,
           coalesce(xn.n, 0) as n,
           u.id in (select named.id from named) as named
      from u
      left join xn on xn.id = u.id
      left join x1 on x1.id = u.id
  loop
    if r.n <> 1 or r.table_id is null or r.table_id = v_kernel then
      v_s := coalesce((custom.levels_of(p_user_id, array[r.id]) -> r.id::text ->> 's')::boolean, false);
    else
      v_key := case when v_fk or r.named then null
                    else r.organization_id::text || ':' || r.table_id::text || ':' || r.live::text || ':'
                      || r.own::text || ':' || r.cols::text end;
      if v_key is not null and v_memo ? v_key then
        v_s := (v_memo ->> v_key)::boolean;
      else
        v_s := custom.reaches_directly(p_user_id, 'record', r.id, 'viewer'::public.permission_level);
        if v_key is not null then
          v_memo := v_memo || jsonb_build_object(v_key, v_s);
        end if;
      end if;
    end if;
    if v_s then
      v_out := v_out || r.id;
    end if;
  end loop;
  return v_out;
end;
$function$;
