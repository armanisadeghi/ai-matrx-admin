-- additive: yes
-- guard: custom/system_enabled
-- lane: READ-SPEED-4
-- lock: custom
-- window-class: statement triggers on custom.record (+16 partitions), platform.associations and 13 access tables: SHARE ROW EXCLUSIVE on each until commit; the custom.record ones come last, so writers to the store wait well under a second
-- brief-lock: the same triggers, rehearsed on the clone (READ-SPEED-4); the whole transaction is a few seconds
--
-- READ-SPEED-4 c — THE WRITE TRIGGERS (and with them, kept values are served). Needs READ-SPEED-4 b
-- (20261020240100_readspeed4_b_writes_mark_stale_views_refresh_reader_check_kept), which holds every function they run.
--  * custom.record and platform.associations: a write marks the kept values it changes stale and moves the access version
--    when it changes who sees what (custom._computed_stale_stmt / custom._computed_assoc_stmt).
--  * 13 access tables: any write moves the platform access version once per transaction (custom._access_version_bump_stmt).
-- Everything is queued again first, so nothing kept before the triggers existed is served.
-- Inverse: migrations/inverse/20261020240110_readspeed4_c_the_write_triggers_down.sql


-- Everything is queued again: nothing kept before the triggers existed is served until a view refreshes it.
SELECT custom._computed_mark_org(o.organization_id)
  FROM (SELECT DISTINCT f.organization_id FROM custom.record f
         WHERE f.table_id = custom.field_kernel_id() AND f.deleted_at IS NULL
           AND custom.parity_type(f.data) IN ('lookup', 'rollup', 'formula')
           AND coalesce(f.data ->> 'compute_on', '') = 'read') o;


-- ── ACCESS WRITES MOVE THE PLATFORM ACCESS VERSION (once per transaction) ───────────────────────────────────
CREATE TRIGGER zzzzzz_access_version AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON iam.permissions FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();
CREATE TRIGGER zzzzzz_access_version AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON platform.entity_grants FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();
CREATE TRIGGER zzzzzz_access_version AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON iam.memberships FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();
CREATE TRIGGER zzzzzz_access_version AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON iam.membership_grant FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();
CREATE TRIGGER zzzzzz_access_version AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON iam.team FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();
CREATE TRIGGER zzzzzz_access_version AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON platform.share_links FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();
CREATE TRIGGER zzzzzz_access_version AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON custom.portal FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();
CREATE TRIGGER zzzzzz_access_version AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON custom.portal_principal FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();
CREATE TRIGGER zzzzzz_access_version AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON custom.portal_table FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();
CREATE TRIGGER zzzzzz_access_version AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON iam.access_setup FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();
CREATE TRIGGER zzzzzz_access_version AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON custom.carrying_rule FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();
CREATE TRIGGER zzzzzz_access_version AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON platform.knob_override FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();
CREATE TRIGGER zzzzzz_access_version AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON platform.entity_relationships FOR EACH STATEMENT EXECUTE FUNCTION custom._access_version_bump_stmt();

CREATE TRIGGER zzzzzz_computed_stale_i AFTER INSERT ON platform.associations REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION custom._computed_assoc_stmt();
CREATE TRIGGER zzzzzz_computed_stale_u AFTER UPDATE ON platform.associations REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION custom._computed_assoc_stmt();
CREATE TRIGGER zzzzzz_computed_stale_d AFTER DELETE ON platform.associations REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION custom._computed_assoc_stmt();

CREATE TRIGGER _g0_computed_stale_d AFTER DELETE ON custom.record REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION custom._computed_stale_stmt();
CREATE TRIGGER zzzzzz_computed_stale_i AFTER INSERT ON custom.record REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION custom._computed_stale_stmt();
CREATE TRIGGER zzzzzz_computed_stale_u AFTER UPDATE ON custom.record REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION custom._computed_stale_stmt();
