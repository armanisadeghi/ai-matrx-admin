-- chair-step: the inverse of booking_notify_e_consent_uses_the_web_form_method.sql — restores part d's consent door body (which the sms_consent check refuses).
-- lane: BOOKING-NOTIFY
-- lock: custom,communication

set local lock_timeout = '2s';
set local statement_timeout = '60s';

CREATE OR REPLACE FUNCTION custom.booking_sms_consent(p_booking_ref text, p_phone text, p_text_shown text, p_origin text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_s     custom.anon_submission;
  v_f     custom.anon_form;
  v_phone text;
  v_prior text;
  v_queued integer;
begin
  if p_booking_ref is null then
    raise exception 'That link does not name an appointment.' using errcode = '23503';
  end if;
  select * into v_s from custom.anon_submission sub where sub.booking_ref = p_booking_ref;
  if not found then
    raise exception 'That link does not name an appointment.' using errcode = '23503';
  end if;
  perform custom.assert_store_door(v_s.organization_id, 'custom.booking_sms_consent');
  select * into v_f from custom.anon_form where organization_id = v_s.organization_id and id = v_s.form_id and deleted_at is null;
  if v_f.id is null or coalesce((v_f.presentation #>> '{booking_messages,sms,on}')::boolean, false) is not true then
    raise exception 'This booking page does not offer text reminders.' using errcode = '22023';
  end if;
  if btrim(coalesce(p_text_shown, '')) = '' then
    raise exception 'Consent has to record the words the person was shown.' using errcode = '22023';
  end if;
  v_phone := crm.normalize_phone_e164(p_phone);
  if v_phone is null then
    raise exception 'That does not look like a phone number.' using errcode = '22023',
          hint = 'Include the area code, for example +1 949 555 0100.';
  end if;

  select c.status into v_prior from communication.sms_consent c
   where c.organization_id = v_s.organization_id and c.phone_number = v_phone and c.consent_type = 'notifications';
  if v_prior = 'opted_out' then
    -- STOP STANDS. Ticking a box on a booking page does not undo a person's own opt-out.
    return jsonb_build_object('recorded', false, 'why', 'opted_out',
      'say', 'This number asked to stop receiving texts from this business, so no texts were set up. Reply START to turn them back on.');
  end if;

  insert into communication.sms_consent
    (phone_number, consent_type, status, opted_in_at, opt_in_method, ip_address, metadata, organization_id)
  values
    (v_phone, 'notifications', 'opted_in', now(), 'booking_page', null,
     jsonb_build_object('booking_ref', p_booking_ref, 'form_id', v_f.id, 'text_shown', p_text_shown, 'origin', p_origin),
     v_s.organization_id)
  on conflict (organization_id, phone_number, consent_type) do update
     set status = 'opted_in', opted_in_at = now(), opt_in_method = 'booking_page', deleted_at = null,
         metadata = coalesce(communication.sms_consent.metadata, '{}'::jsonb) || excluded.metadata, updated_at = now();

  update custom.anon_submission
     set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('sms_consent', jsonb_build_object(
           'phone', v_phone, 'text_shown', p_text_shown, 'at', now(), 'origin', p_origin))
   where organization_id = v_s.organization_id and id = v_s.id;

  v_queued := custom._booking_sms_reminders(v_s.organization_id, v_f.id, v_s.record_id, v_s.id);
  return jsonb_build_object('recorded', true, 'queued', v_queued);
end;
$function$;
