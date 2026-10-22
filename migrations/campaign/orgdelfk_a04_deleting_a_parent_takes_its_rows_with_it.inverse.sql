-- chair-step: INVERSE of orgdelfk_a04_deleting_a_parent_takes_its_rows_with_it.sql. Puts the 11 keys back to ON DELETE SET NULL exactly as they were (same names, same validity). This restores the broken state on purpose: deleting a parent that owns a row in one of these tables fails again with 23502.
-- lock: iam
-- lane: ORG-DELETE-FK

alter table files.files drop constraint files_organization_id_fkey, add constraint files_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table files.folders drop constraint folders_organization_id_fkey, add constraint folders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table files.webhooks drop constraint webhooks_organization_id_fkey, add constraint webhooks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table iam.invitations drop constraint invitations_organization_id_fkey, add constraint invitations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table iam.org_admin_audit drop constraint org_admin_audit_organization_id_fkey, add constraint org_admin_audit_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table iam.org_member_controls drop constraint org_member_controls_organization_id_fkey, add constraint org_member_controls_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table legal.ingest_runs drop constraint ingest_runs_organization_id_fkey, add constraint ingest_runs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table legal.wc_claim drop constraint wc_claim_organization_id_fkey, add constraint wc_claim_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table pdf.pdf_redaction_key_escrow drop constraint pdf_redaction_key_escrow_organization_id_fkey, add constraint pdf_redaction_key_escrow_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table platform._base_entity drop constraint _base_entity_organization_id_fkey, add constraint _base_entity_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table platform.activity_log drop constraint activity_log_organization_id_fkey, add constraint activity_log_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table files.webhooks validate constraint webhooks_organization_id_fkey;
alter table iam.org_admin_audit validate constraint org_admin_audit_organization_id_fkey;
alter table iam.org_member_controls validate constraint org_member_controls_organization_id_fkey;
alter table legal.ingest_runs validate constraint ingest_runs_organization_id_fkey;
alter table legal.wc_claim validate constraint wc_claim_organization_id_fkey;
alter table pdf.pdf_redaction_key_escrow validate constraint pdf_redaction_key_escrow_organization_id_fkey;
