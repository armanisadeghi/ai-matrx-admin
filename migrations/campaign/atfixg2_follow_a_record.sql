--
-- lane: AT-FIX-G2
-- Creates one table (registered as machinery), five functions, two triggers, one notice kind; declares two client doors then grants them. Nothing existing is replaced, dropped or revoked. Inverse: migrations/inverse/atfixg2_follow_a_record_down.sql
--
-- PER-RECORD FOLLOW (Airtable: "follow a record"). A person watches ONE record and is told, in the bell, when somebody
-- ELSE changes it or comments on it. The notice opens that record (`deep_link` /data/<table>?record=<id>), which the
-- bell opens in a new tab like every notice. There is NO new schedule: the notice is written in the same transaction
-- as the change, off the SAME outbox row (`custom.io_outbox`, `records.changed`) and the same comment insert that the
-- automations and the mention notices already read. Delivery is `communication.notification`, the one notice table.
--
-- WHO MAY FOLLOW: anybody who may read the record (the viewer rung). WHO IS TOLD: a follower who is not the one who
-- made the change and who may STILL read the record (a notice to somebody who lost access would be a dead end). The
-- notice names the fields that moved, never their values. A replay sends nothing twice: the key is the outbox row's
-- own dedupe key plus the follower.

create table if not exists custom.record_follow (
  organization_id uuid        not null,
  record_id       uuid        not null,
  user_id         uuid        not null,
  following       boolean     not null default true,
  created_at      timestamptz not null default now(),
  changed_at      timestamptz not null default now(),
  constraint record_follow_pk primary key (organization_id, record_id, user_id)
);
comment on table custom.record_follow is
  'AT-FIX-G2 (2026-10-19): one row per person per record they follow. Written only by custom.record_follow_set, read by custom.record_followers and by the two notice triggers.';
create index if not exists record_follow_user_idx on custom.record_follow (organization_id, user_id);
alter table custom.record_follow enable row level security;
insert into platform.entity_types (token, schema_name, table_name, label, audit_class, audit_class_reason, table_ref, is_versioned, has_soft_delete)
values ('record_follow', 'custom', 'record_follow', 'Record Follow', 'machinery',
        'machinery: no grant to anon or authenticated, row security on; written only by custom.record_follow_set and read only by custom.record_followers and the two follow notice triggers (SECURITY DEFINER)',
        'custom.record_follow'::regclass, false, false)
on conflict do nothing;

create function custom.record_follow_set(p_organization_id uuid, p_record_id uuid, p_follow boolean default true)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_user uuid := custom.query_principal();
  v_n    integer;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.record_follow_set');
  if v_user is null then
    raise exception 'Sign in to follow a record.' using errcode = '42501';
  end if;
  if coalesce(p_follow, true) then
    if not platform.detail_parent_access_for(v_user, 'record', p_record_id, 'viewer'::public.permission_level)
       or not exists (select 1 from custom.record r
                       where r.organization_id = p_organization_id and r.id = p_record_id
                         and r.data_class = 'record' and r.deleted_at is null) then
      raise exception 'You can only follow a record you can open, and this one is not open to you.'
        using errcode = '42501',
              hint = 'Ask for access to the record, then follow it.';
    end if;
    insert into custom.record_follow (organization_id, record_id, user_id)
    values (p_organization_id, p_record_id, v_user)
    on conflict (organization_id, record_id, user_id) do update set following = true, changed_at = now();
  else
    -- Unfollowing switches the caller's own row off; the row stays as the record of it.
    update custom.record_follow f set following = false, changed_at = now()
     where f.organization_id = p_organization_id and f.record_id = p_record_id and f.user_id = v_user;
  end if;
  select count(*) into v_n from custom.record_follow f
   where f.organization_id = p_organization_id and f.record_id = p_record_id and f.following;
  return jsonb_build_object('following', coalesce(p_follow, true), 'followers', v_n);
end
$function$;

create function custom.record_followers(p_organization_id uuid, p_record_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_user   uuid := custom.query_principal();
  v_ids    uuid[];
  v_people jsonb;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.record_followers');
  if v_user is null
     or not platform.detail_parent_access_for(v_user, 'record', p_record_id, 'viewer'::public.permission_level) then
    return jsonb_build_object('following', false, 'followers', '[]'::jsonb);
  end if;
  select array_agg(f.user_id order by f.changed_at) into v_ids from custom.record_follow f
   where f.organization_id = p_organization_id and f.record_id = p_record_id and f.following;
  v_people := custom.history_people(p_organization_id, v_ids);
  return jsonb_build_object(
    'following', coalesce(v_user = any (v_ids), false),
    'followers', coalesce((select jsonb_agg(jsonb_build_object(
                              'user_id', u,
                              'name', coalesce(v_people -> u::text ->> 'name', 'Somebody outside the organization'),
                              'mine', u = v_user) order by o)
                             from unnest(v_ids) with ordinality t(u, o)), '[]'::jsonb));
end
$function$;

-- The notice every follower gets. ONE writer for both triggers.
create function custom._record_follow_notify(
  p_organization_id uuid, p_record_id uuid, p_table_id uuid, p_actor uuid, p_dedupe text,
  p_what text, p_link text, p_body text, p_skip uuid[])
returns integer
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  f        record;
  v_titlek text;
  v_title  text;
  v_name   text;
  v_sent   integer := 0;
begin
  begin
    select nullif(t.data ->> 'title_field', '') into v_titlek
      from custom.record t
     where t.organization_id = p_organization_id and t.id = p_table_id and t.data_class = 'table';
    if v_titlek is not null then
      v_title := custom._card_words(p_organization_id, custom.read_record(p_organization_id, p_record_id, true) ->> v_titlek, 'record');
    end if;
  exception when others then
    v_title := null;
  end;
  v_name := coalesce(custom.history_people(p_organization_id, array[p_actor]) -> p_actor::text ->> 'name', 'Somebody');
  for f in
    select fo.user_id from custom.record_follow fo
     where fo.organization_id = p_organization_id and fo.record_id = p_record_id and fo.following
       and fo.user_id is distinct from p_actor
       and not (fo.user_id = any (coalesce(p_skip, array[]::uuid[])))
  loop
    continue when not platform.detail_parent_access_for(f.user_id, 'record', p_record_id, 'viewer'::public.permission_level);
    continue when not ('in_app' = any (coalesce(hr._notify_channels('custom.record.follow', p_organization_id, f.user_id, null), array['in_app'])));
    insert into communication.notification
      (organization_id, event_key, channel, recipient_user_id, recipient_kind,
       dedupe_key, subject, body, payload, target_kind, target_id, deep_link)
    values
      (p_organization_id, 'custom.record.follow', 'in_app', f.user_id, 'user',
       format('custom.follow:%s:%s', p_dedupe, f.user_id),
       format('%s %s %s', v_name, p_what, coalesce(nullif(btrim(coalesce(v_title, '')), ''), 'a record you follow')),
       left(btrim(coalesce(p_body, '')), 280),
       jsonb_build_object('record_id', p_record_id, 'table_id', p_table_id, 'source', 'record_follow'),
       'custom.record', p_record_id, p_link)
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
    v_sent := v_sent + 1;
  end loop;
  return v_sent;
end
$function$;

-- A CHANGE: read off the outbox row the store already writes for it.
create function custom._record_follow_changed_stmt()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  r record;
begin
  for r in
    select n.organization_id, n.record_id, n.table_id, n.operation, n.dedupe_key, n.actor, n.metadata
      from new_rows n
     where n.event_key = 'records.changed' and n.table_id is not null and n.deleted_at is null
       and n.operation in ('updated', 'deleted')
       and exists (select 1 from custom.record_follow f
                    where f.organization_id = n.organization_id and f.record_id = n.record_id and f.following)
  loop
    continue when not coalesce((platform.knob_resolve('custom', 'system_enabled', r.organization_id) #>> '{}')::boolean, false);
    begin
      perform custom._record_follow_notify(
        r.organization_id, r.record_id, r.table_id, nullif(r.actor ->> 'user_id', '')::uuid,
        coalesce(r.dedupe_key, r.record_id::text), 
        case when r.operation = 'deleted' then 'archived' else 'changed' end,
        format('/data/%s?record=%s', r.table_id, r.record_id),
        case when r.operation = 'deleted' then 'This record was archived.'
             else coalesce((select 'Changed: ' || string_agg(k, ', ' order by k)
                              from jsonb_object_keys(case when jsonb_typeof(r.metadata -> 'change' -> 'fields') = 'object'
                                                          then r.metadata -> 'change' -> 'fields' else '{}'::jsonb end) k),
                           'Something changed.') end,
        null);
    exception when others then
      -- NO NOTICE MAY REFUSE A PERSON'S WRITE.
      raise warning 'custom._record_follow_changed_stmt: record % skipped — %', r.record_id, sqlerrm;
    end;
  end loop;
  return null;
end
$function$;

-- A COMMENT: the one comment store is platform.comments; the Table rides in metadata.
create function custom._record_follow_commented()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_table uuid := nullif(new.metadata ->> 'table_id', '')::uuid;
  v_skip  uuid[];
begin
  if new.entity_type <> 'record' or new.deleted_at is not null or v_table is null then
    return null;
  end if;
  if not coalesce((platform.knob_resolve('custom', 'system_enabled', new.organization_id) #>> '{}')::boolean, false) then
    return null;
  end if;
  if not exists (select 1 from custom.record_follow f
                  where f.organization_id = new.organization_id and f.record_id = new.entity_id and f.following) then
    return null;
  end if;
  -- Somebody the comment NAMES is already told by the mention notice: one notice, not two.
  begin
    select array_agg(m::uuid) into v_skip from jsonb_array_elements_text(coalesce(new.metadata -> 'mentions', '[]'::jsonb)) m;
  exception when others then
    v_skip := null;
  end;
  begin
    perform custom._record_follow_notify(
      new.organization_id, new.entity_id, v_table, new.created_by, 'comment:' || new.id::text,
      'commented on',
      format('/data/%s?record=%s&comment=%s', v_table, new.entity_id, new.id),
      new.body, v_skip);
  exception when others then
    raise warning 'custom._record_follow_commented: comment % skipped — %', new.id, sqlerrm;
  end;
  return null;
end
$function$;

create trigger zzzz_record_follow_changed_s_i after insert on custom.io_outbox
  referencing new table as new_rows for each statement execute function custom._record_follow_changed_stmt();
create trigger zz_record_follow_commented after insert on platform.comments
  for each row execute function custom._record_follow_commented();

-- Declared BEFORE the grant: platform.enforce_definer_client_grants revokes an undeclared client EXECUTE.
insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason, anonymous_callers, signed_in_callers, argument_rules)
values
  ('custom', 'record_follow_set', 'p_organization_id uuid, p_record_id uuid, p_follow boolean',
   array['uuid'::regtype::oid, 'uuid'::regtype::oid, 'bool'::regtype::oid],
   'migrations/campaign/atfixg2_follow_a_record.sql (lane AT-FIX-G2)',
   'p_organization_id is checked by custom.assert_client_may_reach on entry. p_record_id is checked in this body: a follow is written only when the record exists in that organization and custom.query_principal() may read it (platform.detail_parent_access_for at viewer); the row written is always the caller''s own, never another person''s. p_follow false switches off only the caller''s own row.',
   false, true, '{"version":1,"arguments":{"p_organization_id":{"type":"uuid","check":"this body decides it with custom.assert_client_may_reach(arg1) — the organization wall — a non-member is refused before anything is read, and that call stands before every other use of this argument in the body.","entity":"organization","foreign":{"sqlstate":"42501","same_as_invented":true},"position":1,"verified":"2026-10-19 lane AT-FIX-G2 — read from this body"},"p_record_id":{"type":"uuid","check":"this body decides it with platform.detail_parent_access_for(arg3) — the record ladder at the viewer rung — and that call stands before every other use of this argument in the body.","entity":"custom_record","foreign":{"note":"the door''s own refusal on that ladder; a foreign id and an invented one take the same branch","not_a_leak":true,"same_as_invented":true},"position":3,"verified":"2026-10-19 lane AT-FIX-G2 — read from this body"}}}'::jsonb),
  ('custom', 'record_followers', 'p_organization_id uuid, p_record_id uuid',
   array['uuid'::regtype::oid, 'uuid'::regtype::oid],
   'migrations/campaign/atfixg2_follow_a_record.sql (lane AT-FIX-G2)',
   'p_organization_id is checked by custom.assert_client_may_reach on entry. p_record_id is checked in this body: nothing is returned (an empty list) unless custom.query_principal() may read the record (platform.detail_parent_access_for at viewer). The names come from custom.history_people, this organization''s own members.',
   false, true, '{"version":1,"arguments":{"p_organization_id":{"type":"uuid","check":"this body decides it with custom.assert_client_may_reach(arg1) — the organization wall — a non-member is refused before anything is read, and that call stands before every other use of this argument in the body.","entity":"organization","foreign":{"sqlstate":"42501","same_as_invented":true},"position":1,"verified":"2026-10-19 lane AT-FIX-G2 — read from this body"},"p_record_id":{"type":"uuid","check":"this body decides it with platform.detail_parent_access_for(arg3) — the record ladder at the viewer rung — and that call stands before every other use of this argument in the body.","entity":"custom_record","foreign":{"note":"the door''s own refusal on that ladder; a foreign id and an invented one take the same branch","not_a_leak":true,"same_as_invented":true},"position":3,"verified":"2026-10-19 lane AT-FIX-G2 — read from this body"}}}'::jsonb)
on conflict (schema_name, function_name, identity_argtypes) do nothing;

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, declared_by, reason,
   non_client_lane, signed_in_callers, anonymous_callers)
values
  ('custom', '_record_follow_notify', 'p_organization_id uuid, p_record_id uuid, p_table_id uuid, p_actor uuid, p_dedupe text, p_what text, p_link text, p_body text, p_skip uuid[]',
   array['uuid'::regtype::oid, 'uuid'::regtype::oid, 'uuid'::regtype::oid, 'uuid'::regtype::oid, 'text'::regtype::oid, 'text'::regtype::oid, 'text'::regtype::oid, 'text'::regtype::oid, '_uuid'::regtype::oid],
   'migrations/campaign/atfixg2_follow_a_record.sql (lane AT-FIX-G2)',
   'Writes one in-app notice per follower of the named record, and only to a follower who may still read it (platform.detail_parent_access_for at viewer). It is the shared writer of the two follow triggers and names no row to a caller.',
   'server_only: called only by custom._record_follow_changed_stmt and custom._record_follow_commented, which run off a store write that has already passed its own doors. A client has no reason to call it.',
   false, false)
on conflict (schema_name, function_name, identity_argtypes) do nothing;

grant execute on function custom.record_follow_set(uuid, uuid, boolean) to authenticated;
grant execute on function custom.record_followers(uuid, uuid) to authenticated;
insert into communication.notification_event_type (event_key, label, description, default_channels, config, organization_id)
select 'custom.record.follow', 'A record you follow changed',
       'Somebody else changed, archived or commented on a record you follow.',
       t.default_channels,
       jsonb_set(t.config, '{templates,in_app,subject}', '"A record you follow changed"'::jsonb),
       t.organization_id
  from communication.notification_event_type t
 where t.event_key = 'custom.comment.mention' and t.deleted_at is null
   and not exists (select 1 from communication.notification_event_type x where x.event_key = 'custom.record.follow');

