-- draft: db_contract_triage split each family count observation from its list comparison before production review
-- based-on: platform.__list_counts_conformance_family_units(jsonb) fefb649cbd8cd3e03af808ae45dc06e370b5493a0e8030f8357991f103863ed6
-- based-on: platform.__list_counts_conformance_probe(jsonb) 7217d18b22b73afe5f55045e6b9ce932af1fee18ce4ba6238d6876c5613be004
-- The family expansion already executes the complete counts function to discover its lanes. Carry that
-- exact execution's lane totals into the service-only probe units so each later probe runs only the list
-- side and compares it. Every manifest sample and lane remains covered, and malformed units fail closed.

CREATE OR REPLACE FUNCTION platform.__list_counts_conformance_family_units(p_unit jsonb)
RETURNS TABLE(unit jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_claims text := current_setting('request.jwt.claims', true);
  v_family text := p_unit ->> 'family';
  v_uid uuid := (p_unit ->> 'uid')::uuid;
  v_search text := p_unit ->> 'search';
  v_counts_sql text;
  v_lanes jsonb;
  v_lane jsonb;
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
  EXECUTE 'SELECT coalesce(jsonb_agg(jsonb_build_object(''lane'', z.scope, ''count'', z.lane_total, ''option_total'', z.option_total) ORDER BY z.scope), ''[]''::jsonb)'
       || ' FROM (SELECT c.scope, max(c.total) FILTER (WHERE c.narrow_id IS NULL) AS lane_total,'
       || ' sum(c.total) FILTER (WHERE c.narrow_id IS NOT NULL AND c.scope = ''orgs'') AS option_total'
       || ' FROM (' || v_counts_sql || ') AS c WHERE c.scope NOT LIKE ''platform%'' GROUP BY c.scope'
       || ' HAVING max(c.total) FILTER (WHERE c.narrow_id IS NULL) IS NOT NULL) AS z'
    INTO v_lanes;
  FOR v_lane IN SELECT value FROM jsonb_array_elements(v_lanes)
  LOOP
    unit := p_unit || jsonb_build_object('kind', 'family_lane') || v_lane;
    RETURN NEXT;
  END LOOP;
  IF jsonb_array_length(v_lanes) = 0 THEN
    unit := p_unit || jsonb_build_object('kind', 'family_lane', 'empty', true);
    RETURN NEXT;
  END IF;
  PERFORM set_config('request.jwt.claims', coalesce(v_claims, ''), true);
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
    detail := jsonb_build_object('why', 'A SECURITY DEFINER counts function counts rows the invoker list hides from the person: the count must run as the caller, under the same row security as the list.', 'checked', v_checked, 'offenders', v_bad);
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
    detail := jsonb_build_object('why', 'Add the family to v_registry in public.__list_counts_conformance() so its lane totals are compared with its list.', 'checked', v_checked, 'unregistered', v_bad);
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
      detail := jsonb_build_object('why', 'Every lane total a counts function returns equals the total its list returns for the same search and filters (runs as the server, so it proves the two code paths agree; the definer check above proves they run as the same person).', 'lane_totals_compared', 0, 'mismatches', '[]'::jsonb, 'no_list_twin_not_compared', '[]'::jsonb);
      RETURN NEXT; RETURN;
    END IF;
    v_uid := (p_unit ->> 'uid')::uuid;
    v_family := p_unit ->> 'family';
    v_search := p_unit ->> 'search';
    v_lane := p_unit ->> 'lane';
    IF NOT p_unit ? 'lane' OR jsonb_typeof(p_unit -> 'lane') <> 'string'
       OR NOT p_unit ? 'count' OR jsonb_typeof(p_unit -> 'count') <> 'number'
       OR (p_unit ? 'option_total' AND jsonb_typeof(p_unit -> 'option_total') NOT IN ('number', 'null')) THEN
      RAISE EXCEPTION 'family-lane unit requires lane text, count number, and optional option_total number' USING ERRCODE = '22023';
    END IF;
    v_count := (p_unit ->> 'count')::bigint;
    v_option_total := CASE WHEN jsonb_typeof(p_unit -> 'option_total') = 'number' THEN (p_unit ->> 'option_total')::bigint ELSE NULL END;
    SELECT k[3] INTO v_ls
      FROM (SELECT ARRAY[v_registry[i][1], v_registry[i][2], v_registry[i][3]] AS k FROM generate_subscripts(v_registry, 1) AS i) AS z
     WHERE k[1] = v_family;
    IF v_ls IS NULL THEN RAISE EXCEPTION 'unknown list-count family %', v_family USING ERRCODE = '22023'; END IF;
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
    v_ls := replace(replace(v_ls, ':search', quote_nullable(v_search)), ':filters', quote_literal('{}') || '::jsonb');
    BEGIN
      EXECUTE format(v_ls, v_lane) INTO v_list;
      v_checked := 1;
      IF v_count IS DISTINCT FROM v_list THEN
        v_bad := v_bad || jsonb_build_object('family', v_family, 'user', v_uid, 'search', v_search, 'mismatches', jsonb_build_array(jsonb_build_object('lane', v_lane, 'count', v_count, 'listed', v_list)));
      END IF;
      IF v_lane = 'orgs' AND v_option_total IS NOT NULL AND v_option_total <> v_count THEN
        v_bad := v_bad || jsonb_build_object('family', v_family, 'user', v_uid, 'search', v_search, 'mismatches', jsonb_build_array(jsonb_build_object('lane', 'orgs', 'options_sum', v_option_total, 'lane_total', v_count)));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_bad := v_bad || jsonb_build_object('family', v_family, 'user', v_uid, 'search', v_search, 'error', SQLERRM);
    END;
    PERFORM set_config('request.jwt.claims', coalesce(v_claims, ''), true);
    check_key := 'counts_equal_list_every_family'; ok := jsonb_array_length(v_bad) = 0 AND v_checked > 0; severity := 'error';
    detail := jsonb_build_object(
      'why', 'Every lane total a counts function returns equals the total its list returns for the same search and filters (runs as the server, so it proves the two code paths agree; the definer check above proves they run as the same person).',
      'lane_totals_compared', v_checked, 'mismatches', v_bad,
      'no_list_twin_not_compared', (SELECT coalesce(jsonb_agg(p.proname), '[]'::jsonb) FROM pg_proc AS p WHERE p.pronamespace = 'public'::regnamespace AND p.proname ~ '(_list_counts|_scope_counts)$' AND NOT EXISTS (SELECT 1 FROM pg_proc AS p2 WHERE p2.pronamespace = p.pronamespace AND p2.proname = regexp_replace(p.proname, '_(list_)?(scope_)?counts$', '_list_scoped')))
    );
    RETURN NEXT; RETURN;
  END IF;

  IF v_kind = 'team_reach' THEN
    IF coalesce((p_unit ->> 'empty')::boolean, false) THEN
      check_key := 'team_reach_empty_without_team'; ok := false; severity := 'error';
      detail := jsonb_build_object('why', 'My team is empty for a person on no team in that organization (never a copy of Mine), and holds the person where they are on one.', 'checked', 0, 'offenders', '[]'::jsonb);
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
    detail := jsonb_build_object('why', 'My team is empty for a person on no team in that organization (never a copy of Mine), and holds the person where they are on one.', 'checked', v_checked, 'offenders', v_bad);
    RETURN NEXT; RETURN;
  END IF;

  IF v_kind = 'my_teams' THEN
    IF coalesce((p_unit ->> 'empty')::boolean, false) THEN
      check_key := 'my_teams_answers_every_person'; ok := false; severity := 'error';
      detail := jsonb_build_object('why', 'The My team tab reads public.my_teams: it must answer every person (all organizations, or one they are not in) and never refuse.', 'checked', 0, 'offenders', '[]'::jsonb);
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
    detail := jsonb_build_object('why', 'The My team tab reads public.my_teams: it must answer every person (all organizations, or one they are not in) and never refuse.', 'checked', v_checked, 'offenders', v_bad);
    RETURN NEXT; RETURN;
  END IF;

  RAISE EXCEPTION 'unknown list-count conformance unit kind %', coalesce(v_kind, '<null>') USING ERRCODE = '22023';
END;
$function$;
