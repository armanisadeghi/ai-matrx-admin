-- chair-step: widens admin.admin_audit_log_action_check by the per-person admin action words (a CHECK cannot be widened without DROP + ADD); every existing row still satisfies it and nothing is removed. Then every admin action on one person writes its audit row inside the function that does it.
-- based-on: iam.close_account(uuid, text) 1ee69b629831d5467a6d1d99245471d5f277d6a70e0ba75afbc5048412951cb0
-- based-on: iam.reopen_account(uuid, text) 1f357df85e5933726c4e234e3a645f876629a7e102e9864f1243552fc1e743e7
-- based-on: billing.user_plan_set(uuid, text, text, timestamp with time zone) b94f5e2acd2fa299de94cbedc1797ce3977d7e70f94f8bab0b70cf2a6f496294
-- based-on: billing.free_months_apply(uuid[], text, integer, text) 3165b45820048eac4732a55772a842dfe479208345399914343063bbe269d572
-- based-on: billing.usage_reset_apply(uuid, billing.meter_period[], text) 59fde1251fa42a683905cb1cb26d98959ae4e3541fa15d46395d326252e570f8
-- based-on: admin._support_session_log(admin.support_sessions, text, text) 0184f2d04601e7eea55e0ed96ec4a2185c53df685dfd7361331bf047ff00f130
--
-- admin_audit_every_admin_action_on_a_person.sql
--
-- WHY. Users "one roof" step 1 (Arman GO 2026-10-17): every admin action on a user is recorded
-- (actor, target, action, before, after, reason) INSIDE the SQL function or server route that
-- performs it, so no screen can skip it. Until now only the admin.admins trigger
-- (public._admin_audit_trigger) and admin.set_top_tier_model_access wrote admin.admin_audit_log;
-- closing/reopening an account, clearing a plan, free months, usage resets and support sessions
-- left no row there.
--
-- WHAT.
--   1. admin.admin_audit_log learns the per-person action words.
--   2. admin._audit_user_action(...) — THE one helper. Same insert as _admin_audit_trigger: the row
--      belongs to the platform tenant read from iam.system_orgs key 'system' (never defaulted,
--      never guessed; missing -> 23502). The reason lands in metadata.reason. Internal: no client
--      EXECUTE; service_role may call it (the two Next admin routes, which pass p_actor).
--   3. Calls from iam.close_account (self-serve = actor is the target -> 'account_close_self'),
--      iam.reopen_account, billing.user_plan_set, billing.free_months_apply (one row per person
--      granted, inside that person's own subtransaction), billing.usage_reset_apply, and
--      admin._support_session_log (every support-session lifecycle event: created / extended /
--      started / ended — create, extend, end, close_expired, abort and activate all reach it).
--      Each body is the live pg_get_functiondef with only the audit lines added.
--   4. NEW iam.sign_out_everywhere(p_user, p_reason): the two session deletes iam.close_account
--      already runs, plus its audit row; platform admins only; client door declared before GRANT.
--
-- Guard: pnpm check:user-action-audit (static body check + one rolled-back live run per action).

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
                             'password_reset_link_create'::text]));

-- ── 2. the helper ───────────────────────────────────────────────────────────────────────────
CREATE FUNCTION admin._audit_user_action(
  p_action text,
  p_target uuid,
  p_before jsonb DEFAULT NULL,
  p_after jsonb DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_actor uuid DEFAULT auth.uid())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_org uuid;
  v_id uuid;
begin
  if p_target is null then
    raise exception 'admin audit: % names no person', p_action using errcode = '22004';
  end if;
  -- The platform admin audit trail is not org-scoped: the row belongs to the platform tenant.
  -- Read it; never default it, never guess it (same rule as public._admin_audit_trigger).
  select so.organization_id into v_org from iam.system_orgs so where so.key = 'system';
  if v_org is null then
    raise exception 'admin audit: iam.system_orgs has no row keyed ''system'' — the audit row has no organization to belong to'
      using errcode = '23502';
  end if;
  insert into admin.admin_audit_log (actor_user_id, action, target_user_id, before, after, organization_id, metadata)
  values (p_actor, p_action, p_target, p_before, p_after, v_org,
          coalesce(p_metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object('reason', nullif(btrim(p_reason), ''))))
  returning id into v_id;
  return v_id;
end $function$;

REVOKE ALL ON FUNCTION admin._audit_user_action(text, uuid, jsonb, jsonb, text, jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin._audit_user_action(text, uuid, jsonb, jsonb, text, jsonb, uuid) TO service_role;
insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers)
values ('admin', '_audit_user_action',
  'p_action text, p_target uuid, p_before jsonb, p_after jsonb, p_reason text, p_metadata jsonb, p_actor uuid',
  array['text'::regtype::oid, 'uuid'::regtype::oid, 'jsonb'::regtype::oid, 'jsonb'::regtype::oid,
        'text'::regtype::oid, 'jsonb'::regtype::oid, 'uuid'::regtype::oid],
  'Writes one admin.admin_audit_log row. p_target is the person acted on (NULL refused 22004) and is only recorded, never read through; p_actor is recorded as given (NULL = timer/backend). Called by the per-person admin doors, which have already decided access.',
  'admin_audit_every_admin_action_on_a_person.sql',
  'server_only: called inside the per-person admin SQL doors and by the two Next admin routes (app/api/admin/users PATCH, auth-link) through the service-role client after requireSuperAdmin; no browser ever calls it.',
  false, false);

-- ── 3. the callers ──────────────────────────────────────────────────────────────────────────
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
  v_sessions int; v_tokens int; v_rev jsonb;
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
  delete from auth.refresh_tokens where user_id = v_uid::text;  get diagnostics v_tokens = row_count;
  delete from auth.sessions where user_id = v_uid;               get diagnostics v_sessions = row_count;
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

CREATE OR REPLACE FUNCTION iam.reopen_account(p_user uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r iam.account_closure;
begin
  if auth.uid() is not null and not public.is_platform_admin() then
    raise exception 'reopen_account: an account is reopened by a platform admin' using errcode = '42501';
  end if;
  select * into r from iam.account_closure where user_id = p_user and reopened_at is null;
  if not found then return jsonb_build_object('ok', true, 'was_open', true, 'user_id', p_user); end if;
  if r.erased_at is not null then
    raise exception 'reopen_account: % was erased; an erased account cannot be reopened', p_user using errcode = '55000';
  end if;
  update auth.users set banned_until = null, updated_at = now() where id = p_user;
  update scheduler.sch_task set enabled = true
   where id in (select (jsonb_array_elements_text(r.revoked->'sch_task'))::uuid);
  update scheduler.sch_trigger set enabled = true
   where id in (select (jsonb_array_elements_text(r.revoked->'sch_trigger'))::uuid);
  update tool.mcp_user_conn set status = 'expired', updated_at = now()
   where id in (select (jsonb_array_elements_text(r.revoked->'mcp_user_conn'))::uuid);
  update iam.account_closure set reopened_at = now(), updated_at = now(), updated_by = auth.uid(),
         metadata = metadata || jsonb_build_object('reopen_reason', p_reason)
   where id = r.id;
  perform admin._audit_user_action('account_reopen', p_user,
    jsonb_build_object('closed', true, 'closure_id', r.id, 'closed_at', r.created_at, 'close_reason', r.reason),
    jsonb_build_object('closed', false), p_reason, jsonb_build_object('closure_id', r.id));
  return jsonb_build_object('ok', true, 'user_id', p_user, 'reopened', true);
end $function$;

CREATE OR REPLACE FUNCTION billing.user_plan_set(p_user uuid, p_plan_key text, p_note text DEFAULT NULL::text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- Super-admin: CLEAR a person's plan grant (p_plan_key null → back to the default plan).
-- Giving a plan is free time and goes only through billing.free_months_apply /
-- billing._free_months_grant (rule 18, Arman 2026-10-04: "Nothing as an endless free forever"),
-- so a non-null plan is refused here instead of writing an undated grant.
declare v_row billing.user_plan%rowtype; v_before jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'billing.user_plan_set: super-admin only' using errcode = '42501';
  end if;
  if p_plan_key is not null then
    raise exception 'free_time_use_free_months' using errcode = '22023',
      detail = 'A plan is given as dated free time: billing.free_months_apply (months up to billing/free_period_max_months).';
  end if;
  select to_jsonb(up) into v_before from billing.user_plan up where up.user_id = p_user for update;
  update billing.user_plan set plan_id = null, note = coalesce(p_note, note), granted_by = auth.uid(), updated_at = now()
   where user_id = p_user returning * into v_row;
  perform admin._audit_user_action('plan_clear', p_user, v_before, to_jsonb(v_row), p_note,
    jsonb_build_object('had_plan_row', v_before is not null));
  return to_jsonb(v_row);
end;
$function$;

CREATE OR REPLACE FUNCTION billing.free_months_apply(p_users uuid[], p_plan text, p_months integer, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- Admin gives free time directly (no code) to one or many accounts. Each account is its own step:
-- one refusal never undoes the others. Same stacking rule and ceiling as every grant
-- (billing._free_months_grant). has_live_subscription flags a paying person (their grant stacks
-- beside the subscription; Stripe is untouched). Each granted account gets one admin audit row,
-- written inside its own step (an audit failure undoes that account's grant, never another's).
declare
  v_user uuid;
  v_results jsonb := '[]'::jsonb;
  v_ok integer := 0;
  v_failed integer := 0;
  v_grant jsonb;
  v_pays boolean;
  v_detail text;
begin
  if not (public.is_super_admin() or iam.is_trusted_backend()) then
    raise exception 'billing.free_months_apply: super-admin only' using errcode = '42501';
  end if;
  if p_users is null or cardinality(p_users) = 0 then
    raise exception 'free_time_no_user' using errcode = '22023', detail = 'Name at least one account.';
  end if;
  foreach v_user in array (select array_agg(distinct u) from unnest(p_users) u where u is not null) loop
    v_pays := exists (select 1 from billing.subscription s
                       where s.beneficiary_user_id = v_user and s.livemode
                         and s.status in ('active', 'trialing', 'past_due') and s.current_period_end > now());
    begin
      v_grant := billing._free_months_grant(v_user, p_plan, p_months, 'admin', p_note, null, auth.uid());
      perform admin._audit_user_action('free_months_grant', v_user, null, v_grant, p_note,
        jsonb_build_object('plan', p_plan, 'months', p_months, 'has_live_subscription', v_pays,
                           'batch_size', cardinality(p_users)));
      v_results := v_results || jsonb_build_array(jsonb_build_object('user_id', v_user, 'ok', true,
                     'has_live_subscription', v_pays, 'grant', v_grant));
      v_ok := v_ok + 1;
    exception when others then
      get stacked diagnostics v_detail = pg_exception_detail;
      v_results := v_results || jsonb_build_array(jsonb_build_object('user_id', v_user, 'ok', false,
                     'has_live_subscription', v_pays, 'error', sqlerrm, 'detail', nullif(v_detail, '')));
      v_failed := v_failed + 1;
    end;
  end loop;
  return jsonb_build_object('applied', v_ok, 'failed', v_failed, 'results', v_results);
end;
$function$;

CREATE OR REPLACE FUNCTION billing.usage_reset_apply(p_user uuid, p_periods billing.meter_period[], p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- Clears a person's AI-points usage for the named windows: one billing.usage_reset
-- marker per window; billing._points_usage_state then counts that window from the
-- marker. NULL or empty p_periods = every window. Nothing in the ledger is deleted.
-- Super-admin only. Returns the person's fresh billing.user_usage_state.
declare v_periods billing.meter_period[];
begin
  if not public.is_super_admin() then
    raise exception 'billing.usage_reset_apply: super-admin only' using errcode = '42501';
  end if;
  if p_user is null or not exists (select 1 from auth.users u where u.id = p_user) then
    raise exception 'billing.usage_reset_apply: no such account' using errcode = '22023';
  end if;
  v_periods := case when p_periods is null or cardinality(p_periods) = 0
                    then enum_range(null::billing.meter_period) else p_periods end;
  insert into billing.usage_reset (subject_user_id, period, reset_at, reset_by, note, organization_id)
  select p_user, x.period, now(), (select auth.uid()), nullif(btrim(p_note), ''),
         '39c38960-d30c-4840-b0c1-c9960de95582'::uuid
    from (select distinct unnest(v_periods) as period) x;
  perform admin._audit_user_action('usage_reset', p_user, null,
    jsonb_build_object('periods', to_jsonb(v_periods)), p_note, '{}'::jsonb);
  return billing.user_usage_state(p_user);
end;
$function$;

CREATE OR REPLACE FUNCTION admin._support_session_log(p_session admin.support_sessions, p_event text, p_via text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_activity record;
begin
  select * into v_activity from admin._support_target_activity(p_session.target_user_id);
  insert into admin.support_session_events
    (organization_id, support_session_id, event, admin_user_id, target_user_id, via, expires_at,
     target_live_sign_ins, target_last_active_at)
  values
    (p_session.organization_id, p_session.id, p_event, p_session.created_by, p_session.target_user_id,
     p_via, p_session.expires_at, v_activity.live_sign_ins, v_activity.last_active_at);
  -- Every support-session lifecycle event is also one row in the admin audit trail. The actor is
  -- whoever is calling (null for the timer and the backend); the admin who opened it is in metadata.
  perform admin._audit_user_action('support_session_' || p_event, p_session.target_user_id, null,
    jsonb_strip_nulls(jsonb_build_object('status', p_session.status, 'expires_at', p_session.expires_at,
                                         'end_reason', p_session.end_reason)),
    p_session.reason,
    jsonb_strip_nulls(jsonb_build_object('support_session_id', p_session.id, 'via', p_via,
                                         'admin_user_id', p_session.created_by,
                                         'minutes_granted', p_session.minutes_granted)));
end $function$;

-- ── 4. sign out everywhere ──────────────────────────────────────────────────────────────────
CREATE FUNCTION iam.sign_out_everywhere(p_user uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- A platform admin ends every sign-in of one person (the same two deletes iam.close_account runs),
-- without closing the account. An access token issued before stays valid until it expires.
declare v_sessions int; v_tokens int;
begin
  if not public.is_platform_admin() then
    raise exception 'sign_out_everywhere: a platform admin signs a person out' using errcode = '42501';
  end if;
  if p_user is null then raise exception 'sign_out_everywhere: no person given' using errcode = '22004'; end if;
  if not exists (select 1 from auth.users where id = p_user) then
    raise exception 'sign_out_everywhere: no person %', p_user using errcode = 'P0002';
  end if;
  delete from auth.refresh_tokens where user_id = p_user::text;  get diagnostics v_tokens = row_count;
  delete from auth.sessions where user_id = p_user;               get diagnostics v_sessions = row_count;
  perform admin._audit_user_action('sign_out_everywhere', p_user, null,
    jsonb_build_object('sessions', v_sessions, 'refresh_tokens', v_tokens), p_reason, '{}'::jsonb);
  return jsonb_build_object('ok', true, 'user_id', p_user, 'sessions', v_sessions, 'refresh_tokens', v_tokens,
    'jwt_window', 'an access token issued before stays valid until it expires (at most 3600 s)');
end $function$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, gate_predicate,
   anonymous_callers, signed_in_callers)
values ('iam', 'sign_out_everywhere', 'p_user uuid, p_reason text',
  array['uuid'::regtype::oid, 'text'::regtype::oid], 'admin_audit_every_admin_action_on_a_person.sql',
  'A platform admin ends every sign-in of one person (deletes their auth sessions and refresh tokens, as iam.close_account does) and writes one admin.admin_audit_log row. public.is_platform_admin() refuses everyone else with 42501 before anything is read.',
  'public.is_platform_admin()', false, true);
GRANT EXECUTE ON FUNCTION iam.sign_out_everywhere(uuid, text) TO authenticated;
