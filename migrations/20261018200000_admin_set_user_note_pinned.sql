-- admin.set_user_note_pinned — pin / unpin a note about a person for ANY platform admin (users one-roof
-- fix, 2026-10-18). A normal notes update is refused by row security for a non-author, so pinning another
-- admin's shared note failed. New function; no based-on.
-- Only a note linked note -> that person, and never another author's "only me" note (the same rule
-- admin.user_notes reads by). Writes only metadata.pinned.
create or replace function admin.set_user_note_pinned(p_note uuid, p_user uuid, p_pinned boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_rows int;
begin
  if v_uid is null or not public.is_platform_admin() then
    raise exception 'admin.set_user_note_pinned: platform admins only' using errcode = '42501';
  end if;
  if p_pinned is null then
    raise exception 'admin.set_user_note_pinned: pinned must be true or false' using errcode = '23502';
  end if;
  update workbench.notes n
     set metadata = jsonb_set(coalesce(n.metadata, '{}'::jsonb), '{pinned}', to_jsonb(p_pinned), true)
   where n.id = p_note and n.deleted_at is null
     and (n.shown_to is distinct from 'only_me'::platform.shown_to or n.created_by = v_uid)
     and exists (select 1 from platform.associations a
                  where a.source_type = 'note' and a.source_id = n.id
                    and a.target_type = 'user' and a.target_id = p_user and a.deleted_at is null);
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'admin.set_user_note_pinned: no such note about that person (or it is private to its author)' using errcode = 'P0002';
  end if;
end;
$$;

comment on function admin.set_user_note_pinned(uuid, uuid, boolean) is
  'Pin or unpin a note about a person. Any platform admin; the note must be linked to p_user and not another author''s only-me note.';

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by, non_client_lane, signed_in_callers, anonymous_callers, gate_predicate, argument_rules)
values
  ('admin', 'set_user_note_pinned', 'p_note uuid, p_user uuid, p_pinned boolean',
   array['uuid'::regtype, 'uuid'::regtype, 'boolean'::regtype]::oid[],
   'WRITE. Platform admins only (42501); updates metadata.pinned of one note linked to p_user; refuses another author''s only-me note (P0002).',
   'migrations/20261018200000_admin_set_user_note_pinned.sql (users one-roof pin fix)',
   null, true, false, 'public.is_platform_admin()',
   '{"version":1,"arguments":{"p_note":{"type":"uuid","position":1,"optional":false,"check":"must be a live note linked note -> p_user and not another author''s only-me note","foreign":{"note":"A note about the person; platform admins only.","bounded":true}},"p_user":{"type":"uuid","position":2,"optional":false,"check":"public.is_platform_admin(), decided before the write","foreign":{"note":"Any person; platform admins only.","bounded":true}},"p_pinned":{"type":"boolean","position":3,"optional":false,"foreign":{"not_an_id":true}}}}'::jsonb)
on conflict do nothing;

grant execute on function admin.set_user_note_pinned(uuid, uuid, boolean) to authenticated, service_role;
