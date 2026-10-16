-- additive: no
--   ADDS three functions (communication.claim_spare_sms_number, communication.release_spare_sms_number,
--   communication.spare_sms_pool_status), their three platform.client_callable_door rows, and three
--   platform.feature_knob rows. REPLACES one body (communication.sms_notification_gate), declared below
--   with the body it was written against; only the timezone-unknown branch changes, every other branch
--   is byte for byte. Writes `metadata` on the five numbers bought 2026-10-16 (A2P attachment facts).
--   Inverse: migrations/inverse/smsspares_a_spare_number_is_claimed_not_waited_for_down.sql
-- lane: SMS-SPARES
-- based-on: communication.sms_notification_gate(uuid, timestamp with time zone) 6b51a6cd71f090c0108c93c2a2d13ce8e93cdfb1c73f8c47fb8388dcd6e09250
--
-- 1. SPARES. An organization with no texting number of its own used to be refused ("this organization
--    has no texting number of its own yet"). The platform keeps a pool of bought numbers (platform org,
--    program `unassigned_spare`, inactive, metadata.status = available); claim_spare_sms_number hands one
--    to the organization atomically (FOR UPDATE SKIP LOCKED, so two organizations never get the same
--    number) and records who and when in metadata. release_spare_sms_number returns it.
--    Knobs: communication.sms / spares_kept_on_hand (4) and auto_assign_workflow_number (on, an
--    organization may switch it off for itself).
-- 2. QUIET HOURS. A recipient with no timezone was judged in raw UTC. The ladder now ends: the person's
--    own ladder, the organization's default_timezone, the SENDER's ladder, the platform default knob
--    communication.notifications / platform_default_timezone. UTC survives only when that knob is unset.
-- 3. A2P. The five numbers were attached on 2026-10-16 to Twilio Messaging Service
--    MGd358a99cf300cd11b59c8d384b37e3d0 ("AI Matrx"), which carries the VERIFIED campaign
--    QE2c6890da8086d771620e9b13fadeba0b; the facts are recorded in each number's metadata.

-- ── knobs ────────────────────────────────────────────────────────────────────

insert into platform.feature_knob
  (feature, key, value, default_value, value_type, unit, min_value, max_value, allowed_values,
   label, description, set_by, basis, review_due, overridable_by, override_direction, propagation)
values
  ('communication.sms', 'spares_kept_on_hand', to_jsonb(4), to_jsonb(4), 'integer', 'numbers', 0, 50, null,
   'Spare texting numbers kept on hand',
   'How many bought, unassigned texting numbers the platform keeps ready so an organization never waits for one. When fewer are left, a card appears on the attention dock saying how many to buy. Numbers are never bought automatically.',
   'agent',
   'Arman 2026-10-16: "get some extra numbers so we''re not always facing the need". Four is the pool bought that day.',
   date '2027-01-16', '{}', 'any', 'next_load'),
  ('communication.sms', 'auto_assign_workflow_number', to_jsonb(true), to_jsonb(true), 'boolean', null, null::numeric, null::numeric, null,
   'Give a Workflow a texting number automatically',
   'When one of this organization''s Workflows needs to send a text and the organization has no texting number yet, a spare is assigned to it and the text goes out. Turn off to assign numbers by hand.',
   'agent',
   'Store-on-by-default rule: the refusal "no texting number of its own yet" stopped every first Workflow text. Agent-set 2026-10-16 with the spare pool.',
   date '2027-01-16', '{organization}', 'any', 'next_load'),
  ('communication.notifications', 'platform_default_timezone', to_jsonb('America/Los_Angeles'::text), to_jsonb('America/Los_Angeles'::text), 'string', null, null::numeric, null::numeric, null,
   'Platform default timezone for quiet hours',
   'The clock quiet hours are judged on when the recipient, their organization and the person who sent the text have no timezone. It is the last rung of the ladder, never UTC.',
   'agent',
   'Agent-set 2026-10-16: a recipient with no person record was judged in UTC, so texts were held or sent at the wrong hour. The company is Pacific-based; review when a customer base elsewhere dominates.',
   date '2027-01-16', '{}', 'any', 'next_load')
on conflict (feature, key) do nothing;

-- ── the pool ─────────────────────────────────────────────────────────────────

create or replace function communication.claim_spare_sms_number(
  p_organization_id uuid, p_actor uuid default null, p_phone text default null, p_auto boolean default false)
returns table(phone_number text, claimed boolean, refusal text)
language plpgsql security definer set search_path to ''
as $fn$
declare
  v_platform constant uuid := '39c38960-d30c-4840-b0c1-c9960de95582';
  v_row      communication.sms_phone_numbers%rowtype;
  v_existing text;
begin
  if p_organization_id is null then
    return query select null::text, false, 'no_organization'::text; return;
  end if;

  -- An organization that already has its own sender is never handed a second one by accident.
  select n.phone_number into v_existing
    from communication.sms_phone_numbers n
   where n.organization_id = p_organization_id
     and n.program_key = 'organization_workflows'
     and n.is_active and n.deleted_at is null
     and n.provider_account_id is not null
     and coalesce((n.capabilities ->> 'sms')::boolean, false)
   limit 1;
  if v_existing is not null then
    return query select v_existing, false, null::text; return;
  end if;

  if p_auto and not coalesce((platform.knob_resolve('communication.sms', 'auto_assign_workflow_number',
                                                    p_organization_id, null, null) #>> '{}')::boolean, true) then
    return query select null::text, false, 'auto_assign_off'::text; return;
  end if;

  select * into v_row
    from communication.sms_phone_numbers n
   where n.organization_id = v_platform
     and n.program_key = 'unassigned_spare'
     and n.deleted_at is null
     and n.provider_account_id is not null
     and n.metadata ->> 'status' = 'available'
     and (p_phone is null or n.phone_number = p_phone)
   order by n.created_at
   limit 1
   for update skip locked;
  if not found then
    return query select null::text, false, 'no_spare_available'::text; return;
  end if;

  update communication.sms_phone_numbers n
     set organization_id = p_organization_id,
         program_key     = 'organization_workflows',
         is_active       = true,
         assigned_at     = now(),
         released_at     = null,
         updated_by      = p_actor,
         metadata        = coalesce(n.metadata, '{}'::jsonb) || jsonb_build_object(
           'status', 'assigned',
           'role', 'organization_workflows_sender',
           'assigned_to_organization', p_organization_id,
           'assigned_by', p_actor,
           'assigned_at', now(),
           'assigned_via', case when p_auto then 'auto_assign' else 'admin_assign' end)
   where n.id = v_row.id;
  return query select v_row.phone_number, true, null::text;
end
$fn$;

create or replace function communication.release_spare_sms_number(p_phone text, p_actor uuid default null)
returns table(phone_number text, released boolean, refusal text)
language plpgsql security definer set search_path to ''
as $fn$
declare
  v_platform constant uuid := '39c38960-d30c-4840-b0c1-c9960de95582';
  v_row      communication.sms_phone_numbers%rowtype;
begin
  select * into v_row from communication.sms_phone_numbers n
   where n.phone_number = p_phone and n.deleted_at is null
     and n.metadata ->> 'status' = 'assigned'
   for update;
  if not found then
    return query select p_phone, false, 'not_an_assigned_spare'::text; return;
  end if;
  update communication.sms_phone_numbers n
     set organization_id = v_platform,
         program_key     = 'unassigned_spare',
         is_active       = false,
         released_at     = now(),
         updated_by      = p_actor,
         metadata        = (coalesce(n.metadata, '{}'::jsonb)
                              - 'assigned_to_organization' - 'assigned_by' - 'assigned_at' - 'assigned_via')
                           || jsonb_build_object(
                                'status', 'available', 'role', 'spare_pool',
                                'last_released_by', p_actor, 'last_released_at', now(),
                                'last_assigned_to_organization', n.metadata -> 'assigned_to_organization')
   where n.id = v_row.id;
  return query select p_phone, true, null::text;
end
$fn$;

create or replace function communication.spare_sms_pool_status()
returns table(available integer, kept_on_hand integer, shortfall integer)
language sql stable security definer set search_path to ''
as $fn$
  with a as (
    select count(*)::int as c from communication.sms_phone_numbers n
     where n.organization_id = '39c38960-d30c-4840-b0c1-c9960de95582'
       and n.program_key = 'unassigned_spare' and n.deleted_at is null
       and n.metadata ->> 'status' = 'available'),
  k as (
    select coalesce((platform.knob_resolve('communication.sms', 'spares_kept_on_hand', null, null, null) #>> '{}')::int, 4) as c)
  select a.c, k.c, greatest(k.c - a.c, 0) from a, k
$fn$;

grant execute on function communication.claim_spare_sms_number(uuid, uuid, text, boolean) to service_role;
grant execute on function communication.release_spare_sms_number(text, uuid) to service_role;
grant execute on function communication.spare_sms_pool_status() to service_role;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers)
select 'communication', p.proname, pg_get_function_identity_arguments(p.oid), platform.door_argtypes(p.proargtypes),
  'Moves one spare texting number between the platform pool and an organization the SERVER names; '
  'the browser never supplies the organization or the actor.',
  'smsspares_a_spare_number_is_claimed_not_waited_for.sql',
  'server_only: called by aidream''s Workflow text step (auto-assign) and by the SMS admin route (service-role client, admin gated). No signed-in caller may choose its own organization.',
  false, false
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'communication'
  and p.proname in ('claim_spare_sms_number', 'release_spare_sms_number', 'spare_sms_pool_status')
  and not exists (select 1 from platform.client_callable_door d
                   where d.schema_name = 'communication' and d.function_name = p.proname);

-- ── A2P facts on the five numbers bought 2026-10-16 ──────────────────────────

update communication.sms_phone_numbers
   set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
         'messaging_service_sid', 'MGd358a99cf300cd11b59c8d384b37e3d0',
         'campaign_sid', 'QE2c6890da8086d771620e9b13fadeba0b',
         'a2p_campaign_status', 'VERIFIED',
         'a2p_attached_at', '2026-10-16')
 where phone_number in ('+19499973849', '+19497046270', '+19499916268', '+14156393303', '+14152370969')
   and deleted_at is null;

-- ── 2. the quiet-hours ladder never ends on raw UTC ──────────────────────────

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
$function$
;

-- REPLACE: pg_get_functiondef above keeps the SECURITY DEFINER, search_path, grants and comment.
