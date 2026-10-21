-- Canonical full bodies of the two offering-minting writers, as they run live
-- after brand_offerings_mint_only_from_positive_signal.sql (2026-10-21).
--
-- WHY: that migration patched the live functions by string replacement, so the
-- repo held no full body of either function and the "already applied" test was
-- a search for comment text. This file is the single canonical definition. Text
-- taken verbatim from pg_get_functiondef on production (brsgrqvjdzwihsvnfqkf),
-- so applying it to live is a no-op (md5 of both definitions unchanged; proof in
-- the 2026-10-21 polish report). On a database replayed from scratch it installs
-- the fixed bodies over the pre-fix ones from step6a/6b. CREATE OR REPLACE is
-- idempotent: there is no "already applied" check to go stale.
--
-- Guard: seo.__offering_mint_conformance() / pnpm check:offering-mint-sources:strict.
-- Sort order: this file runs after brand_offerings_mint_only_from_positive_signal.sql.
-- based-on: seo.fn_reconcile_site_offering_facts(uuid) ecef280fe454d07295c4ca15375614096acdcdaf1ad1f2ebfb05381b599b0301
-- based-on: seo.gsc_set_topic_value(uuid, uuid, numeric, text, text, text, boolean) 717e1efcb52e7314d050241504d1ed70ab5044a48e922137d1c0106acf7c9197

CREATE OR REPLACE FUNCTION seo.fn_reconcile_site_offering_facts(p_site_id uuid)
 RETURNS TABLE(site_id uuid, offerings_created bigint, availability_created bigint, placements_written bigint, placements_demoted bigint, worth_written bigint, worth_cleared bigint, placements_skipped_unavailable bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'seo', 'web', 'iam', 'platform', 'public', 'pg_temp'
AS $function$
#variable_conflict use_column
DECLARE
  v_site web.site%ROWTYPE;
  v_offerings bigint := 0;
  v_availability bigint := 0;
  v_written bigint := 0;
  v_demoted bigint := 0;
  v_worth bigint := 0;
  v_cleared bigint := 0;
  v_skipped bigint := 0;
  v_n bigint;
BEGIN
  SELECT * INTO v_site FROM web.site s WHERE s.id = p_site_id AND s.deleted_at IS NULL;
  IF NOT FOUND OR v_site.brand_id IS NULL THEN
    RAISE NOTICE 'offering reconcile skipped site %: no live site with a brand', p_site_id;
    RETURN QUERY SELECT p_site_id, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  DROP TABLE IF EXISTS _rso_winner;
  DROP TABLE IF EXISTS _rso_selected;
  DROP TABLE IF EXISTS _rso_map;

  -- The site's own answer for every keyword in its corpus: THE ONE LADDER
  -- (site > brand > organization > system, nearest wins, primary rows only),
  -- kept only when the winning topic is an offering.
  CREATE TEMP TABLE _rso_winner ON COMMIT DROP AS
  WITH corpus AS (
    SELECT spd.keyword_id AS kw FROM seo.search_performance_daily spd
    WHERE spd.site_id = v_site.id AND spd.keyword_id IS NOT NULL
    UNION
    SELECT skv.keyword_id FROM seo.site_keyword_value skv
    WHERE skv.site_id = v_site.id AND skv.deleted_at IS NULL AND skv.keyword_id IS NOT NULL
    UNION
    SELECT kt.keyword_id FROM seo.keyword_topic kt
    WHERE kt.scope_tier = 'site' AND kt.scope_site_id = v_site.id AND kt.deleted_at IS NULL
  ), ladder AS (
    SELECT DISTINCT ON (kt.keyword_id)
      kt.keyword_id, kt.topic_id, kt.id AS kt_id, kt.scope_tier, kt.confidence,
      kt.assigned_by, kt.notes, kt.metadata, kt.created_by, kt.updated_by
    FROM corpus c
    JOIN seo.keyword_topic kt ON kt.keyword_id = c.kw AND kt.is_primary AND kt.deleted_at IS NULL
    WHERE (kt.scope_tier = 'site' AND kt.scope_site_id = v_site.id)
       OR (kt.scope_tier = 'brand' AND kt.scope_brand_id = v_site.brand_id)
       OR (kt.scope_tier = 'organization' AND kt.organization_id = v_site.organization_id)
       OR kt.scope_tier = 'system'
    ORDER BY kt.keyword_id,
             CASE kt.scope_tier WHEN 'site' THEN 0 WHEN 'brand' THEN 1 WHEN 'organization' THEN 2 ELSE 3 END,
             kt.updated_at DESC, kt.id
  )
  SELECT l.* FROM ladder l
  JOIN seo.topic t ON t.id = l.topic_id AND t.deleted_at IS NULL AND t.node_type IN ('product', 'service');

  -- What the site exposes: its placed offerings, the offerings it has put a
  -- worth on, and the offering ancestors that keep that hierarchy whole.
  CREATE TEMP TABLE _rso_selected ON COMMIT DROP AS
  WITH RECURSIVE direct AS (
    SELECT DISTINCT w.topic_id FROM _rso_winner w
    UNION
    SELECT stv.topic_id FROM seo.site_topic_value stv
    JOIN seo.topic t ON t.id = stv.topic_id AND t.deleted_at IS NULL AND t.node_type IN ('product', 'service')
    WHERE stv.site_id = v_site.id AND stv.deleted_at IS NULL
      AND stv.offering_match IS DISTINCT FROM 'not_offered'
  ), closure AS (
    SELECT d.topic_id FROM direct d
    UNION
    SELECT p.id FROM closure c
    JOIN seo.topic child ON child.id = c.topic_id
    JOIN seo.topic p ON p.id = child.parent_id AND p.deleted_at IS NULL AND p.node_type IN ('product', 'service')
  )
  SELECT DISTINCT c.topic_id FROM closure c;

  -- Mint the brand offerings that do not exist yet (copy-on-adopt, provenance
  -- stamped). A slug the brand already uses for a different offering gets the
  -- topic id appended rather than silently merging two offerings.
  INSERT INTO web.brand_offering AS bo (
    organization_id, brand_id, template_id, name, slug, kind, description,
    status, adopted_at, sort, metadata, created_by, updated_by
  )
  SELECT v_site.organization_id, v_site.brand_id, ot.id, t.name,
         CASE WHEN EXISTS (
                SELECT 1 FROM web.brand_offering x
                WHERE x.brand_id = v_site.brand_id AND x.slug = t.slug AND x.deleted_at IS NULL)
              THEN t.slug || '-' || left(t.id::text, 8) ELSE t.slug END,
         t.node_type, t.description, 'active', now(),
         COALESCE((t.metadata->>'sort')::integer, 0),
         jsonb_build_object('migrated_from', 'seo.topic', 'source_topic_id', t.id,
                            'reconciled_at', now()),
         t.created_by, t.updated_by
  FROM _rso_selected s
  JOIN seo.topic t ON t.id = s.topic_id
  LEFT JOIN web.offering_template ot ON ot.id = t.id AND ot.deleted_at IS NULL
  -- Never re-mint an offering the brand has in ANY state: a retracted
  -- (soft-deleted) offering stays retracted.
  WHERE NOT EXISTS (
    SELECT 1 FROM web.brand_offering x
    WHERE x.brand_id = v_site.brand_id
      AND (x.template_id = t.id OR (x.template_id IS NULL AND x.metadata->>'source_topic_id' = t.id::text))
  )
  -- Mint only from THIS brand's own signals: a site or brand placement, or
  -- a worth row that is not "not offered", and their ancestors. A system or
  -- organization placement only maps onto an offering the brand already has.
  AND EXISTS (
    WITH RECURSIVE own AS (
      SELECT w.topic_id FROM _rso_winner w WHERE w.scope_tier IN ('site', 'brand')
      UNION
      SELECT stv.topic_id FROM seo.site_topic_value stv
      WHERE stv.site_id = v_site.id AND stv.deleted_at IS NULL
        AND stv.offering_match IS DISTINCT FROM 'not_offered'
      UNION
      SELECT p.parent_id FROM own o JOIN seo.topic p ON p.id = o.topic_id WHERE p.parent_id IS NOT NULL
    )
    SELECT 1 FROM own WHERE own.topic_id = t.id
  );
  GET DIAGNOSTICS v_offerings = ROW_COUNT;

  CREATE TEMP TABLE _rso_map ON COMMIT DROP AS
  SELECT DISTINCT ON (t.id) t.id AS topic_id, bo.id AS brand_offering_id
  FROM seo.topic t
  JOIN web.brand_offering bo ON bo.brand_id = v_site.brand_id AND bo.deleted_at IS NULL
   AND (bo.template_id = t.id OR (bo.template_id IS NULL AND bo.metadata->>'source_topic_id' = t.id::text))
  WHERE t.id IN (SELECT topic_id FROM _rso_selected)
  ORDER BY t.id, (bo.template_id IS NULL), bo.created_at;

  -- Keep the brand hierarchy aligned with the source hierarchy for offerings
  -- this reconcile created (an existing brand offering's parent is the brand's
  -- own decision and is never moved from here).
  UPDATE web.brand_offering child
  SET parent_id = pm.brand_offering_id
  FROM _rso_map cm
  JOIN seo.topic t ON t.id = cm.topic_id
  JOIN _rso_map pm ON pm.topic_id = t.parent_id
  WHERE child.id = cm.brand_offering_id
    AND child.parent_id IS NULL
    AND child.metadata ? 'reconciled_at'
    AND child.parent_id IS DISTINCT FROM pm.brand_offering_id;

  INSERT INTO web.site_offering (
    organization_id, site_id, brand_offering_id, status, metadata, created_by, updated_by
  )
  SELECT v_site.organization_id, v_site.id, m.brand_offering_id, 'active',
         jsonb_build_object('migrated_from', 'seo.topic', 'reconciled_at', now()),
         auth.uid(), auth.uid()
  FROM _rso_map m
  WHERE NOT EXISTS (
    SELECT 1 FROM web.site_offering so
    WHERE so.site_id = v_site.id AND so.brand_offering_id = m.brand_offering_id AND so.deleted_at IS NULL
  );
  GET DIAGNOSTICS v_availability = ROW_COUNT;

  -- A placement on an offering the site has deliberately switched off is not
  -- written and is counted, never forced.
  SELECT count(*) INTO v_skipped
  FROM _rso_winner w JOIN _rso_map m ON m.topic_id = w.topic_id
  WHERE EXISTS (
    SELECT 1 FROM web.site_offering so
    WHERE so.site_id = v_site.id AND so.brand_offering_id = m.brand_offering_id
      AND so.deleted_at IS NULL AND so.status <> 'active');

  -- Demote every primary placement the ladder no longer backs (another
  -- organization's ruling copied by the first backfill, or a placement since
  -- moved). Demoted, never deleted: the row and its history stay.
  UPDATE seo.site_keyword_offering sko
  SET is_primary = false,
      metadata = sko.metadata || jsonb_build_object(
        'reconciled_out_at', now(),
        'reconciled_out_reason', 'no in-scope placement on the site ladder backs this offering'),
      updated_at = now()
  WHERE sko.site_id = v_site.id AND sko.is_primary AND sko.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM _rso_winner w JOIN _rso_map m ON m.topic_id = w.topic_id
      WHERE w.keyword_id = sko.keyword_id AND m.brand_offering_id = sko.brand_offering_id);
  GET DIAGNOSTICS v_demoted = ROW_COUNT;

  INSERT INTO seo.site_keyword_offering AS sko (
    organization_id, site_id, keyword_id, brand_offering_id, is_primary,
    confidence, assigned_by, notes, metadata, created_by, updated_by
  )
  SELECT v_site.organization_id, v_site.id, w.keyword_id, m.brand_offering_id, true,
         w.confidence, w.assigned_by, w.notes,
         COALESCE(w.metadata, '{}'::jsonb) || jsonb_build_object(
           'migrated_from', 'seo.keyword_topic', 'source_keyword_topic_id', w.kt_id,
           'source_scope_tier', w.scope_tier, 'reconciled_at', now()),
         w.created_by, w.updated_by
  FROM _rso_winner w
  JOIN _rso_map m ON m.topic_id = w.topic_id
  WHERE NOT EXISTS (
    SELECT 1 FROM web.site_offering so
    WHERE so.site_id = v_site.id AND so.brand_offering_id = m.brand_offering_id
      AND so.deleted_at IS NULL AND so.status <> 'active')
  ON CONFLICT (site_id, keyword_id, brand_offering_id) WHERE deleted_at IS NULL
  DO UPDATE SET
    is_primary = true,
    confidence = EXCLUDED.confidence,
    assigned_by = EXCLUDED.assigned_by,
    notes = EXCLUDED.notes,
    metadata = sko.metadata || EXCLUDED.metadata,
    updated_at = now()
  WHERE NOT sko.is_primary
     OR sko.confidence IS DISTINCT FROM EXCLUDED.confidence
     OR sko.assigned_by IS DISTINCT FROM EXCLUDED.assigned_by
     OR sko.notes IS DISTINCT FROM EXCLUDED.notes
     OR sko.metadata->'placement' IS DISTINCT FROM EXCLUDED.metadata->'placement';
  GET DIAGNOSTICS v_written = ROW_COUNT;

  -- Offering worth: the old row is still the writer of record until the worth
  -- writers move, so a newer old row wins and an older one never overwrites.
  INSERT INTO seo.site_offering_value AS sov (
    organization_id, site_id, brand_offering_id, offering_match, lead_quality,
    audience_fit, capacity_appetite, brand_fit, worth_points, notes, metadata,
    created_by, updated_by, created_at, updated_at
  )
  SELECT v_site.organization_id, v_site.id, m.brand_offering_id, stv.offering_match,
         stv.lead_quality, stv.audience_fit, stv.capacity_appetite, stv.brand_fit,
         COALESCE(stv.weight, 50), stv.notes,
         stv.metadata || jsonb_build_object(
           'migrated_from', 'seo.site_topic_value', 'source_site_topic_value_id', stv.id,
           'worth_points_from_resolver_default', stv.weight IS NULL, 'reconciled_at', now()),
         stv.created_by, stv.updated_by, stv.created_at, stv.updated_at
  FROM seo.site_topic_value stv
  JOIN _rso_map m ON m.topic_id = stv.topic_id
  WHERE stv.site_id = v_site.id AND stv.deleted_at IS NULL
  ON CONFLICT (site_id, brand_offering_id) WHERE deleted_at IS NULL
  DO UPDATE SET
    offering_match = EXCLUDED.offering_match,
    lead_quality = EXCLUDED.lead_quality,
    audience_fit = EXCLUDED.audience_fit,
    capacity_appetite = EXCLUDED.capacity_appetite,
    brand_fit = EXCLUDED.brand_fit,
    worth_points = EXCLUDED.worth_points,
    notes = EXCLUDED.notes,
    metadata = sov.metadata || EXCLUDED.metadata,
    updated_at = now()
  WHERE EXCLUDED.updated_at > sov.updated_at
    AND (sov.offering_match IS DISTINCT FROM EXCLUDED.offering_match
      OR sov.lead_quality IS DISTINCT FROM EXCLUDED.lead_quality
      OR sov.audience_fit IS DISTINCT FROM EXCLUDED.audience_fit
      OR sov.capacity_appetite IS DISTINCT FROM EXCLUDED.capacity_appetite
      OR sov.brand_fit IS DISTINCT FROM EXCLUDED.brand_fit
      OR sov.worth_points IS DISTINCT FROM EXCLUDED.worth_points
      OR sov.notes IS DISTINCT FROM EXCLUDED.notes);
  GET DIAGNOSTICS v_worth = ROW_COUNT;

  UPDATE seo.site_offering_value sov
  SET deleted_at = now(), updated_at = now(),
      metadata = sov.metadata || jsonb_build_object('reconciled_out_at', now(),
        'reconciled_out_reason', 'the source worth row was cleared')
  FROM _rso_map m
  WHERE sov.site_id = v_site.id AND sov.brand_offering_id = m.brand_offering_id
    AND sov.deleted_at IS NULL
    AND sov.metadata ? 'source_site_topic_value_id'
    AND NOT EXISTS (
      SELECT 1 FROM seo.site_topic_value stv
      WHERE stv.site_id = v_site.id AND stv.topic_id = m.topic_id AND stv.deleted_at IS NULL)
    AND EXISTS (
      SELECT 1 FROM seo.site_topic_value stv
      WHERE stv.site_id = v_site.id AND stv.topic_id = m.topic_id AND stv.deleted_at IS NOT NULL
        AND stv.updated_at > sov.updated_at);
  GET DIAGNOSTICS v_cleared = ROW_COUNT;

  RETURN QUERY SELECT v_site.id, v_offerings, v_availability, v_written, v_demoted,
                      v_worth, v_cleared, v_skipped;
END
$function$;

CREATE OR REPLACE FUNCTION seo.gsc_set_topic_value(p_site_id uuid, p_topic_id uuid, p_weight numeric DEFAULT NULL::numeric, p_lead_quality text DEFAULT NULL::text, p_offering_match text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_clear boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'seo', 'web', 'iam', 'platform', 'public', 'pg_temp'
AS $function$
DECLARE
  v_org uuid;
  v_id uuid;
  v_node_type text;
  v_offering uuid;
BEGIN
  PERFORM seo.gsc_assert_site_editor(p_site_id);

  SELECT t.node_type INTO v_node_type FROM seo.topic t WHERE t.id = p_topic_id AND t.deleted_at IS NULL;
  IF NOT FOUND THEN
    perform platform.refuse_not_found(format('seo_topic_not_found: no topic %s', p_topic_id));
  END IF;

  SELECT s.organization_id INTO v_org FROM web.site s WHERE s.id = p_site_id;

  IF NOT p_clear AND p_weight IS NOT NULL AND (p_weight < 0 OR p_weight > 100) THEN
    RAISE EXCEPTION 'seo_topic_weight_range: worth is 0–100, got %', p_weight;
  END IF;

  -- TRANSITION (brand-offerings cutover): offering worth is read from the
  -- canonical offering value and written through THE worth writer. A legacy
  -- call that leaves worth blank meant "50" to the resolver, so that is what
  -- is written, and the row says so.
  IF v_node_type IN ('product', 'service') THEN
    -- A ruling that says "not offered", or a cleared ruling, never ADOPTS the
    -- offering into the brand: it lands only on an offering the brand already has.
    IF p_clear OR p_offering_match = 'not_offered' THEN
      SELECT bo.id INTO v_offering
      FROM web.site s
      JOIN web.brand_offering bo ON bo.brand_id = s.brand_id AND bo.deleted_at IS NULL
       AND (bo.template_id = p_topic_id OR (bo.template_id IS NULL AND bo.metadata->>'source_topic_id' = p_topic_id::text))
      WHERE s.id = p_site_id
      ORDER BY (bo.template_id IS NULL), bo.created_at
      LIMIT 1;
    ELSE
      v_offering := seo.fn_site_offering_for_topic(p_site_id, p_topic_id);
    END IF;
  END IF;
  IF v_offering IS NOT NULL THEN
    PERFORM seo.write_site_offering_value(
      v_org, p_site_id, v_offering, COALESCE(p_weight, 50), p_lead_quality, p_offering_match,
      p_notes, p_clear, NULL, NULL, NULL,
      jsonb_build_object('written_through', 'seo.gsc_set_topic_value',
                         'worth_points_from_resolver_default', p_weight IS NULL));
  END IF;

  IF p_clear THEN
    UPDATE seo.site_topic_value
    SET deleted_at = now(), updated_at = now(), updated_by = (SELECT auth.uid())
    WHERE site_id = p_site_id AND topic_id = p_topic_id AND deleted_at IS NULL
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  INSERT INTO seo.site_topic_value AS stv
    (organization_id, created_by, site_id, topic_id, weight, lead_quality, offering_match, notes)
  VALUES
    (v_org, (SELECT auth.uid()), p_site_id, p_topic_id, p_weight,
     p_lead_quality, p_offering_match, NULLIF(btrim(COALESCE(p_notes, '')), ''))
  ON CONFLICT (site_id, topic_id) DO UPDATE SET
    weight = EXCLUDED.weight,
    lead_quality = EXCLUDED.lead_quality,
    offering_match = EXCLUDED.offering_match,
    notes = EXCLUDED.notes,
    deleted_at = NULL,
    updated_at = now(),
    updated_by = (SELECT auth.uid())
  RETURNING stv.id INTO v_id;

  RETURN v_id;
END;
$function$;
