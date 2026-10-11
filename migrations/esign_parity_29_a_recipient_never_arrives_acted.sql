-- The recipient lock's other half (owner ruling 2026-10-10; migration esign_parity_27).
--
-- `_guard_signer_evidence` says "signer evidence is written only by the esign RPCs, never by a direct
-- write", but it fired on UPDATE only: a sender's own JWT could INSERT a recipient straight into a sent
-- envelope already 'signed' (with signed_at, a consent, a verified flag) — a fabricated signature that,
-- under the lock, could then never be removed. A direct INSERT now carries no evidence: it starts as a
-- recipient who has not acted. Adding a fresh recipient to a sent envelope stays open (Docusign Correct);
-- the doors (materialize, delegate, create) are privileged writers and are unaffected.

create function esign._guard_signer_evidence_on_insert()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if esign._privileged() then
    return new;
  end if;
  if new.status not in ('pending', 'notified')
  or new.consented_at          is not null
  or new.consent_disclosure_id is not null
  or new.document_previewed_at is not null
  or new.signed_at             is not null
  or new.declined_at           is not null
  or new.signature_payload_hash is not null
  or new.signed_content_hash   is not null
  or coalesce(new.verification_passed, false)
  or new.actor_token_id        is not null
  or new.delegated_to_signer_id is not null then
    raise exception 'esign: signer evidence is written only by the esign RPCs, never by a direct write — a new recipient starts as one who has not acted'
      using errcode = '42501', hint = 'recipient_evidence_on_insert',
            detail = jsonb_build_object('envelope_id', new.envelope_id, 'status', new.status)::text;
  end if;
  return new;
end
$$;

create trigger _zz_guard_signer_evidence_on_insert
  before insert on esign.envelope_signer
  for each row execute function esign._guard_signer_evidence_on_insert();
