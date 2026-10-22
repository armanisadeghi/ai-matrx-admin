-- chair-step: SWAPS 11 foreign keys from ON DELETE SET NULL to ON DELETE CASCADE (drop + re-add of each key under its own name, NOT VALID, one statement per key). Each key sits on a NOT NULL column, so SET NULL could never run: deleting the parent raised 23502. No row is touched. Inverse: migrations/campaign/orgdelfk_a07_deleting_a_parent_takes_its_rows_with_it.inverse.sql.
-- lock: iam
-- lane: ORG-DELETE-FK
--
-- Batch 7 of 10: rag.retrieval_audit, rag.scope_association_suggestions, rag.scope_item_value_suggestions, rag.scope_suggestions, research.rs_analysis, research.rs_content, research.rs_document, research.rs_keyword, research.rs_media, research.rs_source, research.rs_synthesis.
-- Lock cost: dropping a foreign key takes ACCESS EXCLUSIVE on the parent (measured 2026-10-22 in a rolled-back
-- transaction on iam.org_member_controls), so batches stay small and VALIDATE runs separately in
-- orgdelfk_v_the_cascading_keys_are_validated.sql (SHARE UPDATE EXCLUSIVE only). Keys that were NOT VALID before stay NOT VALID.
-- Guard: aidream db/tests/test_no_set_null_fk_on_a_not_null_column.py.
-- A key without a covering index first gets one (platform._provision_shape_settled refuses an unindexed key at COMMIT; every one of these tables is under 2 MB, so the plain build takes milliseconds). The inverse leaves those indexes in place.

create index if not exists scope_suggestions_organization_id_idx on rag.scope_suggestions (organization_id);
alter table rag.retrieval_audit drop constraint retrieval_audit_organization_id_fkey, add constraint retrieval_audit_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table rag.scope_association_suggestions drop constraint scope_association_suggestions_organization_id_fkey, add constraint scope_association_suggestions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table rag.scope_item_value_suggestions drop constraint scope_item_value_suggestions_organization_id_fkey, add constraint scope_item_value_suggestions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table rag.scope_suggestions drop constraint scope_suggestions_organization_id_fkey, add constraint scope_suggestions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table research.rs_analysis drop constraint rs_analysis_organization_id_fkey, add constraint rs_analysis_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table research.rs_content drop constraint rs_content_organization_id_fkey, add constraint rs_content_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table research.rs_document drop constraint rs_document_organization_id_fkey, add constraint rs_document_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table research.rs_keyword drop constraint rs_keyword_organization_id_fkey, add constraint rs_keyword_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table research.rs_media drop constraint rs_media_organization_id_fkey, add constraint rs_media_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table research.rs_source drop constraint rs_source_organization_id_fkey, add constraint rs_source_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table research.rs_synthesis drop constraint rs_synthesis_organization_id_fkey, add constraint rs_synthesis_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
