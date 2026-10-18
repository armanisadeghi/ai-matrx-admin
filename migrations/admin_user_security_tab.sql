-- chair-step: widens admin.admin_audit_log_action_check by three per-person admin action words (session_end, mfa_factor_remove, api_key_revoke); a CHECK cannot be widened without DROP + ADD; every existing row still satisfies it and nothing is removed. Then the admin user page's Security tab gets its one read and its three per-session / per-factor / per-key actions, each writing its audit row.
--
-- admin_user_security_tab.sql (users one-roof, lane S, 2026-10-17). New functions; no based-on.
--
-- WHY. /administration/users/<id>/security — Auth0's Details / Devices / History / Raw JSON for one
-- person, on one tab: how they sign in, where they are signed in, their API keys, the apps they
-- connected, and the raw auth record.
--
-- WHAT.
--   1. admin.admin_audit_log learns session_end, mfa_factor_remove, api_key_revoke.
--   2. admin.user_security(p_user) returns jsonb — THE one read for the tab. Every part is read by
--      an index on the person: auth.identities (identities_user_id_idx), auth.mfa_factors
--      (factor_id_created_at_idx), auth.sessions (user_id_created_at_idx) + auth.refresh_tokens by
--      session (refresh_tokens_session_id_revoked_idx), iam.api_keys (api_keys_service_user_id_idx,
--      api_keys_created_by_idx), auth.oauth_consents (oauth_consents_user_order_idx),
--      users.integration_connections (integration_connections_owner_user).
--      Sign-in history: auth.audit_log_entries has no index on the person (actor id lives inside
--      the json payload) and Supabase stopped writing it on 2026-08-20, so it is NOT read; the
--      sign-ins list is the person's live sessions by created_at (`sign_in_source` says so).
--   3. iam.end_session(p_user, p_session, p_reason) — ends ONE sign-in (its refresh tokens and the
--      session row; the same deletes iam.sign_out_everywhere runs, for one session).
--   4. iam.remove_mfa_factor(p_user, p_factor, p_reason) — removes one MFA factor (its challenges
--      and recovery codes go with it by FK cascade).
--   5. iam.revoke_api_key_for_person(p_user, p_key, p_reason) — revokes one key the person owns
--      or created: the same update iam.personal_api_key_revoke / iam.api_key_revoke make (a service
--      key also loses its service identity's membership, as iam.api_key_revoke does).
--   All four: platform admins only (the server too for the read); 3–5 write admin._audit_user_action.
--
-- Guard: pnpm check:user-action-audit (static + one rolled-back live run each).

-- ── 1. the action words ─────────────────────────────────────────────────────────────────────
ALTER TABLE admin.admin_audit_log DROP CONSTRAINT admin_audit_log_action_check;
ALTER TABLE admin.admin_audit_log ADD CONSTRAINT admin_audit_log_action_check
  CHECK (action = ANY (ARRAY['promote'::text, 'update'::text, 'revoke'::text,
                             'admin_lane_platform_tenant_admission'::text,
                             'scheduler_task_disable'::text,
                             'scheduler_run_mark_failed'::text,
                             'top_tier_models_grant'::text,
                             'top_tier_models_revoke'::text,
                             'account_close'::text,
                             'account_close_self'::text,
                             'account_reopen'::text,
                             'sign_out_everywhere'::text,
                             'plan_clear'::text,
                             'free_months_grant'::text,
                             'usage_reset'::text,
                             'support_session_created'::text,
                             'support_session_extended'::text,
                             'support_session_started'::text,
                             'support_session_ended'::text,
                             'onboarding_flag_set'::text,
                             'mcp_full_access_grant'::text,
                             'mcp_full_access_revoke'::text,
                             'magic_link_create'::text,
                             'password_reset_link_create'::text,
                             'session_end'::text,
                             'mfa_factor_remove'::text,
                             'api_key_revoke'::text]));

-- ── 2. the read ─────────────────────────────────────────────────────────────────────────────
create or replace function admin.user_security(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres'
     and not public.is_platform_admin() then
    raise exception 'admin.user_security: platform admins only' using errcode = '42501';
  end if;
  if p_user is null then
    raise exception 'admin.user_security: p_user is required' using errcode = '22004';
  end if;
  if not exists (select 1 from auth.users where id = p_user) then
    return null;
  end if;

  return jsonb_build_object(
    'account', (
      select jsonb_build_object(
               'id', u.id,
               'email', u.email,
               'phone', nullif(u.phone, ''),
               'email_confirmed_at', u.email_confirmed_at,
               'phone_confirmed_at', u.phone_confirmed_at,
               'confirmed_at', u.confirmed_at,
               'invited_at', u.invited_at,
               'confirmation_sent_at', u.confirmation_sent_at,
               'recovery_sent_at', u.recovery_sent_at,
               'email_change', nullif(u.email_change, ''),
               'email_change_sent_at', u.email_change_sent_at,
               'last_sign_in_at', u.last_sign_in_at,
               'banned_until', u.banned_until,
               'created_at', u.created_at,
               'updated_at', u.updated_at,
               'deleted_at', u.deleted_at,
               'is_anonymous', coalesce(u.is_anonymous, false),
               'is_sso_user', coalesce(u.is_sso_user, false),
               'has_password', u.encrypted_password is not null and u.encrypted_password <> '',
               'app_metadata', coalesce(u.raw_app_meta_data, '{}'::jsonb),
               'user_metadata', coalesce(u.raw_user_meta_data, '{}'::jsonb))
        from auth.users u where u.id = p_user),
    'identities', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', i.id,
               'provider', i.provider,
               'email', i.email,
               'created_at', i.created_at,
               'updated_at', i.updated_at,
               'last_sign_in_at', i.last_sign_in_at) order by i.created_at)
        from auth.identities i where i.user_id = p_user), '[]'::jsonb),
    'mfa_factors', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', f.id,
               'friendly_name', nullif(f.friendly_name, ''),
               'factor_type', f.factor_type::text,
               'status', f.status::text,
               'phone', nullif(f.phone, ''),
               'created_at', f.created_at,
               'updated_at', f.updated_at,
               'last_challenged_at', f.last_challenged_at) order by f.created_at)
        from auth.mfa_factors f where f.user_id = p_user), '[]'::jsonb),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id,
               'created_at', s.created_at,
               'updated_at', s.updated_at,
               'refreshed_at', s.refreshed_at,
               'not_after', s.not_after,
               'user_agent', s.user_agent,
               'ip', host(s.ip),
               'aal', s.aal::text,
               'tag', s.tag,
               'oauth_client', c.client_name,
               'refresh_tokens', t.n,
               'active_refresh_tokens', t.active,
               'last_token_at', t.last_at) order by s.created_at desc)
        from auth.sessions s
        left join auth.oauth_clients c on c.id = s.oauth_client_id
        left join lateral (
          select count(*) as n, count(*) filter (where not coalesce(r.revoked, false)) as active,
                 max(r.updated_at) as last_at
            from auth.refresh_tokens r where r.session_id = s.id) t on true
       where s.user_id = p_user), '[]'::jsonb),
    'sign_in_source', 'sessions',
    'api_keys', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', k.id,
               'key_id', k.key_id,
               'name', k.name,
               'display_prefix', k.display_prefix,
               'kind', coalesce(k.metadata->>'identity_kind', case when k.service_user_id = p_user then 'personal_key' else 'api_key_service' end),
               'organization_id', k.organization_id,
               'organization_name', o.name,
               'status', k.status,
               'created_at', k.created_at,
               'last_used_at', k.last_used_at,
               'expires_at', k.expires_at,
               'revoked_at', k.revoked_at) order by k.created_at desc)
        from iam.api_keys k
        left join iam.organizations o on o.id = k.organization_id
       where k.id in (select id from iam.api_keys where service_user_id = p_user
                      union select id from iam.api_keys where created_by = p_user)
         and k.deleted_at is null), '[]'::jsonb),
    'oauth_consents', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', oc.id,
               'client_id', oc.client_id,
               'client_name', cl.client_name,
               'client_uri', cl.client_uri,
               'scopes', oc.scopes,
               'granted_at', oc.granted_at,
               'revoked_at', oc.revoked_at) order by oc.granted_at desc)
        from auth.oauth_consents oc
        left join auth.oauth_clients cl on cl.id = oc.client_id
       where oc.user_id = p_user), '[]'::jsonb),
    'connections', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', ic.id,
               'provider', ic.provider,
               'account_email', ic.account_email,
               'account_name', ic.account_name,
               'scopes', to_jsonb(ic.scopes),
               'status', ic.status,
               'last_verified_at', ic.last_verified_at,
               'last_error', ic.last_error,
               'organization_id', ic.organization_id,
               'created_at', ic.created_at,
               'updated_at', ic.updated_at) order by ic.updated_at desc)
        from users.integration_connections ic
       where ic.owner_user_id = p_user and ic.deleted_at is null), '[]'::jsonb),
    'computed_at', now());
end;
$$;

comment on function admin.user_security(uuid) is
  'THE one read for the admin user page Security tab: account record + raw app/user metadata, identities, MFA factors, live sessions (with refresh-token counts), API keys (never the secret), OAuth consents, integration connections. Platform admins only.';

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers, gate_predicate)
values
  ('admin', 'user_security', 'p_user uuid', array['uuid'::regtype]::oid[],
   'READ. p_user is any auth user; the body refuses anyone but a platform admin (or the server) with 42501 and returns one jsonb of that person''s sign-in methods, sessions, API keys (prefix only), connected apps and auth record.',
   'migrations/admin_user_security_tab.sql (users one-roof lane S)',
   null, true, false, 'public.is_platform_admin()')
on conflict do nothing;

grant execute on function admin.user_security(uuid) to authenticated, service_role;

-- ── 3. end one session ──────────────────────────────────────────────────────────────────────
create or replace function iam.end_session(p_user uuid, p_session uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
-- A platform admin ends ONE sign-in of one person. An access token issued before stays valid
-- until it expires (at most an hour).
declare v_before jsonb; v_tokens int;
begin
  if not public.is_platform_admin() then
    raise exception 'end_session: a platform admin ends a sign-in' using errcode = '42501';
  end if;
  if p_user is null or p_session is null then
    raise exception 'end_session: person and session are required' using errcode = '22004';
  end if;
  select jsonb_build_object('session_id', s.id, 'created_at', s.created_at, 'refreshed_at', s.refreshed_at,
                            'user_agent', s.user_agent, 'ip', host(s.ip), 'aal', s.aal::text)
    into v_before
    from auth.sessions s where s.id = p_session and s.user_id = p_user;
  if v_before is null then
    raise exception 'end_session: that person has no session %', p_session using errcode = 'P0002';
  end if;
  delete from auth.refresh_tokens where session_id = p_session;  get diagnostics v_tokens = row_count;
  delete from auth.sessions where id = p_session and user_id = p_user;
  perform admin._audit_user_action('session_end', p_user, v_before,
    jsonb_build_object('session_id', p_session, 'refresh_tokens', v_tokens), p_reason,
    jsonb_build_object('session_id', p_session));
  return jsonb_build_object('ok', true, 'user_id', p_user, 'session_id', p_session, 'refresh_tokens', v_tokens,
    'jwt_window', 'an access token issued before stays valid until it expires (at most 3600 s)');
end $$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, gate_predicate,
   anonymous_callers, signed_in_callers, argument_rules)
values ('iam', 'end_session', 'p_user uuid, p_session uuid, p_reason text',
  array['uuid'::regtype::oid, 'uuid'::regtype::oid, 'text'::regtype::oid], 'admin_user_security_tab.sql',
  'A platform admin ends one sign-in of one person (deletes that auth session and its refresh tokens) and writes one admin.admin_audit_log row. public.is_platform_admin() refuses everyone else with 42501 before anything is read.',
  'public.is_platform_admin()', false, true,
  '{"version": 1, "arguments": {
      "p_user": {"type": "uuid", "position": 1, "check": "public.is_platform_admin(), decided before the first read",
        "foreign": {"bounded": true, "note": "Any person by design: only a platform admin passes the gate, and 42501 is raised before anything is read."}},
      "p_session": {"type": "uuid", "position": 2, "check": "must belong to p_user, else P0002",
        "foreign": {"bounded": true, "note": "A session of anyone else raises P0002; only the session row whose user_id = p_user is deleted."}}}}'::jsonb)
on conflict do nothing;
grant execute on function iam.end_session(uuid, uuid, text) to authenticated;

-- ── 4. remove one MFA factor ────────────────────────────────────────────────────────────────
create or replace function iam.remove_mfa_factor(p_user uuid, p_factor uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
-- A platform admin removes one MFA factor of one person (lost phone / authenticator). Its
-- challenges and recovery codes go with it (FK cascade). Sessions already at aal2 are untouched.
declare v_before jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'remove_mfa_factor: a platform admin removes a factor' using errcode = '42501';
  end if;
  if p_user is null or p_factor is null then
    raise exception 'remove_mfa_factor: person and factor are required' using errcode = '22004';
  end if;
  select jsonb_build_object('factor_id', f.id, 'factor_type', f.factor_type::text, 'status', f.status::text,
                            'friendly_name', nullif(f.friendly_name, ''), 'created_at', f.created_at)
    into v_before
    from auth.mfa_factors f where f.id = p_factor and f.user_id = p_user;
  if v_before is null then
    raise exception 'remove_mfa_factor: that person has no factor %', p_factor using errcode = 'P0002';
  end if;
  delete from auth.mfa_factors where id = p_factor and user_id = p_user;
  perform admin._audit_user_action('mfa_factor_remove', p_user, v_before, null, p_reason,
    jsonb_build_object('factor_id', p_factor));
  return jsonb_build_object('ok', true, 'user_id', p_user, 'factor_id', p_factor);
end $$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, gate_predicate,
   anonymous_callers, signed_in_callers, argument_rules)
values ('iam', 'remove_mfa_factor', 'p_user uuid, p_factor uuid, p_reason text',
  array['uuid'::regtype::oid, 'uuid'::regtype::oid, 'text'::regtype::oid], 'admin_user_security_tab.sql',
  'A platform admin removes one MFA factor of one person (deletes the auth.mfa_factors row; challenges and recovery codes cascade) and writes one admin.admin_audit_log row. public.is_platform_admin() refuses everyone else with 42501 before anything is read.',
  'public.is_platform_admin()', false, true,
  '{"version": 1, "arguments": {
      "p_user": {"type": "uuid", "position": 1, "check": "public.is_platform_admin(), decided before the first read",
        "foreign": {"bounded": true, "note": "Any person by design: only a platform admin passes the gate, and 42501 is raised before anything is read."}},
      "p_factor": {"type": "uuid", "position": 2, "check": "must belong to p_user, else P0002",
        "foreign": {"bounded": true, "note": "A factor of anyone else raises P0002; only the factor row whose user_id = p_user is deleted."}}}}'::jsonb)
on conflict do nothing;
grant execute on function iam.remove_mfa_factor(uuid, uuid, text) to authenticated;

-- ── 5. revoke one API key ───────────────────────────────────────────────────────────────────
create or replace function iam.revoke_api_key_for_person(p_user uuid, p_key uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
-- A platform admin revokes one API key the person owns (personal key) or created (service key).
-- Same writes as iam.personal_api_key_revoke / iam.api_key_revoke: status revoked + revoked_at;
-- a service key's minted identity also leaves the key's organization (as api_key_revoke does).
declare v_row iam.api_keys%rowtype; v_kind text; v_caller uuid := auth.uid();
begin
  if not public.is_platform_admin() then
    raise exception 'revoke_api_key_for_person: a platform admin revokes a key' using errcode = '42501';
  end if;
  if p_user is null or p_key is null then
    raise exception 'revoke_api_key_for_person: person and key are required' using errcode = '22004';
  end if;
  select * into v_row from iam.api_keys k
   where k.id = p_key and (k.service_user_id = p_user or k.created_by = p_user) and k.deleted_at is null;
  if not found then
    raise exception 'revoke_api_key_for_person: that person has no key %', p_key using errcode = 'P0002';
  end if;
  v_kind := coalesce(v_row.metadata->>'identity_kind', '');
  if v_row.status = 'revoked' then
    return jsonb_build_object('ok', true, 'id', v_row.id, 'status', v_row.status, 'revoked_at', v_row.revoked_at, 'already', true);
  end if;
  update iam.api_keys set status = 'revoked', revoked_at = now(), updated_by = v_caller
   where id = p_key returning * into v_row;
  if v_kind <> 'personal_key' and v_row.service_user_id <> p_user then
    update iam.memberships set deleted_at = now(), updated_by = v_caller
     where user_id = v_row.service_user_id and container_type = 'organization'
       and container_id = v_row.organization_id and deleted_at is null;
  end if;
  perform admin._audit_user_action('api_key_revoke', p_user,
    jsonb_build_object('status', 'active'),
    jsonb_build_object('status', v_row.status, 'revoked_at', v_row.revoked_at), p_reason,
    jsonb_build_object('api_key_id', v_row.id, 'key_id', v_row.key_id, 'name', v_row.name,
                       'kind', v_kind, 'organization_id', v_row.organization_id));
  return jsonb_build_object('ok', true, 'id', v_row.id, 'status', v_row.status, 'revoked_at', v_row.revoked_at);
end $$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, gate_predicate,
   anonymous_callers, signed_in_callers, argument_rules)
values ('iam', 'revoke_api_key_for_person', 'p_user uuid, p_key uuid, p_reason text',
  array['uuid'::regtype::oid, 'uuid'::regtype::oid, 'text'::regtype::oid], 'admin_user_security_tab.sql',
  'A platform admin revokes one API key that person owns or created (status revoked; a service key''s minted identity leaves the key''s organization, as iam.api_key_revoke does) and writes one admin.admin_audit_log row. public.is_platform_admin() refuses everyone else with 42501 before anything is read.',
  'public.is_platform_admin()', false, true,
  '{"version": 1, "arguments": {
      "p_user": {"type": "uuid", "position": 1, "check": "public.is_platform_admin(), decided before the first read",
        "foreign": {"bounded": true, "note": "Any person by design: only a platform admin passes the gate, and 42501 is raised before anything is read."}},
      "p_key": {"type": "uuid", "position": 2, "check": "must belong to p_user, else P0002",
        "foreign": {"bounded": true, "note": "A key p_user neither owns nor created raises P0002; only that key is revoked."}}}}'::jsonb)
on conflict do nothing;
grant execute on function iam.revoke_api_key_for_person(uuid, uuid, text) to authenticated;
