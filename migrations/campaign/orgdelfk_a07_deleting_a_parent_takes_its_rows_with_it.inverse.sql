-- chair-step: INVERSE of orgdelfk_a07_deleting_a_parent_takes_its_rows_with_it.sql. Puts the 11 keys back to ON DELETE SET NULL exactly as they were (same names, same validity). This restores the broken state on purpose: deleting a parent that owns a row in one of these tables fails again with 23502.
-- lock: iam
-- lane: ORG-DELETE-FK

alter table rag.retrieval_audit drop constraint retrieval_audit_organization_id_fkey, add constraint retrieval_audit_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table rag.scope_association_suggestions drop constraint scope_association_suggestions_organization_id_fkey, add constraint scope_association_suggestions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table rag.scope_item_value_suggestions drop constraint scope_item_value_suggestions_organization_id_fkey, add constraint scope_item_value_suggestions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table rag.scope_suggestions drop constraint scope_suggestions_organization_id_fkey, add constraint scope_suggestions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table research.rs_analysis drop constraint rs_analysis_organization_id_fkey, add constraint rs_analysis_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table research.rs_content drop constraint rs_content_organization_id_fkey, add constraint rs_content_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table research.rs_document drop constraint rs_document_organization_id_fkey, add constraint rs_document_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table research.rs_keyword drop constraint rs_keyword_organization_id_fkey, add constraint rs_keyword_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table research.rs_media drop constraint rs_media_organization_id_fkey, add constraint rs_media_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table research.rs_source drop constraint rs_source_organization_id_fkey, add constraint rs_source_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table research.rs_synthesis drop constraint rs_synthesis_organization_id_fkey, add constraint rs_synthesis_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table rag.retrieval_audit validate constraint retrieval_audit_organization_id_fkey;
alter table rag.scope_association_suggestions validate constraint scope_association_suggestions_organization_id_fkey;
alter table rag.scope_item_value_suggestions validate constraint scope_item_value_suggestions_organization_id_fkey;
alter table research.rs_analysis validate constraint rs_analysis_organization_id_fkey;
alter table research.rs_document validate constraint rs_document_organization_id_fkey;
alter table research.rs_keyword validate constraint rs_keyword_organization_id_fkey;
alter table research.rs_media validate constraint rs_media_organization_id_fkey;
alter table research.rs_synthesis validate constraint rs_synthesis_organization_id_fkey;
