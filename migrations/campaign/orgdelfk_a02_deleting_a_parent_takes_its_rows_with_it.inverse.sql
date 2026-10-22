-- chair-step: INVERSE of orgdelfk_a02_deleting_a_parent_takes_its_rows_with_it.sql. Puts the 11 keys back to ON DELETE SET NULL exactly as they were (same names, same validity). This restores the broken state on purpose: deleting a parent that owns a row in one of these tables fails again with 23502.
-- lock: iam
-- lane: ORG-DELETE-FK

alter table chat.agent_run drop constraint agent_run_organization_id_fkey, add constraint agent_run_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table chat.artifact drop constraint artifact_organization_id_fkey, add constraint artifact_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table chat.code_message_file drop constraint code_message_file_organization_id_fkey, add constraint code_message_file_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table chat.conversation drop constraint cx_conversation_organization_id_fkey, add constraint cx_conversation_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table chat.message drop constraint message_organization_id_fkey, add constraint message_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table chat.observational_memory drop constraint observational_memory_organization_id_fkey, add constraint observational_memory_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table chat.tool_call drop constraint tool_call_organization_id_fkey, add constraint tool_call_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table chat.user_request drop constraint user_request_organization_id_fkey, add constraint user_request_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table chat.user_todo drop constraint user_todo_organization_id_fkey, add constraint user_todo_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table code.code_file_folders drop constraint code_file_folders_organization_id_fkey, add constraint code_file_folders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table code.code_files drop constraint code_files_organization_id_fkey, add constraint code_files_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table chat.conversation validate constraint cx_conversation_organization_id_fkey;
