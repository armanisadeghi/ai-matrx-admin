-- INVERSE of migrations/campaign/20261021110000_fixture_purge_a_a_fixture_purge_removes_immutable_rows.sql (lane FIXTURE-PURGE): restores the nine rule bodies, drops the helper.
-- chair-step: restores nine function bodies and drops one function.
set local lock_timeout = '3s';

DROP FUNCTION IF EXISTS iam.fixture_purge_allows(text, jsonb, jsonb);
