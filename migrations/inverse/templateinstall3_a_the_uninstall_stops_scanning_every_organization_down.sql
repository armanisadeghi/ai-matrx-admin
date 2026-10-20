-- INVERSE of migrations/campaign/templateinstall3_a_the_uninstall_stops_scanning_every_organization.sql (lane TEMPLATE-INSTALL-3): drops the two indexes.
-- chair-step: drops two indexes.
-- lock: custom
set local lock_timeout = '3s';

DROP INDEX IF EXISTS custom.record_home_relation_idx;
DROP INDEX IF EXISTS platform.idx_assoc_target_relation_live;
