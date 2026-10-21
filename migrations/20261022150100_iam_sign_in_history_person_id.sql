-- chair-step: renames iam.sign_in_event.user_id to person_id on a table born in 20261022150000 minutes earlier, with no reader outside the four functions this file re-states: canonical certify refuses a column named user_id (legacy_owner_col) and a rename has no additive form.
-- based-on: iam._record_sign_in() d0b3e3e22e120a246ff904896bc30230ac1c2cc92d7c339fbd12bdb5ef90fc15
-- based-on: iam._record_sign_in_method() 998fb84ffdc1fffc00135d5b44d7ab97a4611969b071836846115d0f1360fe83
-- based-on: admin.user_sign_ins(uuid, timestamp with time zone, integer) 134346d6aa2eaedfa1437203feddadd16f51b07665297f4480c13db1aac65699
-- based-on: admin._user_activity_sign_in(uuid, timestamp with time zone, integer) 14e909079f2aa125d89cda3251d04dd5eebb7b6302df8ec356bdc8d0064f9b6f
--
-- 20261022150100_iam_sign_in_history_person_id.sql (admin user page, final lane, 2026-10-21).
-- The person a sign-in belongs to is person_id (iam.canonical_certify_ok is then true). The capture
-- triggers are attached only afterwards, by 20261022150200, so nothing wrote through the old name.

alter table iam.sign_in_event rename column user_id to person_id;
alter index iam.sign_in_event_user_at_idx rename to sign_in_event_person_at_idx;

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
      (organization_id, person_id, session_id, signed_in_at, aal, ip, user_agent, factor_id, oauth_client_id)
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
        (organization_id, person_id, session_id, signed_in_at, method, provider, aal, ip, user_agent, factor_id, oauth_client_id)
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
           where e.person_id = p_user and e.signed_in_at < coalesce(p_before, 'infinity'::timestamptz)
           order by e.signed_in_at desc, e.id
           limit v_limit + 1) x
    left join auth.oauth_clients c on c.id = x.oauth_client_id;
  return jsonb_build_object(
    'items', case when jsonb_array_length(v_rows) > v_limit then v_rows - v_limit else v_rows end,
    'has_more', jsonb_array_length(v_rows) > v_limit);
end;
$$;

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
             x.person_id,
             jsonb_build_object('type', 'sign_in_event', 'id', x.id)) as item
      from iam.sign_in_event x
     where x.person_id = p_user and x.signed_in_at <= p_before
     order by x.signed_in_at desc
     limit p_limit
  ) s
$function$;
