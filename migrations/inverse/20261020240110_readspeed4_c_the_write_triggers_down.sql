-- lane: READ-SPEED-4
-- window-class: drops the statement triggers READ-SPEED-4 c made (SHARE ROW EXCLUSIVE until commit)
-- brief-lock: the same triggers, rehearsed on the clone
-- Inverse of migrations/campaign/20261020240110_readspeed4_c_the_write_triggers.sql: writes stop marking kept values; nothing kept is served.
DROP TRIGGER IF EXISTS _g0_computed_stale_d ON custom.record;
DROP TRIGGER IF EXISTS zzzzzz_computed_stale_i ON custom.record;
DROP TRIGGER IF EXISTS zzzzzz_computed_stale_u ON custom.record;
DROP TRIGGER IF EXISTS zzzzzz_computed_stale_i ON platform.associations;
DROP TRIGGER IF EXISTS zzzzzz_computed_stale_u ON platform.associations;
DROP TRIGGER IF EXISTS zzzzzz_computed_stale_d ON platform.associations;
DROP TRIGGER IF EXISTS zzzzzz_access_version ON iam.permissions;
DROP TRIGGER IF EXISTS zzzzzz_access_version ON platform.entity_grants;
DROP TRIGGER IF EXISTS zzzzzz_access_version ON iam.memberships;
DROP TRIGGER IF EXISTS zzzzzz_access_version ON iam.membership_grant;
DROP TRIGGER IF EXISTS zzzzzz_access_version ON iam.team;
DROP TRIGGER IF EXISTS zzzzzz_access_version ON platform.share_links;
DROP TRIGGER IF EXISTS zzzzzz_access_version ON custom.portal;
DROP TRIGGER IF EXISTS zzzzzz_access_version ON custom.portal_principal;
DROP TRIGGER IF EXISTS zzzzzz_access_version ON custom.portal_table;
DROP TRIGGER IF EXISTS zzzzzz_access_version ON iam.access_setup;
DROP TRIGGER IF EXISTS zzzzzz_access_version ON custom.carrying_rule;
DROP TRIGGER IF EXISTS zzzzzz_access_version ON platform.knob_override;
DROP TRIGGER IF EXISTS zzzzzz_access_version ON platform.entity_relationships;
