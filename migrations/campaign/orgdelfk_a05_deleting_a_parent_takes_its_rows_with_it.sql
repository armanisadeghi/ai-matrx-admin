-- chair-step: SWAPS 11 foreign keys from ON DELETE SET NULL to ON DELETE CASCADE (drop + re-add of each key under its own name, NOT VALID, one statement per key). Each key sits on a NOT NULL column, so SET NULL could never run: deleting the parent raised 23502. No row is touched. Inverse: migrations/campaign/orgdelfk_a05_deleting_a_parent_takes_its_rows_with_it.inverse.sql.
-- lock: iam
-- lane: ORG-DELETE-FK
--
-- Batch 5 of 10: platform.categories, platform.comments, podcast.pc_articles, podcast.pc_episodes, podcast.pc_studio_runs, projects.tasks, public.app_instances, public.sandbox_instances, rag.context_item_suggestions, rag.data_stores, rag.embedding_cache.
-- Lock cost: dropping a foreign key takes ACCESS EXCLUSIVE on the parent (measured 2026-10-22 in a rolled-back
-- transaction on iam.org_member_controls), so batches stay small and VALIDATE runs separately in
-- orgdelfk_v_the_cascading_keys_are_validated.sql (SHARE UPDATE EXCLUSIVE only). Keys that were NOT VALID before stay NOT VALID.
-- Guard: aidream db/tests/test_no_set_null_fk_on_a_not_null_column.py.
-- A key without a covering index first gets one (platform._provision_shape_settled refuses an unindexed key at COMMIT; every one of these tables is under 2 MB, so the plain build takes milliseconds). The inverse leaves those indexes in place.

create index if not exists categories_organization_id_idx on platform.categories (organization_id);
create index if not exists comments_organization_id_idx on platform.comments (organization_id);
create index if not exists pc_articles_organization_id_idx on podcast.pc_articles (organization_id);
create index if not exists pc_episodes_organization_id_idx on podcast.pc_episodes (organization_id);
create index if not exists pc_studio_runs_organization_id_idx on podcast.pc_studio_runs (organization_id);
create index if not exists app_instances_organization_id_idx on public.app_instances (organization_id);
create index if not exists context_item_suggestions_organization_id_idx on rag.context_item_suggestions (organization_id);
alter table platform.categories drop constraint categories_organization_id_fkey, add constraint categories_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table platform.comments drop constraint comments_organization_id_fkey, add constraint comments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table podcast.pc_articles drop constraint pc_articles_organization_id_fkey, add constraint pc_articles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table podcast.pc_episodes drop constraint pc_episodes_organization_id_fkey, add constraint pc_episodes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table podcast.pc_studio_runs drop constraint pc_studio_runs_organization_id_fkey, add constraint pc_studio_runs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table projects.tasks drop constraint tasks_organization_id_fkey, add constraint tasks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table public.app_instances drop constraint app_instances_organization_id_fkey, add constraint app_instances_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table public.sandbox_instances drop constraint sandbox_instances_organization_id_fkey, add constraint sandbox_instances_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table rag.context_item_suggestions drop constraint context_item_suggestions_organization_id_fkey, add constraint context_item_suggestions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table rag.data_stores drop constraint data_stores_organization_id_fkey, add constraint data_stores_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table rag.embedding_cache drop constraint embedding_cache_organization_id_fkey, add constraint embedding_cache_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
