-- chair-step: lane HR-SCHEMA-OPEN. Closes the four conformance findings created when hr_open_02
-- exposed `hr`: authenticated can no longer write hr.punch directly; intentional hr SECURITY
-- DEFINER client doors are recognized only through their exact platform.client_callable_door
-- declaration; thirteen independently reviewed notify/outsider doors are baselined exactly; and
-- the break-glass contract follows the centralized iam.share_with_person writer introduced later.
-- No function answer, row, policy, trigger, or performance-review client grant changes.
-- lane: HR-SCHEMA-OPEN
-- based-on: hr.definer_functions_client_reachable() eab171625aa7d3a1ed1bc4fd3049daf1a7945a63d33a53947506d97aa28e69f5
-- based-on: hr.punch_write_path_conformance() 6196fbd6251dbd3fbe118488cb6f80a6152d304c2e7b5d1bb9f31218da3d3032

begin;

-- SPEC-TIME 7.1: RLS admits editors to the component row, so grants are the write membrane.
-- All supported writes already enter through the public hr_punch_* / kiosk doors.
revoke insert, update, delete on table hr.punch from public, anon, authenticated;

-- Check 33 predated an exposed hr schema and assumed that every reachable definer was a helper.
-- A declared door is not debt: the database-wide create-time guard already uses this exact
-- registry to distinguish deliberate client doors from owner-running helpers. Match both the
-- signature and the allowed caller kind; a signed-in-only declaration cannot excuse anon reach.
create or replace function hr.definer_functions_client_reachable()
returns table(qname text, identity_args text, anon_can boolean, authenticated_can boolean,
              acl_is_null boolean, baselined boolean)
language sql
stable
security definer
set search_path = hr, public
as $fn$
  select n.nspname || '.' || p.proname,
         pg_get_function_identity_arguments(p.oid),
         has_function_privilege('anon', p.oid, 'EXECUTE'),
         has_function_privilege('authenticated', p.oid, 'EXECUTE'),
         p.proacl is null,
         exists (select 1 from hr.definer_grant_baseline b
                  where b.function_name = p.proname
                    and b.identity_args = pg_get_function_identity_arguments(p.oid))
         or exists (
              select 1
                from platform.client_callable_door d
               where d.schema_name = n.nspname
                 and d.function_name = p.proname
                 and d.identity_args = pg_get_function_identity_arguments(p.oid)
                 and (not has_function_privilege('anon', p.oid, 'EXECUTE') or d.anonymous_callers)
                 and (not has_function_privilege('authenticated', p.oid, 'EXECUTE') or d.signed_in_callers)
            )
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'hr'
     and p.prosecdef
     and (has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
     and not exists (
       select 1 from pg_depend d
        where d.refclassid = 'pg_proc'::regclass
          and d.refobjid = p.oid
          and d.classid in ('pg_policy'::regclass, 'pg_constraint'::regclass, 'pg_attrdef'::regclass))
   order by 1, 2;
$fn$;

revoke execute on function hr.definer_functions_client_reachable() from public, anon, authenticated;

-- DD-223: this catalogue census is called by the server-side HR conformance guard only.
-- It takes no entity ID and must never be a direct client door on the exposed hr schema.
insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers)
values
  ('hr', 'definer_functions_client_reachable', '', array[]::oid[],
   'Catalogue-only HR definer grant census with no entity-id arguments; the server-side punch write conformance guard calls it to detect undeclared client access.',
   'HR-SCHEMA-OPEN hr_open_04',
   'server_only: hr.punch_write_path_conformance calls this catalogue census over a privileged database connection during release checks; no browser client may inspect the HR function grant inventory.',
   false, false)
on conflict do nothing;

-- These thirteen doors entered the sensitive-object census after check 35 shipped. Each exact
-- signature is already a signed-in platform.client_callable_door; its reviewed registry reason is
-- copied into the narrower HR audit baseline. The VALUES list prevents a live-census mass waiver.
with door(schema_name, function_name, identity_args) as (values
  ('communication','clear_inbox','p_action text, p_event_keys text[], p_until timestamp with time zone'),
  ('communication','inbox_notifications','p_state text, p_limit integer, p_before timestamp with time zone, p_before_id uuid, p_unread_only boolean, p_org_id uuid'),
  ('communication','mark_inbox_seen',''),
  ('communication','meet_settle_call_invite','p_invite_id uuid, p_state text, p_decline_message text'),
  ('communication','my_inbox_kinds',''),
  ('communication','my_inbox_organizations',''),
  ('communication','my_inbox_summary',''),
  ('communication','reconcile_my_notices','p_scope text, p_notices jsonb, p_organization_id uuid'),
  ('communication','set_notifications_state','p_ids uuid[], p_action text, p_until timestamp with time zone'),
  ('platform','secure_delivery_recipient_phone','p_email text'),
  ('public','esign_envelope_state','p_envelope_id uuid'),
  ('public','org_admin_take_over_account','p_org_id uuid, p_user_id uuid, p_purpose text, p_reason text, p_new_password text'),
  ('public','org_admin_take_over_member_records','p_org_id uuid, p_user_id uuid, p_purpose text, p_reason text, p_to_user_id uuid')
)
insert into hr.notify_outsider_door_baseline
  (schema_name, function_name, identity_args, anon_ok, reason)
select d.schema_name, d.function_name, d.identity_args, false,
       'HR-SCHEMA-OPEN review: ' || c.reason
  from door d
  join platform.client_callable_door c using (schema_name, function_name, identity_args)
 where c.signed_in_callers and not c.anonymous_callers
on conflict (schema_name, function_name, identity_args) do update
   set anon_ok = false,
       reason = excluded.reason,
       noted_on = current_date;

-- Access-ladder T-32e centralized permission writes in iam.share_with_person. Keep the contract on
-- the real grant, arm, derived-grant linkage and absolute subject-exclusion veto instead of pinning
-- the superseded direct INSERT spelling.
update hr.function_contract
   set must_contain = array[
         'iam.share_with_person',
         $$v_perm := (v_share ->> 'permission_id')::uuid$$,
         'insert into hr.derived_grant',
         'reason',
         'break_glass',
         'perform hr.arm_write()',
         'SPEC-ACCESS §5: the subject-exclusion veto overrides break-glass, absolutely'
       ],
       reason = 'hr_c3_14 plus access-ladder T-32e: break-glass must create a real time-boxed '
         || 'viewer permission through the centralized iam.share_with_person writer, link its '
         || 'permission_id into hr.derived_grant, arm the audited HR write, and preserve the '
         || 'absolute subject-exclusion veto.'
 where schema_name = 'public'
   and function_name = 'hr_break_glass'
   and home_migration = 'hr_c3_14'
   and is_active;

do $contract$
begin
  if not exists (
    select 1
      from hr.function_contract
     where schema_name = 'public'
       and function_name = 'hr_break_glass'
       and home_migration = 'hr_c3_14'
       and is_active
       and must_contain @> array[
         'iam.share_with_person',
         $$v_perm := (v_share ->> 'permission_id')::uuid$$,
         'insert into hr.derived_grant'
       ]
  ) then
    raise exception 'hr_open_04: active hr_c3_14 hr_break_glass contract row not found';
  end if;
end
$contract$;

-- Replace only checks 1 and 33. The markers are part of the conformance source contract; refusing
-- an unexpected source shape is safer than silently installing a partial rewrite.
do $mig$
declare
  v_src text := pg_get_functiondef('hr.punch_write_path_conformance()'::regprocedure);
  v_a integer;
  v_b integer;
begin
  v_a := strpos(v_src, '  ---------------------------------------------------------------- 1.');
  v_b := strpos(v_src, '  ---------------------------------------------------------------- 2.');
  if v_a = 0 or v_b <= v_a then
    raise exception 'hr_open_04: conformance check 1 markers not found';
  end if;
  v_src := left(v_src, v_a - 1) || $block$
  ---------------------------------------------------------------- 1. exposed hr is fenced at the punch table
  select coalesce(array_to_string(s.setconfig, ' '), '') into v_schemas
    from pg_db_role_setting s join pg_roles r on r.oid = s.setrole
   where r.rolname = 'authenticator';
  v_list := string_to_array(
              coalesce((regexp_match(coalesce(v_schemas, ''), 'pgrst\.db_schemas=([^ ]*)'))[1], ''), ',');
  select coalesce(jsonb_agg(role_name || ':' || privilege_name order by role_name, privilege_name), '[]'::jsonb)
    into v_bad
    from (select r role_name, p privilege_name
            from unnest(array['anon','authenticated']) r,
                 unnest(array['INSERT','UPDATE','DELETE']) p
           where has_table_privilege(r, 'hr.punch', p)
          union all
          select 'PUBLIC', privilege_type
            from information_schema.table_privileges
           where table_schema = 'hr' and table_name = 'punch' and grantee = 'PUBLIC'
             and privilege_type in ('INSERT','UPDATE','DELETE')) q;
  check_key := 'pgrst_hr_exposure_is_fenced';
  ok        := 'hr' = any(coalesce(v_list, '{}'::text[]))
               and has_schema_privilege('authenticated', 'hr', 'USAGE')
               and not has_schema_privilege('anon', 'hr', 'USAGE')
               and v_bad = '[]'::jsonb;
  severity  := 'blocking';
  detail    := jsonb_build_object(
                 'exposed_schemas', to_jsonb(coalesce(v_list, '{}'::text[])),
                 'authenticated_schema_usage', has_schema_privilege('authenticated', 'hr', 'USAGE'),
                 'anon_schema_usage', has_schema_privilege('anon', 'hr', 'USAGE'),
                 'punch_client_dml', v_bad,
                 'why', 'Performance-review clients call declared hr.* RPC doors directly. The schema must remain exposed to authenticated and closed to anon, while hr.punch must grant no client INSERT, UPDATE or DELETE because its component RLS does not enforce punch_record invariants.');
  return next;

$block$ || substr(v_src, v_b);

  v_a := strpos(v_src, '  ---------------------------------------------------------------- 33.');
  v_b := strpos(v_src, '  ---------------------------------------------------------------- 34.');
  if v_a = 0 or v_b <= v_a then
    raise exception 'hr_open_04: conformance check 33 markers not found';
  end if;
  v_src := left(v_src, v_a - 1) || $block$
  ---------------------------------------------------------------- 33. definer helpers are not public
  check_key := 'definer_helpers_are_not_client_reachable';
  select coalesce(jsonb_agg(jsonb_build_object(
           'function', t.qname, 'args', t.identity_args,
           'anon', t.anon_can, 'authenticated', t.authenticated_can,
           'never_revoked', t.acl_is_null) order by t.qname, t.identity_args), '[]'::jsonb)
    into v_bad
    from hr.definer_functions_client_reachable() t
   where not t.baselined;
  ok       := (v_bad = '[]'::jsonb);
  severity := 'blocking';
  detail   := jsonb_build_object(
    'violations', v_bad,
    'legacy_baseline_remaining', (select count(*)
                                    from hr.definer_functions_client_reachable() t
                                    join hr.definer_grant_baseline b
                                      on b.function_name = split_part(t.qname, '.', 2)
                                     and b.identity_args = t.identity_args),
    'declared_client_doors_reachable', (select count(*)
                                         from hr.definer_functions_client_reachable() t
                                         join platform.client_callable_door d
                                           on d.schema_name = split_part(t.qname, '.', 1)
                                          and d.function_name = split_part(t.qname, '.', 2)
                                          and d.identity_args = t.identity_args),
    'definer_functions_total', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                                   where n.nspname = 'hr' and p.prosecdef),
    'why', 'An exposed hr SECURITY DEFINER function may be client-reachable only when its exact signature is a platform.client_callable_door for every client role that can execute it, or while it remains in the dated legacy baseline. RLS-policy, CHECK and DEFAULT dependencies remain derived catalog exemptions. Any other owner-running helper is a blocking violation.');
  return next;

$block$ || substr(v_src, v_b);
  execute v_src;
end
$mig$;

do $check$
declare
  v_bad jsonb;
  v_count integer;
begin
  select coalesce(jsonb_agg(jsonb_build_object('check', check_key, 'detail', detail) order by check_key), '[]'::jsonb)
    into v_bad
    from hr.punch_write_path_conformance()
   where not ok;
  if v_bad <> '[]'::jsonb then
    raise exception 'hr_open_04: conformance remains red: %', v_bad;
  end if;

  select count(*) into v_count
    from hr.notify_outsider_doors_client_reachable();
  if v_count <> 0 then
    raise exception 'hr_open_04: % sensitive cross-schema door(s) remain unreviewed', v_count;
  end if;

  if exists (
    select 1
      from unnest(array['anon','authenticated']) r,
           unnest(array['INSERT','UPDATE','DELETE']) p
     where has_table_privilege(r, 'hr.punch', p)
    union all
    select 1 from information_schema.table_privileges
     where table_schema = 'hr' and table_name = 'punch' and grantee = 'PUBLIC'
       and privilege_type in ('INSERT','UPDATE','DELETE')
  ) then
    raise exception 'hr_open_04: a client role still holds raw DML on hr.punch';
  end if;
end
$check$;

commit;
