-- chair-step: SWAPS 3 foreign keys from ON DELETE SET NULL to ON DELETE CASCADE (drop + re-add of each key under its own name, NOT VALID, one statement per key). Each key sits on a NOT NULL column, so SET NULL could never run: deleting the parent raised 23502. No row is touched. Inverse: migrations/campaign/orgdelfk_a10_deleting_a_parent_takes_its_rows_with_it.inverse.sql.
-- lock: iam
-- lane: ORG-DELETE-FK
--
-- Batch 10 of 10: communication.meet_notes, communication.meet_recordings, communication.meet_transcript_segments.
-- Lock cost: dropping a foreign key takes ACCESS EXCLUSIVE on the parent (measured 2026-10-22 in a rolled-back
-- transaction on iam.org_member_controls), so batches stay small and VALIDATE runs separately in
-- orgdelfk_v_the_cascading_keys_are_validated.sql (SHARE UPDATE EXCLUSIVE only). Keys that were NOT VALID before stay NOT VALID.
-- Guard: aidream db/tests/test_no_set_null_fk_on_a_not_null_column.py.
-- A key without a covering index first gets one (platform._provision_shape_settled refuses an unindexed key at COMMIT; every one of these tables is under 2 MB, so the plain build takes milliseconds). The inverse leaves those indexes in place.

alter table communication.meet_notes drop constraint meet_notes_session_id_fkey, add constraint meet_notes_session_id_fkey FOREIGN KEY (session_id) REFERENCES communication.meet_sessions(id) ON DELETE CASCADE NOT VALID;
alter table communication.meet_recordings drop constraint meet_recordings_session_id_fkey, add constraint meet_recordings_session_id_fkey FOREIGN KEY (session_id) REFERENCES communication.meet_sessions(id) ON DELETE CASCADE NOT VALID;
alter table communication.meet_transcript_segments drop constraint meet_transcript_segments_session_id_fkey, add constraint meet_transcript_segments_session_id_fkey FOREIGN KEY (session_id) REFERENCES communication.meet_sessions(id) ON DELETE CASCADE NOT VALID;
