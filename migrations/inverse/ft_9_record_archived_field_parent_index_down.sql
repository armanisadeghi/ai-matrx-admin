-- chair-step: FT3 inverse - drops the archived-Field-by-Table index (the parent cascades to every partition index).
DROP INDEX IF EXISTS custom.record_archived_field_parent_idx;
