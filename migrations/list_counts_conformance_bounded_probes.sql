-- draft: db_contract_triage rehearse bounded list-count conformance probes on the clone before production review
-- The original public.__list_counts_conformance() runs every catalog, numeric parity, team reach,
-- and my-teams sample in one statement. PostgREST's statement ceiling cancels it before any of its
-- seven rows can be returned. These service-only helpers expose the same sample as independent units;
-- scripts/check-list-counts.ts aggregates every unit and refuses missing work.

CREATE OR REPLACE FUNCTION platform.__list_counts_conformance_units()
RETURNS TABLE(unit jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_users uuid[];
  v_uid uuid;
  v_first uuid;
  v_family text;
  r record;
  v_emitted int;
BEGIN
  unit := jsonb_build_object('kind', 'catalog');
  RETURN NEXT;

  v_emitted := 0;
  FOR r IN
    SELECT DISTINCT s.created_by AS uid
      FROM education.fc_set AS s
     WHERE s.created_by IS NOT NULL
     LIMIT 5
  LOOP
    unit := jsonb_build_object('kind', 'education', 'uid', r.uid);
    v_emitted := v_emitted + 1;
    RETURN NEXT;
  END LOOP;
  IF v_emitted = 0 THEN
    unit := jsonb_build_object('kind', 'education', 'empty', true);
    RETURN NEXT;
  END IF;

  SELECT array_agg(DISTINCT u) INTO v_users
    FROM (SELECT id AS u FROM auth.users WHERE email IN ('admin@admin.com', 'test@test.com')) AS s
   WHERE u IS NOT NULL;
  v_first := v_users[1];
  IF coalesce(array_length(v_users, 1), 0) = 0 THEN
    unit := jsonb_build_object('kind', 'family', 'empty', true);
    RETURN NEXT;
  ELSE
    FOREACH v_family IN ARRAY ARRAY[
      'agx_list_scope_counts', 'trx_list_scope_counts', 'cvx_list_scope_counts',
      'wfx_list_scope_counts', 'shx_list_scope_counts', 'ivw_list_scope_counts',
      'seo_rank_target_list_scope_counts', 'edu_library_scope_counts',
      'crm_inbox_list_scope_counts', 'mkt_initiative_list_scope_counts',
      'rsx_list_scope_counts'
    ]::text[]
    LOOP
      FOREACH v_uid IN ARRAY v_users LOOP
        unit := jsonb_build_object('kind', 'family', 'family', v_family, 'uid', v_uid, 'search', NULL);
        RETURN NEXT;
        IF v_uid IS NOT DISTINCT FROM v_first AND v_family <> 'cvx_list_scope_counts' THEN
          unit := jsonb_build_object('kind', 'family', 'family', v_family, 'uid', v_uid, 'search', 'a');
          RETURN NEXT;
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  v_emitted := 0;
  FOR r IN
    (SELECT m.user_id AS uid, m.organization_id AS org, false AS on_team
       FROM iam.organization_member AS m
      WHERE NOT EXISTS (
        SELECT 1
          FROM iam.team_members_resolved(ARRAY(
            SELECT t.id FROM iam.team AS t
             WHERE t.organization_id = m.organization_id AND t.deleted_at IS NULL
          )) AS tm
         WHERE tm.user_id = m.user_id
      )
      LIMIT 20)
    UNION ALL
    (SELECT tm.user_id, t.organization_id, true
       FROM iam.team AS t
       CROSS JOIN LATERAL iam.team_members_resolved(ARRAY[t.id]) AS tm
       JOIN iam.organization_member AS m
         ON m.organization_id = t.organization_id AND m.user_id = tm.user_id
      WHERE t.deleted_at IS NULL
      LIMIT 20)
  LOOP
    unit := jsonb_build_object('kind', 'team_reach', 'uid', r.uid, 'org', r.org, 'on_team', r.on_team);
    v_emitted := v_emitted + 1;
    RETURN NEXT;
  END LOOP;
  IF v_emitted = 0 THEN
    unit := jsonb_build_object('kind', 'team_reach', 'empty', true);
    RETURN NEXT;
  END IF;

  v_emitted := 0;
  FOR r IN
    SELECT DISTINCT ON (s.uid) s.uid, s.team_org,
           (SELECT o.id
              FROM iam.organizations AS o
             WHERE NOT EXISTS (
               SELECT 1 FROM iam.organization_member AS m2
                WHERE m2.organization_id = o.id AND m2.user_id = s.uid
             )
             ORDER BY o.id LIMIT 1) AS foreign_org
      FROM (
        (SELECT tm.user_id AS uid, t.organization_id AS team_org
           FROM iam.team AS t
           CROSS JOIN LATERAL iam.team_members_resolved(ARRAY[t.id]) AS tm
           JOIN iam.organization_member AS m
             ON m.organization_id = t.organization_id AND m.user_id = tm.user_id
           JOIN iam.organizations AS og
             ON og.id = t.organization_id AND og.archived_at IS NULL
          WHERE t.deleted_at IS NULL LIMIT 20)
        UNION ALL
        (SELECT id, NULL::uuid FROM auth.users WHERE email IN ('admin@admin.com', 'test@test.com'))
        UNION ALL
        (SELECT m.user_id, NULL::uuid FROM iam.organization_member AS m ORDER BY m.user_id LIMIT 10)
      ) AS s
     ORDER BY s.uid, s.team_org NULLS LAST
  LOOP
    unit := jsonb_strip_nulls(jsonb_build_object(
      'kind', 'my_teams', 'uid', r.uid, 'team_org', r.team_org, 'foreign_org', r.foreign_org
    ));
    v_emitted := v_emitted + 1;
    RETURN NEXT;
  END LOOP;
  IF v_emitted = 0 THEN
    unit := jsonb_build_object('kind', 'my_teams', 'empty', true);
    RETURN NEXT;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION platform.__list_counts_conformance_family_units(p_unit jsonb)
RETURNS TABLE(unit jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_family text := p_unit ->> 'family';
  v_uid uuid := (p_unit ->> 'uid')::uuid;
  v_search text := p_unit ->> 'search';
  v_counts_sql text;
  v_lanes jsonb;
  v_lane text;
  v_registry text[][] := ARRAY[
    ['agx_list_scope_counts', 'SELECT * FROM public.agx_list_scope_counts(:search, false, ''active'', :filters, NULL)'],
    ['trx_list_scope_counts', 'SELECT * FROM public.trx_list_scope_counts(:search, false, :filters, NULL)'],
    ['cvx_list_scope_counts', 'SELECT * FROM public.cvx_list_scope_counts(:search, false, ''active'', :filters, NULL)'],
    ['wfx_list_scope_counts', 'SELECT * FROM public.wfx_list_scope_counts(:search, false, ''active'', :filters, NULL)'],
    ['shx_list_scope_counts', 'SELECT * FROM public.shx_list_scope_counts(:search, false, :filters, NULL)'],
    ['ivw_list_scope_counts', 'SELECT * FROM public.ivw_list_scope_counts(:search, :filters, NULL)'],
    ['seo_rank_target_list_scope_counts', 'SELECT * FROM public.seo_rank_target_list_scope_counts(:search, :filters, NULL)'],
    ['edu_library_scope_counts', 'SELECT * FROM public.edu_library_scope_counts(:search, :filters, NULL)'],
    ['crm_inbox_list_scope_counts', 'SELECT * FROM public.crm_inbox_list_scope_counts(:search, false, :filters, NULL)'],
    ['mkt_initiative_list_scope_counts', 'SELECT * FROM public.mkt_initiative_list_scope_counts(:search, false, :filters, NULL)'],
    ['rsx_list_scope_counts', 'SELECT * FROM public.rsx_list_scope_counts(:search, :filters, ''active'', NULL)']
  ];
BEGIN
  IF p_unit ->> 'kind' <> 'family' OR coalesce((p_unit ->> 'empty')::boolean, false) THEN
    RAISE EXCEPTION 'family-unit expansion requires a nonempty family manifest unit' USING ERRCODE = '22023';
  END IF;
  SELECT k[2] INTO v_counts_sql
    FROM (SELECT ARRAY[v_registry[i][1], v_registry[i][2]] AS k FROM generate_subscripts(v_registry, 1) AS i) AS z
   WHERE k[1] = v_family;
  IF v_counts_sql IS NULL THEN RAISE EXCEPTION 'unknown list-count family %', v_family USING ERRCODE = '22023'; END IF;
  v_counts_sql := replace(replace(v_counts_sql, ':search', quote_nullable(v_search)), ':filters', quote_literal('{}') || '::jsonb');
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  EXECUTE 'SELECT coalesce(jsonb_agg(scope ORDER BY scope), ''[]''::jsonb) FROM (SELECT DISTINCT c.scope FROM (' || v_counts_sql || ') AS c WHERE c.narrow_id IS NULL AND c.scope NOT LIKE ''platform%'') AS lanes'
    INTO v_lanes;
  FOR v_lane IN SELECT jsonb_array_elements_text(v_lanes)
  LOOP
    unit := p_unit || jsonb_build_object('kind', 'family_lane', 'lane', v_lane);
    RETURN NEXT;
  END LOOP;
  IF jsonb_array_length(v_lanes) = 0 THEN
    unit := p_unit || jsonb_build_object('kind', 'family_lane', 'empty', true);
    RETURN NEXT;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION platform.__list_counts_conformance_probe(p_unit jsonb)
RETURNS TABLE(check_key text, ok boolean, severity text, detail jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_claims text := current_setting('request.jwt.claims', true);
  v_kind text := p_unit ->> 'kind';
  v_bad jsonb := '[]'::jsonb;
  v_checked int := 0;
  v_count bigint;
  v_list bigint;
  v_reach jsonb;
  v_uid uuid;
  v_org uuid;
  v_on_team boolean;
  v_family text;
  v_search text;
  v_lane text;
  v_option_total bigint;
  v_res jsonb;
  v_cs text;
  v_ls text;
  r record;
  v_registry text[][] := ARRAY[
    ['agx_list_scope_counts', 'SELECT * FROM public.agx_list_scope_counts(:search, false, ''active'', :filters, NULL)',
       'SELECT coalesce(max(x.total_count), 0) FROM public.agx_list_scoped(%L, NULL, :search, false, ''updated'', ''desc'', false, ''active'', :filters, 1, 0) x'],
    ['trx_list_scope_counts', 'SELECT * FROM public.trx_list_scope_counts(:search, false, :filters, NULL)',
       'SELECT coalesce(max(x.total_count), 0) FROM public.trx_list_scoped(%L, NULL, :search, false, ''updated'', ''desc'', :filters, 1, 0) x'],
    ['cvx_list_scope_counts', 'SELECT * FROM public.cvx_list_scope_counts(:search, false, ''active'', :filters, NULL)',
       'SELECT coalesce(max(x.total_count), 0) FROM public.cvx_list_scoped(%L, NULL, :search, false, ''updated'', ''desc'', true, ''active'', :filters, 1, 0) x'],
    ['wfx_list_scope_counts', 'SELECT * FROM public.wfx_list_scope_counts(:search, false, ''active'', :filters, NULL)',
       'SELECT coalesce(max(x.total_count), 0) FROM public.wfx_list_scoped(%L, NULL, :search, false, ''updated'', ''desc'', true, ''active'', :filters, 1, 0) x'],
    ['shx_list_scope_counts', 'SELECT * FROM public.shx_list_scope_counts(:search, false, :filters, NULL)',
       'SELECT coalesce(max(x.total_count), 0) FROM public.shx_list_scoped(%L, NULL, :search, false, ''updated'', ''desc'', :filters, 1, 0) x'],
    ['ivw_list_scope_counts', 'SELECT * FROM public.ivw_list_scope_counts(:search, :filters, NULL)',
       'SELECT coalesce(max(x.total_count), 0) FROM public.ivw_list_scoped(%L, NULL, :search, ''updated'', ''desc'', :filters, 1, 0) x'],
    ['seo_rank_target_list_scope_counts', 'SELECT * FROM public.seo_rank_target_list_scope_counts(:search, :filters, NULL)',
       'SELECT coalesce(max(x.total_count), 0) FROM public.seo_rank_target_list_scoped(%L, NULL, :search, ''created_at'', ''desc'', :filters, 1, 0) x'],
    ['edu_library_scope_counts', 'SELECT * FROM public.edu_library_scope_counts(:search, :filters, NULL)',
       'SELECT coalesce(max(x.total_count), 0) FROM public.edu_library_list_scoped(%L, :search, ''updated'', ''desc'', :filters, 1, 0, NULL) x'],
    ['crm_inbox_list_scope_counts', 'SELECT * FROM public.crm_inbox_list_scope_counts(:search, false, :filters, NULL)',
       'SELECT coalesce(max(x.total_count), 0) FROM public.crm_inbox_list_scoped(%L, NULL, :search, false, ''occurred'', ''desc'', :filters, 1, 0) x'],
    ['mkt_initiative_list_scope_counts', 'SELECT * FROM public.mkt_initiative_list_scope_counts(:search, false, :filters, NULL)',
       'SELECT coalesce(max(x.total_count), 0) FROM public.mkt_initiative_list_scoped(%L, NULL, :search, false, ''updated_at'', ''desc'', :filters, 1, 0) x'],
    ['rsx_list_scope_counts', 'SELECT * FROM public.rsx_list_scope_counts(:search, :filters, ''active'', NULL)',
       'SELECT coalesce(max(x.total_count), 0) FROM public.rsx_list_scoped(%L, NULL, :search, ''updated_at'', ''desc'', :filters, 1, 0, ''active'') x']
  ];
  v_registered text[] := ARRAY['fc_set_list_counts', 'assessment_list_counts', 'mnd_list_scope_counts'];
BEGIN
  IF v_kind = 'catalog' THEN
    FOR r IN
      SELECT n.nspname AS sch, p.proname AS fn, pg_get_functiondef(p.oid) AS body,
             regexp_replace(p.proname, '_(list_)?(scope_)?counts$', '_list_scoped') AS twin,
             p.prosecdef
        FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid = p.pronamespace
       WHERE p.prokind = 'f' AND n.nspname IN ('public', 'education')
         AND p.proname ~ '(_list_counts|_scope_counts)$'
    LOOP
      IF EXISTS (
        SELECT 1 FROM pg_proc AS p2 JOIN pg_namespace AS n2 ON n2.oid = p2.pronamespace
         WHERE n2.nspname = r.sch AND p2.proname = r.twin
      ) THEN
        v_checked := v_checked + 1;
        IF position(r.sch || '.' || r.twin || '(' IN r.body) = 0 THEN
          v_bad := v_bad || jsonb_build_object('function', r.sch || '.' || r.fn, 'must_call', r.sch || '.' || r.twin);
        END IF;
      END IF;
    END LOOP;
    check_key := 'counts_delegate_to_list'; ok := jsonb_array_length(v_bad) = 0 AND v_checked > 0; severity := 'error';
    detail := jsonb_build_object('why', 'A tab count must be its list query, or the two drift (the education lists counted rows their lists hid).', 'checked', v_checked, 'offenders', v_bad);
    RETURN NEXT;

    v_bad := '[]'::jsonb; v_checked := 0;
    FOR r IN
      SELECT n.nspname AS sch, p.proname AS fn, p.prosecdef
        FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid = p.pronamespace
       WHERE p.prokind = 'f' AND n.nspname IN ('public', 'education')
         AND p.proname ~ '(_list_counts|_scope_counts)$'
    LOOP
      v_checked := v_checked + 1;
      IF r.prosecdef THEN v_bad := v_bad || jsonb_build_object('function', r.sch || '.' || r.fn); END IF;
    END LOOP;
    check_key := 'counts_are_security_invoker'; ok := jsonb_array_length(v_bad) = 0 AND v_checked > 0; severity := 'error';
    detail := jsonb_build_object('why', 'A SECURITY DEFINER counts function counts rows the invoker list hides from the person.', 'checked', v_checked, 'offenders', v_bad);
    RETURN NEXT;

    v_bad := '[]'::jsonb; v_checked := 0;
    FOR r IN
      SELECT n.nspname AS sch, p.proname AS fn,
             regexp_replace(p.proname, '_(list_)?(scope_)?counts$', '_list_scoped') AS twin
        FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid = p.pronamespace
       WHERE p.prokind = 'f' AND n.nspname IN ('public', 'education')
         AND p.proname ~ '(_list_counts|_scope_counts)$'
    LOOP
      IF EXISTS (
        SELECT 1 FROM pg_proc AS p2 JOIN pg_namespace AS n2 ON n2.oid = p2.pronamespace
         WHERE n2.nspname = r.sch AND p2.proname = r.twin
      ) THEN
        v_checked := v_checked + 1;
        IF NOT (r.fn = ANY(v_registered))
           AND NOT EXISTS (
             SELECT 1 FROM unnest(v_registry[1:array_length(v_registry, 1)][1:1]) AS k WHERE k = r.fn
           ) THEN
          v_bad := v_bad || jsonb_build_object('function', r.sch || '.' || r.fn);
        END IF;
      END IF;
    END LOOP;
    check_key := 'counts_family_registered'; ok := jsonb_array_length(v_bad) = 0 AND v_checked > 0; severity := 'error';
    detail := jsonb_build_object('why', 'Every counts family with a list twin is registered for numeric comparison.', 'checked', v_checked, 'unregistered', v_bad);
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_kind = 'education' THEN
    IF coalesce((p_unit ->> 'empty')::boolean, false) THEN
      check_key := 'education_counts_equal_list'; ok := false; severity := 'error';
      detail := jsonb_build_object('why', 'Each lane''s count equals the total its list returns.', 'checked', 0, 'mismatches', '[]'::jsonb);
      RETURN NEXT; RETURN;
    END IF;
    v_uid := (p_unit ->> 'uid')::uuid;
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
    FOR v_count, v_list, v_reach IN
      SELECT c.total, coalesce((SELECT max(x.total_count) FROM education.fc_set_list_scoped(c.scope, NULL, '', '{}'::jsonb, 'active', 'updated', false, 1, 0) AS x), 0), jsonb_build_object('list', 'fc_set', 'lane', c.scope) FROM education.fc_set_list_counts() AS c
      UNION ALL
      SELECT c.total, coalesce((SELECT max(x.total_count) FROM education.assessment_list_scoped('quiz', c.scope, NULL, '', '{}'::jsonb, 'active', 'updated', false, 1, 0) AS x), 0), jsonb_build_object('list', 'assessment', 'lane', c.scope) FROM education.assessment_list_counts('quiz') AS c
    LOOP
      v_checked := v_checked + 1;
      IF v_count <> v_list THEN v_bad := v_bad || (v_reach || jsonb_build_object('user', v_uid, 'count', v_count, 'listed', v_list)); END IF;
    END LOOP;
    PERFORM set_config('request.jwt.claims', coalesce(v_claims, ''), true);
    check_key := 'education_counts_equal_list'; ok := jsonb_array_length(v_bad) = 0 AND v_checked > 0; severity := 'error';
    detail := jsonb_build_object('why', 'Each lane''s count equals the total its list returns.', 'checked', v_checked, 'mismatches', v_bad);
    RETURN NEXT; RETURN;
  END IF;

  IF v_kind = 'family_lane' THEN
    IF coalesce((p_unit ->> 'empty')::boolean, false) THEN
      check_key := 'counts_equal_list_every_family'; ok := false; severity := 'error';
      detail := jsonb_build_object('why', 'Every lane total equals its list total.', 'lane_totals_compared', 0, 'mismatches', '[]'::jsonb, 'no_list_twin_not_compared', '[]'::jsonb);
      RETURN NEXT; RETURN;
    END IF;
    v_uid := (p_unit ->> 'uid')::uuid;
    v_family := p_unit ->> 'family';
    v_search := p_unit ->> 'search';
    v_lane := p_unit ->> 'lane';
    SELECT k[2], k[3] INTO v_cs, v_ls
      FROM (SELECT ARRAY[v_registry[i][1], v_registry[i][2], v_registry[i][3]] AS k FROM generate_subscripts(v_registry, 1) AS i) AS z
     WHERE k[1] = v_family;
    IF v_cs IS NULL OR v_ls IS NULL THEN RAISE EXCEPTION 'unknown list-count family %', v_family USING ERRCODE = '22023'; END IF;
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
    v_cs := replace(replace(v_cs, ':search', quote_nullable(v_search)), ':filters', quote_literal('{}') || '::jsonb');
    v_ls := replace(replace(v_ls, ':search', quote_nullable(v_search)), ':filters', quote_literal('{}') || '::jsonb');
    BEGIN
      EXECUTE 'SELECT max(c.total) FILTER (WHERE c.narrow_id IS NULL AND c.scope = $1), sum(c.total) FILTER (WHERE c.narrow_id IS NOT NULL AND c.scope = ''orgs'') FROM (' || v_cs || ') AS c'
        INTO v_count, v_option_total USING v_lane;
      IF v_count IS NULL THEN
        v_bad := v_bad || jsonb_build_object('family', v_family, 'user', v_uid, 'search', v_search, 'error', 'counts function omitted manifest lane ' || v_lane);
      ELSE
        EXECUTE format(v_ls, v_lane) INTO v_list;
        v_checked := 1;
        IF v_count IS DISTINCT FROM v_list THEN
          v_bad := v_bad || jsonb_build_object('family', v_family, 'user', v_uid, 'search', v_search, 'mismatches', jsonb_build_array(jsonb_build_object('lane', v_lane, 'count', v_count, 'listed', v_list)));
        END IF;
        IF v_lane = 'orgs' AND v_option_total IS NOT NULL AND v_option_total <> v_count THEN
          v_bad := v_bad || jsonb_build_object('family', v_family, 'user', v_uid, 'search', v_search, 'mismatches', jsonb_build_array(jsonb_build_object('lane', 'orgs', 'options_sum', v_option_total, 'lane_total', v_count)));
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_bad := v_bad || jsonb_build_object('family', v_family, 'user', v_uid, 'search', v_search, 'error', SQLERRM);
    END;
    PERFORM set_config('request.jwt.claims', coalesce(v_claims, ''), true);
    check_key := 'counts_equal_list_every_family'; ok := jsonb_array_length(v_bad) = 0 AND v_checked > 0; severity := 'error';
    detail := jsonb_build_object(
      'why', 'Every lane total a counts function returns equals the total its list returns for the same search and filters.',
      'lane_totals_compared', v_checked, 'mismatches', v_bad,
      'no_list_twin_not_compared', (SELECT coalesce(jsonb_agg(p.proname), '[]'::jsonb) FROM pg_proc AS p WHERE p.pronamespace = 'public'::regnamespace AND p.proname ~ '(_list_counts|_scope_counts)$' AND NOT EXISTS (SELECT 1 FROM pg_proc AS p2 WHERE p2.pronamespace = p.pronamespace AND p2.proname = regexp_replace(p.proname, '_(list_)?(scope_)?counts$', '_list_scoped')))
    );
    RETURN NEXT; RETURN;
  END IF;

  IF v_kind = 'team_reach' THEN
    IF coalesce((p_unit ->> 'empty')::boolean, false) THEN
      check_key := 'team_reach_empty_without_team'; ok := false; severity := 'error';
      detail := jsonb_build_object('why', 'My team is empty for a person on no team and holds them where they are on one.', 'checked', 0, 'offenders', '[]'::jsonb);
      RETURN NEXT; RETURN;
    END IF;
    v_uid := (p_unit ->> 'uid')::uuid; v_org := (p_unit ->> 'org')::uuid; v_on_team := (p_unit ->> 'on_team')::boolean;
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
    SELECT coalesce(jsonb_agg(x.user_id), '[]'::jsonb) INTO v_reach FROM iam.my_team_reach(v_org) AS x;
    v_checked := 1;
    IF (NOT v_on_team AND jsonb_array_length(v_reach) > 0) OR (v_on_team AND NOT v_reach @> jsonb_build_array(v_uid)) THEN
      v_bad := v_bad || jsonb_build_object('user', v_uid, 'organization', v_org, 'on_team', v_on_team, 'reach_size', jsonb_array_length(v_reach));
    END IF;
    PERFORM set_config('request.jwt.claims', coalesce(v_claims, ''), true);
    check_key := 'team_reach_empty_without_team'; ok := jsonb_array_length(v_bad) = 0; severity := 'error';
    detail := jsonb_build_object('why', 'My team is empty for a person on no team and holds them where they are on one.', 'checked', v_checked, 'offenders', v_bad);
    RETURN NEXT; RETURN;
  END IF;

  IF v_kind = 'my_teams' THEN
    IF coalesce((p_unit ->> 'empty')::boolean, false) THEN
      check_key := 'my_teams_answers_every_person'; ok := false; severity := 'error';
      detail := jsonb_build_object('why', 'The My team tab must answer every sampled person.', 'checked', 0, 'offenders', '[]'::jsonb);
      RETURN NEXT; RETURN;
    END IF;
    v_uid := (p_unit ->> 'uid')::uuid;
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
    v_checked := 1;
    BEGIN
      SELECT coalesce(jsonb_agg(x.organization_id), '[]'::jsonb) INTO v_reach FROM public.my_teams(NULL) AS x;
      IF p_unit ? 'team_org' AND NOT v_reach @> jsonb_build_array((p_unit ->> 'team_org')::uuid) THEN
        v_bad := v_bad || jsonb_build_object('user', v_uid, 'call', 'my_teams(all)', 'missing_team_org', p_unit ->> 'team_org');
      END IF;
      IF p_unit ? 'foreign_org' AND EXISTS (SELECT 1 FROM public.my_teams((p_unit ->> 'foreign_org')::uuid)) THEN
        v_bad := v_bad || jsonb_build_object('user', v_uid, 'call', 'my_teams(foreign)', 'error', 'returned rows');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_bad := v_bad || jsonb_build_object('user', v_uid, 'sqlstate', SQLSTATE, 'error', SQLERRM);
    END;
    PERFORM set_config('request.jwt.claims', coalesce(v_claims, ''), true);
    check_key := 'my_teams_answers_every_person'; ok := jsonb_array_length(v_bad) = 0; severity := 'error';
    detail := jsonb_build_object('why', 'The My team tab must answer every sampled person.', 'checked', v_checked, 'offenders', v_bad);
    RETURN NEXT; RETURN;
  END IF;

  RAISE EXCEPTION 'unknown list-count conformance unit kind %', coalesce(v_kind, '<null>') USING ERRCODE = '22023';
END;
$function$;

INSERT INTO platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers)
VALUES
  (
    'platform', '__list_counts_conformance_units', '', ARRAY[]::oid[],
    'No entity identity is accepted. The function returns only the bounded service conformance sample manifest; it does not return application rows.',
    'list_counts_conformance_bounded_probes.sql',
    'server_only: the frontend CI database guard calls this manifest with the service role before running every bounded list-count conformance probe; no browser or signed-in client calls it.',
    false, false
  ),
  (
    'platform', '__list_counts_conformance_family_units', 'p_unit jsonb', ARRAY['jsonb'::regtype]::oid[],
    'p_unit is a closed-registry family sample from the service manifest. The function runs only that counts function and returns its non-platform lane names as bounded comparison units.',
    'list_counts_conformance_bounded_probes.sql',
    'server_only: the frontend CI database guard expands each service-generated family unit before comparing its lanes one at a time; no browser or signed-in client calls it.',
    false, false
  ),
  (
    'platform', '__list_counts_conformance_probe', 'p_unit jsonb', ARRAY['jsonb'::regtype]::oid[],
    'p_unit is one server-generated conformance sample. Family names are matched against a closed registry; UUID fields select only the synthetic caller and organization whose counts or team behavior the service guard compares.',
    'list_counts_conformance_bounded_probes.sql',
    'server_only: the frontend CI database guard calls each unit with the service role and aggregates all seven checks; no browser or signed-in client calls it or receives sampled identities.',
    false, false
  )
ON CONFLICT (schema_name, function_name, identity_argtypes) DO UPDATE SET
  identity_args = EXCLUDED.identity_args,
  reason = EXCLUDED.reason,
  declared_by = EXCLUDED.declared_by,
  non_client_lane = EXCLUDED.non_client_lane,
  signed_in_callers = false,
  anonymous_callers = false;

REVOKE ALL ON FUNCTION platform.__list_counts_conformance_units() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION platform.__list_counts_conformance_family_units(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION platform.__list_counts_conformance_probe(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION platform.__list_counts_conformance_units() TO service_role;
GRANT EXECUTE ON FUNCTION platform.__list_counts_conformance_family_units(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION platform.__list_counts_conformance_probe(jsonb) TO service_role;

COMMENT ON FUNCTION platform.__list_counts_conformance_units() IS
  'Service-only manifest of bounded units covering every sample in __list_counts_conformance.';
COMMENT ON FUNCTION platform.__list_counts_conformance_family_units(jsonb) IS
  'Expands one closed-registry family sample into its non-platform lane comparisons.';
COMMENT ON FUNCTION platform.__list_counts_conformance_probe(jsonb) IS
  'Runs one bounded list-count conformance unit; the frontend guard aggregates every manifest unit.';
