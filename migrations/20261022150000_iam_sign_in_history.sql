-- based-on: admin._user_activity_sign_in(uuid, timestamp with time zone, integer) 14b8655c6da449b7e53f723f5e96042fcc3840454b47b47afc47f43b0985cbff
--
-- 20261022150000_iam_sign_in_history.sql (admin user page, final lane, 2026-10-21).
--
-- WHY. auth.audit_log_entries has had no writes since 2026-08-20 and auth.sessions holds LIVE sessions
-- only (a signed-out or expired session leaves no row), so nothing recorded that a person signed in.
-- This records every new sign-in ourselves.
--
-- WHAT.
--   1. iam.sign_in_event — one row per sign-in (ledger, admin-only: written under the Matrx System
--      tenant with visibility 'none' and no created_by, ruling L1b-1; the person rides user_id).
--   2. iam._record_sign_in()        AFTER INSERT ON auth.sessions      — the sign-in itself (attached by 20261022150100).
--      iam._record_sign_in_method() AFTER INSERT ON auth.mfa_amr_claims — how (password, otp, oauth…);
--      a second method on the same session (an MFA step-up) is its own event.
--      🚨 NEITHER CAN EVER BLOCK OR FAIL A SIGN-IN: each body runs inside BEGIN … EXCEPTION WHEN OTHERS,
--      reports through ops.record_system_error (itself guarded), and returns NULL. Trigger EXECUTE is not
--      checked at fire time, so the auth role needs no grant.
--   3. A one-time seed from the live sessions (real sign-ins; metadata.seeded_from = 'live_session').
--   4. Retention: one platform.retention_policy row (purge 365 days after last change). No purge job.
--   5. admin.user_sign_ins(p_user, p_before, p_limit) — THE read for the Security tab's Sign-in history.
--   6. admin._user_activity_sign_in reads the history instead of live sessions.

-- ── 1. the table ────────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('iam.sign_in_event') is null then
    perform platform.create_entity_table(
      p_schema => 'iam', p_table => 'sign_in_event', p_token => 'iam_sign_in_event',
      p_label => 'Sign-in',
      p_fields => array[
        'user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE',
        'session_id uuid',
        'signed_in_at timestamptz NOT NULL',
        'method text',
        'provider text',
        'aal text',
        'ip inet',
        'user_agent text',
        'factor_id uuid',
        'oauth_client_id uuid'
      ],
      p_variant => 'ledger', p_versioned => false, p_soft_delete => false,
      p_visibility => 'none', p_category => false, p_listed => false,
      p_org_default => false, p_gin_jsonb => false);
  end if;
end $$;

create index if not exists sign_in_event_user_at_idx on iam.sign_in_event (user_id, signed_in_at desc, id);
create index if not exists sign_in_event_session_idx on iam.sign_in_event (session_id) where session_id is not null;

comment on table iam.sign_in_event is
  'Every sign-in, recorded by triggers on auth.sessions (the sign-in) and auth.mfa_amr_claims (its method). Admin-only (Matrx System tenant, ruling L1b-1); user_id is the person. Capture can never block a sign-in.';

-- ── 2. capture ──────────────────────────────────────────────────────────────────────────────
create or replace function iam._record_sign_in()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
-- AFTER INSERT ON auth.sessions. NEVER blocks a sign-in: everything is inside the guarded block.
begin
  begin
    -- Test seam (rolled-back proof in the migration's verification): a transaction-local setting makes
    -- the capture fail the way a real failure would. Unset = no effect.
    if current_setting('matrx.test_break_sign_in_capture', true) = 'on' then
      raise exception 'planted: sign-in capture broken';
    end if;
    insert into iam.sign_in_event
      (organization_id, user_id, session_id, signed_in_at, aal, ip, user_agent, factor_id, oauth_client_id)
    values
      ((select so.organization_id from iam.system_orgs so where so.key = 'system'),
       new.user_id, new.id, coalesce(new.created_at, now()), new.aal::text, new.ip,
       left(new.user_agent, 1000), new.factor_id, new.oauth_client_id);
  exception when others then
    begin
      perform ops.record_system_error(jsonb_build_object(
        'organization_id', '39c38960-d30c-4840-b0c1-c9960de95582'::uuid,
        'user_id', new.user_id,
        'kind', 'sign_in_history_capture_failed',
        'error_type', sqlstate,
        'error_text', format('iam._record_sign_in: session %s of person %s was not recorded in iam.sign_in_event: %s (%s). The sign-in itself succeeded.',
                             new.id, new.user_id, sqlerrm, sqlstate),
        'source_app', 'database',
        'source_feature', 'auth'));
    exception when others then
      null;  -- reporting failed too; the sign-in still goes through
    end;
  end;
  return null;
end;
$$;

create or replace function iam._record_sign_in_method()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
-- AFTER INSERT ON auth.mfa_amr_claims. Names the method on the session's sign-in; a further method on
-- the same session (MFA step-up) is recorded as its own event. NEVER blocks a sign-in.
declare
  v_provider text;
begin
  begin
    if current_setting('matrx.test_break_sign_in_capture', true) = 'on' then
      raise exception 'planted: sign-in capture broken';
    end if;
    if new.authentication_method in ('oauth', 'sso/saml') then
      select i.provider into v_provider
        from auth.sessions s
        join auth.identities i on i.user_id = s.user_id
       where s.id = new.session_id
       order by i.last_sign_in_at desc nulls last
       limit 1;
    end if;
    update iam.sign_in_event e
       set method = new.authentication_method, provider = v_provider
     where e.session_id = new.session_id and e.method is null;
    if not found then
      insert into iam.sign_in_event
        (organization_id, user_id, session_id, signed_in_at, method, provider, aal, ip, user_agent, factor_id, oauth_client_id)
      select (select so.organization_id from iam.system_orgs so where so.key = 'system'),
             s.user_id, s.id, coalesce(new.created_at, now()), new.authentication_method, v_provider,
             s.aal::text, s.ip, left(s.user_agent, 1000), s.factor_id, s.oauth_client_id
        from auth.sessions s
       where s.id = new.session_id;
    end if;
  exception when others then
    begin
      perform ops.record_system_error(jsonb_build_object(
        'organization_id', '39c38960-d30c-4840-b0c1-c9960de95582'::uuid,
        'kind', 'sign_in_history_capture_failed',
        'error_type', sqlstate,
        'error_text', format('iam._record_sign_in_method: method %s of session %s was not recorded in iam.sign_in_event: %s (%s). The sign-in itself succeeded.',
                             new.authentication_method, new.session_id, sqlerrm, sqlstate),
        'source_app', 'database',
        'source_feature', 'auth'));
    exception when others then
      null;
    end;
  end;
  return null;
end;
$$;

-- ── 3. seed from the live sessions (each is a real sign-in) ─────────────────────────────────
insert into iam.sign_in_event
  (organization_id, user_id, session_id, signed_in_at, method, provider, aal, ip, user_agent, factor_id, oauth_client_id, metadata)
select (select so.organization_id from iam.system_orgs so where so.key = 'system'),
       s.user_id, s.id, s.created_at, m.authentication_method,
       case when m.authentication_method in ('oauth', 'sso/saml') then (
         select i.provider from auth.identities i where i.user_id = s.user_id
          order by i.last_sign_in_at desc nulls last limit 1) end,
       s.aal::text, s.ip, left(s.user_agent, 1000), s.factor_id, s.oauth_client_id,
       jsonb_build_object('seeded_from', 'live_session')
  from auth.sessions s
  join iam.users u on u.id = s.user_id
  left join lateral (
    select a.authentication_method from auth.mfa_amr_claims a
     where a.session_id = s.id order by a.created_at limit 1) m on true
 where s.created_at is not null
   and not exists (select 1 from iam.sign_in_event e where e.session_id = s.id);

-- ── 4. retention (one policy row; the lifecycle system purges) ─────────────────────────────
insert into platform.retention_policy
  (scope, entity_token, trigger_kind, mode, retention_days, label, description, basis, set_by, review_due, effective_from,
   organization_id)
select 'entity', 'iam_sign_in_event', 'untouched', 'purge', 365, 'Sign-in history retention',
       'Purges a sign-in record a year after it was written.',
       'Agent-set (admin user page final lane, 2026-10-21): Auth0 and Okta keep sign-in logs 30–90 days on standard plans; a year covers any account investigation.',
       'agent', date '2027-04-21', now() + interval '24 hours',
       (select so.organization_id from iam.system_orgs so where so.key = 'system')
 where not exists (select 1 from platform.retention_policy p where p.entity_token = 'iam_sign_in_event' and p.scope = 'entity');

-- ── 5. the Security tab's read ──────────────────────────────────────────────────────────────
create or replace function admin.user_sign_ins(p_user uuid, p_before timestamptz default null, p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_rows jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres'
     and not public.is_platform_admin() then
    raise exception 'admin.user_sign_ins: platform admins only' using errcode = '42501';
  end if;
  if p_user is null then
    raise exception 'admin.user_sign_ins: p_user is required' using errcode = '22004';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id,
           'signed_in_at', x.signed_in_at,
           'method', x.method,
           'provider', x.provider,
           'aal', x.aal,
           'ip', host(x.ip),
           'user_agent', x.user_agent,
           'session_id', x.session_id,
           'session_live', exists (select 1 from auth.sessions s where s.id = x.session_id),
           'oauth_client', c.client_name,
           'seeded', x.metadata ? 'seeded_from') order by x.signed_in_at desc, x.id), '[]'::jsonb)
    into v_rows
    from (select e.* from iam.sign_in_event e
           where e.user_id = p_user and e.signed_in_at < coalesce(p_before, 'infinity'::timestamptz)
           order by e.signed_in_at desc, e.id
           limit v_limit + 1) x
    left join auth.oauth_clients c on c.id = x.oauth_client_id;
  return jsonb_build_object(
    'items', case when jsonb_array_length(v_rows) > v_limit then v_rows - v_limit else v_rows end,
    'has_more', jsonb_array_length(v_rows) > v_limit);
end;
$$;

comment on function admin.user_sign_ins(uuid, timestamptz, integer) is
  'One page (newest first, strictly before p_before) of a person''s sign-in history from iam.sign_in_event. Platform admins only.';

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers, gate_predicate)
values
  ('admin', 'user_sign_ins', 'p_user uuid, p_before timestamp with time zone, p_limit integer',
   array['uuid'::regtype, 'timestamptz'::regtype, 'integer'::regtype]::oid[],
   'READ. p_user is any auth user; the body refuses anyone but a platform admin (or the server) with 42501 and returns one page of that person''s sign-in history.',
   'migrations/20261022150000_iam_sign_in_history.sql (admin user page final lane)',
   null, true, false, 'public.is_platform_admin()')
on conflict do nothing;

grant execute on function admin.user_sign_ins(uuid, timestamptz, integer) to authenticated, service_role;

-- ── 6. the Activity timeline's sign-in source ───────────────────────────────────────────────
create or replace function admin._user_activity_sign_in(p_user uuid, p_before timestamp with time zone, p_limit integer)
returns jsonb
language sql
stable
set search_path to ''
as $function$
  -- Every recorded sign-in (iam.sign_in_event, written by the auth triggers since 2026-10-21 and seeded
  -- from the sessions that were live then). Live sessions stay on the Security tab's sessions table.
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select x.signed_in_at as at,
           admin._user_activity_item(x.signed_in_at, 'sign_in', x.id::text,
             'Signed in' || coalesce(' · ' || coalesce(x.provider, x.method), ''),
             concat_ws(' · ', host(x.ip), left(x.user_agent, 100)),
             x.user_id,
             jsonb_build_object('type', 'sign_in_event', 'id', x.id)) as item
      from iam.sign_in_event x
     where x.user_id = p_user and x.signed_in_at <= p_before
     order by x.signed_in_at desc
     limit p_limit
  ) s
$function$;
