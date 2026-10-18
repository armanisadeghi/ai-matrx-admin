-- scripts/campaign-tests/booking_notify_green.sql — lane BOOKING-NOTIFY.
--
-- A booking page tells people what happened: the booker gets a confirmation (with a calendar
-- file), reminders at 24h and 1h before (one durable row each, due-dated — no sweep), a moved
-- notice and a cancelled notice; the host is told; the page's knobs change the words and switch
-- a notice off. Runs the real doors the real way and ends in ROLLBACK, so nothing is sent.
--
-- RED before migrations/campaign/booking_notify_a_booker_is_told_what_happened.sql, GREEN after.

\set ON_ERROR_STOP on
\set suite 'booking_notify_green.sql'
\set requires 'function:custom.organization_kernel_id'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $suite$
declare
  c_admin   constant uuid := '87a6e699-3622-4869-8843-d0867456c0dd';
  c_admin_j constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated"}';
  v_boss    text := current_user;
  v_org     uuid := gen_random_uuid();
  v_home    uuid;
  v_table   uuid;
  v_made    jsonb;
  v_form    uuid;
  v_form2   uuid;
  v_key     text;
  v_key2    text;
  v_hold    uuid;
  v_ref     text;
  v_row     record;
  v_n       integer;
  v_t       timestamptz;
  v_body    text;
  v_meta    jsonb;
  v_status  text;
  v_code    text;
begin
  insert into iam.organizations (id, name, slug, created_by)
  values (v_org, 'Notify Yoga ' || left(v_org::text, 8), 'notify-yoga-' || left(v_org::text, 8), c_admin);
  insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status, created_by)
  values (v_org, 'organization', v_org, c_admin, 'owner', 'active', c_admin);
  insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note, updated_by)
  values ('custom', 'system_enabled', 'organization', v_org, v_org, 'true'::jsonb, 'booking_notify_green.sql', c_admin);

  perform set_config('app.actor_system', 'campaign-test/booking_notify_green.sql', true);
  perform set_config('request.jwt.claims', c_admin_j, true);
  perform set_config('role', 'authenticated', true);

  v_home := custom.record_write(v_org, custom.organization_kernel_id(),
              jsonb_build_object('name', 'Studio', 'description', 'the suite''s home', '_actor', 'user'));
  v_table := custom.table_declare(v_org, jsonb_build_object(
      'name', 'Classes', 'slug', 'classes', 'description', 'the suite''s table',
      'type', 'entity', 'display', 'list', 'ordered', false, 'weight', 'light',
      'retention_days', 30, 'row_order', 'sorted',
      'default_sort', jsonb_build_array(jsonb_build_object('field', 'full_name', 'direction', 'asc')),
      'agent_writable', true, 'label_singular', 'Class', 'label_plural', 'Classes',
      'title_field', 'full_name',
      'fields', jsonb_build_array(jsonb_build_object('name', 'full_name'), jsonb_build_object('name', 'email')),
      'parent_id', v_home));
  perform custom.field_declare(v_org, v_table, jsonb_build_object('label', 'full name', 'key', 'full_name', 'type', 'text', 'required', true));
  perform custom.field_declare(v_org, v_table, jsonb_build_object('label', 'email', 'key', 'email', 'type', 'text', 'required', true));

  -- Page 1: every default (no booking_messages at all). Slots two days out, so 24h and 1h both fit.
  v_made := custom.booking_declare(v_org, v_table, 'Book a yoga class',
      jsonb_build_array(jsonb_build_object('field', 'full_name', 'required', true),
                        jsonb_build_object('field', 'email', 'required', true)),
      jsonb_build_object('timezone', 'America/Los_Angeles', 'slot_minutes', 30, 'lead_minutes', 0,
                         'max_per_day', 20, 'days', 3,
                         'windows', (select jsonb_agg(jsonb_build_object('weekday', d, 'from', '00:00', 'to', '23:30')) from generate_series(0, 6) d)),
      '{}'::jsonb, null, null, null, null, null, v_home);
  v_form := (v_made ->> 'form_id')::uuid;
  perform custom.anon_publish(v_org, v_form, true);

  -- Page 2: the knobs — confirmation worded by the owner, reminders at 3 hours only, host off.
  v_made := custom.booking_declare(v_org, v_table, 'Book a private session',
      jsonb_build_array(jsonb_build_object('field', 'full_name', 'required', true),
                        jsonb_build_object('field', 'email', 'required', true)),
      jsonb_build_object('timezone', 'America/Los_Angeles', 'slot_minutes', 30, 'lead_minutes', 0,
                         'max_per_day', 20, 'days', 3,
                         'windows', (select jsonb_agg(jsonb_build_object('weekday', d, 'from', '00:00', 'to', '23:30')) from generate_series(0, 6) d)),
      jsonb_build_object('booking_messages', jsonb_build_object(
          'confirmation', jsonb_build_object('subject', 'See you, {{booker.name}}', 'body', 'Hello {{booker.name}}, we have you down for {{time}}. {{nonsense}}'),
          'reminders', jsonb_build_object('offsets', jsonb_build_array(180)),
          'host', jsonb_build_object('on', false))),
      null, null, null, null, null, v_home);
  v_form2 := (v_made ->> 'form_id')::uuid;
  perform custom.anon_publish(v_org, v_form2, true);

  -- ══ PAGE 1 ══════════════════════════════════════════════════════════════════════
  perform set_config('role', v_boss, true);   -- server lane by declaration
  if not (select presentation ? 'booking_messages' from custom.anon_form where id = v_form2) then
    raise exception 'K0: the page did not keep its booking_messages knobs';
  end if;
  select s ->> 'key' into v_key from custom.booking_public(v_form, 3) b, jsonb_array_elements(b.slots) s
   where not (s ->> 'taken')::boolean order by 1 desc limit 1;
  select s ->> 'key' into v_key2 from custom.booking_public(v_form, 3) b, jsonb_array_elements(b.slots) s
   where not (s ->> 'taken')::boolean and s ->> 'key' < v_key order by 1 desc limit 1;
  select * into v_row from custom.booking_hold(v_form, v_key, 'https://s.test', 'b1', null);
  v_hold := v_row.hold_id;
  select * into v_row from custom.booking_confirm(v_form, v_hold, 'https://s.test', jsonb_build_object('full_name', 'Tess Test', 'email', 'test@test.com'), 'b1', null, 'ck1');
  if v_row.state <> 'booked' then raise exception 'setup: confirm said % (%)', v_row.state, v_row.message; end if;
  v_ref := v_row.booking_ref;

  -- 1. THE CONFIRMATION: an email to the address the booker typed, with words, a manage link and a calendar file.
  select n.payload -> 'notice' ->> 'body', n.metadata, n.deep_link, n.status
    into v_body, v_meta, v_code, v_status
    from communication.notification n
   where n.organization_id = v_org and n.dedupe_key = format('booking:%s:confirmed:email', v_ref);
  if v_status is null then raise exception '1: no confirmation email was queued for the booker'; end if;
  if v_status <> 'render_pending' then raise exception '1: the confirmation is % — expected render_pending', v_status; end if;
  if v_body not like '%Tess Test%' or v_body not like '%calendar.google.com%' then
    raise exception '1: the confirmation words are wrong: %', v_body;
  end if;
  if v_code not like '/b/manage/' || v_ref || '%' then raise exception '1: the manage link is %', v_code; end if;
  if jsonb_array_length(v_meta -> 'email_attachments') <> 1
     or v_meta #>> '{email_attachments,0,filename}' <> 'appointment.ics' then
    raise exception '1: the calendar file is not on the email';
  end if;
  if convert_from(decode(v_meta #>> '{email_attachments,0,content_base64}', 'base64'), 'UTF8') not like 'BEGIN:VCALENDAR%METHOD:PUBLISH%' then
    raise exception '1: the attachment is not a calendar file';
  end if;
  if (select to_address from communication.notification where organization_id = v_org
       and dedupe_key = format('booking:%s:confirmed:email', v_ref)) <> 'test@test.com' then
    raise exception '1: the confirmation did not go to the address the booker typed';
  end if;
  raise notice 'TEST 1 PASSED — confirmation queued with calendar file and manage link';

  -- 2. THE REMINDERS: one durable row per offset, due at start minus the offset. No schedule.
  select count(*) into v_n from communication.notification
   where organization_id = v_org and dedupe_key like format('booking:%s:remind:%%:email', v_ref) and status = 'render_pending';
  if v_n <> 2 then raise exception '2: expected 2 reminder rows (24h, 1h), found %', v_n; end if;
  select n.next_attempt_at into v_t from communication.notification n
   where n.organization_id = v_org and n.dedupe_key = format('booking:%s:remind:1440:%s:email', v_ref, v_key);
  if v_t is distinct from v_key::timestamptz - interval '24 hours' then
    raise exception '2: the 24h reminder is due % — expected %', v_t, v_key::timestamptz - interval '24 hours';
  end if;
  select n.next_attempt_at into v_t from communication.notification n
   where n.organization_id = v_org and n.dedupe_key = format('booking:%s:remind:60:%s:email', v_ref, v_key);
  if v_t is distinct from v_key::timestamptz - interval '1 hour' then
    raise exception '2: the 1h reminder is due %', v_t;
  end if;
  raise notice 'TEST 2 PASSED — reminders due 24h and 1h before, one row each';

  -- 3. THE HOST is told (no notify Rule on this page): the person who published it.
  select count(*) into v_n from communication.notification
   where organization_id = v_org and event_key = 'custom.booking.made' and recipient_user_id = c_admin
     and dedupe_key like format('booking:%s:host:booked:%%', v_ref);
  if v_n < 1 then raise exception '3: the host was not told of the booking'; end if;
  -- THE HOST'S EMAIL has an address (a user recipient has no literal; the producer must look it up),
  -- or it is a named skip and the host hears only in AI Matrx.
  if not exists (select 1 from communication.notification
                  where organization_id = v_org and event_key = 'custom.booking.made' and channel = 'email'
                    and recipient_user_id = c_admin and status = 'render_pending' and to_address is not null
                    and dedupe_key like format('booking:%s:host:booked:%%', v_ref)) then
    raise exception '3: the host''s email was not queued with an address';
  end if;
  raise notice 'TEST 3 PASSED — host told (% channel rows)', v_n;

  -- 4. A MOVE: old reminders are ended, the booker is told the new time, new reminders are due.
  select * into v_row from custom.booking_reschedule(v_ref, v_key2, 'https://s.test', 'b1');
  if v_row.state <> 'moved' then raise exception '4: reschedule said % (%)', v_row.state, v_row.message; end if;
  select count(*) into v_n from communication.notification
   where organization_id = v_org and dedupe_key like format('booking:%s:remind:%%:%s:email', v_ref, v_key)
     and status = 'skipped' and error_code = 'booking_changed';
  if v_n <> 2 then raise exception '4: the old reminders were not ended (% skipped)', v_n; end if;
  select count(*) into v_n from communication.notification
   where organization_id = v_org and dedupe_key like format('booking:%s:remind:%%:%s:email', v_ref, v_key2)
     and status = 'render_pending';
  if v_n < 1 then raise exception '4: no reminders were queued for the new time'; end if;
  select n.metadata, n.payload -> 'notice' ->> 'body' into v_meta, v_body from communication.notification n
   where n.organization_id = v_org and n.dedupe_key = format('booking:%s:moved:%s:email', v_ref, v_key2);
  if v_meta is null or v_body not like '%was moved%' then raise exception '4: no moved notice for the booker'; end if;
  raise notice 'TEST 4 PASSED — moved: old reminders ended, new ones due, booker told';

  -- 5. A CANCEL: reminders ended, booker gets a CANCEL calendar file.
  select * into v_row from custom.booking_cancel(v_ref, 'https://s.test');
  if v_row.state <> 'cancelled' then raise exception '5: cancel said % (%)', v_row.state, v_row.message; end if;
  select count(*) into v_n from communication.notification
   where organization_id = v_org and dedupe_key like format('booking:%s:remind:%%', v_ref) and status in ('render_pending', 'pending');
  if v_n <> 0 then raise exception '5: % reminders still waiting after the cancel', v_n; end if;
  select n.metadata into v_meta from communication.notification n
   where n.organization_id = v_org and n.dedupe_key = format('booking:%s:cancelled:email', v_ref);
  if v_meta is null or convert_from(decode(v_meta #>> '{email_attachments,0,content_base64}', 'base64'), 'UTF8') not like '%METHOD:CANCEL%' then
    raise exception '5: no cancel notice with a CANCEL calendar file';
  end if;
  raise notice 'TEST 5 PASSED — cancelled: reminders ended, booker told with a CANCEL file';

  -- ══ PAGE 2: THE KNOBS ═══════════════════════════════════════════════════════════
  select s ->> 'key' into v_key from custom.booking_public(v_form2, 3) b, jsonb_array_elements(b.slots) s
   where not (s ->> 'taken')::boolean order by 1 desc limit 1;
  select * into v_row from custom.booking_hold(v_form2, v_key, 'https://s.test', 'b2', null);
  select * into v_row from custom.booking_confirm(v_form2, v_row.hold_id, 'https://s.test', jsonb_build_object('full_name', 'Kay Knobs', 'email', 'test@test.com'), 'b2', null, 'ck2');
  v_ref := v_row.booking_ref;
  select n.payload -> 'notice' ->> 'subject', n.payload -> 'notice' ->> 'body' into v_code, v_body
    from communication.notification n
   where n.organization_id = v_org and n.dedupe_key = format('booking:%s:confirmed:email', v_ref);
  if v_code <> 'See you, Kay Knobs' then raise exception '6: the owner''s subject was not used: %', v_code; end if;
  if v_body not like 'Hello Kay Knobs, we have you down for %' or v_body like '%{{%' then
    raise exception '6: the owner''s words were not filled / a stray merge field leaked: %', v_body;
  end if;
  select count(*) into v_n from communication.notification
   where organization_id = v_org and dedupe_key like format('booking:%s:remind:%%:email', v_ref);
  if v_n <> 1 or not exists (select 1 from communication.notification where organization_id = v_org
        and dedupe_key = format('booking:%s:remind:180:%s:email', v_ref, v_key)) then
    raise exception '6: the 3-hour reminder knob was not honoured (% reminder rows)', v_n;
  end if;
  select count(*) into v_n from communication.notification
   where organization_id = v_org and event_key = 'custom.booking.made' and dedupe_key like format('booking:%s:host:%%', v_ref);
  if v_n <> 0 then raise exception '6: the host was told although the page switched that off'; end if;
  raise notice 'TEST 6 PASSED — owner words, filled tokens, 3h reminder, host off';

  raise notice 'booking_notify_green.sql: ALL PASSED';
end
$suite$;
rollback;
