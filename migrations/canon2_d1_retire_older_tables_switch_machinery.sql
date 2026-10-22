-- chair-step: drops two functions only the retired older_tables switch reached (seam retired 2026-10-05; every older_tables branch below sat behind a retired_at-is-null seam lookup that can no longer match)
-- based-on: platform._cutover_seam_readiness(text, uuid) 64f4226976b916dad20c7ab9cad839eee1040b6eb2b6e0495e22681578542aa0
-- based-on: platform._cutover_seam_reverse_readiness(text, uuid) b0ca33c0d768cf932fcd716f24beea2ef7fd04256098e0058c035be906ec8842
-- based-on: platform.cutover_seam_press(text, uuid, text, text, boolean) 4237b595a6608af8d5c3b41bb76d7261280a3ea5250f669b992e0f8daa5ab6cd
set lock_timeout = '2s';

-- 1. Readiness: the older_tables branch is gone (the seam is retired, so the early "no switch called"
--    return always fired first). Retired seams and owner-press prerequisites behave exactly as before.
CREATE OR REPLACE FUNCTION platform._cutover_seam_readiness(p_seam text, p_org uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  s platform.cutover_seam;
  v_checks jsonb := '[]'::jsonb;
  v_pre jsonb;
begin
  select * into s from platform.cutover_seam where seam_key = p_seam and retired_at is null;
  if s.seam_key is null then
    return jsonb_build_object('ready', false, 'checked_at', now(), 'checks', jsonb_build_array(
      jsonb_build_object('key', 'known', 'says', 'This switch exists', 'met', false,
                         'detail', format('There is no switch called %s.', p_seam))));
  end if;

  if s.press_kind = 'platform_switch' then
    return jsonb_build_object('ready', false, 'checked_at', now(), 'checks', jsonb_build_array(
      jsonb_build_object('key', 'pressed_here', 'says', 'Switched for one organization', 'met', false,
                         'detail', 'This one switches for everyone at once, in its own rehearsed step, not from an organization''s settings.')));
  elsif s.press_kind = 'already_switched' then
    return jsonb_build_object('ready', false, 'checked_at', now(), 'checks', jsonb_build_array(
      jsonb_build_object('key', 'already', 'says', 'Already on the new system', 'met', true,
                         'detail', s.flip_does)));
  end if;

  -- The Data tables switch (older_tables) and the scope switches were retired 2026-10-05: there is
  -- no older side left to measure, so only a seam's declared prerequisites are read here.
  for v_pre in select * from jsonb_array_elements(s.prerequisites) loop
    v_checks := v_checks || jsonb_build_object(
      'key', v_pre ->> 'key', 'says', v_pre ->> 'says',
      'met', coalesce((v_pre ->> 'met')::boolean, false),
      'detail', v_pre ->> 'evidence',
      'measured_at', v_pre ->> 'measured_at');
  end loop;

  return jsonb_build_object(
    'ready', not exists (select 1 from jsonb_array_elements(v_checks) c where not (c ->> 'met')::boolean),
    'checked_at', now(),
    'checks', v_checks);
end;
$function$;

-- 2. Reverse readiness: the older_tables carry-back plan is gone with its seam.
CREATE OR REPLACE FUNCTION platform._cutover_seam_reverse_readiness(p_seam text, p_org uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_last platform.cutover_seam_press;
begin
  v_last := platform._cutover_seam_last_done(p_seam, p_org);
  if p_seam <> 'scopes_screens' and (v_last.id is null or v_last.direction <> 'new') then
    return jsonb_build_object('ready', false, 'checked_at', now(), 'checks', jsonb_build_array(
      jsonb_build_object('key', 'on_new', 'says', 'This is on the new system', 'met', false,
                         'detail', 'There is nothing to switch back.')));
  end if;

  if p_seam = 'scopes_screens' then
    return jsonb_build_object('ready', true, 'checked_at', now(), 'checks', jsonb_build_array(
      jsonb_build_object('key', 'both_sides_equal', 'says', 'Both systems hold the same scopes at every save', 'met', true,
                         'detail', 'While the record store writes this organization''s scopes, the current context tables are written in the same step, so switching back loses nothing and the copy simply follows the current tables again.')));
  end if;

  return jsonb_build_object('ready', true, 'checked_at', now(), 'checks', jsonb_build_array(
    jsonb_build_object('key', 'nothing_written', 'says', 'Nothing is written on the new side of this switch', 'met', true,
                       'detail', 'Switching back leaves nothing behind.')));
end;
$function$;

-- 3. The press: the older_tables refusal and carry-back call are gone (a retired seam is refused as
--    unknown_switch before either could run). Everything else is byte-for-byte the prior behavior.
CREATE OR REPLACE FUNCTION platform.cutover_seam_press(p_seam_key text, p_organization_id uuid, p_to text, p_note text DEFAULT NULL::text, p_accept_not_carried boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  v_headers jsonb := nullif(current_setting('request.headers', true), '')::jsonb;
  v_role text;
  v_is_admin boolean;
  s platform.cutover_seam;
  v_last platform.cutover_seam_press;
  v_state text;
  v_back jsonb;
  v_ready jsonb;
  v_press uuid := gen_random_uuid();
  v_did jsonb;
  v_refusal text;
  v_says text;
  v_done text;
begin
  if p_organization_id is null or not exists (select 1 from iam.organizations o where o.id = p_organization_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_yours', 'says', 'There is no organization with that id that you belong to.');
  end if;

  if v_uid is null or v_claims is null then
    v_refusal := 'not_a_person';
    v_says := 'A switch is pressed by a person signed in on the organization''s settings page. A server, a script or a database connection cannot press it.';
  elsif coalesce(v_claims ->> 'role', '') <> 'authenticated' or coalesce(v_claims ->> 'session_id', '') = '' then
    v_refusal := 'not_a_person';
    v_says := 'A switch is pressed by a person signed in on the organization''s settings page, not with a service key or a minted token.';
  elsif v_headers is null or coalesce(v_headers ->> 'origin', '') = '' then
    v_refusal := 'not_from_the_screen';
    v_says := 'A switch is pressed from the organization''s settings page in a browser. This request did not come from a page.';
  end if;

  if v_refusal is null then
    v_is_admin := public.is_admin();
    select m.role into v_role from iam.organization_member m
     where m.organization_id = p_organization_id and m.user_id = v_uid;
    if v_role is null and not v_is_admin then
      return jsonb_build_object('ok', false, 'reason', 'not_yours', 'says', 'There is no organization with that id that you belong to.');
    end if;
    if v_role is distinct from 'owner' and not v_is_admin then
      v_refusal := 'not_an_owner';
      v_says := 'Only an owner of this organization can press this switch.';
    end if;
  end if;

  if v_refusal is null then
    select * into s from platform.cutover_seam where seam_key = p_seam_key and retired_at is null;
    if s.seam_key is null then
      return jsonb_build_object('ok', false, 'reason', 'unknown_switch', 'says', format('There is no switch called %s.', p_seam_key));
    elsif p_to is null or p_to not in ('new', 'old') then
      v_refusal := 'bad_direction';
      v_says := 'A switch goes to the new system or back to the old one.';
    elsif s.press_kind <> 'owner_press' then
      v_refusal := 'not_pressed_here';
      v_says := case s.press_kind when 'already_switched' then 'This one is already on the new system.'
                  else 'This one switches for everyone at once, in its own rehearsed step, not from an organization''s settings.' end;
    end if;
  end if;

  if v_refusal is null then
    perform pg_advisory_xact_lock(hashtextextended('cutover_seam:' || p_seam_key || ':' || p_organization_id::text, 0));
    v_last := platform._cutover_seam_last_done(p_seam_key, p_organization_id);
    v_state := coalesce(v_last.direction, 'old');
    if p_seam_key = 'scopes_screens' then
      v_state := 'new';
      if not v_is_admin then
        v_refusal := 'not_pressed_here';
        v_says := 'The scope and context screens switch for every organization at once, in the final switch. A platform admin can switch one organization to test it.';
      end if;
    end if;
    if v_refusal is not null then
      null;
    elsif v_state = p_to then
      v_refusal := 'already_there';
      v_says := case p_to when 'new' then 'This organization is already on the new system here.'
                          else 'This organization is already on the old system here.' end;
    elsif p_to = 'new' then
      v_ready := platform._cutover_seam_readiness(p_seam_key, p_organization_id);
      if not (v_ready ->> 'ready')::boolean then
        v_refusal := 'not_ready';
        v_says := 'Not ready yet: ' || (
          select string_agg(c ->> 'says' || ' — ' || rtrim(coalesce(c ->> 'detail', ''), '.'), '; ')
            from jsonb_array_elements(v_ready -> 'checks') c where not (c ->> 'met')::boolean) || '.';
      end if;
    else
      v_back := platform._cutover_seam_reverse_readiness(p_seam_key, p_organization_id);
      v_ready := v_back;
      if not (v_back ->> 'ready')::boolean then
        v_refusal := 'not_ready';
        v_says := 'Not ready to switch back: ' || (
          select string_agg(c ->> 'says' || ' — ' || rtrim(coalesce(c ->> 'detail', ''), '.'), '; ')
            from jsonb_array_elements(v_back -> 'checks') c where not (c ->> 'met')::boolean) || '.';
      elsif coalesce((v_back ->> 'needs_confirm')::boolean, false) and not coalesce(p_accept_not_carried, false) then
        v_refusal := 'confirm_not_carried';
        v_says := 'Switching back leaves these in the new system: '
          || (select string_agg(x, ' ') from jsonb_array_elements_text(v_back -> 'not_carried') x)
          || ' Confirm that they stay behind, then switch back.';
      end if;
    end if;
  end if;

  if v_refusal is not null then
    if p_seam_key in (select seam_key from platform.cutover_seam) then
      insert into platform.cutover_seam_press
        (id, seam_key, organization_id, direction, outcome, refusal, says, pressed_by, readiness, note)
      values
        (v_press, p_seam_key, p_organization_id,
         case when p_to in ('new', 'old') then p_to else 'new' end,
         'refused', v_refusal, v_says, v_uid, v_ready, p_note);
    end if;
    return jsonb_build_object('ok', false, 'reason', v_refusal, 'says', v_says, 'press_id', v_press, 'readiness', v_ready);
  end if;

  begin
    v_did := platform._cutover_seam_apply(p_seam_key, p_organization_id, p_to, v_uid, v_press);
  exception when others then
    v_refusal := 'the_step_failed';
    v_says := 'Nothing was changed: the switch stopped part way and was rolled back whole. ' || sqlerrm;
    insert into platform.cutover_seam_press
      (id, seam_key, organization_id, direction, outcome, refusal, says, pressed_by, readiness, note)
    values
      (v_press, p_seam_key, p_organization_id, p_to, 'refused', v_refusal, v_says, v_uid, v_ready, p_note);
    return jsonb_build_object('ok', false, 'reason', v_refusal, 'says', v_says, 'press_id', v_press);
  end;

  v_done := case p_to when 'new' then 'Switched to the new system.' else 'Switched back to the old system.' end;

  insert into platform.cutover_seam_press
    (id, seam_key, organization_id, direction, outcome, says, pressed_by, readiness, did, note)
  values
    (v_press, p_seam_key, p_organization_id, p_to, 'done', v_done, v_uid, v_ready, v_did, p_note);

  return jsonb_build_object('ok', true, 'press_id', v_press, 'state', p_to, 'did', v_did, 'says', v_done);
end;
$function$;

-- 4. The two functions only the retired older_tables switch reached.
drop function platform._cutover_carry_back(uuid, platform.cutover_seam_press, boolean, uuid, uuid, boolean);
drop function platform.cutover_copy_differences(uuid);
