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

DROP INDEX CONCURRENTLY IF EXISTS billing.plan_one_default_idx;

ALTER INDEX billing.plan_one_default_live_v2
  RENAME TO plan_one_default_idx;

COMMENT ON INDEX billing.plan_one_default_idx IS
  'One live default billing plan. Archived plans release the default slot (soft-delete unique ruling, 2026-10-14).';
