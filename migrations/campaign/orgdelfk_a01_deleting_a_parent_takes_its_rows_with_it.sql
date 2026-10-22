-- chair-step: SWAPS 11 foreign keys from ON DELETE SET NULL to ON DELETE CASCADE (drop + re-add of each key under its own name, NOT VALID, one statement per key). Each key sits on a NOT NULL column, so SET NULL could never run: deleting the parent raised 23502. No row is touched. Inverse: migrations/campaign/orgdelfk_a01_deleting_a_parent_takes_its_rows_with_it.inverse.sql.
-- lock: iam
-- lane: ORG-DELETE-FK
--
-- Batch 1 of 10: agent.cmp_comparison_sets, agent.cmp_response_feedback, agent.definition, agent.message_template, agent.shortcut, agent.template, canvas.canvas_comments, canvas.canvas_item_state, canvas.canvas_items, chat.agent_memory, chat.agent_plan.
-- Lock cost: dropping a foreign key takes ACCESS EXCLUSIVE on the parent (measured 2026-10-22 in a rolled-back
-- transaction on iam.org_member_controls), so batches stay small and VALIDATE runs separately in
-- orgdelfk_v_the_cascading_keys_are_validated.sql (SHARE UPDATE EXCLUSIVE only). Keys that were NOT VALID before stay NOT VALID.
-- Guard: aidream db/tests/test_no_set_null_fk_on_a_not_null_column.py.
-- A key without a covering index first gets one (platform._provision_shape_settled refuses an unindexed key at COMMIT; every one of these tables is under 2 MB, so the plain build takes milliseconds). The inverse leaves those indexes in place.

create index if not exists cmp_comparison_sets_organization_id_idx on agent.cmp_comparison_sets (organization_id);
create index if not exists cmp_response_feedback_organization_id_idx on agent.cmp_response_feedback (organization_id);
create index if not exists canvas_comments_organization_id_idx on canvas.canvas_comments (organization_id);
create index if not exists canvas_item_state_organization_id_idx on canvas.canvas_item_state (organization_id);
create index if not exists agent_memory_organization_id_idx on chat.agent_memory (organization_id);
create index if not exists agent_plan_organization_id_idx on chat.agent_plan (organization_id);
alter table agent.cmp_comparison_sets drop constraint cmp_comparison_sets_organization_id_fkey, add constraint cmp_comparison_sets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table agent.cmp_response_feedback drop constraint cmp_response_feedback_organization_id_fkey, add constraint cmp_response_feedback_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table agent.definition drop constraint agx_agent_org_fk, add constraint agx_agent_org_fk FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table agent.message_template drop constraint content_template_organization_id_fkey, add constraint content_template_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table agent.shortcut drop constraint agx_shortcut_org_fk, add constraint agx_shortcut_org_fk FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table agent.template drop constraint agx_agent_templates_org_fk, add constraint agx_agent_templates_org_fk FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table canvas.canvas_comments drop constraint canvas_comments_organization_id_fkey, add constraint canvas_comments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table canvas.canvas_item_state drop constraint canvas_item_state_organization_id_fkey, add constraint canvas_item_state_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table canvas.canvas_items drop constraint canvas_items_organization_id_fkey, add constraint canvas_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table chat.agent_memory drop constraint agent_memory_organization_id_fkey, add constraint agent_memory_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table chat.agent_plan drop constraint agent_plan_organization_id_fkey, add constraint agent_plan_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
