-- based-on: custom.booking_confirm(uuid, uuid, text, jsonb, text, text, text) 4547bd454a22894579a901abaa4ce0253522c8564ca37ba942f3367825fd8e77
-- based-on: custom.booking_reschedule(text, text, text, text) c5e78ee4678d89cd41aeefb93490ddf9d8416949b36b938e1d2772b7fb9d13bf
-- based-on: custom.booking_cancel(text, text) c43f4e3df2bdc28758d0a72c33ac63d357cc56380645f84125196865a8813b86
-- lane: BOOKING-NOTIFY
-- lock: custom,communication
--
-- LANE BOOKING-NOTIFY — A BOOKING PAGE TELLS PEOPLE WHAT HAPPENED (Calendly's confirmation,
-- reminder and reschedule/cancel emails).
--
-- Before this file a booker was never emailed: the page said the time on screen and nothing
-- else, there was no reminder sender anywhere, and the host heard only if the owner had wired
-- a notify Rule by hand. This file adds ONE producer, `custom.booking_messages`, called by the
-- three booking doors (confirm, reschedule, cancel) inside the same transaction:
--
--   * the BOOKER gets an email through the platform's one SQL producer
--     (`communication.notify_from_sql`, recipient kind `address`) — confirmation with an .ics
--     attached and add-to-calendar links, a moved notice with the updated .ics, a cancelled
--     notice with a CANCEL .ics that removes it from their calendar;
--   * REMINDERS are the same producer with `next_attempt_at` set to the offset before the
--     appointment — a per-booking durable row the dispatcher claims when it is due. NO cron,
--     NO schedule, NO sweep of bookings: the notification table already is the delayed-job
--     queue (the e-sign reminder uses the same word). A move or a cancel marks the booking's
--     pending reminders `skipped` (`booking_changed`) and a move queues fresh ones;
--   * the HOST (the member booked with, else the person who published the page) is told
--     through the existing `custom.booking.made` event — unless the page already has a notify
--     Rule, which keeps telling its subscribers exactly as before.
--
-- KNOBS, all on by default, in `presentation.booking_messages` on the page (a page that never
-- set any behaves as the defaults below):
--   confirmation / changed / cancelled : {on, subject, body}
--   reminders                          : {on, offsets: [minutes before], subject, body}  (24h, 1h)
--   host                               : {on}
--   email_field / name_field           : which answers are the booker's address and name
--                                        (found by shape when unset)
-- Words may use {{booker.name}} {{booker.email}} {{title}} {{time}} {{short_time}} {{date}}
-- {{timezone}} {{starts_in}} {{calendar.google}} {{calendar.outlook}}; anything else in double
-- braces is dropped, never sent.
--
-- A FAILURE HERE NEVER UNDOES A BOOKING and is never silent: it is filed to ops.system_error
-- (`booking_messages_not_queued`) and raised as a WARNING.

set local lock_timeout = '2s';
set local statement_timeout = '60s';

-- ── the four notices a booker can get, born ON ────────────────────────────────────────────
do $events$
declare
  r record;
begin
  for r in select * from (values
    ('custom.booking.booker_confirmed', 'Your booking is confirmed',
     'The person who booked a time gets a confirmation email with a calendar file.',
     E'{{notice.body}}\n\n--\nNeed to change plans? Reschedule or cancel here: {{link.deep}}\nYou are getting this because you booked a time.'),
    ('custom.booking.booker_reminder', 'A reminder of your booking',
     'The person who booked a time gets a reminder email before it starts.',
     E'{{notice.body}}\n\n--\nNeed to change plans? Reschedule or cancel here: {{link.deep}}\nYou are getting this because you booked a time.'),
    ('custom.booking.booker_moved', 'Your booking was moved',
     'The person who booked a time is told the new time, with an updated calendar file.',
     E'{{notice.body}}\n\n--\nNeed to change plans again? Reschedule or cancel here: {{link.deep}}\nYou are getting this because you booked a time.'),
    ('custom.booking.booker_cancelled', 'Your booking was cancelled',
     'The person who booked a time is told it is cancelled, with a calendar file that removes it.',
     E'{{notice.body}}\n\n--\nWant a new time? Book again here: {{link.deep}}\nYou are getting this because you booked a time.')
  ) as v(event_key, label, descr, body) loop
    insert into communication.notification_event_type
      (event_key, label, description, default_channels, config, enabled, organization_id, visibility)
    select r.event_key, r.label, r.descr,
           '{"email": true}'::jsonb,
           jsonb_build_object(
             'bucket', 'direct', 'mandatory', false, 'alert_tier', 'informational', 'digestible', false,
             'sms_locked', true, 'target_kind', 'custom.record', 'max_attempts', 5, 'routing_mode', 'declared_audience',
             'push_declared', false, 'non_user_capable', true, 'deep_link_template', null, 'pair_dm_with_email', false,
             'quiet_hours_exempt', true, 'retry_base_seconds', 60, 'sender_program_key', null, 'sensitivity_ceiling', 'internal',
             'templates', jsonb_build_object('email', jsonb_build_object(
               'subject', '{{notice.subject}}', 'body', r.body))),
           true, t.organization_id, t.visibility
      from communication.notification_event_type t
     where t.event_key = 'custom.form.respondent_copy' and t.deleted_at is null
    on conflict do nothing;
  end loop;
end
$events$;

-- ── small pure helpers ───────────────────────────────────────────────────────────────────
create or replace function custom._booking_urlenc(p text)
returns text language sql immutable set search_path to 'pg_catalog'
as $$
  select coalesce(string_agg(
           case when b between 48 and 57 or b between 65 and 90 or b between 97 and 122 or b in (45, 46, 95, 126)
                then chr(b) else '%' || upper(lpad(to_hex(b), 2, '0')) end, '' order by g), '')
    from (select g, get_byte(convert_to(coalesce(p, ''), 'UTF8'), g) as b
            from generate_series(0, octet_length(convert_to(coalesce(p, ''), 'UTF8')) - 1) g) x
$$;

create or replace function custom._booking_fill(p_text text, p_tokens jsonb)
returns text language plpgsql immutable set search_path to 'pg_catalog'
as $$
declare
  v_out text := coalesce(p_text, '');
  t     record;
begin
  for t in select key, value from jsonb_each_text(coalesce(p_tokens, '{}'::jsonb)) loop
    v_out := replace(v_out, '{{' || t.key || '}}', t.value);
  end loop;
  -- Anything still in braces is not a token we know: dropped, never sent as a merge field.
  return btrim(regexp_replace(v_out, '\{\{[^}]*\}\}', '', 'g'));
end
$$;

create or replace function custom._booking_ics(p_uid text, p_title text, p_description text,
                                               p_start timestamptz, p_end timestamptz,
                                               p_method text, p_sequence integer)
returns text language sql immutable set search_path to 'pg_catalog'
as $$
  select 'BEGIN:VCALENDAR' || E'\r\n'
      || 'VERSION:2.0' || E'\r\n'
      || 'PRODID:-//AI Matrx//Booking//EN' || E'\r\n'
      || 'CALSCALE:GREGORIAN' || E'\r\n'
      || 'METHOD:' || p_method || E'\r\n'
      || 'BEGIN:VEVENT' || E'\r\n'
      || 'UID:' || p_uid || E'\r\n'
      || 'SEQUENCE:' || p_sequence || E'\r\n'
      || 'DTSTAMP:' || to_char(now() at time zone 'utc', 'YYYYMMDD"T"HH24MISS"Z"') || E'\r\n'
      || 'DTSTART:' || to_char(p_start at time zone 'utc', 'YYYYMMDD"T"HH24MISS"Z"') || E'\r\n'
      || 'DTEND:' || to_char(p_end at time zone 'utc', 'YYYYMMDD"T"HH24MISS"Z"') || E'\r\n'
      || 'SUMMARY:' || replace(replace(replace(replace(replace(coalesce(p_title, 'Appointment'), E'\\', E'\\\\'), ';', E'\;'), ',', E'\\,'), E'\r', ''), E'\n', E'\\n') || E'\r\n'
      || 'DESCRIPTION:' || replace(replace(replace(replace(replace(coalesce(p_description, ''), E'\\', E'\\\\'), ';', E'\;'), ',', E'\\,'), E'\r', ''), E'\n', E'\\n') || E'\r\n'
      || case when p_method = 'CANCEL' then 'STATUS:CANCELLED' else 'STATUS:CONFIRMED' end || E'\r\n'
      || 'END:VEVENT' || E'\r\n'
      || 'END:VCALENDAR' || E'\r\n'
$$;

-- ── the producer ─────────────────────────────────────────────────────────────────────────
create or replace function custom._booking_messages(p_organization_id uuid, p_form_id uuid, p_record_id uuid,
                                                    p_submission_id uuid, p_event text)
returns jsonb
language plpgsql
set search_path to 'pg_catalog'
as $fn$
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
        p_organization_id, 'custom.booking.made', v_host, null, null,
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
$fn$;

-- The wrapper the three doors call: a failure here is filed and warned, and NEVER undoes the booking.
create or replace function custom.booking_messages(p_organization_id uuid, p_form_id uuid, p_record_id uuid,
                                                   p_submission_id uuid, p_event text)
returns jsonb
language plpgsql
set search_path to 'pg_catalog'
as $fn$
begin
  return custom._booking_messages(p_organization_id, p_form_id, p_record_id, p_submission_id, p_event);
exception when others then
  raise warning 'custom.booking_messages did not queue (% for submission %): %', p_event, p_submission_id, sqlerrm;
  begin
    perform ops.record_system_error(jsonb_build_object(
      'kind', 'booking_messages_not_queued', 'source_feature', 'booking',
      'error_type', 'booking_messages_not_queued', 'error_text', sqlerrm,
      'organization_id', p_organization_id,
      'context', jsonb_build_object('event', p_event, 'submission_id', p_submission_id, 'form_id', p_form_id)));
  exception when others then
    raise warning 'custom.booking_messages could not file its own failure: %', sqlerrm;
  end;
  return jsonb_build_object('failed', sqlerrm);
end;
$fn$;



insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values
 ('custom','_booking_urlenc','p text',array['text'::regtype]::oid[],'Pure text helper: percent-encodes a string for a calendar link. Reads nothing.','booking_notify_a_booker_is_told_what_happened.sql','internal: not a door. Called by custom._booking_messages.',false,false),
 ('custom','_booking_fill','p_text text, p_tokens jsonb',array['text'::regtype,'jsonb'::regtype]::oid[],'Pure text helper: fills the {{tokens}} of a booking message. Reads nothing.','booking_notify_a_booker_is_told_what_happened.sql','internal: not a door. Called by custom._booking_messages.',false,false),
 ('custom','_booking_ics','p_uid text, p_title text, p_description text, p_start timestamptz, p_end timestamptz, p_method text, p_sequence integer',array['text'::regtype,'text'::regtype,'text'::regtype,'timestamptz'::regtype,'timestamptz'::regtype,'text'::regtype,'integer'::regtype]::oid[],'Pure text helper: builds one iCalendar event. Reads nothing.','booking_notify_a_booker_is_told_what_happened.sql','internal: not a door. Called by custom._booking_messages.',false,false),
 ('custom','_booking_messages','p_organization_id uuid, p_form_id uuid, p_record_id uuid, p_submission_id uuid, p_event text',array['uuid'::regtype,'uuid'::regtype,'uuid'::regtype,'uuid'::regtype,'text'::regtype]::oid[],'The form is matched with the organization and the submission with the organization, so another tenant''s ids read as absent. It queues only notices about that one booking.','booking_notify_a_booker_is_told_what_happened.sql','internal: not a door. Called by custom.booking_messages.',false,false),
 ('custom','booking_messages','p_organization_id uuid, p_form_id uuid, p_record_id uuid, p_submission_id uuid, p_event text',array['uuid'::regtype,'uuid'::regtype,'uuid'::regtype,'uuid'::regtype,'text'::regtype]::oid[],'Internal step of the confirm, reschedule and cancel paths, called after the booking has already changed. It queues notices to the booker (the address they typed) and the host, and never undoes the booking.','booking_notify_a_booker_is_told_what_happened.sql','server_only: it is an internal step of the booking path; nothing outside it has a reason to send a booking page''s messages.',false,false)
on conflict do nothing;

CREATE OR REPLACE FUNCTION custom.booking_confirm(p_form_id uuid, p_hold_id uuid, p_origin text, p_payload jsonb, p_bucket text, p_honeypot text DEFAULT NULL::text, p_client_key text DEFAULT NULL::text)
 RETURNS TABLE(booking_ref text, record_id uuid, submission_id uuid, slot_key text, slot_at timestamp with time zone, state text, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_f     custom.anon_form;
  v_b     jsonb;
  v_slots uuid;
  v_hold  custom.record;
  v_key   text;
  v_who   uuid;
  v_ref   text;
  v_sub   record;
  v_held  text;
  v_stood boolean := false;
  v_end   timestamptz;
  v_at    timestamptz;
  v_dup   text;
begin
  perform custom._write_via_mark('booking');  -- CHAIR-DOORS-4: the change event says it came through a booking door
  if p_form_id is null then
    raise exception 'This booking page is not available.' using errcode = '23503';
  end if;
  select * into v_f from custom.anon_form where id = p_form_id and deleted_at is null;
  if not found then
    raise exception 'This booking page is not available.' using errcode = '23503';
  end if;
  perform custom.assert_store_door(v_f.organization_id, 'custom.booking_confirm');
  v_b := v_f.presentation -> 'booking';
  if v_b is null then
    raise exception 'This link is a form, not a booking page.' using errcode = '23503';
  end if;
  v_slots := (v_b ->> 'slot_table_id')::uuid;

  -- THE THREE THE STORE FILLS IN ARE REFUSED FROM THE BROWSER, by name. Otherwise the
  -- time on the record and the time that was held could be two different times.
  for v_dup in select jsonb_object_keys(coalesce(p_payload, '{}'::jsonb)) loop
    if v_dup in ('slot', 'status', 'booked_with') then
      raise exception 'A booking never sends "%": it comes from the time that was held.', v_dup
        using errcode = '42501',
              hint = 'slot, status and booked_with are the store''s. Send only the answers to the questions the page asked.';
    end if;
  end loop;

  -- THE HOLD IS THE RIGHT TO THIS SLOT, and it has to be live and it has to be this
  -- caller's. A confirm with somebody else's hold id would book their slot in your name.
  select * into v_hold from custom.record r
   where r.organization_id = v_f.organization_id
     and r.table_id = v_slots
     and r.id = p_hold_id
     and r.deleted_at is null;
  if not found then
    booking_ref := null; record_id := null; submission_id := null; slot_key := null;
    slot_at := null; state := 'hold_lost';
    message := 'The time you were holding was let go before you sent your details, so nothing was booked. Pick a time again — it takes a moment and your answers are still here.';
    return next; return;
  end if;
  if coalesce((v_hold.data ->> 'expires_at')::timestamptz, now()) <= now() then
    booking_ref := null; record_id := null; submission_id := null;
    slot_key := v_hold.data ->> 'slot_key'; slot_at := null; state := 'hold_expired';
    message := 'The time you were holding ran out before you sent your details, so nothing was booked. Pick a time again.';
    return next; return;
  end if;
  -- THE BUCKET, NOT THE CLIENT KEY. See this file's header: the client key is a
  -- per-submission replay key and is a DIFFERENT string on the confirm than it was on the
  -- hold, so comparing it refused every real browser its own hold.
  if coalesce(v_hold.data ->> 'holder', '') <> coalesce(nullif(btrim(p_bucket), ''), 'visitor') then
    raise exception 'That time is being held by somebody else, so it cannot be booked from here.'
      using errcode = '42501',
            hint = 'A hold belongs to whoever took it. Pick a time on this page and it will be held for you.';
  end if;

  v_key := v_hold.data ->> 'slot_key';
  v_at := v_key::timestamptz;
  select s.member_user_id into v_who from custom._booking_slots(v_b, null) s
   where s.slot_key = v_key limit 1;

  -- THE ANSWERS GO THROUGH THE FORM DOOR — the honeypot, the idempotency, the cap, the
  -- rate limit, the scope check, the required check, the quarantine, the accept Rule and
  -- the notify Rule are DOOR-17's and are not rebuilt here. The slot travels WITH the
  -- answers, so the record is complete the first time anybody sees it.
  select * into v_sub from custom.form_submit(
    p_form_id, p_origin,
    coalesce(p_payload, '{}'::jsonb)
      || jsonb_build_object('slot', v_key, 'status', 'booked',
                            'booked_with', coalesce(v_who::text, '')),
    p_bucket, p_honeypot, p_client_key);

  if v_sub.record_id is null then
    -- HELD, REJECTED, CLOSED OR FULL — the store's own sentence, and the slot is let go
    -- rather than kept by somebody who does not have a booking.
    if v_sub.state in ('closed', 'full', 'too_many') then
      perform custom._booking_release(v_f.organization_id, v_f.published_by, p_hold_id);
    end if;
    booking_ref := null; record_id := null; submission_id := v_sub.submission_id;
    slot_key := v_key; slot_at := v_at; state := v_sub.state;
    message := coalesce(v_sub.message,
      'Your details were sent and are waiting for someone to confirm them, so this time is not yours yet. Whoever owns this page will be in touch.');
    return next; return;
  end if;

  -- ── THE CALENDAR HOLD. The same hold, kept until the appointment is OVER ───────────
  -- REC-71's sweep frees a hold when its expiry passes, so a booking's hold simply
  -- expires at the end of its own appointment. There is no second calendar to disagree
  -- with the bookings table.
  v_end := v_at + make_interval(mins => (v_b ->> 'slot_minutes')::integer);
  v_ref := encode(extensions.gen_random_bytes(16), 'hex');

  if custom.query_principal() is null and v_f.published_by is not null then
    v_held := current_setting('request.jwt.claims', true);
    perform set_config('request.jwt.claims',
                       jsonb_build_object('sub', v_f.published_by, 'role', 'authenticated')::text,
                       true);
    v_stood := true;
  end if;
  begin
    perform custom.record_update(v_f.organization_id, p_hold_id, jsonb_build_object(
      'expires_at', to_char(v_end at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      '_actor', 'system'));
  exception when others then
    if v_stood then perform set_config('request.jwt.claims', coalesce(v_held, ''), true); end if;
    raise;
  end;
  if v_stood then perform set_config('request.jwt.claims', coalesce(v_held, ''), true); end if;

  update custom.anon_submission
     set booking_ref = v_ref
   where organization_id = v_f.organization_id and id = v_sub.submission_id;

  -- BOOKING-NOTIFY: tell the booker and the host. Never undoes the booking; a failure is filed.
  perform custom.booking_messages(v_f.organization_id, v_f.id, v_sub.record_id, v_sub.submission_id, 'booked');

  booking_ref := v_ref; record_id := v_sub.record_id; submission_id := v_sub.submission_id;
  slot_key := v_key; slot_at := v_at; state := 'booked'; message := null;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.booking_reschedule(p_booking_ref text, p_slot_key text, p_origin text, p_bucket text DEFAULT NULL::text)
 RETURNS TABLE(booking_ref text, record_id uuid, slot_key text, slot_at timestamp with time zone, state text, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_s      custom.anon_submission;
  v_f      custom.anon_form;
  v_b      jsonb;
  v_slots  uuid;
  v_doc    jsonb;
  v_old    text;
  v_oldrow custom.record;
  v_found  boolean := false;
  v_who    uuid;
  v_new    uuid;
  v_end    timestamptz;
  v_at     timestamptz;
  v_held   text;
  v_stood  boolean := false;
begin
  perform custom._write_via_mark('booking');  -- CHAIR-DOORS-4: the change event says it came through a booking door
  if p_booking_ref is null then
    raise exception 'That link does not name an appointment.' using errcode = '23503';
  end if;
  select * into v_s from custom.anon_submission sub where sub.booking_ref = p_booking_ref;
  if not found then
    raise exception 'That link does not name an appointment.'
      using errcode = '23503',
            hint = 'It may have been mistyped, or the appointment may have been removed.';
  end if;
  perform custom.assert_store_door(v_s.organization_id, 'custom.booking_reschedule');
  select * into v_f from custom.anon_form
   where organization_id = v_s.organization_id and id = v_s.form_id and deleted_at is null;
  v_b := v_f.presentation -> 'booking';
  if v_b is null then
    raise exception 'That link is a form response, not an appointment.' using errcode = '23503';
  end if;
  v_slots := (v_b ->> 'slot_table_id')::uuid;

  select r.data into v_doc from custom.record r
   where r.organization_id = v_s.organization_id and r.id = v_s.record_id and r.deleted_at is null;
  if v_doc is null then
    booking_ref := p_booking_ref; record_id := null; slot_key := null; slot_at := null;
    state := 'held';
    message := 'Your details are still waiting for someone to confirm them, so there is nothing to move yet.';
    return next; return;
  end if;
  if coalesce(v_doc ->> 'status', 'booked') = 'cancelled' then
    booking_ref := p_booking_ref; record_id := v_s.record_id; slot_key := null; slot_at := null;
    state := 'cancelled';
    message := 'This appointment was cancelled, so there is nothing to move. Book a new time on the booking page.';
    return next; return;
  end if;
  v_old := v_doc ->> 'slot';

  if p_slot_key = v_old then
    booking_ref := p_booking_ref; record_id := v_s.record_id; slot_key := v_old;
    slot_at := v_old::timestamptz; state := 'unchanged';
    message := 'That is the time you already have, so nothing was moved.';
    return next; return;
  end if;

  select true, s.member_user_id into v_found, v_who
    from custom._booking_slots(v_b, null) s where s.slot_key = p_slot_key limit 1;
  if not coalesce(v_found, false) then
    booking_ref := p_booking_ref; record_id := v_s.record_id; slot_key := v_old;
    slot_at := v_old::timestamptz; state := 'not_offered';
    message := 'That time is not one this page offers, so your appointment was not moved. Pick one of the times shown.';
    return next; return;
  end if;

  v_at := p_slot_key::timestamptz;
  v_end := v_at + make_interval(mins => (v_b ->> 'slot_minutes')::integer);

  -- THE NEW HOLD IS TAKEN BEFORE THE OLD ONE IS LET GO. The other order frees a slot,
  -- loses the race for the new one, and leaves a booking with no time at all.
  select * into v_oldrow from custom.record r
   where r.organization_id = v_s.organization_id and r.table_id = v_slots
     and r.deleted_at is null and r.data ->> 'slot_key' = coalesce(v_old, '')
   limit 1;

  if custom.query_principal() is null and v_f.published_by is not null then
    v_held := current_setting('request.jwt.claims', true);
    perform set_config('request.jwt.claims',
                       jsonb_build_object('sub', v_f.published_by, 'role', 'authenticated')::text,
                       true);
    v_stood := true;
  end if;

  begin
    begin
      v_new := (custom.work_slot_hold(v_s.organization_id, v_slots, p_slot_key,
                                      coalesce(v_oldrow.data ->> 'holder', 'visitor'),
                                      make_interval(mins => 15)) ->> 'hold_id')::uuid;
    exception when unique_violation then
      if v_stood then perform set_config('request.jwt.claims', coalesce(v_held, ''), true); end if;
      booking_ref := p_booking_ref; record_id := v_s.record_id; slot_key := v_old;
      slot_at := v_old::timestamptz; state := 'taken';
      message := 'Somebody took that time a moment before you did, so your appointment was not moved and you still have the time you had. Pick another.';
      return next; return;
    end;

    -- BOTH HALVES, IN ONE TRANSACTION. The record's time and the calendar hold are the
    -- same fact said twice, and a move that changed one of them would be a booking the
    -- calendar disagrees with.
    perform custom.record_update(v_s.organization_id, v_new, jsonb_build_object(
      'expires_at', to_char(v_end at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      '_actor', 'system'));
    if v_oldrow.id is not null then
      perform custom.work_slot_release(v_s.organization_id, v_oldrow.id);
    end if;
    perform custom.record_update(v_s.organization_id, v_s.record_id, jsonb_build_object(
      'slot', p_slot_key, 'status', 'booked',
      'booked_with', coalesce(v_who::text, ''), '_actor', 'system'));
  exception when others then
    if v_stood then perform set_config('request.jwt.claims', coalesce(v_held, ''), true); end if;
    raise;
  end;
  if v_stood then perform set_config('request.jwt.claims', coalesce(v_held, ''), true); end if;

  perform custom.booking_notify(v_s.organization_id, v_f.id, v_s.record_id, v_s.id,
                                'moved', to_char(v_at at time zone (v_b ->> 'timezone'),
                                                 'FMDay FMDD FMMonth at FMHH12:MIam'));

  -- BOOKING-NOTIFY: tell the booker and the host. Never undoes the booking; a failure is filed.
  perform custom.booking_messages(v_s.organization_id, v_f.id, v_s.record_id, v_s.id, 'moved');

  booking_ref := p_booking_ref; record_id := v_s.record_id; slot_key := p_slot_key;
  slot_at := v_at; state := 'moved'; message := null;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.booking_cancel(p_booking_ref text, p_origin text DEFAULT NULL::text)
 RETURNS TABLE(booking_ref text, record_id uuid, slot_key text, state text, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_s     custom.anon_submission;
  v_f     custom.anon_form;
  v_b     jsonb;
  v_slots uuid;
  v_doc   jsonb;
  v_old   text;
  v_row   custom.record;
  v_held  text;
  v_stood boolean := false;
begin
  perform custom._write_via_mark('booking');  -- CHAIR-DOORS-4: the change event says it came through a booking door
  if p_booking_ref is null then
    raise exception 'That link does not name an appointment.' using errcode = '23503';
  end if;
  select * into v_s from custom.anon_submission sub where sub.booking_ref = p_booking_ref;
  if not found then
    raise exception 'That link does not name an appointment.' using errcode = '23503';
  end if;
  perform custom.assert_store_door(v_s.organization_id, 'custom.booking_cancel');
  select * into v_f from custom.anon_form
   where organization_id = v_s.organization_id and id = v_s.form_id and deleted_at is null;
  v_b := v_f.presentation -> 'booking';
  if v_b is null then
    raise exception 'That link is a form response, not an appointment.' using errcode = '23503';
  end if;
  v_slots := (v_b ->> 'slot_table_id')::uuid;

  select r.data into v_doc from custom.record r
   where r.organization_id = v_s.organization_id and r.id = v_s.record_id and r.deleted_at is null;
  if v_doc is null then
    booking_ref := p_booking_ref; record_id := null; slot_key := null; state := 'held';
    message := 'Your details are still waiting for someone to confirm them, so there is no appointment to cancel.';
    return next; return;
  end if;
  if coalesce(v_doc ->> 'status', 'booked') = 'cancelled' then
    booking_ref := p_booking_ref; record_id := v_s.record_id; slot_key := v_doc ->> 'slot';
    state := 'cancelled';
    message := 'This appointment was already cancelled, so nothing changed.';
    return next; return;
  end if;
  v_old := v_doc ->> 'slot';

  select * into v_row from custom.record r
   where r.organization_id = v_s.organization_id and r.table_id = v_slots
     and r.deleted_at is null and r.data ->> 'slot_key' = coalesce(v_old, '')
   limit 1;

  if custom.query_principal() is null and v_f.published_by is not null then
    v_held := current_setting('request.jwt.claims', true);
    perform set_config('request.jwt.claims',
                       jsonb_build_object('sub', v_f.published_by, 'role', 'authenticated')::text,
                       true);
    v_stood := true;
  end if;
  begin
    -- THE BOOKING IS KEPT AND MARKED, NEVER DELETED. A cancelled appointment is something
    -- the owner has to be able to see, count and chase; deleting it would make an hour
    -- that was lost look like an hour nobody asked for.
    perform custom.record_update(v_s.organization_id, v_s.record_id,
                                 jsonb_build_object('status', 'cancelled', '_actor', 'system'));
    if v_row.id is not null then
      perform custom.work_slot_release(v_s.organization_id, v_row.id);
    end if;
  exception when others then
    if v_stood then perform set_config('request.jwt.claims', coalesce(v_held, ''), true); end if;
    raise;
  end;
  if v_stood then perform set_config('request.jwt.claims', coalesce(v_held, ''), true); end if;

  perform custom.booking_notify(
    v_s.organization_id, v_f.id, v_s.record_id, v_s.id, 'cancelled',
    coalesce(to_char(v_old::timestamptz at time zone (v_b ->> 'timezone'),
                     'FMDay FMDD FMMonth at FMHH12:MIam'), 'an unknown time'));

  -- BOOKING-NOTIFY: tell the booker and the host. Never undoes the booking; a failure is filed.
  perform custom.booking_messages(v_s.organization_id, v_f.id, v_s.record_id, v_s.id, 'cancelled');

  booking_ref := p_booking_ref; record_id := v_s.record_id; slot_key := v_old;
  state := 'cancelled'; message := 'This appointment is cancelled and that time is free again.';
  return next;
end;
$function$;

