-- based-on: custom._booking_messages(uuid, uuid, uuid, uuid, text) 5d04345ebca694c99f9a30fc26329e3eb5e241961751caec3d1c9404d537ec35
-- lane: BOOKING-NOTIFY
-- lock: custom,communication
--
-- BOOKING-NOTIFY part b — THE HOST'S EMAIL HAD NO ADDRESS. Measured live 2026-10-17: the host's
-- `custom.booking.made` email row was `skipped / no_contact_point` while the DM and in-app rows
-- were delivered. `communication.notify_from_sql` resolves an email from the LITERAL address it is
-- handed (it has no user lookup), and the producer handed it none for a user recipient. The host's
-- own account address is now passed, so the email queues like the booker's.
set local lock_timeout = '2s';
set local statement_timeout = '60s';

CREATE OR REPLACE FUNCTION custom._booking_messages(p_organization_id uuid, p_form_id uuid, p_record_id uuid, p_submission_id uuid, p_event text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_f      custom.anon_form;
  v_s      custom.anon_submission;
  v_doc    jsonb;
  v_m      jsonb;
  v_sec    jsonb;
  v_b      jsonb;
  v_slot   text;
  v_at     timestamptz;
  v_end    timestamptz;
  v_ptz    text;
  v_btz    text;
  v_title  text;
  v_ref    text;
  v_to     text;
  v_name   text;
  v_key    text;
  v_event  text;
  v_secname text;
  v_tok    jsonb;
  v_subject text;
  v_body   text;
  v_ics    text;
  v_dkey   text;
  v_deep   text;
  v_res    jsonb;
  v_out    jsonb := '{}'::jsonb;
  v_off    numeric;
  v_when   timestamptz;
  v_in     text;
  v_host   uuid;
  v_gcal   text;
  v_outl   text;
  v_desc   text;
  v_rows   integer;
  v_seq    integer;
begin
  select * into v_f from custom.anon_form
   where organization_id = p_organization_id and id = p_form_id and deleted_at is null;
  select * into v_s from custom.anon_submission
   where organization_id = p_organization_id and id = p_submission_id;
  if v_f.id is null or v_s.id is null or v_s.booking_ref is null then
    return jsonb_build_object('skipped', 'not_a_booking');
  end if;
  v_ref := v_s.booking_ref;
  v_b := v_f.presentation -> 'booking';
  v_m := coalesce(v_f.presentation -> 'booking_messages', '{}'::jsonb);
  v_title := coalesce(nullif(btrim(v_f.title), ''), 'your appointment');

  select r.data into v_doc from custom.record r
   where r.organization_id = p_organization_id and r.id = p_record_id and r.deleted_at is null;
  v_slot := v_doc ->> 'slot';
  if v_slot is null then
    return jsonb_build_object('skipped', 'no_time');
  end if;
  v_at := v_slot::timestamptz;
  v_end := v_at + make_interval(mins => coalesce((v_b ->> 'slot_minutes')::integer, 30));

  v_ptz := coalesce(nullif(v_b ->> 'timezone', ''), 'UTC');
  select z.name into v_btz from pg_catalog.pg_timezone_names z
   where z.name = nullif(v_s.metadata ->> 'respondent_time_zone', '') limit 1;
  v_btz := coalesce(v_btz, v_ptz);

  -- WHO BOOKED: the page's named answers, else found by their shape — an address looks like one.
  v_key := nullif(btrim(coalesce(v_m ->> 'email_field', '')), '');
  if v_key is not null then
    v_to := nullif(btrim(coalesce(v_s.payload ->> v_key, '')), '');
  end if;
  if v_to is null then
    select a.value into v_to
      from jsonb_each_text(coalesce(v_s.payload, '{}'::jsonb)) a
     where a.value ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     order by (a.key ilike '%mail%') desc, a.key limit 1;
  end if;
  v_key := nullif(btrim(coalesce(v_m ->> 'name_field', '')), '');
  if v_key is not null then
    v_name := nullif(btrim(coalesce(v_s.payload ->> v_key, '')), '');
  end if;
  if v_name is null then
    select a.value into v_name
      from jsonb_each_text(coalesce(v_s.payload, '{}'::jsonb)) a
     where a.key in ('name', 'full_name', 'your_name', 'first_name') and btrim(a.value) <> ''
     order by array_position(array['name', 'full_name', 'your_name', 'first_name'], a.key) limit 1;
  end if;
  v_name := coalesce(v_name, 'there');

  v_desc := format('%s with %s', v_title, v_name);
  v_gcal := 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' || custom._booking_urlenc(v_title)
         || '&dates=' || to_char(v_at at time zone 'utc', 'YYYYMMDD"T"HH24MISS"Z"') || '/'
         || to_char(v_end at time zone 'utc', 'YYYYMMDD"T"HH24MISS"Z"')
         || '&details=' || custom._booking_urlenc(v_desc);
  v_outl := 'https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject='
         || custom._booking_urlenc(v_title)
         || '&startdt=' || custom._booking_urlenc(to_char(v_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
         || '&enddt=' || custom._booking_urlenc(to_char(v_end at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
         || '&body=' || custom._booking_urlenc(v_desc);

  v_tok := jsonb_build_object(
    'booker.name', v_name,
    'booker.email', coalesce(v_to, ''),
    'title', v_title,
    'time', to_char(v_at at time zone v_btz, 'FMDay, FMMonth FMDD at FMHH12:MIam') || ' (' || v_btz || ')',
    'short_time', to_char(v_at at time zone v_btz, 'FMMon FMDD, FMHH12:MIam'),
    'date', to_char(v_at at time zone v_btz, 'FMDay, FMMonth FMDD'),
    'timezone', v_btz,
    'starts_in', '',
    'calendar.google', v_gcal,
    'calendar.outlook', v_outl);

  -- ── a move or a cancel ends every reminder still waiting for the old time ────────────────
  if p_event in ('moved', 'cancelled') then
    update communication.notification n
       set status = 'skipped', error_code = 'booking_changed',
           error_message = 'The appointment was moved or cancelled before this reminder was due, so it was not sent.',
           claimed_by = null, lease_expires_at = null, updated_at = now()
     where n.organization_id = p_organization_id
       and n.dedupe_key like 'booking:' || v_ref || ':remind:%'
       and n.status in ('render_pending', 'render_in_progress', 'pending');
    get diagnostics v_rows = row_count;
    v_out := v_out || jsonb_build_object('reminders_ended', v_rows);
  end if;

  -- ── THE BOOKER ───────────────────────────────────────────────────────────────────────────
  v_event := case p_event when 'booked' then 'custom.booking.booker_confirmed'
                          when 'moved' then 'custom.booking.booker_moved'
                          else 'custom.booking.booker_cancelled' end;
  v_secname := case p_event when 'booked' then 'confirmation' when 'moved' then 'changed' else 'cancelled' end;
  v_sec := coalesce(v_m -> v_secname, '{}'::jsonb);
  if v_to is null then
    v_out := v_out || jsonb_build_object('booker', 'no_email_answer');
  elsif coalesce((v_sec ->> 'on')::boolean, true) then
    v_subject := custom._booking_fill(coalesce(nullif(btrim(v_sec ->> 'subject'), ''),
      case p_event when 'booked' then 'You''re booked: {{title}}, {{short_time}}'
                   when 'moved' then 'Moved: {{title}} is now {{short_time}}'
                   else 'Cancelled: {{title}}, {{short_time}}' end), v_tok);
    v_body := custom._booking_fill(coalesce(nullif(btrim(v_sec ->> 'body'), ''),
      case p_event
        when 'booked' then E'Hi {{booker.name}},\n\nYou''re booked: {{title}} on {{time}}.\n\nAdd it to your calendar:\nGoogle: {{calendar.google}}\nOutlook: {{calendar.outlook}}\nA calendar file is attached for Apple Calendar and others.'
        when 'moved' then E'Hi {{booker.name}},\n\nYour {{title}} was moved. It is now {{time}}.\n\nAdd the new time to your calendar:\nGoogle: {{calendar.google}}\nOutlook: {{calendar.outlook}}\nAn updated calendar file is attached.'
        else E'Hi {{booker.name}},\n\nYour {{title}} on {{time}} is cancelled, and that time is free again.' end), v_tok);
    v_dkey := case p_event when 'booked' then format('booking:%s:confirmed', v_ref)
                           when 'moved' then format('booking:%s:moved:%s', v_ref, v_slot)
                           else format('booking:%s:cancelled', v_ref) end;
    v_deep := case p_event when 'cancelled' then '/b/' || v_f.id::text else '/b/manage/' || v_ref end;
    v_res := communication.notify_from_sql(
      p_organization_id, v_event, null, v_to, v_name,
      jsonb_build_object('notice', jsonb_build_object('subject', v_subject, 'body', v_body),
                         'booking', jsonb_build_object('ref', v_ref, 'form_id', v_f.id, 'slot', v_slot)),
      v_deep, 'custom.record', p_record_id, v_dkey, '{}'::jsonb);
    v_out := v_out || jsonb_build_object('booker', v_res);

    -- THE CALENDAR FILE rides the email row itself (metadata.email_attachments — what notify()
    -- does for an invitation), so a retry sends the same bytes.
    v_seq := case p_event when 'booked' then 0 else least(2000000000, floor(extract(epoch from now()))::integer) end;
    v_ics := custom._booking_ics('booking-' || v_ref || '@aimatrx.com', v_title, v_desc, v_at, v_end,
                                 case when p_event = 'cancelled' then 'CANCEL' else 'PUBLISH' end, v_seq);
    update communication.notification n
       set metadata = coalesce(n.metadata, '{}'::jsonb) || jsonb_build_object('email_attachments', jsonb_build_array(
             jsonb_build_object('filename', 'appointment.ics',
                                'content_type', 'text/calendar; charset=utf-8',
                                'content_base64', replace(encode(convert_to(v_ics, 'UTF8'), 'base64'), E'\n', ''))))
     where n.organization_id = p_organization_id and n.dedupe_key = v_dkey || ':email';
  else
    v_out := v_out || jsonb_build_object('booker', 'switched_off');
  end if;

  -- ── THE REMINDERS: one durable row per offset, due at start minus the offset ─────────────────
  v_sec := coalesce(v_m -> 'reminders', '{}'::jsonb);
  if p_event in ('booked', 'moved') and v_to is not null and coalesce((v_sec ->> 'on')::boolean, true) then
    for v_off in
      select distinct o::numeric from jsonb_array_elements_text(
        case when jsonb_typeof(v_sec -> 'offsets') = 'array' and jsonb_array_length(v_sec -> 'offsets') > 0
             then v_sec -> 'offsets' else '[1440, 60]'::jsonb end) o
       where o ~ '^[0-9]+$' and o::numeric > 0
    loop
      v_when := v_at - make_interval(mins => v_off::integer);
      continue when v_when <= now();   -- already inside that window: nothing to remind
      v_in := case when v_off::integer % 1440 = 0 then
                     format('%s day%s', v_off::integer / 1440, case when v_off::integer / 1440 = 1 then '' else 's' end)
                   when v_off::integer % 60 = 0 then
                     format('%s hour%s', v_off::integer / 60, case when v_off::integer / 60 = 1 then '' else 's' end)
                   else format('%s minutes', v_off::integer) end;
      v_tok := v_tok || jsonb_build_object('starts_in', 'in ' || v_in);
      v_subject := custom._booking_fill(coalesce(nullif(btrim(v_sec ->> 'subject'), ''),
                     'Reminder: {{title}} {{starts_in}}'), v_tok);
      v_body := custom._booking_fill(coalesce(nullif(btrim(v_sec ->> 'body'), ''),
                  E'Hi {{booker.name}},\n\nA reminder that your {{title}} starts {{starts_in}}: {{time}}.'), v_tok);
      v_dkey := format('booking:%s:remind:%s:%s', v_ref, v_off::integer, v_slot);
      v_res := communication.notify_from_sql(
        p_organization_id, 'custom.booking.booker_reminder', null, v_to, v_name,
        jsonb_build_object('notice', jsonb_build_object('subject', v_subject, 'body', v_body),
                           'booking', jsonb_build_object('ref', v_ref, 'form_id', v_f.id, 'slot', v_slot,
                                                         'minutes_before', v_off::integer)),
        '/b/manage/' || v_ref, 'custom.record', p_record_id, v_dkey, '{}'::jsonb);
      update communication.notification n
         set next_attempt_at = v_when
       where n.organization_id = p_organization_id and n.dedupe_key = v_dkey || ':email'
         and n.status in ('render_pending', 'pending');
      v_out := v_out || jsonb_build_object('reminder_' || v_off::integer, v_when);
    end loop;
  end if;

  -- ── THE HOST — unless the page's own notify Rule already tells its subscribers ──────────────
  if v_f.notify_rule_id is null and coalesce((v_m #>> '{host,on}')::boolean, true) then
    v_host := coalesce(nullif(v_doc ->> 'booked_with', '')::uuid, v_f.published_by);
    if v_host is not null then
      v_subject := case p_event when 'booked' then format('New booking: %s', v_title)
                                when 'moved' then format('Moved: %s', v_title)
                                else format('Cancelled: %s', v_title) end;
      v_body := case p_event
        when 'booked' then format('%s booked %s for %s.', v_name || coalesce(' (' || v_to || ')', ''), v_title,
                                  to_char(v_at at time zone v_ptz, 'FMDay, FMMonth FMDD at FMHH12:MIam') || ' (' || v_ptz || ')')
        when 'moved' then format('%s moved %s to %s.', v_name || coalesce(' (' || v_to || ')', ''), v_title,
                                 to_char(v_at at time zone v_ptz, 'FMDay, FMMonth FMDD at FMHH12:MIam') || ' (' || v_ptz || ')')
        else format('%s cancelled %s on %s. That time is free again.', v_name || coalesce(' (' || v_to || ')', ''), v_title,
                    to_char(v_at at time zone v_ptz, 'FMDay, FMMonth FMDD at FMHH12:MIam') || ' (' || v_ptz || ')') end;
      v_res := communication.notify_from_sql(
        p_organization_id, 'custom.booking.made', v_host,
        (select u.email from auth.users u where u.id = v_host), null,
        jsonb_build_object('notice', jsonb_build_object('subject', v_subject, 'body', v_body),
                           'booking', jsonb_build_object('ref', v_ref, 'form_id', v_f.id, 'slot', v_slot,
                                                         'event', p_event)),
        '/o/' || p_record_id::text, 'custom.record', p_record_id,
        format('booking:%s:host:%s:%s', v_ref, p_event, v_slot), '{}'::jsonb);
      v_out := v_out || jsonb_build_object('host', v_res);
    end if;
  end if;

  return v_out;
end;
$function$;
