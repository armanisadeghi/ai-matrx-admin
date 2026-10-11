/**
 * Sticky notes' words through the notes service (the only way the board
 * touches Notes): a Note carrying the "Sticky notes" tag.
 *
 * Organization (the `ensureOrgId` contract): a sticky is part of its board, so
 * its Note is filed in the BOARD's own organization; a board with none (a demo)
 * files in the active organization. Nothing here picks one.
 *
 * The bucket is a tag: the Note is stamped "Sticky notes" and its home is left to
 * the database default (the organization's General).
 */

import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { createNote, fetchNotesByIds, updateNote } from "@/features/notes/service/notesService";
import { STICKY_NOTES_TAG, type StickyNoteStore, stickyNoteLabel } from "../board/sticky-notes";

export function stickyNoteStore(boardOrganizationId: string | null): StickyNoteStore {
  return {
    create: async (text) => {
      const organization_id = await ensureOrgId(boardOrganizationId);
      const note = await createNote({
        label: stickyNoteLabel(text),
        content: text,
        tags: [STICKY_NOTES_TAG],
        organization_id,
      });
      return note.id;
    },
    update: async (noteId, text) => {
      await updateNote(noteId, { content: text, label: stickyNoteLabel(text) });
    },
    read: async (noteIds) => {
      const rows = await fetchNotesByIds(noteIds);
      return new Map(rows.map((n) => [n.id, n.content ?? ""]));
    },
  };
}
