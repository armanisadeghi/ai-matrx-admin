-- FT-2 (2026-10-21): Trash reads stop scanning every row a person ever made. custom.record had no index for
-- "archived rows of one kind, newest first": every Trash kind read (table, record, field, rule, link, dashboard,
-- template, scope, context item) walked the whole created_by / updated_by index and filtered deleted_at and
-- data_class row by row (150-700 ms each for a person with ~27k archived rows; the overview ran them all, 6 s).
-- Two partial indexes, only over archived rows, ordered the way Trash pages: (owner, kind, deleted_at desc, id).
-- custom.record is HASH-partitioned (16): each partition CONCURRENTLY (writes never wait), then the parent index
-- ON ONLY (catalog-only) and each partition's index attached - the shape of dblanea_inbox_indexes_on_record.sql.
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p00_trash_made_idx
  ON custom.record_p00 (created_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p00_trash_removed_idx
  ON custom.record_p00 (updated_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p01_trash_made_idx
  ON custom.record_p01 (created_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p01_trash_removed_idx
  ON custom.record_p01 (updated_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p02_trash_made_idx
  ON custom.record_p02 (created_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p02_trash_removed_idx
  ON custom.record_p02 (updated_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p03_trash_made_idx
  ON custom.record_p03 (created_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p03_trash_removed_idx
  ON custom.record_p03 (updated_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p04_trash_made_idx
  ON custom.record_p04 (created_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p04_trash_removed_idx
  ON custom.record_p04 (updated_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p05_trash_made_idx
  ON custom.record_p05 (created_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p05_trash_removed_idx
  ON custom.record_p05 (updated_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p06_trash_made_idx
  ON custom.record_p06 (created_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p06_trash_removed_idx
  ON custom.record_p06 (updated_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p07_trash_made_idx
  ON custom.record_p07 (created_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p07_trash_removed_idx
  ON custom.record_p07 (updated_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p08_trash_made_idx
  ON custom.record_p08 (created_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p08_trash_removed_idx
  ON custom.record_p08 (updated_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p09_trash_made_idx
  ON custom.record_p09 (created_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p09_trash_removed_idx
  ON custom.record_p09 (updated_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p10_trash_made_idx
  ON custom.record_p10 (created_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p10_trash_removed_idx
  ON custom.record_p10 (updated_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p11_trash_made_idx
  ON custom.record_p11 (created_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p11_trash_removed_idx
  ON custom.record_p11 (updated_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p12_trash_made_idx
  ON custom.record_p12 (created_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p12_trash_removed_idx
  ON custom.record_p12 (updated_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p13_trash_made_idx
  ON custom.record_p13 (created_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p13_trash_removed_idx
  ON custom.record_p13 (updated_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p14_trash_made_idx
  ON custom.record_p14 (created_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p14_trash_removed_idx
  ON custom.record_p14 (updated_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p15_trash_made_idx
  ON custom.record_p15 (created_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p15_trash_removed_idx
  ON custom.record_p15 (updated_by, data_class, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS record_trash_made_idx ON ONLY custom.record (created_by, data_class, deleted_at DESC, id) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS record_trash_removed_idx ON ONLY custom.record (updated_by, data_class, deleted_at DESC, id) WHERE deleted_at IS NOT NULL;
ALTER INDEX custom.record_trash_made_idx ATTACH PARTITION custom.record_p00_trash_made_idx;
ALTER INDEX custom.record_trash_removed_idx ATTACH PARTITION custom.record_p00_trash_removed_idx;
ALTER INDEX custom.record_trash_made_idx ATTACH PARTITION custom.record_p01_trash_made_idx;
ALTER INDEX custom.record_trash_removed_idx ATTACH PARTITION custom.record_p01_trash_removed_idx;
ALTER INDEX custom.record_trash_made_idx ATTACH PARTITION custom.record_p02_trash_made_idx;
ALTER INDEX custom.record_trash_removed_idx ATTACH PARTITION custom.record_p02_trash_removed_idx;
ALTER INDEX custom.record_trash_made_idx ATTACH PARTITION custom.record_p03_trash_made_idx;
ALTER INDEX custom.record_trash_removed_idx ATTACH PARTITION custom.record_p03_trash_removed_idx;
ALTER INDEX custom.record_trash_made_idx ATTACH PARTITION custom.record_p04_trash_made_idx;
ALTER INDEX custom.record_trash_removed_idx ATTACH PARTITION custom.record_p04_trash_removed_idx;
ALTER INDEX custom.record_trash_made_idx ATTACH PARTITION custom.record_p05_trash_made_idx;
ALTER INDEX custom.record_trash_removed_idx ATTACH PARTITION custom.record_p05_trash_removed_idx;
ALTER INDEX custom.record_trash_made_idx ATTACH PARTITION custom.record_p06_trash_made_idx;
ALTER INDEX custom.record_trash_removed_idx ATTACH PARTITION custom.record_p06_trash_removed_idx;
ALTER INDEX custom.record_trash_made_idx ATTACH PARTITION custom.record_p07_trash_made_idx;
ALTER INDEX custom.record_trash_removed_idx ATTACH PARTITION custom.record_p07_trash_removed_idx;
ALTER INDEX custom.record_trash_made_idx ATTACH PARTITION custom.record_p08_trash_made_idx;
ALTER INDEX custom.record_trash_removed_idx ATTACH PARTITION custom.record_p08_trash_removed_idx;
ALTER INDEX custom.record_trash_made_idx ATTACH PARTITION custom.record_p09_trash_made_idx;
ALTER INDEX custom.record_trash_removed_idx ATTACH PARTITION custom.record_p09_trash_removed_idx;
ALTER INDEX custom.record_trash_made_idx ATTACH PARTITION custom.record_p10_trash_made_idx;
ALTER INDEX custom.record_trash_removed_idx ATTACH PARTITION custom.record_p10_trash_removed_idx;
ALTER INDEX custom.record_trash_made_idx ATTACH PARTITION custom.record_p11_trash_made_idx;
ALTER INDEX custom.record_trash_removed_idx ATTACH PARTITION custom.record_p11_trash_removed_idx;
ALTER INDEX custom.record_trash_made_idx ATTACH PARTITION custom.record_p12_trash_made_idx;
ALTER INDEX custom.record_trash_removed_idx ATTACH PARTITION custom.record_p12_trash_removed_idx;
ALTER INDEX custom.record_trash_made_idx ATTACH PARTITION custom.record_p13_trash_made_idx;
ALTER INDEX custom.record_trash_removed_idx ATTACH PARTITION custom.record_p13_trash_removed_idx;
ALTER INDEX custom.record_trash_made_idx ATTACH PARTITION custom.record_p14_trash_made_idx;
ALTER INDEX custom.record_trash_removed_idx ATTACH PARTITION custom.record_p14_trash_removed_idx;
ALTER INDEX custom.record_trash_made_idx ATTACH PARTITION custom.record_p15_trash_made_idx;
ALTER INDEX custom.record_trash_removed_idx ATTACH PARTITION custom.record_p15_trash_removed_idx;
