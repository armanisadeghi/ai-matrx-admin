-- chair-step: SWAPS 11 foreign keys from ON DELETE SET NULL to ON DELETE CASCADE (drop + re-add of each key under its own name, NOT VALID, one statement per key). Each key sits on a NOT NULL column, so SET NULL could never run: deleting the parent raised 23502. No row is touched. Inverse: migrations/campaign/orgdelfk_a04_deleting_a_parent_takes_its_rows_with_it.inverse.sql.
-- lock: iam
-- lane: ORG-DELETE-FK
--
-- Batch 4 of 10: files.files, files.folders, files.webhooks, iam.invitations, iam.org_admin_audit, iam.org_member_controls, legal.ingest_runs, legal.wc_claim, pdf.pdf_redaction_key_escrow, platform._base_entity, platform.activity_log.
-- Lock cost: dropping a foreign key takes ACCESS EXCLUSIVE on the parent (measured 2026-10-22 in a rolled-back
-- transaction on iam.org_member_controls), so batches stay small and VALIDATE runs separately in
-- orgdelfk_v_the_cascading_keys_are_validated.sql (SHARE UPDATE EXCLUSIVE only). Keys that were NOT VALID before stay NOT VALID.
-- Guard: aidream db/tests/test_no_set_null_fk_on_a_not_null_column.py.
-- A key without a covering index first gets one (platform._provision_shape_settled refuses an unindexed key at COMMIT; every one of these tables is under 2 MB, so the plain build takes milliseconds). The inverse leaves those indexes in place.

create index if not exists invitations_organization_id_idx on iam.invitations (organization_id);
create index if not exists _base_entity_organization_id_idx on platform._base_entity (organization_id);
alter table files.files drop constraint files_organization_id_fkey, add constraint files_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table files.folders drop constraint folders_organization_id_fkey, add constraint folders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table files.webhooks drop constraint webhooks_organization_id_fkey, add constraint webhooks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table iam.invitations drop constraint invitations_organization_id_fkey, add constraint invitations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table iam.org_admin_audit drop constraint org_admin_audit_organization_id_fkey, add constraint org_admin_audit_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table iam.org_member_controls drop constraint org_member_controls_organization_id_fkey, add constraint org_member_controls_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table legal.ingest_runs drop constraint ingest_runs_organization_id_fkey, add constraint ingest_runs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table legal.wc_claim drop constraint wc_claim_organization_id_fkey, add constraint wc_claim_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table pdf.pdf_redaction_key_escrow drop constraint pdf_redaction_key_escrow_organization_id_fkey, add constraint pdf_redaction_key_escrow_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table platform._base_entity drop constraint _base_entity_organization_id_fkey, add constraint _base_entity_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table platform.activity_log drop constraint activity_log_organization_id_fkey, add constraint activity_log_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
