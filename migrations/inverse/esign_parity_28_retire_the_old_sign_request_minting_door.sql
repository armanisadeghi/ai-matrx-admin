-- chair-step: retires the old /sign/<token> signing path (e-sign parity POLISH, owner 2026-10-10): drops the ten custom.sign_request_* functions that only that deleted page used, moves their door rows to the retirement ledger; no record is removed (the sign_request records stay, and custom.sign_requests / sign_request_state / sign_request_sentence, which organization archive still reads, stay).
-- The page (app/(link)/sign/[token]), its route (app/api/sign/[token]) and features/esign/service.ts are deleted;
-- the records SDK's signature_request now sends a v2 e-sign envelope (aidream services/esign/record_signature.py,
-- migration esign_parity_31) and esign.apply_record_signature writes the signature back through custom.doc_sign,
-- which therefore stays.
-- Nothing else calls the dropped functions, checked 2026-10-11:
--   pg_proc bodies: only each other (sign/decline/public -> _sign_request_resolve -> sign_token_decode;
--     sign/public -> sign_request_unchanged; create -> sign_token_encode); custom.form_submit names
--     sign_request_sign in two comments only.
--   pg_depend: no dependents; no triggers; no policies.
--   git grep in aidream, matrx-frontend, matrx-extend, matrx-local, matrx-sandbox, matrx-ship: no callers
--     outside the generated store contract and the campaign SQL tests updated in the same push.
insert into platform.client_callable_door_retirement
  (schema_name, function_name, identity_args, retirement_class, retired_reason, successor,
   was_reason, was_declared_by, retired_by)
select d.schema_name, d.function_name, d.identity_args, 'not_a_function',
       'E-sign parity: the old /sign/<token> page is deleted; the v2 envelope flow (esign.*) is the one signing path.',
       case d.function_name when 'sign_request_create' then 'esign.esign_draft_create + POST /esign/drafts/{id}/send (records SDK: matrx_records.signatures)'
                            when 'sign_request_sign' then 'esign signer doors + esign.apply_record_signature'
                            else 'esign.* envelope doors' end,
       d.reason, d.declared_by, 'esign_parity_28_retire_the_old_sign_request_minting_door'
  from platform.client_callable_door d
 where d.schema_name = 'custom'
   and d.function_name in ('sign_request_create', 'sign_request_cancel', 'sign_request_remind', 'sign_request_sign',
                           'sign_request_unchanged', 'sign_request_decline', 'sign_request_public',
                           '_sign_request_resolve', 'sign_token_encode', 'sign_token_decode');
-- (platform.door_argument_rule is a view over each door row's argument_rules; deleting the row removes them.)
delete from platform.client_callable_door
 where schema_name = 'custom'
   and function_name in ('sign_request_create', 'sign_request_cancel', 'sign_request_remind', 'sign_request_sign',
                         'sign_request_unchanged', 'sign_request_decline', 'sign_request_public',
                         '_sign_request_resolve', 'sign_token_encode', 'sign_token_decode');
drop function custom.sign_request_create(uuid, uuid, text, text, text, interval);
drop function custom.sign_request_cancel(uuid, uuid, text);
drop function custom.sign_request_remind(uuid, uuid);
drop function custom.sign_request_sign(text, text, text, text, text, text, text);
drop function custom.sign_request_decline(text, text, text, text);
drop function custom.sign_request_public(text, text);
drop function custom.sign_request_unchanged(uuid, uuid);
drop function custom._sign_request_resolve(text);
drop function custom.sign_token_encode(bytea);
drop function custom.sign_token_decode(text);
