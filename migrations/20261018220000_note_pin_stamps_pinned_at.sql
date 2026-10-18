-- pin stamps metadata.pinned_at so a pin is not shown as an edit
-- based-on: admin.set_user_note_pinned(uuid, uuid, boolean) c2c05590c8fe2a151c79b2b2d32f9303dd4384a64b31d090bb2f72439ee17c07
-- Pinning bumps workbench.notes.updated_at (platform._touch_row), so the screen read every pinned note as
-- "edited". The pin now also writes metadata.pinned_at (the same instant); the screen calls a note edited
-- only when updated_at is later than pinned_at.
insert into platform.metadata_reserved_keys (key, table_token, reason)
values ('pinned_at', 'note', 'When the pin flag of a note about a person last changed: written only by admin.set_user_note_pinned, read by the admin user notes tab to tell a pin from an edit.')
on conflict do nothing;

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
     set metadata = jsonb_set(
           jsonb_set(coalesce(n.metadata, '{}'::jsonb), '{pinned}', to_jsonb(p_pinned), true),
           '{pinned_at}', to_jsonb(clock_timestamp()), true)
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
