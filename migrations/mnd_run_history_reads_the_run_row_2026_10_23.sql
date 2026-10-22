-- based-on: mandate.run_history(text, uuid, text, uuid, uuid, text, text, boolean, integer, integer) 5df2c8b151325530f38cfe531b2405f9c4fb335422c85bf5fd5d760a1e5b59a1
-- THE RUNS TAB READS THE RUN ROW (runner plan 25 step 4, 2026-10-23).
--
-- chat.user_request is now the run row of every mandate run (aidream migration
-- 20261023100000_mandate_run_row_and_request_values_rekey.sql): mandate_key, door, holder_type, rung,
-- watching, refusal, placement — names and sizes only. mandate.run_history finds a mandate's runs by
-- that column first (indexed: user_request_run_row_mandate_key_idx) and falls back to the old
-- metadata key / source_feature for runs recorded before; each row now carries the run row's door,
-- watching flag, refusal and names-only placement, and its rung and holder type from the run row.
-- A request that fanned out into several runs lists each run (each is a run row of its own).
-- Nothing else changes: same arguments, same seats, same shape plus four keys.

CREATE OR REPLACE FUNCTION mandate.run_history(p_mandate_key text DEFAULT NULL::text, p_agent_id uuid DEFAULT NULL::uuid, p_view text DEFAULT 'mine'::text, p_org_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL::text, p_sort text DEFAULT 'started_at'::text, p_desc boolean DEFAULT true, p_limit integer DEFAULT 25, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid    uuid := (SELECT auth.uid());
  v_view   text := lower(coalesce(p_view, 'mine'));
  v_key    text := NULLIF(btrim(coalesce(p_mandate_key, '')), '');
  v_status text := NULLIF(lower(btrim(coalesce(p_status, ''))), '');
  v_sort   text := lower(coalesce(NULLIF(btrim(p_sort), ''), 'started_at'));
  v_desc   boolean := coalesce(p_desc, true);
  v_limit  integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_out    jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION USING errcode = '42501', message = 'Sign in to see runs.';
  END IF;
  IF (v_key IS NULL) = (p_agent_id IS NULL) THEN
    RAISE EXCEPTION USING errcode = '22023', message = 'Name one mandate (p_mandate_key) or one agent (p_agent_id).';
  END IF;
  IF v_view NOT IN ('mine', 'org', 'platform') THEN
    RAISE EXCEPTION USING errcode = '22023',
      message = format('%L is not a run-history view.', p_view), hint = 'Use mine, org or platform.';
  END IF;
  IF v_status IS NOT NULL AND v_status NOT IN ('succeeded', 'warned', 'failed', 'stopped', 'waiting', 'running') THEN
    RAISE EXCEPTION USING errcode = '22023',
      message = format('%L is not a run status.', p_status),
      hint = 'Use succeeded, warned, failed, stopped, waiting or running.';
  END IF;
  IF v_sort NOT IN ('started_at', 'duration', 'cost', 'status', 'level') THEN
    RAISE EXCEPTION USING errcode = '22023',
      message = format('%L is not a run sort.', p_sort), hint = 'Use started_at, duration, cost, status or level.';
  END IF;
  IF v_view = 'org' THEN
    IF p_org_id IS NULL THEN
      RAISE EXCEPTION USING errcode = '22023', message = 'Name the organization whose runs to list (p_org_id).';
    END IF;
    IF NOT (public.is_org_admin(p_org_id) OR public.is_platform_admin()) THEN
      RAISE EXCEPTION USING errcode = '42501',
        message = 'Only an owner or admin of this organization can see everyone''s runs.',
        hint = 'Members see their own runs (view mine).';
    END IF;
  ELSIF v_view = 'platform' THEN
    IF NOT public.is_platform_admin() THEN
      RAISE EXCEPTION USING errcode = '42501',
        message = 'Only a platform administrator can see every run on the platform.',
        hint = 'Use view mine, or org for an organization you manage.';
    END IF;
  END IF;

  WITH raw AS (
    SELECT
      'conversation'::text AS run_kind, u.id AS run_id, u.created_at, u.completed_at,
      u.status AS raw_status, u.created_by, u.organization_id, u.origin_class,
      u.metadata -> 'mandate_resolution' AS res, u.metadata -> 'mandate_holder' AS hold,
      u.agent_id, NULL::uuid AS workflow_definition_id,
      u.total_cost AS cost, u.total_duration_ms::bigint AS duration_ms,
      u.total_tokens::bigint AS tokens,
      NULLIF(left(coalesce(u.error, ''), 300), '') AS error_text,
      v_key AS mandate_key, u.conversation_id AS direct_conversation_id, 'mandate'::text AS found_by,
      u.door AS row_door, u.rung AS row_rung, u.holder_type AS row_holder_type,
      u.watching AS row_watching, u.refusal AS row_refusal, u.placement AS row_placement
    FROM chat.user_request u
    WHERE v_key IS NOT NULL
      AND (u.mandate_key = v_key
           OR (u.mandate_key IS NULL
               AND (u.source_feature LIKE 'mandate:%' OR u.metadata ? 'mandate_key')
               AND coalesce(u.metadata ->> 'mandate_key', substring(u.source_feature from '^mandate:(.+)$')) = v_key))
      AND u.deleted_at IS NULL
      AND u.origin_class IS DISTINCT FROM 'workflow'
      AND NOT (u.metadata ? 'mandate_candidate')
      AND NOT EXISTS (
        SELECT 1 FROM chat.conversation tc
        WHERE tc.id = u.conversation_id
          AND tc.metadata #>> '{mandate_run,placement,test_run}' = 'true')
      AND coalesce(u.source_feature, '') NOT LIKE 'mandate\_candidate:%'
      AND NOT EXISTS (
        SELECT 1 FROM chat.request rq
        JOIN chat.conversation cv ON cv.id = rq.conversation_id
        WHERE rq.user_request_id = u.id AND cv.conversation_type = 'mandate_candidate')
    UNION ALL
    SELECT
      'conversation'::text, u.id, u.created_at, u.completed_at, u.status, u.created_by,
      u.organization_id, u.origin_class,
      u.metadata -> 'mandate_resolution', u.metadata -> 'mandate_holder',
      u.agent_id, NULL::uuid, u.total_cost, u.total_duration_ms::bigint, u.total_tokens::bigint,
      NULLIF(left(coalesce(u.error, ''), 300), ''),
      coalesce(u.metadata ->> 'mandate_key', substring(u.source_feature from '^mandate:(.+)$')),
      u.conversation_id, 'agent'::text,
      u.door, u.rung, u.holder_type, u.watching, u.refusal, u.placement
    FROM chat.user_request u
    WHERE p_agent_id IS NOT NULL AND u.agent_id = p_agent_id AND u.deleted_at IS NULL
    UNION ALL
    SELECT
      'conversation'::text, u.id, u.created_at, u.completed_at, u.status, u.created_by,
      u.organization_id, u.origin_class,
      u.metadata -> 'mandate_resolution', u.metadata -> 'mandate_holder',
      u.agent_id, NULL::uuid, u.total_cost, u.total_duration_ms::bigint, u.total_tokens::bigint,
      NULLIF(left(coalesce(u.error, ''), 300), ''),
      v_key, u.conversation_id, 'holder_agent'::text,
      u.door, u.rung, u.holder_type, u.watching, u.refusal, u.placement
    FROM chat.user_request u
    WHERE v_key IS NOT NULL
      AND u.agent_id IN (
        SELECT md.default_holder_id FROM mandate.definition md
        WHERE md.mandate_key = v_key AND md.default_holder_type = 'agent' AND md.deleted_at IS NULL
        UNION
        SELECT mb.holder_id FROM mandate.binding mb
        JOIN mandate.definition md2 ON md2.id = mb.mandate_id
        WHERE md2.mandate_key = v_key AND mb.holder_type = 'agent' AND mb.deleted_at IS NULL)
      AND u.deleted_at IS NULL
      AND coalesce(u.mandate_key, u.metadata ->> 'mandate_key', substring(u.source_feature from '^mandate:(.+)$')) IS NULL
      AND coalesce(u.source_feature, '') NOT LIKE 'mandate\_candidate:%'
      AND NOT (u.metadata ? 'mandate_candidate')
      AND NOT EXISTS (
        SELECT 1 FROM chat.conversation tc
        WHERE tc.id = u.conversation_id
          AND tc.metadata #>> '{mandate_run,placement,test_run}' = 'true')
    UNION ALL
    SELECT
      'workflow'::text, r.id, r.created_at, r.completed_at, r.status, r.created_by,
      r.organization_id, NULL::text, r.metadata -> '_mandate' -> 'resolution', NULL::jsonb,
      NULL::uuid, r.definition_id,
      (SELECT sum(rq.cost) FROM chat.request rq
        WHERE rq.execution_kind = 'workflow_run' AND rq.execution_id = r.id AND rq.deleted_at IS NULL),
      CASE WHEN r.completed_at IS NOT NULL
        THEN (extract(epoch FROM (r.completed_at - coalesce(r.started_at, r.created_at))) * 1000)::bigint END,
      (SELECT sum(rq.total_tokens) FROM chat.request rq
        WHERE rq.execution_kind = 'workflow_run' AND rq.execution_id = r.id AND rq.deleted_at IS NULL),
      NULLIF(left(coalesce(r.error ->> 'message', r.error #>> '{}', ''), 300), ''),
      v_key, NULL::uuid, 'mandate'::text,
      'workflow'::text, NULL::text, 'workflow'::text, false, NULL::jsonb, NULL::jsonb
    FROM workflow.run r
    WHERE v_key IS NOT NULL
      AND r.metadata ? '_mandate'
      AND (r.metadata -> '_mandate' -> 'chain' ->> -1) = v_key
      AND r.deleted_at IS NULL
      AND NOT (r.metadata ? 'mandate_candidate')
      AND NOT EXISTS (SELECT 1 FROM mandate.candidate_run cr WHERE cr.candidate_wf_run_id = r.id)
    UNION ALL
    -- An agent run labelled mandate:<key> (runtime.global_execution) that is not
    -- itself a tagged request of this mandate and not inside an untagged request:
    -- one run per request id, its cost the sum of its executions. The SAME lane as
    -- mandate.admin_run_counts (features/mandates/FEATURE.md "A mandate's runs").
    SELECT
      'agent_run'::text, ex.run_id, ex.created_at, ex.completed_at, ex.raw_status, ex.created_by,
      ex.organization_id, 'child_agent'::text, NULL::jsonb, NULL::jsonb,
      ex.agent_id, NULL::uuid, ex.cost, ex.duration_ms, ex.tokens, ex.error_text,
      v_key, NULL::uuid, 'mandate'::text,
      NULL::text, NULL::text, NULL::text, false, NULL::jsonb, NULL::jsonb
    FROM (
      SELECT coalesce(e.request_id, e.id) AS run_id,
        min(e.created_at) AS created_at,
        CASE WHEN bool_and(e.ended_at IS NOT NULL) THEN max(e.ended_at) END AS completed_at,
        CASE WHEN bool_or(e.status = 'failed') THEN 'failed'
             WHEN bool_or(e.status NOT IN ('completed', 'failed', 'cancelled')) THEN 'running'
             WHEN bool_or(e.status = 'cancelled') THEN 'cancelled'
             ELSE 'completed' END AS raw_status,
        (array_agg(CASE WHEN pg_input_is_valid(e.context ->> 'user_id', 'uuid') THEN (e.context ->> 'user_id')::uuid END
           ORDER BY e.created_at) FILTER (WHERE pg_input_is_valid(e.context ->> 'user_id', 'uuid')))[1] AS created_by,
        (array_agg(e.organization_id ORDER BY e.created_at) FILTER (WHERE e.organization_id IS NOT NULL))[1] AS organization_id,
        (array_agg((e.context ->> 'agent_id')::uuid ORDER BY e.created_at)
           FILTER (WHERE pg_input_is_valid(e.context ->> 'agent_id', 'uuid')))[1] AS agent_id,
        sum(e.cost) AS cost,
        CASE WHEN bool_and(e.ended_at IS NOT NULL)
          THEN (extract(epoch FROM (max(e.ended_at) - min(coalesce(e.started_at, e.created_at)))) * 1000)::bigint END AS duration_ms,
        sum(coalesce(NULLIF(e.meters ->> 'input_tokens', '')::bigint, 0)
          + coalesce(NULLIF(e.meters ->> 'output_tokens', '')::bigint, 0))::bigint AS tokens,
        NULLIF(left(coalesce((array_agg(coalesce(e.error ->> 'message', e.error #>> '{}')
           ORDER BY e.created_at) FILTER (WHERE e.error IS NOT NULL))[1], ''), 300), '') AS error_text
      FROM runtime.global_execution e
      LEFT JOIN chat.user_request u ON u.id = e.request_id
      WHERE v_key IS NOT NULL
        AND coalesce(e.context ->> 'mandate_key', substring(e.context ->> 'agent_run_label' from '^mandate:(.+)$')) = v_key
        AND (u.id IS NULL
             OR coalesce(u.mandate_key, u.metadata ->> 'mandate_key', substring(u.source_feature from '^mandate:(.+)$')) IS DISTINCT FROM v_key
                AND coalesce(u.mandate_key, u.metadata ->> 'mandate_key', substring(u.source_feature from '^mandate:(.+)$')) IS NOT NULL)
      GROUP BY 1) ex
  ),
  normalized AS (
    SELECT raw.*,
      CASE
        WHEN raw.raw_status = 'completed' THEN
          CASE WHEN coalesce((raw.res ->> 'output_warned')::boolean, false)
                 OR jsonb_array_length(coalesce(NULLIF(raw.res -> 'output_missing_keys', 'null'::jsonb), '[]'::jsonb)) > 0
            THEN 'warned' ELSE 'succeeded' END
        WHEN raw.raw_status IN ('failed', 'errored') THEN 'failed'
        WHEN raw.raw_status IN ('cancelled', 'abandoned', 'interrupted') THEN 'stopped'
        WHEN raw.raw_status IN ('paused', 'awaiting_input', 'pausing') THEN 'waiting'
        ELSE 'running'
      END AS status
    FROM raw
  ),
  seat AS (
    SELECT n.* FROM normalized n
    WHERE CASE v_view
        WHEN 'mine' THEN n.created_by = v_uid AND (p_org_id IS NULL OR n.organization_id = p_org_id)
        WHEN 'org' THEN n.organization_id = p_org_id AND (p_user_id IS NULL OR n.created_by = p_user_id)
        ELSE (p_org_id IS NULL OR n.organization_id = p_org_id)
          AND (p_user_id IS NULL OR n.created_by = p_user_id)
      END
  ),
  filtered AS (
    SELECT s.*,
      CASE s.status WHEN 'failed' THEN 0 WHEN 'warned' THEN 1 WHEN 'stopped' THEN 2
        WHEN 'waiting' THEN 3 WHEN 'running' THEN 4 ELSE 5 END AS status_rank,
      CASE coalesce(s.row_rung, s.res ->> 'rung') WHEN 'system' THEN 0 WHEN 'org' THEN 1 WHEN 'user' THEN 2 WHEN 'run' THEN 3 END AS level_rank
    FROM seat s WHERE v_status IS NULL OR s.status = v_status
  ),
  page AS (
    SELECT f.*, row_number() OVER (ORDER BY
      CASE WHEN v_desc THEN
        CASE v_sort WHEN 'duration' THEN f.duration_ms::numeric WHEN 'cost' THEN f.cost
          WHEN 'status' THEN f.status_rank::numeric WHEN 'level' THEN f.level_rank::numeric END
      END DESC NULLS LAST,
      CASE WHEN NOT v_desc THEN
        CASE v_sort WHEN 'duration' THEN f.duration_ms::numeric WHEN 'cost' THEN f.cost
          WHEN 'status' THEN f.status_rank::numeric WHEN 'level' THEN f.level_rank::numeric END
      END ASC NULLS LAST,
      CASE WHEN v_sort = 'started_at' AND NOT v_desc THEN f.created_at END ASC,
      f.created_at DESC, f.run_id DESC) AS ord
    FROM filtered f
    ORDER BY ord
    LIMIT v_limit OFFSET v_offset
  ),
  shaped AS (
    SELECT p.*,
      coalesce(p.row_holder_type, p.res ->> 'holder_type', p.hold ->> 'holder_type',
        CASE WHEN p.run_kind = 'workflow' THEN 'workflow' ELSE 'agent' END) AS holder_type,
      coalesce(CASE WHEN p.run_kind = 'workflow' THEN p.workflow_definition_id END,
        NULLIF(p.res ->> 'holder_id', '')::uuid, p.agent_id, NULLIF(p.hold ->> 'workflow_id', '')::uuid) AS holder_id
    FROM page p
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM filtered),
    -- Cost over EVERY run that matches (not just this page) and how many of them
    -- are inferred (the Holder agent's untagged runs) — the admin list's numbers.
    'cost_total', (SELECT coalesce(sum(f.cost), 0) FROM filtered f),
    'inferred_total', (SELECT count(*) FROM filtered f WHERE f.found_by = 'holder_agent'),
    'inferred_cost', (SELECT coalesce(sum(f.cost), 0) FROM filtered f WHERE f.found_by = 'holder_agent'),
    'rows', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
          'run_kind', s.run_kind,
          'run_id', s.run_id,
          'started_at', s.created_at,
          'completed_at', s.completed_at,
          'status', s.status,
          'raw_status', s.raw_status,
          'error', s.error_text,
          'ran_by_id', s.created_by,
          'ran_by_name', coalesce(NULLIF(btrim(pr.display_name), ''), au.email::text),
          'ran_by_kind', CASE
              WHEN s.created_by IS NULL THEN 'system'
              WHEN s.run_kind = 'conversation'
                AND coalesce(s.origin_class, 'human') NOT IN ('human', 'child_agent') THEN 'system'
              ELSE 'person'
            END,
          'organization_id', s.organization_id,
          'organization_name', org.name,
          'rung', coalesce(s.row_rung, s.res ->> 'rung'),
          'door', coalesce(s.row_door, s.res ->> 'door'),
          'watching', coalesce(s.row_watching, false),
          'refusal', s.row_refusal,
          'placement', s.row_placement,
          'mandate_key', s.mandate_key,
          'found_by', s.found_by,
          'attribution', coalesce(
            (SELECT ur.metadata ->> 'mandate_attribution' FROM chat.user_request ur
              WHERE s.run_kind = 'conversation' AND ur.id = s.run_id),
            (SELECT cv.metadata ->> 'mandate_attribution' FROM chat.conversation cv
              WHERE cv.id = conv.conversation_id)),
          'direct_door', coalesce(
            (SELECT ur.metadata ->> 'direct_door' FROM chat.user_request ur
              WHERE s.run_kind = 'conversation' AND ur.id = s.run_id),
            (SELECT cv.metadata ->> 'direct_door' FROM chat.conversation cv
              WHERE cv.id = conv.conversation_id)),
          'holder_type', s.holder_type,
          'holder_id', s.holder_id,
          'holder_name', CASE WHEN s.holder_type = 'workflow' THEN wd.name ELSE ad.name END,
          'holder_agent_type', CASE WHEN s.holder_type = 'workflow' THEN NULL ELSE ad.agent_type END,
          'output_warned', s.status = 'warned',
          'output_missing_keys', coalesce(NULLIF(s.res -> 'output_missing_keys', 'null'::jsonb), '[]'::jsonb),
          'cost', s.cost,
          'duration_ms', s.duration_ms,
          'tokens', s.tokens,
          'output_preview', CASE WHEN v_view = 'org' AND s.created_by IS DISTINCT FROM v_uid THEN NULL
            WHEN s.run_kind = 'workflow' THEN wout.preview ELSE cout.preview END,
          'conversation_id', conv.conversation_id,
          'has_transcript', CASE WHEN conv.conversation_id IS NULL THEN false ELSE EXISTS (
            SELECT 1 FROM chat.message m
            WHERE m.conversation_id = conv.conversation_id
              AND m.status IN ('active', 'summary') AND m.deleted_at IS NULL) END
        ) ORDER BY s.ord)
      FROM shaped s
      LEFT JOIN users.profiles pr ON pr.id = s.created_by
      LEFT JOIN auth.users au ON au.id = s.created_by
      LEFT JOIN iam.organizations org ON org.id = s.organization_id
      LEFT JOIN agent.definition ad ON s.holder_type <> 'workflow' AND ad.id = s.holder_id
      LEFT JOIN workflow.definition wd ON s.holder_type = 'workflow' AND wd.id = s.holder_id
      LEFT JOIN LATERAL (
        SELECT coalesce(s.direct_conversation_id, (
          SELECT rq.conversation_id FROM chat.request rq
          WHERE s.run_kind = 'conversation' AND rq.user_request_id = s.run_id
            AND rq.conversation_id IS NOT NULL AND rq.deleted_at IS NULL
          ORDER BY rq.iteration LIMIT 1)) AS conversation_id
      ) conv ON true
      LEFT JOIN LATERAL (
        SELECT left(btrim(regexp_replace(string_agg(b ->> 'text', ' '), '\s+', ' ', 'g')), 240) AS preview
        FROM (
          SELECT m.content FROM chat.message m
          WHERE s.run_kind = 'conversation' AND m.conversation_id = conv.conversation_id
            AND m.role = 'assistant' AND m.deleted_at IS NULL
            AND m.created_at >= s.created_at
            AND m.created_at < coalesce((
              SELECT min(u2.created_at) FROM chat.user_request u2
              WHERE u2.conversation_id = conv.conversation_id AND u2.created_at > s.created_at
                AND u2.deleted_at IS NULL), 'infinity'::timestamptz)
          ORDER BY m.position DESC LIMIT 1
        ) last_msg,
        LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(last_msg.content) = 'array' THEN last_msg.content ELSE '[]'::jsonb END) b
        WHERE b ->> 'type' = 'text' AND coalesce(b ->> 'text', '') <> ''
      ) cout ON true
      LEFT JOIN LATERAL (
        SELECT left(regexp_replace(CASE WHEN jsonb_typeof(r.output) = 'string' THEN r.output #>> '{}' ELSE r.output::text END, '\s+', ' ', 'g'), 240) AS preview
        FROM workflow.run r WHERE s.run_kind = 'workflow' AND r.id = s.run_id
          AND r.output IS NOT NULL AND r.output <> 'null'::jsonb
      ) wout ON true
    ), '[]'::jsonb),
    'facets', CASE WHEN v_view = 'mine' THEN NULL ELSE jsonb_build_object(
      'organizations', coalesce((
        SELECT jsonb_agg(jsonb_build_object('id', x.organization_id, 'name', o.name, 'count', x.n) ORDER BY x.n DESC)
        FROM (SELECT organization_id, count(*) n FROM normalized
              WHERE organization_id IS NOT NULL AND (v_view = 'platform' OR organization_id = p_org_id)
              GROUP BY 1 ORDER BY 2 DESC LIMIT 50) x
        LEFT JOIN iam.organizations o ON o.id = x.organization_id
      ), '[]'::jsonb),
      'people', coalesce((
        SELECT jsonb_agg(jsonb_build_object('id', x.created_by,
            'name', coalesce(NULLIF(btrim(pp.display_name), ''), uu.email::text), 'count', x.n) ORDER BY x.n DESC)
        FROM (SELECT created_by, count(*) n FROM normalized
              WHERE created_by IS NOT NULL
                AND (CASE WHEN v_view = 'org' THEN organization_id = p_org_id
                          ELSE (p_org_id IS NULL OR organization_id = p_org_id) END)
              GROUP BY 1 ORDER BY 2 DESC LIMIT 50) x
        LEFT JOIN users.profiles pp ON pp.id = x.created_by
        LEFT JOIN auth.users uu ON uu.id = x.created_by
      ), '[]'::jsonb)
    ) END
  ) INTO v_out;

  RETURN v_out;
END;
$function$
;
