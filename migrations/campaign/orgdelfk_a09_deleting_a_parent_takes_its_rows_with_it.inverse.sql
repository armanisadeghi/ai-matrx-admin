-- chair-step: INVERSE of orgdelfk_a09_deleting_a_parent_takes_its_rows_with_it.sql. Puts the 11 keys back to ON DELETE SET NULL exactly as they were (same names, same validity). This restores the broken state on purpose: deleting a parent that owns a row in one of these tables fails again with 23502.
-- lock: iam
-- lane: ORG-DELETE-FK

alter table users.user_achievements drop constraint user_achievements_organization_id_fkey, add constraint user_achievements_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table users.user_stats drop constraint user_stats_organization_id_fkey, add constraint user_stats_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table workbench.notes drop constraint notes_organization_id_fkey, add constraint notes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table workbench.udt_documents drop constraint udt_documents_organization_id_fkey, add constraint udt_documents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table workbench.udt_workbooks drop constraint udt_workbooks_organization_id_fkey, add constraint udt_workbooks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table workflow.definition drop constraint definition_organization_id_fkey, add constraint definition_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table workflow.run drop constraint run_organization_id_fkey, add constraint run_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table workflow.template drop constraint template_organization_id_fkey, add constraint template_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table workflow.trigger drop constraint trigger_organization_id_fkey, add constraint trigger_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table chat.media drop constraint cx_media_conversation_id_fkey, add constraint cx_media_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES chat.conversation(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED NOT VALID;
alter table communication.meet_chat_messages drop constraint meet_chat_messages_session_id_fkey, add constraint meet_chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES communication.meet_sessions(id) ON DELETE SET NULL NOT VALID;
alter table users.user_achievements validate constraint user_achievements_organization_id_fkey;
alter table users.user_stats validate constraint user_stats_organization_id_fkey;
alter table workbench.notes validate constraint notes_organization_id_fkey;
alter table workbench.udt_documents validate constraint udt_documents_organization_id_fkey;
alter table workbench.udt_workbooks validate constraint udt_workbooks_organization_id_fkey;
alter table chat.media validate constraint cx_media_conversation_id_fkey;
alter table communication.meet_chat_messages validate constraint meet_chat_messages_session_id_fkey;
