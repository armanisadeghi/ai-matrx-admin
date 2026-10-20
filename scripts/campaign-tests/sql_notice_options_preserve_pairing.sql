-- Exercised only inside the runner's bounded transaction; every record belongs to admin@admin.com.
do $proof$
declare
  v_admin uuid;
  v_org uuid;
  v_event text := 'communications.rollback_notice.' || replace(gen_random_uuid()::text, '-', '');
  v_key text := gen_random_uuid()::text;
  v_result jsonb;
  v_before jsonb;
  v_after jsonb;
  v_dm jsonb;
  v_options jsonb;
  v_count integer;
  v_signature text := 'communication.notify_from_sql(uuid,text,uuid,text,text,jsonb,text,text,uuid,text,jsonb)';
begin
  select id into strict v_admin from auth.users where email = 'admin@admin.com';
  select organization_id into strict v_org from iam.organization_member
    where user_id = v_admin and organization_id is not null order by joined_at limit 1;
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  perform set_config('app.actor_system', 'communications.sql_notice_options_guard', true);
  insert into communication.notification_event_type
    (event_key, organization_id, created_by, label, default_channels, config)
  values (v_event, v_org, v_admin, 'Account notice rehearsal', '{"email":true}'::jsonb,
    '{"pair_dm_with_email":true,"templates":{"email":{"body":"Account notice"},"dm":{"body":"Account notice"}}}'::jsonb);
  -- Positive dependency control: the actual pairing rule, resolver and templates must queue both legs.
  if communication.notification_pair_channels(v_event,v_org,v_admin,'{"email":true}'::jsonb)
      is distinct from '{"email":true,"dm":true}'::jsonb then
    raise exception 'PAIR_CONTROL: the canonical pairing dependency is unavailable';
  end if;
  v_dm := jsonb_build_object('sender_user_id', v_admin, 'action_data',
      jsonb_build_object('type','link','url','/messages'), 'when_sender_is_recipient','system_bot');
  v_options := jsonb_build_object('dm', v_dm);
  v_result := communication.notify_from_sql(v_org,v_event,v_admin,'admin@admin.com',
    'Account owner','{}'::jsonb,'/messages',null,null,v_key||':control',v_options);
  if v_result->'queued' is distinct from '["dm","email"]'::jsonb then
    raise exception 'POSITIVE_CONTROL: real SQL producer did not queue both legs: %', v_result;
  end if;
  select count(*) into v_count from communication.notification
    where event_key=v_event and dedupe_key like v_key||':control:%' and status='render_pending';
  if v_count<>2 then raise exception 'POSITIVE_ROWS: both real intent rows required'; end if;
  -- The break this guard rejects: an options upgrade must not revive an email beside an opted-out DM.
  v_result := communication.notify_from_sql(v_org,v_event,v_admin,'admin@admin.com',
    'Account owner','{}'::jsonb,'/messages',null,null,v_key||':dm-off',
    v_options || '{"opted_out":["dm"]}'::jsonb);
  if v_result->'queued' is distinct from '[]'::jsonb or
     not (v_result->'skipped' @> '[{"channel":"dm","why":"opted_out"},{"channel":"email","why":"opted_out"}]'::jsonb) then
    raise exception 'PAIRED_EMAIL_OPTOUT: DM-off must yield named skips for both legs: %', v_result;
  end if;
  select count(*) into v_count from communication.notification
    where event_key=v_event and dedupe_key like v_key||':dm-off:%' and status='skipped' and error_code='opted_out';
  if v_count<>2 then raise exception 'PAIRED_EMAIL_ROWS: exact two skipped intents required'; end if;
  -- An email preference never silences the inbox; exact sender/action data stays on that DM only.
  v_result := communication.notify_from_sql(v_org,v_event,v_admin,'admin@admin.com',
    'Account owner','{}'::jsonb,'/messages',null,null,v_key||':email-off',
    v_options || '{"opted_out":["email"]}'::jsonb);
  if v_result->'queued' is distinct from '["dm"]'::jsonb or
     not (v_result->'skipped' @> '[{"channel":"email","why":"opted_out"}]'::jsonb) then
    raise exception 'EMAIL_ONLY_OPTOUT: inbox must survive email opt-out: %',v_result;
  end if;
  select count(*) into v_count from communication.notification where event_key=v_event
    and dedupe_key=v_key||':email-off:dm' and status='render_pending' and metadata->'dm'=v_dm
    and recipient_user_id=v_admin and organization_id=v_org;
  if v_count<>1 then raise exception 'DM_METADATA: exact sender, action payload and own-account binding lost'; end if;
  select count(*) into v_count from communication.notification where event_key=v_event
    and dedupe_key=v_key||':email-off:email' and status='skipped' and error_code='opted_out'
    and not (metadata ? 'dm');
  if v_count<>1 then raise exception 'EMAIL_METADATA: skipped email must not carry DM options'; end if;
  -- The canonical saved preference must suppress the paired email too.
  insert into communication.notification_preference
    (organization_id,user_id,event_key,channel,enabled,created_by)
    values(v_org,v_admin,v_event,'dm',false,v_admin);
  v_result := communication.notify_from_sql(v_org,v_event,v_admin,'admin@admin.com',
    'Account owner','{}'::jsonb,'/messages',null,null,v_key||':saved-off',v_options);
  if v_result->'queued' is distinct from '[]'::jsonb or
     not (v_result->'skipped' @> '[{"channel":"email","why":"opted_out"}]'::jsonb) then
    raise exception 'SAVED_DM_CHOICE: saved inbox choice must withhold email: %',v_result;
  end if;
  if exists(select 1 from communication.notification where event_key=v_event
    and dedupe_key like v_key||':saved-off:%' and status='render_pending') then
    raise exception 'SAVED_DM_ROWS: a saved opt-out became sendable';
  end if;
  update communication.notification_preference set enabled=true
    where user_id=v_admin and event_key=v_event and organization_id=v_org;
  -- Legacy ten-argument producers still delegate to the same options implementation.
  v_result := communication.notify_from_sql(v_org,v_event,v_admin,'admin@admin.com',
    'Account owner','{}'::jsonb,'/messages',null,null,v_key||':legacy');
  if v_result->'queued' is distinct from '["dm","email"]'::jsonb then
    raise exception 'LEGACY_DELEGATION: legacy producer did not reach both legs: %',v_result;
  end if;
  select count(*) into v_count from communication.notification where event_key=v_event
    and dedupe_key like v_key||':legacy:%' and status='render_pending';
  if v_count<>2 then raise exception 'LEGACY_ROWS: the legacy door returned without both persisted intents'; end if;
  select jsonb_agg(to_jsonb(n) order by n.id) into v_before from communication.notification n
    where n.event_key=v_event and n.dedupe_key like v_key||':control:%';
  v_result := communication.notify_from_sql(v_org,v_event,v_admin,'admin@admin.com',
    'Account owner','{}'::jsonb,'/messages',null,null,v_key||':control',v_options);
  select jsonb_agg(to_jsonb(n) order by n.id) into v_after from communication.notification n
    where n.event_key=v_event and n.dedupe_key like v_key||':control:%';
  if v_result->'queued' is distinct from '[]'::jsonb or v_before is distinct from v_after or
    not (v_result->'skipped' @> '[{"channel":"dm","why":"already_queued"},{"channel":"email","why":"already_queued"}]'::jsonb) then
    raise exception 'REPLAY: replay must name both existing legs and leave the rows unchanged';
  end if;
  -- Explicit non-pairing remains an organization/event knob; address-only recipients have no inbox.
  update communication.notification_event_type set config=config||'{"pair_dm_with_email":false}'::jsonb where event_key=v_event;
  v_result := communication.notify_from_sql(v_org,v_event,v_admin,'admin@admin.com',
    'Account owner','{}'::jsonb,'/messages',null,null,v_key||':unpaired',v_options||'{"opted_out":["dm"]}'::jsonb);
  if v_result->'queued' is distinct from '["email"]'::jsonb then
    raise exception 'UNPAIRED_KNOB: explicit non-pairing was overridden: %',v_result;
  end if;
  select count(*) into v_count from communication.notification where event_key=v_event
    and dedupe_key like v_key||':unpaired:%' and channel='email' and status='render_pending';
  if v_count<>1 or exists(select 1 from communication.notification where event_key=v_event
      and dedupe_key like v_key||':unpaired:%' and channel='dm') then
    raise exception 'UNPAIRED_ROWS: the explicit knob did not produce just its email intent';
  end if;
  v_result := communication.notify_from_sql(v_org,v_event,null,'admin@admin.com',
    'Account owner','{}'::jsonb,'/messages',null,null,v_key||':address',v_options);
  if v_result->'queued' is distinct from '["email"]'::jsonb then
    raise exception 'ADDRESS_ONLY: an address-only notice acquired an inbox: %',v_result;
  end if;
  select count(*) into v_count from communication.notification where event_key=v_event
    and dedupe_key like v_key||':address:%' and channel='email' and status='render_pending'
    and recipient_user_id is null and recipient_kind='address' and to_address='admin@admin.com';
  if v_count<>1 then raise exception 'ADDRESS_ROWS: the address-only receipt did not reach its exact intent'; end if;
  if not has_function_privilege('service_role',v_signature,'EXECUTE') or
     has_function_privilege('anon',v_signature,'EXECUTE') or
     has_function_privilege('authenticated',v_signature,'EXECUTE') or
     exists(select 1 from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
       where p.oid=v_signature::regprocedure and a.grantee=0 and a.privilege_type='EXECUTE') then
    raise exception 'SERVER_DOOR: options producer execution contract changed';
  end if;
  perform set_config('communications.notice_options_event',v_event,true);
  perform set_config('communications.notice_options_proof','passed',true);
end
$proof$;
