-- chair-step: inverse of migrations/20261020080000_restorejob_a_a_restore_job_records_its_own_base.sql - drops the last_restore column (restored bases stay; only the record of the newest restore goes).
ALTER TABLE custom.base_snapshot DROP COLUMN IF EXISTS last_restore;
