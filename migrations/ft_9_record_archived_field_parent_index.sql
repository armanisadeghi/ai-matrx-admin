-- FT3 (2026-10-22): archived Fields by their Table: (organization_id, data->>'entity_definition_id') over archived
-- Fields only (~100k rows). Lets the Trash Field kind and the context_item kind probe archived Fields per live /
-- context Table instead of walking every archived Field the person made (admin 33k rows, 21k-123k blocks).
-- Same partitioned shape as ft_3 / ft_8.
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p00_archived_field_parent_idx
  ON custom.record_p00 (organization_id, (data ->> 'entity_definition_id'))
  WHERE data_class = 'field' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p01_archived_field_parent_idx
  ON custom.record_p01 (organization_id, (data ->> 'entity_definition_id'))
  WHERE data_class = 'field' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p02_archived_field_parent_idx
  ON custom.record_p02 (organization_id, (data ->> 'entity_definition_id'))
  WHERE data_class = 'field' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p03_archived_field_parent_idx
  ON custom.record_p03 (organization_id, (data ->> 'entity_definition_id'))
  WHERE data_class = 'field' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p04_archived_field_parent_idx
  ON custom.record_p04 (organization_id, (data ->> 'entity_definition_id'))
  WHERE data_class = 'field' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p05_archived_field_parent_idx
  ON custom.record_p05 (organization_id, (data ->> 'entity_definition_id'))
  WHERE data_class = 'field' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p06_archived_field_parent_idx
  ON custom.record_p06 (organization_id, (data ->> 'entity_definition_id'))
  WHERE data_class = 'field' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p07_archived_field_parent_idx
  ON custom.record_p07 (organization_id, (data ->> 'entity_definition_id'))
  WHERE data_class = 'field' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p08_archived_field_parent_idx
  ON custom.record_p08 (organization_id, (data ->> 'entity_definition_id'))
  WHERE data_class = 'field' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p09_archived_field_parent_idx
  ON custom.record_p09 (organization_id, (data ->> 'entity_definition_id'))
  WHERE data_class = 'field' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p10_archived_field_parent_idx
  ON custom.record_p10 (organization_id, (data ->> 'entity_definition_id'))
  WHERE data_class = 'field' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p11_archived_field_parent_idx
  ON custom.record_p11 (organization_id, (data ->> 'entity_definition_id'))
  WHERE data_class = 'field' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p12_archived_field_parent_idx
  ON custom.record_p12 (organization_id, (data ->> 'entity_definition_id'))
  WHERE data_class = 'field' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p13_archived_field_parent_idx
  ON custom.record_p13 (organization_id, (data ->> 'entity_definition_id'))
  WHERE data_class = 'field' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p14_archived_field_parent_idx
  ON custom.record_p14 (organization_id, (data ->> 'entity_definition_id'))
  WHERE data_class = 'field' AND deleted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p15_archived_field_parent_idx
  ON custom.record_p15 (organization_id, (data ->> 'entity_definition_id'))
  WHERE data_class = 'field' AND deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS record_archived_field_parent_idx ON ONLY custom.record (organization_id, (data ->> 'entity_definition_id')) WHERE data_class = 'field' AND deleted_at IS NOT NULL;
ALTER INDEX custom.record_archived_field_parent_idx ATTACH PARTITION custom.record_p00_archived_field_parent_idx;
ALTER INDEX custom.record_archived_field_parent_idx ATTACH PARTITION custom.record_p01_archived_field_parent_idx;
ALTER INDEX custom.record_archived_field_parent_idx ATTACH PARTITION custom.record_p02_archived_field_parent_idx;
ALTER INDEX custom.record_archived_field_parent_idx ATTACH PARTITION custom.record_p03_archived_field_parent_idx;
ALTER INDEX custom.record_archived_field_parent_idx ATTACH PARTITION custom.record_p04_archived_field_parent_idx;
ALTER INDEX custom.record_archived_field_parent_idx ATTACH PARTITION custom.record_p05_archived_field_parent_idx;
ALTER INDEX custom.record_archived_field_parent_idx ATTACH PARTITION custom.record_p06_archived_field_parent_idx;
ALTER INDEX custom.record_archived_field_parent_idx ATTACH PARTITION custom.record_p07_archived_field_parent_idx;
ALTER INDEX custom.record_archived_field_parent_idx ATTACH PARTITION custom.record_p08_archived_field_parent_idx;
ALTER INDEX custom.record_archived_field_parent_idx ATTACH PARTITION custom.record_p09_archived_field_parent_idx;
ALTER INDEX custom.record_archived_field_parent_idx ATTACH PARTITION custom.record_p10_archived_field_parent_idx;
ALTER INDEX custom.record_archived_field_parent_idx ATTACH PARTITION custom.record_p11_archived_field_parent_idx;
ALTER INDEX custom.record_archived_field_parent_idx ATTACH PARTITION custom.record_p12_archived_field_parent_idx;
ALTER INDEX custom.record_archived_field_parent_idx ATTACH PARTITION custom.record_p13_archived_field_parent_idx;
ALTER INDEX custom.record_archived_field_parent_idx ATTACH PARTITION custom.record_p14_archived_field_parent_idx;
ALTER INDEX custom.record_archived_field_parent_idx ATTACH PARTITION custom.record_p15_archived_field_parent_idx;
