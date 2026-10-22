-- chair-step: INVERSE of orgdelfk_a10_deleting_a_parent_takes_its_rows_with_it.sql. Puts the 3 keys back to ON DELETE SET NULL exactly as they were (same names, same validity). This restores the broken state on purpose: deleting a parent that owns a row in one of these tables fails again with 23502.
-- lock: iam
-- lane: ORG-DELETE-FK

alter table communication.meet_notes drop constraint meet_notes_session_id_fkey, add constraint meet_notes_session_id_fkey FOREIGN KEY (session_id) REFERENCES communication.meet_sessions(id) ON DELETE SET NULL NOT VALID;
alter table communication.meet_recordings drop constraint meet_recordings_session_id_fkey, add constraint meet_recordings_session_id_fkey FOREIGN KEY (session_id) REFERENCES communication.meet_sessions(id) ON DELETE SET NULL NOT VALID;
alter table communication.meet_transcript_segments drop constraint meet_transcript_segments_session_id_fkey, add constraint meet_transcript_segments_session_id_fkey FOREIGN KEY (session_id) REFERENCES communication.meet_sessions(id) ON DELETE SET NULL NOT VALID;
alter table communication.meet_notes validate constraint meet_notes_session_id_fkey;
alter table communication.meet_recordings validate constraint meet_recordings_session_id_fkey;
alter table communication.meet_transcript_segments validate constraint meet_transcript_segments_session_id_fkey;
