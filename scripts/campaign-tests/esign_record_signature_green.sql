-- scripts/campaign-tests/esign_record_signature_green.sql — a records signature is an e-sign envelope.
--
-- Replaces esign_green.sql / esign_red.sql, which proved the retired /sign/<token> path
-- (custom.sign_request_*). RED before migrations/inverse/esign_parity_28 (the old minting door
-- still exists) and before esign_parity_31 (the two joining steps do not); GREEN after both.
-- The full live path — SDK call, outsider signs from the email, finalize writes the Field — is
-- aidream services/esign/tests/live_record_signature.py.
-- Ends in ROLLBACK and leaves nothing.

\set ON_ERROR_STOP on
\set suite 'esign_record_signature_green.sql'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif
begin;
do $$
declare v_left text; v_missing text; v_kept text;
begin
  -- 1. the old path is gone: no function, no door row; every door row is in the retirement ledger
  select string_agg(p.proname, ', ') into v_left from pg_proc p
   where p.pronamespace = 'custom'::regnamespace
     and p.proname in ('sign_request_create', 'sign_request_cancel', 'sign_request_remind', 'sign_request_sign',
                       'sign_request_unchanged', 'sign_request_decline', 'sign_request_public',
                       '_sign_request_resolve', 'sign_token_encode', 'sign_token_decode');
  if v_left is not null then
    raise exception '1: the retired /sign/<token> functions still exist: %', v_left;
  end if;
  if exists (select 1 from platform.client_callable_door where schema_name = 'custom' and function_name like 'sign_request\_%'
              and function_name not in ('sign_request_state', 'sign_request_sentence')) then
    raise exception '1: a retired sign_request door row is still declared';
  end if;
  if not exists (select 1 from platform.client_callable_door_retirement where schema_name = 'custom'
                  and function_name = 'sign_request_create'
                  and retired_by = 'esign_parity_28_retire_the_old_sign_request_minting_door') then
    raise exception '1: custom.sign_request_create is not in the retirement ledger';
  end if;
  -- 2. what organization archive still reads, and the seal the envelope writes back through, stay
  select string_agg(n, ', ') into v_kept from unnest(array['sign_requests', 'sign_request_state', 'sign_request_sentence', 'doc_sign']) n
   where not exists (select 1 from pg_proc p where p.pronamespace = 'custom'::regnamespace and p.proname = n);
  if v_kept is not null then
    raise exception '2: a function that must stay was dropped: %', v_kept;
  end if;
  -- 3. the two joining steps exist, are server-only, and a browser cannot call them
  select string_agg(n, ', ') into v_missing from unnest(array['link_record_signature', 'apply_record_signature']) n
   where not exists (select 1 from platform.client_callable_door d where d.schema_name = 'esign' and d.function_name = n
                      and d.non_client_lane like 'server_only:%');
  if v_missing is not null then
    raise exception '3: not declared server-only: %', v_missing;
  end if;
  if has_function_privilege('authenticated', 'esign.link_record_signature(uuid,uuid,text)', 'EXECUTE')
     or has_function_privilege('anon', 'esign.apply_record_signature(uuid)', 'EXECUTE') then
    raise exception '3: a browser role can execute a server-only record-signature step';
  end if;
  -- 4. apply_record_signature answers honestly for an envelope with no record link
  if (esign.apply_record_signature(gen_random_uuid()) ->> 'reason') <> 'no_envelope' then
    raise exception '4: an unknown envelope did not answer no_envelope';
  end if;
  raise notice 'esign_record_signature_green: PASS (4 clauses)';
end $$;
rollback;
