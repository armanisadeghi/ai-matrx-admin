-- chair-step: SWAPS 11 foreign keys from ON DELETE SET NULL to ON DELETE CASCADE (drop + re-add of each key under its own name, NOT VALID, one statement per key). Each key sits on a NOT NULL column, so SET NULL could never run: deleting the parent raised 23502. No row is touched. Inverse: migrations/campaign/orgdelfk_a03_deleting_a_parent_takes_its_rows_with_it.inverse.sql.
-- lock: iam
-- lane: ORG-DELETE-FK
--
-- Batch 3 of 10: code.code_repositories, context.user_active_context, docproc.derive_runs, docproc.page_extraction_jobs, docproc.page_extraction_page_runs, docproc.page_extraction_runs, docproc.processed_documents, education.quiz_sessions, education.study_structured_section, files.file_rag_jobs, files.file_versions.
-- Lock cost: dropping a foreign key takes ACCESS EXCLUSIVE on the parent (measured 2026-10-22 in a rolled-back
-- transaction on iam.org_member_controls), so batches stay small and VALIDATE runs separately in
-- orgdelfk_v_the_cascading_keys_are_validated.sql (SHARE UPDATE EXCLUSIVE only). Keys that were NOT VALID before stay NOT VALID.
-- Guard: aidream db/tests/test_no_set_null_fk_on_a_not_null_column.py.
-- A key without a covering index first gets one (platform._provision_shape_settled refuses an unindexed key at COMMIT; every one of these tables is under 2 MB, so the plain build takes milliseconds). The inverse leaves those indexes in place.

create index if not exists code_repositories_organization_id_idx on code.code_repositories (organization_id);
create index if not exists user_active_context_organization_id_idx on context.user_active_context (organization_id);
create index if not exists derive_runs_organization_id_idx on docproc.derive_runs (organization_id);
create index if not exists page_extraction_page_runs_organization_id_idx on docproc.page_extraction_page_runs (organization_id);
create index if not exists page_extraction_runs_organization_id_idx on docproc.page_extraction_runs (organization_id);
create index if not exists file_rag_jobs_organization_id_idx on files.file_rag_jobs (organization_id);
alter table code.code_repositories drop constraint code_repositories_organization_id_fkey, add constraint code_repositories_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table context.user_active_context drop constraint user_active_context_organization_id_fkey, add constraint user_active_context_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table docproc.derive_runs drop constraint derive_runs_organization_id_fkey, add constraint derive_runs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table docproc.page_extraction_jobs drop constraint page_extraction_jobs_organization_id_fkey, add constraint page_extraction_jobs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table docproc.page_extraction_page_runs drop constraint page_extraction_page_runs_organization_id_fkey, add constraint page_extraction_page_runs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table docproc.page_extraction_runs drop constraint page_extraction_runs_organization_id_fkey, add constraint page_extraction_runs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table docproc.processed_documents drop constraint processed_documents_organization_id_fkey, add constraint processed_documents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table education.quiz_sessions drop constraint quiz_sessions_organization_id_fkey, add constraint quiz_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table education.study_structured_section drop constraint study_structured_section_organization_id_fkey, add constraint study_structured_section_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table files.file_rag_jobs drop constraint cld_file_rag_jobs_organization_id_fkey, add constraint cld_file_rag_jobs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table files.file_versions drop constraint file_versions_organization_id_fkey, add constraint file_versions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
