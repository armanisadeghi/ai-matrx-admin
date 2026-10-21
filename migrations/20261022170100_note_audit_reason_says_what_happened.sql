-- based-on: admin._person_note_audit() bc55cfe3fdd76767b4d15d51215cef5c2c50afb5c8949301bd2288a128ccaba4
-- Edit / pin / unpin / delete of a person's note: the audit row's non-empty reason now states the event
-- ("Note pinned"), not a fake reason ("Shared note"). Pin and delete take no reason prompt.
create or replace function admin._person_note_audit()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
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
      case v_action when 'note_delete' then 'Note deleted' when 'note_pin' then 'Note pinned'
                    when 'note_unpin' then 'Note unpinned' else 'Note edited' end,
      jsonb_build_object('note_id', new.id));
  end loop;
  return null;
end $function$;
