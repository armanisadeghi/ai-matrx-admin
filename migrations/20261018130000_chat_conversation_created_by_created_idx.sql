-- chat.conversation (created_by, created_at DESC) for one person's "conversations started" timeline
-- (admin.user_activity, users one-roof lane T, 2026-10-18). Every existing per-person index orders
-- by updated_at / last_activity_at; measured on the heaviest account (36k conversations) the
-- created_at-ordered page was a parallel seq scan + top-N sort, 119 ms. ~66k rows: small, built
-- CONCURRENTLY so no write is blocked. Applied via aidream's runner (autocommit file).
create index concurrently if not exists conversation_created_by_created_idx
  on chat.conversation (created_by, created_at desc)
  where deleted_at is null;
