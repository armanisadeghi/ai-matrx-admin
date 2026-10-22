-- scripts/campaign-tests/bookingx_a_places_turns_video_busy_red_green.sql — CD-PAGE-10.
--
-- A booking page matches Calendly's core: a time takes as many bookings as it has places (capacity), a team page
-- hands its bookings to its hosts in turn (round robin), every booking carries a video room, and a time the owner's
-- connected calendar has busy is never offered or held. A throwaway organization, its table and its pages are made
-- inside ONE transaction that ends in ROLLBACK, so nothing is kept and nothing is sent.
--
-- RED before migrations/campaign/bookingx_a_a_booking_page_seats_takes_turns_carries_a_video_room_and_skips_busy_times.sql,
-- GREEN after. Each check prints GREEN or RED with its reason; the last line counts the REDs.

\set ON_ERROR_STOP on
\set suite 'bookingx_a_places_turns_video_busy_red_green.sql'
\set requires 'function:custom.organization_kernel_id'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif
begin;
set local lock_timeout = '10s';
set local statement_timeout = '90s';

do $suite$
declare
  c_admin   constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_member  constant uuid := '4060701e-706a-4c76-b3ca-0bbc69fa5a14';  -- test@test.com
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_boss    text := current_user;
  v_org     uuid := gen_random_uuid();
  v_home    uuid;
  v_table   uuid;
  v_made    jsonb;
  v_class   uuid;   -- a class: one host, three places, a new video room per booking
  v_team    uuid;   -- a team page: two hosts, one place each, the owner's own room
  v_busy    uuid;   -- a page connected to a calendar
  v_key     text;
  v_key2    text;
  v_row     record;
  v_refs    text[] := '{}';
  v_who     uuid[] := '{}';
  v_n       integer;
  v_txt     text;
  v_j       jsonb;
  v_reds    integer := 0;
  v_windows jsonb := (select jsonb_agg(jsonb_build_object('weekday', d, 'from', '00:00', 'to', '23:30')) from generate_series(0, 6) d);
  i         integer;
begin
  insert into iam.organizations (id, name, slug, created_by)
  values (v_org, 'Harbor Yoga ' || left(v_org::text, 8), 'harbor-yoga-' || left(v_org::text, 8), c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status, created_by)
  values (v_org, 'organization', v_org, c_admin, 'owner', 'active', c_admin),
         (v_org, 'organization', v_org, c_member, 'member', 'active', c_admin);
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note, updated_by)
  values ('custom', 'system_enabled', 'organization', v_org, v_org, 'true'::jsonb, 'bookingx_a red/green', c_admin);

  perform set_config('app.actor_system', 'campaign-test/bookingx_a', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  perform set_config('role', 'authenticated', true);
  v_home := custom.record_write(v_org, custom.organization_kernel_id(),
              jsonb_build_object('name', 'Studio', 'description', 'the suite''s home', '_actor', 'user'));
  v_table := custom.table_declare(v_org, jsonb_build_object(
      'name', 'Classes', 'slug', 'classes', 'description', 'the suite''s table', 'type', 'entity', 'display', 'list',
      'ordered', false, 'weight', 'light', 'retention_days', 30, 'row_order', 'sorted',
      'default_sort', jsonb_build_array(jsonb_build_object('field', 'full_name', 'direction', 'asc')),
      'agent_writable', true, 'label_singular', 'Class', 'label_plural', 'Classes', 'title_field', 'full_name',
      'fields', jsonb_build_array(jsonb_build_object('name', 'full_name'), jsonb_build_object('name', 'email')), 'parent_id', v_home));
  perform custom.field_declare(v_org, v_table, jsonb_build_object('label', 'full name', 'key', 'full_name', 'type', 'text', 'required', true));
  perform custom.field_declare(v_org, v_table, jsonb_build_object('label', 'email', 'key', 'email', 'type', 'text', 'required', true));

  -- ══ 0. THE OWNER'S WORDS ARE JUDGED ═══════════════════════════════════════════════════════════════
  begin
    begin
      perform custom.booking_declare(v_org, v_table, 'Bad', jsonb_build_array(jsonb_build_object('field', 'full_name', 'required', true)),
        jsonb_build_object('capacity', 0, 'windows', v_windows), '{}'::jsonb, null, null, null, null, null, v_home);
      raise exception 'capacity 0 was accepted';
    exception when sqlstate '22023' then
      if sqlerrm not like '%places at one time%' then raise exception 'capacity 0 refused as: %', sqlerrm; end if;
    end;
    begin
      perform custom.booking_declare(v_org, v_table, 'Bad', jsonb_build_array(jsonb_build_object('field', 'full_name', 'required', true)),
        jsonb_build_object('video', 'link', 'video_url', 'zoom.us/j/1', 'windows', v_windows), '{}'::jsonb, null, null, null, null, null, v_home);
      raise exception 'a room with no https address was accepted';
    exception when sqlstate '22023' then
      if sqlerrm not like '%https://%' then raise exception 'the room refused as: %', sqlerrm; end if;
    end;
    raise notice 'GREEN 0 the owner''s places, video room and calendar address are judged in words';
  exception when others then v_reds := v_reds + 1; raise notice 'RED   0 the owner''s places, video room and calendar address are judged in words — %', sqlerrm;
  end;

  -- The three pages (made the old way when the file is not applied: unknown keys are dropped).
  v_made := custom.booking_declare(v_org, v_table, 'Book a sunrise class',
      jsonb_build_array(jsonb_build_object('field', 'full_name', 'required', true), jsonb_build_object('field', 'email', 'required', true)),
      jsonb_build_object('timezone', 'America/Los_Angeles', 'slot_minutes', 60, 'lead_minutes', 0, 'max_per_day', 20, 'days', 3,
                         'capacity', 3, 'video', 'auto', 'windows', v_windows),
      '{}'::jsonb, null, null, null, null, null, v_home);
  v_class := (v_made ->> 'form_id')::uuid;
  perform custom.anon_publish(v_org, v_class, true);
  v_made := custom.booking_declare(v_org, v_table, 'Book an intro call',
      jsonb_build_array(jsonb_build_object('field', 'full_name', 'required', true), jsonb_build_object('field', 'email', 'required', true)),
      jsonb_build_object('timezone', 'America/Los_Angeles', 'slot_minutes', 30, 'lead_minutes', 0, 'max_per_day', 40, 'days', 3,
                         'video', 'link', 'video_url', 'https://meet.example.org/harbor-yoga',
                         'windows', (select jsonb_agg(w || jsonb_build_object('member_user_id', m))
                                       from jsonb_array_elements(v_windows) w, unnest(array[c_admin, c_member]) m)),
      '{}'::jsonb, null, null, null, null, null, v_home);
  v_team := (v_made ->> 'form_id')::uuid;
  perform custom.anon_publish(v_org, v_team, true);
  begin
    v_made := custom.booking_declare(v_org, v_table, 'Book a private session',
        jsonb_build_array(jsonb_build_object('field', 'full_name', 'required', true), jsonb_build_object('field', 'email', 'required', true)),
        jsonb_build_object('timezone', 'America/Los_Angeles', 'slot_minutes', 60, 'lead_minutes', 0, 'max_per_day', 20, 'days', 3,
                           'busy_feed', 'webcal://calendar.example.org/private-4f2a/basic.ics', 'windows', v_windows),
        '{}'::jsonb, null, null, null, null, null, v_home);
    v_busy := (v_made ->> 'form_id')::uuid;
    perform custom.anon_publish(v_org, v_busy, true);
  exception when others then v_busy := null;
  end;

  perform set_config('role', v_boss, true);   -- the app's server lane from here on
  perform set_config('request.jwt.claims', '', true);

  -- ══ 1. A TIME WITH THREE PLACES TAKES THREE BOOKINGS AND REFUSES A FOURTH ═══════════════════════════════
  begin
    select s ->> 'key' into v_key from custom.booking_public(v_class, 3) b, jsonb_array_elements(b.slots) s
     where not (s ->> 'taken')::boolean order by 1 desc limit 1;
    for i in 1 .. 3 loop
      select * into v_row from custom.booking_hold(v_class, v_key, 'https://s.test', 'class-' || i, null);
      if v_row.state <> 'held' then raise exception 'booking % of 3 was %: %', i, v_row.state, v_row.message; end if;
      select * into v_row from custom.booking_confirm(v_class, v_row.hold_id, 'https://s.test',
        jsonb_build_object('full_name', 'Student ' || i, 'email', 'student' || i || '@harbor-yoga.test'), 'class-' || i, null, 'ck-class-' || i);
      if v_row.state <> 'booked' then raise exception 'booking % of 3 confirmed as %: %', i, v_row.state, v_row.message; end if;
      if v_row.slot_key <> v_key then raise exception 'booking % carries the time % (asked %)', i, v_row.slot_key, v_key; end if;
      v_refs := v_refs || v_row.booking_ref;
    end loop;
    select * into v_row from custom.booking_hold(v_class, v_key, 'https://s.test', 'class-4', null);
    if v_row.state <> 'taken' then raise exception 'a fourth person was %', v_row.state; end if;
    raise notice 'GREEN 1 a time with three places takes three bookings and refuses a fourth';
  exception when others then v_reds := v_reds + 1; raise notice 'RED   1 a time with three places takes three bookings and refuses a fourth — %', sqlerrm;
  end;

  -- ══ 2. THE PAGE LISTS THE TIME ONCE, WITH ITS PLACES ══════════════════════════════════════════════════
  begin
    select count(*) into v_n from custom.booking_public(v_class, 3) b, jsonb_array_elements(b.slots) s where s ->> 'key' = v_key;
    if v_n <> 1 then raise exception 'the time is listed % times', v_n; end if;
    select s into v_j from custom.booking_public(v_class, 3) b, jsonb_array_elements(b.slots) s where s ->> 'key' = v_key;
    if not (v_j ->> 'taken')::boolean or (v_j ->> 'seats')::integer is distinct from 3 or (v_j ->> 'left')::integer is distinct from 0 then
      raise exception 'the full time reads %', v_j;
    end if;
    select s into v_j from custom.booking_public(v_class, 3) b, jsonb_array_elements(b.slots) s where s ->> 'key' < v_key order by s ->> 'key' desc limit 1;
    if (v_j ->> 'left')::integer is distinct from 3 then raise exception 'an empty time reads %', v_j; end if;
    raise notice 'GREEN 2 the page lists each time once, with its places and how many are left';
  exception when others then v_reds := v_reds + 1; raise notice 'RED   2 the page lists each time once, with its places and how many are left — %', sqlerrm;
  end;

  -- ══ 3. EVERY BOOKING CARRIES A VIDEO ROOM, IN ITS CONFIRMATION AND ITS CALENDAR FILE ═══════════════════
  begin
    select s.metadata ->> 'video_url' into v_txt from custom.anon_submission s where s.booking_ref = v_refs[1];
    if v_txt is null or v_txt not like 'https://meet.jit.si/AIMatrx-%' then raise exception 'the room is %', v_txt; end if;
    if (select count(distinct s.metadata ->> 'video_url') from custom.anon_submission s where s.booking_ref = any (v_refs)) <> 3 then
      raise exception 'three bookings did not get three rooms';
    end if;
    select n.payload -> 'notice' ->> 'body', n.metadata into v_txt, v_j from communication.notification n
     where n.organization_id = v_org and n.dedupe_key = format('booking:%s:confirmed:email', v_refs[1]);
    if v_txt is null or v_txt not like '%Join by video: https://meet.jit.si/AIMatrx-%' then raise exception 'the confirmation says: %', v_txt; end if;
    if convert_from(decode(v_j #>> '{email_attachments,0,content_base64}', 'base64'), 'UTF8') not like '%meet.jit.si%' then
      raise exception 'the calendar file has no room';
    end if;
    raise notice 'GREEN 3 every booking carries a video room, in its confirmation and its calendar file';
  exception when others then v_reds := v_reds + 1; raise notice 'RED   3 every booking carries a video room, in its confirmation and its calendar file — %', sqlerrm;
  end;

  -- ══ 4. A TEAM PAGE HANDS ITS BOOKINGS TO ITS HOSTS IN TURN ═══════════════════════════════════════════
  begin
    select s ->> 'key' into v_key2 from custom.booking_public(v_team, 3) b, jsonb_array_elements(b.slots) s
     where not (s ->> 'taken')::boolean order by 1 desc limit 1;
    select count(*) into v_n from custom.booking_public(v_team, 3) b, jsonb_array_elements(b.slots) s where s ->> 'key' = v_key2;
    if v_n <> 1 then raise exception 'a time two hosts share is listed % times', v_n; end if;
    for i in 1 .. 2 loop
      select * into v_row from custom.booking_hold(v_team, v_key2, 'https://s.test', 'team-' || i, null);
      if v_row.state <> 'held' then raise exception 'the % booking at a time two hosts share was %', i, v_row.state; end if;
      v_who := v_who || v_row.member_user_id;
      select * into v_row from custom.booking_confirm(v_team, v_row.hold_id, 'https://s.test',
        jsonb_build_object('full_name', 'Caller ' || i, 'email', 'caller' || i || '@harbor-yoga.test'), 'team-' || i, null, 'ck-team-' || i);
      if v_row.state <> 'booked' then raise exception 'team booking % confirmed as %', i, v_row.state; end if;
      select (r.data ->> 'booked_with') into v_txt from custom.record r where r.id = v_row.record_id;
      if v_txt is distinct from v_who[i]::text then raise exception 'booking % is with % but its place was %', i, v_txt, v_who[i]; end if;
    end loop;
    if v_who[1] is null or v_who[2] is null or v_who[1] = v_who[2] then raise exception 'the two bookings went to % and %', v_who[1], v_who[2]; end if;
    select * into v_row from custom.booking_hold(v_team, v_key2, 'https://s.test', 'team-3', null);
    if v_row.state <> 'taken' then raise exception 'a third booking with both hosts busy was %', v_row.state; end if;
    select s.metadata ->> 'video_url' into v_txt from custom.anon_submission s where s.form_id = v_team and s.booking_ref is not null limit 1;
    if v_txt is distinct from 'https://meet.example.org/harbor-yoga' then raise exception 'the owner''s room is %', v_txt; end if;
    raise notice 'GREEN 4 a team page hands its bookings to its hosts in turn, in the owner''s own room';
  exception when others then v_reds := v_reds + 1; raise notice 'RED   4 a team page hands its bookings to its hosts in turn, in the owner''s own room — %', sqlerrm;
  end;

  -- ══ 5. A CANCEL LETS GO OF THAT BOOKING'S OWN PLACE; A MOVE TAKES A PLACE AT THE NEW TIME ═════════════
  begin
    select * into v_row from custom.booking_cancel(v_refs[2], 'https://s.test');
    if v_row.state <> 'cancelled' then raise exception 'the cancel said %', v_row.state; end if;
    select s into v_j from custom.booking_public(v_class, 3) b, jsonb_array_elements(b.slots) s where s ->> 'key' = v_key;
    if (v_j ->> 'left')::integer is distinct from 1 then raise exception 'after a cancel the time reads %', v_j; end if;
    select s ->> 'key' into v_txt from custom.booking_public(v_class, 3) b, jsonb_array_elements(b.slots) s
     where s ->> 'key' < v_key order by s ->> 'key' desc limit 1;
    select * into v_row from custom.booking_reschedule(v_refs[3], v_txt, 'https://s.test', null);
    if v_row.state <> 'moved' then raise exception 'the move said %: %', v_row.state, v_row.message; end if;
    select s into v_j from custom.booking_public(v_class, 3) b, jsonb_array_elements(b.slots) s where s ->> 'key' = v_key;
    if (v_j ->> 'left')::integer is distinct from 2 then raise exception 'after a move the old time reads %', v_j; end if;
    select s into v_j from custom.booking_public(v_class, 3) b, jsonb_array_elements(b.slots) s where s ->> 'key' = v_txt;
    if (v_j ->> 'left')::integer is distinct from 2 then raise exception 'after a move the new time reads %', v_j; end if;
    select s into v_j from custom.booking_manage(v_refs[3], 3) m, jsonb_array_elements(m.slots) s where s ->> 'key' = v_txt;
    if not (v_j ->> 'mine')::boolean or (v_j ->> 'taken')::boolean then raise exception 'her own new time reads % to her', v_j; end if;
    raise notice 'GREEN 5 a cancel frees that booking''s own place; a move takes a place at the new time';
  exception when others then v_reds := v_reds + 1; raise notice 'RED   5 a cancel frees that booking''s own place; a move takes a place at the new time — %', sqlerrm;
  end;

  -- ══ 6. A TIME THE CONNECTED CALENDAR HAS BUSY IS NEVER OFFERED, AND THE ADDRESS NEVER REACHES A BROWSER ══
  begin
    if v_busy is null then raise exception 'a page with a calendar address could not be made'; end if;
    select b.feed into v_txt from custom.booking_busy_due(v_busy) b;
    if v_txt is distinct from 'https://calendar.example.org/private-4f2a/basic.ics' then raise exception 'the server reads the address as %', v_txt; end if;
    select s ->> 'key' into v_key from custom.booking_public(v_busy, 3) b, jsonb_array_elements(b.slots) s order by 1 desc limit 1;
    perform custom.booking_busy_set(v_busy, jsonb_build_array(jsonb_build_object('from', v_key::timestamptz - interval '15 minutes', 'to', v_key::timestamptz + interval '15 minutes')), null);
    if exists (select 1 from custom.booking_public(v_busy, 3) b, jsonb_array_elements(b.slots) s where s ->> 'key' = v_key) then
      raise exception 'a busy time is still offered';
    end if;
    select * into v_row from custom.booking_hold(v_busy, v_key, 'https://s.test', 'busy-1', null);
    if v_row.state <> 'not_offered' then raise exception 'a busy time was held (%)', v_row.state; end if;
    if (select b.due from custom.booking_busy_due(v_busy) b) then raise exception 'a calendar just read is due again'; end if;
    select b.presentation::text || b.availability::text into v_txt from custom.booking_public(v_busy, 3) b;
    if v_txt like '%calendar.example.org%' or v_txt like '%"busy"%' then raise exception 'the public page carries the calendar: %', left(v_txt, 200); end if;
    raise notice 'GREEN 6 a time the connected calendar has busy is never offered, and its address never reaches a browser';
  exception when others then v_reds := v_reds + 1; raise notice 'RED   6 a time the connected calendar has busy is never offered, and its address never reaches a browser — %', sqlerrm;
  end;

  raise notice '% RED', v_reds;
end
$suite$;

rollback;
