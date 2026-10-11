-- chair-step: the word TRUNCATE here is a BEFORE TRUNCATE statement trigger that REFUSES truncation of the four e-sign evidence tables; nothing is truncated.
-- The recipient lock (migration esign_parity_27) and the append-only ledger are ROW triggers, and TRUNCATE
-- fires no row trigger: the service role (which holds TRUNCATE) or the server's own connection could empty
-- the recipients, the event ledger, the sealed documents or the certificates in one statement — proven live
-- (aidream services/esign/tests/test_recipient_lock_live.py::test_nobody_truncates_the_evidence, red before
-- this file). A statement trigger refuses it on all four evidence tables, for every role.

create function esign._guard_no_truncate()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  raise exception 'esign.%: the signing evidence is never truncated — TRUNCATE is refused', tg_table_name
    using errcode = '42501', hint = 'evidence_never_truncated';
end
$$;

create trigger _zz_guard_no_truncate before truncate on esign.envelope_signer
  for each statement execute function esign._guard_no_truncate();
create trigger _zz_guard_no_truncate before truncate on esign.envelope_event
  for each statement execute function esign._guard_no_truncate();
create trigger _zz_guard_no_truncate before truncate on esign.envelope_document
  for each statement execute function esign._guard_no_truncate();
create trigger _zz_guard_no_truncate before truncate on esign.envelope_certificate
  for each statement execute function esign._guard_no_truncate();
