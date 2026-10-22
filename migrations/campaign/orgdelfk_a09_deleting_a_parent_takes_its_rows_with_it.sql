-- chair-step: SWAPS 11 foreign keys from ON DELETE SET NULL to ON DELETE CASCADE (drop + re-add of each key under its own name, NOT VALID, one statement per key). Each key sits on a NOT NULL column, so SET NULL could never run: deleting the parent raised 23502. No row is touched. Inverse: migrations/campaign/orgdelfk_a09_deleting_a_parent_takes_its_rows_with_it.inverse.sql.
-- lock: iam
-- lane: ORG-DELETE-FK
--
-- Batch 9 of 10: users.user_achievements, users.user_stats, workbench.notes, workbench.udt_documents, workbench.udt_workbooks, workflow.definition, workflow.run, workflow.template, workflow.trigger, chat.media, communication.meet_chat_messages.
-- Lock cost: dropping a foreign key takes ACCESS EXCLUSIVE on the parent (measured 2026-10-22 in a rolled-back
-- transaction on iam.org_member_controls), so batches stay small and VALIDATE runs separately in
-- orgdelfk_v_the_cascading_keys_are_validated.sql (SHARE UPDATE EXCLUSIVE only). Keys that were NOT VALID before stay NOT VALID.
-- Guard: aidream db/tests/test_no_set_null_fk_on_a_not_null_column.py.
-- A key without a covering index first gets one (platform._provision_shape_settled refuses an unindexed key at COMMIT; every one of these tables is under 2 MB, so the plain build takes milliseconds). The inverse leaves those indexes in place.

create index if not exists user_achievements_organization_id_idx on users.user_achievements (organization_id);
create index if not exists user_stats_organization_id_idx on users.user_stats (organization_id);
create index if not exists template_organization_id_idx on workflow.template (organization_id);
alter table users.user_achievements drop constraint user_achievements_organization_id_fkey, add constraint user_achievements_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table users.user_stats drop constraint user_stats_organization_id_fkey, add constraint user_stats_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table workbench.notes drop constraint notes_organization_id_fkey, add constraint notes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table workbench.udt_documents drop constraint udt_documents_organization_id_fkey, add constraint udt_documents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table workbench.udt_workbooks drop constraint udt_workbooks_organization_id_fkey, add constraint udt_workbooks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table workflow.definition drop constraint definition_organization_id_fkey, add constraint definition_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table workflow.run drop constraint run_organization_id_fkey, add constraint run_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table workflow.template drop constraint template_organization_id_fkey, add constraint template_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table workflow.trigger drop constraint trigger_organization_id_fkey, add constraint trigger_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table chat.media drop constraint cx_media_conversation_id_fkey, add constraint cx_media_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES chat.conversation(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED NOT VALID;
alter table communication.meet_chat_messages drop constraint meet_chat_messages_session_id_fkey, add constraint meet_chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES communication.meet_sessions(id) ON DELETE CASCADE NOT VALID;
