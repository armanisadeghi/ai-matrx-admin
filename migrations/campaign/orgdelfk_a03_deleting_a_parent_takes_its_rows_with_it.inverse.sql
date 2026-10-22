-- chair-step: INVERSE of orgdelfk_a03_deleting_a_parent_takes_its_rows_with_it.sql. Puts the 11 keys back to ON DELETE SET NULL exactly as they were (same names, same validity). This restores the broken state on purpose: deleting a parent that owns a row in one of these tables fails again with 23502.
-- lock: iam
-- lane: ORG-DELETE-FK

alter table code.code_repositories drop constraint code_repositories_organization_id_fkey, add constraint code_repositories_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table context.user_active_context drop constraint user_active_context_organization_id_fkey, add constraint user_active_context_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table docproc.derive_runs drop constraint derive_runs_organization_id_fkey, add constraint derive_runs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table docproc.page_extraction_jobs drop constraint page_extraction_jobs_organization_id_fkey, add constraint page_extraction_jobs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table docproc.page_extraction_page_runs drop constraint page_extraction_page_runs_organization_id_fkey, add constraint page_extraction_page_runs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table docproc.page_extraction_runs drop constraint page_extraction_runs_organization_id_fkey, add constraint page_extraction_runs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table docproc.processed_documents drop constraint processed_documents_organization_id_fkey, add constraint processed_documents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table education.quiz_sessions drop constraint quiz_sessions_organization_id_fkey, add constraint quiz_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table education.study_structured_section drop constraint study_structured_section_organization_id_fkey, add constraint study_structured_section_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table files.file_rag_jobs drop constraint cld_file_rag_jobs_organization_id_fkey, add constraint cld_file_rag_jobs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table files.file_versions drop constraint file_versions_organization_id_fkey, add constraint file_versions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table context.user_active_context validate constraint user_active_context_organization_id_fkey;
alter table docproc.page_extraction_jobs validate constraint page_extraction_jobs_organization_id_fkey;
alter table education.quiz_sessions validate constraint quiz_sessions_organization_id_fkey;
alter table education.study_structured_section validate constraint study_structured_section_organization_id_fkey;
alter table files.file_rag_jobs validate constraint cld_file_rag_jobs_organization_id_fkey;
