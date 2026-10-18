-- 20261018000000_custom_domains_plan_exception_platform_door.sql
-- lane: DOMAINS-BUILD-2
-- lock: platform
-- chair-step: re-creates the knob_write_door authority_kind CHECK to add platform_admin (drop+add of the same constraint).
-- based-on: platform.knob_write_door_for(text, uuid) 627be21cff91505b8bef34d5888296d65e32a16113f3036e81ba82a47cb0b93c
--
-- custom_domains.plan_exception grants custom domains outside the plan. It is plan gating: the platform
-- decides it, never the organization itself. Until now the '' default door (platform.knob_override_set,
-- org owner/admin) wrote it, so an org admin could self-grant from the configuration screen.
--
--   1. a new authority kind 'platform_admin' on platform.knob_write_door;
--   2. platform.knob_write_door_for answers may_write for it with public.is_admin() (admin lane);
--   3. platform.knob_platform_grant_set: the one door for keys declared platform_admin
--      (a platform admin on the admin lane, or the server's service role);
--   4. the door row for custom_domains.plan_exception, so platform.knob_override_set refuses it
--      by name (wrong_door) and the settings screen shows it read-only.
-- Org admins still READ the value (knob_resolve / the configuration screen). Inverse in
-- migrations/inverse/20261018000000_custom_domains_plan_exception_platform_door_down.sql.

alter table platform.knob_write_door drop constraint if exists knob_write_door_authority_kind_check;
alter table platform.knob_write_door add constraint knob_write_door_authority_kind_check
  check (authority_kind = any (array['org_steward', 'hr_settings_gate', 'cutover_seam', 'meet_host', 'platform_admin']));

create or replace function platform.knob_platform_grant_set(
  p_feature text, p_key text, p_organization_id uuid, p_value jsonb, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'platform', 'public'
as $function$
-- THE DOOR for keys the platform decides per organization (authority_kind platform_admin), such as
-- custom_domains.plan_exception. A null p_value removes the organization's row.
declare
  v_uid uuid := auth.uid();
  v_door jsonb;
  v_service boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if p_organization_id is null then
    return jsonb_build_object('ok', false, 'reason', 'organization_required',
      'detail', 'Name the organization this platform grant is for.');
  end if;
  v_door := platform.knob_write_door_for(p_feature || '.' || p_key);
  if not coalesce((v_door ->> 'ok')::boolean, false)
     or (v_door ->> 'set_door') is distinct from 'platform.knob_platform_grant_set' then
    return jsonb_build_object('ok', false, 'reason', 'wrong_door',
      'set_door', v_door ->> 'set_door', 'clear_door', v_door ->> 'clear_door',
      'detail', format('%s.%s is not a platform grant; write it through %s.', p_feature, p_key,
        coalesce(v_door ->> 'set_door', 'its own door')));
  end if;
  if not v_service and not public.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'platform_only',
      'detail', format('%s.%s is set by the platform only. Organization admins can see it, not change it.', p_feature, p_key));
  end if;
  return platform._knob_override_write(
    p_feature, p_key, 'organization', p_organization_id, p_organization_id,
    p_value, p_note, v_uid);
end;
$function$;

insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason,
  declared_by, non_client_lane, signed_in_callers, anonymous_callers, gate_predicate, argument_rules)
select n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid), platform.door_argtypes(p.proargtypes),
       'Sets or clears a platform-decided per-organization knob (authority_kind platform_admin, e.g. custom_domains.plan_exception). Platform admins on the admin lane, or the server; everyone else is refused platform_only.',
       '20261018000000_custom_domains_plan_exception_platform_door', null, true, false,
       'public.is_admin()',
       '{"version": 1, "arguments": {"p_feature": {"type": "text", "position": 1, "optional": false, "foreign": {"not_an_id": true}}, "p_key": {"type": "text", "position": 2, "optional": false, "foreign": {"not_an_id": true}}, "p_organization_id": {"type": "uuid", "position": 3, "optional": false, "check": "platform admin (public.is_admin) or service_role, decided before the write", "foreign": {"bounded": true, "note": "Any organization is in scope for a platform admin; a non-admin is refused before anything is written."}}, "p_value": {"type": "jsonb", "position": 4, "optional": true, "foreign": {"not_an_id": true}}, "p_note": {"type": "text", "position": 5, "optional": true, "foreign": {"not_an_id": true}}}}'::jsonb
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'platform' and p.proname = 'knob_platform_grant_set'
on conflict do nothing;

grant execute on function platform.knob_platform_grant_set(text, text, uuid, jsonb, text) to authenticated, service_role;

CREATE OR REPLACE FUNCTION platform.knob_write_door_for(p_key text, p_organization_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'platform', 'public', 'hr', 'pg_temp'
AS $function$
-- THE ONE PLACE A SURFACE ASKS "which door writes this key, and may I use it".
--
-- Two answers, never one: a screen that knows the door but not the authority
-- either draws a control the door will refuse (a lying control) or hides one the
-- person is entitled to (the DD-221 defect, from the other side). `may_write` is
-- computed with the SAME predicates the real gates use — never re-stated, never
-- guessed from `org_role`.
--
-- It is STABLE and it writes nothing: `hr._l1_settings_gate` files a denial row
-- in `hr.access_audit` when it refuses, and asking "may I" is not knocking.
declare
  v_row platform.knob_write_door;
  v_uid uuid := auth.uid();
  v_may boolean;
  v_detail text;
begin
  if p_key is null or position('.' in p_key) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'bad_key',
      'detail', 'A settings key is written <feature>.<key>, for example hr.employees.adjusted_service_date_rule.');
  end if;

  -- Longest declared prefix wins; the '' row is the default and matches everything.
  select d.* into v_row
    from platform.knob_write_door d
   where p_key like d.feature_prefix || '%'
   order by length(d.feature_prefix) desc
   limit 1;

  if v_row.feature_prefix is null then
    -- Only reachable if the default row was deleted. Say so; never invent a door.
    return jsonb_build_object('ok', false, 'reason', 'no_door_declared',
      'detail', format('No write door is declared for %s, and the default row is missing from platform.knob_write_door, so there is nothing to write it through.', p_key));
  end if;

  if v_row.authority_kind = 'cutover_seam' then
    -- LANE FLIP-SEAMS: a seam switch is never a settings value. It is pressed on the
    -- organization's settings page (Data) through platform.cutover_seam_press, which
    -- runs the switch's archive step in the same press and records who and when. A
    -- settings screen may show the value; it never writes it, for anybody.
    v_may := case when p_organization_id is null then null else false end;
    v_detail := 'This is switched on the organization''s settings page, under Data, by an owner — not here.';
  elsif v_row.authority_kind = 'platform_admin' then
    -- LANE DOMAINS-BUILD-2: plan gating the platform decides per organization
    -- (platform.knob_platform_grant_set). Organization admins read it; only a platform
    -- admin on the admin lane (or the server) writes it.
    if public.is_admin() then
      v_may := true;
      v_detail := 'You are a platform admin.';
    else
      v_may := case when p_organization_id is null then null else false end;
      v_detail := 'Set by the platform only.';
    end if;
  elsif p_organization_id is null then
    v_may := null;
    v_detail := 'No organization was named, so no authority was decided.';
  elsif v_uid is null then
    v_may := false;
    v_detail := 'Nobody is signed in.';
  elsif v_row.authority_kind = 'hr_settings_gate' then
    -- hr._l1_settings_gate's own two admissions, in its own order (DD-206).
    if hr.capability(v_uid, 'identity.write', null, current_date, p_organization_id) then
      v_may := true;
      v_detail := 'You hold HR admin standing in this organization.';
    elsif coalesce(hr._l1_org_role(v_uid, p_organization_id, false) in ('owner', 'admin'), false) then
      v_may := true;
      v_detail := 'You are an owner or admin of this organization.';
    else
      v_may := false;
      v_detail := 'HR settings are HR-admin only.';
    end if;
  elsif v_row.authority_kind = 'org_steward' then
    -- platform.knob_override_set's own test, for every rung but `user`.
    if public.is_admin() then
      v_may := true;
      v_detail := 'You are a platform admin.';
    elsif exists (select 1 from iam.organization_member m
                   where m.organization_id = p_organization_id
                     and m.user_id = v_uid
                     and m.role in ('owner', 'admin')) then
      v_may := true;
      v_detail := 'You are an owner or admin of this organization.';
    else
      v_may := false;
      v_detail := 'Organization configuration is owner/admin only.';
    end if;
  elsif v_row.authority_kind = 'meet_host' then
    -- Meeting rules (communication.meet_policy_set). Asked for an organization, the
    -- answer is the steward test that door applies to the organization rung; the
    -- meet_meeting rung is each meeting host's, decided per meeting by the door.
    if public.is_admin() then
      v_may := true;
      v_detail := 'You are a platform admin.';
    elsif exists (select 1 from iam.organization_member m
                   where m.organization_id = p_organization_id
                     and m.user_id = v_uid
                     and m.role in ('owner', 'admin')) then
      v_may := true;
      v_detail := 'You are an owner or admin of this organization.';
    else
      v_may := false;
      v_detail := 'Owners and admins set this for the organization; hosts set it per meeting.';
    end if;
  else
    raise exception 'knob_write_door_for: % declares authority_kind %, which this door does not know how to ask', v_row.feature_prefix, v_row.authority_kind
      using errcode = '22023';
  end if;

  return jsonb_build_object(
    'ok', true,
    'key', p_key,
    'feature_prefix', v_row.feature_prefix,
    'set_door', v_row.set_door,
    'clear_door', v_row.clear_door,
    'authority_kind', v_row.authority_kind,
    'reason', v_row.reason,
    'may_write', v_may,
    'authority_detail', v_detail);
end;
$function$;

insert into platform.knob_write_door (feature_prefix, set_door, clear_door, authority_kind, reason, organization_id)
select 'custom_domains.plan_exception', 'platform.knob_platform_grant_set', 'platform.knob_platform_grant_set',
       'platform_admin',
       'Custom domains outside the plan is plan gating: the platform grants it per organization (pre-launch testing, sales exceptions). Organization admins see it on the configuration screen and cannot change it; platform.knob_override_set refuses it by name (lane DOMAINS-BUILD-2, 2026-10-18).',
       d.organization_id
  from platform.knob_write_door d where d.feature_prefix = ''
on conflict do nothing;
