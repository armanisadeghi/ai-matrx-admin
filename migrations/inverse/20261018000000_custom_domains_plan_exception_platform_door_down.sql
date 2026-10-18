-- inverse of 20261018000000_custom_domains_plan_exception_platform_door.sql
-- lane: DOMAINS-BUILD-2
-- chair-step: returns custom_domains.plan_exception to the organization door (org admins could self-grant again) and drops the platform grant door.
delete from platform.client_callable_door where schema_name = 'platform' and function_name = 'knob_platform_grant_set';
delete from platform.knob_write_door where feature_prefix = 'custom_domains.plan_exception';
drop function if exists platform.knob_platform_grant_set(text, text, uuid, jsonb, text);
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
alter table platform.knob_write_door drop constraint if exists knob_write_door_authority_kind_check;
alter table platform.knob_write_door add constraint knob_write_door_authority_kind_check
  check (authority_kind = any (array['org_steward', 'hr_settings_gate', 'cutover_seam', 'meet_host']));
