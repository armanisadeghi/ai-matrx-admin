// features/education/notes/education-notes.ts
//
// THE ONE ANSWER TO "which notes belong to Education?"
//
// Notes are platform notes (workbench.notes) — the Notes app lists every one of
// them. Education lists ONLY the notes explicitly marked for it: the ones
// carrying the "Study Notes" tag (notes have homes, not folders; a feature's
// bucket is a tag). Both writers stamp that mark (the converter's
// notesGenerator here and aidream's graph_actions/education/persist.py), a note
// created from an Education surface is created with it, and a person puts any
// other note into Education from the Notes app by tagging it Study Notes. A
// plain draft, chat save or quick note is a note, never Education material.
//
// Every Education surface that lists notes reads through here — the Smart Notes
// home and the study-guide library in the client, and the Education Library RPC
// (`public.edu_library_scope_rows`, which carries the same predicate in SQL,
// migrations/edu_library_notes_education_only.sql). The guard
// `__tests__/education-notes.test.ts` fails if a plain note reaches an
// Education list, or if an Education file lists notes around this module.

import { readAllRows } from "@ai-matrx/data/db";
import { supabase } from "@/utils/supabase/client";
import { requireUserId } from "@/utils/auth/getUserId";
import { defaultListFilter } from "@/lib/list-scope";
import { hydrateNoteContextLinks } from "@/features/notes/service/noteContextAssociations";
import type { NoteListItem } from "@/features/notes/types";
import { NOTE_BUCKET_TAGS, noteHasBucketTag } from "@/features/notes/homes/bucketTags";

/** The tag a note must carry to belong to Education. */
export const EDUCATION_NOTES_TAG = NOTE_BUCKET_TAGS.studyNotes;

/** True only for a note explicitly marked for Education. */
export function isEducationNote(note: { tags?: readonly string[] | null }): boolean {
  return noteHasBucketTag(note, EDUCATION_NOTES_TAG);
}

/** A note's tags plus the Study Notes mark — what a note made from an Education surface carries. */
export function withStudyNotesTag(tags?: readonly string[] | null): string[] {
  return [...new Set([...(tags ?? []), EDUCATION_NOTES_TAG])];
}

/** The create fields that mark a note created from an Education surface. */
export const EDUCATION_NOTE_CREATE_FIELDS = { tags: withStudyNotesTag() } as const;

const EDUCATION_NOTE_LIST_COLUMNS =
  "id,created_by,label,home_scope_id,tags,updated_at,position,organization_id,shown_to,published_to_web,version";

export interface ListEducationNotesOptions {
  /**
   * `mine` — only notes I created (the personal study-guide library).
   * `default` — the note token's registry list scope, exactly as the Notes app
   * list decides it (the Smart Notes home, which filters by Shown to itself).
   */
  owner?: "mine" | "default";
}

/** Every live note marked for Education that this person may list, newest first. */
export async function listEducationNotes(
  options: ListEducationNotesOptions = {},
): Promise<NoteListItem[]> {
  const userId = requireUserId();
  const listScope = await defaultListFilter("note", {
    userId,
    requested: options.owner === "mine" ? "mine" : undefined,
  });
  const rows = await readAllRows(
    ({ from, to }) => {
      let query = supabase
        .schema("workbench")
        .from("notes")
        .select(EDUCATION_NOTE_LIST_COLUMNS, { count: "exact" })
        .is("deleted_at", null)
        .contains("tags", [EDUCATION_NOTES_TAG]);
      query = listScope.apply(query);
      return query.order("updated_at", { ascending: false }).order("id").range(from, to);
    },
    { label: "workbench.notes education notes" },
  );
  // Belt to the query's braces: whatever a future query change returns, a
  // note that is not marked for Education never reaches an Education list.
  return hydrateNoteContextLinks(rows.filter(isEducationNote)) as Promise<NoteListItem[]>;
}
