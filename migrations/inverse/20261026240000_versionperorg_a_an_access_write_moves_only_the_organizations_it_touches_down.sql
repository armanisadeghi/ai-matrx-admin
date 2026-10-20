-- chair-step: the inverse of VERSION-PER-ORG a — the 10 organization access tables get back the one statement trigger that moves the platform access version on every statement, and the per-organization functions are dropped
-- lane: VERSION-PER-ORG
-- window-class: drop+recreate of the access-version statement trigger on the same 10 unpartitioned access tables: ACCESS EXCLUSIVE on each plus the supautils set until commit
-- brief-lock: the same 40 trigger statements, rehearsed on the clone (VERSION-PER-ORG)
-- ground-standing-ok: a — before any DROP FUNCTION, every zzzzzz_access_version trigger is re-pointed at custom._access_version_bump_stmt by the CREATE OR REPLACE TRIGGER lines above it, and the _i/_u/_d triggers that run custom._access_version_bump_rows are dropped
-- Inverse of migrations/campaign/20261026240000_versionperorg_a_an_access_write_moves_only_the_organizations_it_touches.sql
-- Every organization's kept values go stale once more on any access write anywhere (the state before a). Nothing kept is
-- wrong after this runs: a bump only ever makes kept values stale.
DROP TRIGGER IF EXISTS zzzzzz_access_version_i ON iam.permissions;
DROP TRIGGER IF EXISTS zzzzzz_access_version_u ON iam.permissions;
DROP TRIGGER IF EXISTS zzzzzz_access_version_d ON iam.permissions;
CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT OR DELETE OR UPDATE ON iam.permissions FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();

DROP TRIGGER IF EXISTS zzzzzz_access_version_i ON platform.entity_grants;
DROP TRIGGER IF EXISTS zzzzzz_access_version_u ON platform.entity_grants;
DROP TRIGGER IF EXISTS zzzzzz_access_version_d ON platform.entity_grants;
CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT OR DELETE OR UPDATE ON platform.entity_grants FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();

DROP TRIGGER IF EXISTS zzzzzz_access_version_i ON platform.share_links;
DROP TRIGGER IF EXISTS zzzzzz_access_version_u ON platform.share_links;
DROP TRIGGER IF EXISTS zzzzzz_access_version_d ON platform.share_links;
CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT OR DELETE OR UPDATE ON platform.share_links FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();

DROP TRIGGER IF EXISTS zzzzzz_access_version_i ON iam.memberships;
DROP TRIGGER IF EXISTS zzzzzz_access_version_u ON iam.memberships;
DROP TRIGGER IF EXISTS zzzzzz_access_version_d ON iam.memberships;
CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT OR DELETE OR UPDATE ON iam.memberships FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();

DROP TRIGGER IF EXISTS zzzzzz_access_version_i ON iam.team;
DROP TRIGGER IF EXISTS zzzzzz_access_version_u ON iam.team;
DROP TRIGGER IF EXISTS zzzzzz_access_version_d ON iam.team;
CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT OR DELETE OR UPDATE ON iam.team FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();

DROP TRIGGER IF EXISTS zzzzzz_access_version_i ON custom.portal;
DROP TRIGGER IF EXISTS zzzzzz_access_version_u ON custom.portal;
DROP TRIGGER IF EXISTS zzzzzz_access_version_d ON custom.portal;
CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT OR DELETE OR UPDATE ON custom.portal FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();

DROP TRIGGER IF EXISTS zzzzzz_access_version_i ON custom.portal_principal;
DROP TRIGGER IF EXISTS zzzzzz_access_version_u ON custom.portal_principal;
DROP TRIGGER IF EXISTS zzzzzz_access_version_d ON custom.portal_principal;
CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT OR DELETE OR UPDATE ON custom.portal_principal FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();

DROP TRIGGER IF EXISTS zzzzzz_access_version_i ON custom.portal_table;
DROP TRIGGER IF EXISTS zzzzzz_access_version_u ON custom.portal_table;
DROP TRIGGER IF EXISTS zzzzzz_access_version_d ON custom.portal_table;
CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT OR DELETE OR UPDATE ON custom.portal_table FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();

DROP TRIGGER IF EXISTS zzzzzz_access_version_i ON iam.access_setup;
DROP TRIGGER IF EXISTS zzzzzz_access_version_u ON iam.access_setup;
DROP TRIGGER IF EXISTS zzzzzz_access_version_d ON iam.access_setup;
CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT OR DELETE OR UPDATE ON iam.access_setup FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();

DROP TRIGGER IF EXISTS zzzzzz_access_version_i ON platform.knob_override;
DROP TRIGGER IF EXISTS zzzzzz_access_version_u ON platform.knob_override;
DROP TRIGGER IF EXISTS zzzzzz_access_version_d ON platform.knob_override;
CREATE OR REPLACE TRIGGER zzzzzz_access_version AFTER INSERT OR DELETE OR UPDATE ON platform.knob_override FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();

DROP FUNCTION IF EXISTS custom._access_version_bump_rows();
DROP FUNCTION IF EXISTS custom._access_version_bump_orgs(uuid[]);
DROP FUNCTION IF EXISTS custom._access_orgs_touched(text, jsonb);
DROP FUNCTION IF EXISTS custom._access_orgs_reaching(uuid[]);
DROP FUNCTION IF EXISTS custom._access_owner_org_each(text[], uuid[]);
