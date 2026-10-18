-- chair-step: users one-roof final lane — three DROPs re-create admin._support_session_log, admin._support_session_close and admin.support_session_end with a trailing defaulted reason (a signature change CREATE OR REPLACE cannot make).
-- based-on: admin._audit_user_action(text, uuid, jsonb, jsonb, text, jsonb, uuid) 6712a2d8be90c6d3c7075ddab9fae7aba767211aaba9d7f90ce44eddc465f490
-- based-on: admin.support_session_end(uuid) d92badebb44f6f4d275f036ee3f7fe5eec11e24cdd20dd7e64655eba60fd9e86
-- based-on: admin._support_session_close(uuid, text, text) d88a2258a03fc4dc3468a29cb5bf857a628b04d2ff164024d08ea230c770160e
-- based-on: admin._support_session_log(admin.support_sessions, text, text) 9e1c9f021b8c29375c36ce3fa05a22a8ef9dfff049fd3131265b09bf01ea3786
-- based-on: admin._user_activity_admin(uuid, timestamp with time zone, integer) 73b83a0dcee7657bbed9f24ef5b1dcd0384dc3782bc317ab99907ddc6bc58d1a
-- based-on: admin._user_activity_org_admin(uuid, timestamp with time zone, integer) 09ac7bb15b14962524d367ef168298c954c1ebd4eaf567728c310cf88583842a
-- based-on: admin._user_activity_support(uuid, timestamp with time zone, integer) b474d9fbb81a1e1951bc1b00fd78a689e76b221b447494d0ba0cac133652ef56
-- based-on: admin._user_activity_account(uuid, timestamp with time zone, integer) 48bc58642429e8b4ca31db618fedadaab6b9293d8d710d4f03e1f2e6da1ec7e1
-- based-on: admin.add_user_note(uuid, uuid, text, platform.shown_to, text) cce0db785baffdb739d6c366b24fd2aebf75caec4a11f23d9f3dda913e96612a
-- Users one-roof, final fix lane (2026-10-18).
--   F1  admin._audit_user_action refuses (22023) an admin action on a person with no reason. Exempt:
--       a person acting on themselves (self-serve closure) and the backend/timer (no signed-in actor).
--   W3  Ending a support session from the admin console takes a reason (support_session_end p_reason);
--       the 'ended' audit row carries THAT reason (or what ended it), never the reason it was opened with.
--   F4/W1/W2  One source per event in admin.user_activity: admin.admin_audit_log is canonical for every
--       admin action. The account source keeps only erasure; the support source reads the audit rows; the
--       org_admin source skips the super_admin_membership_* twin of an org_membership_* audit row. Activity
--       is about the person: actions they did to OTHER people are no longer listed on their page.
--   W5  Notes about a person are audited: add (admin.add_user_note), edit / pin / unpin / delete (trigger
--       on workbench.notes, so every path is covered). The reason is "Shared note" / "Private note" —
--       the note body is never copied into the audit trail.
--   F5  iam.org_admin_audit gets (target_user_id, created_at) and (actor_user_id, created_at) indexes
--       (2k rows: a plain build is milliseconds).

-- 1. The action words ---------------------------------------------------------------------------
alter table admin.admin_audit_log drop constraint admin_audit_log_action_check;
alter table admin.admin_audit_log add constraint admin_audit_log_action_check check (action = any (array[
  'promote', 'update', 'revoke', 'admin_lane_platform_tenant_admission', 'scheduler_task_disable',
  'scheduler_run_mark_failed', 'top_tier_models_grant', 'top_tier_models_revoke', 'account_close',
  'account_close_self', 'account_reopen', 'sign_out_everywhere', 'plan_clear', 'free_months_grant',
  'usage_reset', 'support_session_created', 'support_session_extended', 'support_session_started',
  'support_session_ended', 'onboarding_flag_set', 'mcp_full_access_grant', 'mcp_full_access_revoke',
  'magic_link_create', 'password_reset_link_create', 'session_end', 'mfa_factor_remove', 'api_key_revoke',
  'email_verified',
  'org_membership_add', 'org_membership_set_role', 'org_membership_remove',
  'coupon_create', 'coupon_revoke', 'guest_block', 'guest_unblock',
  'message_sent', 'email_sent',
  -- final lane: notes about a person
  'note_add', 'note_edit', 'note_pin', 'note_unpin', 'note_delete'
]::text[]));

-- 2. F1 — the database requires the reason -------------------------------------------------------
create or replace function admin._audit_user_action(p_action text, p_target uuid, p_before jsonb default null::jsonb, p_after jsonb default null::jsonb, p_reason text default null::text, p_metadata jsonb default '{}'::jsonb, p_actor uuid default auth.uid())
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_org uuid;
  v_id uuid;
begin
  if p_target is null then
    raise exception 'admin audit: % names no person', p_action using errcode = '22004';
  end if;
  -- Every admin action on a person carries its reason, so no screen, route or SQL door can skip it.
  -- Exempt: a person acting on themselves (self-serve closure) and the backend/timer (no actor).
  if p_actor is not null and p_actor is distinct from p_target
     and nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'A reason is required for %', replace(p_action, '_', ' ')
      using errcode = '22023', hint = 'Say why this person is being changed; it is recorded on their admin history.';
  end if;
  -- The platform admin audit trail is not org-scoped: the row belongs to the platform tenant.
  -- Read it; never default it, never guess it (same rule as public._admin_audit_trigger).
  select so.organization_id into v_org from iam.system_orgs so where so.key = 'system';
  if v_org is null then
    raise exception 'admin audit: iam.system_orgs has no row keyed ''system'' — the audit row has no organization to belong to'
      using errcode = '23502';
  end if;
  insert into admin.admin_audit_log (actor_user_id, action, target_user_id, before, after, organization_id, metadata)
  values (p_actor, p_action, p_target, p_before, p_after, v_org,
          coalesce(p_metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object('reason', nullif(btrim(p_reason), ''))))
  returning id into v_id;
  return v_id;
end $function$;

-- 3. W3 — ending a support session records its own reason ----------------------------------------
drop function admin._support_session_log(admin.support_sessions, text, text);
create function admin._support_session_log(p_session admin.support_sessions, p_event text, p_via text, p_note text default null::text)
 returns void
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_activity record;
  v_reason text;
begin
  select * into v_activity from admin._support_target_activity(p_session.target_user_id);
  insert into admin.support_session_events
    (organization_id, support_session_id, event, admin_user_id, target_user_id, via, expires_at,
     target_live_sign_ins, target_last_active_at)
  values
    (p_session.organization_id, p_session.id, p_event, p_session.created_by, p_session.target_user_id,
     p_via, p_session.expires_at, v_activity.live_sign_ins, v_activity.last_active_at);
  -- The 'ended' row says why it ended (the admin's reason, or what ended it) — never the opening reason.
  v_reason := case
    when p_event = 'ended' then coalesce(nullif(btrim(p_note), ''),
      case p_session.end_reason
        when 'expired' then 'Time ran out'
        when 'ended_in_session' then 'Ended from inside the session'
        when 'ended_by_admin' then 'Ended by an admin'
        else p_session.end_reason end)
    else p_session.reason end;
  -- Every support-session lifecycle event is also one row in the admin audit trail. The actor is
  -- whoever is calling (null for the timer and the backend); the admin who opened it is in metadata.
  perform admin._audit_user_action('support_session_' || p_event, p_session.target_user_id, null,
    jsonb_strip_nulls(jsonb_build_object('status', p_session.status, 'expires_at', p_session.expires_at,
                                         'end_reason', p_session.end_reason)),
    v_reason,
    jsonb_strip_nulls(jsonb_build_object('support_session_id', p_session.id, 'via', p_via,
                                         'admin_user_id', p_session.created_by,
                                         'minutes_granted', p_session.minutes_granted,
                                         'opened_for', case when p_event = 'ended' then p_session.reason end)));
end $function$;
revoke all on function admin._support_session_log(admin.support_sessions, text, text, text) from public, anon, authenticated, service_role;
update platform.client_callable_door
   set identity_args = 'p_session admin.support_sessions, p_event text, p_via text, p_note text',
       identity_argtypes = array['admin.support_sessions'::regtype, 'text'::regtype, 'text'::regtype, 'text'::regtype]::oid[],
       reason = 'p_session is a row the calling support session function already loaded and authorized. p_note (optional, not an id): the reason an admin gave for ending it; null = say what ended it.',
       declared_by = 'migrations/20261018210000_users_final_reasons_required_one_source_per_event.sql (users one-roof final lane)'
 where schema_name = 'admin' and function_name = '_support_session_log' and identity_args = 'p_session admin.support_sessions, p_event text, p_via text';

drop function admin._support_session_close(uuid, text, text);
create function admin._support_session_close(p_id uuid, p_reason text, p_via text, p_note text default null::text)
 returns admin.support_sessions
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_row admin.support_sessions;
  v_minutes integer;
begin
  update admin.support_sessions
     set status = 'ended', ended_at = now(), end_reason = p_reason, claim_token_hash = null
   where id = p_id and status <> 'ended'
  returning * into v_row;
  if not found then
    select * into v_row from admin.support_sessions where id = p_id;
    return v_row;
  end if;

  if v_row.auth_session_id is not null then
    delete from auth.sessions where id = v_row.auth_session_id;
  end if;

  perform admin._support_session_log(v_row, 'ended', p_via, p_note);

  if v_row.started_at is not null then
    v_minutes := greatest(1, ceil(extract(epoch from (v_row.ended_at - v_row.started_at)) / 60)::integer);
    begin
      perform communication.notify_from_sql(
        v_row.organization_id, 'account.support_session', v_row.target_user_id, null, null,
        jsonb_build_object('notice', jsonb_build_object(
          'line', format('AI Matrx support worked in your account for %s minute%s.',
                         v_minutes, case when v_minutes = 1 then '' else 's' end),
          'subject', 'Support session ended')),
        null, 'support_session', v_row.id, 'support_session:' || v_row.id::text, null);
    exception when others then
      raise warning 'support session %: the user notice was not sent: %', v_row.id, sqlerrm;
    end;
  end if;
  return v_row;
end $function$;
revoke all on function admin._support_session_close(uuid, text, text, text) from public, anon, authenticated, service_role;
update platform.client_callable_door
   set identity_args = 'p_id uuid, p_reason text, p_via text, p_note text',
       identity_argtypes = array['uuid'::regtype, 'text'::regtype, 'text'::regtype, 'text'::regtype]::oid[],
       reason = 'p_id is a support session the calling function already authorized. p_note (optional, not an id): the reason an admin gave for ending it; null = say what ended it.',
       declared_by = 'migrations/20261018210000_users_final_reasons_required_one_source_per_event.sql (users one-roof final lane)'
 where schema_name = 'admin' and function_name = '_support_session_close' and identity_args = 'p_id uuid, p_reason text, p_via text';

drop function admin.support_session_end(uuid);
create function admin.support_session_end(p_id uuid, p_reason text default null::text)
 returns void
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_row admin.support_sessions;
  v_via text;
begin
  select * into v_row from admin.support_sessions s where s.id = p_id;
  if not found then
    raise exception 'Support session not found' using errcode = 'P0002';
  end if;
  v_via := admin._support_session_via(v_row);
  -- An admin ending it from the console says why; inside the session the support window ends itself.
  if v_via = 'admin_console' and v_row.status <> 'ended' and nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'A reason is required to end a support session' using errcode = '22023';
  end if;
  perform admin._support_session_close(p_id, case v_via when 'support_window' then 'ended_in_session' else 'ended_by_admin' end, v_via,
                                       nullif(btrim(coalesce(p_reason, '')), ''));
end $function$;
update platform.client_callable_door
   set identity_args = 'p_id uuid, p_reason text',
       identity_argtypes = array['uuid'::regtype, 'text'::regtype]::oid[],
       reason = 'p_id is a support session; allowed only from that session''s own sign-in (JWT session_id match) or a super admin, else 42501. p_reason (optional, not an id): why it is ended; required (22023) from the admin console.',
       declared_by = 'migrations/20261018210000_users_final_reasons_required_one_source_per_event.sql (users one-roof final lane)'
 where schema_name = 'admin' and function_name = 'support_session_end' and identity_args = 'p_id uuid';
grant execute on function admin.support_session_end(uuid, text) to authenticated;

-- 4. F4/W1/W2 — one source per event; Activity is about the person -------------------------------
create or replace function admin._user_activity_admin(p_user uuid, p_before timestamp with time zone, p_limit integer)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  -- Admin actions done TO this person (admin.admin_audit_log, target index). Support-session rows are
  -- the 'support' source and contact rows the 'contact' source, so each event is listed once.
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select l.created_at as at,
           admin._user_activity_item(l.created_at, 'admin', l.id::text,
             initcap(replace(replace(l.action, '_', ' '), '.', ' ')),
             coalesce(l.metadata->>'reason', l.after->>'reason', l.metadata->>'note'),
             l.actor_user_id,
             jsonb_build_object('type', 'admin_history', 'id', l.id, 'user_id', l.target_user_id)) as item
      from admin.admin_audit_log l
     where l.target_user_id = p_user and l.created_at <= p_before
       and l.action not like 'admin_lane_%'
       and l.action not like 'support_session_%'
       and l.action not in ('message_sent', 'email_sent')
     order by l.created_at desc
     limit p_limit
  ) s
$function$;

create or replace function admin._user_activity_support(p_user uuid, p_before timestamp with time zone, p_limit integer)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  -- Support sessions on this person: the audit rows _support_session_log writes (one per event, with
  -- the event's own reason). admin.support_session_events stays the session's own log.
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select l.created_at as at,
           admin._user_activity_item(l.created_at, 'support', l.id::text,
             'Support session ' || replace(l.action, 'support_session_', ''),
             l.metadata->>'reason',
             l.actor_user_id,
             case when l.metadata ? 'support_session_id'
                  then jsonb_build_object('type', 'support_session', 'id', l.metadata->>'support_session_id', 'user_id', l.target_user_id)
                  else jsonb_build_object('type', 'admin_history', 'id', l.id, 'user_id', l.target_user_id) end) as item
      from admin.admin_audit_log l
     where l.target_user_id = p_user and l.created_at <= p_before
       and l.action like 'support_session_%'
     order by l.created_at desc
     limit p_limit
  ) s
$function$;

create or replace function admin._user_activity_account(p_user uuid, p_before timestamp with time zone, p_limit integer)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  -- Closing and reopening are admin audit rows (account_close / account_close_self / account_reopen,
  -- the 'admin' source); erasure is written only here.
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select c.erased_at as at,
           admin._user_activity_item(c.erased_at, 'account', c.id::text || ':erased', 'Account erased', null, c.updated_by,
             jsonb_build_object('type', 'user', 'id', c.user_id)) as item
      from iam.account_closure c
     where c.user_id = p_user and c.erased_at is not null and c.erased_at <= p_before
     order by c.erased_at desc
     limit p_limit
  ) s
$function$;

create or replace function admin._user_activity_org_admin(p_user uuid, p_before timestamp with time zone, p_limit integer)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  -- Organization audit rows about this person, plus organization-level actions they took (no other
  -- person named). A super_admin_membership_* row written beside its org_membership_* admin audit row
  -- (same transaction, same instant) is that row's twin and is skipped.
  select coalesce(jsonb_agg(s.item order by s.at desc), '[]'::jsonb)
  from (
    select u.at, u.item from (
      (select a.created_at as at,
              admin._user_activity_item(a.created_at, 'org_admin', a.id::text,
                initcap(replace(replace(a.action, '_', ' '), '.', ' ')),
                coalesce(a.detail->>'reason', a.metadata->>'reason'),
                a.actor_user_id,
                jsonb_build_object('type', 'organization', 'id', a.organization_id)) as item
         from iam.org_admin_audit a
        where a.target_user_id = p_user and a.created_at <= p_before
          and not (a.action like 'super_admin_membership_%' and exists (
                select 1 from admin.admin_audit_log l
                 where l.target_user_id = a.target_user_id and l.created_at = a.created_at
                   and l.action = 'org_membership_' || replace(a.action, 'super_admin_membership_', '')))
        order by a.created_at desc
        limit p_limit)
      union all
      (select a.created_at,
              admin._user_activity_item(a.created_at, 'org_admin', a.id::text,
                initcap(replace(replace(a.action, '_', ' '), '.', ' ')),
                coalesce(a.detail->>'reason', a.metadata->>'reason'),
                a.actor_user_id,
                jsonb_build_object('type', 'organization', 'id', a.organization_id))
         from iam.org_admin_audit a
        where a.actor_user_id = p_user and a.target_user_id is null and a.created_at <= p_before
        order by a.created_at desc
        limit p_limit)
    ) u
    order by u.at desc
    limit p_limit
  ) s
$function$;

-- 5. F5 — person indexes on iam.org_admin_audit --------------------------------------------------
create index if not exists org_admin_audit_target_idx on iam.org_admin_audit (target_user_id, created_at desc);
create index if not exists org_admin_audit_actor_idx on iam.org_admin_audit (actor_user_id, created_at desc);

-- 6. W5 — notes about a person are audited -------------------------------------------------------
create or replace function admin.add_user_note(p_user uuid, p_organization_id uuid, p_content text, p_shown_to platform.shown_to default 'my_team'::platform.shown_to, p_label text default null::text)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_note uuid;
  v_shown platform.shown_to := coalesce(p_shown_to, 'my_team'::platform.shown_to);
begin
  if v_uid is null or not public.is_platform_admin() then
    raise exception 'admin.add_user_note: platform admins only' using errcode = '42501';
  end if;
  if p_organization_id is null then
    raise exception 'admin.add_user_note: an organization is required' using errcode = '23502';
  end if;
  if exists (select 1 from iam.organizations o where o.id = p_organization_id and o.is_system) then
    raise exception 'admin.add_user_note: notes about a person are never filed in a system organization' using errcode = '42501';
  end if;
  if not iam.has_org_access(p_organization_id) then
    raise exception 'admin.add_user_note: you are not a member of that organization' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user) then
    raise exception 'admin.add_user_note: no such person' using errcode = 'P0002';
  end if;
  if coalesce(btrim(p_content), '') = '' then
    raise exception 'admin.add_user_note: the note is empty' using errcode = '23514';
  end if;

  insert into workbench.notes (label, content, organization_id, shown_to, created_by)
  values (coalesce(nullif(btrim(p_label), ''), 'Note about a person'), p_content, p_organization_id, v_shown, v_uid)
  returning id into v_note;

  insert into platform.associations (source_type, source_id, target_type, target_id, organization_id, created_by)
  values ('note', v_note, 'user', p_user, p_organization_id, v_uid);

  -- The audit row names the note, never its body.
  perform admin._audit_user_action('note_add', p_user, null,
    jsonb_build_object('note_id', v_note, 'shown_to', v_shown),
    case when v_shown = 'only_me'::platform.shown_to then 'Private note' else 'Shared note' end,
    jsonb_build_object('note_id', v_note));

  return v_note;
end;
$function$;

create function admin._person_note_audit()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
-- Edit / pin / unpin / delete of a note linked note -> user writes one admin audit row per person it is
-- about, whichever path changed it (the Notes tab, the Accounts dialog, the Notes app). Body never copied.
declare
  v_action text;
  v_user uuid;
begin
  v_action := case
    when old.deleted_at is null and new.deleted_at is not null then 'note_delete'
    when coalesce((old.metadata->>'pinned')::boolean, false) <> coalesce((new.metadata->>'pinned')::boolean, false)
      then case when coalesce((new.metadata->>'pinned')::boolean, false) then 'note_pin' else 'note_unpin' end
    when old.content is distinct from new.content and new.deleted_at is null then 'note_edit'
  end;
  if v_action is null then
    return null;
  end if;
  for v_user in
    select distinct a.target_id from platform.associations a
     where a.source_type = 'note' and a.source_id = new.id and a.target_type = 'user' and a.deleted_at is null
  loop
    perform admin._audit_user_action(v_action, v_user, null,
      jsonb_build_object('note_id', new.id, 'shown_to', new.shown_to),
      case when new.shown_to = 'only_me'::platform.shown_to then 'Private note' else 'Shared note' end,
      jsonb_build_object('note_id', new.id));
  end loop;
  return null;
end $function$;
revoke all on function admin._person_note_audit() from public, anon, authenticated, service_role;

-- '_0…' fires before _gc_assoc_softdelete retires the note's edges, so a delete still finds its person.
create trigger _0_person_note_audit after update on workbench.notes
  for each row
  when (old.deleted_at is distinct from new.deleted_at
        or old.content is distinct from new.content
        or (old.metadata -> 'pinned') is distinct from (new.metadata -> 'pinned'))
  execute function admin._person_note_audit();
