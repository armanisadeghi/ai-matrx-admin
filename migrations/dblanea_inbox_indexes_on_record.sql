-- DB LANE A (2026-10-21): the inbox badge and its reminder tick stop reading every record of a
-- person's organizations.
--
-- Census (pg_stat_statements 15:58-21:40 UTC): platform.shell_counts 3,042 s (mean 2.9 s, every page
-- load plus a 5-minute poll per visible tab), custom.inbox_counts 234 s, custom.inbox_remind_tick
-- 672 s (cron */5, mean 10.8 s). All three find "pending approvals" (data_class = 'work_approval',
-- 1.4k of custom.record's 561k rows) and "records assigned to a person" (data ->> 'assignee', 825
-- rows) with no index on either: admin@admin.com's 47 organizations read 1,438 approvals out of every
-- record those organizations hold (163 ms of the 2.1 s badge).
--
-- Two small partial indexes. custom.record is HASH-partitioned (16 partitions) and CREATE INDEX
-- CONCURRENTLY cannot run on a partitioned parent, so each partition is built CONCURRENTLY (writes
-- never wait), then the parent index is created ON ONLY (catalog-only, instant) and each partition's
-- index is attached. `(data ->> 'assignee') is not null` is implied by every reader's
-- `data ->> 'assignee' = <text>` / `<> ''` (a strict operator), so the planner proves the partial
-- predicate without the readers naming it.
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p00_work_approval_live_idx
  ON custom.record_p00 (organization_id, created_at)
  WHERE data_class = 'work_approval' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p00_assignee_live_idx
  ON custom.record_p00 (organization_id, (data ->> 'assignee'))
  WHERE data_class = 'record' AND deleted_at IS NULL AND (data ->> 'assignee') IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p01_work_approval_live_idx
  ON custom.record_p01 (organization_id, created_at)
  WHERE data_class = 'work_approval' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p01_assignee_live_idx
  ON custom.record_p01 (organization_id, (data ->> 'assignee'))
  WHERE data_class = 'record' AND deleted_at IS NULL AND (data ->> 'assignee') IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p02_work_approval_live_idx
  ON custom.record_p02 (organization_id, created_at)
  WHERE data_class = 'work_approval' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p02_assignee_live_idx
  ON custom.record_p02 (organization_id, (data ->> 'assignee'))
  WHERE data_class = 'record' AND deleted_at IS NULL AND (data ->> 'assignee') IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p03_work_approval_live_idx
  ON custom.record_p03 (organization_id, created_at)
  WHERE data_class = 'work_approval' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p03_assignee_live_idx
  ON custom.record_p03 (organization_id, (data ->> 'assignee'))
  WHERE data_class = 'record' AND deleted_at IS NULL AND (data ->> 'assignee') IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p04_work_approval_live_idx
  ON custom.record_p04 (organization_id, created_at)
  WHERE data_class = 'work_approval' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p04_assignee_live_idx
  ON custom.record_p04 (organization_id, (data ->> 'assignee'))
  WHERE data_class = 'record' AND deleted_at IS NULL AND (data ->> 'assignee') IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p05_work_approval_live_idx
  ON custom.record_p05 (organization_id, created_at)
  WHERE data_class = 'work_approval' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p05_assignee_live_idx
  ON custom.record_p05 (organization_id, (data ->> 'assignee'))
  WHERE data_class = 'record' AND deleted_at IS NULL AND (data ->> 'assignee') IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p06_work_approval_live_idx
  ON custom.record_p06 (organization_id, created_at)
  WHERE data_class = 'work_approval' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p06_assignee_live_idx
  ON custom.record_p06 (organization_id, (data ->> 'assignee'))
  WHERE data_class = 'record' AND deleted_at IS NULL AND (data ->> 'assignee') IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p07_work_approval_live_idx
  ON custom.record_p07 (organization_id, created_at)
  WHERE data_class = 'work_approval' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p07_assignee_live_idx
  ON custom.record_p07 (organization_id, (data ->> 'assignee'))
  WHERE data_class = 'record' AND deleted_at IS NULL AND (data ->> 'assignee') IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p08_work_approval_live_idx
  ON custom.record_p08 (organization_id, created_at)
  WHERE data_class = 'work_approval' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p08_assignee_live_idx
  ON custom.record_p08 (organization_id, (data ->> 'assignee'))
  WHERE data_class = 'record' AND deleted_at IS NULL AND (data ->> 'assignee') IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p09_work_approval_live_idx
  ON custom.record_p09 (organization_id, created_at)
  WHERE data_class = 'work_approval' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p09_assignee_live_idx
  ON custom.record_p09 (organization_id, (data ->> 'assignee'))
  WHERE data_class = 'record' AND deleted_at IS NULL AND (data ->> 'assignee') IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p10_work_approval_live_idx
  ON custom.record_p10 (organization_id, created_at)
  WHERE data_class = 'work_approval' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p10_assignee_live_idx
  ON custom.record_p10 (organization_id, (data ->> 'assignee'))
  WHERE data_class = 'record' AND deleted_at IS NULL AND (data ->> 'assignee') IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p11_work_approval_live_idx
  ON custom.record_p11 (organization_id, created_at)
  WHERE data_class = 'work_approval' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p11_assignee_live_idx
  ON custom.record_p11 (organization_id, (data ->> 'assignee'))
  WHERE data_class = 'record' AND deleted_at IS NULL AND (data ->> 'assignee') IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p12_work_approval_live_idx
  ON custom.record_p12 (organization_id, created_at)
  WHERE data_class = 'work_approval' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p12_assignee_live_idx
  ON custom.record_p12 (organization_id, (data ->> 'assignee'))
  WHERE data_class = 'record' AND deleted_at IS NULL AND (data ->> 'assignee') IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p13_work_approval_live_idx
  ON custom.record_p13 (organization_id, created_at)
  WHERE data_class = 'work_approval' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p13_assignee_live_idx
  ON custom.record_p13 (organization_id, (data ->> 'assignee'))
  WHERE data_class = 'record' AND deleted_at IS NULL AND (data ->> 'assignee') IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p14_work_approval_live_idx
  ON custom.record_p14 (organization_id, created_at)
  WHERE data_class = 'work_approval' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p14_assignee_live_idx
  ON custom.record_p14 (organization_id, (data ->> 'assignee'))
  WHERE data_class = 'record' AND deleted_at IS NULL AND (data ->> 'assignee') IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p15_work_approval_live_idx
  ON custom.record_p15 (organization_id, created_at)
  WHERE data_class = 'work_approval' AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS record_p15_assignee_live_idx
  ON custom.record_p15 (organization_id, (data ->> 'assignee'))
  WHERE data_class = 'record' AND deleted_at IS NULL AND (data ->> 'assignee') IS NOT NULL;
CREATE INDEX IF NOT EXISTS record_work_approval_live_idx
  ON ONLY custom.record (organization_id, created_at)
  WHERE data_class = 'work_approval' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS record_assignee_live_idx
  ON ONLY custom.record (organization_id, (data ->> 'assignee'))
  WHERE data_class = 'record' AND deleted_at IS NULL AND (data ->> 'assignee') IS NOT NULL;
ALTER INDEX custom.record_work_approval_live_idx ATTACH PARTITION custom.record_p00_work_approval_live_idx;
ALTER INDEX custom.record_assignee_live_idx ATTACH PARTITION custom.record_p00_assignee_live_idx;
ALTER INDEX custom.record_work_approval_live_idx ATTACH PARTITION custom.record_p01_work_approval_live_idx;
ALTER INDEX custom.record_assignee_live_idx ATTACH PARTITION custom.record_p01_assignee_live_idx;
ALTER INDEX custom.record_work_approval_live_idx ATTACH PARTITION custom.record_p02_work_approval_live_idx;
ALTER INDEX custom.record_assignee_live_idx ATTACH PARTITION custom.record_p02_assignee_live_idx;
ALTER INDEX custom.record_work_approval_live_idx ATTACH PARTITION custom.record_p03_work_approval_live_idx;
ALTER INDEX custom.record_assignee_live_idx ATTACH PARTITION custom.record_p03_assignee_live_idx;
ALTER INDEX custom.record_work_approval_live_idx ATTACH PARTITION custom.record_p04_work_approval_live_idx;
ALTER INDEX custom.record_assignee_live_idx ATTACH PARTITION custom.record_p04_assignee_live_idx;
ALTER INDEX custom.record_work_approval_live_idx ATTACH PARTITION custom.record_p05_work_approval_live_idx;
ALTER INDEX custom.record_assignee_live_idx ATTACH PARTITION custom.record_p05_assignee_live_idx;
ALTER INDEX custom.record_work_approval_live_idx ATTACH PARTITION custom.record_p06_work_approval_live_idx;
ALTER INDEX custom.record_assignee_live_idx ATTACH PARTITION custom.record_p06_assignee_live_idx;
ALTER INDEX custom.record_work_approval_live_idx ATTACH PARTITION custom.record_p07_work_approval_live_idx;
ALTER INDEX custom.record_assignee_live_idx ATTACH PARTITION custom.record_p07_assignee_live_idx;
ALTER INDEX custom.record_work_approval_live_idx ATTACH PARTITION custom.record_p08_work_approval_live_idx;
ALTER INDEX custom.record_assignee_live_idx ATTACH PARTITION custom.record_p08_assignee_live_idx;
ALTER INDEX custom.record_work_approval_live_idx ATTACH PARTITION custom.record_p09_work_approval_live_idx;
ALTER INDEX custom.record_assignee_live_idx ATTACH PARTITION custom.record_p09_assignee_live_idx;
ALTER INDEX custom.record_work_approval_live_idx ATTACH PARTITION custom.record_p10_work_approval_live_idx;
ALTER INDEX custom.record_assignee_live_idx ATTACH PARTITION custom.record_p10_assignee_live_idx;
ALTER INDEX custom.record_work_approval_live_idx ATTACH PARTITION custom.record_p11_work_approval_live_idx;
ALTER INDEX custom.record_assignee_live_idx ATTACH PARTITION custom.record_p11_assignee_live_idx;
ALTER INDEX custom.record_work_approval_live_idx ATTACH PARTITION custom.record_p12_work_approval_live_idx;
ALTER INDEX custom.record_assignee_live_idx ATTACH PARTITION custom.record_p12_assignee_live_idx;
ALTER INDEX custom.record_work_approval_live_idx ATTACH PARTITION custom.record_p13_work_approval_live_idx;
ALTER INDEX custom.record_assignee_live_idx ATTACH PARTITION custom.record_p13_assignee_live_idx;
ALTER INDEX custom.record_work_approval_live_idx ATTACH PARTITION custom.record_p14_work_approval_live_idx;
ALTER INDEX custom.record_assignee_live_idx ATTACH PARTITION custom.record_p14_assignee_live_idx;
ALTER INDEX custom.record_work_approval_live_idx ATTACH PARTITION custom.record_p15_work_approval_live_idx;
ALTER INDEX custom.record_assignee_live_idx ATTACH PARTITION custom.record_p15_assignee_live_idx;
