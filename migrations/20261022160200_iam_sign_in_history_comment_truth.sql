-- 20261022160200_iam_sign_in_history_comment_truth.sql (admin user page nits, 2026-10-21).
-- Corrects an overclaim. The capture functions catch EVERY ORDINARY error (EXCEPTION WHEN OTHERS) and return
-- NULL, so a failed capture never fails a sign-in. They do NOT catch query cancel (statement_timeout,
-- 57014) or assert failure (P0004); PostgreSQL does not let WHEN OTHERS trap those. Behavior unchanged.
-- (Comment-only: the in-body comments in 20261022150100 keep the old wording; the catalog comment is the truth.)

comment on function iam._record_sign_in() is 'AFTER INSERT ON auth.sessions. Records the sign-in in iam.sign_in_event; catches every ordinary error (WHEN OTHERS), reports it to ops.system_error and returns NULL. Does not catch query cancel (statement_timeout 57014) or assert failure.';
comment on function iam._record_sign_in_method() is 'AFTER INSERT ON auth.mfa_amr_claims. Names the method on the session''s sign-in; catches every ordinary error (WHEN OTHERS) and returns NULL. Does not catch query cancel (statement_timeout 57014) or assert failure.';
