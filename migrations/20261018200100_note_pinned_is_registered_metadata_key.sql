-- Register metadata.pinned on workbench.notes (token 'note'): the pin on a note about a person is stamped by
-- admin.set_user_note_pinned (migrations/20261018200000_admin_set_user_note_pinned.sql) and read by
-- admin.user_notes. platform._metadata_guard judges that definer write as the signed-in role and refused the
-- key ("not system-owned state"), so no client could ever pin. Registered with its reason, per the guard's hint.
insert into platform.metadata_reserved_keys (key, table_token, reason)
values ('pinned', 'note', 'Pin flag on a note about a person: written only by admin.set_user_note_pinned (platform admins), read by admin.user_notes.')
on conflict do nothing;
