-- based-on: chat.conversation_lane(text, text, text, text) 7c5e536957f0f1ea7d69598f829c2d5652e3c18a5b69bbbac36ecde7710ee9ee
-- based-on: public.cvx_list_scoped(text, uuid, text, boolean, text, text, boolean, text, jsonb, integer, integer) f3019a1a57f2e6b11b26a68dfd5588787c1811512cb3b701f3720a4c870ff732
-- based-on: public.cvx_list_facets(text, uuid, text, boolean, text) f2350334a8d884fe96552fbf8c20ffe8489fc68c9ddedcf5e4fe70bb083de7ad
-- CVX LIST READS FIT THE STATEMENT CEILING (2026-10-16). /work's filter options failed with 57014
-- (statement timeout, 8s for `authenticated`) for the person with 34k conversations: cvx_list_facets
-- re-ran the whole page query over every row in scope. Measured on the nightly clone, same rows,
-- outputs byte-identical (3 people x 7 calls): facets 4.2s -> 1.9s, page 3.3s -> 2.0s, scope counts
-- 1.5s -> 0.7s, searched page 3.6s -> 2.3s. Four causes, four fixes:
--  1. chat.conversation_lane carried SET search_path, which stops a SQL function from inlining:
--     ~6 real calls per row through cvx_audience. It reads no table, so the setting protected nothing.
--     Same for cvx_provider_account_display.
--  2. coding_session.metadata (avg 6 KB, up to 1.2 MB) was decompressed once per ->> (eight per row);
--     the lateral now hands it over decompressed once.
--  3. Every conversation column (system_instruction, config, cache_state, custom_fields …) rode
--     through the lane window and the _lanes CTE; only the read columns are carried now.
--  4. Facet mode (p_sort = '__facets', used by cvx_list_facets): no last-message lookup, no search
--     score and no custom_fields read per row — the facets use none of them.

-- 1. Inlinable: no SET clause (it reads no table; search_path cannot change its answer).
CREATE OR REPLACE FUNCTION chat.conversation_lane(source_app text, source_feature text, origin_class text, conversation_type text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$
  select case
    -- A mandate candidate's shadow leg (Mandate Candidates PLAN §2.7): persisted so the pair can
    -- open both chats, never listed. FIRST, so no later arm can file it anywhere visible.
    when conversation_type = 'mandate_candidate'
      then 'hidden'
    when conversation_type = 'subagent' or origin_class = 'child_agent'
      then 'subagent'
    when source_app = 'code-plugin'
      then 'plugin'
    when origin_class in ('scheduled', 'workflow', 'system', 'client_auto')
      or conversation_type in ('scheduled', 'workflow', 'auto', 'system',
                               'research', 'podcast', 'hindsight_replay')
      or source_feature = 'system'
      or source_app = 'aidream'
      or source_app like 'aidream-%'
      or source_app in ('matrx-scheduler', 'mcp-agent-service')
      then 'auto'
    when source_feature in ('chat', 'agent-runner', 'agent-builder', 'agent-app',
                            'agent-comparison', 'agent-generator', 'agents-other',
                            'voice-agent')
      then 'chat'
    else 'matrx'
  end
$function$;
ALTER FUNCTION public.cvx_provider_account_display(jsonb) RESET search_path;


CREATE OR REPLACE FUNCTION public.cvx_list_scoped(p_scope text DEFAULT 'mine'::text, p_org_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_deep boolean DEFAULT false, p_sort text DEFAULT 'last_activity'::text, p_dir text DEFAULT 'desc'::text, p_favorites_first boolean DEFAULT true, p_archived text DEFAULT 'active'::text, p_filters jsonb DEFAULT '{}'::jsonb, p_limit integer DEFAULT 25, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, title text, conversation_type text, origin_class text, source_app text, source_feature text, status text, message_count integer, is_favorite boolean, is_archived boolean, visibility text, provider text, provider_session_id text, workspace_name text, provider_account text, title_source text, category text, fidelity text, binding_status text, binding_origin text, binding_last_seen_at timestamp with time zone, organization_id uuid, organization_name text, owner_email text, created_by uuid, initial_agent_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, last_activity_at timestamp with time zone, is_owner boolean, access_level text, total_count bigint, custom_fields jsonb)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_scope text := lower(coalesce(p_scope, platform.entity_default_list_scope('conversation')));
  v_dir text := CASE WHEN lower(coalesce(p_dir,'desc'))='asc' THEN 'asc' ELSE 'desc' END;
  v_sort text := lower(coalesce(p_sort, 'last_activity'));
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_f jsonb := coalesce(p_filters, '{}'::jsonb);
  -- ONE rule for "is this search deep" (public.cvx_search_is_deep), shared
  -- with cvx_list_scope_counts. A caller that already ran the probe hands the
  -- hit set in as p_filters->'__deep_hits' and is deep by definition. The
  -- pass itself is the definer probe public.cvx_deep_hits — under this
  -- function's invoker policy the trigram index cannot be used (ILIKE is not
  -- leakproof) and the page timed out.
  v_deep boolean := public.cvx_search_is_deep(v_search, p_deep)
    OR (coalesce(p_filters, '{}'::jsonb) ? '__deep_hits');
  -- FACET MODE (p_sort = '__facets'), used only by cvx_list_facets: the same rows under the
  -- same scope and filters, without the page-only work — no last-message lookup per row
  -- (unless a last_activity filter needs it), no search score, no custom_fields read. The
  -- facets read every row in scope (34k for one person), and paying the page's per-row
  -- costs for all of them ran past the 8s statement ceiling (57014, 2026-10-16).
  v_facets boolean := lower(coalesce(p_sort, '')) = '__facets';
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'cvx_list_scoped: not authenticated'; END IF;

  -- INTERNAL LANE MODE (p_scope = '_lanes'), used only by cvx_list_scope_counts: ONE statement that returns, for
  -- every lane (all, mine, team, orgs, shared), the ids this same list would show (access_level carries the lane
  -- name, 'all' deduped, strongest way in kept), so conversations are read under row security once instead of
  -- once per lane, and the bindings / favourites / last-message reads run only when a search or filter needs
  -- them. Same lane predicates and filters as below; nothing is sorted, scored or paged. Never a lane a page asks for.
  IF v_scope = '_lanes' THEN
    DECLARE
      v_need_names boolean := v_f ?| ARRAY['owner_email','organization_name'];
      v_need_cs boolean := v_search IS NOT NULL OR v_f ?| ARRAY['audience','provider_session_id','provider','workspace_name','provider_account','title_source','category','fidelity','binding_status','binding_last_seen_at','last_activity'];
      v_need_fav boolean := v_f ? 'favorite';
      v_need_last boolean := v_f ? 'last_activity';
    BEGIN
      RETURN QUERY
      WITH deep_hits AS (
    -- ONE indexed pass over message bodies, hashed once, probed per row.
    -- A caller that ran the probe already (cvx_list_scope_counts, fifteen
    -- calls per request) hands the set in as p_filters->'__deep_hits';
    -- otherwise the definer probe runs here. Never a correlated EXISTS: that
    -- is a scan per conversation, twice.
    SELECT (x)::uuid AS conversation_id
    FROM jsonb_array_elements_text(v_f->'__deep_hits') AS x
    WHERE v_f ? '__deep_hits'
    UNION ALL
    SELECT h AS conversation_id
    FROM public.cvx_deep_hits(v_search) AS h
    WHERE NOT (v_f ? '__deep_hits') AND v_deep AND v_search IS NOT NULL
  ),
      convs AS MATERIALIZED (SELECT c.id, c.title, c.description, c.status, c.message_count, c.created_at, c.updated_at, c.deleted_at,
      c.organization_id, c.source_app, c.source_feature, c.is_ephemeral, c.initial_agent_id, c.conversation_type,
      c.created_by, c.visibility, c.origin_class, c.metadata->'coding_session_bridge'->>'category' AS s_bridge_category FROM chat.conversation c),
      mine AS (SELECT c.id, c.organization_id, c.created_by, true AS s_is_owner, 'owner'::text AS s_access
               FROM convs c WHERE c.created_by = v_uid),
      orgs AS (
        SELECT c.id, c.organization_id, c.created_by, (c.created_by = v_uid) AS s_is_owner,
          CASE WHEN c.created_by = v_uid THEN 'owner' ELSE 'org' END::text AS s_access
        FROM convs c
        WHERE (p_org_id IS NULL OR c.organization_id = p_org_id) AND c.organization_id IN (SELECT iam.my_orgs())
      ),
      team AS (
        SELECT o.* FROM orgs o
        WHERE (o.organization_id, o.created_by) IN (SELECT r.organization_id, r.user_id FROM iam.my_team_reach(p_org_id) r)
      ),
      shared AS (
        SELECT c.id, c.organization_id, c.created_by, false AS s_is_owner, perm.permission_level::text AS s_access
        FROM convs c
        JOIN iam.permissions perm ON perm.resource_type='conversation' AND perm.resource_id=c.id
          AND perm.granted_to_user_id = v_uid
        WHERE c.created_by IS DISTINCT FROM v_uid
        UNION ALL
        SELECT os.id, os.organization_id, os.created_by, false, os.s_access FROM (
          SELECT DISTINCT ON (c.id) c.id, c.organization_id, c.created_by, perm.permission_level::text AS s_access
          FROM convs c
          JOIN iam.permissions perm ON perm.resource_type='conversation' AND perm.resource_id=c.id
            AND perm.granted_to_organization_id IN (
              SELECT om.organization_id FROM iam.organization_member om WHERE om.user_id=v_uid)
          WHERE c.created_by IS DISTINCT FROM v_uid
            AND NOT EXISTS (SELECT 1 FROM iam.permissions p2 WHERE p2.resource_type='conversation'
              AND p2.resource_id=c.id AND p2.granted_to_user_id=v_uid)
        ) os
      ),
      all_raw AS (
        SELECT m.id, m.organization_id, m.s_access FROM mine m
        UNION ALL SELECT o.id, o.organization_id, o.s_access FROM orgs o
        UNION ALL SELECT s.id, s.organization_id, s.s_access FROM shared s
      ),
      lane_rows AS (
        SELECT 'mine'::text AS lane, m.id, m.organization_id, m.s_access FROM mine m
        UNION ALL SELECT 'orgs', o.id, o.organization_id, o.s_access FROM orgs o
        UNION ALL SELECT 'team', t.id, t.organization_id, t.s_access FROM team t
        UNION ALL SELECT 'shared', s.id, s.organization_id, s.s_access FROM shared s
        UNION ALL SELECT 'all', r.id, r.organization_id, r.s_access FROM (
          SELECT sr.*, row_number() OVER (PARTITION BY sr.id ORDER BY CASE sr.s_access WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'edit' THEN 2 WHEN 'org' THEN 4 ELSE 3 END) AS s_rn
          FROM all_raw sr) r
        WHERE r.s_rn = 1
      ),
      joined AS (
        SELECT
          s.*,
          o.name AS s_org_name,
          u.email::text AS s_owner_email,
          cs.provider AS s_provider,
          cs.provider_session_id AS s_provider_session_id,
          cs.metadata->>'workspace_name' AS s_workspace_name,
          public.cvx_provider_account_display(cs.metadata) AS s_provider_account,
          cs.metadata->>'title_source' AS s_title_source,
          coalesce(
            s.s_bridge_category,
            cs.metadata->>'provider_category'
          ) AS s_category,
          cs.fidelity AS s_fidelity,
          cs.status AS s_binding_status,
          cs.origin AS s_binding_origin,
          cs.last_seen_at AS s_binding_last_seen_at,
          coalesce(ues.is_favorite, false) AS s_is_favorite,
          public.cvx_audience(cs.provider, s.source_app, s.source_feature, s.origin_class, s.conversation_type)
            AS s_audience
        FROM (SELECT c.* FROM convs c WHERE c.id IN (SELECT lr.id FROM lane_rows lr)) s
        LEFT JOIN iam.organizations o ON o.id = s.organization_id
        LEFT JOIN platform.visible_user_identity u ON u.id = s.created_by AND v_need_names
        LEFT JOIN platform.user_entity_state ues
          ON ues.user_id = v_uid
         AND ues.entity_type = 'conversation'
         AND ues.entity_id = s.id
         AND v_need_fav
        LEFT JOIN LATERAL (
          -- ONE DETOAST: metadata averages 6 KB (up to 1.2 MB) and is read eight ways per row
          -- below; '{}' || returns it decompressed once instead of once per ->> (2026-10-16).
          SELECT b.provider, b.provider_session_id, '{}'::jsonb || b.metadata AS metadata, b.fidelity,
                 b.status, b.origin, b.last_seen_at
          FROM chat.coding_session b
          WHERE v_need_cs AND b.conversation_id = s.id AND b.deleted_at IS NULL
          ORDER BY b.last_seen_at DESC NULLS LAST, b.created_at DESC, b.id
          LIMIT 1
        ) cs ON true
      ),
      filtered AS (
        SELECT j.* FROM joined j
    WHERE j.deleted_at IS NULL
      AND (p_org_id IS NULL OR j.organization_id = p_org_id)
      AND j.is_ephemeral IS NOT TRUE
      -- Mandate-candidate shadow conversations are persisted for the pair view, never listed.
      AND j.s_audience IS DISTINCT FROM 'hidden'
      AND (CASE lower(coalesce(p_archived,'active'))
             WHEN 'archived' THEN j.status = 'archived'
             WHEN 'all' THEN true
             ELSE j.status IS DISTINCT FROM 'archived' END)
      -- THE SEARCH FILTER ADMITS EVERY FIELD cvx_search_score RANKS. A field
      -- the scorer ranks but the filter drops scores 100000 and returns
      -- nothing — that is how a pasted conversation id found no row until
      -- 2026-09-18. Keep this list and the scorer's in lockstep.
      AND (v_search IS NULL
        OR coalesce(j.title,'') ILIKE '%'||v_search||'%'
        OR coalesce(j.description,'') ILIKE '%'||v_search||'%'
        OR coalesce(j.s_workspace_name,'') ILIKE '%'||v_search||'%'
        OR coalesce(j.source_feature,'') ILIKE '%'||v_search||'%'
        OR coalesce(j.source_app,'') ILIKE '%'||v_search||'%'
        OR coalesce(j.s_provider_account,'') ILIKE '%'||v_search||'%'
        OR j.id::text ILIKE '%'||v_search||'%'
        -- EVERY live binding, not only the newest: a resumed Claude Code
        -- session carries several provider ids and each is a name someone
        -- was handed.
        OR EXISTS (
              SELECT 1 FROM chat.coding_session b
              WHERE b.conversation_id = j.id AND b.deleted_at IS NULL
                AND coalesce(b.provider_session_id,'') ILIKE '%'||v_search||'%')
        OR j.id IN (SELECT dh.conversation_id FROM deep_hits dh))
      AND (NOT v_f ? 'audience'
           OR j.s_audience IN (SELECT jsonb_array_elements_text(v_f->'audience'->'values')))
      AND (NOT v_f ? 'title' OR coalesce(j.title,'') ILIKE '%'||(v_f->'title'->>'value')||'%')
      AND (NOT v_f ? 'provider_session_id'
           OR coalesce(j.s_provider_session_id,'') ILIKE '%'||(v_f->'provider_session_id'->>'value')||'%')
      AND (NOT v_f ? 'organization_name'
           OR coalesce(j.s_org_name,'') ILIKE '%'||(v_f->'organization_name'->>'value')||'%')
      AND (NOT v_f ? 'conversation_type'
           OR j.conversation_type IN (SELECT jsonb_array_elements_text(v_f->'conversation_type'->'values')))
      AND (NOT v_f ? 'origin_class'
           OR j.origin_class IN (SELECT jsonb_array_elements_text(v_f->'origin_class'->'values')))
      AND (NOT v_f ? 'source_app'
           OR coalesce(nullif(j.source_app,''),'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'source_app'->'values')))
      AND (NOT v_f ? 'source_feature'
           OR coalesce(nullif(j.source_feature,''),'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'source_feature'->'values')))
      AND (NOT v_f ? 'provider'
           OR coalesce(j.s_provider,'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'provider'->'values')))
      AND (NOT v_f ? 'workspace_name'
           OR coalesce(j.s_workspace_name,'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'workspace_name'->'values')))
      AND (NOT v_f ? 'provider_account'
           OR coalesce(j.s_provider_account,'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'provider_account'->'values')))
      AND (NOT v_f ? 'title_source'
           OR coalesce(j.s_title_source,'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'title_source'->'values')))
      AND (NOT v_f ? 'category'
           OR coalesce(j.s_category,'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'category'->'values')))
      AND (NOT v_f ? 'fidelity'
           OR coalesce(j.s_fidelity,'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'fidelity'->'values')))
      AND (NOT v_f ? 'binding_status'
           OR coalesce(j.s_binding_status,'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'binding_status'->'values')))
      AND (NOT v_f ? 'visibility'
           OR j.visibility::text IN (SELECT jsonb_array_elements_text(v_f->'visibility'->'values')))
      AND (NOT v_f ? 'owner_email'
           OR coalesce(nullif(j.s_owner_email,''),'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'owner_email'->'values')))
      AND (NOT v_f ? 'message_count'
           OR public.cvx_size_band(j.message_count)
              IN (SELECT jsonb_array_elements_text(v_f->'message_count'->'values')))
      AND (NOT v_f ? 'updated'
           OR j.updated_at >= public.agx_since_bucket(v_f->'updated'->'values'->>0))
      AND (NOT v_f ? 'created'
           OR j.created_at >= public.agx_since_bucket(v_f->'created'->'values'->>0))
      AND (NOT v_f ? 'binding_last_seen_at'
           OR j.s_binding_last_seen_at >= public.agx_since_bucket(v_f->'binding_last_seen_at'->'values'->>0))
      AND (NOT v_f ? 'favorite'
           OR coalesce(j.s_is_favorite,false) IS NOT DISTINCT FROM (v_f->'favorite'->>'value')::boolean)
      AND (NOT v_f ? '__dimension' OR j.id = ANY(coalesce((SELECT platform.list_dimension_ids(v_f, 'conversation')), '{}')))
      AND (NOT v_f ? 'archived'
           OR (j.status = 'archived') IS NOT DISTINCT FROM (v_f->'archived'->>'value')::boolean)
      ),
      activity AS (
        SELECT
          f.id,
          greatest(
            coalesce(lm.last_at, f.created_at),
            coalesce(f.s_binding_last_seen_at, f.created_at),
            f.created_at
          ) AS s_last_activity
        FROM filtered f
        LEFT JOIN LATERAL (
          SELECT m.created_at AS last_at
          FROM chat.message m
          WHERE v_need_last AND m.conversation_id = f.id
            AND m.deleted_at IS NULL
            AND m.is_visible_to_user = true
          ORDER BY m.created_at DESC
          LIMIT 1
        ) lm ON true
      ),
      ok AS (
        SELECT a.id FROM activity a
        WHERE (NOT v_f ? 'last_activity'
               OR a.s_last_activity >= public.agx_since_bucket(v_f->'last_activity'->'values'->>0))
      )
      SELECT lr.id, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::integer, NULL::boolean,
        NULL::boolean, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text,
        NULL::text, NULL::text, NULL::timestamptz, lr.organization_id, NULL::text, NULL::text, NULL::uuid, NULL::uuid,
        NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NULL::boolean, lr.lane, 0::bigint, NULL::jsonb
      FROM lane_rows lr JOIN ok ON ok.id = lr.id
      WHERE (NOT v_f ? 'access_level'
             OR lr.s_access IN (SELECT jsonb_array_elements_text(v_f->'access_level'->'values')));
      RETURN;
    END;
  END IF;
  IF v_scope NOT IN ('mine','team','orgs','shared','all') THEN
    RAISE EXCEPTION 'cvx_list_scoped: unknown scope %', v_scope; END IF;
  IF v_sort NOT IN ('last_activity','updated','created','title','conversation_type',
                    'origin_class','source_app','source_feature','message_count',
                    'provider','workspace_name','provider_account','title_source',
                    'category','fidelity','binding_status','binding_last_seen_at',
                    'organization_name','owner_email','visibility','favorite',
                    'archived') THEN
    v_sort := 'last_activity';
  END IF;

  RETURN QUERY
  WITH deep_hits AS (
    -- ONE indexed pass over message bodies, hashed once, probed per row.
    -- A caller that ran the probe already (cvx_list_scope_counts, fifteen
    -- calls per request) hands the set in as p_filters->'__deep_hits';
    -- otherwise the definer probe runs here. Never a correlated EXISTS: that
    -- is a scan per conversation, twice.
    SELECT (x)::uuid AS conversation_id
    FROM jsonb_array_elements_text(v_f->'__deep_hits') AS x
    WHERE v_f ? '__deep_hits'
    UNION ALL
    SELECT h AS conversation_id
    FROM public.cvx_deep_hits(v_search) AS h
    WHERE NOT (v_f ? '__deep_hits') AND v_deep AND v_search IS NOT NULL
  ),
  scoped_raw AS (
    -- NARROW ROWS: only the columns this list reads. c.* carried system_instruction, config,
    -- metadata, cache_state, custom_fields … through the window/sort, which detoasted and spilled
    -- every one of them (1.2s of a 2.1s read for 38k rows, 2026-10-16).
    SELECT c.id, c.title, c.description, c.status, c.message_count, c.created_at, c.updated_at, c.deleted_at,
      c.organization_id, c.source_app, c.source_feature, c.is_ephemeral, c.initial_agent_id, c.conversation_type,
      c.created_by, c.visibility, c.origin_class, c.metadata->'coding_session_bridge'->>'category' AS s_bridge_category, true AS s_is_owner, 'owner'::text AS s_access
    FROM chat.conversation c
    WHERE v_scope IN ('mine','all') AND c.created_by = v_uid
    UNION ALL
    SELECT c.id, c.title, c.description, c.status, c.message_count, c.created_at, c.updated_at, c.deleted_at,
      c.organization_id, c.source_app, c.source_feature, c.is_ephemeral, c.initial_agent_id, c.conversation_type,
      c.created_by, c.visibility, c.origin_class, c.metadata->'coding_session_bridge'->>'category' AS s_bridge_category, (c.created_by = v_uid), CASE WHEN c.created_by = v_uid THEN 'owner' ELSE 'org' END::text FROM chat.conversation c
    WHERE v_scope IN ('orgs','team','all') AND (p_org_id IS NULL OR c.organization_id = p_org_id) AND c.organization_id IN (SELECT iam.my_orgs())
      -- MY TEAM (T-29): the same rows, narrowed to people who share a team with me there.
      AND (v_scope <> 'team' OR (c.organization_id, c.created_by) IN (SELECT r.organization_id, r.user_id FROM iam.my_team_reach(p_org_id) r))
    UNION ALL
    SELECT c.id, c.title, c.description, c.status, c.message_count, c.created_at, c.updated_at, c.deleted_at,
      c.organization_id, c.source_app, c.source_feature, c.is_ephemeral, c.initial_agent_id, c.conversation_type,
      c.created_by, c.visibility, c.origin_class, c.metadata->'coding_session_bridge'->>'category' AS s_bridge_category, false, perm.permission_level::text FROM chat.conversation c
    JOIN iam.permissions perm ON perm.resource_type='conversation' AND perm.resource_id=c.id
      AND perm.granted_to_user_id = v_uid
    WHERE v_scope IN ('shared','all') AND c.created_by IS DISTINCT FROM v_uid
    UNION ALL
    SELECT DISTINCT ON (c.id) c.id, c.title, c.description, c.status, c.message_count, c.created_at, c.updated_at, c.deleted_at,
      c.organization_id, c.source_app, c.source_feature, c.is_ephemeral, c.initial_agent_id, c.conversation_type,
      c.created_by, c.visibility, c.origin_class, c.metadata->'coding_session_bridge'->>'category' AS s_bridge_category, false, perm.permission_level::text FROM chat.conversation c
    JOIN iam.permissions perm ON perm.resource_type='conversation' AND perm.resource_id=c.id
      AND perm.granted_to_organization_id IN (
        SELECT om.organization_id FROM iam.organization_member om WHERE om.user_id=v_uid)
    WHERE v_scope IN ('shared','all') AND c.created_by IS DISTINCT FROM v_uid
      AND NOT EXISTS (SELECT 1 FROM iam.permissions p2 WHERE p2.resource_type='conversation'
        AND p2.resource_id=c.id AND p2.granted_to_user_id=v_uid)
  ),
  scoped AS (
    -- ALL = Mine + My team + My Orgs + Shared, one row per id, most privileged access label kept
    SELECT r.* FROM (
      SELECT sr.*, row_number() OVER (PARTITION BY sr.id ORDER BY CASE sr.s_access WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'edit' THEN 2 WHEN 'org' THEN 4 ELSE 3 END) AS s_rn
      FROM scoped_raw sr) r
    WHERE r.s_rn = 1 OR v_scope <> 'all'
  ),
  joined AS (
    SELECT
      s.*,
      o.name AS s_org_name,
      u.email::text AS s_owner_email,
      cs.provider AS s_provider,
      cs.provider_session_id AS s_provider_session_id,
      cs.metadata->>'workspace_name' AS s_workspace_name,
      public.cvx_provider_account_display(cs.metadata) AS s_provider_account,
      cs.metadata->>'title_source' AS s_title_source,
      coalesce(
        s.s_bridge_category,
        cs.metadata->>'provider_category'
      ) AS s_category,
      cs.fidelity AS s_fidelity,
      cs.status AS s_binding_status,
      cs.origin AS s_binding_origin,
      cs.last_seen_at AS s_binding_last_seen_at,
      coalesce(ues.is_favorite, false) AS s_is_favorite,
      public.cvx_audience(cs.provider, s.source_app, s.source_feature, s.origin_class, s.conversation_type)
        AS s_audience
    FROM scoped s
    LEFT JOIN iam.organizations o ON o.id = s.organization_id
    LEFT JOIN platform.visible_user_identity u ON u.id = s.created_by
    LEFT JOIN platform.user_entity_state ues
      ON ues.user_id = v_uid
     AND ues.entity_type = 'conversation'
     AND ues.entity_id = s.id
    LEFT JOIN LATERAL (
      -- ONE DETOAST: metadata averages 6 KB (up to 1.2 MB) and is read eight ways per row
      -- below; '{}' || returns it decompressed once instead of once per ->> (2026-10-16).
      SELECT b.provider, b.provider_session_id, '{}'::jsonb || b.metadata AS metadata, b.fidelity,
             b.status, b.origin, b.last_seen_at
      FROM chat.coding_session b
      WHERE b.conversation_id = s.id AND b.deleted_at IS NULL
      ORDER BY b.last_seen_at DESC NULLS LAST, b.created_at DESC, b.id
      LIMIT 1
    ) cs ON true
  ),
  filtered AS (
    SELECT j.* FROM joined j
    WHERE j.deleted_at IS NULL
      AND (p_org_id IS NULL OR j.organization_id = p_org_id)
      AND j.is_ephemeral IS NOT TRUE
      -- Mandate-candidate shadow conversations are persisted for the pair view, never listed.
      AND j.s_audience IS DISTINCT FROM 'hidden'
      AND (CASE lower(coalesce(p_archived,'active'))
             WHEN 'archived' THEN j.status = 'archived'
             WHEN 'all' THEN true
             ELSE j.status IS DISTINCT FROM 'archived' END)
      -- THE SEARCH FILTER ADMITS EVERY FIELD cvx_search_score RANKS. A field
      -- the scorer ranks but the filter drops scores 100000 and returns
      -- nothing — that is how a pasted conversation id found no row until
      -- 2026-09-18. Keep this list and the scorer's in lockstep.
      AND (v_search IS NULL
        OR coalesce(j.title,'') ILIKE '%'||v_search||'%'
        OR coalesce(j.description,'') ILIKE '%'||v_search||'%'
        OR coalesce(j.s_workspace_name,'') ILIKE '%'||v_search||'%'
        OR coalesce(j.source_feature,'') ILIKE '%'||v_search||'%'
        OR coalesce(j.source_app,'') ILIKE '%'||v_search||'%'
        OR coalesce(j.s_provider_account,'') ILIKE '%'||v_search||'%'
        OR j.id::text ILIKE '%'||v_search||'%'
        -- EVERY live binding, not only the newest: a resumed Claude Code
        -- session carries several provider ids and each is a name someone
        -- was handed.
        OR EXISTS (
              SELECT 1 FROM chat.coding_session b
              WHERE b.conversation_id = j.id AND b.deleted_at IS NULL
                AND coalesce(b.provider_session_id,'') ILIKE '%'||v_search||'%')
        OR j.id IN (SELECT dh.conversation_id FROM deep_hits dh))
      AND (NOT v_f ? 'audience'
           OR j.s_audience IN (SELECT jsonb_array_elements_text(v_f->'audience'->'values')))
      AND (NOT v_f ? 'title' OR coalesce(j.title,'') ILIKE '%'||(v_f->'title'->>'value')||'%')
      AND (NOT v_f ? 'provider_session_id'
           OR coalesce(j.s_provider_session_id,'') ILIKE '%'||(v_f->'provider_session_id'->>'value')||'%')
      AND (NOT v_f ? 'organization_name'
           OR coalesce(j.s_org_name,'') ILIKE '%'||(v_f->'organization_name'->>'value')||'%')
      AND (NOT v_f ? 'conversation_type'
           OR j.conversation_type IN (SELECT jsonb_array_elements_text(v_f->'conversation_type'->'values')))
      AND (NOT v_f ? 'origin_class'
           OR j.origin_class IN (SELECT jsonb_array_elements_text(v_f->'origin_class'->'values')))
      AND (NOT v_f ? 'source_app'
           OR coalesce(nullif(j.source_app,''),'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'source_app'->'values')))
      AND (NOT v_f ? 'source_feature'
           OR coalesce(nullif(j.source_feature,''),'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'source_feature'->'values')))
      AND (NOT v_f ? 'provider'
           OR coalesce(j.s_provider,'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'provider'->'values')))
      AND (NOT v_f ? 'workspace_name'
           OR coalesce(j.s_workspace_name,'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'workspace_name'->'values')))
      AND (NOT v_f ? 'provider_account'
           OR coalesce(j.s_provider_account,'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'provider_account'->'values')))
      AND (NOT v_f ? 'title_source'
           OR coalesce(j.s_title_source,'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'title_source'->'values')))
      AND (NOT v_f ? 'category'
           OR coalesce(j.s_category,'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'category'->'values')))
      AND (NOT v_f ? 'fidelity'
           OR coalesce(j.s_fidelity,'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'fidelity'->'values')))
      AND (NOT v_f ? 'binding_status'
           OR coalesce(j.s_binding_status,'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'binding_status'->'values')))
      AND (NOT v_f ? 'visibility'
           OR j.visibility::text IN (SELECT jsonb_array_elements_text(v_f->'visibility'->'values')))
      AND (NOT v_f ? 'owner_email'
           OR coalesce(nullif(j.s_owner_email,''),'__none__')
              IN (SELECT jsonb_array_elements_text(v_f->'owner_email'->'values')))
      AND (NOT v_f ? 'access_level'
           OR j.s_access IN (SELECT jsonb_array_elements_text(v_f->'access_level'->'values')))
      AND (NOT v_f ? 'message_count'
           OR public.cvx_size_band(j.message_count)
              IN (SELECT jsonb_array_elements_text(v_f->'message_count'->'values')))
      AND (NOT v_f ? 'updated'
           OR j.updated_at >= public.agx_since_bucket(v_f->'updated'->'values'->>0))
      AND (NOT v_f ? 'created'
           OR j.created_at >= public.agx_since_bucket(v_f->'created'->'values'->>0))
      AND (NOT v_f ? 'binding_last_seen_at'
           OR j.s_binding_last_seen_at >= public.agx_since_bucket(v_f->'binding_last_seen_at'->'values'->>0))
      AND (NOT v_f ? 'favorite'
           OR coalesce(j.s_is_favorite,false) IS NOT DISTINCT FROM (v_f->'favorite'->>'value')::boolean)
      AND (NOT v_f ? '__dimension' OR j.id = ANY(coalesce((SELECT platform.list_dimension_ids(v_f, 'conversation')), '{}')))
      AND (NOT v_f ? 'archived'
           OR (j.status = 'archived') IS NOT DISTINCT FROM (v_f->'archived'->>'value')::boolean)
  ),
  activity AS (
    SELECT
      f.*,
      greatest(
        coalesce(lm.last_at, f.created_at),
        coalesce(f.s_binding_last_seen_at, f.created_at),
        f.created_at
      ) AS s_last_activity
    FROM filtered f
    LEFT JOIN LATERAL (
      SELECT m.created_at AS last_at
      FROM chat.message m
      WHERE (NOT v_facets OR v_f ? 'last_activity')
        AND m.conversation_id = f.id
        AND m.deleted_at IS NULL
        AND m.is_visible_to_user = true
      ORDER BY m.created_at DESC
      LIMIT 1
    ) lm ON true
  ),
  activity_filtered AS (
    SELECT a.* FROM activity a
    WHERE (NOT v_f ? 'last_activity'
           OR a.s_last_activity >= public.agx_since_bucket(v_f->'last_activity'->'values'->>0))
  ),
  scored AS (
    SELECT f.*, CASE WHEN NOT v_facets THEN public.cvx_search_score(
      v_search, f.id, f.title, f.description, f.s_workspace_name,
      f.source_feature, f.source_app, f.s_provider_account,
      f.s_provider_session_id,
      (f.id IN (SELECT dh.conversation_id FROM deep_hits dh))
    ) END AS s_score
    FROM activity_filtered f
  ),
  counted AS (SELECT s.*, count(*) OVER () AS s_total FROM scored s)
  SELECT
    c.id, c.title, c.conversation_type, c.origin_class, c.source_app,
    c.source_feature, c.status, c.message_count, c.s_is_favorite,
    (c.status = 'archived'), c.visibility::text,
    c.s_provider, c.s_provider_session_id, c.s_workspace_name,
    c.s_provider_account, c.s_title_source, c.s_category, c.s_fidelity,
    c.s_binding_status, c.s_binding_origin, c.s_binding_last_seen_at,
    c.organization_id, c.s_org_name, c.s_owner_email, c.created_by,
    c.initial_agent_id, c.created_at, c.updated_at, c.s_last_activity,
    c.s_is_owner, c.s_access, c.s_total,
    CASE WHEN NOT v_facets AND (c.created_by = v_uid OR c.organization_id IN (SELECT iam.my_orgs())) THEN (SELECT x.custom_fields FROM chat.conversation x WHERE x.id = c.id) END
  FROM counted c
  ORDER BY
    CASE WHEN v_search IS NOT NULL THEN c.s_score END DESC NULLS LAST,
    CASE WHEN p_favorites_first THEN c.s_is_favorite END DESC NULLS LAST,
    CASE WHEN v_sort='last_activity' AND v_dir='desc' THEN c.s_last_activity END DESC,
    CASE WHEN v_sort='last_activity' AND v_dir='asc' THEN c.s_last_activity END ASC,
    CASE WHEN v_sort='updated' AND v_dir='desc' THEN c.updated_at END DESC,
    CASE WHEN v_sort='updated' AND v_dir='asc' THEN c.updated_at END ASC,
    CASE WHEN v_sort='created' AND v_dir='desc' THEN c.created_at END DESC,
    CASE WHEN v_sort='created' AND v_dir='asc' THEN c.created_at END ASC,
    CASE WHEN v_sort='title' AND v_dir='desc' THEN lower(coalesce(c.title,'')) END DESC,
    CASE WHEN v_sort='title' AND v_dir='asc' THEN lower(coalesce(c.title,'')) END ASC,
    CASE WHEN v_sort='conversation_type' AND v_dir='desc' THEN c.conversation_type END DESC,
    CASE WHEN v_sort='conversation_type' AND v_dir='asc' THEN c.conversation_type END ASC,
    CASE WHEN v_sort='origin_class' AND v_dir='desc' THEN c.origin_class END DESC,
    CASE WHEN v_sort='origin_class' AND v_dir='asc' THEN c.origin_class END ASC,
    CASE WHEN v_sort='source_app' AND v_dir='desc' THEN lower(coalesce(c.source_app,'')) END DESC,
    CASE WHEN v_sort='source_app' AND v_dir='asc' THEN lower(coalesce(c.source_app,'')) END ASC,
    CASE WHEN v_sort='source_feature' AND v_dir='desc' THEN lower(coalesce(c.source_feature,'')) END DESC,
    CASE WHEN v_sort='source_feature' AND v_dir='asc' THEN lower(coalesce(c.source_feature,'')) END ASC,
    CASE WHEN v_sort='message_count' AND v_dir='desc' THEN c.message_count END DESC,
    CASE WHEN v_sort='message_count' AND v_dir='asc' THEN c.message_count END ASC,
    CASE WHEN v_sort='provider' AND v_dir='desc' THEN lower(coalesce(c.s_provider,'')) END DESC,
    CASE WHEN v_sort='provider' AND v_dir='asc' THEN lower(coalesce(c.s_provider,'')) END ASC,
    CASE WHEN v_sort='workspace_name' AND v_dir='desc' THEN lower(coalesce(c.s_workspace_name,'')) END DESC,
    CASE WHEN v_sort='workspace_name' AND v_dir='asc' THEN lower(coalesce(c.s_workspace_name,'')) END ASC,
    CASE WHEN v_sort='provider_account' AND v_dir='desc' THEN lower(coalesce(c.s_provider_account,'')) END DESC,
    CASE WHEN v_sort='provider_account' AND v_dir='asc' THEN lower(coalesce(c.s_provider_account,'')) END ASC,
    CASE WHEN v_sort='title_source' AND v_dir='desc' THEN lower(coalesce(c.s_title_source,'')) END DESC,
    CASE WHEN v_sort='title_source' AND v_dir='asc' THEN lower(coalesce(c.s_title_source,'')) END ASC,
    CASE WHEN v_sort='category' AND v_dir='desc' THEN lower(coalesce(c.s_category,'')) END DESC,
    CASE WHEN v_sort='category' AND v_dir='asc' THEN lower(coalesce(c.s_category,'')) END ASC,
    CASE WHEN v_sort='fidelity' AND v_dir='desc' THEN lower(coalesce(c.s_fidelity,'')) END DESC,
    CASE WHEN v_sort='fidelity' AND v_dir='asc' THEN lower(coalesce(c.s_fidelity,'')) END ASC,
    CASE WHEN v_sort='binding_status' AND v_dir='desc' THEN lower(coalesce(c.s_binding_status,'')) END DESC,
    CASE WHEN v_sort='binding_status' AND v_dir='asc' THEN lower(coalesce(c.s_binding_status,'')) END ASC,
    CASE WHEN v_sort='binding_last_seen_at' AND v_dir='desc' THEN c.s_binding_last_seen_at END DESC NULLS LAST,
    CASE WHEN v_sort='binding_last_seen_at' AND v_dir='asc' THEN c.s_binding_last_seen_at END ASC NULLS LAST,
    CASE WHEN v_sort='organization_name' AND v_dir='desc' THEN lower(coalesce(c.s_org_name,'')) END DESC,
    CASE WHEN v_sort='organization_name' AND v_dir='asc' THEN lower(coalesce(c.s_org_name,'')) END ASC,
    CASE WHEN v_sort='owner_email' AND v_dir='desc' THEN lower(coalesce(c.s_owner_email,'')) END DESC,
    CASE WHEN v_sort='owner_email' AND v_dir='asc' THEN lower(coalesce(c.s_owner_email,'')) END ASC,
    CASE WHEN v_sort='visibility' AND v_dir='desc' THEN lower(c.visibility::text) END DESC,
    CASE WHEN v_sort='visibility' AND v_dir='asc' THEN lower(c.visibility::text) END ASC,
    CASE WHEN v_sort='favorite' AND v_dir='desc' THEN c.s_is_favorite END DESC,
    CASE WHEN v_sort='favorite' AND v_dir='asc' THEN c.s_is_favorite END ASC,
    CASE WHEN v_sort='archived' AND v_dir='desc' THEN (c.status='archived') END DESC,
    CASE WHEN v_sort='archived' AND v_dir='asc' THEN (c.status='archived') END ASC,
    c.id
  LIMIT greatest(coalesce(p_limit,25),1) OFFSET greatest(coalesce(p_offset,0),0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.cvx_list_facets(p_scope text DEFAULT 'mine'::text, p_org_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_deep boolean DEFAULT false, p_archived text DEFAULT 'active'::text)
 RETURNS TABLE(kind text, value text, total bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT r.conversation_type, r.origin_class, r.source_app, r.source_feature,
           r.provider, r.workspace_name, r.provider_account, r.title_source,
           r.category, r.fidelity, r.binding_status, r.visibility, r.owner_email,
           r.organization_name, r.access_level, r.message_count,
           r.is_favorite, r.is_archived,
           public.cvx_audience(r.provider, r.source_app, r.source_feature, r.origin_class, r.conversation_type)
             AS audience
    FROM public.cvx_list_scoped(p_scope, p_org_id, p_search, p_deep, '__facets','desc',
      false, p_archived, '{}'::jsonb, 1000000, 0) r
  )
  SELECT 'audience'::text, b.audience, count(*) FROM base b GROUP BY 2
  UNION ALL
  -- Second cut inside each bucket: app for chat + external, run type for internal.
  -- The app, for chat and for any external row that is NOT the code plugin
  -- (a coding-session binding on a row some other app stamped).
  SELECT 'audience_source_app'::text, b.audience||':'||coalesce(nullif(b.source_app,''),'__none__'), count(*)
    FROM base b
   WHERE b.audience = 'chat'
      OR (b.audience = 'external' AND coalesce(b.source_app,'') <> 'code-plugin')
   GROUP BY 2
  UNION ALL
  -- The TOOL, for code-plugin rows: source_app is the family ('code-plugin'),
  -- source_feature is the tool (claude-code | codex | cursor | vscode) or
  -- 'coding_session_reply'. The chip writes the `source_feature` filter.
  SELECT 'audience_source_feature'::text, b.audience||':'||coalesce(nullif(b.source_feature,''),'__none__'), count(*)
    FROM base b WHERE b.audience = 'external' AND b.source_app = 'code-plugin' GROUP BY 2
  UNION ALL
  SELECT 'audience_conversation_type'::text, b.audience||':'||b.conversation_type, count(*)
    FROM base b WHERE b.audience = 'internal' GROUP BY 2
  UNION ALL
  SELECT 'conversation_type'::text, b.conversation_type, count(*) FROM base b GROUP BY 2
  UNION ALL
  SELECT 'origin_class'::text, b.origin_class, count(*) FROM base b GROUP BY 2
  UNION ALL
  SELECT 'source_app'::text, coalesce(nullif(b.source_app,''),'__none__'), count(*) FROM base b GROUP BY 2
  UNION ALL
  SELECT 'source_feature'::text, coalesce(nullif(b.source_feature,''),'__none__'), count(*) FROM base b GROUP BY 2
  UNION ALL
  SELECT 'provider'::text, coalesce(b.provider,'__none__'), count(*) FROM base b GROUP BY 2
  UNION ALL
  SELECT 'workspace_name'::text, coalesce(b.workspace_name,'__none__'), count(*) FROM base b GROUP BY 2
  UNION ALL
  SELECT 'provider_account'::text, coalesce(b.provider_account,'__none__'), count(*) FROM base b GROUP BY 2
  UNION ALL
  SELECT 'title_source'::text, coalesce(b.title_source,'__none__'), count(*) FROM base b GROUP BY 2
  UNION ALL
  SELECT 'category'::text, coalesce(b.category,'__none__'), count(*) FROM base b GROUP BY 2
  UNION ALL
  SELECT 'fidelity'::text, coalesce(b.fidelity,'__none__'), count(*) FROM base b GROUP BY 2
  UNION ALL
  SELECT 'binding_status'::text, coalesce(b.binding_status,'__none__'), count(*) FROM base b GROUP BY 2
  UNION ALL
  SELECT 'visibility'::text, b.visibility, count(*) FROM base b GROUP BY 2
  UNION ALL
  SELECT 'owner_email'::text, coalesce(nullif(b.owner_email,''),'__none__'), count(*) FROM base b GROUP BY 2
  UNION ALL
  SELECT 'organization_name'::text, coalesce(nullif(b.organization_name,''),'__none__'), count(*) FROM base b GROUP BY 2
  UNION ALL
  SELECT 'access_level'::text, b.access_level, count(*) FROM base b GROUP BY 2
  UNION ALL
  SELECT 'message_count'::text, public.cvx_size_band(b.message_count), count(*) FROM base b GROUP BY 2
  UNION ALL
  SELECT 'favorite'::text, 'only', count(*) FILTER (WHERE b.is_favorite) FROM base b
  UNION ALL
  SELECT 'archived'::text, 'archived', count(*) FILTER (WHERE b.is_archived) FROM base b;
END;
$function$;
