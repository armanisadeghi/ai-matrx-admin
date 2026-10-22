-- FT3 (2026-10-22): the live Tables (custom.record data_class='table', not archived), ~10k of 570k rows. Every Trash
-- check 'is this Field/Rule/template/dashboard/Record's Table still live' probed the primary key and the heap of a
-- 570k-row table (test@test.com's Field listing: 532k blocks). A partial index makes the probe index-only on a tiny
-- index, and lets public._trash_store_children start from the live Tables (ft_10). custom.record is HASH-partitioned
-- (16): each partition CONCURRENTLY, then the parent ON ONLY and each partition's index attached (ft_3's shape).
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p00_live_table_idx
  ON custom.record_p00 (organization_id, id)
  WHERE data_class = 'table' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p01_live_table_idx
  ON custom.record_p01 (organization_id, id)
  WHERE data_class = 'table' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p02_live_table_idx
  ON custom.record_p02 (organization_id, id)
  WHERE data_class = 'table' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p03_live_table_idx
  ON custom.record_p03 (organization_id, id)
  WHERE data_class = 'table' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p04_live_table_idx
  ON custom.record_p04 (organization_id, id)
  WHERE data_class = 'table' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p05_live_table_idx
  ON custom.record_p05 (organization_id, id)
  WHERE data_class = 'table' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p06_live_table_idx
  ON custom.record_p06 (organization_id, id)
  WHERE data_class = 'table' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p07_live_table_idx
  ON custom.record_p07 (organization_id, id)
  WHERE data_class = 'table' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p08_live_table_idx
  ON custom.record_p08 (organization_id, id)
  WHERE data_class = 'table' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p09_live_table_idx
  ON custom.record_p09 (organization_id, id)
  WHERE data_class = 'table' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p10_live_table_idx
  ON custom.record_p10 (organization_id, id)
  WHERE data_class = 'table' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p11_live_table_idx
  ON custom.record_p11 (organization_id, id)
  WHERE data_class = 'table' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p12_live_table_idx
  ON custom.record_p12 (organization_id, id)
  WHERE data_class = 'table' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p13_live_table_idx
  ON custom.record_p13 (organization_id, id)
  WHERE data_class = 'table' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p14_live_table_idx
  ON custom.record_p14 (organization_id, id)
  WHERE data_class = 'table' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p15_live_table_idx
  ON custom.record_p15 (organization_id, id)
  WHERE data_class = 'table' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS record_live_table_idx ON ONLY custom.record (organization_id, id) WHERE data_class = 'table' AND deleted_at IS NULL;
ALTER INDEX custom.record_live_table_idx ATTACH PARTITION custom.record_p00_live_table_idx;
ALTER INDEX custom.record_live_table_idx ATTACH PARTITION custom.record_p01_live_table_idx;
ALTER INDEX custom.record_live_table_idx ATTACH PARTITION custom.record_p02_live_table_idx;
ALTER INDEX custom.record_live_table_idx ATTACH PARTITION custom.record_p03_live_table_idx;
ALTER INDEX custom.record_live_table_idx ATTACH PARTITION custom.record_p04_live_table_idx;
ALTER INDEX custom.record_live_table_idx ATTACH PARTITION custom.record_p05_live_table_idx;
ALTER INDEX custom.record_live_table_idx ATTACH PARTITION custom.record_p06_live_table_idx;
ALTER INDEX custom.record_live_table_idx ATTACH PARTITION custom.record_p07_live_table_idx;
ALTER INDEX custom.record_live_table_idx ATTACH PARTITION custom.record_p08_live_table_idx;
ALTER INDEX custom.record_live_table_idx ATTACH PARTITION custom.record_p09_live_table_idx;
ALTER INDEX custom.record_live_table_idx ATTACH PARTITION custom.record_p10_live_table_idx;
ALTER INDEX custom.record_live_table_idx ATTACH PARTITION custom.record_p11_live_table_idx;
ALTER INDEX custom.record_live_table_idx ATTACH PARTITION custom.record_p12_live_table_idx;
ALTER INDEX custom.record_live_table_idx ATTACH PARTITION custom.record_p13_live_table_idx;
ALTER INDEX custom.record_live_table_idx ATTACH PARTITION custom.record_p14_live_table_idx;
ALTER INDEX custom.record_live_table_idx ATTACH PARTITION custom.record_p15_live_table_idx;
