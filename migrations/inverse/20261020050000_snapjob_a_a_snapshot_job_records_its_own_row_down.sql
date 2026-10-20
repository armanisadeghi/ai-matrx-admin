-- chair-step: inverse of migrations/20261020050000_snapjob_a_a_snapshot_job_records_its_own_row.sql - drops the one-per-job index, the state check and the three columns (failed rows are trashed first so no half snapshot reads as done).
UPDATE custom.base_snapshot SET deleted_at = now() WHERE state = 'failed' AND deleted_at IS NULL;
DROP INDEX IF EXISTS custom.base_snapshot_one_per_job;
ALTER TABLE custom.base_snapshot DROP CONSTRAINT IF EXISTS base_snapshot_state_check;
ALTER TABLE custom.base_snapshot DROP COLUMN IF EXISTS failure;
ALTER TABLE custom.base_snapshot DROP COLUMN IF EXISTS state;
ALTER TABLE custom.base_snapshot DROP COLUMN IF EXISTS job_id;
