-- chair-step: lane Q users one-roof — DROP + re-create admin.user_activity with a trailing defaulted p_before_key (composite page cursor; a signature change CREATE OR REPLACE cannot make).
-- based-on: admin._user_activity_billing(uuid, timestamp with time zone, integer) d2d6c70c43a05f84607d6799087fff6230f693443223d127d620df24654c9edd
-- based-on: admin._user_activity_admin(uuid, timestamp with time zone, integer) c44a26e199e1cf8a9311056eb745bb9bb3894b1a5a69b4fe3b7f445a1b3f0964
-- based-on: admin._user_activity_sign_in(uuid, timestamp with time zone, integer) 9e77eb8b6761575827a333d6e4b926f9d819c20b1f15b616c9d0ba34ad254143
-- based-on: admin.user_activity(uuid, timestamp with time zone, text[], integer) 2905dee8f5547997d782e4698a1dc8ad1276786164017ef5335d606f6c4398ec
-- Users one-roof, adversarial fix lane Q (2026-10-18): the person's Activity and Billing reads.
--   S16 admin.user_billing_events(p_user, p_before, p_limit): THE billing history of one person — free-month
--       grants, coupon redemptions, coupons sent / revoked, usage resets, plan changes — one row each with
--       its record (type + id) for a door. admin._user_activity_billing reads it; the Billing tab reads it.
--   S9  new Activity source 'contact': messages and emails an admin sent the person (admin audit rows
--       message_sent / email_sent, titles only); the 'admin' source no longer repeats them.
--   S8  'sign_in' rows are auth.sessions — LIVE sessions only (a signed-out session leaves no row, and
--       auth.audit_log_entries has had no writes since 2026-08-20), so their title says "Live session".
--   N1  admin.user_activity pages on a composite cursor (next_before, next_before_key): more rows than one
--       page sharing one instant are paged by key, never dropped.

-- 1. S16 — one billing history ------------------------------------------------------------------
create function admin.user_billing_events(
  p_user uuid, p_before timestamptz default null, p_limit integer default 200)
 returns table(key text, at timestamptz, kind text, title text, detail text, note text, actor_id uuid,
               record_type text, record_id uuid)
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
-- Newest first, at or before p_before (inclusive), at most p_limit rows (1..500). Each branch reads its
-- own (person, time) index and stops at p_limit. record_type: free_period_grant | coupon | usage_reset |
-- admin_history | user_plan; record_id is that row's id (the coupon's id for a redemption).
declare
  v_before timestamptz := coalesce(p_before, 'infinity'::timestamptz);
  v_limit int := least(greatest(coalesce(p_limit, 200), 1), 500);
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres'
     and not public.is_platform_admin() then
    raise exception 'admin.user_billing_events: platform admins only' using errcode = '42501';
  end if;
  if p_user is null then
    raise exception 'admin.user_billing_events: p_user is required' using errcode = '22004';
  end if;
  return query
  select u.key, u.at, u.kind, u.title, u.detail, u.note, u.actor_id, u.record_type, u.record_id from (
    (select 'grant:' || g.id::text as key, g.created_at as at, 'grant'::text as kind,
            'Free months granted'::text as title,
            g.months || ' mo · ' || g.plan_key || ' · ends ' || to_char(g.ends_at, 'YYYY-MM-DD')
              || case when g.capped then ' · capped' else '' end as detail,
            nullif(btrim(g.note), '') as note, g.granted_by as actor_id,
            'free_period_grant'::text as record_type, g.id as record_id
       from billing.free_period_grant g
      where g.subject_user_id = p_user and g.created_at <= v_before and g.deleted_at is null
      order by g.created_at desc limit v_limit)
    union all
    (select 'redemption:' || r.id::text, r.redeemed_at, 'redemption',
            'Coupon redeemed',
            coalesce(c.code, 'coupon') || coalesce(' · ' || c.months || ' mo ' || c.plan_key, '') || ' · ' || r.status,
            nullif(btrim(r.error), ''), r.redeemer_user_id,
            'coupon', r.coupon_id
       from billing.coupon_redemption r
       left join billing.coupon c on c.id = r.coupon_id
      where r.redeemer_user_id = p_user and r.redeemed_at <= v_before and r.deleted_at is null
      order by r.redeemed_at desc limit v_limit)
    union all
    (select 'coupon:' || c.id::text, c.created_at, 'coupon',
            case when c.revoked_at is not null then 'Coupon revoked' else 'Coupon sent' end,
            c.code || ' · ' || c.months || ' mo ' || c.plan_key,
            nullif(btrim(c.note), ''), c.created_by,
            'coupon', c.id
       from billing.coupon c
      where c.recipient_user_id = p_user and c.created_at <= v_before and c.deleted_at is null
      order by c.created_at desc limit v_limit)
    union all
    (select 'reset:' || r.id::text, r.reset_at, 'reset',
            'Usage reset',
            r.period::text,
            nullif(btrim(r.note), ''), r.reset_by,
            'usage_reset', r.id
       from billing.usage_reset r
      where r.subject_user_id = p_user and r.reset_at <= v_before and r.deleted_at is null
      order by r.reset_at desc limit v_limit)
    union all
    (select 'plan_change:' || l.id::text, l.created_at, 'plan',
            initcap(replace(l.action, '_', ' ')),
            coalesce(l.after->>'plan_id', l.after->>'tier', l.before->>'plan_id', l.before->>'tier'),
            coalesce(l.metadata->>'reason', l.metadata->>'note'), l.actor_user_id,
            'admin_history', l.id
       from admin.admin_audit_log l
      where l.target_user_id = p_user and l.created_at <= v_before and l.action like 'plan\_%'
      order by l.created_at desc limit v_limit)
    union all
    (select 'plan:' || p.user_id::text, p.updated_at, 'plan',
            'Plan set',
            coalesce(p.plan_id, p.tier::text),
            nullif(btrim(p.note), ''), p.granted_by,
            'user_plan', p.user_id
       from billing.user_plan p
      where p.user_id = p_user and p.updated_at <= v_before)
  ) u
  order by u.at desc, u.key collate "C"
  limit v_limit;
end $function$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers, gate_predicate, argument_rules)
values
  ('admin', 'user_billing_events', 'p_user uuid, p_before timestamp with time zone, p_limit integer',
   array['uuid'::regtype, 'timestamptz'::regtype, 'integer'::regtype]::oid[],
   'READ. p_user is any auth user; the body refuses anyone but a platform admin (or the server) with 42501 and returns that person''s billing history rows.',
   'migrations/20261018171000_lane_q_user_activity_billing_contact_cursor.sql (users one-roof lane Q)',
   null, true, false, 'public.is_platform_admin()',
   '{"version":1,"arguments":{"p_user":{"type":"uuid","position":1,"optional":false,"check":"public.is_platform_admin() (or the service role), decided before the first read","foreign":{"note":"Any person; platform admins only.","bounded":true}},"p_before":{"type":"timestamp with time zone","position":2,"optional":true,"foreign":{"not_an_id":true},"null_rule":{"means":"newest first from now"}},"p_limit":{"type":"integer","position":3,"optional":true,"foreign":{"not_an_id":true},"null_rule":{"means":"200 rows"}}}}'::jsonb)
on conflict do nothing;
grant execute on function admin.user_billing_events(uuid, timestamptz, integer) to authenticated, service_role;

create or replace function admin._user_activity_billing(p_user uuid, p_before timestamp with time zone, p_limit integer)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  -- The person's billing history: THE one read, admin.user_billing_events (users one-roof S16).
  select coalesce(jsonb_agg(
           admin._user_activity_item(e.at, 'billing', e.key, e.title,
             e.detail || coalesce(' · ' || e.note, ''), e.actor_id,
             jsonb_build_object('type', e.record_type, 'id', e.record_id, 'user_id', p_user))
           order by e.at desc, e.key collate "C"), '[]'::jsonb)
    from admin.user_billing_events(p_user, p_before, p_limit) e
$function$;

-- 2. S9 — contact source; the admin source stops repeating it ------------------------------------
create function admin._user_activity_contact(p_user uuid, p_before timestamp with time zone, p_limit integer)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  -- Messages and emails an admin sent this person (admin.record_contact rows). Title + subject only.
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select l.created_at as at,
           admin._user_activity_item(l.created_at, 'contact', l.id::text,
             case l.action when 'message_sent' then 'Message sent' else 'Email sent' end,
             l.metadata->>'reason',
             l.actor_user_id,
             case when l.action = 'message_sent' and l.metadata ? 'conversation_id'
                  then jsonb_build_object('type', 'conversation', 'id', l.metadata->>'conversation_id')
                  else jsonb_build_object('type', 'admin_history', 'id', l.id, 'user_id', l.target_user_id) end) as item
      from admin.admin_audit_log l
     where l.target_user_id = p_user and l.created_at <= p_before
       and l.action in ('message_sent', 'email_sent')
     order by l.created_at desc
     limit p_limit
  ) s
$function$;

create or replace function admin._user_activity_admin(p_user uuid, p_before timestamp with time zone, p_limit integer)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
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
          and l.action not in ('message_sent', 'email_sent') -- the 'contact' source shows these
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
$function$;

-- 3. S8 — sign-in rows are live sessions, and say so ---------------------------------------------
create or replace function admin._user_activity_sign_in(p_user uuid, p_before timestamp with time zone, p_limit integer)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  -- auth.sessions holds LIVE sessions only: a session that signed out or expired leaves no row, so this
  -- is not a sign-in history (auth.audit_log_entries has had no writes since 2026-08-20).
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select x.created_at as at,
           admin._user_activity_item(x.created_at, 'sign_in', x.id::text,
             'Live session',
             left(x.user_agent, 120),
             x.user_id,
             jsonb_build_object('type', 'auth_session', 'id', x.id)) as item
      from auth.sessions x
     where x.user_id = p_user and x.created_at <= p_before
     order by x.created_at desc
     limit p_limit
  ) s
$function$;

-- 4. N1 — every row at one instant, across the chosen sources ------------------------------------
create function admin._user_activity_instant(p_user uuid, p_at timestamptz, p_kinds text[])
 returns jsonb
 language plpgsql
 stable
 set search_path to ''
as $function$
-- {items, failed}: EVERY row of the given sources at exactly p_at, ordered by key (C collation). A branch
-- returns rows newest first, so it is re-read with a growing limit until it returns a row older than
-- p_at or fewer rows than asked — then every row at p_at is in hand. Only used when one instant holds
-- more rows than a page.
declare
  k text;
  n int;
  v_branch jsonb;
  v_len int;
  v_all jsonb := '[]'::jsonb;
  v_failed jsonb := '[]'::jsonb;
begin
  foreach k in array p_kinds loop
    begin
      n := 256;
      loop
        execute format('select admin.%I($1, $2, $3)', '_user_activity_' || k) into v_branch using p_user, p_at, n;
        v_branch := coalesce(v_branch, '[]'::jsonb);
        v_len := jsonb_array_length(v_branch);
        exit when v_len < n or (v_branch -> (v_len - 1) ->> 'at')::timestamptz < p_at;
        if n >= 262144 then
          raise exception 'more than % rows share one instant', n;
        end if;
        n := n * 4;
      end loop;
      v_all := v_all || coalesce((select jsonb_agg(e) from jsonb_array_elements(v_branch) e
                                   where (e ->> 'at')::timestamptz = p_at), '[]'::jsonb);
    exception when others then
      v_failed := v_failed || jsonb_build_array(jsonb_build_object('kind', k, 'ok', false, 'error', sqlerrm, 'code', sqlstate));
    end;
  end loop;
  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(e order by (e ->> 'key') collate "C") from jsonb_array_elements(v_all) e), '[]'::jsonb),
    'failed', v_failed);
end $function$;

-- 5. N1 + S9 — admin.user_activity on a composite cursor, with the contact source ------------------
drop function admin.user_activity(uuid, timestamptz, text[], integer);

create function admin.user_activity(
  p_user uuid, p_before timestamptz default null, p_kinds text[] default null, p_limit integer default 50,
  p_before_key text default null)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
-- One keyset page of a person's activity across 13 sources, newest first, ties by key (C collation).
-- The cursor is (next_before, next_before_key): key null = every row at or before next_before; key set =
-- rows before next_before plus the rows AT next_before whose key sorts after it. A failed source comes
-- back in `sources` with its error instead of failing the page.
declare
  c_kinds constant text[] := array[
    'admin', 'org_admin', 'support', 'sign_in', 'account', 'conversation',
    'run', 'feedback', 'notification', 'sms', 'billing', 'error', 'contact'];
  v_before timestamptz := coalesce(p_before, 'infinity'::timestamptz);
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_kinds text[] := '{}';
  v_all jsonb := '[]'::jsonb;
  v_branch jsonb;
  v_sources jsonb := '[]'::jsonb;
  v_floor timestamptz := '-infinity'::timestamptz;
  v_truncated boolean := false;
  v_count int;
  v_cut timestamptz;
  v_page jsonb;
  v_next timestamptz;
  v_next_key text;
  v_inst jsonb;
  v_rows jsonb;
  k text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres'
     and not public.is_platform_admin() then
    raise exception 'admin.user_activity: platform admins only' using errcode = '42501';
  end if;
  if p_user is null then
    raise exception 'admin.user_activity: p_user is required' using errcode = '22004';
  end if;
  if p_before_key is not null and p_before is null then
    raise exception 'admin.user_activity: p_before_key needs p_before' using errcode = '22023';
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
    v_kinds := v_kinds || k;
  end loop;

  -- Inside one instant: the rest of that instant, by key. A short page is fine; the next cursor steps
  -- past the instant.
  if p_before_key is not null then
    v_inst := admin._user_activity_instant(p_user, v_before, v_kinds);
    select coalesce(jsonb_agg(x.e order by x.k collate "C"), '[]'::jsonb), count(*) into v_rows, v_count
      from (select e, e ->> 'key' as k from jsonb_array_elements(v_inst -> 'items') e
             where (e ->> 'key') collate "C" > p_before_key collate "C") x;
    if v_count > v_limit then
      select coalesce(jsonb_agg(x.e order by x.k collate "C"), '[]'::jsonb) into v_page
        from (select e, e ->> 'key' as k from jsonb_array_elements(v_rows) e
               order by 2 collate "C" limit v_limit) x;
      v_next := v_before;
      v_next_key := v_page -> (v_limit - 1) ->> 'key';
    else
      v_page := v_rows;
      v_next := v_before - interval '1 microsecond';
      v_next_key := null;
    end if;
    foreach k in array v_kinds loop
      v_sources := v_sources || coalesce(
        (select jsonb_agg(f) from jsonb_array_elements(v_inst -> 'failed') f where f ->> 'kind' = k),
        jsonb_build_array(jsonb_build_object('kind', k, 'ok', true)));
    end loop;
    return jsonb_build_object('items', v_page, 'next_before', v_next, 'next_before_key', v_next_key,
                              'sources', v_sources);
  end if;

  foreach k in array v_kinds loop
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

  v_cut := null;
  if v_count > v_limit then
    select c.at into v_cut from (
      select (e ->> 'at')::timestamptz as at
        from jsonb_array_elements(v_all) e
       where (e ->> 'at')::timestamptz > v_floor
       order by 1 desc
       offset v_limit limit 1) c;
    -- The tie at the cut moves wholly to the next page.
    select coalesce(jsonb_agg(e order by (e ->> 'at')::timestamptz desc, (e ->> 'key') collate "C"), '[]'::jsonb) into v_page
      from jsonb_array_elements(v_all) e
     where (e ->> 'at')::timestamptz > v_cut;
    v_next := v_cut;
  else
    select coalesce(jsonb_agg(e order by (e ->> 'at')::timestamptz desc, (e ->> 'key') collate "C"), '[]'::jsonb) into v_page
      from jsonb_array_elements(v_all) e
     where (e ->> 'at')::timestamptz > v_floor;
    v_next := case when v_truncated then v_floor end;
    if v_truncated and jsonb_array_length(v_page) = 0 then
      v_cut := v_floor;
    end if;
  end if;

  if v_cut is not null and jsonb_array_length(v_page) = 0 then
    -- More rows than a page share one instant: page through THAT instant by key, never dropping a row.
    v_inst := admin._user_activity_instant(p_user, v_cut, v_kinds);
    v_count := jsonb_array_length(v_inst -> 'items');
    if v_count > v_limit then
      select coalesce(jsonb_agg(x.e order by x.k collate "C"), '[]'::jsonb) into v_page
        from (select e, e ->> 'key' as k from jsonb_array_elements(v_inst -> 'items') e
               order by 2 collate "C" limit v_limit) x;
      v_next := v_cut;
      v_next_key := v_page -> (v_limit - 1) ->> 'key';
    else
      v_page := v_inst -> 'items';
      v_next := v_cut - interval '1 microsecond';
    end if;
  end if;

  return jsonb_build_object('items', v_page, 'next_before', v_next, 'next_before_key', v_next_key,
                            'sources', v_sources);
end;
$function$;

update platform.client_callable_door
   set identity_args = 'p_user uuid, p_before timestamp with time zone, p_kinds text[], p_limit integer, p_before_key text',
       identity_argtypes = array['uuid'::regtype, 'timestamptz'::regtype, 'text[]'::regtype, 'integer'::regtype, 'text'::regtype]::oid[],
       argument_rules = case when argument_rules ? 'arguments' then jsonb_set(argument_rules, '{arguments,p_before_key}',
         '{"type":"text","position":5,"optional":true,"foreign":{"not_an_id":true},"null_rule":{"means":"every row at or before p_before"}}'::jsonb)
         else argument_rules end
 where schema_name = 'admin' and function_name = 'user_activity';
grant execute on function admin.user_activity(uuid, timestamptz, text[], integer, text) to authenticated, service_role;
