-- chair-step: UNDOES bookingx_a: puts back the nine live booking bodies exactly as they were (dumped 2026-10-22), drops the four functions it added and deletes their door rows and the booking/busy_refresh_minutes knob. Pages made with places, video or a connected calendar keep those keys in their presentation; the old bodies ignore them.
-- lane: CLOSE-PAGE
-- based-on: custom._booking_availability(uuid, jsonb) c23de9e37207a876e9ee56d89fc3a7de7b1cfa5a77364efeb4358eb7495f3c09
-- based-on: custom._booking_slots(jsonb, integer) 63719404fc0a0e710cda81e005b71203caa94b6814f2e4665d9059dc1d71cc3e
-- based-on: custom.booking_hold(uuid, text, text, text, text) 5aa4c4c1312970bdb64a7335a0c705fa2a3c6192fcaaa0be114b910fd7dd3821
-- based-on: custom.booking_confirm(uuid, uuid, text, jsonb, text, text, text) 69f04c51c65e9ca09bcd3347f179e0cfe877a279349dcd56922ad5b932676f9a
-- based-on: custom.booking_public(uuid, integer) 33f6e485498f2fdaa642a5a3a4308e8504a995841d72441c5554a641802bd42e
-- based-on: custom.booking_manage(text, integer) c2c7ce64cafae957d148680f72d8d33863337410e7f3756b31130948ed39d6a8
-- based-on: custom.booking_reschedule(text, text, text, text) a03e692f63da44b4b6116b983a8397fb26e062cba118105e20ec109e52011090
-- based-on: custom.booking_cancel(text, text) 7774f423703070fde5ca47a2dde80faab650d80726898672cd6be41fa2a3dbd6
-- based-on: custom._booking_messages(uuid, uuid, uuid, uuid, text) 1fec4d5ca82b5bb84ec403c45535878fdcdd456dc08d3b72889b433bb3a5b1f1
set local lock_timeout = '3s';
set local statement_timeout = '60s';
CREATE OR REPLACE FUNCTION custom._booking_availability(p_organization_id uuid, p_raw jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_in    jsonb := coalesce(p_raw, '{}'::jsonb);
  v_tz    text  := coalesce(nullif(btrim(v_in ->> 'timezone'), ''), 'UTC');
  v_len   integer := coalesce((v_in ->> 'slot_minutes')::integer, 30);
  v_buf   integer := coalesce((v_in ->> 'buffer_minutes')::integer, 0);
  v_lead  integer := coalesce((v_in ->> 'lead_minutes')::integer, 120);
  v_cap   integer := coalesce((v_in ->> 'max_per_day')::integer, 8);
  v_days  integer := coalesce((v_in ->> 'days')::integer, 14);
  v_wins  jsonb := v_in -> 'windows';
  v_out   jsonb := '[]'::jsonb;
  w       jsonb;
  v_wd    integer;
  v_from  time;
  v_to    time;
  v_who   uuid;
begin
  -- THE TIMEZONE IS ASKED OF POSTGRES, not matched against a list we would have to keep.
  begin
    perform now() at time zone v_tz;
  exception when others then
    raise exception 'There is no timezone called "%", so no hours could be offered in it.', v_tz
      using errcode = '22023',
            hint = 'Use an IANA name such as America/Chicago, Europe/London or UTC. This is the organization''s own timezone — the visitor''s browser shows the same moment in theirs.';
  end;

  if v_len < 5 or v_len > 480 then
    raise exception 'A % minute appointment is not a length this offers.', v_len
      using errcode = '22023', hint = 'Slot length is between 5 minutes and 8 hours.';
  end if;
  if v_buf < 0 or v_buf > 480 then
    raise exception 'A gap of % minutes between appointments is not a gap.', v_buf
      using errcode = '22023', hint = 'The buffer is between 0 and 480 minutes.';
  end if;
  if v_lead < 0 or v_lead > 43200 then
    raise exception 'Asking for % minutes of notice is not notice.', v_lead
      using errcode = '22023', hint = 'Lead time is between 0 minutes and 30 days.';
  end if;
  if v_cap < 1 or v_cap > 100 then
    raise exception '% appointments a day is not a limit anybody meant.', v_cap
      using errcode = '22023', hint = 'Between 1 and 100 a day.';
  end if;
  if v_days < 1 or v_days > 90 then
    raise exception 'Offering % days ahead is not a window.', v_days
      using errcode = '22023', hint = 'Between 1 and 90 days ahead.';
  end if;

  -- NO WINDOWS MEANS THE DEFAULT, not an empty calendar. An organization that said
  -- nothing about its hours is offering its working week, and a booking page that
  -- offered nothing would look broken rather than unconfigured.
  if jsonb_typeof(v_wins) is distinct from 'array' or jsonb_array_length(v_wins) = 0 then
    v_wins := jsonb_build_array(
      jsonb_build_object('weekday', 1, 'from', '09:00', 'to', '17:00'),
      jsonb_build_object('weekday', 2, 'from', '09:00', 'to', '17:00'),
      jsonb_build_object('weekday', 3, 'from', '09:00', 'to', '17:00'),
      jsonb_build_object('weekday', 4, 'from', '09:00', 'to', '17:00'),
      jsonb_build_object('weekday', 5, 'from', '09:00', 'to', '17:00'));
  end if;

  for w in select value from jsonb_array_elements(v_wins) loop
    v_wd := (w ->> 'weekday')::integer;
    if v_wd is null or v_wd < 0 or v_wd > 6 then
      raise exception 'A window has to name a day of the week, and this one says %.',
                      coalesce(w ->> 'weekday', 'nothing')
        using errcode = '22023',
              hint = '0 is Sunday and 6 is Saturday, the same numbering the database uses.';
    end if;
    begin
      v_from := (w ->> 'from')::time;
      v_to   := (w ->> 'to')::time;
    exception when others then
      raise exception 'A window on day % does not give an hour it starts and an hour it ends.', v_wd
        using errcode = '22023', hint = 'Each window is {"weekday": 1, "from": "09:00", "to": "17:00"}.';
    end;
    if v_to <= v_from then
      raise exception 'A window on day % ends at % and starts at %, so nothing fits in it.',
                      v_wd, v_to, v_from
        using errcode = '22023', hint = 'The end has to be later in the day than the start.';
    end if;

    -- A WINDOW MAY BELONG TO ONE MEMBER — that is the "with whom" of a booking. Somebody
    -- who is not in this organization cannot be booked in its name.
    v_who := nullif(btrim(coalesce(w ->> 'member_user_id', '')), '')::uuid;
    if v_who is not null and not exists (
         select 1 from iam.memberships m
          where m.container_type = 'organization'
            and m.organization_id = p_organization_id and m.user_id = v_who
            and m.deleted_at is null and coalesce(m.status, 'active') = 'active') then
      raise exception 'Nobody with that id is a member of this organization, so their hours cannot be offered.' using errcode = '23503',
              hint = 'A window either names a member of this organization or names nobody, in which case the booking is with the organization.',
            detail = jsonb_build_object('who', v_who)::text;
    end if;

    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'weekday', v_wd,
      'from', to_char(v_from, 'HH24:MI'),
      'to', to_char(v_to, 'HH24:MI'),
      'member_user_id', v_who));
  end loop;

  return jsonb_build_object(
    'timezone', v_tz, 'slot_minutes', v_len, 'buffer_minutes', v_buf,
    'lead_minutes', v_lead, 'max_per_day', v_cap, 'days', v_days, 'windows', v_out);
end;
$function$
;

CREATE OR REPLACE FUNCTION custom._booking_slots(p_avail jsonb, p_days integer DEFAULT NULL::integer)
 RETURNS TABLE(slot_key text, slot_at timestamp with time zone, member_user_id uuid)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_tz    text    := p_avail ->> 'timezone';
  v_len   integer := (p_avail ->> 'slot_minutes')::integer;
  v_buf   integer := (p_avail ->> 'buffer_minutes')::integer;
  v_lead  integer := (p_avail ->> 'lead_minutes')::integer;
  v_cap   integer := (p_avail ->> 'max_per_day')::integer;
  v_days  integer := least(coalesce(p_days, (p_avail ->> 'days')::integer),
                           (p_avail ->> 'days')::integer);
  v_today date    := (now() at time zone v_tz)::date;
  v_floor timestamptz := now() + make_interval(mins => v_lead);
  d       integer;
  v_date  date;
  w       jsonb;
  v_m     integer;
  v_end   integer;
  v_at    timestamptz;
  v_n     integer;
begin
  for d in 0 .. greatest(coalesce(v_days, 1), 1) - 1 loop
    v_date := v_today + d;
    v_n := 0;
    for w in select value from jsonb_array_elements(p_avail -> 'windows')
              where (value ->> 'weekday')::integer = extract(dow from v_date)::integer
              order by value ->> 'from', value ->> 'to' loop
      -- MINUTES, NOT `time + interval`. Adding an interval to a `time` wraps round
      -- midnight, so a window ending at 23:30 with a 60-minute slot would silently
      -- offer tomorrow morning as today.
      v_m   := extract(hour from (w ->> 'from')::time)::integer * 60
             + extract(minute from (w ->> 'from')::time)::integer;
      v_end := extract(hour from (w ->> 'to')::time)::integer * 60
             + extract(minute from (w ->> 'to')::time)::integer;
      while v_m + v_len <= v_end loop
        exit when v_n >= v_cap;
        v_at := (v_date + make_interval(mins => v_m)) at time zone v_tz;
        -- THE LEAD TIME IS A FLOOR ON THE OFFER, so a slot inside it is never shown and
        -- never held — the hold door asks this same function, so the two cannot differ.
        if v_at >= v_floor then
          slot_key := to_char(v_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
          slot_at := v_at;
          member_user_id := nullif(w ->> 'member_user_id', '')::uuid;
          v_n := v_n + 1;
          return next;
        end if;
        v_m := v_m + v_len + v_buf;
      end loop;
    end loop;
  end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION custom.booking_hold(p_form_id uuid, p_slot_key text, p_origin text, p_bucket text, p_client_key text DEFAULT NULL::text)
 RETURNS TABLE(hold_id uuid, slot_key text, expires_at timestamp with time zone, member_user_id uuid, state text, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_f     custom.anon_form;
  v_b     jsonb;
  v_slots uuid;
  v_who   uuid;
  v_found boolean := false;
  v_held  text;
  v_stood boolean := false;
  v_out   jsonb;
  v_ttl   interval;
begin
  perform custom._write_via_mark('booking');  -- CHAIR-DOORS-4: the change event says it came through a booking door
  if p_form_id is null then
    raise exception 'This booking page is not available.' using errcode = '23503';
  end if;
  select * into v_f from custom.anon_form where id = p_form_id and deleted_at is null;
  if not found then
    raise exception 'This booking page is not available.'
      using errcode = '23503',
            hint = 'The link names no booking page. It may have been mistyped, or it may have been taken down.';
  end if;
  perform custom.assert_store_door(v_f.organization_id, 'custom.booking_hold');
  if v_f.published_at is null then
    raise exception 'This booking page is not taking appointments.'
      using errcode = '42501',
            hint = 'It exists but has never been published. Whoever owns it publishes it; until then nothing can be booked, which is the point of the default.';
  end if;
  if v_f.closed_at is not null then
    hold_id := null; slot_key := p_slot_key; expires_at := null; member_user_id := null;
    state := 'closed';
    message := 'This booking page is closed, so it is not taking any more appointments.';
    return next; return;
  end if;
  v_b := v_f.presentation -> 'booking';
  if v_b is null then
    raise exception 'This link is a form, not a booking page, so there is no time to hold.'
      using errcode = '23503';
  end if;
  v_slots := (v_b ->> 'slot_table_id')::uuid;
  v_ttl := make_interval(mins => coalesce((v_b ->> 'hold_minutes')::integer, 15));

  -- THE SLOT HAS TO BE ONE THIS PAGE ACTUALLY OFFERS. The same generator the picker was
  -- drawn from, asked again here — so a key typed into a console, a time inside the lead
  -- time, and a time past the daily cap are all refused in exactly the same sentence.
  select true, s.member_user_id into v_found, v_who
    from custom._booking_slots(v_b, null) s
   where s.slot_key = p_slot_key
   limit 1;
  if not coalesce(v_found, false) then
    hold_id := null; slot_key := p_slot_key; expires_at := null; member_user_id := null;
    state := 'not_offered';
    message := 'That time is not one this page offers. Pick one of the times shown — the list is the offer, and it moves as appointments are taken.';
    return next; return;
  end if;

  -- THE RATE LIMIT, on the bucket the SERVER chose. Holding is a write, and a hold is
  -- what takes a slot away from everybody else, so it is budgeted like a submission.
  begin
    perform custom.anon_rate_take(v_f.organization_id, v_f.id,
                                  coalesce(nullif(btrim(p_bucket), ''), 'anonymous'), null);
  exception when sqlstate '53400' then
    hold_id := null; slot_key := p_slot_key; expires_at := null; member_user_id := null;
    state := 'too_many';
    message := 'That is more times than this page holds in one go. Try again in a little while.';
    return next; return;
  end;

  -- ── AGT-N-5: the principal of an unattended run is the person who set it up ───────
  -- custom.work_slot_hold asks custom.assert_client_may_change, which reads auth.uid().
  -- A stranger has no principal, so this door stands in as the publisher — whom
  -- custom.anon_publish already required to hold ADMIN on the Table — for that one call,
  -- and puts the session back on every path including the exception one.
  if custom.query_principal() is null and v_f.published_by is not null then
    v_held := current_setting('request.jwt.claims', true);
    perform set_config('request.jwt.claims',
                       jsonb_build_object('sub', v_f.published_by, 'role', 'authenticated')::text,
                       true);
    v_stood := true;
  end if;

  begin
    -- THE HOLDER IS THE BUCKET, AND THE BUCKET IS THE SERVER'S. See this file's header.
    v_out := custom.work_slot_hold(v_f.organization_id, v_slots, p_slot_key,
                                   coalesce(nullif(btrim(p_bucket), ''), 'visitor'),
                                   v_ttl);
  exception
    when unique_violation then
      -- THE LOSING HALF OF A RACE, AND THE DATABASE DECIDED IT. REC-71's unique index
      -- refused the second hold; this is that refusal translated into a sentence a person
      -- can act on. It is NOT a spinner, NOT the next slot chosen for them, and NOT a
      -- booking they believe they have.
      if v_stood then perform set_config('request.jwt.claims', coalesce(v_held, ''), true); end if;
      hold_id := null; slot_key := p_slot_key; expires_at := null; member_user_id := v_who;
      state := 'taken';
      message := 'Somebody took that time a moment before you did, so it is no longer free. Nothing was booked — pick another time and the rest of your details are still here.';
      return next; return;
    when others then
      if v_stood then perform set_config('request.jwt.claims', coalesce(v_held, ''), true); end if;
      raise;
  end;
  if v_stood then perform set_config('request.jwt.claims', coalesce(v_held, ''), true); end if;

  hold_id := (v_out ->> 'hold_id')::uuid;
  slot_key := p_slot_key;
  expires_at := (v_out ->> 'expires_at')::timestamptz;
  member_user_id := v_who;
  state := 'held';
  message := null;
  return next;
end;
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION custom.booking_public(p_form_id uuid, p_days integer DEFAULT NULL::integer)
 RETURNS TABLE(form_id uuid, organization_id uuid, table_id uuid, title text, presentation jsonb, fields jsonb, honeypot_key text, availability jsonb, slots jsonb, state text, message text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_f      custom.anon_form;
  v_b      jsonb;
  v_slots  uuid;
  v_count  bigint;
  v_state  text;
  v_msg    text;
  v_fields jsonb;
  v_taken  jsonb;
  v_list   jsonb;
  v_visible text[];
begin
  if p_form_id is null then return; end if;
  select * into v_f from custom.anon_form where id = p_form_id and deleted_at is null;
  if not found then return; end if;
  if v_f.published_at is null then return; end if;
  v_b := v_f.presentation -> 'booking';
  if v_b is null then return; end if;

  -- ── STORE-OFF, exactly as the form says it. ────────────────────────────────────────────
  if not custom.store_is_open(v_f.organization_id) then
    form_id := v_f.id; organization_id := v_f.organization_id; table_id := v_f.table_id;
    title := coalesce(v_f.title, 'Book a time'); presentation := '{}'::jsonb;
    fields := '[]'::jsonb; honeypot_key := null;
    availability := '{}'::jsonb; slots := '[]'::jsonb;
    state := 'unavailable'; message := custom.store_off_sentence(v_f.organization_id);
    return next;
    return;
  end if;

  v_slots := (v_b ->> 'slot_table_id')::uuid;

  select count(*) into v_count from custom.anon_submission s
   where s.organization_id = v_f.organization_id and s.form_id = v_f.id and s.state <> 'rejected';

  if v_f.closed_at is not null then
    v_state := 'closed';
    v_msg := 'This booking page is closed, so it is not taking any more appointments.';
  elsif v_f.submission_cap is not null and v_count >= v_f.submission_cap then
    v_state := 'full';
    v_msg := 'This booking page has all the appointments it was set up to take.';
  else
    v_state := 'open';
    v_msg := null;
  end if;

  -- ONLY THE QUESTIONS A PERSON ANSWERS. slot, status and booked_with are the store's.
  select coalesce(array_agg(q ->> 'field'), array[]::text[]) into v_visible
    from jsonb_array_elements(coalesce(v_f.presentation -> 'questions', '[]'::jsonb)) q
   where not coalesce((q ->> 'hidden')::boolean, false);

  -- A CHOICE QUESTION CARRIES ITS CHOICES (lane HANDOVER, 2026-09-28). A stranger could not
  -- pick a Visit type: the choices live in the organization's own choice list, which a page
  -- answered without an account may not read, so the question fell back to a free-text box.
  -- The organization published this page to ask this question, so the labels of the choices it
  -- asks for travel with the question — the labels only, never the list's own rows.
  select coalesce(jsonb_agg(jsonb_build_object('id', f.id) || f.data
           || custom._public_choices_of(v_f.organization_id, f.data) order by ord), '[]'::jsonb)
    into v_fields
    from unnest(v_visible) with ordinality k(key, ord)
    join custom.record f
      on f.organization_id = v_f.organization_id
     and f.table_id = custom.field_kernel_id()
     and f.deleted_at is null
     and (f.data ->> 'entity_definition_id')::uuid = v_f.table_id
     and f.data ->> 'key' = k.key;

  -- WHAT IS TAKEN IS THE STORE'S ANSWER, and a LAPSED hold is not a taken slot: the slot
  -- comes back on its own and nobody has to guess from a clock.
  select coalesce(jsonb_object_agg(r.data ->> 'slot_key', true), '{}'::jsonb) into v_taken
    from custom.record r
   where r.organization_id = v_f.organization_id
     and r.table_id = v_slots
     and r.deleted_at is null
     and coalesce((r.data ->> 'expires_at')::timestamptz, now()) > now();

  select coalesce(jsonb_agg(jsonb_build_object(
           'key', s.slot_key,
           'at', to_char(s.slot_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           'taken', coalesce((v_taken ->> s.slot_key)::boolean, false),
           'member_user_id', s.member_user_id) order by s.slot_key), '[]'::jsonb)
    into v_list
    from custom._booking_slots(v_b, p_days) s;

  form_id := v_f.id; organization_id := v_f.organization_id; table_id := v_f.table_id;
  title := coalesce(v_f.title, 'Book a time'); presentation := v_f.presentation;
  fields := v_fields; honeypot_key := v_f.honeypot_key;
  availability := v_b - 'slot_table_id'; slots := v_list;
  state := v_state; message := v_msg;
  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION custom.booking_manage(p_booking_ref text, p_days integer DEFAULT NULL::integer)
 RETURNS TABLE(booking_ref text, form_id uuid, title text, slot_key text, slot_at timestamp with time zone, status text, slots jsonb, availability jsonb, state text, message text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_s     custom.anon_submission;
  v_f     custom.anon_form;
  v_b     jsonb;
  v_slots uuid;
  v_doc   jsonb;
  v_taken jsonb;
  v_list  jsonb;
  v_key   text;
begin
  if p_booking_ref is null or btrim(p_booking_ref) = '' then return; end if;
  select * into v_s from custom.anon_submission sub where sub.booking_ref = p_booking_ref;
  if not found then return; end if;
  select * into v_f from custom.anon_form
   where organization_id = v_s.organization_id and id = v_s.form_id and deleted_at is null;
  if not found then return; end if;
  v_b := v_f.presentation -> 'booking';
  if v_b is null then return; end if;

  -- ── STORE-OFF. This is the person's OWN appointment, minted at confirm and mailed to
  -- them. Answering 404 told somebody who has an appointment that they have not got one.
  if not custom.store_is_open(v_s.organization_id) then
    booking_ref := p_booking_ref; form_id := v_f.id;
    title := coalesce(v_f.title, 'Your appointment');
    slot_key := null; slot_at := null; status := null;
    slots := '[]'::jsonb; availability := '{}'::jsonb;
    state := 'unavailable'; message := custom.store_off_sentence(v_s.organization_id);
    return next;
    return;
  end if;

  v_slots := (v_b ->> 'slot_table_id')::uuid;

  select r.data into v_doc from custom.record r
   where r.organization_id = v_s.organization_id and r.id = v_s.record_id and r.deleted_at is null;
  v_key := coalesce(v_doc ->> 'slot', v_s.payload ->> 'slot');

  select coalesce(jsonb_object_agg(r.data ->> 'slot_key', true), '{}'::jsonb) into v_taken
    from custom.record r
   where r.organization_id = v_s.organization_id
     and r.table_id = v_slots
     and r.deleted_at is null
     and coalesce((r.data ->> 'expires_at')::timestamptz, now()) > now();

  select coalesce(jsonb_agg(jsonb_build_object(
           'key', s.slot_key,
           'at', to_char(s.slot_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           -- THE PERSON'S OWN TIME IS NOT "TAKEN" TO THEM. Showing their own appointment
           -- greyed out beside a Reschedule button is a screen that says no to itself.
           'taken', coalesce((v_taken ->> s.slot_key)::boolean, false) and s.slot_key <> coalesce(v_key, ''),
           'mine', s.slot_key = coalesce(v_key, ''),
           'member_user_id', s.member_user_id) order by s.slot_key), '[]'::jsonb)
    into v_list
    from custom._booking_slots(v_b, p_days) s;

  booking_ref := p_booking_ref; form_id := v_f.id; title := coalesce(v_f.title, 'Your appointment');
  slot_key := v_key; slot_at := nullif(v_key, '')::timestamptz;
  status := coalesce(v_doc ->> 'status', 'booked');
  slots := v_list; availability := v_b - 'slot_table_id';
  state := case when coalesce(v_doc ->> 'status', 'booked') = 'cancelled' then 'cancelled'
                when v_doc is null then 'held'
                else 'booked' end;
  message := case when coalesce(v_doc ->> 'status', 'booked') = 'cancelled'
                  then 'This appointment was cancelled, so the time is free again.'
                  when v_doc is null
                  then 'Your details are still waiting for someone to confirm them, so there is nothing to move yet.'
                  else null end;
  return next;
end;
$function$
;

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
$function$
;

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
$function$
;

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

  -- ── TEXT REMINDERS for the new time, only if this booker consented on the booking page ──────────
  if p_event = 'moved' then
    v_out := v_out || jsonb_build_object('sms_reminders', custom._booking_sms_reminders(p_organization_id, p_form_id, p_record_id, p_submission_id));
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
$function$
;

drop function if exists custom._booking_seat_take(uuid, jsonb, text, text, interval);
drop function if exists custom._booking_offer(uuid, jsonb, integer, text);
drop function if exists custom.booking_busy_due(uuid);
drop function if exists custom.booking_busy_set(uuid, jsonb, text);
delete from platform.client_callable_door where schema_name = 'custom' and function_name in ('_booking_seat_take', '_booking_offer', 'booking_busy_due', 'booking_busy_set');
delete from platform.feature_knob where feature = 'booking' and key = 'busy_refresh_minutes';
delete from platform.metadata_reserved_keys where table_token = 'anon_submission' and key in ('seat_key', 'video_url');
