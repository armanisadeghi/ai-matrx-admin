-- chair-step: replace billing.plan's all-row default uniqueness with the approved live-row identity; the online replacement is built before the old index is removed
--
-- billing.plan_default is a reusable active key. The existing unique index has
-- `WHERE is_default`, so an archived default plan still holds the one-default
-- slot even though every plan resolver reads only `deleted_at IS NULL` rows.
-- Build the replacement first: interruption before the drop leaves the stricter
-- old index in place, and interruption after the drop leaves this valid temporary
-- index enforcing the intended live-row rule.
--
-- This file needs the aidream migration runner's dedicated autocommit lane because
-- PostgreSQL does not allow CREATE/DROP INDEX CONCURRENTLY inside a transaction.
-- The runner sets and verifies the bounded session timeouts before executing it.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM billing.plan
     WHERE is_default
       AND deleted_at IS NULL
     GROUP BY is_default
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'billing.plan has multiple live default plans; refusing index replacement';
  END IF;
END
$$;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS plan_one_default_live_v2
  ON billing.plan (is_default)
  WHERE is_default AND deleted_at IS NULL;

-- IF NOT EXISTS also accepts an INVALID leftover from an interrupted concurrent
-- build. Prove the temporary index is the exact enforcement we intend before
-- removing the old, stricter index. A failed proof leaves the old index intact.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_index AS x
      JOIN pg_catalog.pg_class AS i
        ON i.oid = x.indexrelid
      JOIN pg_catalog.pg_namespace AS n
        ON n.oid = i.relnamespace
     WHERE n.nspname = 'billing'
       AND i.relname = 'plan_one_default_live_v2'
       AND x.indrelid = 'billing.plan'::regclass
       AND x.indisvalid
       AND x.indisready
       AND x.indisunique
       AND x.indnkeyatts = 1
       AND x.indnatts = 1
       AND x.indkey[0] = (
         SELECT a.attnum
           FROM pg_catalog.pg_attribute AS a
          WHERE a.attrelid = 'billing.plan'::regclass
            AND a.attname = 'is_default'
            AND NOT a.attisdropped
       )
       AND lower(
         pg_catalog.regexp_replace(
           pg_catalog.pg_get_expr(x.indpred, x.indrelid, true),
           '[[:space:]()]',
           '',
           'g'
         )
       ) = 'is_defaultanddeleted_atisnull'
  ) THEN
    RAISE EXCEPTION
      'billing.plan_one_default_live_v2 is absent, invalid, not ready, or has the wrong unique key/predicate; refusing to drop billing.plan_one_default_idx';
  END IF;
END
$$;

DROP INDEX CONCURRENTLY IF EXISTS billing.plan_one_default_idx;

ALTER INDEX billing.plan_one_default_live_v2
  RENAME TO plan_one_default_idx;

COMMENT ON INDEX billing.plan_one_default_idx IS
  'One live default billing plan. Archived plans release the default slot (soft-delete unique ruling, 2026-10-14).';
