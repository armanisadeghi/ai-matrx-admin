-- chair-step: drops the six superseded signing overloads and REVOKEs client EXECUTE from every e-sign door that takes an IP address or device, as the final adversarial review (C2) and the owner's "cannot be messed with" ruling require; the server (aidream 0557afc31e and later) calls them on its own connection.
-- THE IP ADDRESS AND DEVICE IN EVIDENCE ARE WHAT THE SERVER OBSERVED (final adversarial review C2, 2026-10-11).
--
-- Any outside signer could call `public.outsider_verify`, `public.esign_signer_load/_preview_ack/_consent/
-- _adopt_signature` and the old 5-argument `public.esign_signer_sign` straight over PostgREST with
-- `p_ip => '198.51.100.9', p_ua => 'ForgedAgent/2.0'`, and every sealed event and the certificate printed the
-- forged address and device as fact. The signed-in doors (`esign_sign_*`) took the same arguments from any
-- signed-in caller.
--
--   * the six overloads the server no longer calls are retired (no legacy): the 5-argument
--     `esign_signer_sign` / `esign_sign`, the 8-argument `esign_signer_adopt_signature` /
--     `esign_sign_adopt_signature`, and the 4-argument `esign_signer_download_url` / `esign_sign_download`
--     (their esign-schema successors are what aidream calls);
--   * every remaining e-sign or outsider door whose arguments include `p_ip` / `p_ua` is SERVER-ONLY:
--     EXECUTE is revoked from public, anon, authenticated and authenticator, granted to service_role, and
--     its door row says so. aidream passes the request's own address (`client_ip(request)`) and
--     user agent; a signed-in signer's acts run on the server's connection with their claims
--     (services/esign/signing.py `_as_signer`), so `auth.uid()` is still theirs.
--
-- The browser never called these doors itself (it calls aidream's /esign/signing routes); nothing a person
-- uses loses a path.
--
-- ONE family waits for the server: the signed-in signer's doors (`public.esign_sign_load/_preview_ack/
-- _consent/_decline`, `esign.esign_sign*`). The aidream build running on 2026-10-12 still calls them as the
-- `authenticated` role, and server deploys are held (GitHub Actions billing), so their EXECUTE is revoked by
-- migration 34 once aidream 0557afc31e+ is live. Until then `esign._ctx_internal` keeps an address or
-- device ONLY when the call did not come through the API gateway: PostgREST always connects as
-- `authenticator`, the aidream server as `postgres`. A browser that asserts `p_ip`/`p_ua` there records
-- nothing (null), never its claim.
--
-- based-on: esign._ctx_internal(uuid, inet, text) 6e33cc28e615308523c378d906c5cc68bb9395a646402fce1caeeb5591c0ae39

drop function public.esign_signer_sign(text, jsonb, text, inet, text);
drop function public.esign_sign(uuid, jsonb, text, inet, text);
drop function public.esign_signer_adopt_signature(text, text, text, text, uuid, jsonb, inet, text);
drop function public.esign_sign_adopt_signature(uuid, text, text, text, uuid, jsonb, inet, text);
drop function public.esign_signer_download_url(text, uuid, inet, text);
drop function public.esign_sign_download(uuid, uuid, inet, text);

delete from platform.client_callable_door d
 where (d.schema_name, d.function_name, d.identity_args) in (
   ('public', 'esign_signer_sign', 'p_session text, p_observed jsonb, p_action_id text, p_ip inet, p_ua text'),
   ('public', 'esign_sign', 'p_signer_id uuid, p_observed jsonb, p_action_id text, p_ip inet, p_ua text'),
   ('public', 'esign_signer_adopt_signature', 'p_session text, p_kind text, p_typed_name text, p_typed_style text, p_image_file_id uuid, p_strokes jsonb, p_ip inet, p_ua text'),
   ('public', 'esign_sign_adopt_signature', 'p_signer_id uuid, p_kind text, p_typed_name text, p_typed_style text, p_image_file_id uuid, p_strokes jsonb, p_ip inet, p_ua text'),
   ('public', 'esign_signer_download_url', 'p_session text, p_document_id uuid, p_ip inet, p_ua text'),
   ('public', 'esign_sign_download', 'p_signer_id uuid, p_document_id uuid, p_ip inet, p_ua text'));

do $$
declare r record;
begin
  for r in
    select p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where (n.nspname = 'esign' or (n.nspname = 'public' and (p.proname like 'esign%' or p.proname like 'outsider%')))
       and p.proargnames && array['p_ip', 'p_ua']
       -- the signed-in family waits for migration 34 (see the header)
       and not (p.proname ~ '^esign_sign(_|$)' and p.proname !~ '^esign_signer')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated, authenticator', r.oid::regprocedure);
    execute format('grant execute on function %s to service_role', r.oid::regprocedure);
    update platform.client_callable_door
       set signed_in_callers = false, anonymous_callers = false, anonymous_purpose = null,
           non_client_lane = 'server_only: takes the IP address and device the aidream server observed for this request (services/esign/signing.py); a client could only assert its own'
     where schema_name = r.nspname and function_name = r.proname and identity_args = r.args;
  end loop;
end $$;

-- ─── interim wall for the signed-in family: only the server's own connection may name an address ────
create or replace function esign._ctx_internal(p_signer_id uuid, p_ip inet, p_ua text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'esign', 'public'
as $function$
declare s esign.envelope_signer%rowtype; v_server boolean := session_user::text <> 'authenticator';
begin
  if auth.uid() is null then
    return jsonb_build_object('granted', false, 'reason', 'not_authenticated');
  end if;
  select * into s from esign.envelope_signer where id = p_signer_id;
  if not found then
    perform platform.refuse_not_found(format('esign: signer %s does not exist', p_signer_id));
  end if;
  if s.actor_type <> 'internal_user' or s.signer_user_id is distinct from auth.uid() then
    -- §8.4 case 23, the internal half: you may act on YOUR signer row and no other.
    return jsonb_build_object('granted', false, 'reason', 'not_your_signer_row');
  end if;
  return jsonb_build_object(
    'granted', true, 'signer_id', s.id, 'envelope_id', s.envelope_id,
    'organization_id', s.organization_id,
    'actor_type', 'employee', 'actor_user_id', auth.uid(),
    'actor_token_id', null, 'session_id', null,
    'actor_label', s.full_name || ' <' || s.email || '>',
    'auth_method', 'session', 'verification_factor', 'session', 'verification_passed', true,
    -- C2: an address or device is evidence only when the SERVER observed it (never a gateway caller's claim).
    'ip', case when v_server then host(p_ip) end, 'user_agent', case when v_server then p_ua end);
end $function$;
