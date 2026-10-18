-- based-on: custom._booking_messages(uuid, uuid, uuid, uuid, text) 9fe5f0d099f75d9dc829543ace9edb54c7e8a39815356126d36e7bba4729607a
-- based-on: custom.booking_cancel(text, text) 0f9e05658e8e0491a9a6fd988503aaa816e0c20e54add51a369f811d892fc244
-- lane: BOOKING-NOTIFY
-- lock: custom,communication
--
-- BOOKING-NOTIFY part c — A DELAYED NOTICE ASKS "AM I STILL DUE?" AT SEND TIME.
-- communication.notification_still_due + communication.still_due_booking (generic guard door the
-- dispatcher asks before a send), booking reminders carry the guard, and booking_cancel on an
-- already-cancelled record still ends the reminders that wait.
set local lock_timeout = '2s';
set local statement_timeout = '60s';

-- A GENERIC "STILL DUE?" CHECK FOR ANY DELAYED NOTICE. A row carries metadata.still_due =
-- {guard: 'communication.still_due_<name>', args: {...}}; the dispatcher asks it just before a send
-- and a notice that is no longer due is a named skipped row (error_code no_longer_due) with the
-- guard's sentence. Only communication.still_due_* functions can be named (the allow-list), and a
-- guard that errors answers "due" with the reason — a notice is never dropped by a broken guard.
create or replace function communication.notification_still_due(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $fn$
declare
  v_n     communication.notification;
  v_guard text;
  v_out   jsonb;
begin
  select * into v_n from communication.notification where id = p_id;
  v_guard := v_n.metadata -> 'still_due' ->> 'guard';
  if v_guard is null then
    return jsonb_build_object('due', true);
  end if;
  if v_guard !~ '^communication\.still_due_[a-z0-9_]+$' then
    return jsonb_build_object('due', true, 'why', format('The guard %s is not an allowed still_due function.', v_guard));
  end if;
  begin
    execute format('select %s($1, $2)', v_guard)
       into v_out using v_n.organization_id, coalesce(v_n.metadata -> 'still_due' -> 'args', '{}'::jsonb);
  exception when others then
    return jsonb_build_object('due', true, 'why', format('The guard %s failed: %s', v_guard, sqlerrm));
  end;
  return coalesce(v_out, jsonb_build_object('due', true));
end;
$fn$;

create or replace function communication.still_due_booking(p_organization_id uuid, p_args jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $fn$
declare
  v_doc jsonb;
  v_del timestamptz;
begin
  select r.data, r.deleted_at into v_doc, v_del from custom.record r
   where r.organization_id = p_organization_id and r.id = nullif(p_args ->> 'record_id', '')::uuid;
  if v_doc is null or v_del is not null then
    return jsonb_build_object('due', false, 'why', 'The appointment this reminded about was removed.');
  end if;
  if coalesce(v_doc ->> 'status', 'booked') = 'cancelled' then
    return jsonb_build_object('due', false, 'why', 'The appointment this reminded about was cancelled.');
  end if;
  if v_doc ->> 'slot' is distinct from p_args ->> 'slot' then
    return jsonb_build_object('due', false, 'why', 'The appointment this reminded about was moved to a different time.');
  end if;
  return jsonb_build_object('due', true);
end;
$fn$;

create or replace function custom._booking_end_reminders(p_organization_id uuid, p_ref text)
returns integer
language plpgsql
set search_path to 'pg_catalog'
as $fn$
declare
  v_rows integer;
begin
  update communication.notification n
     set status = 'skipped', error_code = 'booking_changed',
         error_message = 'The appointment was moved or cancelled before this reminder was due, so it was not sent.',
         claimed_by = null, lease_expires_at = null, updated_at = now()
   where n.organization_id = p_organization_id
     and n.dedupe_key like 'booking:' || p_ref || ':remind:%'
     and n.status in ('render_pending', 'render_in_progress', 'pending');
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$fn$;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers)
values ('custom','_booking_end_reminders','p_organization_id uuid, p_ref text',array['uuid'::regtype,'text'::regtype]::oid[],
        'Matched with the organization; it only marks that one booking''s waiting reminder rows skipped.','booking_notify_c_a_reminder_asks_if_it_is_still_due.sql',
        'internal: not a door. Called by custom._booking_messages and custom.booking_cancel.',false,false),
       ('communication','notification_still_due','p_id uuid',array['uuid'::regtype]::oid[],
        'Reads one notification row by id and runs only the allow-listed communication.still_due_* guard it names; answers due or not. Changes nothing.','booking_notify_c_a_reminder_asks_if_it_is_still_due.sql',
        'internal: not a door. Called by the notification dispatcher (service lane) just before a send.',false,false),
       ('communication','still_due_booking','p_organization_id uuid, p_args jsonb',array['uuid'::regtype,'jsonb'::regtype]::oid[],
        'Matched with the organization; reads one booking record''s status and time and answers due or not. Changes nothing.','booking_notify_c_a_reminder_asks_if_it_is_still_due.sql',
        'internal: not a door. Called by communication.notification_still_due.',false,false)
on conflict do nothing;

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
    v_rows := custom._booking_end_reminders(p_organization_id, v_ref);
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
         set next_attempt_at = v_when,
             -- THE GUARD, ASKED AT SEND TIME: a reminder goes only if this booking still stands at this time.
             metadata = coalesce(n.metadata, '{}'::jsonb) || jsonb_build_object('still_due', jsonb_build_object(
               'guard', 'communication.still_due_booking',
               'args', jsonb_build_object('record_id', p_record_id, 'slot', v_slot, 'booking_ref', v_ref)))
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
    -- IDEMPOTENT: a second cancel (or a record cancelled by hand) still ends the reminders that wait.
    perform custom._booking_end_reminders(v_s.organization_id, p_booking_ref);
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
