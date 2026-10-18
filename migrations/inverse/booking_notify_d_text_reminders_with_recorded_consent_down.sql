-- chair-step: the inverse of booking_notify_d_text_reminders_with_recorded_consent.sql — restores the SMS gate and custom._booking_messages as part c left them and drops the consent door, the text-reminder producer and the text event type. Consent rows already recorded are kept.
-- lane: BOOKING-NOTIFY
-- lock: custom,communication

set local lock_timeout = '2s';
set local statement_timeout = '60s';

CREATE OR REPLACE FUNCTION communication.sms_notification_gate(p_notification_id uuid, p_now timestamp with time zone DEFAULT now())
 RETURNS TABLE(decision text, refusal text, defer_until timestamp with time zone, resolved_timezone text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_n         communication.notification%rowtype;
  v_number    text;
  v_tz        text;
  v_tz_src    text;
  v_cand      text;
  v_sender    uuid;
  v_windows   jsonb;
  v_w         record;
  v_config    jsonb;
  v_exempt    boolean;
  v_mandatory boolean;
  v_sup       timestamptz;
  v_uns       timestamptz;
  v_dnc       text;
  v_qh_start  time;
  v_qh_end    time;
  v_local_now timestamp;
  v_probe     timestamp;
  v_probe_t   time;
  v_end_at    timestamp;
  v_moved     boolean;
  v_i         integer;
  v_max_hour  integer;
  v_max_day   integer;
  v_count     integer;
  v_day_start timestamptz;
  v_day_end   timestamptz;
begin
  select * into v_n from communication.notification where id = p_notification_id;
  if not found then
    return query select 'skip'::text, 'unknown_notification'::text, null::timestamptz, null::text;
    return;
  end if;

  v_number := nullif(btrim(coalesce(v_n.to_address, '')), '');
  if v_number is null then
    return query select 'skip'::text, 'no_address'::text, null::timestamptz, null::text;
    return;
  end if;

  ---------------------------------------------------------------- SUPPRESSION (terminal)
  -- crm.contact_medium is THE ONE suppression store. See the header.
  select cm.suppressed_at, cm.unsubscribed_at, cm.dnc_state
    into v_sup, v_uns, v_dnc
    from crm.contact_medium cm
   where cm.organization_id = v_n.organization_id
     and cm.channel = 'phone'
     and cm.value_key = v_number
     and cm.deleted_at is null
   order by cm.updated_at desc
   limit 1;
  if v_uns is not null then
    return query select 'skip'::text, 'opted_out'::text, null::timestamptz, null::text;
    return;
  elsif v_sup is not null then
    return query select 'skip'::text, 'suppressed'::text, null::timestamptz, null::text;
    return;
  elsif v_dnc = 'listed' then
    return query select 'skip'::text, 'dnc'::text, null::timestamptz, null::text;
    return;
  end if;

  ---------------------------------------------------------------- CONSENT (terminal)
  -- Keyed (phone_number, consent_type) GLOBALLY — §3.5: consent is per number, not per org.
  -- Personal Staff is its own program with its own consent row (consent_type 'ai_agent').
  -- A number with no ai_agent row at all enrolled before the split and keeps its legacy
  -- notifications consent; an ai_agent row, once present, is the only answer.
  if v_n.event_key like 'personal_staff.%' then
    if exists (
      select 1 from communication.sms_consent c
       where c.phone_number = v_number
         and c.consent_type in ('all', 'ai_agent')
         and c.status = 'opted_out'
         and c.deleted_at is null
    ) then
      return query select 'skip'::text, 'opted_out'::text, null::timestamptz, null::text;
      return;
    end if;
    if not exists (
      select 1 from communication.sms_consent c
       where c.phone_number = v_number
         and c.consent_type = 'ai_agent'
         and c.status = 'opted_in'
         and c.deleted_at is null
    ) and (
      exists (
        select 1 from communication.sms_consent c
         where c.phone_number = v_number
           and c.consent_type = 'ai_agent'
           and c.deleted_at is null
      ) or not exists (
        select 1 from communication.sms_consent c
         where c.phone_number = v_number
           and c.consent_type in ('all', 'notifications')
           and c.status = 'opted_in'
           and c.deleted_at is null
      )
    ) then
      return query select 'skip'::text, 'not_consented'::text, null::timestamptz, null::text;
      return;
    end if;
  elsif exists (
    select 1 from communication.sms_consent c
     where c.phone_number = v_number
       and c.consent_type in ('all', 'notifications')
       and c.status = 'opted_out'
       and c.deleted_at is null
  ) then
    return query select 'skip'::text, 'opted_out'::text, null::timestamptz, null::text;
    return;
  elsif v_n.event_key = 'workflow.message' and not exists (
    -- 🚨 A WORKFLOW TEXT NEEDS CONSENT GIVEN TO THE SENDING ORGANIZATION (lane 11). Agreeing
    -- to one organization's texts is not agreeing to every organization's.
    select 1 from communication.sms_consent c
     where c.phone_number = v_number
       and c.organization_id = v_n.organization_id
       and c.consent_type in ('all', 'notifications')
       and c.status = 'opted_in'
       and c.deleted_at is null
  ) then
    return query select 'skip'::text, 'not_consented_for_organization'::text, null::timestamptz, null::text;
    return;
  elsif not exists (
    select 1 from communication.sms_consent c
     where c.phone_number = v_number
       and c.consent_type in ('all', 'notifications')
       and c.status = 'opted_in'
       and c.deleted_at is null
  ) then
    -- "Employment is not consent." Absent or pending is a terminal skip with a reason.
    return query select 'skip'::text, 'not_consented'::text, null::timestamptz, null::text;
    return;
  end if;

  ---------------------------------------------------------------- the event's own flags
  select t.config into v_config
    from communication.notification_event_type t
   where t.event_key = v_n.event_key;
  v_exempt    := coalesce((v_config ->> 'quiet_hours_exempt')::boolean, false);
  v_mandatory := coalesce((v_config ->> 'mandatory')::boolean, false);

  ---------------------------------------------------------------- THE PERSON'S WINDOW
  -- 0998: the quiet window and the clock it is read on come from the PERSON, through
  -- the one ladder. What used to be inlined here could only see the org-scoped row.
  select w.timezone, w.timezone_source, w.quiet_windows
    into v_tz, v_tz_src, v_windows
    from communication.person_notification_window(
           v_n.recipient_user_id, v_n.organization_id, 'sms') w;

  -- SMS-SPARES (2026-10-16): THE LADDER NEVER ENDS ON RAW UTC. The person's own ladder (and the
  -- organization's default_timezone, its last rung) found no clock; the recipient may have no
  -- person record at all (a number typed into a Workflow text). The next clock is the SENDER's:
  -- the person who started the notice, through the same ladder. Then the platform default knob.
  if v_tz is null then
    v_sender := coalesce(
      v_n.created_by,
      case when (v_n.metadata -> 'workflow' ->> 'charge_user_id')
                ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           then (v_n.metadata -> 'workflow' ->> 'charge_user_id')::uuid end);
    if v_sender is not null and v_sender is distinct from v_n.recipient_user_id then
      select w.timezone into v_cand
        from communication.person_notification_window(v_sender, v_n.organization_id, 'sms') w;
      if v_cand is not null then
        v_tz := v_cand;
        v_tz_src := 'sender';
      end if;
    end if;
  end if;

  if v_tz is null then
    -- The platform default: a GUESS, so it is the one rung that says so (once a day per person).
    v_cand := nullif(btrim(coalesce(
      platform.knob_resolve('communication.notifications', 'platform_default_timezone',
                            null, null, null) #>> '{}', '')), '');
    if v_cand is not null
       and exists (select 1 from pg_catalog.pg_timezone_names z where z.name = v_cand) then
      v_tz := v_cand;
      v_tz_src := 'platform_default';
    else
      -- The knob is unset or not a zone: the one case that still lands on UTC, loudly.
      v_tz := 'UTC';
      v_tz_src := 'utc_last_resort';
    end if;
    if not exists (
      select 1 from ops.system_error e
       where e.kind = 'notification_timezone_unknown'
         and e.organization_id = v_n.organization_id
         and e.user_id is not distinct from v_n.recipient_user_id
         and e.occurred_at > p_now - interval '24 hours'
    ) then
      perform ops.record_system_error(jsonb_build_object(
      'kind', 'notification_timezone_unknown',
      'user_id', v_n.recipient_user_id,
      'error_type', 'quiet_hours_timezone_fallback',
      'error_text', 'No timezone is known for this recipient, their organization or the person who '
        'sent the text, so their quiet hours were judged on ' || v_tz || ' (' || v_tz_src || ') - a '
        'guess about their night. Remedy: ask the person for their timezone once, or set the '
        'organization default (knob communication.notifications / default_timezone).',
      'source_app', 'aidream',
      'source_feature', 'communication.sms_notification_gate',
      'organization_id', v_n.organization_id,
      'occurred_at', p_now,
      'context', jsonb_build_object('notification_id', v_n.id, 'event_key', v_n.event_key,
                           'channel', 'sms', 'timezone_source', v_tz_src)));
    end if;
  end if;

  begin
    v_local_now := p_now at time zone v_tz;
  exception when others then
    v_tz := 'UTC';
    v_local_now := p_now at time zone v_tz;
  end;

  ---------------------------------------------------------------- QUIET HOURS (defer)
  -- The UNION of every window this person is owed, walked forward until no window
  -- contains the probe any more: an organization can only ever ADD quiet time.
  v_probe := v_local_now;
  if not v_exempt and jsonb_array_length(coalesce(v_windows, '[]'::jsonb)) > 0 then
    for v_i in 1..4 loop
      v_moved := false;
      for v_w in select value from jsonb_array_elements(v_windows) loop
        v_qh_start := (v_w.value ->> 'start')::time;
        v_qh_end   := (v_w.value ->> 'end')::time;
        if v_qh_start = v_qh_end then
          continue;
        end if;
        v_probe_t := v_probe::time;
        if (case
              when v_qh_start > v_qh_end then v_probe_t >= v_qh_start or v_probe_t < v_qh_end
              else v_probe_t >= v_qh_start and v_probe_t < v_qh_end
            end) then
          if v_qh_start > v_qh_end and v_probe_t >= v_qh_start then
            v_end_at := date_trunc('day', v_probe) + interval '1 day' + v_qh_end;
          else
            v_end_at := date_trunc('day', v_probe) + v_qh_end;
          end if;
          if v_end_at > v_probe then
            v_probe := v_end_at;
            v_moved := true;
          end if;
        end if;
      end loop;
      exit when not v_moved;
    end loop;
  end if;

  if v_probe > v_local_now then
    -- Jitter, so a whole shift is not texted in the same second (§3.4).
    return query select 'defer'::text, 'quiet_hours'::text,
                        (v_probe at time zone v_tz)
                          + make_interval(secs => floor(random() * 900)::integer),
                        v_tz;
    return;
  end if;

  ---------------------------------------------------------------- VOLUME CAPS (defer)
  -- 1016: how much we may say to this person comes from the PERSON, through the one
  -- ladder, exactly as the night does. What used to be inlined here could only see the
  -- org-scoped row, so the 10/50 on somebody's own enrollment was never read.
  select c.max_per_hour, c.max_per_day
    into v_max_hour, v_max_day
    from communication.person_notification_caps(
           v_n.recipient_user_id, v_n.organization_id, 'sms') c;

  if not v_mandatory and not v_exempt then
    select count(*) into v_count
      from communication.sms_messages m
     where m.organization_id = v_n.organization_id
       and m.to_number = v_number
       and m.direction = 'outbound'
       and m.created_at >= p_now - interval '1 hour'
       and m.deleted_at is null;
    if v_count >= v_max_hour then
      return query select 'defer'::text, 'hourly_rate_limit'::text,
                          date_trunc('hour', p_now) + interval '1 hour'
                            + make_interval(secs => floor(random() * 300)::integer),
                          v_tz;
      return;
    end if;

    v_day_start := date_trunc('day', v_local_now) at time zone v_tz;
    v_day_end   := (date_trunc('day', v_local_now) + interval '1 day') at time zone v_tz;
    select count(*) into v_count
      from communication.sms_messages m
     where m.organization_id = v_n.organization_id
       and m.to_number = v_number
       and m.direction = 'outbound'
       and m.created_at >= v_day_start
       and m.created_at <  v_day_end
       and m.deleted_at is null;
    if v_count >= v_max_day then
      return query select 'defer'::text, 'daily_rate_limit'::text,
                          v_day_end + make_interval(secs => floor(random() * 900)::integer),
                          v_tz;
      return;
    end if;
  end if;

  return query select 'send'::text, null::text, null::timestamptz, v_tz;
end
$function$;

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

drop function if exists custom.booking_sms_consent(text, text, text, text);
drop function if exists custom._booking_sms_reminders(uuid, uuid, uuid, uuid);
delete from platform.client_callable_door where declared_by = 'booking_notify_d_text_reminders_with_recorded_consent.sql';
delete from communication.notification_event_type where event_key = 'custom.booking.booker_reminder_sms';
