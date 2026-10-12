-- THE CORRECTION DOORS HASH ACCESS CODES WITH THE ONE HASH FUNCTION (bcrypt, salted per set).
-- esign_add_recipient and esign_correct_recipient wrote unsalted sha256; esign._access_code_hash is the only writer now.
-- based-on: esign.esign_add_recipient(uuid, text, text, text, integer, text, text, uuid) 61e0458ccdfeaaaf4163dd9c509adda56f35d671455ee2644fe3b391fe92754b
-- based-on: esign.esign_correct_recipient(uuid, jsonb) b16ea1a0dc6a8aa9119c5783828376d9e4198165a35991eada669c1902453c95

CREATE OR REPLACE FUNCTION esign.esign_add_recipient(p_envelope_id uuid, p_full_name text, p_email text, p_role text, p_position integer, p_verification text, p_access_code text, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'esign', 'public'
AS $function$
declare e esign.envelope%rowtype; v_key text := 'added-' || gen_random_uuid()::text; v_id uuid; v_code text;
        v_factor text; v_internal boolean := p_user_id is not null; v_pos int; v_taken int; r record; v_notified int;
begin
  select * into e from esign.envelope where id = p_envelope_id for update;
  if not found then return jsonb_build_object('granted', false, 'reason', 'unknown_envelope'); end if;
  if e.status not in ('sent', 'in_progress') then return jsonb_build_object('granted', false, 'reason', 'envelope_' || e.status); end if;
  if nullif(btrim(coalesce(p_full_name, '')), '') is null then return jsonb_build_object('granted', false, 'reason', 'name_required'); end if;
  if lower(btrim(coalesce(p_email, ''))) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('granted', false, 'reason', 'email_invalid'); end if;
  if coalesce(p_role, 'signer') not in ('signer', 'cc_recipient', 'viewer', 'approver') then
    return jsonb_build_object('granted', false, 'reason', 'role_invalid');
  end if;
  v_code := nullif(btrim(coalesce(p_access_code, '')), '');
  v_factor := case when v_internal then null when p_verification = 'none' then 'none'
                   when p_verification = 'access_code' and v_code is not null then 'access_code' else 'email_code' end;
  if p_verification = 'access_code' and v_code is null and not v_internal then return jsonb_build_object('granted', false, 'reason', 'access_code_needed'); end if;
  if v_code is not null and (length(v_code) < 4 or length(v_code) > 20) then
    return jsonb_build_object('granted', false, 'reason', case when length(v_code) < 4 then 'code_too_short' else 'code_too_long' end);
  end if;
  v_pos := case when e.signing_order = 'sequential' then greatest(coalesce(p_position, 1), 1) else 1 end;
  if e.signing_order = 'sequential' and coalesce(p_role, 'signer') <> 'cc_recipient' then
    select count(*) into v_taken from esign.envelope_signer b where b.envelope_id = e.id and b.position = v_pos
       and b.role <> 'cc_recipient' and esign.recipient_lock(b.id) is not null;
    if v_taken > 0 then return jsonb_build_object('granted', false, 'reason', 'position_held_by_acted'); end if;
    for r in select b.id from esign.envelope_signer b where b.envelope_id = e.id and b.position >= v_pos
              and b.role <> 'cc_recipient' and esign.recipient_lock(b.id) is null order by b.position desc loop
      update esign.envelope_signer set position = position + 1 where id = r.id;
    end loop;
  end if;
  if v_code is not null then
    update esign.envelope_draft set access_code_hashes = access_code_hashes || jsonb_build_object(v_key,
           esign._access_code_hash(v_code)) where envelope_id = e.id;
  end if;
  insert into esign.envelope_signer (organization_id, envelope_id, position, role, actor_type, signer_user_id, full_name, email,
      auth_method, is_required, verification_factor, color_index, metadata)
  values (e.organization_id, e.id, v_pos, coalesce(p_role, 'signer'), case when v_internal then 'internal_user' else 'external' end,
      p_user_id, btrim(p_full_name), lower(btrim(p_email)), case when v_internal then 'session' else 'token_link' end,
      coalesce(p_role, 'signer') <> 'cc_recipient', v_factor,
      (select coalesce(max(color_index), -1) + 1 from esign.envelope_signer where envelope_id = e.id),
      jsonb_build_object('recipient_key', v_key, 'added_after_send', true))
  returning id into v_id;
  perform esign._event(e.id, 'signer_added', esign._requester_actor_type(e.consumer_key),
    p_signer_id => v_id, p_actor_user_id => auth.uid(), p_actor_label => esign._direct_writer_label(),
    p_payload => jsonb_build_object('full_name', btrim(p_full_name), 'email', lower(btrim(p_email)), 'role', coalesce(p_role, 'signer'),
                                    'order', v_pos, 'actor_type', case when v_internal then 'internal_user' else 'external' end,
                                    'verification_factor', v_factor));
  v_notified := esign._notify_actionable(e.id, 'esign.signature_requested');   -- tells whoever has not been told and can act now
  return jsonb_build_object('granted', true, 'signer_id', v_id, 'notified', v_notified);
end $function$;

CREATE OR REPLACE FUNCTION esign.esign_correct_recipient(p_signer_id uuid, p_changes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'esign', 'public'
AS $function$
declare s esign.envelope_signer%rowtype; e esign.envelope%rowtype; v_key text; v_factor text; v_email text;
        v_name text; v_pos int; v_code text; v_relink boolean := false; v_hash text; v_has_hash boolean;
        v_taken int; r record; v_res jsonb;
begin
  select * into s from esign.envelope_signer where id = p_signer_id;
  if not found then return jsonb_build_object('granted', false, 'reason', 'unknown_signer'); end if;
  select * into e from esign.envelope where id = s.envelope_id;
  if e.status not in ('sent', 'in_progress') then
    return jsonb_build_object('granted', false, 'reason', 'envelope_' || e.status);
  end if;
  if esign.recipient_lock(s.id) is not null then
    return jsonb_build_object('granted', false, 'reason', 'recipient_locked', 'state', esign.recipient_lock(s.id), 'signer_id', s.id);
  end if;
  v_key := s.metadata ->> 'recipient_key';
  v_name := coalesce(nullif(btrim(p_changes ->> 'full_name'), ''), s.full_name);
  v_email := lower(coalesce(nullif(btrim(p_changes ->> 'email'), ''), s.email));
  v_code := nullif(btrim(coalesce(p_changes ->> 'access_code', '')), '');
  v_pos := coalesce((p_changes ->> 'position')::int, s.position);
  if s.actor_type <> 'external' and (v_name is distinct from s.full_name or v_email is distinct from s.email
       or p_changes ? 'verification' or v_code is not null) then
    return jsonb_build_object('granted', false, 'reason', 'internal_recipient_only_order');
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('granted', false, 'reason', 'email_invalid'); end if;
  v_factor := coalesce(p_changes ->> 'verification', case s.verification_factor when 'access_code' then 'access_code'
                       when 'none' then 'none' else 'email_code' end);
  if v_factor not in ('none', 'email_code', 'access_code') then return jsonb_build_object('granted', false, 'reason', 'verification_invalid'); end if;
  if v_code is not null and (length(v_code) < 4 or length(v_code) > 20) then
    return jsonb_build_object('granted', false, 'reason', case when length(v_code) < 4 then 'code_too_short' else 'code_too_long' end);
  end if;
  select coalesce(d.access_code_hashes ? v_key, false) into v_has_hash from esign.envelope_draft d where d.envelope_id = e.id;
  if v_factor = 'access_code' and v_code is null and not coalesce(v_has_hash, false) then
    return jsonb_build_object('granted', false, 'reason', 'access_code_needed');
  end if;
  if v_pos < 1 then return jsonb_build_object('granted', false, 'reason', 'position_invalid'); end if;

  if v_pos is distinct from s.position and e.signing_order = 'sequential' and s.role <> 'cc_recipient' then
    -- A step held by someone who has acted cannot be shared or shifted.
    select count(*) into v_taken from esign.envelope_signer b
     where b.envelope_id = e.id and b.id <> s.id and b.position = v_pos and b.role <> 'cc_recipient'
       and esign.recipient_lock(b.id) is not null;
    if v_taken > 0 then return jsonb_build_object('granted', false, 'reason', 'position_held_by_acted'); end if;
    -- Park the mover on a free step, so the shift below never ties with it at any moment.
    update esign.envelope_signer set position = (select max(position) + 1000 from esign.envelope_signer where envelope_id = e.id) where id = s.id;
    -- Everyone unacted at or after the new step moves one step later (highest first, no ties at any moment).
    for r in select b.id from esign.envelope_signer b
              where b.envelope_id = e.id and b.id <> s.id and b.position >= v_pos and b.position < 1000 and b.role <> 'cc_recipient'
                and esign.recipient_lock(b.id) is null order by b.position desc loop
      update esign.envelope_signer set position = position + 1 where id = r.id;
    end loop;
    update esign.envelope_signer set position = v_pos where id = s.id;
  end if;

  if v_name is distinct from s.full_name or v_email is distinct from s.email
     or v_factor is distinct from coalesce(s.verification_factor, 'email_code') and s.actor_type = 'external' then
    update esign.envelope_signer
       set full_name = v_name, email = v_email,
           verification_factor = case when s.actor_type = 'external' then v_factor else verification_factor end
     where id = s.id;                       -- the row trigger writes `signer_record_changed` with before/after
    v_relink := s.actor_type = 'external';
  end if;
  if v_code is not null then
    update esign.envelope_draft set access_code_hashes = access_code_hashes || jsonb_build_object(v_key,
           esign._access_code_hash(v_code)) where envelope_id = e.id;
    perform esign._event(e.id, 'signer_record_changed', esign._requester_actor_type(e.consumer_key),
      p_signer_id => s.id, p_actor_user_id => auth.uid(), p_actor_label => esign._direct_writer_label(),
      p_payload => jsonb_build_object('changed', jsonb_build_array('access_code'), 'had_signed', false));  -- never the code
    v_relink := s.actor_type = 'external';
  end if;
  if v_relink then
    perform esign.retire_signer_link(s.id);   -- the old link dies; the resend mints one with the new proof
    v_res := public.esign_resend_signer(s.id, null);
    return jsonb_build_object('granted', true, 'signer_id', s.id, 'link_sent', coalesce((v_res ->> 'granted')::boolean, false),
                              'waiting', v_res ->> 'reason' = 'waiting_on_earlier_position');
  end if;
  return jsonb_build_object('granted', true, 'signer_id', s.id, 'link_sent', false);
end $function$;

