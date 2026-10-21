-- chair-step: Unify existing session termination and end compromised-factor sessions inside the same audited admin transaction.
-- based-on: iam.sign_out_everywhere(uuid,text) 33302178a2bede92b270b8b816dcd8f242c370764701e0692b8066e6f6bcdce2
-- based-on: iam.close_account(uuid,text) 66b4b4b76ee3916104379c0976e24bb11fe7e5bc8b82dde4e7bd5f725f3612bb
-- based-on: iam.remove_mfa_factor(uuid,uuid,text) f66d7c9beedaac2bfbbab2b5c57d78b3a7a692eecea84c9314bd57062a65b6a3

CREATE OR REPLACE FUNCTION iam._end_user_sessions(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare v_sessions int; v_tokens int;
begin
  -- Same lock order as native Auth: user fence, legacy refresh tokens, then sessions.
  -- A fresh login blocked here may begin a new AAL1 session after this transaction.
  perform 1 from auth.users where id = p_user for update;
  if not found then raise exception 'end sessions: no person' using errcode = 'P0002'; end if;
  delete from auth.refresh_tokens where user_id = p_user::text;
  get diagnostics v_tokens = row_count;
  delete from auth.sessions where user_id = p_user;
  get diagnostics v_sessions = row_count;
  return jsonb_build_object('sessions', v_sessions, 'refresh_tokens', v_tokens);
end $function$;
INSERT INTO platform.client_callable_door (schema_name,function_name,identity_args,identity_argtypes,reason,declared_by,non_client_lane,signed_in_callers,anonymous_callers)
VALUES ('iam','_end_user_sessions','p_user uuid',array['uuid'::regtype::oid],
 'Private session termination composed only by existing audited account and MFA reset doors.',
 '20261021204916_admin_mfa_reset_revokes_sessions.sql',
 'server_only: existing SECURITY DEFINER account and MFA reset functions only; no direct client or service-role call',false,false) ON CONFLICT DO NOTHING;
REVOKE ALL ON FUNCTION iam._end_user_sessions(uuid) FROM PUBLIC, anon, authenticated, service_role;

UPDATE platform.client_callable_door SET reason = 'A platform admin removes one owned MFA factor and atomically ends all existing target sign-ins, writing one reasoned audit row with revocation counts. Previously issued JWTs require session-aware admission or expiry.' WHERE schema_name='iam' AND function_name='remove_mfa_factor' AND identity_args='p_user uuid, p_factor uuid, p_reason text';

CREATE OR REPLACE FUNCTION iam.sign_out_everywhere(p_user uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- A platform admin ends every sign-in of one person (the same two deletes iam.close_account runs),
-- without closing the account. An access token issued before stays valid until it expires.
declare v_sessions int; v_tokens int; v_ended jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'sign_out_everywhere: a platform admin signs a person out' using errcode = '42501';
  end if;
  if p_user is null then raise exception 'sign_out_everywhere: no person given' using errcode = '22004'; end if;
  if not exists (select 1 from auth.users where id = p_user) then
    raise exception 'sign_out_everywhere: no person %', p_user using errcode = 'P0002';
  end if;
  v_ended := iam._end_user_sessions(p_user);
  v_sessions := (v_ended->>'sessions')::int;
  v_tokens := (v_ended->>'refresh_tokens')::int;
  perform admin._audit_user_action('sign_out_everywhere', p_user, null,
    jsonb_build_object('sessions', v_sessions, 'refresh_tokens', v_tokens), p_reason, '{}'::jsonb);
  return jsonb_build_object('ok', true, 'user_id', p_user, 'sessions', v_sessions, 'refresh_tokens', v_tokens,
    'jwt_window', 'an access token issued before stays valid until it expires (at most 3600 s)');
end $function$;

CREATE OR REPLACE FUNCTION iam.close_account(p_user uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := coalesce(p_user, auth.uid());
  v_caller uuid := auth.uid();
  v_keys uuid[]; v_tasks uuid[]; v_trigs uuid[]; v_mcp uuid[]; v_consents uuid[];
  v_sessions int; v_tokens int; v_ended jsonb; v_rev jsonb;
begin
  if v_uid is null then raise exception 'close_account: no person given' using errcode = '22004'; end if;
  if v_caller is not null and v_caller <> v_uid and not public.is_platform_admin() then
    raise exception 'close_account: you can close only your own account' using errcode = '42501';
  end if;
  if not exists (select 1 from iam.users where id = v_uid) then
    raise exception 'close_account: no person %', v_uid using errcode = 'P0002';
  end if;
  if exists (select 1 from iam.account_closure where user_id = v_uid and reopened_at is null) then
    return jsonb_build_object('ok', true, 'already_closed', true, 'user_id', v_uid);
  end if;
  update auth.users set banned_until = now() + interval '100 years', updated_at = now() where id = v_uid;
  v_ended := iam._end_user_sessions(v_uid);
  v_sessions := (v_ended->>'sessions')::int;
  v_tokens := (v_ended->>'refresh_tokens')::int;
  with x as (update iam.api_keys set status = 'revoked', revoked_at = now(), updated_at = now()
              where created_by = v_uid and status = 'active' and revoked_at is null returning id)
  select coalesce(array_agg(id), '{}') into v_keys from x;
  with x as (update scheduler.sch_task set enabled = false where user_id = v_uid and enabled returning id)
  select coalesce(array_agg(id), '{}') into v_tasks from x;
  with x as (update scheduler.sch_trigger set enabled = false where user_id = v_uid and enabled returning id)
  select coalesce(array_agg(id), '{}') into v_trigs from x;
  with x as (update tool.mcp_user_conn set status = 'disconnected', updated_at = now()
              where created_by = v_uid and status <> 'disconnected' and deleted_at is null returning id)
  select coalesce(array_agg(id), '{}') into v_mcp from x;
  with x as (update auth.oauth_consents set revoked_at = now() where user_id = v_uid and revoked_at is null returning id)
  select coalesce(array_agg(id), '{}') into v_consents from x;
  v_rev := jsonb_build_object('sessions', v_sessions, 'refresh_tokens', v_tokens, 'api_keys', to_jsonb(v_keys),
             'sch_task', to_jsonb(v_tasks), 'sch_trigger', to_jsonb(v_trigs), 'mcp_user_conn', to_jsonb(v_mcp),
             'oauth_consents', to_jsonb(v_consents),
             'jwt_window', 'an access token issued before closing stays valid until it expires (at most 3600 s)');
  -- organization_id: a closure is a platform record of the person, owned by the platform tenant (Data Doctrine).
  insert into iam.account_closure (user_id, reason, revoked, organization_id, created_by, updated_by)
  values (v_uid, p_reason, v_rev, public.system_org_id('system'), v_caller, v_caller);
  -- The admin audit trail: a person closing their own account is 'account_close_self' (actor = target).
  perform admin._audit_user_action(
    case when v_caller = v_uid then 'account_close_self' else 'account_close' end,
    v_uid, jsonb_build_object('closed', false), jsonb_build_object('closed', true, 'revoked', v_rev), p_reason,
    jsonb_build_object('via', case when v_caller is null then 'backend' when v_caller = v_uid then 'self_serve' else 'platform_admin' end),
    v_caller);
  return jsonb_build_object('ok', true, 'user_id', v_uid, 'revoked', v_rev);
end $function$;

CREATE OR REPLACE FUNCTION iam.remove_mfa_factor(p_user uuid, p_factor uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- A platform admin removes one MFA factor of one person (lost phone / authenticator). Its
-- challenges and recovery codes go with it (FK cascade); all current sign-ins are ended atomically.
-- Pre-issued JWTs still require session-aware admission or expiry; this does not forge revocation claims.
declare v_before jsonb; v_ended jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'remove_mfa_factor: a platform admin removes a factor' using errcode = '42501';
  end if;
  if exists (select 1 from admin.support_sessions s where s.auth_session_id::text = auth.jwt()->>'session_id') then
    raise exception 'Login details cannot be changed from a support sign-in' using errcode = '42501';
  end if;
  if p_user is null or p_factor is null then
    raise exception 'remove_mfa_factor: person and factor are required' using errcode = '22004';
  end if;
  select jsonb_build_object('factor_id', f.id, 'factor_type', f.factor_type::text, 'status', f.status::text,
                            'friendly_name', nullif(f.friendly_name, ''), 'created_at', f.created_at)
    into v_before
    from auth.mfa_factors f where f.id = p_factor and f.user_id = p_user for update;
  if v_before is null then
    raise exception 'remove_mfa_factor: that person has no factor %', p_factor using errcode = 'P0002';
  end if;
  delete from auth.mfa_factors where id = p_factor and user_id = p_user;
  v_ended := iam._end_user_sessions(p_user);
  perform admin._audit_user_action('mfa_factor_remove', p_user, v_before, v_ended, p_reason,
    jsonb_build_object('factor_id', p_factor, 'revoked', v_ended));
  return jsonb_build_object('ok', true, 'user_id', p_user, 'factor_id', p_factor, 'revoked', v_ended,
    'jwt_window', 'previously issued access tokens may remain valid until expiry');
end $function$;
