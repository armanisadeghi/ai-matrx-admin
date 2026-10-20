-- additive: yes
-- One nullable column on custom.base_snapshot. Nothing dropped, revoked, or granted; no function replaced.
-- lane: FIX-RESTORE
-- lock: custom
-- Inverse: migrations/inverse/20261020080000_restorejob_a_a_restore_job_records_its_own_base_down.sql
-- (no based-on line: table DDL only, no function, trigger or view is replaced)
--
-- FIX-RESTORE - A RESTORE JOB RECORDS ITS OWN BASE AND ITS OWN STOP.
-- The server restore job (aidream services/base_move_job/snapshot.py) made the restored tables and their new Home, and the OPEN
-- PAGE named the new base (saveBase) afterwards. A person who left the page mid-restore got an unnamed Home and no restored base
-- in the list; a restore that stopped said so only to a page that was still open. Now the job writes the custom.base row itself
-- in the same transaction as its copies (aidream services/base_snapshots/service.py record_restore), and marks the snapshot it
-- restored from:
--   last_restore  {job_id, state: done|failed, home_id (done), base_id (done), failure (failed), at}. The Snapshots dialog shows
--                 a failed one on its next open; the next restore of the same snapshot replaces it.
ALTER TABLE custom.base_snapshot ADD COLUMN IF NOT EXISTS last_restore jsonb;
COMMENT ON COLUMN custom.base_snapshot.last_restore IS 'The newest restore job of this snapshot: {job_id, state done|failed, home_id, base_id, failure, at}.';
