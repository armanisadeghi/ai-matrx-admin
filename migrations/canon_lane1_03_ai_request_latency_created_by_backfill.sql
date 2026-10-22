-- chair-step: canonicalization lane 1 backfills platform.ai_request_latency.created_by from the legacy user_id (triggers held off so version/updated_at do not move)
-- lane: canonicalization lane 1 (schema platform, a-l) — batch 3, first half of retiring the legacy owner
-- column user_id on platform.ai_request_latency (the person whose request was timed = created_by).
-- The writer (aidream/services/ai_execution/latency_report.py) now writes created_by; this copies the
-- existing rows across. Rows whose user_id names a person no longer in iam.users stay NULL (the
-- created_by FK refuses a dead id). DROP COLUMN user_id lands after that aidream release and the ORM
-- model regeneration — dropping it first would break the live writer, which still sends user_id.
set lock_timeout = '2s';

alter table platform.ai_request_latency disable trigger user;
update platform.ai_request_latency l
   set created_by = l.user_id
 where l.created_by is null
   and l.user_id is not null
   and exists (select 1 from iam.users u where u.id = l.user_id);
alter table platform.ai_request_latency enable trigger user;
