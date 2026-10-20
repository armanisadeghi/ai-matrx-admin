-- lane: AT-FIX-G4
-- Replaces three functions. Inverse: migrations/inverse/atfixg4_comments_carry_their_table_and_notices_name_the_record_down.sql
-- based-on: custom.io_comment_write(uuid, uuid, text, jsonb, uuid) 04982d5b9f6317afd73b2150d018f099a08a866d76b28ac56e27d1fd76a03fba
-- based-on: custom.comment_write(uuid, uuid, text, jsonb, uuid, uuid[]) cf77470fe2cf06990023766920a9d45f908d102dd6c2039316487da93b464e50
-- based-on: custom._record_follow_notify(uuid, uuid, uuid, uuid, text, text, text, text, uuid[]) 1763aef6df86456757f43058d28ad3fe0be1cff774d22abf4a43ed99adbcd03b
--
-- WHY A FOLLOWER WAS NEVER TOLD OF A COMMENT, AND NOTICES SAID "an untitled record" (walked live 2026-10-19, test@test.com / admin@admin.com)
-- 1. custom.io_comment_write read the Table id from custom.read_record(...) ->> 'table_id'. That door answers the record's field
--    values (keyed by field key or id), never a table_id, so every comment was written with metadata {} and no Table. The follow
--    trigger (custom._record_follow_commented) needs metadata.table_id and returned at once: a comment on a followed record
--    sent NO notice. Now the Table is the record's own row (the door already judged the caller's access above).
-- 2. custom._record_follow_notify and custom.comment_write named the record by read_record(..., true) ->> title_field. `true`
--    answers keyed by field ID and title_field is a field KEY, so the title was always null: "test changed an untitled record"
--    for a row titled "Followed row d6rz". `false` answers keyed by field key.

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
              hint = 'Commenting needs Comment access on the record (View < Comment < Edit < Full access). Ask whoever shared it with you to raise your access; nothing about the record itself has to change.';
    end if;
    raise exception 'You do not have access to this record.'
      using errcode = '42501',
            hint = 'REC-29 / VIS-1: this is the same answer every other door gives about a record you do not hold, and it is deliberately the same whether the record exists or not. Ask whoever owns it to share it with you with Comment access.';
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
  -- AT-FIX-G4: read_record answers the record's FIELD VALUES, never a `table_id`, so this was always null and no comment
  -- carried its Table (a followed record's comment notice, a mention's record title). The Table is the record's own row.
  select r.table_id into v_table from custom.record r where r.organization_id = p_organization_id and r.id = p_record_id;

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

CREATE OR REPLACE FUNCTION custom.comment_write(p_organization_id uuid, p_record_id uuid, p_body text, p_anchor jsonb DEFAULT '{}'::jsonb, p_parent_comment_id uuid DEFAULT NULL::uuid, p_mentions uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_user     uuid := custom.query_principal();
  v_ids      uuid[] := array(select distinct m from unnest(coalesce(p_mentions, array[]::uuid[])) m
                              where m is not null and m <> v_user);
  v_people   jsonb;
  v_comment  uuid;
  v_table    uuid;
  v_titlek   text;
  v_title    text;
  v_who      uuid;
  v_sent     integer := 0;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.comment_write');

  -- EVERY MENTION IS JUDGED BEFORE THE COMMENT IS WRITTEN, so a refusal never leaves a
  -- half-sent thread behind: the whole statement is one transaction and a refusal here
  -- means nothing was said at all.
  if coalesce(array_length(v_ids, 1), 0) > 0 then
    v_people := custom.history_people(p_organization_id, v_ids);
    foreach v_who in array v_ids loop
      if not (v_people ? v_who::text) then
        raise exception 'You can only mention people who are in this organization, and one of the people you named is not.'
          using errcode = '23503',
                hint = 'Pick the person from the list the box offers — it is this organization''s own members. Somebody outside it is reached by inviting them, not by naming them in a comment.';
      end if;
      -- THE DEAD END THIS REFUSES. Telling somebody they were mentioned on a record they
      -- cannot open is a notification whose only possible outcome is a refusal — and it
      -- also tells them the record exists.
      if not platform.detail_parent_access_for(v_who, 'record', p_record_id, 'viewer'::public.permission_level) then
        raise exception '% cannot see this record yet, so mentioning them here would send them somewhere they cannot go.',
                        coalesce(v_people -> v_who::text ->> 'name', 'That person')
          using errcode = '42501',
                hint = 'Share the record with them first — viewer is enough to read a thread — and then mention them. Sharing is on this same screen.';
      end if;
    end loop;
  end if;

  -- THE ONE WRITER. Every check that has ever guarded a comment still runs, in its own body.
  v_comment := custom.io_comment_write(
                 p_organization_id, p_record_id, p_body,
                 coalesce(p_anchor, '{}'::jsonb)
                   || case when coalesce(array_length(v_ids, 1), 0) = 0 then '{}'::jsonb
                           else jsonb_build_object('mentions', to_jsonb(v_ids)) end,
                 p_parent_comment_id);

  if coalesce(array_length(v_ids, 1), 0) > 0 then
    -- RC-A2e: record comments live in platform.comments; the table rides in metadata.
    select (c.metadata ->> 'table_id')::uuid into v_table
      from platform.comments c
     where c.organization_id = p_organization_id and c.id = v_comment;
    select nullif(t.data ->> 'title_field', '') into v_titlek
      from custom.record t
     where t.organization_id = p_organization_id and t.id = v_table
       and t.table_id = custom.table_kernel_id();
    if v_titlek is not null then
      v_title := custom._card_words(p_organization_id, custom.read_record(p_organization_id, p_record_id, false) ->> v_titlek, 'record');
    end if;

    foreach v_who in array v_ids loop
      if custom.comment_mention_deliver(
           p_organization_id, p_record_id, v_table, v_comment, v_who,
           coalesce(custom.history_people(p_organization_id, array[v_user]) -> v_user::text ->> 'name',
                    'Somebody'),
           v_title, p_body) is not null then
        v_sent := v_sent + 1;
      end if;
    end loop;
  end if;

  return jsonb_build_object('comment_id', v_comment,
                            'mentioned', to_jsonb(v_ids),
                            -- Said out loud, because "I mentioned three people" and "three
                            -- people were told" are different facts and a screen that
                            -- conflates them is lying quietly.
                            'notified', v_sent);
end;
$function$;

CREATE OR REPLACE FUNCTION custom._record_follow_notify(p_organization_id uuid, p_record_id uuid, p_table_id uuid, p_actor uuid, p_dedupe text, p_what text, p_link text, p_body text, p_skip uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
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
      v_title := custom._card_words(p_organization_id, custom.read_record(p_organization_id, p_record_id, false) ->> v_titlek, 'record');
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
