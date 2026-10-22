-- draft: canon lane 5 — apply ONLY after a frontend release containing 071fd49a11 (contact route writes created_by) is live; then delete this line and run pnpm db:apply migrations/canon_lane5_05_contact_submissions_user_id_retired.sql --confirm-chair-step canon_lane5_05_contact_submissions_user_id_retired.sql
-- chair-step: canonicalization lane 5 — retire contact_submissions.user_id (always equal to created_by, 0/208 differ, measured 2026-10-22) and the two SECURITY-SWEEP-2 guards that existed only because it was writable
-- lane: canonicalization lane 5 — batch 5.
-- The only writer (matrx-frontend app/api/contact/route.ts, service role) writes created_by since
-- commit 071fd49a11; no DB function, policy or sharing-registry row reads user_id (registry
-- owner_column is created_by). The restrictive *_user_id_is_the_caller_{insert,update} guards pin a
-- column that no longer exists; created_by is pinned by the generated std_insert/std_update.
set lock_timeout = '2s';

select iam.supersede_bespoke_policies('communication', 'contact_submissions',
  array['contact_submissions_user_id_is_the_caller_insert', 'contact_submissions_user_id_is_the_caller_update'],
  'user_id retired (canon lane 5): created_by is the author and the generated rules pin it');
alter table communication.contact_submissions drop column user_id;
select iam.apply_rls('communication', 'contact_submissions', 'contact_submission', 'entity');
