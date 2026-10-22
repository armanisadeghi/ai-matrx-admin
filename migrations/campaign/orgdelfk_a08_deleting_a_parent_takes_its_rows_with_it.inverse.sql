-- chair-step: INVERSE of orgdelfk_a08_deleting_a_parent_takes_its_rows_with_it.sql. Puts the 11 keys back to ON DELETE SET NULL exactly as they were (same names, same validity). This restores the broken state on purpose: deleting a parent that owns a row in one of these tables fails again with 23502.
-- lock: iam
-- lane: ORG-DELETE-FK

alter table research.rs_tag drop constraint rs_tag_organization_id_fkey, add constraint rs_tag_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table research.rs_template drop constraint rs_template_organization_id_fkey, add constraint rs_template_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table research.rs_topic drop constraint rs_topic_organization_id_fkey, add constraint rs_topic_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table scheduler.sch_run drop constraint sch_run_organization_id_fkey, add constraint sch_run_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table skill.definition drop constraint skill_definition_organization_id_fkey, add constraint skill_definition_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table transcripts.studio_documents drop constraint studio_documents_organization_id_fkey, add constraint studio_documents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table transcripts.studio_recording_segments drop constraint studio_recording_segments_organization_id_fkey, add constraint studio_recording_segments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table transcripts.studio_runs drop constraint studio_runs_organization_id_fkey, add constraint studio_runs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table transcripts.studio_session_settings drop constraint studio_session_settings_organization_id_fkey, add constraint studio_session_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table transcripts.studio_sessions drop constraint studio_sessions_organization_id_fkey, add constraint studio_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table transcripts.transcripts drop constraint transcripts_organization_id_fkey, add constraint transcripts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table research.rs_tag validate constraint rs_tag_organization_id_fkey;
alter table research.rs_template validate constraint rs_template_organization_id_fkey;
alter table skill.definition validate constraint skill_definition_organization_id_fkey;
alter table transcripts.studio_session_settings validate constraint studio_session_settings_organization_id_fkey;
alter table transcripts.studio_sessions validate constraint studio_sessions_organization_id_fkey;
alter table transcripts.transcripts validate constraint transcripts_organization_id_fkey;
