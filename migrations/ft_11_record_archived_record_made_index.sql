-- FT3 (2026-10-22): archived Records by who made them, carrying organization_id and table_id, so the Trash 'record'
-- kind walks a person's archived Records index-only and asks 'is its Table live' of the tiny record_live_table_idx
-- (ft_8) without touching the heap (test@test.com: 106k archived Records, 50 listed; 97k blocks before).
-- custom.record is HASH-partitioned (16): each partition CONCURRENTLY, then the parent ON ONLY + attach (ft_3's shape).
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p00_archived_record_made_idx
  ON custom.record_p00 (created_by, deleted_at DESC, id) INCLUDE (organization_id, table_id)
  WHERE data_class = 'record' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p01_archived_record_made_idx
  ON custom.record_p01 (created_by, deleted_at DESC, id) INCLUDE (organization_id, table_id)
  WHERE data_class = 'record' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p02_archived_record_made_idx
  ON custom.record_p02 (created_by, deleted_at DESC, id) INCLUDE (organization_id, table_id)
  WHERE data_class = 'record' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p03_archived_record_made_idx
  ON custom.record_p03 (created_by, deleted_at DESC, id) INCLUDE (organization_id, table_id)
  WHERE data_class = 'record' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p04_archived_record_made_idx
  ON custom.record_p04 (created_by, deleted_at DESC, id) INCLUDE (organization_id, table_id)
  WHERE data_class = 'record' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p05_archived_record_made_idx
  ON custom.record_p05 (created_by, deleted_at DESC, id) INCLUDE (organization_id, table_id)
  WHERE data_class = 'record' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p06_archived_record_made_idx
  ON custom.record_p06 (created_by, deleted_at DESC, id) INCLUDE (organization_id, table_id)
  WHERE data_class = 'record' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p07_archived_record_made_idx
  ON custom.record_p07 (created_by, deleted_at DESC, id) INCLUDE (organization_id, table_id)
  WHERE data_class = 'record' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p08_archived_record_made_idx
  ON custom.record_p08 (created_by, deleted_at DESC, id) INCLUDE (organization_id, table_id)
  WHERE data_class = 'record' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p09_archived_record_made_idx
  ON custom.record_p09 (created_by, deleted_at DESC, id) INCLUDE (organization_id, table_id)
  WHERE data_class = 'record' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p10_archived_record_made_idx
  ON custom.record_p10 (created_by, deleted_at DESC, id) INCLUDE (organization_id, table_id)
  WHERE data_class = 'record' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p11_archived_record_made_idx
  ON custom.record_p11 (created_by, deleted_at DESC, id) INCLUDE (organization_id, table_id)
  WHERE data_class = 'record' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p12_archived_record_made_idx
  ON custom.record_p12 (created_by, deleted_at DESC, id) INCLUDE (organization_id, table_id)
  WHERE data_class = 'record' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p13_archived_record_made_idx
  ON custom.record_p13 (created_by, deleted_at DESC, id) INCLUDE (organization_id, table_id)
  WHERE data_class = 'record' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p14_archived_record_made_idx
  ON custom.record_p14 (created_by, deleted_at DESC, id) INCLUDE (organization_id, table_id)
  WHERE data_class = 'record' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p15_archived_record_made_idx
  ON custom.record_p15 (created_by, deleted_at DESC, id) INCLUDE (organization_id, table_id)
  WHERE data_class = 'record' AND deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS record_archived_record_made_idx ON ONLY custom.record (created_by, deleted_at DESC, id) INCLUDE (organization_id, table_id) WHERE data_class = 'record' AND deleted_at IS NOT NULL;
ALTER INDEX custom.record_archived_record_made_idx ATTACH PARTITION custom.record_p00_archived_record_made_idx;
ALTER INDEX custom.record_archived_record_made_idx ATTACH PARTITION custom.record_p01_archived_record_made_idx;
ALTER INDEX custom.record_archived_record_made_idx ATTACH PARTITION custom.record_p02_archived_record_made_idx;
ALTER INDEX custom.record_archived_record_made_idx ATTACH PARTITION custom.record_p03_archived_record_made_idx;
ALTER INDEX custom.record_archived_record_made_idx ATTACH PARTITION custom.record_p04_archived_record_made_idx;
ALTER INDEX custom.record_archived_record_made_idx ATTACH PARTITION custom.record_p05_archived_record_made_idx;
ALTER INDEX custom.record_archived_record_made_idx ATTACH PARTITION custom.record_p06_archived_record_made_idx;
ALTER INDEX custom.record_archived_record_made_idx ATTACH PARTITION custom.record_p07_archived_record_made_idx;
ALTER INDEX custom.record_archived_record_made_idx ATTACH PARTITION custom.record_p08_archived_record_made_idx;
ALTER INDEX custom.record_archived_record_made_idx ATTACH PARTITION custom.record_p09_archived_record_made_idx;
ALTER INDEX custom.record_archived_record_made_idx ATTACH PARTITION custom.record_p10_archived_record_made_idx;
ALTER INDEX custom.record_archived_record_made_idx ATTACH PARTITION custom.record_p11_archived_record_made_idx;
ALTER INDEX custom.record_archived_record_made_idx ATTACH PARTITION custom.record_p12_archived_record_made_idx;
ALTER INDEX custom.record_archived_record_made_idx ATTACH PARTITION custom.record_p13_archived_record_made_idx;
ALTER INDEX custom.record_archived_record_made_idx ATTACH PARTITION custom.record_p14_archived_record_made_idx;
ALTER INDEX custom.record_archived_record_made_idx ATTACH PARTITION custom.record_p15_archived_record_made_idx;
