-- chair-step: the inverse of migrations/campaign/20261021270100_accessbatchagree_b_app_log_is_found_by_who_made_it.sql (lane ACCESS-BATCH-AGREE) - drops the one index it built, concurrently. Nothing of anybody's data is touched.
-- AUTOCOMMIT FILE: DROP INDEX CONCURRENTLY cannot run inside a transaction; apply statement by statement.

drop index concurrently if exists ops.app_log_created_by_created_at_idx;
