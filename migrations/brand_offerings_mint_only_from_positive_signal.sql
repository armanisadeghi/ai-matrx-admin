-- A brand offering is minted only from a POSITIVE signal that belongs to THIS
-- brand. (Defect found 2026-10-17: datadestruction.com, a hard-drive shredder,
-- carried "platelet rich plasma", "androgenetic alopecia", "knee
-- osteoarthritis" and "Cosmetic Injectables".)
--
-- Provenance of those rows: created 2026-08-26 02:38:38 by the brand-offerings
-- cutover (metadata.migrated_from = 'seo.topic'), copied from the global topic
-- tree. The site valuer (sitevalue-v1, 2026-08-08) had written
-- seo.site_topic_value rows for the site on those medical topics with
-- offering_match = 'not_offered', weight 0, "Medical condition completely
-- unrelated to ITAD services" -- because the platform-wide (system tier)
-- keyword placements put keywords in the site's search data on them.
-- seo.fn_reconcile_site_offering_facts then treated EVERY worth row and EVERY
-- winning keyword placement on the ladder -- including the system and
-- organization tiers nobody at this brand made -- as "the site exposes this
-- offering" and minted a brand offering for it. A ruling that said
-- "we do NOT offer this" became an offering.
--
-- The class, fixed here at every writer that copies a topic into a brand:
-- 1. seo.gsc_set_topic_value: a not_offered or cleared ruling never adopts;
--    it lands only on an offering the brand already has.
-- 2. seo.fn_reconcile_site_offering_facts mints only from (a) this site's or
--    this brand's own keyword placements and (b) worth rows that are not
--    not_offered, plus their ancestors; a system/organization-tier placement
--    maps only onto an offering the brand already has.
-- 3. The same reconcile never re-mints an offering the brand already has in ANY
--    state: a soft-deleted (retracted) offering stays retracted.
--
-- Guard: seo.__offering_mint_conformance() via
-- scripts/check-offering-mint-sources.ts. RED on the pre-fix bodies
-- (2026-10-21: 5 failing checks), GREEN after this file.

-- 1. ---------------------------------------------------------------------------
DO $do$
DECLARE d text; n integer;
  c_old CONSTANT text := E'  IF v_node_type IN (''product'', ''service'') THEN\n    v_offering := seo.fn_site_offering_for_topic(p_site_id, p_topic_id);\n';
  c_new CONSTANT text := E'  IF v_node_type IN (''product'', ''service'') THEN\n'
    || E'    -- A ruling that says "not offered", or a cleared ruling, never ADOPTS the\n'
    || E'    -- offering into the brand: it lands only on an offering the brand already has.\n'
    || E'    IF p_clear OR p_offering_match = ''not_offered'' THEN\n'
    || E'      SELECT bo.id INTO v_offering\n'
    || E'      FROM web.site s\n'
    || E'      JOIN web.brand_offering bo ON bo.brand_id = s.brand_id AND bo.deleted_at IS NULL\n'
    || E'       AND (bo.template_id = p_topic_id OR (bo.template_id IS NULL AND bo.metadata->>''source_topic_id'' = p_topic_id::text))\n'
    || E'      WHERE s.id = p_site_id\n'
    || E'      ORDER BY (bo.template_id IS NULL), bo.created_at\n'
    || E'      LIMIT 1;\n'
    || E'    ELSE\n'
    || E'      v_offering := seo.fn_site_offering_for_topic(p_site_id, p_topic_id);\n'
    || E'    END IF;\n'
    || E'  END IF;\n'
    || E'  IF v_offering IS NOT NULL THEN\n';
BEGIN
  d := pg_get_functiondef('seo.gsc_set_topic_value(uuid, uuid, numeric, text, text, text, boolean)'::regprocedure);
  IF position('never ADOPTS the' in d) > 0 THEN RETURN; END IF;  -- already applied
  n := (length(d) - length(replace(d, c_old, ''))) / length(c_old);
  IF n <> 1 THEN RAISE EXCEPTION 'gsc_set_topic_value anchor matched % times', n; END IF;
  EXECUTE replace(d, c_old, c_new);
END
$do$;

-- 2 + 3. -----------------------------------------------------------------------
DO $do$
DECLARE d text; n integer;
  c_old1 CONSTANT text := E'    WHERE stv.site_id = v_site.id AND stv.deleted_at IS NULL\n  ), closure AS (';
  c_new1 CONSTANT text := E'    WHERE stv.site_id = v_site.id AND stv.deleted_at IS NULL\n'
    || E'      AND stv.offering_match IS DISTINCT FROM ''not_offered''\n  ), closure AS (';
  c_old2 CONSTANT text := E'  WHERE NOT EXISTS (\n    SELECT 1 FROM web.brand_offering x\n    WHERE x.brand_id = v_site.brand_id AND x.deleted_at IS NULL\n      AND (x.template_id = t.id OR (x.template_id IS NULL AND x.metadata->>''source_topic_id'' = t.id::text))\n  );';
  c_new2 CONSTANT text := E'  -- Never re-mint an offering the brand has in ANY state: a retracted\n'
    || E'  -- (soft-deleted) offering stays retracted.\n'
    || E'  WHERE NOT EXISTS (\n    SELECT 1 FROM web.brand_offering x\n    WHERE x.brand_id = v_site.brand_id\n'
    || E'      AND (x.template_id = t.id OR (x.template_id IS NULL AND x.metadata->>''source_topic_id'' = t.id::text))\n  )\n'
    || E'  -- Mint only from THIS brand''s own signals: a site or brand placement, or\n'
    || E'  -- a worth row that is not "not offered", and their ancestors. A system or\n'
    || E'  -- organization placement only maps onto an offering the brand already has.\n'
    || E'  AND EXISTS (\n'
    || E'    WITH RECURSIVE own AS (\n'
    || E'      SELECT w.topic_id FROM _rso_winner w WHERE w.scope_tier IN (''site'', ''brand'')\n'
    || E'      UNION\n'
    || E'      SELECT stv.topic_id FROM seo.site_topic_value stv\n'
    || E'      WHERE stv.site_id = v_site.id AND stv.deleted_at IS NULL\n'
    || E'        AND stv.offering_match IS DISTINCT FROM ''not_offered''\n'
    || E'      UNION\n'
    || E'      SELECT p.parent_id FROM own o JOIN seo.topic p ON p.id = o.topic_id WHERE p.parent_id IS NOT NULL\n'
    || E'    )\n'
    || E'    SELECT 1 FROM own WHERE own.topic_id = t.id\n'
    || E'  );';
BEGIN
  d := pg_get_functiondef('seo.fn_reconcile_site_offering_facts(uuid)'::regprocedure);
  IF position('stays retracted' in d) > 0 THEN RETURN; END IF;  -- already applied
  n := (length(d) - length(replace(d, c_old1, ''))) / length(c_old1);
  IF n <> 1 THEN RAISE EXCEPTION 'reconcile anchor 1 matched % times', n; END IF;
  n := (length(d) - length(replace(d, c_old2, ''))) / length(c_old2);
  IF n <> 1 THEN RAISE EXCEPTION 'reconcile anchor 2 matched % times', n; END IF;
  EXECUTE replace(replace(d, c_old1, c_new1), c_old2, c_new2);
END
$do$;

-- The reconcile predates the door register; declare it now that it is replaced.
INSERT INTO platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
SELECT 'seo', 'fn_reconcile_site_offering_facts', 'p_site_id uuid', ARRAY['uuid'::regtype]::oid[],
       'p_site_id: a live web.site with a brand, else a notice and zero counts (NULL finds no site and is skipped the same way)',
       'brand_offerings_mint_only_from_positive_signal',
       'server_only: service_role alone holds EXECUTE; only cutover migrations and the mint conformance probe call it, never a client',
       false, false
WHERE NOT EXISTS (SELECT 1 FROM platform.client_callable_door d
                  WHERE d.schema_name = 'seo' AND d.function_name = 'fn_reconcile_site_offering_facts');

-- 4. The guard ---------------------------------------------------------------
-- Offering mint sources conformance: a brand offering is only ever minted from a
-- POSITIVE signal that belongs to THIS brand. Plants on a real site, reads back,
-- and rolls every row back by raising a private error it catches.
CREATE OR REPLACE FUNCTION seo.__offering_mint_conformance()
RETURNS TABLE(check_key text, ok boolean, severity text, detail jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'seo', 'web', 'iam', 'pg_temp'
AS $function$
DECLARE
  c_org_sys CONSTANT uuid := '39c38960-d30c-4840-b0c1-c9960de95582';
  c_marker  CONSTANT text := '__offering_mint_probe';
  v_admin uuid;
  v_site  uuid;
  v_brand uuid;
  v_org   uuid;
  v_t     uuid[];
  v_kw    uuid;
  v_phrase text := c_marker || '_' || replace(gen_random_uuid()::text, '-', '');
  v_fixtures boolean := false;
  v_error text;
  r_not_offered_rpc boolean;
  r_cleared_rpc boolean;
  r_positive_rpc boolean;
  r_not_offered_reconcile boolean;
  r_retracted_reconcile boolean;
  r_foreign_tier_reconcile boolean;
  r_planted integer := 0;
  v_residue integer := 0;
BEGIN
  SELECT cua.user_id INTO v_admin
    FROM public.current_user_is_admin cua LEFT JOIN auth.users u ON u.id = cua.user_id
   WHERE cua.is_admin IS TRUE
   ORDER BY (u.email = 'admin@admin.com') DESC NULLS LAST, cua.user_id LIMIT 1;

  -- A live site with a live brand; the admin's own test brand first.
  SELECT s.id, s.brand_id, s.organization_id INTO v_site, v_brand, v_org
    FROM web.site s JOIN web.brand b ON b.id = s.brand_id AND b.deleted_at IS NULL
    LEFT JOIN auth.users u ON u.id = b.created_by
   WHERE s.deleted_at IS NULL
     AND EXISTS (SELECT 1 FROM seo.topical_map m WHERE m.brand_id = s.brand_id AND m.deleted_at IS NULL)
   ORDER BY (u.email = 'admin@admin.com') DESC NULLS LAST, s.id LIMIT 1;

  -- Six live product/service topics this brand has never adopted and this site
  -- has never valued, so every read below starts from "no offering".
  SELECT array_agg(x.id ORDER BY x.id) INTO v_t FROM (
    SELECT t.id FROM seo.topic t
     WHERE t.deleted_at IS NULL AND t.node_type IN ('product', 'service') AND t.parent_id IS NULL
       AND EXISTS (SELECT 1 FROM web.offering_template ot WHERE ot.id = t.id AND ot.deleted_at IS NULL)
       AND NOT EXISTS (SELECT 1 FROM web.brand_offering bo WHERE bo.brand_id = v_brand
                        AND (bo.template_id = t.id OR bo.metadata->>'source_topic_id' = t.id::text))
       AND NOT EXISTS (SELECT 1 FROM seo.site_topic_value stv WHERE stv.site_id = v_site AND stv.topic_id = t.id)
     ORDER BY t.id LIMIT 6) x;

  v_fixtures := v_admin IS NOT NULL AND v_site IS NOT NULL AND coalesce(array_length(v_t, 1), 0) = 6;

  IF v_fixtures THEN
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);

      -- (1) a person/agent valuation that says "we do NOT offer this".
      PERFORM seo.gsc_set_topic_value(v_site, v_t[1], 0, 'negative_value', 'not_offered', c_marker, false);
      -- (2) a cleared valuation.
      PERFORM seo.gsc_set_topic_value(v_site, v_t[2], NULL, NULL, NULL, c_marker, true);
      -- (3) FALSIFIABILITY: a positive valuation still adopts the offering.
      PERFORM seo.gsc_set_topic_value(v_site, v_t[3], 80, 'high_value', 'core_offering', c_marker, false);

      -- (4) the reconcile over a not_offered worth row.
      INSERT INTO seo.site_topic_value (organization_id, site_id, topic_id, weight, offering_match, lead_quality, notes)
      VALUES (v_org, v_site, v_t[4], 0, 'not_offered', 'negative_value', c_marker);
      -- (5) a retracted (soft-deleted) offering with a positive worth row behind it.
      INSERT INTO web.brand_offering (organization_id, brand_id, template_id, name, slug, kind, status, metadata, deleted_at)
      SELECT v_org, v_brand, t.id, t.name, c_marker || '-' || left(t.id::text, 8), t.node_type, 'active',
             jsonb_build_object('migrated_from', 'seo.topic', 'source_topic_id', t.id, 'probe', c_marker), now()
        FROM seo.topic t WHERE t.id = v_t[5];
      INSERT INTO seo.site_topic_value (organization_id, site_id, topic_id, weight, offering_match, lead_quality, notes)
      VALUES (v_org, v_site, v_t[5], 80, 'core_offering', 'high_value', c_marker);
      -- (6) a keyword in this site's corpus that only the PLATFORM placed on an offering.
      INSERT INTO seo.keyword (organization_id, phrase, normalized_phrase, language)
      VALUES (c_org_sys, v_phrase, v_phrase, 'en') RETURNING id INTO v_kw;
      INSERT INTO seo.site_keyword_value (organization_id, site_id, keyword_id, notes)
      VALUES (v_org, v_site, v_kw, c_marker);
      INSERT INTO seo.keyword_topic (organization_id, keyword_id, topic_id, is_primary, scope_tier, assigned_by, confidence)
      VALUES (c_org_sys, v_kw, v_t[6], true, 'system', c_marker, 50);

      PERFORM seo.fn_reconcile_site_offering_facts(v_site);

      SELECT count(*) INTO r_planted FROM seo.site_topic_value stv WHERE stv.site_id = v_site AND stv.notes = c_marker;

      r_not_offered_rpc := NOT EXISTS (SELECT 1 FROM web.brand_offering bo WHERE bo.brand_id = v_brand AND bo.deleted_at IS NULL
                                        AND (bo.template_id = v_t[1] OR bo.metadata->>'source_topic_id' = v_t[1]::text));
      r_cleared_rpc := NOT EXISTS (SELECT 1 FROM web.brand_offering bo WHERE bo.brand_id = v_brand AND bo.deleted_at IS NULL
                                    AND (bo.template_id = v_t[2] OR bo.metadata->>'source_topic_id' = v_t[2]::text));
      r_positive_rpc := EXISTS (SELECT 1 FROM web.brand_offering bo WHERE bo.brand_id = v_brand AND bo.deleted_at IS NULL
                                 AND (bo.template_id = v_t[3] OR bo.metadata->>'source_topic_id' = v_t[3]::text));
      r_not_offered_reconcile := NOT EXISTS (SELECT 1 FROM web.brand_offering bo WHERE bo.brand_id = v_brand AND bo.deleted_at IS NULL
                                    AND (bo.template_id = v_t[4] OR bo.metadata->>'source_topic_id' = v_t[4]::text));
      r_retracted_reconcile := NOT EXISTS (SELECT 1 FROM web.brand_offering bo WHERE bo.brand_id = v_brand AND bo.deleted_at IS NULL
                                    AND (bo.template_id = v_t[5] OR bo.metadata->>'source_topic_id' = v_t[5]::text));
      r_foreign_tier_reconcile := NOT EXISTS (SELECT 1 FROM web.brand_offering bo WHERE bo.brand_id = v_brand AND bo.deleted_at IS NULL
                                    AND (bo.template_id = v_t[6] OR bo.metadata->>'source_topic_id' = v_t[6]::text));

      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = c_marker;
    EXCEPTION WHEN OTHERS THEN
      v_error := SQLERRM;
    END;
  END IF;

  SELECT count(*) INTO v_residue FROM seo.keyword k WHERE k.phrase LIKE c_marker || '%';
  SELECT v_residue + count(*) INTO v_residue FROM seo.site_topic_value stv WHERE stv.notes = c_marker;
  SELECT v_residue + count(*) INTO v_residue FROM web.brand_offering bo WHERE bo.metadata->>'probe' = c_marker;

  RETURN QUERY VALUES
    ('probe_fixtures_available', v_fixtures, 'error',
      jsonb_build_object('why', 'needs a platform admin, a live branded site and six unadopted offering topics',
                         'site', v_site, 'topics', coalesce(array_length(v_t, 1), 0))),
    ('probe_ran_clean', v_error = c_marker, 'error', jsonb_build_object('error', v_error)),
    ('probe_planted_valuations', coalesce(r_planted, 0) >= 3, 'error', jsonb_build_object('planted', r_planted)),
    ('not_offered_valuation_never_mints', coalesce(r_not_offered_rpc, false), 'error',
      jsonb_build_object('why', 'seo.gsc_set_topic_value with offering_match = not_offered adopted the offering into the brand')),
    ('cleared_valuation_never_mints', coalesce(r_cleared_rpc, false), 'error',
      jsonb_build_object('why', 'seo.gsc_set_topic_value with p_clear adopted the offering into the brand')),
    ('positive_valuation_still_adopts', coalesce(r_positive_rpc, false), 'error',
      jsonb_build_object('why', 'a core_offering valuation by a person must still adopt the offering')),
    ('reconcile_never_mints_from_not_offered', coalesce(r_not_offered_reconcile, false), 'error',
      jsonb_build_object('why', 'fn_reconcile_site_offering_facts minted an offering from a not_offered worth row (datadestruction.com got PRP/alopecia this way)')),
    ('reconcile_never_resurrects_retracted', coalesce(r_retracted_reconcile, false), 'error',
      jsonb_build_object('why', 'fn_reconcile_site_offering_facts re-minted an offering someone soft-deleted')),
    ('reconcile_never_mints_from_foreign_tier', coalesce(r_foreign_tier_reconcile, false), 'error',
      jsonb_build_object('why', 'fn_reconcile_site_offering_facts minted an offering from a system/organization-tier keyword placement nobody at this brand made')),
    ('probe_left_no_residue', v_residue = 0, 'error', jsonb_build_object('residue', v_residue));
END;
$function$;

REVOKE ALL ON FUNCTION seo.__offering_mint_conformance() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION seo.__offering_mint_conformance() TO service_role;
COMMENT ON FUNCTION seo.__offering_mint_conformance() IS
  'Guard (scripts/check-offering-mint-sources.ts): a brand offering is minted only from a positive signal of THIS brand. Plants and rolls back.';

INSERT INTO platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
SELECT 'seo', '__offering_mint_conformance', '', ARRAY[]::oid[],
       'no arguments: plants its own fixtures on one live branded site and rolls every row back',
       'brand_offerings_mint_only_from_positive_signal',
       'server_only: the release gate scripts/check-offering-mint-sources.ts calls it with the service key; no client ever does',
       false, false
WHERE NOT EXISTS (SELECT 1 FROM platform.client_callable_door d
                  WHERE d.schema_name = 'seo' AND d.function_name = '__offering_mint_conformance');
