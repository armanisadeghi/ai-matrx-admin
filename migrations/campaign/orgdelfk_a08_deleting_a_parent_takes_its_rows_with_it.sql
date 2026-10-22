-- chair-step: SWAPS 11 foreign keys from ON DELETE SET NULL to ON DELETE CASCADE (drop + re-add of each key under its own name, NOT VALID, one statement per key). Each key sits on a NOT NULL column, so SET NULL could never run: deleting the parent raised 23502. No row is touched. Inverse: migrations/campaign/orgdelfk_a08_deleting_a_parent_takes_its_rows_with_it.inverse.sql.
-- lock: iam
-- lane: ORG-DELETE-FK
--
-- Batch 8 of 10: research.rs_tag, research.rs_template, research.rs_topic, scheduler.sch_run, skill.definition, transcripts.studio_documents, transcripts.studio_recording_segments, transcripts.studio_runs, transcripts.studio_session_settings, transcripts.studio_sessions, transcripts.transcripts.
-- Lock cost: dropping a foreign key takes ACCESS EXCLUSIVE on the parent (measured 2026-10-22 in a rolled-back
-- transaction on iam.org_member_controls), so batches stay small and VALIDATE runs separately in
-- orgdelfk_v_the_cascading_keys_are_validated.sql (SHARE UPDATE EXCLUSIVE only). Keys that were NOT VALID before stay NOT VALID.
-- Guard: aidream db/tests/test_no_set_null_fk_on_a_not_null_column.py.
-- A key without a covering index first gets one (platform._provision_shape_settled refuses an unindexed key at COMMIT; every one of these tables is under 2 MB, so the plain build takes milliseconds). The inverse leaves those indexes in place.

create index if not exists studio_documents_organization_id_idx on transcripts.studio_documents (organization_id);
create index if not exists studio_recording_segments_organization_id_idx on transcripts.studio_recording_segments (organization_id);
create index if not exists studio_runs_organization_id_idx on transcripts.studio_runs (organization_id);
alter table research.rs_tag drop constraint rs_tag_organization_id_fkey, add constraint rs_tag_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table research.rs_template drop constraint rs_template_organization_id_fkey, add constraint rs_template_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table research.rs_topic drop constraint rs_topic_organization_id_fkey, add constraint rs_topic_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table scheduler.sch_run drop constraint sch_run_organization_id_fkey, add constraint sch_run_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table skill.definition drop constraint skill_definition_organization_id_fkey, add constraint skill_definition_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table transcripts.studio_documents drop constraint studio_documents_organization_id_fkey, add constraint studio_documents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table transcripts.studio_recording_segments drop constraint studio_recording_segments_organization_id_fkey, add constraint studio_recording_segments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table transcripts.studio_runs drop constraint studio_runs_organization_id_fkey, add constraint studio_runs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table transcripts.studio_session_settings drop constraint studio_session_settings_organization_id_fkey, add constraint studio_session_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table transcripts.studio_sessions drop constraint studio_sessions_organization_id_fkey, add constraint studio_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table transcripts.transcripts drop constraint transcripts_organization_id_fkey, add constraint transcripts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
