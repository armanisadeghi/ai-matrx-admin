// Notes about a person — THE ONE HOME: platform Notes (workbench.notes) linked note -> user, read and
// written through the admin definer functions (migrations/20261018190000_admin_user_notes_one_home.sql).
//
//   readUserNotes(userId)  every note about the person, for any platform admin (another author's
//                          "only me" notes left out) — admin.user_notes
//   readMyUserNotes()      my own notes about people, newest first — admin.my_user_notes
//                          (Accounts "My notes" column, Personal notes dialog)
//   addUserNote(...)       note + edge in ONE transaction — admin.add_user_note; never half-saved
//
// Writes are filed in the writer's declared ADMIN organization (lib/organizations/adminOrganization.ts);
// off the admin lane, the active organization (ensureOrgId). The database refuses a system organization.
// Pin goes through admin.set_user_note_pinned (row security refuses a non-author's update). Edit / delete stay on the Notes service (NotesAPI) — the note is an ordinary note.

import { createClient } from "@/utils/supabase/client";
import { getStoreSingleton } from "@/lib/redux/store-singleton";
import { activeAdminOrganization, type AdminOrganizationStateShape } from "@/lib/organizations/adminOrganization";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import type { Database } from "@/types/database.types";

export type NoteShownTo = Database["platform"]["Enums"]["shown_to"];
export type PersonNoteRow = Database["admin"]["Functions"]["user_notes"]["Returns"][number];
export type MyUserNoteRow = Database["admin"]["Functions"]["my_user_notes"]["Returns"][number];

export async function readUserNotes(userId: string): Promise<PersonNoteRow[]> {
  const { data, error } = await createClient().schema("admin").rpc("user_notes", { p_user: userId });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** My notes about people, grouped by person, newest first within each. */
export async function readMyUserNotes(): Promise<Map<string, MyUserNoteRow[]>> {
  const { data, error } = await createClient().schema("admin").rpc("my_user_notes");
  if (error) throw new Error(error.message);
  const byUser = new Map<string, MyUserNoteRow[]>();
  for (const row of data ?? []) {
    const list = byUser.get(row.user_id);
    if (list) list.push(row);
    else byUser.set(row.user_id, [row]);
  }
  return byUser;
}

/** The organization a note about a person is filed in: the admin organization, else the active one. */
export async function personNoteOrganizationId(): Promise<string> {
  const state = getStoreSingleton()?.getState() as AdminOrganizationStateShape | undefined;
  return activeAdminOrganization(state)?.id ?? (await ensureOrgId(null));
}

export async function addUserNote(input: {
  userId: string;
  content: string;
  shownTo: NoteShownTo;
  label: string;
}): Promise<string> {
  const organizationId = await personNoteOrganizationId();
  const { data, error } = await createClient().schema("admin").rpc("add_user_note", {
    p_user: input.userId,
    p_organization_id: organizationId,
    p_content: input.content,
    p_shown_to: input.shownTo,
    p_label: input.label,
  });
  if (error) throw new Error(error.message);
  return data;
}

/** Pin or unpin a note about a person — any platform admin, any shared note (admin.set_user_note_pinned). */
export async function setUserNotePinned(noteId: string, userId: string, pinned: boolean): Promise<void> {
  const { error } = await createClient().schema("admin").rpc("set_user_note_pinned", {
    p_note: noteId,
    p_user: userId,
    p_pinned: pinned,
  });
  if (error) throw new Error(error.message);
}
