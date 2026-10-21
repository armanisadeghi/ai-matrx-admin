-- 20261022150200_iam_sign_in_history_triggers.sql (admin user page, final lane, 2026-10-21).
--
-- Attaches the two capture triggers built by 20261022150000_iam_sign_in_history.sql to the auth tables, in
-- a transaction of its own so the SHARE ROW EXCLUSIVE lock CREATE TRIGGER takes on auth.sessions /
-- auth.mfa_amr_claims (it holds new sign-ins until commit) lasts milliseconds, never the seconds the
-- table build's reachability rebuild takes. Both bodies catch every exception and return NULL: a capture
-- failure can never block or fail a sign-in.

create trigger on_auth_session_record_sign_in
  after insert on auth.sessions
  for each row execute function iam._record_sign_in();

create trigger on_auth_amr_claim_record_sign_in_method
  after insert on auth.mfa_amr_claims
  for each row execute function iam._record_sign_in_method();
