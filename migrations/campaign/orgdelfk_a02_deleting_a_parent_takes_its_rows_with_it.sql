-- chair-step: SWAPS 11 foreign keys from ON DELETE SET NULL to ON DELETE CASCADE (drop + re-add of each key under its own name, NOT VALID, one statement per key). Each key sits on a NOT NULL column, so SET NULL could never run: deleting the parent raised 23502. No row is touched. Inverse: migrations/campaign/orgdelfk_a02_deleting_a_parent_takes_its_rows_with_it.inverse.sql.
-- lock: iam
-- lane: ORG-DELETE-FK
--
-- Batch 2 of 10: chat.agent_run, chat.artifact, chat.code_message_file, chat.conversation, chat.message, chat.observational_memory, chat.tool_call, chat.user_request, chat.user_todo, code.code_file_folders, code.code_files.
-- Lock cost: dropping a foreign key takes ACCESS EXCLUSIVE on the parent (measured 2026-10-22 in a rolled-back
-- transaction on iam.org_member_controls), so batches stay small and VALIDATE runs separately in
-- orgdelfk_v_the_cascading_keys_are_validated.sql (SHARE UPDATE EXCLUSIVE only). Keys that were NOT VALID before stay NOT VALID.
-- Guard: aidream db/tests/test_no_set_null_fk_on_a_not_null_column.py.
-- A key without a covering index first gets one (platform._provision_shape_settled refuses an unindexed key at COMMIT; every one of these tables is under 2 MB, so the plain build takes milliseconds). The inverse leaves those indexes in place.

create index if not exists agent_run_organization_id_idx on chat.agent_run (organization_id);
create index if not exists artifact_organization_id_idx on chat.artifact (organization_id);
create index if not exists code_message_file_organization_id_idx on chat.code_message_file (organization_id);
create index if not exists observational_memory_organization_id_idx on chat.observational_memory (organization_id);
create index if not exists user_todo_organization_id_idx on chat.user_todo (organization_id);
create index if not exists code_file_folders_organization_id_idx on code.code_file_folders (organization_id);
create index if not exists code_files_organization_id_idx on code.code_files (organization_id);
alter table chat.agent_run drop constraint agent_run_organization_id_fkey, add constraint agent_run_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table chat.artifact drop constraint artifact_organization_id_fkey, add constraint artifact_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table chat.code_message_file drop constraint code_message_file_organization_id_fkey, add constraint code_message_file_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table chat.conversation drop constraint cx_conversation_organization_id_fkey, add constraint cx_conversation_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table chat.message drop constraint message_organization_id_fkey, add constraint message_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table chat.observational_memory drop constraint observational_memory_organization_id_fkey, add constraint observational_memory_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table chat.tool_call drop constraint tool_call_organization_id_fkey, add constraint tool_call_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table chat.user_request drop constraint user_request_organization_id_fkey, add constraint user_request_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table chat.user_todo drop constraint user_todo_organization_id_fkey, add constraint user_todo_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table code.code_file_folders drop constraint code_file_folders_organization_id_fkey, add constraint code_file_folders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table code.code_files drop constraint code_files_organization_id_fkey, add constraint code_files_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
