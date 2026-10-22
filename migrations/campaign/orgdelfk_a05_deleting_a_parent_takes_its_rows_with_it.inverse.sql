-- chair-step: INVERSE of orgdelfk_a05_deleting_a_parent_takes_its_rows_with_it.sql. Puts the 11 keys back to ON DELETE SET NULL exactly as they were (same names, same validity). This restores the broken state on purpose: deleting a parent that owns a row in one of these tables fails again with 23502.
-- lock: iam
-- lane: ORG-DELETE-FK

alter table platform.categories drop constraint categories_organization_id_fkey, add constraint categories_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table platform.comments drop constraint comments_organization_id_fkey, add constraint comments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table podcast.pc_articles drop constraint pc_articles_organization_id_fkey, add constraint pc_articles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table podcast.pc_episodes drop constraint pc_episodes_organization_id_fkey, add constraint pc_episodes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table podcast.pc_studio_runs drop constraint pc_studio_runs_organization_id_fkey, add constraint pc_studio_runs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table projects.tasks drop constraint tasks_organization_id_fkey, add constraint tasks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table public.app_instances drop constraint app_instances_organization_id_fkey, add constraint app_instances_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table public.sandbox_instances drop constraint sandbox_instances_organization_id_fkey, add constraint sandbox_instances_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table rag.context_item_suggestions drop constraint context_item_suggestions_organization_id_fkey, add constraint context_item_suggestions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table rag.data_stores drop constraint data_stores_organization_id_fkey, add constraint data_stores_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table rag.embedding_cache drop constraint embedding_cache_organization_id_fkey, add constraint embedding_cache_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table podcast.pc_articles validate constraint pc_articles_organization_id_fkey;
alter table podcast.pc_episodes validate constraint pc_episodes_organization_id_fkey;
alter table projects.tasks validate constraint tasks_organization_id_fkey;
alter table public.app_instances validate constraint app_instances_organization_id_fkey;
alter table public.sandbox_instances validate constraint sandbox_instances_organization_id_fkey;
