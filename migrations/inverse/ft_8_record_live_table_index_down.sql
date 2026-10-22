-- chair-step: FT3 inverse - drops the live-Table index (the parent cascades to every partition index).
DROP INDEX IF EXISTS custom.record_live_table_idx;
