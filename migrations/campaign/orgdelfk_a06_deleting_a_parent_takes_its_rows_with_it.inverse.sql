-- chair-step: INVERSE of orgdelfk_a06_deleting_a_parent_takes_its_rows_with_it.sql. Puts the 11 keys back to ON DELETE SET NULL exactly as they were (same names, same validity). This restores the broken state on purpose: deleting a parent that owns a row in one of these tables fails again with 23502.
-- lock: iam
-- lane: ORG-DELETE-FK

alter table rag.embeddings_oai_3_small_1536 drop constraint embeddings_oai_3_small_1536_organization_id_fkey, add constraint embeddings_oai_3_small_1536_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table rag.embeddings_voyage_code_3_1024 drop constraint embeddings_voyage_code_3_1024_organization_id_fkey, add constraint embeddings_voyage_code_3_1024_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table rag.kg_alerts drop constraint kg_alerts_organization_id_fkey, add constraint kg_alerts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table rag.kg_chunk_entities drop constraint kg_chunk_entities_organization_id_fkey, add constraint kg_chunk_entities_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table rag.kg_chunks drop constraint kg_chunks_organization_id_fkey, add constraint kg_chunks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table rag.kg_clusters drop constraint kg_clusters_organization_id_fkey, add constraint kg_clusters_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table rag.kg_edges drop constraint kg_edges_organization_id_fkey, add constraint kg_edges_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table rag.kg_entities drop constraint kg_entities_organization_id_fkey, add constraint kg_entities_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table rag.kg_entity_aliases drop constraint kg_entity_aliases_organization_id_fkey, add constraint kg_entity_aliases_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table rag.kg_value_matches drop constraint kg_value_matches_organization_id_fkey, add constraint kg_value_matches_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table rag.ner_canonicalizer_shadow drop constraint ner_canonicalizer_shadow_organization_id_fkey, add constraint ner_canonicalizer_shadow_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id) ON DELETE SET NULL NOT VALID;
alter table rag.kg_chunks validate constraint kg_chunks_organization_id_fkey;
alter table rag.kg_clusters validate constraint kg_clusters_organization_id_fkey;
alter table rag.kg_entities validate constraint kg_entities_organization_id_fkey;
alter table rag.kg_entity_aliases validate constraint kg_entity_aliases_organization_id_fkey;
