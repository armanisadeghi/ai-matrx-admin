-- admin.user_activity(p_user, p_before, p_kinds, p_limit): ONE timeline of everything that happened
-- to and by one person, for the Activity tab of /administration/users/<id> (users one-roof lane T,
-- 2026-10-18). New functions; no based-on.
--
-- SHAPE. Each source is its own branch function admin._user_activity_<kind>(p_user, p_before,
-- p_limit) returning a jsonb array of items, newest first, at most p_limit, every one an
-- `ORDER BY <time> DESC LIMIT p_limit` over a (person, time) index (or a table small enough that
-- one person's rows sort in well under a millisecond). The main function calls each branch inside
-- its own BEGIN … EXCEPTION block, so a failing source is reported in `sources` as
-- {kind, ok:false, error} and never takes the feed down (Law 4: the tab shows "source unavailable").
--
-- KEYSET. p_before is INCLUSIVE (`at <= p_before`): rows written in one transaction share now(), so
-- a strict `<` would drop the tie partner at a page edge. The merge keeps only rows strictly newer
-- than the FLOOR (the oldest row of any branch that came back full — below it that branch may have
-- more), cuts to p_limit, and moves a tie at the cut wholly to the next page. next_before is the
-- first time NOT shown (null when every branch is exhausted).
--
-- SOURCES (kind: table · person column · index used)
--   admin         admin.admin_audit_log · target_user_id / actor_user_id · admin_audit_log_target_idx / _actor_idx
--   org_admin     iam.org_admin_audit · target_user_id / actor_user_id · none (~1.5k rows)
--   support       admin.support_sessions → support_session_events · target_user_id (sessions_target_user_id_created_at_idx)
--                 and the person as the admin (support_sessions_created_by_idx) → events (support_session_id, created_at)
--   sign_in       auth.sessions · user_id · user_id_created_at_idx (live sessions only; a signed-out session row is gone)
--   account       iam.account_closure · user_id · account_closure_user_id_idx (closed / reopened / erased)
--   conversation  chat.conversation · created_by · conversation_created_by_created_idx (20261018130000)
--   run           chat.agent_run · created_by · agent_run_created_by_created_idx; workflow.run · run_created_by_idx
--   feedback      users.user_feedback · user_id · idx_user_feedback_user_id
--   notification  communication.notification · recipient_user_id · notification_recipient_idx
--   sms           communication.sms_messages via sms_conversations.user_id (idx_sms_conversations_user_id →
--                 idx_sms_messages_conversation_id) and sent_by_user_id (idx_sms_messages_sent_by_user)
--   billing       billing.free_period_grant (free_period_grant_subject_user_idx), billing.usage_reset
--                 (usage_reset_subject_period_idx), billing.coupon (coupon_recipient_user_id_idx), billing.user_plan (pk)
--   error         ops.app_log level_no >= 40 · user_id · app_log_user_ts_idx, ordered by ts
-- ops.api_request_log is deliberately not a source.
--
-- Platform admins only (the body refuses anyone else with 42501); SECURITY DEFINER so the tab needs
-- no service-role route. The branch functions are SECURITY INVOKER helpers (a direct caller gets only
-- what their own row security allows); only user_activity is a declared door. Guard:
-- `pnpm check:user-activity` (a planted broken source is reported, not fatal; keyset pages).

create or replace function admin._user_activity_item(
  p_at timestamptz, p_kind text, p_key text, p_title text, p_detail text, p_actor uuid, p_record jsonb
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'at', p_at,
    'kind', p_kind,
    'key', p_kind || ':' || p_key,
    'title', p_title,
    'detail', nullif(btrim(coalesce(p_detail, '')), ''),
    'actor_id', p_actor,
    'record', p_record)
$$;

-- admin.admin_audit_log: actions ON the person, and actions BY the person (when they are an admin).
create or replace function admin._user_activity_admin(p_user uuid, p_before timestamptz, p_limit int)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select u.at, u.item from (
      (select l.created_at as at,
              admin._user_activity_item(l.created_at, 'admin', l.id::text,
                initcap(replace(replace(l.action, '_', ' '), '.', ' ')),
                coalesce(l.metadata->>'reason', l.after->>'reason', l.metadata->>'note'),
                l.actor_user_id,
                jsonb_build_object('type', 'admin_history', 'id', l.id, 'user_id', l.target_user_id)) as item
         from admin.admin_audit_log l
        where l.target_user_id = p_user and l.created_at <= p_before
          and l.action not like 'admin_lane_%'
        order by l.created_at desc
        limit p_limit)
      union all
      (select l.created_at,
              admin._user_activity_item(l.created_at, 'admin', l.id::text,
                initcap(replace(replace(l.action, '_', ' '), '.', ' ')),
                coalesce(l.metadata->>'reason', l.after->>'reason', l.metadata->>'note'),
                l.actor_user_id,
                case when l.target_user_id is null then null
                     else jsonb_build_object('type', 'user', 'id', l.target_user_id) end)
         from admin.admin_audit_log l
        where l.actor_user_id = p_user and l.created_at <= p_before
          and l.target_user_id is distinct from p_user
          and l.action not like 'admin_lane_%'
        order by l.created_at desc
        limit p_limit)
    ) u
    order by u.at desc
    limit p_limit
  ) s
$$;

-- iam.org_admin_audit: organization admin actions on or by the person (~1.5k rows, no index needed).
create or replace function admin._user_activity_org_admin(p_user uuid, p_before timestamptz, p_limit int)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select a.created_at as at,
           admin._user_activity_item(a.created_at, 'org_admin', a.id::text,
             initcap(replace(replace(a.action, '_', ' '), '.', ' ')),
             coalesce(a.detail->>'reason', a.metadata->>'reason'),
             a.actor_user_id,
             jsonb_build_object('type', 'organization', 'id', a.organization_id)) as item
      from iam.org_admin_audit a
     where (a.target_user_id = p_user or a.actor_user_id = p_user) and a.created_at <= p_before
     order by a.created_at desc
     limit p_limit
  ) s
$$;

-- Support sessions: every lifecycle event of a session ON the person, or one the person ran.
create or replace function admin._user_activity_support(p_user uuid, p_before timestamptz, p_limit int)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select e.created_at as at,
           admin._user_activity_item(e.created_at, 'support', e.id::text,
             'Support session ' || e.event,
             case when e.event = 'created' then ss.reason
                  when e.event = 'ended' then ss.end_reason
                  else e.via end,
             e.admin_user_id,
             jsonb_build_object('type', 'support_session', 'id', ss.id, 'user_id', ss.target_user_id)) as item
      from admin.support_sessions ss
      join admin.support_session_events e on e.support_session_id = ss.id
     where (ss.target_user_id = p_user or ss.created_by = p_user) and e.created_at <= p_before
     order by e.created_at desc
     limit p_limit
  ) s
$$;

-- auth.sessions: a sign-in is a session row. Only live sessions exist (sign-out deletes the row).
create or replace function admin._user_activity_sign_in(p_user uuid, p_before timestamptz, p_limit int)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select x.created_at as at,
           admin._user_activity_item(x.created_at, 'sign_in', x.id::text,
             'Signed in',
             left(x.user_agent, 120),
             x.user_id,
             jsonb_build_object('type', 'auth_session', 'id', x.id)) as item
      from auth.sessions x
     where x.user_id = p_user and x.created_at <= p_before
     order by x.created_at desc
     limit p_limit
  ) s
$$;

-- iam.account_closure: closed / reopened / erased, each its own moment.
create or replace function admin._user_activity_account(p_user uuid, p_before timestamptz, p_limit int)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select ev.at,
           admin._user_activity_item(ev.at, 'account', c.id::text || ':' || ev.what, ev.title, ev.detail, ev.actor,
             jsonb_build_object('type', 'user', 'id', c.user_id)) as item
      from iam.account_closure c
      cross join lateral (values
        ('closed', c.closed_at, 'Account closed', c.reason, c.created_by),
        ('reopened', c.reopened_at, 'Account reopened', c.metadata->>'reopen_reason', c.updated_by),
        ('erased', c.erased_at, 'Account erased', null::text, c.updated_by)
      ) as ev(what, at, title, detail, actor)
     where c.user_id = p_user and ev.at is not null and ev.at <= p_before
     order by ev.at desc
     limit p_limit
  ) s
$$;

create or replace function admin._user_activity_conversation(p_user uuid, p_before timestamptz, p_limit int)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select c.created_at as at,
           admin._user_activity_item(c.created_at, 'conversation', c.id::text,
             'Conversation started',
             coalesce(nullif(btrim(c.title), ''), 'Untitled'),
             c.created_by,
             jsonb_build_object('type', 'conversation', 'id', c.id)) as item
      from chat.conversation c
     where c.created_by = p_user and c.deleted_at is null and c.created_at <= p_before
     order by c.created_at desc
     limit p_limit
  ) s
$$;

-- Runs: background agent jobs (chat.agent_run) and workflow runs (workflow.run).
create or replace function admin._user_activity_run(p_user uuid, p_before timestamptz, p_limit int)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select u.at, u.item from (
      (select r.created_at as at,
              admin._user_activity_item(r.created_at, 'run', 'agent:' || r.id::text,
                'Agent job',
                replace(r.kind, '_', ' ') || ' · ' || r.status,
                r.created_by,
                jsonb_build_object('type', 'agent_run', 'id', r.id)) as item
         from chat.agent_run r
        where r.created_by = p_user and r.created_at <= p_before and r.deleted_at is null
        order by r.created_at desc
        limit p_limit)
      union all
      (select w.created_at,
              admin._user_activity_item(w.created_at, 'run', 'workflow:' || w.id::text,
                'Workflow run',
                w.status,
                w.created_by,
                jsonb_build_object('type', 'workflow_run', 'id', w.id))
         from workflow.run w
        where w.created_by = p_user and w.created_at <= p_before and w.deleted_at is null
        order by w.created_at desc
        limit p_limit)
    ) u
    order by u.at desc
    limit p_limit
  ) s
$$;

create or replace function admin._user_activity_feedback(p_user uuid, p_before timestamptz, p_limit int)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select f.created_at as at,
           admin._user_activity_item(f.created_at, 'feedback', f.id::text,
             'Feedback filed',
             left(f.description, 160),
             f.user_id,
             jsonb_build_object('type', 'feedback', 'id', f.id)) as item
      from users.user_feedback f
     where f.user_id = p_user and f.deleted_at is null and f.created_at <= p_before
     order by f.created_at desc
     limit p_limit
  ) s
$$;

create or replace function admin._user_activity_notification(p_user uuid, p_before timestamptz, p_limit int)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select n.created_at as at,
           admin._user_activity_item(n.created_at, 'notification', n.id::text,
             coalesce(nullif(btrim(n.subject), ''), replace(n.event_key, '_', ' ')),
             n.channel || ' · ' || n.status,
             n.created_by,
             jsonb_build_object('type', 'notification', 'id', n.id, 'href', nullif(n.deep_link, ''))) as item
      from communication.notification n
     where n.recipient_user_id = p_user and n.created_at <= p_before
     order by n.created_at desc
     limit p_limit
  ) s
$$;

create or replace function admin._user_activity_sms(p_user uuid, p_before timestamptz, p_limit int)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select distinct on (u.at, u.id) u.at, u.id, u.item from (
      (select m.created_at as at, m.id,
              admin._user_activity_item(m.created_at, 'sms', m.id::text,
                case when m.direction = 'inbound' then 'Text received' else 'Text sent' end,
                left(m.body, 120),
                m.sent_by_user_id,
                jsonb_build_object('type', 'sms_conversation', 'id', m.conversation_id)) as item
         from communication.sms_conversations c
         join communication.sms_messages m on m.conversation_id = c.id
        where c.user_id = p_user and m.created_at <= p_before and m.deleted_at is null
        order by m.created_at desc
        limit p_limit)
      union all
      (select m.created_at, m.id,
              admin._user_activity_item(m.created_at, 'sms', m.id::text,
                'Text sent',
                left(m.body, 120),
                m.sent_by_user_id,
                jsonb_build_object('type', 'sms_conversation', 'id', m.conversation_id))
         from communication.sms_messages m
        where m.sent_by_user_id = p_user and m.created_at <= p_before and m.deleted_at is null
        order by m.created_at desc
        limit p_limit)
    ) u
    order by u.at desc, u.id
    limit p_limit
  ) s
$$;

-- Plan, free months, usage resets, coupons sent to the person.
create or replace function admin._user_activity_billing(p_user uuid, p_before timestamptz, p_limit int)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select u.at, u.item from (
      (select g.created_at as at,
              admin._user_activity_item(g.created_at, 'billing', 'grant:' || g.id::text,
                'Free months granted',
                g.months || ' mo · ' || g.plan_key || coalesce(' · ' || nullif(g.note, ''), ''),
                g.granted_by,
                jsonb_build_object('type', 'billing', 'id', g.id, 'user_id', p_user)) as item
         from billing.free_period_grant g
        where g.subject_user_id = p_user and g.created_at <= p_before and g.deleted_at is null
        order by g.created_at desc
        limit p_limit)
      union all
      (select r.reset_at,
              admin._user_activity_item(r.reset_at, 'billing', 'reset:' || r.id::text,
                'Usage reset',
                r.period::text || coalesce(' · ' || nullif(r.note, ''), ''),
                r.reset_by,
                jsonb_build_object('type', 'billing', 'id', r.id, 'user_id', p_user))
         from billing.usage_reset r
        where r.subject_user_id = p_user and r.reset_at <= p_before and r.deleted_at is null
        order by r.reset_at desc
        limit p_limit)
      union all
      (select c.created_at,
              admin._user_activity_item(c.created_at, 'billing', 'coupon:' || c.id::text,
                case when c.revoked_at is not null then 'Coupon revoked' else 'Coupon sent' end,
                c.code || coalesce(' · ' || c.plan_key, ''),
                c.created_by,
                jsonb_build_object('type', 'coupon', 'id', c.id, 'user_id', p_user))
         from billing.coupon c
        where c.recipient_user_id = p_user and c.created_at <= p_before and c.deleted_at is null
        order by c.created_at desc
        limit p_limit)
      union all
      (select p.updated_at,
              admin._user_activity_item(p.updated_at, 'billing', 'plan:' || p.user_id::text,
                'Plan set',
                coalesce(p.plan_id, p.tier::text) || coalesce(' · ' || nullif(p.note, ''), ''),
                p.granted_by,
                jsonb_build_object('type', 'billing', 'id', p.user_id, 'user_id', p_user))
         from billing.user_plan p
        where p.user_id = p_user and p.updated_at <= p_before)
    ) u
    order by u.at desc
    limit p_limit
  ) s
$$;

-- Errors the person hit: ops.app_log at ERROR or above, ordered by ts (app_log_user_ts_idx).
create or replace function admin._user_activity_error(p_user uuid, p_before timestamptz, p_limit int)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select l.ts as at,
           admin._user_activity_item(l.ts, 'error', l.id::text,
             coalesce(nullif(l.exc_type, ''), 'Error') || coalesce(' · ' || nullif(l.feature, ''), ''),
             left(l.message, 200),
             l.user_id,
             case when l.conversation_id is not null
                  then jsonb_build_object('type', 'conversation', 'id', l.conversation_id)
                  else jsonb_build_object('type', 'app_log', 'id', l.id) end) as item
      from ops.app_log l
     where l.user_id = p_user and l.level_no >= 40 and l.ts <= p_before
     order by l.ts desc
     limit p_limit
  ) s
$$;

create or replace function admin.user_activity(
  p_user uuid,
  p_before timestamptz default null,
  p_kinds text[] default null,
  p_limit int default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c_kinds constant text[] := array[
    'admin', 'org_admin', 'support', 'sign_in', 'account', 'conversation',
    'run', 'feedback', 'notification', 'sms', 'billing', 'error'];
  v_before timestamptz := coalesce(p_before, 'infinity'::timestamptz);
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_all jsonb := '[]'::jsonb;
  v_branch jsonb;
  v_sources jsonb := '[]'::jsonb;
  v_floor timestamptz := '-infinity'::timestamptz;
  v_truncated boolean := false;
  v_count int;
  v_cut timestamptz;
  v_page jsonb;
  v_next timestamptz;
  k text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres'
     and not public.is_platform_admin() then
    raise exception 'admin.user_activity: platform admins only' using errcode = '42501';
  end if;
  if p_user is null then
    raise exception 'admin.user_activity: p_user is required' using errcode = '22004';
  end if;

  if p_kinds is not null then
    foreach k in array p_kinds loop
      if not (k = any (c_kinds)) then
        v_sources := v_sources || jsonb_build_array(jsonb_build_object('kind', k, 'ok', false, 'error', 'unknown kind'));
      end if;
    end loop;
  end if;

  foreach k in array c_kinds loop
    continue when p_kinds is not null and not (k = any (p_kinds));
    begin
      -- Test seam (pnpm check:user-activity): a transaction-local setting breaks one named source
      -- inside its wrapper, the same path a real branch error takes. Unset = no effect.
      if current_setting('matrx.test_break_activity_source', true) = k then
        raise exception 'planted: % source broken', k;
      end if;
      execute format('select admin.%I($1, $2, $3)', '_user_activity_' || k)
        into v_branch using p_user, v_before, v_limit;
      v_branch := coalesce(v_branch, '[]'::jsonb);
      if jsonb_array_length(v_branch) >= v_limit then
        v_truncated := true;
        v_floor := greatest(v_floor, (v_branch -> (jsonb_array_length(v_branch) - 1) ->> 'at')::timestamptz);
      end if;
      v_all := v_all || v_branch;
      v_sources := v_sources || jsonb_build_array(jsonb_build_object('kind', k, 'ok', true));
    exception when others then
      v_sources := v_sources || jsonb_build_array(jsonb_build_object('kind', k, 'ok', false, 'error', sqlerrm, 'code', sqlstate));
    end;
  end loop;

  -- Rows strictly newer than the floor are complete in every branch.
  select count(*) into v_count
    from jsonb_array_elements(v_all) e
   where (e ->> 'at')::timestamptz > v_floor;

  if v_count > v_limit then
    select c.at into v_cut from (
      select (e ->> 'at')::timestamptz as at
        from jsonb_array_elements(v_all) e
       where (e ->> 'at')::timestamptz > v_floor
       order by 1 desc
       offset v_limit limit 1) c;
    -- The tie at the cut moves wholly to the next page.
    select coalesce(jsonb_agg(e order by (e ->> 'at')::timestamptz desc, e ->> 'key'), '[]'::jsonb) into v_page
      from jsonb_array_elements(v_all) e
     where (e ->> 'at')::timestamptz > v_cut;
    v_next := v_cut;
    if jsonb_array_length(v_page) = 0 then
      -- More than p_limit rows share one instant: show p_limit of them and step past the instant.
      select coalesce(jsonb_agg(x.e order by x.k), '[]'::jsonb) into v_page from (
        select e, e ->> 'key' as k from jsonb_array_elements(v_all) e
         where (e ->> 'at')::timestamptz = v_cut order by 2 limit v_limit) x;
      v_next := v_cut - interval '1 microsecond';
    end if;
  else
    select coalesce(jsonb_agg(e order by (e ->> 'at')::timestamptz desc, e ->> 'key'), '[]'::jsonb) into v_page
      from jsonb_array_elements(v_all) e
     where (e ->> 'at')::timestamptz > v_floor;
    v_next := case when v_truncated then v_floor end;
    if v_truncated and jsonb_array_length(v_page) = 0 then
      -- A full branch whose every row shares one instant: show them and step past it.
      select coalesce(jsonb_agg(x.e order by x.k), '[]'::jsonb) into v_page from (
        select e, e ->> 'key' as k from jsonb_array_elements(v_all) e
         where (e ->> 'at')::timestamptz = v_floor order by 2 limit v_limit) x;
      v_next := v_floor - interval '1 microsecond';
    end if;
  end if;

  return jsonb_build_object('items', v_page, 'next_before', v_next, 'sources', v_sources);
end;
$$;


insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers, gate_predicate)
values
  ('admin', 'user_activity', 'p_user uuid, p_before timestamp with time zone, p_kinds text[], p_limit integer',
   array['uuid'::regtype, 'timestamptz'::regtype, 'text[]'::regtype, 'int4'::regtype]::oid[],
   'READ. p_user is any auth user; the body refuses anyone but a platform admin (or the server) with 42501 and returns one keyset page of that person''s activity timeline.',
   'migrations/20261018130100_admin_user_activity.sql (users one-roof lane T)',
   null, true, false, 'public.is_platform_admin()')
on conflict do nothing;

grant execute on function admin.user_activity(uuid, timestamptz, text[], int) to authenticated, service_role;
