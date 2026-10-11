-- chair-step: the REVOKEs keep the new lock helpers off the client and take the door flag (esign._arm/_disarm) away from every client role, as the owner's signer-lock ruling requires; everything else is additive (new triggers) or a surgical replace guarded by based-on.
-- THE RECIPIENT LOCK (owner ruling 2026-10-10, "a HUGE one and cannot be messed with"; Docusign Correct/Void).
--
-- Once a recipient has ACTED — signed, declined, passed it to someone else, or finished reviewing —
-- nothing about that recipient changes and the row is never deleted, through ANY path: the sender's own
-- JWT over PostgREST, the service role, the server's own connection, or a door that raised
-- `esign.privileged_write`. Only bookkeeping still moves (notice counters, delivery error, the sign-up
-- hint the finished page mints). To change a party who has acted, the sender voids the envelope and
-- sends a corrected copy. A recipient who has not acted stays correctable/removable, and each such write
-- is already on the ledger (`signer_record_changed` / `signer_removed`, migrations 17/23/24; resend now
-- names the address before and after).
--
-- This is the second wall: the certificate and verify already read the sealed `signed` events
-- (migration 17). The flag is no exemption here on purpose — no door has a reason to rewrite an acted
-- recipient, and a door nested inside another can leave the flag in either state.
--
-- Also: a sent envelope's document set is sealed (no document may be added after send — the freeze
-- guard covered UPDATE/DELETE of frozen rows only), the expiry sweep stops turning a finished reviewer
-- into "expired", and the flag-raising helpers are no longer callable by a client role.
--
-- based-on: public.esign_resend_signer(uuid, text) 25fd097550ada1c80b32cb8f242082b6205ea79ff4f78705556ad3a2a72d21e9
-- based-on: public.esign_mint_signer_token(uuid, text) 9f0bb659b35c48ba7535abb293c162b50ef6c0d754095a2bc9dfbe4b6d62c665
-- based-on: public.esign_expire_sweep(integer) ca733264ca741ee9579f438c1740de860fb179e425d9c0926aaa0d060d3d4674
-- based-on: esign.retire_signer_link(uuid) 30ea2ed9c2f995890fbc0d506678297f93239a69cdf35f1c4bbda4979a969ad6

-- ─── what "acted" means — ONE definition, read by the trigger, the doors and the server ─────────────
create function esign._acted(p_signer_id uuid, p_envelope_id uuid, p_status text,
                             p_signed_at timestamptz, p_declined_at timestamptz)
returns text
language sql
stable
security definer
set search_path to ''
as $$
  -- The row's own state first; then the sealed ledger, so a row whose status was ever reset by a
  -- privileged write is still known to have acted.
  select case
    when p_status in ('signed', 'declined', 'delegated', 'acknowledged') then p_status
    when p_signed_at is not null then 'signed'
    when p_declined_at is not null then 'declined'
    else (select v.event_type from esign.envelope_event v
           where v.envelope_id = p_envelope_id and v.signer_id = p_signer_id
             and v.event_type in ('signed', 'declined', 'delegated', 'acknowledged')
           order by v.occurred_at limit 1)
  end
$$;
revoke all on function esign._acted(uuid, uuid, text, timestamptz, timestamptz) from public, anon, authenticated;

-- 'signed' | 'declined' | 'delegated' | 'acknowledged' when the recipient is locked, else null.
create function esign.recipient_lock(p_signer_id uuid)
returns text
language sql
stable
security definer
set search_path to ''
as $$
  select esign._acted(s.id, s.envelope_id, s.status, s.signed_at, s.declined_at)
    from esign.envelope_signer s where s.id = p_signer_id
$$;
revoke all on function esign.recipient_lock(uuid) from public, anon, authenticated;
insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values
 ('esign', '_acted', 'p_signer_id uuid, p_envelope_id uuid, p_status text, p_signed_at timestamp with time zone, p_declined_at timestamp with time zone',
  array['uuid'::regtype, 'uuid'::regtype, 'text'::regtype, 'timestamptz'::regtype, 'timestamptz'::regtype]::oid[],
  'p_signer_id/p_envelope_id are not checked: it answers only whether that recipient has acted, for a caller that already holds the row',
  'esign_parity_27_acted_recipients_are_locked.sql',
  'server_only: called by the recipient-lock trigger on esign.envelope_signer and by esign.recipient_lock, never by a client', false, false),
 ('esign', 'recipient_lock', 'p_signer_id uuid', array['uuid'::regtype]::oid[],
  'p_signer_id is not checked: the answer is a status word, and every caller (resend, mint, retire, aidream resend) has checked the envelope first',
  'esign_parity_27_acted_recipients_are_locked.sql',
  'server_only: called by the correction doors and by aidream services/esign/envelopes.py resend before it touches a link', false, false);
grant execute on function esign.recipient_lock(uuid) to service_role;

-- ─── the wall ──────────────────────────────────────────────────────────────────────────────────────
create function esign._lock_acted_recipient()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_why  text := esign._acted(old.id, old.envelope_id, old.status, old.signed_at, old.declined_at);
  v_word text;
  v_old  jsonb;
  v_new  jsonb;
  v_cols text[];
  -- Bookkeeping that keeps moving after a recipient acts (notices, the row stamps). Everything else is
  -- frozen by default — a column added later is locked until someone decides otherwise here.
  c_moves constant text[] := array['updated_at', 'updated_by', 'version', 'last_notified_at',
                                   'notify_attempts', 'reminder_count', 'delivery_error'];
begin
  if v_why is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  v_word := case v_why when 'signed' then 'has signed'
                       when 'declined' then 'has declined'
                       when 'delegated' then 'passed it to someone else'
                       else 'has finished reviewing' end;
  if tg_op = 'DELETE' then
    raise exception 'esign: recipient_locked — % % and cannot be removed. Void the envelope and send a corrected copy.',
                    coalesce(old.full_name, 'This recipient'), v_word
      using errcode = '42501', hint = 'recipient_locked',
            detail = jsonb_build_object('signer_id', old.id, 'envelope_id', old.envelope_id,
                                        'state', v_why, 'operation', 'delete')::text;
  end if;
  v_old := to_jsonb(old) - c_moves;
  v_new := to_jsonb(new) - c_moves;
  -- metadata: only the finished page's sign-up hint may move.
  v_old := jsonb_set(v_old, '{metadata}', coalesce(old.metadata, '{}'::jsonb) - 'signup_hint');
  v_new := jsonb_set(v_new, '{metadata}', coalesce(new.metadata, '{}'::jsonb) - 'signup_hint');
  select coalesce(array_agg(k order by k), '{}') into v_cols
    from (select jsonb_object_keys(v_old) as k union select jsonb_object_keys(v_new)) keys
   where (v_old -> k) is distinct from (v_new -> k);
  if cardinality(v_cols) > 0 then
    raise exception 'esign: recipient_locked — % % and can no longer change. Void the envelope and send a corrected copy.',
                    coalesce(old.full_name, 'This recipient'), v_word
      using errcode = '42501', hint = 'recipient_locked',
            detail = jsonb_build_object('signer_id', old.id, 'envelope_id', old.envelope_id,
                                        'state', v_why, 'operation', 'update', 'columns', to_jsonb(v_cols))::text;
  end if;
  return new;
end
$$;

-- `_zz_a…` fires after the stamps (`_stamp_actor`, `_touch_row`) and before the evidence guard, so a
-- locked recipient always hears THIS refusal, by name.
create trigger _zz_a_lock_acted_recipient
  before update or delete on esign.envelope_signer
  for each row execute function esign._lock_acted_recipient();
revoke all on function esign._lock_acted_recipient() from public, anon, authenticated;

-- ─── a sent envelope's documents are sealed: none may be added ───────────────────────────────────────
create function esign._guard_document_after_send()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if exists (select 1 from esign.envelope e where e.id = new.envelope_id and e.status <> 'draft') then
    raise exception 'esign: document_after_send — a sent envelope''s documents are sealed. Void it and send a corrected copy.'
      using errcode = '42501', hint = 'document_after_send',
            detail = jsonb_build_object('envelope_id', new.envelope_id)::text;
  end if;
  return new;
end
$$;
revoke all on function esign._guard_document_after_send() from public, anon, authenticated;

create trigger _zz_guard_document_after_send
  before insert on esign.envelope_document
  for each row execute function esign._guard_document_after_send();

-- ─── the doors refuse up front, by name (no 500) ─────────────────────────────────────────────────────
do $m$
declare d text; n text;
begin
  -- Resend / correct an address: an acted recipient is refused before anything moves; the ledger line
  -- names the address before and after.
  d := pg_get_functiondef('public.esign_resend_signer(uuid, text)'::regprocedure);
  n := replace(d, '  v_can := esign._can_act(s.id);',
'  if esign.recipient_lock(s.id) is not null then
    return jsonb_build_object(''granted'', false, ''reason'', ''recipient_locked'',
                              ''state'', esign.recipient_lock(s.id), ''signer_id'', s.id);
  end if;
  v_can := esign._can_act(s.id);');
  n := replace(n, 'jsonb_build_object(''address_changed'', true, ''token_reissued'', false,',
                  'jsonb_build_object(''address_changed'', true, ''token_reissued'', false,
                                                           ''email_before'', s.email, ''email_after'', lower(btrim(p_email)),');
  n := replace(n, 'p_payload => jsonb_build_object(''address_changed'', v_new_addr,',
                  'p_payload => jsonb_build_object(''address_changed'', v_new_addr,
                                                       ''email_before'', s.email, ''email_after'', lower(coalesce(p_email, s.email)),');
  if n = d or n !~ 'recipient_locked' or (length(n) - length(replace(n, 'email_before', ''))) / length('email_before') <> 2 then
    raise exception 'public.esign_resend_signer changed shape: the lock/ledger anchors were not all found';
  end if;
  execute n;

  -- Minting a link writes the address and factor: never onto an acted recipient.
  d := pg_get_functiondef('public.esign_mint_signer_token(uuid, text)'::regprocedure);
  n := replace(d, '  -- THE PERMISSION CHECK',
'  if esign.recipient_lock(s.id) is not null then
    return jsonb_build_object(''granted'', false, ''reason'', ''recipient_locked'',
                              ''state'', esign.recipient_lock(s.id), ''signer_id'', s.id);
  end if;

  -- THE PERMISSION CHECK');
  if n = d then raise exception 'public.esign_mint_signer_token changed shape: the permission-check anchor was not found'; end if;
  execute n;

  -- Retiring a link is a resend's first step: an acted recipient keeps theirs (it opens their finished page).
  d := pg_get_functiondef('esign.retire_signer_link(uuid)'::regprocedure);
  n := replace(d, 'where s.id = p_signer_id and s.actor_type = ''external'';',
                  'where s.id = p_signer_id and s.actor_type = ''external'' and esign.recipient_lock(s.id) is null;');
  if n = d then raise exception 'esign.retire_signer_link changed shape: the row filter was not found'; end if;
  execute n;

  -- The expiry sweep never rewrites a finished reviewer (an acted recipient) as "expired".
  d := pg_get_functiondef('public.esign_expire_sweep(integer)'::regprocedure);
  n := replace(d, 'status not in (''signed'',''declined'',''delegated'');',
                  'status not in (''signed'',''declined'',''delegated'',''acknowledged'');');
  if n = d then raise exception 'public.esign_expire_sweep changed shape: the signer filter was not found'; end if;
  execute n;
end
$m$;

-- ─── the door flag is raised by doors only — never by a client role ──────────────────────────────────
revoke execute on function esign._arm(), esign._disarm() from public, anon, authenticated, authenticator;
