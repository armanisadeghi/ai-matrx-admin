-- chair-step: the inverse of booking_notify_g — restores part d's text-reminder producer (texts carry no payer and are not charged).
-- lane: BOOKING-NOTIFY
-- lock: custom,communication

set local lock_timeout = '2s';
set local statement_timeout = '60s';

CREATE OR REPLACE FUNCTION custom._booking_sms_reminders(p_organization_id uuid, p_form_id uuid, p_record_id uuid, p_submission_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_f     custom.anon_form;
  v_s     custom.anon_submission;
  v_doc   jsonb;
  v_b     jsonb;
  v_m     jsonb;
  v_phone text;
  v_slot  text;
  v_at    timestamptz;
  v_tz    text;
  v_title text;
  v_off   numeric;
  v_when  timestamptz;
  v_in    text;
  v_key   text;
  v_n     integer := 0;
begin
  select * into v_f from custom.anon_form where organization_id = p_organization_id and id = p_form_id and deleted_at is null;
  select * into v_s from custom.anon_submission where organization_id = p_organization_id and id = p_submission_id;
  if v_f.id is null or v_s.id is null or v_s.booking_ref is null then return 0; end if;
  v_m := coalesce(v_f.presentation -> 'booking_messages', '{}'::jsonb);
  v_phone := v_s.metadata #>> '{sms_consent,phone}';
  -- NO CONSENT, NO TEXT. The page must still offer texts, reminders must be on, and the number must not have opted out since.
  if v_phone is null
     or coalesce((v_m #>> '{sms,on}')::boolean, false) is not true
     or coalesce((v_m #>> '{reminders,on}')::boolean, true) is not true
     or exists (select 1 from communication.sms_consent c
                 where c.phone_number = v_phone and c.status = 'opted_out' and c.deleted_at is null
                   and c.consent_type in ('all', 'notifications')
                   and (c.organization_id = p_organization_id or c.organization_id is null)) then
    return 0;
  end if;
  v_b := v_f.presentation -> 'booking';
  select r.data into v_doc from custom.record r
   where r.organization_id = p_organization_id and r.id = p_record_id and r.deleted_at is null;
  v_slot := v_doc ->> 'slot';
  if v_slot is null or coalesce(v_doc ->> 'status', 'booked') = 'cancelled' then return 0; end if;
  v_at := v_slot::timestamptz;
  v_tz := coalesce(nullif(v_b ->> 'timezone', ''), 'UTC');
  v_title := coalesce(nullif(btrim(v_f.title), ''), 'your appointment');

  for v_off in
    select distinct o::numeric from jsonb_array_elements_text(
      case when jsonb_typeof(v_m #> '{reminders,offsets}') = 'array' and jsonb_array_length(v_m #> '{reminders,offsets}') > 0
           then v_m #> '{reminders,offsets}' else '[1440, 60]'::jsonb end) o
     where o ~ '^[0-9]+$' and o::numeric > 0
  loop
    v_when := v_at - make_interval(mins => v_off::integer);
    continue when v_when <= now();
    v_in := case when v_off::integer % 1440 = 0 then
                   format('%s day%s', v_off::integer / 1440, case when v_off::integer / 1440 = 1 then '' else 's' end)
                 when v_off::integer % 60 = 0 then
                   format('%s hour%s', v_off::integer / 60, case when v_off::integer / 60 = 1 then '' else 's' end)
                 else format('%s minutes', v_off::integer) end;
    v_key := format('booking:%s:remind:%s:%s', v_s.booking_ref, v_off::integer, v_slot);
    perform communication.notify_from_sql(
      p_organization_id, 'custom.booking.booker_reminder_sms', null, v_phone, null,
      jsonb_build_object('notice', jsonb_build_object('subject', 'Reminder',
        'body', format('%s: reminder, your visit is in %s (%s %s). Reply STOP to opt out.', left(v_title, 40), v_in,
                       to_char(v_at at time zone v_tz, 'FMMon FMDD, FMHH12:MIam'), v_tz)),
        'booking', jsonb_build_object('ref', v_s.booking_ref, 'form_id', v_f.id, 'slot', v_slot, 'minutes_before', v_off::integer)),
      '/b/manage/' || v_s.booking_ref, 'custom.record', p_record_id, v_key, '{}'::jsonb);
    update communication.notification n
       set next_attempt_at = v_when,
           metadata = coalesce(n.metadata, '{}'::jsonb) || jsonb_build_object('still_due', jsonb_build_object(
             'guard', 'communication.still_due_booking',
             'args', jsonb_build_object('record_id', p_record_id, 'slot', v_slot, 'booking_ref', v_s.booking_ref)))
     where n.organization_id = p_organization_id and n.dedupe_key = v_key || ':sms'
       and n.status in ('render_pending', 'pending');
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$function$;
