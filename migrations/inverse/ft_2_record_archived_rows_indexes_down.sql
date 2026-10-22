-- chair-step: FT-2 inverse - drops the two archived-row indexes (the parents cascade to every partition index).
DROP INDEX IF EXISTS custom.record_trash_made_idx;
DROP INDEX IF EXISTS custom.record_trash_removed_idx;
