-- chair-step: INVERSE of orgdelfk_a01_deleting_a_parent_takes_its_rows_with_it.sql. Puts the 11 keys back to ON DELETE SET NULL exactly as they were (same names, same validity). This restores the broken state on purpose: deleting a parent that owns a row in one of these tables fails again with 23502.
-- lock: iam
-- lane: ORG-DELETE-FK

alter table agent.cmp_comparison_sets drop constraint cmp_comparison_sets_organization_id_fkey, add constraint cmp_comparison_sets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table agent.cmp_response_feedback drop constraint cmp_response_feedback_organization_id_fkey, add constraint cmp_response_feedback_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table agent.definition drop constraint agx_agent_org_fk, add constraint agx_agent_org_fk FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table agent.message_template drop constraint content_template_organization_id_fkey, add constraint content_template_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table agent.shortcut drop constraint agx_shortcut_org_fk, add constraint agx_shortcut_org_fk FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table agent.template drop constraint agx_agent_templates_org_fk, add constraint agx_agent_templates_org_fk FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table canvas.canvas_comments drop constraint canvas_comments_organization_id_fkey, add constraint canvas_comments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table canvas.canvas_item_state drop constraint canvas_item_state_organization_id_fkey, add constraint canvas_item_state_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table canvas.canvas_items drop constraint canvas_items_organization_id_fkey, add constraint canvas_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table chat.agent_memory drop constraint agent_memory_organization_id_fkey, add constraint agent_memory_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table chat.agent_plan drop constraint agent_plan_organization_id_fkey, add constraint agent_plan_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table agent.cmp_response_feedback validate constraint cmp_response_feedback_organization_id_fkey;
alter table agent.definition validate constraint agx_agent_org_fk;
alter table agent.message_template validate constraint content_template_organization_id_fkey;
alter table agent.shortcut validate constraint agx_shortcut_org_fk;
alter table agent.template validate constraint agx_agent_templates_org_fk;
alter table canvas.canvas_item_state validate constraint canvas_item_state_organization_id_fkey;
alter table canvas.canvas_items validate constraint canvas_items_organization_id_fkey;
