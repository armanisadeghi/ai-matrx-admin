-- chair-step: lane Q users one-roof — two DROPs re-create admin_manage_organization_membership and billing.coupon_revoke with a trailing defaulted p_reason (a signature change CREATE OR REPLACE cannot make).
-- based-on: iam.reopen_account(uuid, text) 86afb2994f6604896c6e47157a6145958e9170ed1393aa2a0a9c8b9d36eb9288
-- based-on: admin.set_top_tier_model_access(uuid, boolean, text) 3970253fae8e2febacee37dc239ccbfcfa607461307c3e62aa326b4a0ddb3e06
-- based-on: billing.coupon_create(text, text, integer, integer, jsonb, timestamp with time zone, text) ee324e3fdd9f7b456ffb56a53a33abc86203265c149b8b99345b7f619b833099
-- based-on: public.admin_set_guest_block(uuid, boolean, text, timestamp with time zone) 5852ecc26d0bd2706f0373e22d46246b38021cbe39cf8f50aab034ade1477275
-- based-on: public.admin_manage_organization_membership(text, uuid, uuid, text) a044c1037de1405a4f2d21b92a34aa971894461de358f127a9d64a2654be2763
-- based-on: billing.coupon_revoke(uuid) f68f6968f6806038b1e19e2790da8edcd23e32799c109031be5609a6ad0a9a33
-- Users one-roof, adversarial fix lane Q (2026-10-18): every admin action on a person writes ONE
-- admin.admin_audit_log row WITH its reason, inside the database.
--   B2  iam.reopen_account: a person banned with no open closure row (an "orphan ban") is unbanned and
--       audited (metadata.orphan_ban); a person who was not closed answers reopened=false, was_not_closed=true.
--   B3  admin_manage_organization_membership gains p_reason and moves public → iam (a new argument list may not live in public) and writes admin._audit_user_action
--       (iam.org_admin_audit kept). admin.set_top_tier_model_access writes p_note as the audit REASON
--       (metadata.note kept). billing.coupon_create / coupon_revoke audit when a coupon names a person;
--       public.admin_set_guest_block audits when the guest is (or became) a person.
--   S12 iam.admin_set_account_flags: onboarding flag + full MCP access changed AND audited in one
--       transaction (replaces PATCH /api/admin/users' write-then-audit).
--   S9  admin.record_contact: a message or email an admin sends to a person is audited
--       ('message_sent' / 'email_sent').

-- 1. The action words ---------------------------------------------------------------------------
alter table admin.admin_audit_log drop constraint admin_audit_log_action_check;
alter table admin.admin_audit_log add constraint admin_audit_log_action_check check (action = any (array[
  'promote', 'update', 'revoke', 'admin_lane_platform_tenant_admission', 'scheduler_task_disable',
  'scheduler_run_mark_failed', 'top_tier_models_grant', 'top_tier_models_revoke', 'account_close',
  'account_close_self', 'account_reopen', 'sign_out_everywhere', 'plan_clear', 'free_months_grant',
  'usage_reset', 'support_session_created', 'support_session_extended', 'support_session_started',
  'support_session_ended', 'onboarding_flag_set', 'mcp_full_access_grant', 'mcp_full_access_revoke',
  'magic_link_create', 'password_reset_link_create', 'session_end', 'mfa_factor_remove', 'api_key_revoke',
  'email_verified',
  -- lane Q
  'org_membership_add', 'org_membership_set_role', 'org_membership_remove',
  'coupon_create', 'coupon_revoke', 'guest_block', 'guest_unblock',
  'message_sent', 'email_sent'
]::text[]));

-- 2. B2 — reopen never reports a success it did not make -------------------------------------------
create or replace function iam.reopen_account(p_user uuid, p_reason text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r iam.account_closure;
  v_ban timestamptz;
begin
  if auth.uid() is not null and not public.is_platform_admin() then
    raise exception 'reopen_account: an account is reopened by a platform admin' using errcode = '42501';
  end if;
  select * into r from iam.account_closure where user_id = p_user and reopened_at is null;
  if not found then
    select u.banned_until into v_ban from auth.users u where u.id = p_user for update;
    if not found then
      raise exception 'reopen_account: no person %', p_user using errcode = 'P0002';
    end if;
    if v_ban is not null and v_ban > now() then
      -- Banned with no open closure row (an "orphan ban"): sign-in goes back on and the row says so.
      update auth.users set banned_until = null, updated_at = now() where id = p_user;
      perform admin._audit_user_action('account_reopen', p_user,
        jsonb_build_object('closed', true, 'banned_until', v_ban),
        jsonb_build_object('closed', false), p_reason, jsonb_build_object('orphan_ban', true));
      return jsonb_build_object('ok', true, 'user_id', p_user, 'reopened', true, 'orphan_ban', true);
    end if;
    -- Not closed: nothing changed, nothing audited. `was_open` kept for older callers.
    return jsonb_build_object('ok', true, 'user_id', p_user, 'reopened', false,
                              'was_not_closed', true, 'was_open', true);
  end if;
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

-- 3. B3 — organization membership carries a reason and writes the person's audit row ---------------
-- A new argument list may not be born in public (public_placement guard): the door moves to iam.
drop function public.admin_manage_organization_membership(text, uuid, uuid, text);

create function iam.admin_manage_organization_membership(
  p_action text, p_org_id uuid, p_user_id uuid, p_role text default null::text, p_reason text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_membership iam.memberships%rowtype;
  v_org iam.organizations%rowtype;
  v_previous_role text;
  v_owner_count integer;
  v_other_owner_count integer;
begin
  if v_actor is null or not public.is_super_admin() then
    raise exception 'Forbidden: Super Admin required' using errcode = '42501';
  end if;

  if p_action not in ('add', 'set_role', 'remove') then
    raise exception 'Unsupported organization membership action: %', p_action
      using errcode = '22023';
  end if;

  select * into v_org
  from iam.organizations
  where id = p_org_id;

  if not found then
    perform platform.refuse_not_found('Organization not found');
  end if;

  -- DD-162: THE ONE DOOR. A super admin passes it through the administrator arm, and the census can
  -- now tell this function from one that asks nobody — which is the whole point, because the line
  -- above can be deleted by a future edit and this one cannot be deleted quietly.
  perform iam.assert_may_transfer('membership', v_org.created_by, p_user_id, p_org_id,
                                  'organization', p_org_id);


  if p_action in ('add', 'set_role') and p_role not in ('owner', 'admin', 'member') then
    raise exception 'Role must be owner, admin, or member' using errcode = '22023';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    perform platform.refuse_not_found('User not found');
  end if;

  -- Serialize owner-count checks with other organization membership changes.
  perform 1
  from iam.memberships
  where container_type = 'organization'
    and container_id = p_org_id
    and deleted_at is null
  for update;

  -- R21, one owner: even a super admin may not mint a second one. The route is
  -- transfer_organization_ownership, which demotes the outgoing owner.
  if p_action in ('add', 'set_role') and p_role = 'owner' then
    select count(*)::integer
    into v_other_owner_count
    from iam.memberships
    where container_type = 'organization'
      and container_id = p_org_id
      and role = 'owner'
      and status = 'active'
      and deleted_at is null
      and user_id is distinct from p_user_id;

    if v_other_owner_count > 0 then
      raise exception
        'An organization can have exactly one owner. Use Transfer ownership to hand it to someone else.'
        using errcode = '23514';
    end if;
  end if;

  select * into v_membership
  from iam.memberships
  where container_type = 'organization'
    and container_id = p_org_id
    and user_id = p_user_id
    and deleted_at is null;

  v_previous_role := v_membership.role;

  if p_action = 'add' then
    insert into iam.memberships (
      container_type, container_id, organization_id, user_id, role, status, metadata,
      created_by, updated_by
    )
    values (
      'organization', p_org_id, p_org_id, p_user_id, p_role, 'active', '{}'::jsonb, v_actor, v_actor
    )
    on conflict (container_type, container_id, user_id)
    do update set
      organization_id = excluded.organization_id,
      role = excluded.role,
      status = 'active',
      deleted_at = null,
      updated_by = v_actor,
      updated_at = now()
    returning * into v_membership;

  elsif p_action = 'set_role' then
    if v_membership.id is null then
      perform platform.refuse_not_found('Organization membership not found');
    end if;

    if v_membership.role = 'owner' and p_role <> 'owner' then
      select count(*) into v_owner_count
      from iam.memberships
      where container_type = 'organization'
        and container_id = p_org_id
        and role = 'owner'
        and deleted_at is null;

      if v_owner_count <= 1 then
        raise exception 'Cannot demote the last organization owner'
          using errcode = '23514';
      end if;
    end if;

    update iam.memberships
    set role = p_role,
        updated_by = v_actor,
        updated_at = now()
    where id = v_membership.id
    returning * into v_membership;

  else
    if v_membership.id is null then
      perform platform.refuse_not_found('Organization membership not found');
    end if;

    if v_membership.role = 'owner' then
      select count(*) into v_owner_count
      from iam.memberships
      where container_type = 'organization'
        and container_id = p_org_id
        and role = 'owner'
        and deleted_at is null;

      if v_owner_count <= 1 then
        raise exception 'Cannot remove the last organization owner'
          using errcode = '23514';
      end if;
    end if;

    -- DD-044: a super admin removing the last membership would leave the person
    -- with no organization at all.
    if iam.is_last_organization(p_user_id, p_org_id) then
      raise exception
        'This person can''t be removed from their only organization. They need to join or create another one first.'
        using errcode = '23514';
    end if;

    update iam.memberships
    set deleted_at = now(),
        updated_by = v_actor,
        updated_at = now()
    where id = v_membership.id
    returning * into v_membership;
  end if;

  insert into iam.org_admin_audit (organization_id, actor_user_id, target_user_id, action, detail)
  values (
    p_org_id, v_actor, p_user_id, 'super_admin_membership_' || p_action,
    jsonb_strip_nulls(jsonb_build_object('previous_role', v_previous_role, 'role', v_membership.role,
                       'membership_id', v_membership.id, 'reason', nullif(btrim(p_reason), '')))
  );

  -- The person's own admin history (users one-roof): one row per change, with the reason.
  perform admin._audit_user_action('org_membership_' || p_action, p_user_id,
    jsonb_build_object('organization_id', p_org_id, 'role', v_previous_role),
    jsonb_build_object('organization_id', p_org_id,
                       'role', case when p_action = 'remove' then null else v_membership.role end),
    p_reason,
    jsonb_build_object('organization_id', p_org_id, 'organization_name', v_org.name,
                       'membership_id', v_membership.id));

  return jsonb_build_object(
    'action', p_action, 'membership_id', v_membership.id, 'organization_id', p_org_id,
    'user_id', p_user_id, 'role', v_membership.role);
end;
$function$;

update platform.client_callable_door
   set schema_name = 'iam',
       identity_args = 'p_action text, p_org_id uuid, p_user_id uuid, p_role text, p_reason text',
       identity_argtypes = array['text'::regtype, 'uuid'::regtype, 'uuid'::regtype, 'text'::regtype, 'text'::regtype]::oid[],
       argument_rules = case when argument_rules ? 'arguments' then jsonb_set(argument_rules, '{arguments,p_reason}', '{"type":"text","position":5,"optional":true,"foreign":{"not_an_id":true},"null_rule":{"means":"no reason given"}}'::jsonb) else argument_rules end
 where schema_name = 'public' and function_name = 'admin_manage_organization_membership';
grant execute on function iam.admin_manage_organization_membership(text, uuid, uuid, text, text) to authenticated, service_role;

-- 4. B3 — top-tier access: p_note IS the audit reason ----------------------------------------------
create or replace function admin.set_top_tier_model_access(p_user uuid, p_enabled boolean, p_note text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'pg_catalog', 'pg_temp'
as $function$
declare
  v_actor uuid := auth.uid();
  v_before boolean;
  v_perms jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin can change top-tier model access' using errcode = '42501';
  end if;
  select coalesce(u.raw_app_meta_data -> 'permissions', '[]'::jsonb) into v_perms
    from auth.users u where u.id = p_user for update;
  if not found then
    raise exception 'No such user: %', p_user using errcode = 'P0002';
  end if;
  if jsonb_typeof(v_perms) <> 'array' then v_perms := '[]'::jsonb; end if;
  v_before := v_perms ? 'models.top_tier';
  if v_before = p_enabled then
    return jsonb_build_object('user_id', p_user, 'enabled', p_enabled, 'changed', false);
  end if;
  select coalesce(jsonb_agg(distinct x order by x), '[]'::jsonb) into v_perms
    from (select jsonb_array_elements_text(v_perms) x
          union select 'models.top_tier' where p_enabled) s
    where p_enabled or x <> 'models.top_tier';
  update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('permissions', v_perms),
    updated_at = now() where id = p_user;
  -- p_note is the reason (metadata.reason, like every other action); metadata.note kept for old readers.
  perform admin._audit_user_action(
    case when p_enabled then 'top_tier_models_grant' else 'top_tier_models_revoke' end, p_user,
    jsonb_build_object('top_tier_models', v_before), jsonb_build_object('top_tier_models', p_enabled),
    p_note, jsonb_strip_nulls(jsonb_build_object('note', nullif(btrim(p_note), ''))), v_actor);
  return jsonb_build_object('user_id', p_user, 'enabled', p_enabled, 'changed', true);
end $function$;

-- 5. B3 — a coupon for a person is on that person's history ----------------------------------------
create or replace function billing.coupon_create(p_kind text, p_plan_key text, p_months integer, p_count integer default 1, p_recipients jsonb default null::jsonb, p_expires_at timestamp with time zone default null::timestamp with time zone, p_note text default null::text)
 returns table(id uuid, code text, kind text, plan_key text, months integer, expires_at timestamp with time zone, recipient_user_id uuid, recipient_email text, recipient_phone text, link_token text, link_path text)
 language plpgsql
 security definer
 set search_path to ''
as $function$
#variable_conflict use_column
-- Super-admin mints one-time free-time coupons (Arman 2026-10-04). existing_account: redeemed by
-- code on an account that already exists (optionally bound to recipient_user_id). new_account:
-- opened from a one-time sign-up link; only the sha256 of its token is stored and the token is
-- returned HERE ONCE (link_token / link_path). p_recipients (jsonb array of {user_id?, email?,
-- phone?}) makes one coupon per recipient and replaces p_count. Months 1..free_period_max_months;
-- batch size up to billing/coupon_batch_max. A coupon bound to a person writes that person's admin
-- audit row (coupon_create, reason = p_note).
declare
  SYSTEM_ORG constant uuid := '39c38960-d30c-4840-b0c1-c9960de95582';
  v_max integer;
  v_batch integer;
  v_plan billing.plan%rowtype;
  v_list jsonb;
  v_rec jsonb;
  v_user uuid;
  v_token text;
  v_code text;
  v_id uuid;
  v_try integer;
begin
  if not (public.is_super_admin() or iam.is_trusted_backend()) then
    raise exception 'billing.coupon_create: super-admin only' using errcode = '42501';
  end if;
  if p_kind is null or p_kind not in ('existing_account', 'new_account') then
    raise exception 'coupon_bad_kind' using errcode = '22023', detail = 'Kind is existing_account or new_account.';
  end if;
  v_max := (platform.knob_resolve('billing', 'free_period_max_months', null, null, null) #>> '{}')::integer;
  v_batch := (platform.knob_resolve('billing', 'coupon_batch_max', null, null, null) #>> '{}')::integer;
  if p_months is null or p_months < 1 or p_months > v_max then
    raise exception 'free_time_bad_months' using errcode = '22023',
      detail = format('Free time is 1 to %s months (billing/free_period_max_months).', v_max);
  end if;
  select * into v_plan from billing.plan p where p.plan_key = p_plan_key and p.active and p.deleted_at is null;
  if not found or v_plan.audience in ('enterprise', 'guest') then
    raise exception 'free_time_bad_plan' using errcode = '22023',
      detail = format('%s is not a plan free time can be given on.', coalesce(p_plan_key, 'null'));
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'coupon_bad_expiry' using errcode = '22023', detail = 'A coupon must expire in the future.';
  end if;
  if p_recipients is not null then
    if jsonb_typeof(p_recipients) <> 'array' or jsonb_array_length(p_recipients) = 0 then
      raise exception 'coupon_bad_recipients' using errcode = '22023', detail = 'Recipients is a non-empty array.';
    end if;
    v_list := p_recipients;
  else
    if p_count is null or p_count < 1 then
      raise exception 'coupon_bad_count' using errcode = '22023', detail = 'Make at least one coupon.';
    end if;
    select jsonb_agg('{}'::jsonb) into v_list from generate_series(1, p_count);
  end if;
  if jsonb_array_length(v_list) > v_batch then
    raise exception 'coupon_batch_too_large' using errcode = '22023',
      detail = format('One call makes at most %s coupons (billing/coupon_batch_max).', v_batch);
  end if;

  for v_rec in select value from jsonb_array_elements(v_list) loop
    if jsonb_typeof(v_rec) <> 'object' then
      raise exception 'coupon_bad_recipients' using errcode = '22023', detail = 'Each recipient is an object.';
    end if;
    v_user := nullif(v_rec ->> 'user_id', '')::uuid;
    if v_user is not null and p_kind = 'new_account' then
      raise exception 'coupon_bad_recipients' using errcode = '22023',
        detail = 'A new-account coupon names an email or phone, never an existing account.';
    end if;
    if v_user is not null and not exists (select 1 from auth.users u where u.id = v_user) then
      raise exception 'coupon_bad_recipients' using errcode = '22023', detail = format('No account %s.', v_user);
    end if;
    v_token := case when p_kind = 'new_account'
                    then translate(rtrim(encode(extensions.gen_random_bytes(24), 'base64'), '='), '+/', '-_') end;
    v_id := null;
    v_try := 0;
    while v_id is null loop
      v_try := v_try + 1;
      if v_try > 8 then
        raise exception 'coupon_code_space_exhausted' using errcode = 'P0001', detail = 'Could not draw an unused code.';
      end if;
      v_code := billing._coupon_code();
      insert into billing.coupon as c (organization_id, code, kind, plan_key, months, max_redemptions, expires_at,
                                       recipient_user_id, recipient_email, recipient_phone, link_token_hash, note)
      values (SYSTEM_ORG, v_code, p_kind, v_plan.plan_key, p_months, 1, p_expires_at,
              v_user, nullif(btrim(v_rec ->> 'email'), ''), nullif(btrim(v_rec ->> 'phone'), ''),
              case when v_token is not null then encode(extensions.digest(v_token, 'sha256'), 'hex') end,
              nullif(btrim(p_note), ''))
      on conflict do nothing
      returning c.id into v_id;
    end loop;
    if v_user is not null then
      perform admin._audit_user_action('coupon_create', v_user, null,
        jsonb_build_object('coupon_id', v_id, 'code', v_code, 'plan_key', v_plan.plan_key, 'months', p_months),
        p_note, jsonb_build_object('coupon_id', v_id));
    end if;
    id := v_id; code := v_code; kind := p_kind; plan_key := v_plan.plan_key; months := p_months;
    expires_at := p_expires_at; recipient_user_id := v_user;
    recipient_email := nullif(btrim(v_rec ->> 'email'), ''); recipient_phone := nullif(btrim(v_rec ->> 'phone'), '');
    link_token := v_token;
    link_path := case when v_token is not null then '/sign-up?coupon=' || v_token end;
    return next;
  end loop;
end;
$function$;

-- coupon_revoke gains p_reason (old one-argument callers keep working through the default).
drop function billing.coupon_revoke(uuid);
create function billing.coupon_revoke(p_id uuid, p_reason text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
-- Super-admin withdraws a coupon; it can no longer be redeemed. Time already granted stays.
-- A coupon bound to a person writes that person's admin audit row (coupon_revoke).
declare v_row billing.coupon%rowtype; v_was timestamptz;
begin
  if not (public.is_super_admin() or iam.is_trusted_backend()) then
    raise exception 'billing.coupon_revoke: super-admin only' using errcode = '42501';
  end if;
  select c.revoked_at into v_was from billing.coupon c where c.id = p_id and c.deleted_at is null;
  update billing.coupon c set revoked_at = coalesce(c.revoked_at, now()), revoked_by = coalesce(c.revoked_by, auth.uid()),
                              updated_at = now()
   where c.id = p_id and c.deleted_at is null
  returning * into v_row;
  if not found then
    raise exception 'coupon_not_found' using errcode = 'P0001', detail = 'That coupon does not exist.';
  end if;
  if v_row.recipient_user_id is not null and v_was is null then
    perform admin._audit_user_action('coupon_revoke', v_row.recipient_user_id,
      jsonb_build_object('coupon_id', v_row.id, 'revoked', false),
      jsonb_build_object('coupon_id', v_row.id, 'revoked', true, 'code', v_row.code),
      p_reason, jsonb_build_object('coupon_id', v_row.id));
  end if;
  return to_jsonb(v_row) - 'link_token_hash';
end;
$function$;

update platform.client_callable_door
   set identity_args = 'p_id uuid, p_reason text',
       identity_argtypes = array['uuid'::regtype, 'text'::regtype]::oid[],
       argument_rules = case when argument_rules ? 'arguments' then jsonb_set(argument_rules, '{arguments,p_reason}', '{"type":"text","position":2,"optional":true,"foreign":{"not_an_id":true},"null_rule":{"means":"no reason given"}}'::jsonb) else argument_rules end
 where schema_name = 'billing' and function_name = 'coupon_revoke';
grant execute on function billing.coupon_revoke(uuid, text) to authenticated, service_role;

-- 6. B3 — a guest block lands on the person's history when the guest is a person -------------------
create or replace function public.admin_set_guest_block(p_guest_id uuid, p_blocked boolean, p_reason text default null::text, p_blocked_until timestamp with time zone default null::timestamp with time zone)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_guest users.guest_executions%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_metadata jsonb;
  v_history jsonb;
  v_len integer;
  v_prev jsonb;
  v_person uuid;
begin
  if v_actor is null or not public.is_super_admin() then
    raise exception 'Forbidden: Super Admin required' using errcode = '42501';
  end if;

  if p_guest_id is null or p_blocked is null then
    raise exception 'A guest id and a blocked flag are required' using errcode = '22023';
  end if;

  if p_blocked and p_blocked_until is not null and p_blocked_until <= now() then
    raise exception 'A block must end in the future' using errcode = '22023',
            detail = jsonb_build_object('blocked_until', p_blocked_until)::text;
  end if;

  if not p_blocked and p_blocked_until is not null then
    raise exception 'Unblocking takes no end time' using errcode = '22023';
  end if;

  if v_reason is not null and char_length(v_reason) > 500 then
    raise exception 'The reason is limited to 500 characters' using errcode = '22001';
  end if;

  select * into v_guest
  from users.guest_executions
  where id = p_guest_id
  for update;

  if not found then
    perform platform.refuse_not_found('Guest not found');
  end if;

  v_prev := jsonb_build_object(
      'is_blocked', coalesce(v_guest.is_blocked, false),
      'blocked_until', v_guest.blocked_until,
      'blocked_reason', v_guest.blocked_reason
    );
  v_metadata := case
    when jsonb_typeof(v_guest.metadata) = 'object' then v_guest.metadata
    else '{}'::jsonb
  end;
  v_history := case
    when jsonb_typeof(v_metadata -> 'admin_block_history') = 'array'
      then v_metadata -> 'admin_block_history'
    else '[]'::jsonb
  end;
  v_history := v_history || jsonb_build_array(jsonb_build_object(
    'action', case when p_blocked then 'block' else 'unblock' end,
    'actor_user_id', v_actor,
    'at', now(),
    'reason', v_reason,
    'blocked_until', case when p_blocked then p_blocked_until end,
    'previous', v_prev
  ));
  v_len := jsonb_array_length(v_history);
  if v_len > 50 then
    select jsonb_agg(e order by ord)
    into v_history
    from jsonb_array_elements(v_history) with ordinality as t(e, ord)
    where ord > v_len - 50;
  end if;

  update users.guest_executions
  set is_blocked = p_blocked,
      blocked_until = case when p_blocked then p_blocked_until end,
      blocked_reason = case when p_blocked then v_reason end,
      metadata = jsonb_set(v_metadata, '{admin_block_history}', v_history, true)
  where id = p_guest_id
  returning * into v_guest;

  -- A guest that is (or became) an account is a person: the block is on that person's admin history.
  -- A guest with no account has no person page; its history is admin_block_history above.
  v_person := coalesce(v_guest.auth_user_id, v_guest.converted_to_user_id);
  if v_person is not null and exists (select 1 from auth.users u where u.id = v_person) then
    perform admin._audit_user_action(case when p_blocked then 'guest_block' else 'guest_unblock' end, v_person,
      v_prev,
      jsonb_build_object('is_blocked', coalesce(v_guest.is_blocked, false), 'blocked_until', v_guest.blocked_until),
      v_reason, jsonb_build_object('guest_id', v_guest.id));
  end if;

  return jsonb_build_object(
    'guest_id', v_guest.id,
    'is_blocked', coalesce(v_guest.is_blocked, false),
    'block_active', coalesce(v_guest.is_blocked, false)
      and (v_guest.blocked_until is null or v_guest.blocked_until > now()),
    'blocked_until', v_guest.blocked_until,
    'blocked_reason', v_guest.blocked_reason,
    'updated_at', v_guest.updated_at
  );
end;
$function$;

-- 7. S12 — account flags changed and audited in ONE transaction ------------------------------------
create function iam.admin_set_account_flags(
  p_user uuid, p_onboarding boolean default null, p_mcp_full_access boolean default null, p_reason text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
-- PATCH /api/admin/users (users one-roof S12): the onboarding flag (raw_user_meta_data.onboarding_completed)
-- and full MCP access (raw_app_meta_data.permissions 'mcp.full_access') change and are audited together:
-- either both the change and its admin.admin_audit_log row land, or neither does.
declare
  v_actor uuid := auth.uid();
  v_user_meta jsonb;
  v_app_meta jsonb;
  v_perms jsonb;
  v_onboarding_before boolean;
  v_mcp_before boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_super_admin() then
    raise exception 'admin_set_account_flags: super admins only' using errcode = '42501';
  end if;
  if p_user is null then
    raise exception 'admin_set_account_flags: p_user is required' using errcode = '22004';
  end if;
  if p_onboarding is null and p_mcp_full_access is null then
    raise exception 'admin_set_account_flags: name at least one control' using errcode = '22023';
  end if;
  select coalesce(u.raw_user_meta_data, '{}'::jsonb), coalesce(u.raw_app_meta_data, '{}'::jsonb)
    into v_user_meta, v_app_meta
    from auth.users u where u.id = p_user for update;
  if not found then
    raise exception 'admin_set_account_flags: no person %', p_user using errcode = 'P0002';
  end if;

  if p_onboarding is not null then
    v_onboarding_before := case when jsonb_typeof(v_user_meta -> 'onboarding_completed') = 'boolean'
                                then (v_user_meta ->> 'onboarding_completed')::boolean end;
    update auth.users
       set raw_user_meta_data = v_user_meta || jsonb_build_object('onboarding_completed', p_onboarding),
           updated_at = now()
     where id = p_user;
    perform admin._audit_user_action('onboarding_flag_set', p_user,
      jsonb_build_object('onboarding_completed', v_onboarding_before),
      jsonb_build_object('onboarding_completed', p_onboarding),
      p_reason, jsonb_build_object('via', 'iam.admin_set_account_flags'), v_actor);
  end if;

  if p_mcp_full_access is not null then
    v_perms := case when jsonb_typeof(v_app_meta -> 'permissions') = 'array' then v_app_meta -> 'permissions' else '[]'::jsonb end;
    v_mcp_before := v_perms ? 'mcp.full_access';
    select coalesce(jsonb_agg(distinct x order by x), '[]'::jsonb) into v_perms
      from (select jsonb_array_elements_text(v_perms) x
            union select 'mcp.full_access' where p_mcp_full_access) s
     where p_mcp_full_access or x <> 'mcp.full_access';
    update auth.users
       set raw_app_meta_data = v_app_meta || jsonb_build_object('permissions', v_perms),
           updated_at = now()
     where id = p_user;
    perform admin._audit_user_action(
      case when p_mcp_full_access then 'mcp_full_access_grant' else 'mcp_full_access_revoke' end, p_user,
      jsonb_build_object('mcp_full_access', v_mcp_before),
      jsonb_build_object('mcp_full_access', p_mcp_full_access),
      p_reason, jsonb_build_object('via', 'iam.admin_set_account_flags'), v_actor);
  end if;

  return jsonb_strip_nulls(jsonb_build_object('user_id', p_user,
    'onboarding_completed', p_onboarding, 'mcp_full_access', p_mcp_full_access));
end $function$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers, gate_predicate, argument_rules)
values
  ('iam', 'admin_set_account_flags', 'p_user uuid, p_onboarding boolean, p_mcp_full_access boolean, p_reason text',
   array['uuid'::regtype, 'boolean'::regtype, 'boolean'::regtype, 'text'::regtype]::oid[],
   'WRITE. p_user is any auth user; the body refuses anyone but a super admin (or the server) with 42501, changes the onboarding flag / full MCP access and writes the admin audit row in the same transaction.',
   'migrations/20261018170000_lane_q_admin_actions_audited_with_reason.sql (users one-roof lane Q)',
   null, true, false, 'public.is_super_admin()',
   '{"version":1,"arguments":{"p_user":{"type":"uuid","position":1,"optional":false,"check":"public.is_super_admin() (or the service role), decided before the first read","foreign":{"note":"Any person; super admin only.","bounded":true}},"p_onboarding":{"type":"boolean","position":2,"optional":true,"foreign":{"not_an_id":true},"null_rule":{"means":"leave the onboarding flag unchanged"}},"p_mcp_full_access":{"type":"boolean","position":3,"optional":true,"foreign":{"not_an_id":true},"null_rule":{"means":"leave full MCP access unchanged"}},"p_reason":{"type":"text","position":4,"optional":true,"foreign":{"not_an_id":true},"null_rule":{"means":"no reason given"}}}}'::jsonb)
on conflict do nothing;
grant execute on function iam.admin_set_account_flags(uuid, boolean, boolean, text) to authenticated, service_role;

-- 8. S9 — a message or email an admin sends to a person is on that person's history -----------------
create function admin.record_contact(
  p_action text, p_user uuid default null, p_email text default null, p_title text default null,
  p_ref jsonb default '{}'::jsonb, p_actor uuid default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
-- One audit row per person an admin contacted: p_action 'message_sent' (direct message) or 'email_sent'.
-- The person is p_user, or the account whose email is p_email; an address with no account is no person
-- and returns null. The reason is p_title (the email subject, or what the message was about) — never the
-- body. A signed-in platform admin is always the actor; only the server (service role) names p_actor.
declare
  v_user uuid := p_user;
  v_actor uuid := case when coalesce(auth.role(), '') = 'service_role' then p_actor else auth.uid() end;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_platform_admin() then
    raise exception 'admin.record_contact: platform admins only' using errcode = '42501';
  end if;
  if p_action not in ('message_sent', 'email_sent') then
    raise exception 'admin.record_contact: % is not a contact action', p_action using errcode = '22023';
  end if;
  if v_user is null and nullif(btrim(p_email), '') is not null then
    select u.id into v_user from auth.users u where lower(u.email) = lower(btrim(p_email)) limit 1;
  end if;
  if v_user is null or not exists (select 1 from auth.users u where u.id = v_user) then
    return null;
  end if;
  return admin._audit_user_action(p_action, v_user, null,
    coalesce(p_ref, '{}'::jsonb), coalesce(nullif(btrim(p_title), ''),
      case p_action when 'message_sent' then 'Direct message' else 'Email' end),
    coalesce(p_ref, '{}'::jsonb), v_actor);
end $function$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers, gate_predicate, argument_rules)
values
  ('admin', 'record_contact', 'p_action text, p_user uuid, p_email text, p_title text, p_ref jsonb, p_actor uuid',
   array['text'::regtype, 'uuid'::regtype, 'text'::regtype, 'text'::regtype, 'jsonb'::regtype, 'uuid'::regtype]::oid[],
   'WRITE (audit only). p_user is any auth user; the body refuses anyone but a platform admin (or the server) with 42501 and writes one admin audit row saying a message/email was sent to that person. A signed-in caller is always the actor.',
   'migrations/20261018170000_lane_q_admin_actions_audited_with_reason.sql (users one-roof lane Q)',
   null, true, false, 'public.is_platform_admin()',
   '{"version":1,"arguments":{"p_action":{"type":"text","position":1,"optional":false,"foreign":{"not_an_id":true}},"p_user":{"type":"uuid","position":2,"optional":true,"check":"public.is_platform_admin() (or the service role), decided before the first read","foreign":{"note":"Any person; platform admins only. Only writes an audit row about a contact already sent.","bounded":true},"null_rule":{"means":"resolve the person from p_email"}},"p_email":{"type":"text","position":3,"optional":true,"foreign":{"not_an_id":true}},"p_title":{"type":"text","position":4,"optional":true,"foreign":{"not_an_id":true}},"p_ref":{"type":"jsonb","position":5,"optional":true,"foreign":{"not_an_id":true}},"p_actor":{"type":"uuid","position":6,"optional":true,"foreign":{"note":"Ignored unless the caller is the service role; a signed-in caller is always the actor (auth.uid()).","not_a_leak":true,"bounded":true},"null_rule":{"means":"the caller is the actor"}}}}'::jsonb)
on conflict do nothing;
grant execute on function admin.record_contact(text, uuid, text, text, jsonb, uuid) to authenticated, service_role;
