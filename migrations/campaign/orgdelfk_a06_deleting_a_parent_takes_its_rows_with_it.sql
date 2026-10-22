-- chair-step: SWAPS 11 foreign keys from ON DELETE SET NULL to ON DELETE CASCADE (drop + re-add of each key under its own name, NOT VALID, one statement per key). Each key sits on a NOT NULL column, so SET NULL could never run: deleting the parent raised 23502. No row is touched. Inverse: migrations/campaign/orgdelfk_a06_deleting_a_parent_takes_its_rows_with_it.inverse.sql.
-- lock: iam
-- lane: ORG-DELETE-FK
--
-- Batch 6 of 10: rag.embeddings_oai_3_small_1536, rag.embeddings_voyage_code_3_1024, rag.kg_alerts, rag.kg_chunk_entities, rag.kg_chunks, rag.kg_clusters, rag.kg_edges, rag.kg_entities, rag.kg_entity_aliases, rag.kg_value_matches, rag.ner_canonicalizer_shadow.
-- Lock cost: dropping a foreign key takes ACCESS EXCLUSIVE on the parent (measured 2026-10-22 in a rolled-back
-- transaction on iam.org_member_controls), so batches stay small and VALIDATE runs separately in
-- orgdelfk_v_the_cascading_keys_are_validated.sql (SHARE UPDATE EXCLUSIVE only). Keys that were NOT VALID before stay NOT VALID.
-- Guard: aidream db/tests/test_no_set_null_fk_on_a_not_null_column.py.
-- A key without a covering index first gets one (platform._provision_shape_settled refuses an unindexed key at COMMIT; every one of these tables is under 2 MB, so the plain build takes milliseconds). The inverse leaves those indexes in place.

create index if not exists kg_alerts_organization_id_idx on rag.kg_alerts (organization_id);
create index if not exists kg_value_matches_organization_id_idx on rag.kg_value_matches (organization_id);
create index if not exists ner_canonicalizer_shadow_organization_id_idx on rag.ner_canonicalizer_shadow (organization_id);
alter table rag.embeddings_oai_3_small_1536 drop constraint embeddings_oai_3_small_1536_organization_id_fkey, add constraint embeddings_oai_3_small_1536_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table rag.embeddings_voyage_code_3_1024 drop constraint embeddings_voyage_code_3_1024_organization_id_fkey, add constraint embeddings_voyage_code_3_1024_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table rag.kg_alerts drop constraint kg_alerts_organization_id_fkey, add constraint kg_alerts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table rag.kg_chunk_entities drop constraint kg_chunk_entities_organization_id_fkey, add constraint kg_chunk_entities_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table rag.kg_chunks drop constraint kg_chunks_organization_id_fkey, add constraint kg_chunks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table rag.kg_clusters drop constraint kg_clusters_organization_id_fkey, add constraint kg_clusters_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table rag.kg_edges drop constraint kg_edges_organization_id_fkey, add constraint kg_edges_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table rag.kg_entities drop constraint kg_entities_organization_id_fkey, add constraint kg_entities_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table rag.kg_entity_aliases drop constraint kg_entity_aliases_organization_id_fkey, add constraint kg_entity_aliases_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table rag.kg_value_matches drop constraint kg_value_matches_organization_id_fkey, add constraint kg_value_matches_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
alter table rag.ner_canonicalizer_shadow drop constraint ner_canonicalizer_shadow_organization_id_fkey, add constraint ner_canonicalizer_shadow_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE CASCADE NOT VALID;
