-- admin.user_overview(p_user): THE ONE READ for one person's admin record page
-- (/administration/users/<id>, users one-roof lane B1, 2026-10-17). New function; no based-on.
--
-- One call answers the page's header, right rail, KPI strip and attention row:
--   identity     auth.users (the rows platform.admin_auth_user exposes, plus phone) + users.profiles
--   plan/usage   billing.user_usage_state(p_user) — the same usage state the gate enforces
--   acquisition  users._acquisition_facts (the fact under users._account_facts; no per-row plan call)
--   closure      the newest iam.account_closure row
--   admin_level  admin.admins
--   counts       organizations (iam.organization_member), conversations (chat.conversation by
--                created_by, cx_conversation_created_by_updated_idx)
--   ai           runtime._ai_usage_hourly by person — the fact of the declared drill definition
--                `ai_usage` (the usage page's numbers; F11: never a second meaning of cost). Never
--                the whole-table users.admin_account_facts(): measured 2026-10-17, the per-person
--                spine read (runtime.global_request by created_by) cost 809 ms on the heaviest
--                account; the hourly fact answers in a few ms.
--   attention    usage near/over its limit, spend approvals waiting on this person's first run,
--                runs a spend gate held for this person (30 days), open feedback they sent, a live
--                support session on them, and the closure itself — each with the ids its record opens.
--
-- Platform admins only (the body refuses anyone else with 42501); SECURITY DEFINER so the page
-- needs no service-role route.

create or replace function admin.user_overview(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_identity jsonb;
  v_usage jsonb;
  v_usage_error text;
  v_since timestamptz := now() - interval '30 days';
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres'
     and not public.is_platform_admin() then
    raise exception 'admin.user_overview: platform admins only' using errcode = '42501';
  end if;
  if p_user is null then
    raise exception 'admin.user_overview: p_user is required' using errcode = '22004';
  end if;

  select jsonb_build_object(
           'id', u.id,
           'email', u.email,
           'phone', nullif(u.phone, ''),
           'display_name', coalesce(nullif(p.display_name, ''), u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
           'avatar_url', p.avatar_url,
           'created_at', u.created_at,
           'last_sign_in_at', u.last_sign_in_at,
           'email_confirmed_at', u.email_confirmed_at,
           'phone_confirmed_at', u.phone_confirmed_at,
           'banned_until', u.banned_until,
           'is_anonymous', coalesce(u.is_anonymous, false),
           'providers', case
               when jsonb_typeof(u.raw_app_meta_data->'providers') = 'array' then u.raw_app_meta_data->'providers'
               when u.raw_app_meta_data ? 'provider' then jsonb_build_array(u.raw_app_meta_data->>'provider')
               else '[]'::jsonb end,
           'permissions', case
               when jsonb_typeof(u.raw_app_meta_data->'permissions') = 'array' then u.raw_app_meta_data->'permissions'
               else '[]'::jsonb end,
           'onboarding_completed', coalesce((u.raw_user_meta_data->>'onboarding_completed')::boolean, false))
    into v_identity
    from auth.users u
    left join users.profiles p on p.id = u.id
   where u.id = p_user;

  if v_identity is null then
    return null;
  end if;

  -- The usage state is a read of its own; a failure there must not blank the page — it is
  -- reported in the answer (usage_error), never swallowed.
  begin
    v_usage := billing.user_usage_state(p_user);
  exception when others then
    v_usage := null;
    v_usage_error := sqlerrm;
  end;

  return jsonb_build_object(
    'identity', v_identity,
    'usage', v_usage,
    'usage_error', v_usage_error,
    'admin_level', (select a.level::text from admin.admins a where a.user_id = p_user),
    'closure', (
      select jsonb_build_object('id', c.id, 'closed_at', c.closed_at, 'reason', c.reason,
                                'reopened_at', c.reopened_at, 'erased_at', c.erased_at)
        from iam.account_closure c
       where c.user_id = p_user and c.deleted_at is null
       order by c.closed_at desc nulls last
       limit 1),
    'acquisition', (
      select jsonb_build_object('traffic_kind', f.traffic_kind, 'campaign', f.campaign,
                                'referrer_host', f.referrer_host, 'identity_state', f.identity_state,
                                'blocked', f.blocked)
        from users._acquisition_facts f
       where f.person_id = p_user
       limit 1),
    'counts', jsonb_build_object(
      'organizations', (select count(*) from iam.organization_member m where m.user_id = p_user),
      'conversations', (select count(*) from chat.conversation c where c.created_by = p_user and c.deleted_at is null)),
    'ai', (
      select jsonb_build_object(
               'requests_30d', coalesce(sum(h.requests) filter (where h.bucket >= v_since), 0),
               'cost_30d', coalesce(sum(h.cost) filter (where h.bucket >= v_since), 0),
               'active_days_30d', count(distinct (h.bucket at time zone 'utc')::date) filter (where h.bucket >= v_since and h.requests > 0),
               'requests_total', coalesce(sum(h.requests), 0),
               'cost_total', coalesce(sum(h.cost), 0),
               'last_ai_at', max(h.bucket) filter (where h.requests > 0),
               'as_of', max(h.refreshed_at))
        from runtime._ai_usage_hourly h
       where h.person_id = p_user),
    'attention', jsonb_build_object(
      'approvals_waiting', coalesce((
        select jsonb_agg(jsonb_build_object('id', r.id, 'subject_kind', r.subject_kind, 'subject_id', r.subject_id,
                                            'subject_name', r.subject_name, 'blocked_runs', r.blocked_runs,
                                            'last_blocked_at', r.last_blocked_at) order by r.last_blocked_at desc nulls last)
          from (select * from billing.run_approval r
                 where r.first_run_person_id = p_user and r.status = 'waiting' and r.deleted_at is null
                 order by r.last_blocked_at desc nulls last limit 5) r), '[]'::jsonb),
      'approvals_waiting_count', (select count(*) from billing.run_approval r
                                   where r.first_run_person_id = p_user and r.status = 'waiting' and r.deleted_at is null),
      'held_runs', coalesce((
        select jsonb_agg(jsonb_build_object('id', h.id, 'agent_name', h.agent_name, 'mandate_key', h.mandate_key,
                                            'gate', h.gate, 'last_seen_at', h.last_seen_at) order by h.last_seen_at desc)
          from (select * from billing.held_run h
                 where h.run_user_id = p_user and h.deleted_at is null and h.last_seen_at >= v_since
                 order by h.last_seen_at desc limit 5) h), '[]'::jsonb),
      'held_runs_count', (select count(*) from billing.held_run h
                           where h.run_user_id = p_user and h.deleted_at is null and h.last_seen_at >= v_since),
      'feedback_open', coalesce((
        select jsonb_agg(jsonb_build_object('id', f.id, 'status', f.status, 'feedback_type', f.feedback_type,
                                            'description', left(f.description, 120), 'created_at', f.created_at) order by f.created_at desc)
          from (select * from users.user_feedback f
                 where f.user_id = p_user and f.deleted_at is null
                   and f.status in ('new', 'triaged', 'in_review', 'in_progress', 'awaiting_review', 'user_review')
                 order by f.created_at desc limit 5) f), '[]'::jsonb),
      'feedback_open_count', (select count(*) from users.user_feedback f
                               where f.user_id = p_user and f.deleted_at is null
                                 and f.status in ('new', 'triaged', 'in_review', 'in_progress', 'awaiting_review', 'user_review')),
      'support_live', (
        select jsonb_build_object('id', s.id, 'status', s.status, 'expires_at', s.expires_at, 'started_at', s.started_at)
          from admin.support_sessions s
         where s.target_user_id = p_user and s.status in ('pending', 'claiming', 'active')
           and s.ended_at is null and (s.expires_at is null or s.expires_at > now())
         order by s.created_at desc
         limit 1)),
    'computed_at', now());
end;
$$;

comment on function admin.user_overview(uuid) is
  'THE one read for the admin user record page (/administration/users/<id>): identity, plan and usage state, acquisition, closure, admin level, counts, 30-day AI usage (runtime._ai_usage_hourly, the ai_usage drill fact) and attention signals with record ids. Platform admins only.';

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers, gate_predicate)
values
  ('admin', 'user_overview', 'p_user uuid', array['uuid'::regtype]::oid[],
   'READ. p_user is any auth user; the body refuses anyone but a platform admin (or the server) with 42501 and returns one jsonb overview of that person.',
   'migrations/20261017190000_admin_user_overview.sql (users one-roof lane B1)',
   null, true, false, 'public.is_platform_admin()')
on conflict do nothing;

grant execute on function admin.user_overview(uuid) to authenticated, service_role;
