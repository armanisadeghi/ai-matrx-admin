-- FT3 (2026-10-22): the personal Trash 'passage_link' read (platform.associations, role anchored_to, removed on its own,
-- by the person) used associations_unique on role - a full index walk of 7,300 blocks (9.8k blocks with the heap);
-- 2.9 s on a cold cache, the largest single cost of the /trash Recent overview's first call. A partial index that
-- holds exactly those rows in the listing order: 0.06 ms, 2 blocks. Not partitioned: one CONCURRENTLY build.
CREATE INDEX CONCURRENTLY IF NOT EXISTS associations_passage_link_trash_idx
  ON platform.associations (created_by, deleted_at DESC, id)
  WHERE role = 'anchored_to' AND deleted_at IS NOT NULL AND deleted_via_type IS NULL;
