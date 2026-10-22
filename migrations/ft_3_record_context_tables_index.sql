-- FT2-1 (2026-10-21): the three Trash context kinds (scope type, scope, context item) start from the ~225 context
-- Tables (custom.record data_class='table', data->>'kept_for'='context'). No index served that predicate, so every
-- call seq-scanned all 16 partitions (570k rows, ~200 ms) before reading one archived row. A partial index over
-- just those Tables. custom.record is HASH-partitioned (16): each partition CONCURRENTLY, then the parent index
-- ON ONLY and each partition's index attached (the shape of ft_2_record_archived_rows_indexes.sql).
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p00_context_table_idx
  ON custom.record_p00 (organization_id, id)
  WHERE data_class = 'table' AND (data ->> 'kept_for') = 'context';
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p01_context_table_idx
  ON custom.record_p01 (organization_id, id)
  WHERE data_class = 'table' AND (data ->> 'kept_for') = 'context';
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p02_context_table_idx
  ON custom.record_p02 (organization_id, id)
  WHERE data_class = 'table' AND (data ->> 'kept_for') = 'context';
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p03_context_table_idx
  ON custom.record_p03 (organization_id, id)
  WHERE data_class = 'table' AND (data ->> 'kept_for') = 'context';
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p04_context_table_idx
  ON custom.record_p04 (organization_id, id)
  WHERE data_class = 'table' AND (data ->> 'kept_for') = 'context';
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p05_context_table_idx
  ON custom.record_p05 (organization_id, id)
  WHERE data_class = 'table' AND (data ->> 'kept_for') = 'context';
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p06_context_table_idx
  ON custom.record_p06 (organization_id, id)
  WHERE data_class = 'table' AND (data ->> 'kept_for') = 'context';
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p07_context_table_idx
  ON custom.record_p07 (organization_id, id)
  WHERE data_class = 'table' AND (data ->> 'kept_for') = 'context';
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p08_context_table_idx
  ON custom.record_p08 (organization_id, id)
  WHERE data_class = 'table' AND (data ->> 'kept_for') = 'context';
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p09_context_table_idx
  ON custom.record_p09 (organization_id, id)
  WHERE data_class = 'table' AND (data ->> 'kept_for') = 'context';
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p10_context_table_idx
  ON custom.record_p10 (organization_id, id)
  WHERE data_class = 'table' AND (data ->> 'kept_for') = 'context';
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p11_context_table_idx
  ON custom.record_p11 (organization_id, id)
  WHERE data_class = 'table' AND (data ->> 'kept_for') = 'context';
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p12_context_table_idx
  ON custom.record_p12 (organization_id, id)
  WHERE data_class = 'table' AND (data ->> 'kept_for') = 'context';
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p13_context_table_idx
  ON custom.record_p13 (organization_id, id)
  WHERE data_class = 'table' AND (data ->> 'kept_for') = 'context';
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p14_context_table_idx
  ON custom.record_p14 (organization_id, id)
  WHERE data_class = 'table' AND (data ->> 'kept_for') = 'context';
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p15_context_table_idx
  ON custom.record_p15 (organization_id, id)
  WHERE data_class = 'table' AND (data ->> 'kept_for') = 'context';
CREATE INDEX IF NOT EXISTS record_context_table_idx ON ONLY custom.record (organization_id, id) WHERE data_class = 'table' AND (data ->> 'kept_for') = 'context';
ALTER INDEX custom.record_context_table_idx ATTACH PARTITION custom.record_p00_context_table_idx;
ALTER INDEX custom.record_context_table_idx ATTACH PARTITION custom.record_p01_context_table_idx;
ALTER INDEX custom.record_context_table_idx ATTACH PARTITION custom.record_p02_context_table_idx;
ALTER INDEX custom.record_context_table_idx ATTACH PARTITION custom.record_p03_context_table_idx;
ALTER INDEX custom.record_context_table_idx ATTACH PARTITION custom.record_p04_context_table_idx;
ALTER INDEX custom.record_context_table_idx ATTACH PARTITION custom.record_p05_context_table_idx;
ALTER INDEX custom.record_context_table_idx ATTACH PARTITION custom.record_p06_context_table_idx;
ALTER INDEX custom.record_context_table_idx ATTACH PARTITION custom.record_p07_context_table_idx;
ALTER INDEX custom.record_context_table_idx ATTACH PARTITION custom.record_p08_context_table_idx;
ALTER INDEX custom.record_context_table_idx ATTACH PARTITION custom.record_p09_context_table_idx;
ALTER INDEX custom.record_context_table_idx ATTACH PARTITION custom.record_p10_context_table_idx;
ALTER INDEX custom.record_context_table_idx ATTACH PARTITION custom.record_p11_context_table_idx;
ALTER INDEX custom.record_context_table_idx ATTACH PARTITION custom.record_p12_context_table_idx;
ALTER INDEX custom.record_context_table_idx ATTACH PARTITION custom.record_p13_context_table_idx;
ALTER INDEX custom.record_context_table_idx ATTACH PARTITION custom.record_p14_context_table_idx;
ALTER INDEX custom.record_context_table_idx ATTACH PARTITION custom.record_p15_context_table_idx;
