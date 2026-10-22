-- chair-step: Online NOT NULL for the new id columns lane E added in canon2_e1 (6 tables). Every row was backfilled in 1000-5000-row batches first and every new row gets gen_random_uuid() by default, so SET NOT NULL changes no data; the temporary CHECK constraint each SET NOT NULL rides on is dropped right after. Nothing else here is non-additive.
--
-- lane: canonicalization wave 2, lane E (big tables). Online step 2 of 2. AUTOCOMMIT file (CREATE INDEX
-- CONCURRENTLY): apply with aidream `python db/apply_migrations.py --source matrx-frontend --only <this file>`, which sends
-- one statement at a time. Lock profile: unique indexes built CONCURRENTLY (no write block); NOT NULL via
-- CHECK ... NOT VALID + VALIDATE (SHARE UPDATE EXCLUSIVE, no write block) so SET NOT NULL skips its scan;
-- FK VALIDATE runs under SHARE UPDATE EXCLUSIVE too. Access is unchanged: no policy, grant or registry row is touched.
set lock_timeout = '2s';

create unique index concurrently if not exists embeddings_voyage_4_large_1024_id_key on rag.embeddings_voyage_4_large_1024 (id);
create unique index concurrently if not exists embeddings_oai_3_small_1536_id_key on rag.embeddings_oai_3_small_1536 (id);
create unique index concurrently if not exists embeddings_google_gemini_2_1536_id_key on rag.embeddings_google_gemini_2_1536 (id);
create unique index concurrently if not exists embeddings_voyage_code_3_1024_id_key on rag.embeddings_voyage_code_3_1024 (id);
create unique index concurrently if not exists keyword_classification_queue_id_key on seo.keyword_classification_queue (id);
create unique index concurrently if not exists topic_placement_queue_id_key on seo.topic_placement_queue (id);
alter table rag.embeddings_voyage_4_large_1024 add constraint embeddings_voyage_4_large_1024_id_present check (id is not null) not valid;
alter table rag.embeddings_voyage_4_large_1024 validate constraint embeddings_voyage_4_large_1024_id_present;
alter table rag.embeddings_voyage_4_large_1024 alter column id set not null;
alter table rag.embeddings_voyage_4_large_1024 drop constraint embeddings_voyage_4_large_1024_id_present;
alter table rag.embeddings_oai_3_small_1536 add constraint embeddings_oai_3_small_1536_id_present check (id is not null) not valid;
alter table rag.embeddings_oai_3_small_1536 validate constraint embeddings_oai_3_small_1536_id_present;
alter table rag.embeddings_oai_3_small_1536 alter column id set not null;
alter table rag.embeddings_oai_3_small_1536 drop constraint embeddings_oai_3_small_1536_id_present;
alter table rag.embeddings_google_gemini_2_1536 add constraint embeddings_google_gemini_2_1536_id_present check (id is not null) not valid;
alter table rag.embeddings_google_gemini_2_1536 validate constraint embeddings_google_gemini_2_1536_id_present;
alter table rag.embeddings_google_gemini_2_1536 alter column id set not null;
alter table rag.embeddings_google_gemini_2_1536 drop constraint embeddings_google_gemini_2_1536_id_present;
alter table rag.embeddings_voyage_code_3_1024 add constraint embeddings_voyage_code_3_1024_id_present check (id is not null) not valid;
alter table rag.embeddings_voyage_code_3_1024 validate constraint embeddings_voyage_code_3_1024_id_present;
alter table rag.embeddings_voyage_code_3_1024 alter column id set not null;
alter table rag.embeddings_voyage_code_3_1024 drop constraint embeddings_voyage_code_3_1024_id_present;
alter table seo.keyword_classification_queue add constraint keyword_classification_queue_id_present check (id is not null) not valid;
alter table seo.keyword_classification_queue validate constraint keyword_classification_queue_id_present;
alter table seo.keyword_classification_queue alter column id set not null;
alter table seo.keyword_classification_queue drop constraint keyword_classification_queue_id_present;
alter table seo.topic_placement_queue add constraint topic_placement_queue_id_present check (id is not null) not valid;
alter table seo.topic_placement_queue validate constraint topic_placement_queue_id_present;
alter table seo.topic_placement_queue alter column id set not null;
alter table seo.topic_placement_queue drop constraint topic_placement_queue_id_present;

-- the FKs canon2_e1/e1b added NOT VALID (0 orphan rows measured before adding them)
alter table rag.embeddings_voyage_4_large_1024 validate constraint embeddings_voyage_4_large_1024_organization_id_fkey;
alter table rag.embeddings_google_gemini_2_1536 validate constraint embeddings_google_gemini_2_1536_organization_id_fkey;
alter table ops.app_log validate constraint app_log_created_by_fkey;
alter table ops.app_log validate constraint app_log_updated_by_fkey;

-- seo.topic_placement_queue: every writer already sets updated_at = now(), so _touch_row changes no behavior.
-- (Not attached to keyword_classification_queue: seo.fn_backfill_keyword_places updates it WITHOUT touching
-- updated_at, and keyword_classification_status reports max(updated_at) as refreshed_at — attaching it would move that.)
create trigger _touch_row before insert or update on seo.topic_placement_queue for each row execute function platform._touch_row();
