-- INVERSE of atsweep3_a_the_ladder_refusal_names_the_action_not_the_door.sql: the earlier words of every function it replaces.
-- chair-step: restores function bodies.
@@BASEDON@@
CREATE OR REPLACE FUNCTION custom.assert_client_may_change(p_organization_id uuid, p_subject_id uuid, p_door text, p_required permission_level DEFAULT 'editor'::permission_level, p_subject_word text DEFAULT 'record'::text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me          uuid;
  v_subject_org uuid;
  v_held        public.permission_level;
begin
  -- ONE order, always: the organization wall first, then the row.
  perform custom.assert_client_may_reach(p_organization_id, p_door);

  -- Way through 1: the role that owns the store (every campaign and server lane).
  if custom.query_is_store_owner() then
    return;
  end if;

  if p_subject_id is null then
    return;
  end if;

  -- Way through 2: no signed-in person at all — the anonymous capture door, which has
  -- already decided this write against the form's own token.
  v_me := custom.query_principal();
  if v_me is null then
    return;
  end if;

  -- WHERE THE SUBJECT ACTUALLY LIVES, BY ITS ID AND NOTHING ELSE (2026-09-23). A subject
  -- outside p_organization_id used to be waved through on the promise that the door would
  -- filter by that organization; the same promise was broken on the read side
  -- (`custom.record_as_of`, a cross-organization leak proven live). Access is decided by the
  -- PERSON and the ROW (organization-is-the-container rule 5).
  select r.organization_id into v_subject_org
    from custom.record r
   where r.id = p_subject_id;

  -- Not there at all: the door raises its own 02000 a line later.
  if v_subject_org is null then
    return;
  end if;

  -- The globally readable platform tenant's kernel Tables: unchanged — the door decides.
  if v_subject_org is distinct from p_organization_id
     and exists (select 1 from iam.system_orgs s
                  where s.organization_id = v_subject_org and s.global_readable) then
    return;
  end if;

  if custom.has_visibility(v_me, 'record', p_subject_id, p_required) then
    return;
  end if;

  -- THE REFUSAL NAMES THE RUNG HELD, NOT ONLY THE RUNG NEEDED (lane TAILS, 2026-09-21).
  v_held := custom.effective_level(v_me, v_subject_org, p_subject_id, 'record');

  if v_held is null then
    raise exception 'You do not have access to this %, so % may not write to it.',
      coalesce(nullif(btrim(p_subject_word), ''), 'record'),
      coalesce(nullif(btrim(p_door), ''), 'that door')
      using errcode = '42501',
            hint = format(
              'DOOR-1 decides reading and writing with the SAME question: a %s you may not open is a %s you may not change. This needs %s (View < Comment < Edit < Full access) - ask whoever has it to share it with you, or ask an owner of this organization. Being a member of the organization is not by itself permission to rewrite somebody else''s row.',
              coalesce(nullif(btrim(p_subject_word), ''), 'record'),
              coalesce(nullif(btrim(p_subject_word), ''), 'record'),
              case p_required::text when 'viewer' then 'View access' when 'commenter' then 'Comment access' when 'editor' then 'Edit access' when 'admin' then 'Full access' else p_required::text end);
  end if;

  raise exception 'You have % on this %, and % needs %.',
    case v_held::text when 'viewer' then 'View access' when 'commenter' then 'Comment access' when 'editor' then 'Edit access' when 'admin' then 'Full access' else v_held::text end,
    coalesce(nullif(btrim(p_subject_word), ''), 'record'),
    coalesce(nullif(btrim(p_door), ''), 'that door'),
    case p_required::text when 'viewer' then 'View access' when 'commenter' then 'Comment access' when 'editor' then 'Edit access' when 'admin' then 'Full access' else p_required::text end
    using errcode = '42501',
          hint = format(
            'DOOR-1 decides reading and writing with the SAME question, on ONE ladder: View < Comment < Edit < Full access. You have %s on this %s and %s needs %s, so ask someone with Full access on this %s - or an owner of this organization - to raise your access. Being a member of the organization is not by itself permission to rewrite somebody else''s row.',
            case v_held::text when 'viewer' then 'View access' when 'commenter' then 'Comment access' when 'editor' then 'Edit access' when 'admin' then 'Full access' else v_held::text end,
            coalesce(nullif(btrim(p_subject_word), ''), 'record'),
            coalesce(nullif(btrim(p_door), ''), 'that door'),
            case p_required::text when 'viewer' then 'View access' when 'commenter' then 'Comment access' when 'editor' then 'Edit access' when 'admin' then 'Full access' else p_required::text end,
            coalesce(nullif(btrim(p_subject_word), ''), 'record'));
end
$function$;

CREATE OR REPLACE FUNCTION custom.io_restore(p_organization_id uuid, p_record_id uuid, p_version integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_user    uuid := custom.query_principal();
  v_target  jsonb;
  v_current jsonb;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.io_restore');
  -- Restoring REWRITES the record, so it needs the level that may rewrite it. A commenter
  -- who could restore would be able to change every value on the record without being
  -- allowed to change one.
  if not custom.has_visibility(v_user, 'record', p_record_id, 'editor'::public.permission_level) then
    raise exception 'You may not restore this record to an earlier version.'
      using errcode = '42501',
            hint = 'Restoring rewrites every value on the record, so it needs the editor level — the same level that lets you change one of them by hand.';
  end if;
  if p_version is null then
    raise exception 'custom.io_restore: name the version to restore. custom.record_history(organization, record) lists them with who changed what.'
      using errcode = '22004';
  end if;

  select v.row_data -> 'data' into v_target
    from history.row_versions v
   where v.entity_type = 'custom.record'
     and v.organization_id = p_organization_id
     and v.row_id = p_record_id
     and v.version = p_version
   order by v.occurred_at desc, v.id desc
   limit 1;

  if v_target is null then
    raise exception 'There is no saved version % of this to go back to.', p_version
      using errcode = '02000',
            hint = 'The saved versions are listed by custom.record_history(organization, record). Value history older than this table''s retention may have been pruned — the two most recent are always kept.';
  end if;

  select r.data into v_current
    from custom.record r
   where r.organization_id = p_organization_id and r.id = p_record_id;

  -- THE SAME WRITE PATH AGAIN, so going back to an old version is a NEW version rather than
  -- a hole in the record: the chain keeps growing forwards, always. And the version comes
  -- from the write itself — `custom.record_update` returns the row it wrote. The old body
  -- asked `custom.read_record` for it, which answers the DOCUMENT and never a column, so
  -- this door returned null to every caller it ever had.
  return custom.record_update(p_organization_id, p_record_id,
                              custom.history_restore_body(v_current, v_target, null));
end;
$function$;

CREATE OR REPLACE FUNCTION custom.io_restore(p_organization_id uuid, p_record_id uuid, p_version integer, p_author jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_user    uuid := custom.query_principal();
  v_target  jsonb;
  v_current jsonb;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.io_restore');
  if not custom.has_visibility(v_user, 'record', p_record_id, 'editor'::public.permission_level) then
    raise exception 'You may not restore this record to an earlier version.'
      using errcode = '42501',
            hint = 'Restoring rewrites every value on the record, so it needs the editor level — the same level that lets you change one of them by hand.';
  end if;
  if p_version is null then
    raise exception 'custom.io_restore: name the version to restore. custom.record_history(organization, record) lists them with who changed what.'
      using errcode = '22004';
  end if;

  select v.row_data -> 'data' into v_target
    from history.row_versions v
   where v.entity_type = 'custom.record'
     and v.organization_id = p_organization_id
     and v.row_id = p_record_id
     and v.version = p_version
   order by v.occurred_at desc, v.id desc
   limit 1;

  if v_target is null then
    raise exception 'There is no saved version % of this to go back to.', p_version
      using errcode = '02000',
            hint = 'The saved versions are listed by custom.record_history(organization, record). Value history older than this table''s retention may have been pruned — the two most recent are always kept.';
  end if;

  select r.data into v_current
    from custom.record r
   where r.organization_id = p_organization_id and r.id = p_record_id;

  return custom.record_update(p_organization_id, p_record_id,
                              custom.history_restore_body(v_current, v_target, null, p_author));
end;
$function$;

CREATE OR REPLACE FUNCTION custom.anon_capture(p_organization_id uuid, p_client_key text, p_table_id uuid, p_payload jsonb, p_device text DEFAULT NULL::text, p_captured_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_existing uuid;
  v_id       uuid;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.anon_capture');

  -- THE ACCESS DECISION, BEFORE EXISTENCE. This is the SIGNED-IN offline path, so there is a
  -- principal and it must be able to write into this Table — asked of `custom.has_visibility`,
  -- the platform's ONE answer to "may this actor touch this row?", never of the organization
  -- id, which is tenancy and not permission. It is decided before the ledger is read, so a
  -- Table the caller may not reach and a Table that does not exist answer identically: the
  -- opposite order is how a door becomes an existence oracle.
  if not custom.has_visibility(custom.query_principal(), 'record', p_table_id,
                            'editor'::public.permission_level) then
    raise exception 'You may not add records to this table.'
      using errcode = '42501',
            hint = 'Offline capture writes a record when the device reconnects, so it needs the same editor level on the table that adding a record by hand needs.';
  end if;

  if coalesce(btrim(coalesce(p_client_key, '')), '') = '' then
    raise exception 'custom.anon_capture: the client mints the id, offline, before the first attempt. Without it a reconnect cannot tell a retry from a second capture.'
      using errcode = '22004';
  end if;

  -- THE LEDGER IS THE MECHANISM. `on conflict do nothing` plus the unique index means the
  -- second, third and thirtieth replay all take the same branch, whatever the client believes.
  insert into custom.anon_replay (organization_id, client_key, table_id, device, captured_at)
  values (p_organization_id, p_client_key, p_table_id, p_device, coalesce(p_captured_at, now()))
  on conflict (organization_id, client_key) where deleted_at is null do nothing;

  select r.record_id into v_existing from custom.anon_replay r
   where r.organization_id = p_organization_id and r.client_key = p_client_key;
  if v_existing is not null then
    update custom.anon_replay set replays = replays + 1
     where organization_id = p_organization_id and client_key = p_client_key;
    return v_existing;
  end if;

  v_id := custom.record_write(p_organization_id, p_table_id,
                              coalesce(p_payload, '{}'::jsonb)
                              || jsonb_build_object('_actor', 'user'));
  update custom.anon_replay set record_id = v_id
   where organization_id = p_organization_id and client_key = p_client_key
     and record_id is null;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.anon_token_issue(p_organization_id uuid, p_mode text, p_allowed_origins jsonb, p_form_id uuid DEFAULT NULL::uuid, p_saved_view_id uuid DEFAULT NULL::uuid, p_record_id uuid DEFAULT NULL::uuid, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(token_id uuid, secret text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_user   uuid := custom.query_principal();
  v_table  uuid;
  v_secret text;
  v_id     uuid;
  v_n      integer;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.anon_token_issue');
  if coalesce(p_mode, '') not in ('read', 'write') then
    raise exception 'custom.anon_token_issue: mode is read or write, not "%". A token carrying both would be one credential holding two decisions, and the second is always the one nobody meant to grant.', p_mode
      using errcode = '22023';
  end if;

  select count(*) into v_n from jsonb_array_elements_text(coalesce(p_allowed_origins, '[]'::jsonb));
  if v_n = 0 then
    -- An empty origin list is refused at ISSUE rather than silently meaning "everywhere".
    raise exception 'custom.anon_token_issue: name the origins this token works from.'
      using errcode = '22004',
            hint = 'An embed token with no origin list is a token that works from any page on the internet, including an attacker''s. Pass the exact origins, scheme and host and port: ["https://example.com"].';
  end if;

  if p_mode = 'write' then
    if p_form_id is null then
      raise exception 'custom.anon_token_issue: a write token must name the form it writes to'
        using errcode = '22004';
    end if;
    select f.table_id into v_table from custom.anon_form f
     where f.organization_id = p_organization_id and f.id = p_form_id and f.deleted_at is null;
    if v_table is null then
      raise exception 'custom.anon_token_issue: no such form in this organization' using errcode = '23503',
            detail = jsonb_build_object('form_id', p_form_id)::text;
    end if;
    if not custom.has_visibility(v_user, 'record', v_table, 'admin'::public.permission_level) then
      raise exception 'You may not issue a write token for this form.'
        using errcode = '42501',
              hint = 'Issuing a write token hands a stranger a way in, so it needs the admin level on the Table the form writes into.';
    end if;
  elsif p_record_id is not null then
    if not custom.has_visibility(v_user, 'record', p_record_id, 'admin'::public.permission_level) then
      raise exception 'You may not issue a read token for this record.'
        using errcode = '42501',
              hint = 'A read token lets anyone holding it read the record from an allowed origin, so issuing one needs the admin level on that record.';
    end if;
  end if;

  -- ARGS-RULED (2026-09-21). AND THE SAVED VIEW, ON THE SAME LADDER AS THE RECORD BESIDE IT.
  -- `p_saved_view_id` was written into custom.anon_token with nothing asked about it, and the
  -- token this door mints grants ANONYMOUS reads — so a member could issue a public token over a
  -- saved view they do not hold. The record arm above has asked `admin` since the day it was
  -- written; a saved view is a Record of this store like any other and takes the same question.
  if p_saved_view_id is not null
     and not custom.has_visibility(v_user, 'record', p_saved_view_id, 'admin'::public.permission_level) then
    raise exception 'You may not issue a token for this saved view.'
      using errcode = '42501',
            hint = 'A token over a saved view lets anyone holding it read that view from an allowed origin, so issuing one needs the admin level on the view - the same level the record arm of this door has always asked for.';
  end if;

  -- The secret is minted here and returned ONCE. Only its digest is stored, so a database read
  -- — a backup, a support query, a leaked dump — cannot produce a working token.
  v_secret := encode(extensions.gen_random_bytes(32), 'hex');
  insert into custom.anon_token (organization_id, form_id, saved_view_id, record_id, mode,
                                 secret_hash, allowed_origins, expires_at, created_by)
  values (p_organization_id, p_form_id, p_saved_view_id, p_record_id, p_mode,
          encode(extensions.digest(v_secret, 'sha256'), 'hex'),
          coalesce(p_allowed_origins, '[]'::jsonb), p_expires_at, v_user)
  returning id into v_id;

  token_id := v_id; secret := v_secret; return next;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.io_comment_write(p_organization_id uuid, p_record_id uuid, p_body text, p_anchor jsonb DEFAULT '{}'::jsonb, p_parent_comment_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_user  uuid := custom.query_principal();
  v_doc   jsonb;
  v_table uuid;
  v_id    uuid;
  v_org_of_record uuid;
  v_field text;
  v_extra jsonb;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.io_comment_write');
  -- THE ORGANIZATION WALL, IN THIS DOOR'S OWN BODY (STORE-DOORS-DECIDE-RED, 2026-09-26). RC-A2h
  -- moved the row question to platform.detail_parent_access_for, which is right and stays; this
  -- is the first half of DOOR-1's one order (the wall, then the row) that custom.read_record and
  -- custom.comment_thread already ask. Members, portal principals, people a Table of this
  -- organization is shared with and scope members pass it exactly as before (memoised per
  -- transaction); a stranger now hears a sentence instead of a door that trusted its argument.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.io_comment_write');
  if coalesce(btrim(coalesce(p_body, '')), '') = '' then
    raise exception 'custom.io_comment_write: a comment with no body is not a comment'
      using errcode = '22004';
  end if;

  -- THE LEVEL: commenter on the record (viewer < commenter < editor < admin), asked of the store's
  -- one answer. The refusal sentence matches the fact (lane LEAK-T10): the lower rung is asked
  -- before telling anybody they may read a record.
  if not platform.detail_parent_access_for(v_user, 'record', p_record_id, 'commenter'::public.permission_level) then
    if platform.detail_parent_access_for(v_user, 'record', p_record_id, 'viewer'::public.permission_level) then
      raise exception 'You may read this record but not comment on it.'
        using errcode = '42501',
              hint = 'Commenting needs the commenter level on the record (viewer < commenter < editor < admin). Ask whoever shared it with you to raise your level; nothing about the record itself has to change.';
    end if;
    raise exception 'You do not have access to this record.'
      using errcode = '42501',
            hint = 'REC-29 / VIS-1: this is the same answer every other door gives about a record you do not hold, and it is deliberately the same whether the record exists or not. Ask whoever owns it to share it with you at the commenter level.';
  end if;

  -- THE ORGANIZATION IS THE RECORD'S (ARGS-RULED 2026-09-21), never the caller's to choose.
  v_org_of_record := custom._organization_of_record(p_record_id);
  if v_org_of_record is null then
    raise exception 'custom.io_comment_write: that record is not in this organization, or is deleted' using errcode = '23503',
            detail = jsonb_build_object('record_id', p_record_id)::text;
  end if;
  if v_org_of_record <> p_organization_id then
    raise exception 'That record belongs to a different organization, so the comment was not written.'
      using errcode = '23514',
            hint = format('A comment is filed where its record lives. This record belongs to organization %s; you named %s. Switch to that organization and comment there — being shared a record does not move it.',
                          v_org_of_record, p_organization_id);
  end if;

  -- THE ONE READ DOOR for the table id (a convenience copy; absent when the read door declines).
  begin
    v_doc := custom.read_record(p_organization_id, p_record_id, true);
  exception when sqlstate '42501' then
    v_doc := null;
  end;
  v_table := (v_doc ->> 'table_id')::uuid;

  if p_parent_comment_id is not null
     and not exists (select 1 from platform.comments c
                      where c.organization_id = p_organization_id
                        and c.id = p_parent_comment_id
                        and c.entity_type = 'record'
                        and c.entity_id = p_record_id
                        and c.deleted_at is null) then
    -- A reply to a comment on ANOTHER record would put one conversation in two places.
    raise exception 'custom.io_comment_write: that comment is not a comment on this record' using errcode = '23503',
            detail = jsonb_build_object('parent_comment_id', p_parent_comment_id, 'record_id', p_record_id)::text;
  end if;

  -- 🚨 RC-A2e: THE ONE COMMENT STORE. A record comment is a platform.comments row on
  -- (record, id); the field it points at is a record_field_anchor kind, mentions and the table id
  -- ride in metadata, and any other key the caller sent is kept, never dropped.
  v_field := nullif(btrim(coalesce(p_anchor ->> 'field_key', '')), '');
  v_extra := nullif(coalesce(p_anchor, '{}'::jsonb) - 'field_key' - 'mentions', '{}'::jsonb);
  insert into platform.comments (organization_id, entity_type, entity_id, parent_id, body, anchor,
                                 metadata, created_by, updated_by)
  values (p_organization_id, 'record', p_record_id, p_parent_comment_id, btrim(p_body),
          case when v_field is not null
               then jsonb_build_object('__kind', 'record_field_anchor', 'field_key', v_field) end,
          jsonb_strip_nulls(jsonb_build_object(
            'table_id', v_table,
            'mentions', case when jsonb_typeof(p_anchor -> 'mentions') = 'array' then p_anchor -> 'mentions' end,
            'anchor_extra', v_extra)),
          v_user, v_user)
  returning id into v_id;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.conversation_scope_bind(p_organization_id uuid, p_conversation_id uuid, p_record_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me    uuid := auth.uid();
  v_table uuid;
  v_name  text;
  v_title text;
  v_meta  jsonb;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.conversation_scope_bind');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.conversation_scope_bind');

  -- THE RECORD, ON THE ONE LADDER. A person who may not open the record may not point a
  -- conversation at it, because the binding is what puts the record into a prompt.
  if not custom.has_visibility(v_me, 'record', p_record_id, 'viewer') then
    raise exception 'You do not have access to that record, so a conversation cannot be about it.'
      using errcode = '42501',
            hint = 'AGT-N-9: the binding is what puts a record into a prompt, so it takes the same '
                   'viewer level the read door takes. Ask somebody who holds it to share it with you.';
  end if;

  -- THE CONVERSATION, ON ITS OWN LADDER — and deliberately not the store's. A conversation
  -- is not a Record of this store; `custom.has_visibility` cannot decide a row it has never
  -- heard of, and `iam.has_access` is the platform ladder that owns `chat.conversation`.
  if not coalesce(iam.has_access('conversation', p_conversation_id, 'editor'::public.permission_level), false) then
    raise exception 'That conversation is not yours to point at a record.'
      using errcode = '42501',
            hint = 'A conversation is bound by somebody who may write in it.';
  end if;

  select r.table_id,
         coalesce(nullif(t.data ->> 'label_singular', ''), nullif(t.data ->> 'name', ''), 'Record'),
         coalesce(nullif(btrim(coalesce(r.data ->> nullif(t.data ->> 'title_field', ''), '')), ''), 'Untitled')
    into v_table, v_name, v_title
    from custom.record r
    left join custom.record t
      on t.organization_id = r.organization_id and t.id = r.table_id
   where r.organization_id = p_organization_id and r.id = p_record_id and r.deleted_at is null;

  if not found then
    raise exception 'There is no such record in this organization.' using errcode = '02000',
            detail = jsonb_build_object('record_id', p_record_id)::text;
  end if;

  v_meta := jsonb_build_object('scope_type', v_name, 'scope_type_id', v_table,
                               'bound_by_door', 'custom.conversation_scope_bind');

  -- ONE SCOPE PER CONVERSATION. Pointing a conversation at a DIFFERENT record retires the
  -- old edge rather than leaving two, because "what is this chat about" may only have one
  -- answer.
  update platform.associations a
     set deleted_at = now(), deleted_via_type = 'conversation', deleted_via_id = p_conversation_id
   where a.source_type = 'conversation'
     and a.source_id = p_conversation_id
     and a.target_type in ('record', 'custom_record')   -- SC-4: `record` is the store's token; a
     and a.role = 'record_scope'                         -- binding left under the retired one is retired too
     and a.deleted_at is null
     and (a.target_id is distinct from p_record_id or a.target_type = 'custom_record');

  -- REVIVE-OR-WRITE, in two statements. A tombstoned edge coming back IS a write and is
  -- judged as one by `platform.enforce_client_association_endpoint_access` — which this
  -- SECURITY DEFINER body stands outside, having already made both decisions above itself.
  update platform.associations a
     set deleted_at = null, deleted_via_type = null, deleted_via_id = null,
         label = v_title, metadata = v_meta, created_by = coalesce(a.created_by, v_me)
   where a.source_type = 'conversation'
     and a.source_id = p_conversation_id
     and a.target_type = 'record'
     and a.target_id = p_record_id
     and a.role = 'record_scope';

  if not found then
    insert into platform.associations
      (source_type, source_id, target_type, target_id, role, organization_id, label, metadata, created_by)
    values
      ('conversation', p_conversation_id, 'record', p_record_id, 'record_scope',
       p_organization_id, v_title, v_meta, v_me);
  end if;

  return jsonb_build_object('bound', true, 'readable', true,
                            'record_id', p_record_id, 'table_id', v_table,
                            'scope_type', v_name, 'title', v_title);
end;
$function$;

CREATE OR REPLACE FUNCTION research.save_reader_edit(p_token text, p_id uuid, p_body text, p_expected_version integer)
 RETURNS TABLE(version integer, capture_version integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
-- A person's edit to an AI-written research record (an accepted suggestion in the reader).
-- The record keeps its id — so every comment, highlight and link on it stays attached — and
-- the text it had is kept as a previous version (a non-current copy carrying the old capture
-- version, metadata.edited_from = the record), exactly where Rebuild/Update keep theirs.
-- Editor on the record is required; a stale p_expected_version answers PT409 with no write.
declare
  v_snap uuid := gen_random_uuid();
  v_next integer;
  v_cur record;
begin
  if p_token is null or p_id is null or p_body is null or p_expected_version is null then
    raise exception 'save_reader_edit: token, id, body and expected version are required' using errcode = '22004';
  end if;
  if p_token not in ('research_synthesis', 'research_document') then
    raise exception 'save_reader_edit: % records are not edited here', p_token using errcode = '22023';
  end if;
  if not platform.detail_parent_access(p_token, p_id, 'editor'::public.permission_level) then
    raise exception 'save_reader_edit: you cannot edit this record — it needs the editor level. Ask its owner to share it with you as an editor.' using errcode = '42501';
  end if;

  if p_token = 'research_synthesis' then
    select s.* into v_cur from research.rs_synthesis s where s.id = p_id and s.deleted_at is null for update;
    if v_cur.id is null then raise exception 'save_reader_edit: the record no longer exists' using errcode = 'P0002'; end if;
    if v_cur.version is distinct from p_expected_version then
      raise exception 'save_reader_edit: this record changed since you opened it (now version %); reload and accept again', v_cur.version using errcode = 'PT409';
    end if;
    select coalesce(max(s.capture_version), 0) + 1 into v_next from research.rs_synthesis s
     where s.topic_id = v_cur.topic_id and s.scope = v_cur.scope
       and s.keyword_id is not distinct from v_cur.keyword_id and s.tag_id is not distinct from v_cur.tag_id;
    insert into research.rs_synthesis
      select (jsonb_populate_record(null::research.rs_synthesis,
              to_jsonb(v_cur) || jsonb_build_object('id', v_snap, 'is_current', false,
                'metadata', coalesce(v_cur.metadata, '{}'::jsonb) || jsonb_build_object('edited_from', p_id)))).*;
    update research.rs_synthesis s set result = p_body, capture_version = v_next where s.id = p_id;
    return query select s.version, s.capture_version from research.rs_synthesis s where s.id = p_id;
  else
    select d.* into v_cur from research.rs_document d where d.id = p_id and d.deleted_at is null for update;
    if v_cur.id is null then raise exception 'save_reader_edit: the record no longer exists' using errcode = 'P0002'; end if;
    if v_cur.version is distinct from p_expected_version then
      raise exception 'save_reader_edit: this record changed since you opened it (now version %); reload and accept again', v_cur.version using errcode = 'PT409';
    end if;
    select coalesce(max(d.capture_version), 0) + 1 into v_next from research.rs_document d where d.topic_id = v_cur.topic_id;
    insert into research.rs_document
      select (jsonb_populate_record(null::research.rs_document,
              to_jsonb(v_cur) || jsonb_build_object('id', v_snap, 'is_current', false,
                'metadata', coalesce(v_cur.metadata, '{}'::jsonb) || jsonb_build_object('edited_from', p_id)))).*;
    update research.rs_document d set content = p_body, capture_version = v_next, is_current = true where d.id = p_id;
    return query select d.version, d.capture_version from research.rs_document d where d.id = p_id;
  end if;
end
$function$;

CREATE OR REPLACE FUNCTION custom.work_approval_decide(p_organization_id uuid, p_approval_id uuid, p_approve boolean, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me      uuid := custom.query_principal();
  v_row     custom.record;
  v_change  jsonb;
  v_kind    text;
  v_subject uuid;
  v_outcome text;
  v_key     text;
  v_fields  jsonb;
  v_spec    jsonb;
  v_field   uuid;
  v_version integer;
  v_written uuid[] := '{}';
  v_one     uuid;
  v_doc     jsonb;
  v_table   uuid;
  v_conv    uuid;
  v_at      timestamptz;
  v_why     text;
  v_by_name text;
  v_fill    jsonb;
  v_by      uuid;      -- VISION-REACH W4 (b): who asked (for an agent, the person it worked for)
  v_credit  boolean := false;
  v_view    uuid;      -- VISION-REACH W4 (c): the saved view a subscription_add watches
  v_tell    jsonb;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.work_approval_decide');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.work_approval_decide');

  select r.* into v_row from custom.record r
   where r.organization_id = p_organization_id and r.id = p_approval_id
     and r.data_class = 'work_approval' and r.deleted_at is null;
  if v_row.id is null then
    raise exception 'There is no such approval in this organization.' using errcode = '02000';
  end if;
  -- LANE S5-PRIME: A WITHDRAWN APPROVAL SAYS WHY. Nobody decided it; the store closed it when the
  -- thing it would change was archived, and the reason is on the approval itself.
  if v_row.data ->> 'state' = 'withdrawn' then
    -- HANDOVER (2026-09-27): no clock in the sentence. WHEN it closed is a fact for the reader's
    -- own clock, so it rides in DETAIL (ISO 8601) and the screen says it in the reader's words.
    raise exception 'That was withdrawn. %', coalesce(v_row.data ->> 'withdrawn_reason', '')
      using errcode = '23505',
            hint = 'A withdrawn approval is closed. Bring the record back from the archive and ask again if the change still needs making.',
            detail = jsonb_build_object('state', 'withdrawn',
                                        'decided_at', nullif(v_row.data ->> 'decided_at', ''))::text;
  end if;
  if coalesce(v_row.data ->> 'state', 'pending') <> 'pending' then
    -- HANDOVER (2026-09-27): WHO in the sentence, WHEN in DETAIL. The sentence read "That was
    -- already approved, on 2026-09-28T01:23:12.271Z." on a person's screen; the time is now a
    -- structured fact (state, decided_at, decided_by, decided_by_name) the card says as
    -- "Approved by admin 12 minutes ago."
    v_by_name := (select coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''),
                                   nullif(u.raw_user_meta_data ->> 'full_name', ''),
                                   split_part(u.email::text, '@', 1))::text
                      from auth.users u where u.id = nullif(v_row.data ->> 'decided_by', '')::uuid);
    raise exception 'That was already % by %.', v_row.data ->> 'state', coalesce(v_by_name, 'somebody')
      using errcode = '23505',
            hint = 'An approval is decided once. Ask for the change again if it still needs making.',
            detail = jsonb_build_object('state', v_row.data ->> 'state',
                                        'decided_at', nullif(v_row.data ->> 'decided_at', ''),
                                        'decided_by', nullif(v_row.data ->> 'decided_by', ''),
                                        'decided_by_name', v_by_name)::text;
  end if;

  -- VISION-REACH W4 (d): A PERSON DECIDES. An agent working for somebody who may approve would otherwise
  -- approve its own request in their name, which is exactly the yes the organization's setting asks a
  -- person for.
  if platform.declared_actor_tier() = 'agent' then
    raise exception 'An agent does not approve or decline changes; a person does.'
      using errcode = '42501',
            hint = 'Nothing was decided. The person it is waiting for decides it from the approval card or the inbox.';
  end if;
  if not custom.work_approval_may_decide(p_organization_id, p_approval_id) then
    raise exception 'You are not one of the people who can approve this.'
      using errcode = '42501',
            hint = 'AGT-4: an approval is decided by the person it was addressed to, by anybody with admin on the thing being changed, or by an owner or admin of this organization. Ask one of them.';
  end if;
  -- THE SECOND PAIR OF EYES IS FOR A PERSON'S REQUEST. An agent's call runs as the person it
  -- is working for, so `requested_by` on an agent request names THAT person — the very one
  -- `ask` exists to consult. Holding the bar there would have made every agent wait
  -- undecidable by the only person looking at it. It still holds for `origin = 'person'`.
  if v_me is not null and nullif(v_row.data ->> 'requested_by', '')::uuid = v_me
     and coalesce(v_row.data ->> 'origin', 'person') <> 'agent'
     and not custom.query_is_store_owner() then
    raise exception 'You asked for this change, so somebody else approves it.'
      using errcode = '42501',
            hint = 'The point of asking is that a second person says yes. If nobody else needs to, make the change directly instead.';
  end if;

  -- LANE S5-PRIME: NOTHING IS DECIDED ABOUT AN ARCHIVED THING. Archiving withdraws the
  -- approvals waiting on it (custom._work_approvals_withdraw_on_archive); this is the door's own
  -- refusal for any that reach it anyway, in the store's words, before anything is applied.
  v_why := custom.work_approval_withdrawal(p_organization_id, v_row.data);
  if v_why is not null then
    raise exception '%', v_why
      using errcode = '55000',
            hint = 'Nothing was changed. Bring it back from the archive first; then ask for the change again.';
  end if;

  v_subject := nullif(v_row.data ->> 'subject_id', '')::uuid;
  v_change  := v_row.data -> 'change';
  v_kind    := lower(coalesce(v_change ->> 'kind', ''));
  v_conv    := nullif(v_row.data ->> 'conversation_id', '')::uuid;
  v_by      := nullif(v_row.data ->> 'requested_by', '')::uuid;

  -- VISION-REACH W4 (b): AN APPROVED AGENT CHANGE IS THE AGENT'S, APPROVED BY THIS PERSON. The doors below
  -- run as the person deciding (that is what lets a yes through the organization's own setting), so on
  -- their own they would record the person as the author. For an agent's request the values written carry
  -- the agent and the person it worked for (`_actor` / `_on_behalf_of`, the store's own envelope keys),
  -- and every version this decision writes is marked `approved agent change`, which custom.history_actor
  -- reads to name the approver beside the agent. The mark belongs to this one decision: it is cleared the
  -- moment the change is applied, and a person's own request is never marked.
  v_credit := coalesce(p_approve, false)
              and coalesce(v_row.data ->> 'origin', 'person') = 'agent'
              and v_kind in ('record_add', 'record_patch', 'field_add', 'table_add',
                             'record_restore_version', 'subscription_add',
                             'entity_row_change');   -- LANE7-W3B[d1]
  if v_credit then
    perform set_config('history.mark_at',   statement_timestamp()::text, true);
    perform set_config('history.mark_id',   '',                           true);
    perform set_config('history.mark_verb', 'approved agent change',      true);
  elsif coalesce(current_setting('history.mark_verb', true), '') = 'approved agent change' then
    perform set_config('history.mark_at', '', true);   -- a batch's earlier agent decision never marks this one
  end if;

  -- HOST-RUN (2026-10-16): A JOB THAT WRITES SEVERAL TABLES IS APPROVED BY SOMEBODY WHO MAY APPROVE EACH. The
  -- queue resolved the approvers on the first table (the subject); every other table the job names is asked here.
  if coalesce(p_approve, false) and v_kind = 'host_run' and not custom.query_is_store_owner() then
    select coalesce(string_agg(coalesce(custom.record_words(p_organization_id, t.id), 'another table'), ', '), '')
      into v_why
      from (select distinct x::uuid as id
              from jsonb_array_elements_text(coalesce(v_change #> '{job,tables}', '[]'::jsonb)) x
             where x::uuid is distinct from v_subject) t
     where not custom.work_approval_is_approver(p_organization_id, t.id,
                 nullif(v_row.data ->> 'approver_id', '')::uuid, v_me);
    if v_why <> '' then
      raise exception 'This job also writes %, and you are not one of the people who can approve changes there.', v_why
        using errcode = '42501',
              hint = 'Nothing was decided. An owner or admin of the organization, or an admin of those tables, can approve it.';
    end if;
    v_why := null;
  end if;

  if p_approve then
    if v_kind = 'host_run' then
      -- HOST-RUN: THE YES IS RECORDED AND NOTHING IS APPLIED HERE. The rows are read from the source when the job
      -- runs; the server that asked runs exactly this job (its fingerprint) once, through
      -- custom.work_approval_host_run, as the person the agent works for.
      v_outcome := format('Approved: %s.', rtrim(btrim(v_change ->> 'summary'), '.'));
    elsif v_kind = 'record_patch' then
      -- STAGE-RULES: THE GATE THAT ASKED FOR THIS APPROVAL STEPS ASIDE FOR THIS ONE WRITE.
      -- A stage gate whose on_fail is `require_approval` refuses the write by raising, which
      -- is HOW this change got into the queue at all. Applying the yes has to get past the
      -- same gate, and it gets past it by NAMING THE RECORD it is applying an approved
      -- change to, for the length of that one statement and no longer. Every plain refusal,
      -- every other validator and the whole value envelope still run, so an approver is
      -- never told yes over a write the store itself would refuse.
      perform set_config('custom.applying_approval_for', v_subject::text, true);
      v_version := custom.record_update(p_organization_id, v_subject,
                     (v_change -> 'patch') || case when v_credit
                                                   then jsonb_build_object('_actor', 'agent', '_on_behalf_of', v_by::text)
                                                   else '{}'::jsonb end,
                     null);
      perform set_config('custom.applying_approval_for', '', true);
      v_outcome := format('Applied. %s is now at version %s.',
                          coalesce(v_row.data ->> 'subject_title', 'That record'), v_version);
    elsif v_kind = 'record_add' then
      -- THE SAME DOOR THE UNATTENDED PATH USES, once per row, in THIS transaction. Every
      -- guard, every validator and the value envelope run per row exactly as they would for
      -- an agent that was never asked; the difference is whose name is on the history row.
      -- One refused row rolls the whole decision back, which is what a person means by
      -- saying yes to a batch.
      for v_doc in select value from jsonb_array_elements(v_change -> 'rows')
      loop
        v_one := custom.record_write(p_organization_id, v_subject,
                   v_doc || case when v_credit
                                 then jsonb_build_object('_actor', 'agent', '_on_behalf_of', v_by::text)
                                 else '{}'::jsonb end);
        v_written := v_written || v_one;
      end loop;
      v_outcome := format('Applied. %s %s now in %s.',
                          cardinality(v_written),
                          case when cardinality(v_written) = 1 then 'record is' else 'records are' end,
                          coalesce(v_row.data ->> 'subject_title', 'that table'));
    elsif v_kind = 'record_delete' then
      -- THE STORE'S OWN DELETE, AS THE APPROVER, IN THIS TRANSACTION. custom.record_delete
      -- runs custom.delete_rule first, so a record something still reads is refused here in
      -- the store's own words and the decision rolls back — an approver is never told yes
      -- over a delete the store would have refused.
      v_at := custom.record_delete(p_organization_id, v_subject);
      v_outcome := format('Removed. %s was deleted on %s and can be put back.',
                          coalesce(v_row.data ->> 'subject_title', 'That record'),
                          to_char(v_at at time zone 'utc', 'YYYY-MM-DD HH24:MI'));
    elsif v_kind = 'record_restore' then
      perform custom.record_restore(p_organization_id, v_subject);
      v_outcome := format('Put back. %s is here again.',
                          coalesce(v_row.data ->> 'subject_title', 'That record'));
    elsif v_kind = 'table_add' then
      -- EXACTLY WHAT THE DIRECT PATH RUNS, IN EXACTLY THAT ORDER: custom.table_declare with
      -- the spec that was shown, then custom.field_declare once per column. Not a re-derived
      -- spec and not a second way of making a table — the same two doors, so an approved
      -- table and an unasked one are the same bytes.
      v_table := custom.table_declare(p_organization_id, v_change -> 'table');
      for v_doc in select value from jsonb_array_elements(coalesce(v_change -> 'fields', '[]'::jsonb))
      loop
        v_field := custom.field_declare(p_organization_id, v_table, v_doc);
      end loop;
      -- THE CONVERSATION'S CLAIM TRAVELS WITH THE APPROVAL. A table a person said yes to is
      -- still the table this conversation made, so the agent's next change to it is not a
      -- change to somebody's pre-existing table.
      if v_conv is not null then
        perform custom.agent_table_claim(p_organization_id, v_table, v_conv);
      end if;
      v_field := null;
      v_outcome := format('Created. %s is now a table in %s, with %s column%s.',
                          coalesce(nullif(v_change #>> '{table,name}', ''), 'That table'),
                          coalesce(v_row.data ->> 'subject_title', 'this organization'),
                          jsonb_array_length(coalesce(v_change -> 'fields', '[]'::jsonb)),
                          case when jsonb_array_length(coalesce(v_change -> 'fields', '[]'::jsonb)) = 1
                               then '' else 's' end);
    elsif v_kind = 'record_restore_version' then
      -- VISION-REACH W4 (c): THE STORE'S OWN RESTORE, AS THE APPROVER. The record (or the one value the
      -- request named) goes back to that version through custom.record_restore_version /
      -- custom.value_restore — a NEW version, nothing erased — and an agent's request is written as the
      -- agent's, for the person it worked for.
      v_doc := case when v_credit then jsonb_build_object('_actor', 'agent', '_on_behalf_of', v_by::text) end;
      if nullif(v_change ->> 'field_key', '') is not null then
        v_fill := custom.value_restore(p_organization_id, v_subject, v_change ->> 'field_key',
                                       (v_change ->> 'to_version')::integer, v_doc);
      else
        v_fill := custom.record_restore_version(p_organization_id, v_subject,
                                                (v_change ->> 'to_version')::integer, v_doc);
      end if;
      v_version := nullif(v_fill ->> 'version', '')::integer;
      v_fill := null;
      v_outcome := format('Put back. %s now says what it said at version %s%s.',
                          coalesce(v_row.data ->> 'subject_title', 'That record'),
                          v_change ->> 'to_version',
                          case when nullif(v_change ->> 'field_key', '') is not null
                               then format(' (%s only)', v_change ->> 'field_key') else '' end);
    elsif v_kind = 'subscription_add' then
      -- VISION-REACH W4 (c): EXACTLY WHAT THE UNASKED PATH RUNS (RecordStore.subscription_propose): the
      -- saved view that decides what counts (the one named, or `watch` saved as a new one), then one
      -- custom.subscription_declare per entry of `tell`, each telling the person who asked unless the
      -- entry names somebody. Every refusal is the subscription door's own.
      v_view := nullif(v_change ->> 'view_id', '')::uuid;
      if v_view is null then
        v_view := custom.view_declare(p_organization_id, v_subject, jsonb_build_object(
                    'name', coalesce(nullif(v_change ->> 'view_name', ''),
                                     (select 'Where ' || string_agg(format('%s is %s', w.key, w.value #>> '{}'), ', ')
                                        from jsonb_each(coalesce(v_change -> 'watch', '{}'::jsonb)) w),
                                     'Everything'),
                    'filters', coalesce(v_change -> 'watch', '{}'::jsonb)));
      end if;
      for v_tell in select value from jsonb_array_elements(v_change -> 'tell')
      loop
        v_one := custom.subscription_declare(p_organization_id, v_subject, jsonb_strip_nulls(jsonb_build_object(
                   'name', coalesce(nullif(v_tell ->> 'name', ''),
                                    format('%s — %s', coalesce(nullif(v_change ->> 'view_name', ''), 'This view'),
                                           case when coalesce(v_tell ->> 'cadence', 'instant') = 'instant'
                                                then 'as it happens'
                                                else (v_tell ->> 'cadence') || ' summary' end)),
                   'saved_view_id',     v_view,
                   'cadence',           coalesce(nullif(v_tell ->> 'cadence', ''), 'instant'),
                   'channel',           coalesce(nullif(v_tell ->> 'channel', ''), 'in_app'),
                   'schedule',          v_tell -> 'schedule',
                   'quiet_hours',       v_tell -> 'quiet_hours',
                   'recipient_user_id', coalesce(nullif(v_tell ->> 'recipient_user_id', ''), v_by::text))));
        v_written := v_written || v_one;
      end loop;
      v_outcome := format('Set up. %s notification%s on %s.',
                          cardinality(v_written), case when cardinality(v_written) = 1 then '' else 's' end,
                          coalesce(v_row.data ->> 'subject_title', 'that table'));
    elsif v_kind = 'entity_row_change' then
      -- LANE7-W3B[d2]: A STANDARD ROW, THROUGH ITS ONE WRITE DOOR, IN THIS TRANSACTION. The custom-field
      -- guard judges the values for the person deciding; a stale version or a refused value rolls the
      -- decision back in the store's own words.
      v_fill := custom.entity_row_write(p_organization_id, v_change ->> 'token', v_subject,
                  coalesce(v_change -> 'columns', '{}'::jsonb), coalesce(v_change -> 'custom', '{}'::jsonb),
                  nullif(v_change ->> 'expected_version', '')::integer,
                  case when jsonb_typeof(v_change -> 'archive') = 'boolean' then (v_change ->> 'archive')::boolean end);
      v_fill := null;
      v_written := array[v_subject];
      v_outcome := case when jsonb_typeof(v_change -> 'archive') = 'boolean' and (v_change ->> 'archive')::boolean
                        then format('Archived. %s can be put back.', coalesce(v_row.data ->> 'subject_title', 'That record'))
                        when jsonb_typeof(v_change -> 'archive') = 'boolean'
                        then format('Put back. %s is here again.', coalesce(v_row.data ->> 'subject_title', 'That record'))
                        else format('Applied. %s has the new values.', coalesce(v_row.data ->> 'subject_title', 'That record')) end;
    elsif v_kind = 'doc_template_add' then
      -- THE SAME DOOR THE UNASKED PATH USES, with the bytes that were shown on the card.
      -- `custom.doc_template_save` re-runs every one of its own refusals here, as the
      -- approver — including the one that names a token pointing at no column — so an
      -- approved template and one written directly are the same template.
      v_written := array[custom.doc_template_save(
                           p_organization_id, v_subject,
                           v_change #>> '{template,name}',
                           coalesce(v_change #>> '{template,body}', ''),
                           nullif(v_change #>> '{template,template_id}', '')::uuid)];
      v_outcome := format('Saved. %s is now a document template on %s.',
                          coalesce(nullif(v_change #>> '{template,name}', ''), 'That template'),
                          coalesce(v_row.data ->> 'subject_title', 'that table'));
    else
      v_spec := v_change -> 'field';
      v_key  := coalesce(nullif(v_spec ->> 'key', ''), nullif(v_spec ->> 'name', ''));
      if v_key is null then
        raise exception 'That column has no name, so it cannot be added.' using errcode = '22004';
      end if;
      -- ── FIELD-TRUTH 2026-09-21: THE NAME AND THE DEFINITION GO ON TOGETHER. ─────────
      -- This used to write the NAME into the table's `fields` list in one statement and
      -- then define the column in the next. Between those two statements the table claimed
      -- a column that no Field record backed — a name with no type, no rules and no
      -- validation, which `custom.applicable_fields` never answers with and no grid can
      -- draw. `custom.assert_columns_are_defined` refuses exactly that shape now, and it
      -- refused this door: *"Estimates says it has a column called "rate_card", and there
      -- is no such field"* when an agent's Rate card proposal was approved.
      -- The pre-add was also REDUNDANT: `custom.field_declare` appends the name to the
      -- table's list itself, in the same call that writes the definition, which is the
      -- whole point of there being one door for a column.
      v_field := custom.field_declare(p_organization_id, v_subject,
                   v_spec || jsonb_build_object('key', v_key));
      v_outcome := format('%s is now a column on %s.',
                          coalesce(nullif(v_spec ->> 'label', ''), v_key),
                          coalesce(v_row.data ->> 'subject_title', 'that table'));
      -- B4-03 (2026-09-30): A COLUMN AN IMPORT ASKED FOR ARRIVES WITH ITS VALUES, in this
      -- transaction and as the approver, through the one update door.
      if jsonb_typeof(v_change -> 'fill') = 'object' then
        v_fill := custom._io_fill_held_column(p_organization_id, v_subject, v_field,
                    nullif(v_change #>> '{fill,import_id}', '')::uuid, v_change #>> '{fill,column}');
        v_outcome := v_outcome || ' ' || (v_fill ->> 'message');
      end if;
    end if;
    if v_credit then
      perform set_config('history.mark_at', '', true);   -- the decision's own row below is the person's
    end if;
  else
    v_outcome := case
                   when v_kind = 'field_add'
                     then format('The column %s was not added.',
                                 coalesce(nullif(v_change #>> '{field,label}', ''),
                                          nullif(v_change #>> '{field,key}', ''), 'asked for'))
                   when v_kind = 'record_add'
                     then format('%s %s not written to %s.',
                                 jsonb_array_length(coalesce(v_change -> 'rows', '[]'::jsonb)),
                                 case when jsonb_array_length(coalesce(v_change -> 'rows', '[]'::jsonb)) = 1
                                      then 'record was' else 'records were' end,
                                 coalesce(v_row.data ->> 'subject_title', 'that table'))
                   when v_kind = 'record_delete'
                     then format('%s was not deleted, and is still here.',
                                 coalesce(v_row.data ->> 'subject_title', 'That record'))
                   when v_kind = 'record_restore'
                     then format('%s was not put back, and is still deleted.',
                                 coalesce(v_row.data ->> 'subject_title', 'That record'))
                   when v_kind = 'table_add'
                     then format('The table %s was not created.',
                                 coalesce(nullif(v_change #>> '{table,name}', ''), 'asked for'))
                   when v_kind = 'record_restore_version'
                     then format('%s was not put back, and still says what it says now.',
                                 coalesce(v_row.data ->> 'subject_title', 'That record'))
                   when v_kind = 'subscription_add'
                     then format('No notification was set up on %s.',
                                 coalesce(v_row.data ->> 'subject_title', 'that table'))
                   when v_kind = 'host_run'
                     then format('Not run: %s. Nothing was written.', rtrim(btrim(v_change ->> 'summary'), '.'))
                   when v_kind = 'doc_template_add'
                     then format('The document template %s was not saved.',
                                 coalesce(nullif(v_change #>> '{template,name}', ''), 'asked for'))
                   else format('%s was left as it was.',
                               coalesce(v_row.data ->> 'subject_title', 'That record')) end;
  end if;

  perform set_config('custom.decision_door', 'work_approval:decide', true);
  update custom.record r
     set data = r.data || jsonb_strip_nulls(jsonb_build_object(
           'state',         case when p_approve then 'approved' else 'declined' end,
           'decided_by',    v_me::text,
           'decided_at',    to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
           'decision_note', nullif(btrim(coalesce(p_note, '')), ''),
           'applied_field_id', v_field::text,
           'applied_table_id', v_table::text,
           'applied_record_ids', case when cardinality(v_written) > 0
                                      then to_jsonb(v_written) end,
           'outcome',       v_outcome))
   where r.organization_id = p_organization_id and r.id = p_approval_id;
  perform set_config('custom.decision_door', '', true);

  return jsonb_build_object(
    'approval_id', p_approval_id,
    'state',       case when p_approve then 'approved' else 'declined' end,
    'subject_id',  v_subject,
    'applied',     coalesce(p_approve, false),
    'field_id',    v_field,
    'table_id',    v_table,
    'record_ids',  case when cardinality(v_written) > 0 then to_jsonb(v_written) end,
    'version',     v_version,
    'message',     v_outcome);
end
$function$;

CREATE OR REPLACE FUNCTION custom.work_assign(p_organization_id uuid, p_record_id uuid, p_assignee_user_id uuid, p_due_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_clear_due boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_person  uuid;
  v_was     uuid;
  v_patch   jsonb := '{}'::jsonb;
  v_share   jsonb;
  v_name    text;
  v_row     custom.record;
  v_version integer;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.work_assign');
  -- Handing a row to somebody is a CHANGE to that row, so it asks the rung a change asks.
  perform custom.assert_client_may_change(p_organization_id, p_record_id, 'custom.work_assign',
                                          'editor'::public.permission_level, 'record');

  select r.* into v_row from custom.record r
   where r.organization_id = p_organization_id and r.id = p_record_id and r.deleted_at is null;
  if v_row.id is null then
    raise exception 'There is no such record in this organization, so it cannot be assigned.'
      using errcode = '02000';
  end if;
  if not custom.work_has_assignment(p_organization_id, v_row.table_id) then
    raise exception 'This table does not do assignments yet, so nobody can be given one of its records.'
      using errcode = '0A000',
            hint = 'REC-69: turn assignments on for the table first — that adds Assignee, Due date and Status as real columns. An admin of the table does it in one step.';
  end if;

  v_was := nullif(v_row.data ->> 'assignee', '')::uuid;

  if p_assignee_user_id is null then
    v_patch := jsonb_build_object('assignee', null);
  else
    v_person := custom.work_person(p_organization_id, p_assignee_user_id, true);
    v_patch := jsonb_build_object('assignee', v_person::text);
  end if;

  if p_clear_due then
    v_patch := v_patch || jsonb_build_object('due_date', null);
  elsif p_due_date is not null then
    v_patch := v_patch || jsonb_build_object(
      'due_date', to_char(p_due_date at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  end if;

  -- THROUGH THE STORE'S OWN UPDATE DOOR, so the value carries its envelope, the validators
  -- run, and `zzz_history_capture` files this change in the SAME transaction as the share.
  v_version := custom.record_update(p_organization_id, p_record_id, v_patch, null);

  if p_assignee_user_id is not null then
    -- AND THE ACCESS. An assignment that did not give access would put a row in somebody's
    -- inbox that they are refused when they click it.
    --
    -- UNLESS THEY ALREADY REACH IT. `custom.share_grant` refuses, correctly, to grant a rung
    -- BELOW one somebody already holds — "That person already owns this record, which is the
    -- rung above every level you could grant" — and the owner of a record is whoever created
    -- it. So a Table whose rows are made by the same person who is then given them (a
    -- checklist run, an import, any generator that assigns as it writes) hit that refusal on
    -- its first row, and the whole assignment failed because of the half of it that was
    -- already true. Giving somebody a row they already reach is not an error; it is nothing to
    -- do. Found by lane CHECKLISTS on 2026-09-20, whose runner creates every step and then
    -- hands it to the person the checklist names.
    if custom.effective_level(p_assignee_user_id, p_organization_id, p_record_id, 'record')
       >= 'editor'::public.permission_level then
      v_share := jsonb_build_object('message',
        'They could already open and change this, so nothing about access needed to change.');
    else
      v_share := custom.share_grant(p_organization_id, p_record_id, 'person', p_assignee_user_id,
                                    'editor'::public.permission_level);
    end if;
    select r.data ->> 'name' into v_name from custom.record r
     where r.organization_id = p_organization_id and r.id = v_person;
  end if;

  return jsonb_build_object(
    'record_id',   p_record_id,
    'assigned',    p_assignee_user_id is not null,
    'assignee',    v_person,
    'assignee_user_id', p_assignee_user_id,
    'assignee_name', v_name,
    'was',         v_was,
    'due_date',    case when p_clear_due then null else p_due_date end,
    'version',     v_version,
    'access',      coalesce(v_share -> 'message', to_jsonb(
                     'Nobody holds this now. Whatever access was already given stays as it was — '
                     'taking a name off a row is not a reason to take somebody''s access away.'::text)),
    'message',     case when p_assignee_user_id is null
                        then 'Nobody is assigned to this now.'
                        else format('%s has this now, and can edit it.', coalesce(v_name, 'That person')) end);
end
$function$;

CREATE OR REPLACE FUNCTION custom.assert_client_may_open(p_organization_id uuid, p_subject_id uuid, p_door text, p_required permission_level DEFAULT 'viewer'::permission_level, p_subject_word text DEFAULT 'record'::text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me          uuid;
  v_subject_org uuid;
begin
  -- ONE order, always, and it is `custom.assert_client_may_change`'s order: the
  -- organization wall first, then the row.
  perform custom.assert_client_may_reach(p_organization_id, p_door);
  -- CHAIR-WORLD-LANE: a person the wall admitted ONLY through the world lane opens a Public Table, or a row of
  -- one, and nothing else (the subject's Table: itself when it is a Table, else the Table it lives in).
  perform custom.assert_public_reader_names_a_public_table(p_organization_id,
    (select case when r.table_id = custom.table_kernel_id() then r.id else r.table_id end
       from custom.record r
      where r.organization_id = p_organization_id and r.id = p_subject_id),
    p_door);

  -- Way through 1: the role that owns the store (every campaign and server lane).
  if custom.query_is_store_owner() then
    return;
  end if;

  if p_subject_id is null then
    return;
  end if;

  -- Way through 2: no signed-in person at all — the anonymous doors, which have
  -- already decided the request against the form's own token.
  v_me := custom.query_principal();
  if v_me is null then
    return;
  end if;

  -- WHERE THE SUBJECT ACTUALLY LIVES, BY ITS ID AND NOTHING ELSE (2026-09-23).
  -- This used to look only inside p_organization_id and RETURN — let the call through —
  -- when the subject was elsewhere, trusting every door to filter by that organization a
  -- line later. Sixteen doors never did: `custom.record_as_of` handed a member of one
  -- organization the full, unmasked state of a record in an organization she does not
  -- belong to (proven live 2026-09-23 as test@test.com, rolled back). Access is a question
  -- about the PERSON and the ROW, never about which organization was passed in
  -- (organization-is-the-container rule 5).
  select r.organization_id into v_subject_org
    from custom.record r
   where r.id = p_subject_id;

  -- Not there at all: the door raises its own 02000, the same for an invented id.
  if v_subject_org is null then
    return;
  end if;

  -- The platform's globally readable tenants (the Matrx System kernel Tables every
  -- organization builds on) stay reachable exactly as before.
  if v_subject_org is distinct from p_organization_id
     and exists (select 1 from iam.system_orgs s
                  where s.organization_id = v_subject_org and s.global_readable) then
    return;
  end if;

  -- THE ONE LADDER, asked about the row wherever it lives.
  if custom.has_visibility(v_me, 'record', p_subject_id, p_required) then
    return;
  end if;

  raise exception 'You do not have access to this %, so % has nothing to show you.',
    coalesce(nullif(btrim(p_subject_word), ''), 'record'),
    coalesce(nullif(btrim(p_door), ''), 'that door')
    using errcode = '42501',
          hint = format(
            'DOOR-1 decides reading and writing with the SAME question: a %s you may not open is a %s you may not change. This needs the %s level (viewer < commenter < editor < admin) - ask whoever holds it to share it with you, or ask an owner of this organization.',
            coalesce(nullif(btrim(p_subject_word), ''), 'record'),
            coalesce(nullif(btrim(p_subject_word), ''), 'record'),
            p_required);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.record_table(p_organization_id uuid, p_record_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me     uuid;
  v_table  uuid;
begin
  -- THE SWITCH, THEN THE WALL, THEN THE ROW — the store's one order. The wall first, so
  -- somebody in the wrong organization is told that, and not that they may not read a record.
  perform custom.assert_store_door(p_organization_id, 'custom.record_table');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.record_table');

  -- DELETED ROWS COUNT. A record in the trash still lives in a table, and the question
  -- "should this be put back" is asked about that table.
  --
  -- `found` AND NOT AN INTO-TARGET: a SELECT that finds nothing sets every into-target to NULL,
  -- so a `v_found boolean := false` that the SELECT also targets is NULL here, and `if not null`
  -- never fires. `found` is set by the statement and cannot be overwritten by it.
  select r.table_id into v_table
    from custom.record r
   where r.organization_id = p_organization_id and r.id = p_record_id;

  if not found then
    raise exception 'There is no such record in this organization, here or in the trash.' using errcode = '02000',
            hint = 'The id belongs to another organization or to nothing at all — organizations are hard walls (REC-29).',
            detail = jsonb_build_object('record_id', p_record_id)::text;
  end if;

  -- THE ONE LADDER, AT VIEWER ON THE RECORD, IN THIS DOOR'S OWN BODY (MIRROR-PERF, 2026-09-20).
  -- Naming the Table a record lives in is reading that record, so it is the reading rung. The
  -- two ways through are the store's standing two: the role that owns the store (every campaign
  -- and server lane), and no signed-in person at all (the anonymous doors, which have already
  -- decided the request against the form's own token).
  if not custom.query_is_store_owner() then
    v_me := custom.query_principal();
    if v_me is not null
       and not custom.has_visibility(v_me, 'record', p_record_id, 'viewer'::public.permission_level)
    then
      raise exception 'You do not have access to this record, so custom.record_table has nothing to show you.'
        using errcode = '42501',
              hint = 'DOOR-1 decides reading and writing with the SAME question: a record you may not open is a record you may not change. This needs the viewer level (viewer < commenter < editor < admin) - ask whoever holds it to share it with you, or ask an owner of this organization.';
    end if;
  end if;

  return v_table;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.table_webhook_declare(p_organization_id uuid, p_table_id uuid, p_target_url text, p_events text[] DEFAULT NULL::text[], p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  c_events constant text[] := array['record.created', 'record.updated', 'record.archived', 'record.restored', 'record.purged'];
  v_me     uuid := custom.query_principal();
  v_bad    text[];
  v_max    integer;
  v_live   integer;
  v_secret text := encode(extensions.gen_random_bytes(32), 'hex');
  v_id     uuid;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.table_webhook_declare');
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_webhook_declare');
  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.table_webhook_declare',
                                          'admin'::public.permission_level, 'table');
  if v_me is null then
    raise exception 'A webhook belongs to the person who set it up, and nobody is signed in.'
      using errcode = '42501', hint = 'Sign in as an admin of this table. Nothing was created.';
  end if;
  if not exists (select 1 from custom.record t where t.organization_id = p_organization_id and t.id = p_table_id
                    and t.table_id = custom.table_kernel_id() and t.deleted_at is null) then
    raise exception 'That table is not in this organization.' using errcode = '23503';
  end if;
  if not coalesce(files.is_safe_webhook_url(p_target_url), false) then
    raise exception 'A webhook sends to a public https address, and "%" is not one.', coalesce(p_target_url, 'nothing')
      using errcode = '22023',
            hint = 'https only; never localhost, a private network or a cloud metadata address. Nothing was created.';
  end if;
  select array_agg(e) into v_bad from unnest(coalesce(p_events, '{}'::text[])) e where not (e = any (c_events));
  if v_bad is not null then
    raise exception 'A table''s webhook hears %, and % is not one of them.',
      array_to_string(c_events, ', '), array_to_string(v_bad, ', ')
      using errcode = '22023', hint = 'Leave events out to hear every change. Nothing was created.';
  end if;
  v_max := coalesce((platform.knob_resolve('custom', 'table_webhooks_max', p_organization_id) #>> '{}')::integer, 10);
  select count(*) into v_live from files.webhooks w
   where w.is_active and w.organization_id = p_organization_id
     and w.resource_types && custom.record_source_keys(p_table_id);
  if v_live >= v_max then
    raise exception 'This table already sends to % webhooks, the most it may.', v_live
      using errcode = '54000', hint = 'Switch one off with custom.table_webhook_archive. The ceiling is the organization knob custom/table_webhooks_max. Nothing was created.';
  end if;

  insert into files.webhooks (created_by, organization_id, target_url, secret, description, event_types, resource_types)
  values (v_me, p_organization_id, p_target_url, v_secret, nullif(btrim(p_description), ''),
          case when coalesce(cardinality(p_events), 0) = 0 then null else p_events end,
          array[custom.record_source_key(p_table_id)])
  returning id into v_id;

  return jsonb_build_object('webhook_id', v_id, 'table_id', p_table_id, 'target_url', p_target_url,
    'events', to_jsonb(coalesce(nullif(p_events, '{}'::text[]), c_events)),
    'secret', v_secret,
    'says', 'Every change to a record of this table is POSTed here within about a minute, signed: X-Matrx-Signature is sha256=HMAC-SHA256(secret, body). The secret is shown this once.');
end
$function$;

CREATE OR REPLACE FUNCTION public.cmt_add(p_entity_type text, p_entity_id uuid, p_body text, p_parent_id uuid DEFAULT NULL::uuid, p_org_id uuid DEFAULT NULL::uuid, p_anchor jsonb DEFAULT NULL::jsonb, p_suggested_text text DEFAULT NULL::text, p_client_request_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid := p_org_id;
  v_scoped boolean;
  v_entity_org uuid;
  v_named boolean := p_org_id is not null;
  v_problem text;
  v_id uuid;
  v_anchor_kind text := p_anchor ->> '__kind';
begin
  -- 🚨 RC-A2b (2026-09-25): a comment is never the record a comment is on. A reply goes through
  -- the record's own thread (p_parent_id). Refused by TYPE, before any lookup, so it confirms
  -- nothing about any id (verify-RC-A2 F3; kept here because this file recreates cmt_add).
  if platform.token_is_detail(p_entity_type) then  -- RC-A2e: every declared detail
    raise exception 'cmt_add: a comment cannot be filed on a % — reply in its thread instead: cmt_add(<the record type>, <the record id>, body, p_parent_id => <the comment id>)',
      p_entity_type using errcode = '22023';
  end if;
  -- Deny before resolving organization or looking up the row (RC-A2: no existence oracle).
  if not platform.detail_parent_access(p_entity_type, p_entity_id, 'commenter'::public.permission_level) then
    raise exception 'cmt_add: you cannot comment on this record (%) -- commenting needs the commenter level on it. Ask its owner to share it with you at commenter or above.', p_entity_type using errcode = '42501',
            detail = jsonb_build_object('entity_id', p_entity_id)::text;
  end if;

  v_scoped := platform.entity_is_org_scoped(p_entity_type);
  if v_scoped then
    v_entity_org := platform.entity_organization_id(p_entity_type, p_entity_id);
  end if;
  if v_org is null then
    v_org := v_entity_org;
  end if;
  if v_org is null then
    raise exception 'cmt_add: nothing named the organization this comment belongs to. The record (%) did not answer -- either its entity type is not organization-scoped or the row does not exist. Remedy: pass p_org_id, the organization you are acting in.', p_entity_type using errcode = '23502',
            detail = jsonb_build_object('entity_id', p_entity_id)::text;
  end if;
  if v_named and not iam.has_org_access(v_org) then
    raise exception 'cmt_add: no org access (%)', p_entity_type using errcode = '42501',
            detail = jsonb_build_object('org', v_org, 'entity_id', p_entity_id)::text;
  end if;
  if v_scoped and v_entity_org is distinct from v_org then
    raise exception 'cmt_add: entity not found in this organization' using errcode = '22023';
  end if;

  if p_parent_id is not null and not exists (
       select 1 from platform.comments parent
        where parent.id = p_parent_id and parent.deleted_at is null
          and parent.entity_type = p_entity_type and parent.entity_id = p_entity_id
          and parent.organization_id = v_org) then
    raise exception 'cmt_add: parent comment not found' using errcode = '22023';
  end if;

  -- RC-B11: the passage (text_anchor); board threads: one part of the record (part_anchor).
  -- A reply belongs to its thread's anchor and carries none.
  if p_anchor is not null then
    if p_parent_id is not null then
      raise exception 'cmt_add: a reply carries no anchor -- the thread it answers already points at one'
        using errcode = '22023';
    end if;
    if v_anchor_kind = 'text_anchor' then
      v_problem := coalesce(platform.text_anchor_problem(p_anchor),
                            platform.text_anchor_target_problem(p_entity_type, p_entity_id, p_anchor));
    elsif v_anchor_kind = 'part_anchor' then
      v_problem := coalesce(platform.part_anchor_problem(p_anchor),
                            platform.part_anchor_target_problem(p_entity_type, p_entity_id, p_anchor));
    else
      raise exception 'cmt_add: an anchored comment carries a text_anchor (a passage) or a part_anchor (one part of the record)'
        using errcode = '22023';
    end if;
    if v_problem is not null then
      raise exception 'cmt_add: this comment''s % is invalid: %', v_anchor_kind, v_problem
        using errcode = '23514',
              hint = 'Anchor to the exact text of one version of the record (Unicode code points), or to one of its parts; a comment on the whole record carries no anchor.';
    end if;
  end if;
  if p_suggested_text is not null and v_anchor_kind is distinct from 'text_anchor' then
    raise exception 'cmt_add: a suggestion replaces a passage, so it needs one (p_anchor, a text_anchor)'
      using errcode = '22023';
  end if;

  -- RC-B11: a repeat of the same create (a Retry after a lost response) is the first row.
  if p_client_request_id is not null then
    select c.id into v_id from platform.comments c
     where c.created_by = (select auth.uid()) and c.client_request_id = p_client_request_id;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  insert into platform.comments (organization_id, entity_type, entity_id, parent_id, body, anchor,
                                 suggested_text, client_request_id, created_by, updated_by)
  values (v_org, p_entity_type, p_entity_id, p_parent_id, coalesce(p_body, ''), p_anchor,
          p_suggested_text, p_client_request_id, (select auth.uid()), (select auth.uid()))
  on conflict (created_by, client_request_id) where client_request_id is not null do nothing
  returning id into v_id;
  if v_id is null then  -- a concurrent twin of this same request won the race
    select c.id into v_id from platform.comments c
     where c.created_by = (select auth.uid()) and c.client_request_id = p_client_request_id;
  end if;
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.cmt_resolve(p_id uuid, p_resolved boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- The resolve half custom.io_comment already had (custom.io_comment_resolve), on the one
  -- comment table (STORE-DESIGN §3.8 item 3). p_resolved=false re-opens the thread.
  update platform.comments c
     set resolved_at = case when p_resolved then now() end,
         resolved_by = case when p_resolved then (select auth.uid()) end,
         updated_by  = (select auth.uid())
   where c.id = p_id and c.deleted_at is null
     and platform.detail_parent_access(c.entity_type, c.entity_id, 'commenter'::public.permission_level);
  if not found then
    raise exception 'cmt_resolve: comment not found, or you may not resolve it -- resolving needs the commenter level on the record it is on'
      using errcode = '42501';
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.cmt_delete(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- RC-A2: the second arm was iam.has_org_access(organization_id), which let any member of the
  -- organization soft-delete anybody's comment on anything (measured 2026-09-23: a plain member
  -- deleted the owner's comments on three private records). Admin on the RECORD is the rung
  -- that may moderate its discussion.
  update platform.comments c
     set deleted_at = now(), updated_by = (select auth.uid())
   where c.id = p_id and c.deleted_at is null
     and (c.created_by = (select auth.uid())
          or platform.detail_parent_access(c.entity_type, c.entity_id, 'admin'::public.permission_level));
  if not found then
    raise exception 'cmt_delete: comment not found, or you may not delete it -- its author may, and so may an admin of the record it is on'
      using errcode = '42501';
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.cmt_restore(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_parent uuid;
begin
  -- A reply comes back WITH its thread: an archived parent comment is restored first, through this
  -- same door and its same rungs. If the caller may not restore the parent, nothing changes.
  select c.parent_id into v_parent
    from platform.comments c
   where c.id = p_id and c.deleted_at is not null;
  if v_parent is not null and exists (select 1 from platform.comments p where p.id = v_parent and p.deleted_at is not null) then
    begin
      perform public.cmt_restore(v_parent);
    exception when sqlstate '42501' then
      raise exception 'cmt_restore: this reply belongs to a comment that is deleted, and you may not restore that comment -- ask its author or an admin of the record to restore it first'
        using errcode = '42501';
    end;
  end if;
  -- The restore twin of cmt_delete (same rungs): the author, while they can still see the record the
  -- comment is on, or an admin of that record.
  update platform.comments c
     set deleted_at = null, updated_by = (select auth.uid())
   where c.id = p_id and c.deleted_at is not null
     and ((c.created_by = (select auth.uid())
           and platform.detail_parent_access(c.entity_type, c.entity_id, 'viewer'::public.permission_level))
          or platform.detail_parent_access(c.entity_type, c.entity_id, 'admin'::public.permission_level));
  if not found then
    raise exception 'cmt_restore: this comment is not in the trash, or you may not restore it -- its author may, and so may an admin of the record it is on'
      using errcode = '42501';
  end if;
end $function$;

CREATE OR REPLACE FUNCTION custom.capture_submit(p_organization_id uuid, p_sheet_id uuid, p_client_key text, p_payload jsonb, p_files jsonb DEFAULT '[]'::jsonb, p_device text DEFAULT NULL::text, p_captured_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_location jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(record_id uuid, state text, message text, replay boolean, file_ids uuid[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_f        custom.anon_form;
  v_me       uuid := custom.query_principal();
  v_exposed  text[];
  v_required text[];
  v_answered text[] := array[]::text[];
  v_missing  text[];
  v_key      text;
  v_doc      jsonb := '{}'::jsonb;
  v_att      jsonb;
  v_files    uuid[] := array[]::uuid[];
  v_of_key   uuid[];
  v_multi    boolean;
  v_file     uuid;
  v_at       timestamptz := coalesce(p_captured_at, now());
  v_existing uuid;
  v_rec      uuid;
  v_source   jsonb;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.capture_submit');

  select * into v_f from custom.anon_form
   where anon_form.organization_id = p_organization_id
     and anon_form.id = p_sheet_id
     and anon_form.audience = 'crew'
     and anon_form.deleted_at is null;

  -- THE ACCESS DECISION, BEFORE EXISTENCE. Both arms raise the same sentence on purpose.
  if not found
     or not custom.has_visibility(v_me, 'record', v_f.table_id,
                                  'editor'::public.permission_level) then
    raise exception 'You cannot capture into this sheet.'
      using errcode = '42501',
            hint = 'A capture writes a record, so it needs the same editor level on the table that adding a record by hand needs. If you were given this link by mistake, ask whoever sent it; if you should have it, ask an owner of this organization for editor on that table.';
  end if;

  if coalesce(btrim(coalesce(p_client_key, '')), '') = '' then
    raise exception 'This capture has no key of its own, so a retry could not be told from a second capture.'
      using errcode = '22004',
            hint = 'The phone mints the key when the capture is taken, offline, before the first attempt — never when it reconnects. Without it a lost acknowledgement would write the same bin twice.';
  end if;

  if v_f.closed_at is not null then
    record_id := null; state := 'closed'; replay := false; file_ids := null;
    message := 'This capture sheet is closed, so it is not taking anything new. Nothing was lost — what is on the phone stays there.';
    return next; return;
  end if;
  if v_f.capture_opened_at is null then
    record_id := null; state := 'not open yet'; replay := false; file_ids := null;
    message := 'Whoever set this sheet up has not opened it to the crew yet. Nothing was lost — what is on the phone stays there.';
    return next; return;
  end if;

  -- SCOPE. A key this sheet does not ask for is refused BY NAME, never trimmed in silence.
  select coalesce(array_agg(value #>> '{}'), array[]::text[]) into v_exposed
    from jsonb_array_elements(v_f.exposed_field_keys);
  for v_key in select jsonb_object_keys(coalesce(p_payload, '{}'::jsonb)) loop
    if not (v_key = any (v_exposed)) then
      raise exception 'This capture sheet does not have a field called "%".', v_key
        using errcode = '42501',
              hint = format('It takes: %s.', coalesce(array_to_string(v_exposed, ', '), '(nothing)'));
    end if;
    v_doc := v_doc || jsonb_build_object(v_key, p_payload -> v_key);
    if coalesce(p_payload -> v_key, 'null'::jsonb) not in ('null'::jsonb, '""'::jsonb) then
      v_answered := v_answered || v_key;
    end if;
  end loop;

  -- THE FILES. A photo and a voice note are answers like any other, so a field answered by
  -- a file counts as answered — checked BEFORE the required list, or a sheet whose only
  -- required question is the photograph would refuse every capture that had one.
  if jsonb_typeof(p_files) = 'array' then
    for v_att in select value from jsonb_array_elements(p_files) loop
      v_key := nullif(btrim(coalesce(v_att ->> 'field', '')), '');
      if v_key is null or not (v_key = any (v_exposed)) then
        raise exception 'This capture sheet does not have a field called "%" for a file.',
                        coalesce(v_key, '(unnamed)')
          using errcode = '42501',
                hint = format('It takes: %s.', coalesce(array_to_string(v_exposed, ', '), '(nothing)'));
      end if;
      if not (v_key = any (v_answered)) then
        v_answered := v_answered || v_key;
      end if;
    end loop;
  end if;

  select coalesce(array_agg(value #>> '{}'), array[]::text[]) into v_required
    from jsonb_array_elements(v_f.required_field_keys);
  select coalesce(array_agg(k), array[]::text[]) into v_missing
    from unnest(v_required) k where not (k = any (v_answered));
  if array_length(v_missing, 1) > 0 then
    raise exception 'This capture still needs %.', array_to_string(v_missing, ', ')
      using errcode = '22004',
            hint = 'Each one is named so the phone can point at it and keep the capture in its queue. Nothing was written and nothing was lost.';
  end if;

  -- THE LEDGER IS THE MECHANISM, and it is taken FOR UPDATE so two replays of one key
  -- cannot both believe they are the first.
  insert into custom.anon_replay (organization_id, client_key, table_id, device, captured_at,
                                  sheet_id)
  values (p_organization_id, p_client_key, v_f.table_id, p_device, v_at, p_sheet_id)
  on conflict (organization_id, client_key) where deleted_at is null do nothing;

  select r.record_id into v_existing from custom.anon_replay r
   where r.organization_id = p_organization_id and r.client_key = p_client_key
     for update;

  if v_existing is not null then
    update custom.anon_replay set replays = replays + 1
     where organization_id = p_organization_id and client_key = p_client_key;
    record_id := v_existing; state := 'captured'; replay := true; file_ids := null;
    message := 'This capture had already arrived, so it was not written twice.';
    return next; return;
  end if;

  -- REC-31: a picture is a File record reached through a relation. The bytes were put in
  -- the platform's ONE byte store by the app before this call; what lands here is the
  -- reference, and it becomes a File record exactly as custom.inbound_mail_land writes an
  -- attachment. A File record carries its own provenance, because a photograph separated
  -- from when and where it was taken is not evidence of anything.
  if jsonb_typeof(p_files) = 'array' then
    for v_key in select distinct nullif(btrim(coalesce(value ->> 'field', '')), '')
                   from jsonb_array_elements(p_files) loop
      v_of_key := array[]::uuid[];

      -- A FIELD SAYS HOW MANY ANSWERS IT HOLDS, and the door obeys it. `photo` on a bin is
      -- one photograph; writing `["<id>"]` into it raises *photo holds one value, and it was
      -- given a list* (FLD-2) and the whole capture dies at the last step, after the walk to
      -- the bin and the upload. Measured in capture_green.sql PART 4 before this arm existed.
      -- A second file for a single-valued field is refused BY NAME, up front.
      select coalesce((f.data ->> 'multi')::boolean, false) into v_multi
        from custom.record f
       where f.organization_id = p_organization_id
         and f.table_id = custom.field_kernel_id()
         and f.deleted_at is null
         and (f.data ->> 'entity_definition_id')::uuid = v_f.table_id
         and f.data ->> 'key' = v_key;

      if not coalesce(v_multi, false)
         and (select count(*) from jsonb_array_elements(p_files) x
               where nullif(btrim(coalesce(x.value ->> 'field', '')), '') = v_key) > 1 then
        raise exception 'This capture has more than one file for "%", which holds one.', v_key
          using errcode = '22004',
                hint = 'Send one file for that question, or ask whoever set the sheet up to let that field hold several.';
      end if;

      for v_att in select value from jsonb_array_elements(p_files)
                    where nullif(btrim(coalesce(value ->> 'field', '')), '') = v_key loop
        v_file := custom.record_write(p_organization_id, custom.file_kernel_id(),
                    jsonb_strip_nulls(jsonb_build_object(
                      'name',       coalesce(nullif(v_att ->> 'name', ''), 'capture'),
                      'mime_type',  nullif(v_att ->> 'mime_type', ''),
                      'size_bytes', nullif(v_att ->> 'size_bytes', '')::bigint,
                      'url',        nullif(v_att ->> 'url', ''),
                      'file_id',    nullif(v_att ->> 'file_id', ''),
                      'duration_ms', nullif(v_att ->> 'duration_ms', '')::bigint,
                      '_actor',     'user',
                      '_source',    jsonb_build_object('via', 'capture',
                                                       'sheet_id', p_sheet_id::text,
                                                       'client_key', p_client_key,
                                                       'device', p_device,
                                                       'captured_at', v_at,
                                                       'at_place', p_location))));
        v_of_key := v_of_key || v_file;
        v_files  := v_files || v_file;
      end loop;
      v_doc := v_doc || jsonb_build_object(v_key,
                 case when coalesce(v_multi, false)
                      then to_jsonb(array(select x::text from unnest(v_of_key) x))
                      else to_jsonb(v_of_key[1]::text) end);
    end loop;
  end if;

  -- THE PROVENANCE IS ON THE RECORD (VAL-1, VAL-7). `captured_at` is the moment the phone
  -- took it; `arrived_at` is the moment the network came back. A queue that collapsed the
  -- two would make every capture in a day look like it happened at five o'clock.
  v_source := jsonb_strip_nulls(jsonb_build_object(
                'via',         'capture',
                'sheet_id',    p_sheet_id::text,
                'sheet_title', v_f.title,
                'client_key',  p_client_key,
                'device',      p_device,
                'captured_at', v_at,
                'arrived_at',  now(),
                'at_place',    p_location));

  v_rec := custom.record_write(p_organization_id, v_f.table_id,
             v_doc || jsonb_build_object('_actor', 'user', '_source', v_source));

  update custom.anon_replay set record_id = v_rec
   where anon_replay.organization_id = p_organization_id
     and anon_replay.client_key = p_client_key
     and anon_replay.record_id is null;

  if v_f.notify_rule_id is not null then
    perform custom.form_notify(p_organization_id, v_f.id, v_rec, null);
  end if;

  record_id := v_rec; state := 'captured'; replay := false;
  file_ids := case when cardinality(v_files) > 0 then v_files else null end;
  message := null;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.entity_value_write(p_organization_id uuid, p_token text, p_record_id uuid, p_patch jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
declare
  t          record;
  v_doc      jsonb;
  v_key      text;
  v_n        int;
  v_level    public.permission_level;
  v_mask     jsonb;
  v_undecl   text[] := '{}'::text[];
  v_refused  text[] := '{}'::text[];
  v_list     text;
begin
  perform custom.assert_entity_door(p_organization_id, 'custom.entity_value_write');
  select * into t from custom.entity_table(p_token);
  perform custom.assert_entity_is_organization_scoped(t.token, t.label, t.has_organization);

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'A write names the fields it is setting and what to set them to.'
      using errcode = '22023',
            hint = 'Pass {"key": value}. A key set to null clears that value; a key left out is left alone. Nothing was written.';
  end if;

  execute format('select coalesce(x.custom_fields, %L::jsonb) from %I.%I x where x.id = $1 and x.organization_id = $2',
                 '{}', t.schema_name, t.table_name)
    into v_doc using p_record_id, p_organization_id;
  if v_doc is null then
    raise exception 'There is no % you can open with that id in this organization.', t.label
      using errcode = '02000',
            hint = 'DOOR-1 decides reading and writing with the same question: a row you may not open is a row you may not change.';
  end if;
  if jsonb_typeof(v_doc) <> 'object' then v_doc := '{}'::jsonb; end if;

  -- THE RUNG FOR AN EDIT. The UPDATE below matching the row is what proves `editor`; a row it
  -- does not match writes nothing and is refused by name, so `editor` is the floor asked here.
  v_level := greatest(coalesce(custom.entity_seat_level(p_organization_id, p_token, p_record_id),
                               'viewer'::public.permission_level),
                      'editor'::public.permission_level);
  v_mask  := custom.entity_read_mask(p_organization_id, p_token, v_level, 'edit');

  for v_key in select k from jsonb_object_keys(p_patch) k order by k loop
    -- Who wrote it is the session's to say; the guard trigger checks these two against it.
    continue when v_key in ('_actor', '_on_behalf_of');
    if not (v_mask -> 'declared') ? v_key then
      v_undecl := v_undecl || v_key;
    elsif not (v_mask -> 'visible') ? v_key then
      v_refused := v_refused || v_key;
    end if;
  end loop;

  if cardinality(v_undecl) > 0 then
    select string_agg(format('"%s"', x), ', ' order by x) into v_list from unnest(v_undecl) x;
    raise exception '% has no field called %, so there is nowhere to keep %; adding a field is an owner''s or an admin''s to do.',
                    t.label, v_list, case when cardinality(v_undecl) = 1 then 'that value' else 'those values' end
      using errcode = '23514',
            hint = 'REC-1 / REC-51: a value with no field is a value nobody will ever see. Nothing was written.';
  end if;
  if cardinality(v_refused) > 0 then
    select string_agg(format('"%s"', coalesce(v_mask -> 'labels' ->> x, x)), ', ' order by x) into v_list
      from unnest(v_refused) x;
    raise exception 'You can see this %, but % % not yours to change; that takes % access or a share of %, so nothing was written.',
                    t.label, v_list, case when cardinality(v_refused) = 1 then 'is' else 'are' end,
                    v_mask -> 'notices' -> v_refused[1] ->> 'needs',
                    case when cardinality(v_refused) = 1 then 'that one field' else 'each field' end
      using errcode = '42501',
            hint = 'DOOR-3: the store refuses an edit to a field you may not edit, whichever door you came through.';
  end if;

  for v_key in select k from jsonb_object_keys(p_patch) k loop
    if jsonb_typeof(p_patch -> v_key) = 'null' and left(v_key, 1) <> '_' then
      v_doc := v_doc - v_key;
      if jsonb_typeof(v_doc -> '_values') = 'object' then
        v_doc := jsonb_set(v_doc, '{_values}', (v_doc -> '_values') - v_key);
      end if;
    else
      v_doc := jsonb_set(v_doc, array[v_key], p_patch -> v_key, true);
    end if;
  end loop;

  execute format('update %I.%I x set custom_fields = $1 where x.id = $2 and x.organization_id = $3',
                 t.schema_name, t.table_name)
    using v_doc, p_record_id, p_organization_id;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'You can see this %, but it is not yours to change.', t.label
      using errcode = '42501',
            hint = 'DOOR-1: this door writes as YOU, through the table''s own access rules. It would take the editor level, or a share of this row with you. Nothing was written.';
  end if;

  return custom.entity_record_read(p_organization_id, p_token, p_record_id);
end
$function$;

CREATE OR REPLACE FUNCTION custom.subscription_mute(p_organization_id uuid, p_rule_id uuid, p_muted boolean DEFAULT true)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_me    uuid := custom.query_principal();
  v_rule  custom.record;
  v_who   uuid;
  v_table uuid;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.subscription_mute');
  -- THE SWITCH, BEFORE THE WRITE. Muting a subscription writes a row of this store, and while
  -- `custom/system_enabled` is off this store answers a sentence rather than taking the write
  -- quietly. It was the one thing this door never asked.
  perform custom.assert_store_door(p_organization_id, 'custom.subscription_mute');
  select * into v_rule from custom.record r
   where r.organization_id = p_organization_id and r.id = p_rule_id
     and r.data_class = 'rule' and r.deleted_at is null;
  if not found or not (v_rule.data ? 'subscription') then
    raise exception 'There is no such subscription here.' using errcode = '23503',
            hint = 'It may have been removed, or it may belong to another organization — organizations are hard walls (REC-29).',
            detail = jsonb_build_object('rule_id', p_rule_id)::text;
  end if;

  v_who := nullif(v_rule.data -> 'subscription' ->> 'recipient_user_id', '')::uuid;
  v_table := (v_rule.data ->> 'scope_table_id')::uuid;

  -- YOUR OWN NOTIFICATION IS YOURS TO SWITCH OFF. Requiring an administrator for that is
  -- how an organization ends up with a rule nobody reads and nobody can kill. Somebody
  -- else's is an admin act on the Table it is about, which is where that authority lives.
  -- The rung, unchanged and on the one ladder: your own notification is yours, and somebody
  -- else's takes admin on the Table it is about. The store owner (a migration, an operator at a
  -- terminal) is named rather than slipping through `has_visibility` returning false for a
  -- caller with no session.
  if v_who is distinct from v_me
     and not custom.query_is_store_owner()
     and not custom.has_visibility(v_me, 'record', v_table, 'admin'::public.permission_level) then
    raise exception 'That notification is not addressed to you, so you cannot switch it off.'
      using errcode = '42501',
            hint = 'A notification you receive is always yours to stop. Switching off somebody else''s takes the admin level on the table it is about — ask whoever holds it.';
  end if;

  update custom.record
     set data = jsonb_set(data, '{subscription,muted}', to_jsonb(coalesce(p_muted, true)), true),
         updated_at = now(), version = version + 1
   where organization_id = p_organization_id and id = p_rule_id;
  return coalesce(p_muted, true);
end;
$function$;

CREATE OR REPLACE FUNCTION custom.work_approval_request(p_organization_id uuid, p_subject_id uuid, p_change jsonb, p_note text DEFAULT NULL::text, p_approver_id uuid DEFAULT NULL::uuid, p_origin text DEFAULT 'person'::text, p_conversation_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_kind    text := lower(coalesce(p_change ->> 'kind', ''));
  v_origin  text := lower(coalesce(nullif(btrim(p_origin), ''), 'person'));
  v_me      uuid := custom.query_principal();
  v_subject custom.record;
  v_word    text;
  v_id      uuid;
  v_who     jsonb;
  v_home    text;
  v_refusal jsonb;
begin
  -- THE ORGANIZATION WALL, THE SWITCH, THEN THE RUNG - all three by name, all three on the one
  -- ladder, and all three before anything is read or written.
  perform custom.assert_client_may_reach(p_organization_id, 'custom.work_approval_request');
  perform custom.assert_store_door(p_organization_id, 'custom.work_approval_request');
  -- LANE7-W3B[q1]: A CHANGE TO A STANDARD ROW (a CRM person, …) is not a record of this store; it is
  -- filed by custom._entity_change_file, only after custom.entity_row_propose tried it as the caller.
  if v_kind = 'entity_row_change' then
    return custom._entity_change_file(p_organization_id, p_subject_id, p_change, p_note, p_approver_id,
                                      v_origin, p_conversation_id);
  end if;

  -- ASKING IS NOT CHANGING, AND THE RUNG SAYS SO. This door writes nothing on the subject: it
  -- files a request. `custom.work_approval_decide` is what applies the change, later, as the
  -- person who approved it and through the store's own doors, and the authority to decide is
  -- asked there. So the rung to ASK is the PARTICIPATION rung - commenter - which is what Jira
  -- and ServiceNow require to raise a change request on an item: enough standing to take part,
  -- never enough to make the change. A viewer is told exactly that, by name, rather than being
  -- told they have no access to something they can plainly read.
  if not (custom.query_is_store_owner()
          or custom.has_visibility(v_me, 'record', p_subject_id, 'commenter'::public.permission_level)) then
    if custom.has_visibility(v_me, 'record', p_subject_id, 'viewer'::public.permission_level) then
      raise exception 'You can read this, but asking for a change to it is for the people who work on it.'
        using errcode = '42501',
              hint = 'Raising a change takes the commenter level or higher on it - the same level it takes to leave a comment. Ask somebody who holds it to raise the change, or to share it with you at that level.';
    end if;
    raise exception 'You do not have access to this record.'
      using errcode = '42501',
            hint = 'Nothing reads or files against a record around the one ladder. Ask somebody who holds it to share it with you.';
  end if;

  if v_origin not in ('person', 'agent') then
    raise exception 'An approval comes from a person or from an agent, and "%" is neither.', p_origin
      using errcode = '22023';
  end if;
  -- VISION-REACH W4 (d): AN AGENT'S REQUEST COMES FROM AN AGENT. `origin = 'agent'` is what lets the person
  -- the agent works for approve it themselves (custom.work_approval_decide waives the second pair of eyes
  -- only for an agent's request), so a person who called it an agent's could approve their own change and
  -- skip that second person. Who is writing is read off the connection (platform.declared_actor_tier: the
  -- server's declaration, or an agent client's header on the client channel), never off this argument.
  if v_origin = 'agent' and platform.declared_actor_tier() is distinct from 'agent' then
    raise exception 'This was asked for by a person, so it waits for somebody else to approve it, not as an agent''s request.'
      using errcode = '42501',
            hint = 'File it with origin "person". An agent''s request is filed by the agent itself.';
  end if;
  if not (v_kind = any (custom.work_approval_kinds())) then
    raise exception 'This store can hold a change to a record''s values, new records in a table, a new column on a table, a record being removed or put back, a record put back to an earlier version, notifications on a table, a new table in a home, and a copy or import the server runs into a table. It was asked to hold "%".',
                    coalesce(nullif(p_change ->> 'kind', ''), 'nothing')
      using errcode = '22023',
            hint = 'The kinds are ' || array_to_string(custom.work_approval_kinds(), ', ') ||
                   '. Anything else would be a change nobody could apply when they approved it.';
  end if;
  if v_kind = 'record_patch'
     and (jsonb_typeof(p_change -> 'patch') is distinct from 'object'
          or p_change -> 'patch' = '{}'::jsonb) then
    raise exception 'A change waiting for approval has to say what it would change.'
      using errcode = '22004';
  end if;
  -- A BATCH THAT CARRIES NO ROWS IS NOT A CHANGE. It would be approved and write nothing,
  -- which is the dead end in a smaller font.
  if v_kind = 'record_add'
     and (jsonb_typeof(p_change -> 'rows') is distinct from 'array'
          or jsonb_array_length(p_change -> 'rows') = 0) then
    raise exception 'Records waiting for approval have to say what would be written.'
      using errcode = '22004',
            hint = 'Send {"kind":"record_add","rows":[{...}]} with at least one record.';
  end if;
  if v_kind = 'field_add' and jsonb_typeof(p_change -> 'field') is distinct from 'object' then
    raise exception 'A new column waiting for approval has to carry the column it would add.'
      using errcode = '22004';
  end if;
  -- VISION-REACH W4 (c): A PUT-BACK NAMES THE VERSION, and a notification names who hears it. Approving
  -- runs the store's own restore door and subscription door with exactly these, so a request that does not
  -- carry them would be approved and do nothing.
  if v_kind = 'record_restore_version'
     and (jsonb_typeof(p_change -> 'to_version') is distinct from 'number'
          or (p_change ->> 'to_version')::numeric < 1
          or (p_change ->> 'to_version')::numeric <> trunc((p_change ->> 'to_version')::numeric)) then
    raise exception 'Putting a record back has to say which version it goes back to.'
      using errcode = '22004',
            hint = 'Send {"kind":"record_restore_version","to_version":3} (and "field_key" to put back one value only).';
  end if;
  if v_kind = 'subscription_add'
     and (jsonb_typeof(p_change -> 'tell') is distinct from 'array'
          or jsonb_array_length(p_change -> 'tell') = 0) then
    raise exception 'A notification waiting for approval has to say who hears it and how.'
      using errcode = '22004',
            hint = 'Send {"kind":"subscription_add","watch":{...},"tell":[{"channel":"in_app","cadence":"instant"}]}.';
  end if;
  -- HOST-RUN (2026-10-16): A BULK JOB SAYS WHAT IT WILL DO AND WHICH JOB IT IS. The queue never holds a mapped
  -- copy's rows (there may be thousands, read from the source when it runs); it holds the job's description for
  -- the card (`summary`), its type, the tables it writes and its FINGERPRINT — the server runs exactly the job
  -- whose fingerprint was approved, once, through custom.work_approval_host_run.
  if v_kind = 'host_run'
     and (jsonb_typeof(p_change -> 'job') is distinct from 'object'
          or nullif(p_change #>> '{job,type}', '') is null
          or nullif(p_change #>> '{job,fingerprint}', '') is null
          or nullif(btrim(coalesce(p_change ->> 'summary', '')), '') is null
          or (p_change #> '{job,tables}' is not null and jsonb_typeof(p_change #> '{job,tables}') is distinct from 'array')) then
    raise exception 'A job waiting for approval has to say what it will do and which job it is.'
      using errcode = '22004',
            hint = 'Send {"kind":"host_run","summary":"Copy 18 rows from … into …","job":{"type":"mapped_sync","fingerprint":"…","tables":["…"]}}.';
  end if;
  -- HOST-RUN-2 (2026-10-17): EVERY TABLE A JOB NAMES IS A LIVE TABLE OF THIS ORGANIZATION. The decide door asks
  -- the approver about each one and a yes trusts each one for the chat, so an id that is not a table here would
  -- make the approval impossible to decide (a bad cast) or hand out trust on something else.
  if v_kind = 'host_run' and exists (
       select 1 from jsonb_array_elements_text(coalesce(p_change #> '{job,tables}', '[]'::jsonb)) x
        where case when x !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then true  -- HOST-RUN-3: CASE, so
                   else not exists (select 1 from custom.record t                                         -- a non-id is never cast
                                     where t.organization_id = p_organization_id and t.id = x::uuid
                                       and t.table_id = custom.table_kernel_id() and t.deleted_at is null) end) then
    raise exception 'A job waiting for approval can only name tables of this organization, and one it names is not one.'
      using errcode = '22023',
            hint = 'Nothing was filed. Name the tables the job writes by their ids.';
  end if;
  -- A NEW TABLE CARRIES THE WHOLE SPEC, and its fields with it. A card that said "a table
  -- called Invoices" would ask a person to sign for something they were never shown, and an
  -- approval that had to guess the spec back would create a different table than the one
  -- that was refused.
  if v_kind = 'table_add' then
    if jsonb_typeof(p_change -> 'table') is distinct from 'object'
       or nullif(p_change #>> '{table,name}', '') is null then
      raise exception 'A new table waiting for approval has to carry the table it would create.'
        using errcode = '22004',
              hint = 'Send {"kind":"table_add","table":{...the spec custom.table_declare takes...},"fields":[...]}.';
    end if;
    if p_change ? 'fields' and jsonb_typeof(p_change -> 'fields') is distinct from 'array' then
      raise exception 'The columns of a new table waiting for approval have to be a list, even an empty one.'
        using errcode = '22004';
    end if;
  end if;

  -- THE SUBJECT. A record being PUT BACK is deleted by definition, so that one kind looks for
  -- it among the deleted rows; every other kind still requires a live subject.
  if v_kind = 'record_restore' then
    select r.* into v_subject from custom.record r
     where r.organization_id = p_organization_id and r.id = p_subject_id and r.deleted_at is not null;
    if v_subject.id is null then
      raise exception 'There is no deleted record in this organization with that id, so there is nothing to put back.'
        using errcode = '02000',
              hint = 'A record that is still here does not need restoring; one that was never here cannot be.';
    end if;
  else
    select r.* into v_subject from custom.record r
     where r.organization_id = p_organization_id and r.id = p_subject_id and r.deleted_at is null;
    if v_subject.id is null then
      raise exception 'There is no such record in this organization, so there is nothing to approve.'
        using errcode = '02000';
    end if;
  end if;
  -- LANE S5-PRIME: A RECORD IN AN ARCHIVED TABLE IS NOT A THING TO ASK ABOUT. Nobody would ever
  -- see the request (the inbox does not list it) and nobody could decide it (the decide door
  -- refuses it by name), so it is refused here, before it is filed. Put-back included: bringing a
  -- record back into a table that is itself archived restores it into nowhere.
  if v_subject.table_id is not null and v_subject.table_id <> custom.table_kernel_id() then
    select coalesce(nullif(t.data ->> 'name', ''), 'its table') into v_home
      from custom.record t
     where t.organization_id = p_organization_id and t.id = v_subject.table_id
       and t.deleted_at is not null;
    if v_home is not null then
      raise exception '% is in %, which is archived, so a change to it cannot be asked for.',
                      coalesce(custom.record_words(p_organization_id, p_subject_id), 'That record'), v_home
        using errcode = '55000',
              hint = 'Bring the table back from the archive first; then ask again.';
    end if;
  end if;
  v_word := case when v_subject.table_id = custom.table_kernel_id() then 'table' else 'record' end;
  if v_kind = 'field_add' and v_word <> 'table' then
    raise exception 'A new column is added to a table, and this is a %.', v_word
      using errcode = '22023';
  end if;
  -- VISION-REACH W4 (c): notifications are on a table; a version is a record's.
  if v_kind = 'subscription_add' and v_word <> 'table' then
    raise exception 'Notifications are set up on a table, and this is a %.', v_word
      using errcode = '22023';
  end if;
  if v_kind = 'record_restore_version' and v_word <> 'record' then
    raise exception 'Only a record is put back to an earlier version here, and this is a %.', v_word
      using errcode = '22023';
  end if;
  if v_kind = 'host_run' and v_word <> 'table' then
    raise exception 'A copy or import runs into a table, and this is a %.', v_word
      using errcode = '22023';
  end if;
  -- Records go IN a table. Filing them against a row would produce an approval whose yes
  -- nobody could carry out.
  if v_kind = 'record_add' and v_word <> 'table' then
    raise exception 'Records are added to a table, and this is a %.', v_word
      using errcode = '22023';
  end if;
  -- A DOCUMENT TEMPLATE IS THE TABLE'S OWN WORDING, so it waits on the TABLE, exactly as a
  -- new column does, and its approvers resolve on the same ladder. The card has to carry the
  -- whole template — name and body — because approving is `custom.doc_template_save` with
  -- these bytes and nothing re-derived: a person signs for the words they were shown.
  if v_kind = 'doc_template_add' then
    if v_word <> 'table' then
      raise exception 'A document template is written for a table, and this is a %.', v_word
        using errcode = '22023';
    end if;
    if jsonb_typeof(p_change -> 'template') is distinct from 'object'
       or nullif(p_change #>> '{template,name}', '') is null then
      raise exception 'A document template waiting for approval has to carry the template it would save.'
        using errcode = '22004',
              hint = 'Send {"kind":"doc_template_add","template":{"name":"…","body":"…","template_id":null}}.';
    end if;
  end if;
  -- A NEW TABLE HANGS ON ITS HOME, which is the record it would be made inside. That is what
  -- makes the wait answerable: `custom.work_approval_approvers` resolves the admins on that
  -- Home and then the organization's owners and admins, on the one ladder.
  if v_kind = 'table_add'
     and nullif(p_change #>> '{table,parent_id}', '') is distinct from p_subject_id::text then
    raise exception 'A new table waits on the home it would be made in, and this spec names a different one.'
      using errcode = '22023',
            hint = 'File the request against the record named by the spec''s parent_id.';
  end if;

  -- A CHANGE THE STORE WOULD REFUSE IS NEVER FILED (lane HANDOVER, 2026-09-28). Cedar Ridge
  -- Physical Therapy's workflow proposed a patient with Insurance "Blue Shield"; the wait was
  -- filed, the run paused, and only Approve found the store refuses that choice, so a person had
  -- been asked to sign for a change nobody could make. The change is now tried through the very
  -- doors approval uses, in a savepoint, and the store's own refusal is raised here instead.
  if v_kind in ('record_add', 'record_patch') then
    v_refusal := custom._held_change_refusal(p_organization_id, v_kind, p_subject_id, p_change);
    if v_refusal is not null then
      raise exception '%', v_refusal ->> 'message'
        using errcode = coalesce(nullif(v_refusal ->> 'code', ''), 'P0001'),
              hint = concat_ws(' ', nullif(v_refusal ->> 'hint', ''),
                               'Nothing was filed for approval: correct the change and ask again.');
    end if;
  end if;

  if p_approver_id is not null
     and not exists (select 1 from iam.organization_member m
                      where m.organization_id = p_organization_id and m.user_id = p_approver_id) then
    raise exception 'That person is not in this organization, so they cannot be asked to approve anything here.'
      using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('user_id', a.user_id, 'name', a.name, 'why', a.why)), '[]'::jsonb)
    into v_who
    from custom.work_approval_approvers(p_organization_id, p_subject_id, p_approver_id) a;

  if jsonb_array_length(v_who) = 0 then
    raise exception 'Nobody in this organization could approve that, so asking would leave it waiting forever.'
      using errcode = '42501',
            hint = 'Name an approver, or ask an owner of the organization to give somebody admin on it. A request nobody can answer is worse than no request.';
  end if;

  -- HOST-RUN: THE SAME JOB ASKED AGAIN IS THE SAME WAIT. An agent that retries, or asks again before anybody
  -- decided, gets the approval already waiting — never a second card for one job.
  if v_kind = 'host_run' then
    -- HOST-RUN-2: two first asks at the same moment are one wait — the second waits for the first's insert.
    perform pg_advisory_xact_lock(hashtextextended('host_run:' || p_organization_id::text || ':'
                                                   || (p_change #>> '{job,fingerprint}'), 0));
    select r.id into v_id
      from custom.record r
     where r.organization_id = p_organization_id and r.data_class = 'work_approval' and r.deleted_at is null
       and r.data ->> 'state' = 'pending'
       and r.data #>> '{change,kind}' = 'host_run'
       and r.data #>> '{change,job,fingerprint}' = p_change #>> '{job,fingerprint}'
       and r.data ->> 'subject_id' = p_subject_id::text
       and (r.data ->> 'conversation_id') is not distinct from p_conversation_id::text
     order by r.created_at desc
     limit 1;
    if v_id is not null then
      return jsonb_build_object(
        'approval_id', v_id, 'state', 'pending', 'subject_id', p_subject_id, 'subject_kind', v_word,
        'origin', v_origin, 'approvers', v_who, 'already_waiting', true,
        'message', 'The same job is already waiting for a person.');
    end if;
  end if;

  perform set_config('custom.decision_door', 'work_approval:request', true);
  insert into custom.record (organization_id, table_id, data_class, data)
  values (p_organization_id, null, 'work_approval', jsonb_strip_nulls(jsonb_build_object(
    'subject_id',      p_subject_id::text,
    'subject_kind',    v_word,
    'subject_table_id', v_subject.table_id::text,
    'subject_title',   custom.record_words(p_organization_id, p_subject_id),
    'change',          p_change,
    'origin',          v_origin,
    'note',            nullif(btrim(coalesce(p_note, '')), ''),
    'approver_id',     p_approver_id::text,
    'conversation_id', p_conversation_id::text,
    'requested_by',    v_me::text,
    'requested_at',    to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'state',           'pending')))
  returning id into v_id;
  perform set_config('custom.decision_door', '', true);

  if p_approver_id is not null and not custom.query_is_store_owner() then
    perform custom.share_grant(p_organization_id, v_id, 'person', p_approver_id,
                               'admin'::public.permission_level);
  end if;

  return jsonb_build_object(
    'approval_id', v_id,
    'state',       'pending',
    'subject_id',  p_subject_id,
    'subject_kind', v_word,
    'origin',      v_origin,
    'approvers',   v_who,
    'message',     format('This is waiting for %s.',
                     case when jsonb_array_length(v_who) = 1
                          then coalesce(v_who -> 0 ->> 'name', 'somebody')
                          else format('%s people who can approve it', jsonb_array_length(v_who)) end));
end
$function$;

CREATE OR REPLACE FUNCTION custom.anon_publish(p_organization_id uuid, p_form_id uuid, p_published boolean DEFAULT true)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_user  uuid := custom.query_principal();
  v_table uuid;
  v_at    timestamptz;
begin
  perform custom.assert_store_door(p_organization_id, 'custom.anon_publish');
  select f.table_id into v_table from custom.anon_form f
   where f.organization_id = p_organization_id and f.id = p_form_id and f.deleted_at is null;
  if v_table is null then
    raise exception 'custom.anon_publish: no such form in this organization' using errcode = '23503',
            detail = jsonb_build_object('form_id', p_form_id)::text;
  end if;
  -- PUBLISHING A FORM OPENS A WRITE PATH FOR PEOPLE WITH NO ACCOUNT. That is an admin act on
  -- the Table, not an editor act: whoever may publish is deciding that strangers may add rows.
  if not custom.has_visibility(v_user, 'record', v_table, 'admin'::public.permission_level) then
    raise exception 'You may not publish this form.'
      using errcode = '42501',
            hint = 'Publishing opens a write path for people with no account, so it needs the admin level on the Table the form writes into — the same level that decides who may reach the Table at all.';
  end if;

  v_at := case when p_published then now() else null end;
  update custom.anon_form
     set published_at = v_at,
         published_by = case when p_published then v_user else published_by end,
         closed_at    = case when p_published then null else now() end
   where organization_id = p_organization_id and id = p_form_id;
  return v_at;
end;
$function$;

CREATE OR REPLACE FUNCTION custom.table_share_outside_invite(p_organization_id uuid, p_table_id uuid, p_email text, p_level permission_level DEFAULT 'viewer'::permission_level)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_mail  text := lower(btrim(coalesce(p_email, '')));
  v_row   custom.record;
  v_user  uuid;
  v_id    uuid;
  v_name  text;
  v_mylvl public.permission_level;
  v_org   text;
  v_sent  jsonb;
  v_grant jsonb;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_share_outside_invite');
  perform custom.assert_store_door(p_organization_id, 'custom.table_share_outside_invite');
  perform custom.assert_client_may_change(p_organization_id, p_table_id,
            'custom.table_share_outside_invite', 'editor'::public.permission_level, 'table');
  if not custom.query_is_store_owner() and custom.query_principal() is not null
     and iam.may_grant_as(custom.query_principal(), 'record', p_table_id, p_level, 'anyone', null) is not null then
    raise exception '%', iam.may_grant_as(custom.query_principal(), 'record', p_table_id, p_level, 'anyone', null) using errcode = '42501';
  end if;

  select r.* into v_row from custom.record r
   where r.organization_id = p_organization_id and r.id = p_table_id
     and r.table_id = custom.table_kernel_id() and r.deleted_at is null;
  if not found then
    raise exception 'There is no such table in this organization, so it cannot be shared.'
      using errcode = '02000';
  end if;
  v_name := coalesce(nullif(v_row.data ->> 'name', ''), 'this table');
  select o.name into v_org from iam.organizations o where o.id = p_organization_id;

  if position('@' in v_mail) < 2 then
    raise exception 'An invitation needs an email address to send the link to.'
      using errcode = '22004';
  end if;
  if p_level is null then
    raise exception 'A share has to say what the other person may do with it.'
      using errcode = '22004',
            hint = 'Pass one of viewer, commenter, editor, admin — call custom.share_levels() for what each one means.';
  end if;

  if not coalesce((platform.knob_resolve('custom', 'external_principal_enabled', p_organization_id) #>> '{}')::boolean, false) then
    raise exception 'Sharing with people outside % is turned off here, so % cannot be invited to %.',
      coalesce(v_org, 'this organization'), v_mail, v_name
      using errcode = '42501',
            hint = 'An owner or an administrator of this organization turns it on once, for everybody, in the organization''s settings (custom/external_principal_enabled). Until then, share this table with a colleague inside the organization instead.';
  end if;

  if not custom.may_invite_outside(p_organization_id, p_table_id) then
    raise exception 'You cannot invite people from outside % to %.',
      coalesce(v_org, 'this organization'), v_name
      using errcode = '42501',
            hint = 'Who may do that is this organization''s own setting (custom/outside_invite_who). By default it is an owner or an administrator of the organization, or whoever holds Admin on the table itself.';
  end if;

  v_mylvl := custom.effective_level(custom.query_principal(), p_organization_id, p_table_id, 'record');
  if v_mylvl is null or p_level > v_mylvl then
    raise exception 'You hold % on %, so you cannot give somebody %.',
      coalesce(v_mylvl::text, 'nothing'), v_name, p_level::text
      using errcode = '42501',
            hint = 'Levels go viewer < commenter < editor < admin, and a share never confers more than the person sharing holds.';
  end if;

  select u.id into v_user from auth.users u where lower(u.email) = v_mail order by u.created_at limit 1;

  -- 🚨 ALREADY INSIDE: DO THE ORDINARY THING (FIX-10C, 2026-09-22).
  -- This used to raise and name `custom.share_grant` at the person. Now it
  -- CALLS it — the same door the people picker uses, which runs the ladder
  -- again on this same subject, so the friendlier answer is two doors agreeing
  -- rather than one being skipped.
  if v_user is not null and exists (select 1 from iam.organization_member m
                                     where m.organization_id = p_organization_id and m.user_id = v_user) then
    v_grant := custom.share_grant(p_organization_id, p_table_id, 'person', v_user, p_level);
    return jsonb_build_object(
      'invited', false,
      'granted', true,
      'invitation_id', null,
      'email', v_mail,
      'table', v_name,
      'level', p_level::text,
      'level_label', iam.level_label('table', p_level),
      'token', null,
      'accept_path', null,
      'delivery', null,
      'expires_at', null,
      'joined', true,
      'grant', v_grant,
      'say', format('%s is already in %s, so they were given %s directly, as a %s. They can open it now — no invitation, no link to follow. They are in the list of everybody who has access, above.',
                    v_mail, coalesce(v_org, 'this organization'), v_name, p_level::text),
      'delivery_say', null);
  end if;

  update iam.invitations
     set role        = p_level::text,
         metadata    = coalesce(metadata, '{}'::jsonb)
                       || jsonb_build_object('level', p_level::text,
                                             'subject', 'custom_table',
                                             'table_name', v_name),
         expires_at  = now() + interval '14 days',
         token       = gen_random_uuid()::text,
         status      = 'pending',
         accepted_at = null,
         invited_user_id = v_user,
         updated_by  = custom.query_principal(),
         updated_at  = now()
   where target_type = 'custom_table'
     and target_id = p_table_id
     and organization_id = p_organization_id
     and lower(email) = v_mail
     and deleted_at is null
     and status <> 'accepted'
  returning id into v_id;

  if v_id is null then
    insert into iam.invitations
      (organization_id, target_type, target_id, email, invited_user_id, role, status,
       expires_at, metadata, created_by, updated_by)
    values
      (p_organization_id, 'custom_table', p_table_id, v_mail, v_user, p_level::text, 'pending',
       now() + interval '14 days',
       jsonb_build_object('level', p_level::text, 'subject', 'custom_table', 'table_name', v_name),
       custom.query_principal(), custom.query_principal())
    returning id into v_id;
  end if;

  -- 🚨 THE HALF THAT WAS MISSING. Same transaction as the invitation: a rolled-back
  -- invite can never have told anybody about access they were not given.
  v_sent := custom._table_share_invite_deliver(v_id);

  return jsonb_build_object(
    'invited', true,
    'granted', false,
    'invitation_id', v_id,
    'email', v_mail,
    'table', v_name,
    'level', p_level::text,
    'level_label', iam.level_label('table', p_level),
    'token', (select i.token from iam.invitations i where i.id = v_id),
    'accept_path', v_sent ->> 'accept_path',
    'delivery', v_sent,
    'expires_at', (select i.expires_at from iam.invitations i where i.id = v_id),
    'joined', false,
    'say', format('%s is invited to %s as a %s. They get access the moment they follow the link and the platform gives them an identity — until then this row holds nothing, and they can see nothing of %s.',
                  v_mail, v_name, p_level::text,
                  coalesce(v_org, 'this organization')),
    'delivery_say', v_sent ->> 'say');
end;
$function$;

CREATE OR REPLACE FUNCTION custom.table_share_outside_grant(p_organization_id uuid, p_table_id uuid, p_person text, p_level permission_level DEFAULT 'viewer'::permission_level)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_said  text := btrim(coalesce(p_person, ''));
  v_user  uuid;
  v_mail  text;
  v_row   custom.record;
  v_name  text;
  v_org   text;
  v_mylvl public.permission_level;
  v_perm  uuid;
  v_means text;
  v_who   text;
  v_sent  jsonb;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.table_share_outside_grant');
  perform custom.assert_store_door(p_organization_id, 'custom.table_share_outside_grant');
  perform custom.assert_client_may_change(p_organization_id, p_table_id,
            'custom.table_share_outside_grant', 'editor'::public.permission_level, 'table');
  if not custom.query_is_store_owner() and custom.query_principal() is not null
     and iam.may_grant_as(custom.query_principal(), 'record', p_table_id, p_level, 'anyone', null) is not null then
    raise exception '%', iam.may_grant_as(custom.query_principal(), 'record', p_table_id, p_level, 'anyone', null) using errcode = '42501';
  end if;

  select r.* into v_row from custom.record r
   where r.organization_id = p_organization_id and r.id = p_table_id
     and r.table_id = custom.table_kernel_id() and r.deleted_at is null;
  if not found then
    raise exception 'There is no such table in this organization, so it cannot be shared.'
      using errcode = '02000';
  end if;
  v_name := coalesce(nullif(v_row.data ->> 'name', ''), 'this table');
  select o.name into v_org from iam.organizations o where o.id = p_organization_id;

  if v_said = '' then
    raise exception 'Say who to share % with: their email address, or their account.', v_name
      using errcode = '22004';
  end if;
  if p_level is null then
    raise exception 'A share has to say what the other person may do with it.'
      using errcode = '22004',
            hint = 'Pass one of viewer, commenter, editor, admin — call custom.share_levels() for what each one means.';
  end if;

  -- Who they are: an account id, or an email address (an account, or nobody yet).
  if v_said ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select u.id, lower(u.email) into v_user, v_mail from auth.users u where u.id = v_said::uuid;
    if v_user is null then
      raise exception 'There is no account %, so % was not shared.', v_said, v_name
        using errcode = '22023', hint = 'Share with their email address instead; if they have no account yet, they get an invitation.';
    end if;
  else
    v_mail := lower(v_said);
    if position('@' in v_mail) < 2 then
      raise exception 'Share with an email address or an account, and % is neither.', v_said
        using errcode = '22023';
    end if;
    select u.id into v_user from auth.users u where lower(u.email) = v_mail order by u.created_at limit 1;
  end if;

  -- A member of the organization, or an address nobody signed up with: the invite door's own
  -- answer, which makes every one of its checks and says what it did.
  if v_user is null
     or exists (select 1 from iam.organization_member m
                 where m.organization_id = p_organization_id and m.user_id = v_user) then
    return custom.table_share_outside_invite(p_organization_id, p_table_id, v_mail, p_level)
           || jsonb_build_object('person', case when v_user is null then 'no_account' else 'member' end);
  end if;

  -- An account outside the organization: the invite door's rules, then the accept path's row.
  if not coalesce((platform.knob_resolve('custom', 'external_principal_enabled', p_organization_id) #>> '{}')::boolean, false) then
    raise exception 'Sharing with people outside % is turned off here, so % cannot be given %.',
      coalesce(v_org, 'this organization'), v_mail, v_name
      using errcode = '42501',
            hint = 'An owner or an administrator of this organization turns it on once, for everybody, in the organization''s settings (custom/external_principal_enabled). Until then, share this table with a colleague inside the organization instead.';
  end if;
  if not custom.may_invite_outside(p_organization_id, p_table_id) then
    raise exception 'You cannot share % with people from outside %.', v_name, coalesce(v_org, 'this organization')
      using errcode = '42501',
            hint = 'Who may do that is this organization''s own setting (custom/outside_invite_who). By default it is an owner or an administrator of the organization, or whoever holds Admin on the table itself.';
  end if;
  v_mylvl := custom.effective_level(custom.query_principal(), p_organization_id, p_table_id, 'record');
  if v_mylvl is null or p_level > v_mylvl then
    raise exception 'You hold % on %, so you cannot give somebody %.',
      coalesce(v_mylvl::text, 'nothing'), v_name, p_level::text
      using errcode = '42501',
            hint = 'Levels go viewer < commenter < editor < admin, and a share never confers more than the person sharing holds.';
  end if;

  v_perm := custom._share_write_person(p_organization_id, p_table_id, v_user, p_level, custom.query_principal());

  select l.means into v_means from custom.share_levels() l where l.level = p_level;
  select coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
                  nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
                  nullif(btrim(u.email), ''), 'Somebody at ' || coalesce(v_org, 'an organization'))
    into v_who from auth.users u where u.id = custom.query_principal();
  v_sent := communication.notify_from_sql(
    p_organization_id, 'share.table_granted', v_user, v_mail, v_mail,
    jsonb_build_object('grant', jsonb_build_object(
      'table_id', p_table_id, 'organization_id', p_organization_id,
      'table', v_name, 'organization', coalesce(v_org, 'their organization'),
      'level', p_level::text, 'level_label', iam.level_label('table', p_level),
      'means', coalesce(v_means, 'read it'), 'sharer', v_who)),
    '/data/' || p_table_id::text || '?org=' || p_organization_id::text,
    'custom_table', p_table_id,
    'tablegrant:' || p_table_id::text || ':' || v_user::text || ':' || p_level::text);

  return jsonb_build_object(
    'invited', false,
    'granted', true,
    'joined', false,
    'person', 'outside_account',
    'user_id', v_user,
    'email', v_mail,
    'table', v_name,
    'level', p_level::text,
    'level_label', iam.level_label('table', p_level),
    'permission_id', v_perm,
    'notified', v_sent -> 'queued',
    'say', format('%s already has an account, so they were given %s as a %s straight away and told so. They can open it now. They are not in %s — that table is all they see there.',
                  v_mail, v_name, p_level::text, coalesce(v_org, 'this organization')));
end
$function$;
