-- additive: yes
-- Three nullable/defaulted columns and one partial unique index on custom.base_snapshot. Nothing dropped, revoked, or granted; no function replaced.
-- lane: FIX-SNAP3
-- lock: custom
-- Inverse: migrations/inverse/20261020050000_snapjob_a_a_snapshot_job_records_its_own_row_down.sql
-- (no based-on line: table DDL only, no function, trigger or view is replaced)
--
-- FIX-SNAP3 - A SNAPSHOT JOB RECORDS ITS OWN ROW.
-- The server snapshot job (aidream services/base_move_job/snapshot.py, bases above records.base_move_direct_max_rows) made the
-- put-away copies, and the OPEN PAGE wrote this row afterwards. A person who left the page mid-job got copies and no snapshot
-- (live walk 2026-10-19). Now the job writes the row itself, in the same transaction as its copies, through ONE helper the weekly
-- schedule uses too (aidream services/base_snapshots/service.py record_snapshot).
--   job_id   the runtime.global_execution id of the job that made it; one snapshot per job (a page that also writes it is a no-op).
--   state    done | failed. A job that fails writes a failed row (no tables) so the page shows it on its next open.
--   failure  the sentence the job stopped with (state failed only).
ALTER TABLE custom.base_snapshot ADD COLUMN IF NOT EXISTS job_id uuid;
ALTER TABLE custom.base_snapshot ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'done';
ALTER TABLE custom.base_snapshot ADD COLUMN IF NOT EXISTS failure text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'base_snapshot_state_check' AND conrelid = 'custom.base_snapshot'::regclass) THEN
    ALTER TABLE custom.base_snapshot ADD CONSTRAINT base_snapshot_state_check CHECK (state IN ('done', 'failed'));
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS base_snapshot_one_per_job ON custom.base_snapshot (job_id) WHERE job_id IS NOT NULL;
COMMENT ON COLUMN custom.base_snapshot.job_id IS 'The server job (runtime.global_execution) that made this snapshot; one snapshot per job.';
COMMENT ON COLUMN custom.base_snapshot.state IS 'done | failed: a job that stopped leaves a failed row (no tables) the Snapshots dialog shows.';
COMMENT ON COLUMN custom.base_snapshot.failure IS 'The sentence a failed snapshot stopped with.';
