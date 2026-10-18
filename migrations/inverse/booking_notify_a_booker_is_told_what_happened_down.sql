-- chair-step: the inverse of booking_notify_a_booker_is_told_what_happened.sql. Restores the three booking doors without the messages call and DROPS the producer, its helpers, their door rows and the four booker event types. Notices already queued are not touched.
-- lane: BOOKING-NOTIFY
-- lock: custom,communication

set local lock_timeout = '2s';
set local statement_timeout = '60s';

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

  booking_ref := p_booking_ref; record_id := v_s.record_id; slot_key := v_old;
  state := 'cancelled'; message := 'This appointment is cancelled and that time is free again.';
  return next;
end;
$function$;

drop function if exists custom.booking_messages(uuid, uuid, uuid, uuid, text);
drop function if exists custom._booking_messages(uuid, uuid, uuid, uuid, text);
drop function if exists custom._booking_ics(text, text, text, timestamptz, timestamptz, text, integer);
drop function if exists custom._booking_fill(text, jsonb);
drop function if exists custom._booking_urlenc(text);
delete from platform.client_callable_door where declared_by = 'booking_notify_a_booker_is_told_what_happened.sql';
delete from communication.notification_event_type where event_key in ('custom.booking.booker_confirmed','custom.booking.booker_reminder','custom.booking.booker_moved','custom.booking.booker_cancelled');
