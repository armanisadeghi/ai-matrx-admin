// features/notes/redux/selectors.ts
// Memoized selectors for the notes Redux slice.

import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type { NoteRecord, NoteFetchStatus, NotesSliceState } from "./notes.types";

// ── Default folder ordering ────────────────────────────────────────────────

const DEFAULT_FOLDER_ORDER: readonly string[] = [
  "Draft",
  "Personal",
  "Business",
  "Prompts",
  "Scratch",
];

// ---------------------------------------------------------------------------
// 1. Base selectors
// ---------------------------------------------------------------------------

/** Full notes slice state. */
export const selectNotesState = (state: RootState): NotesSliceState =>
  state.notes;

/** The notes record map (keyed by ID). */
export const selectNotesMap = createSelector(
  [selectNotesState],
  (slice) => slice.notes,
);

/** Single note record by ID (curried). Returns undefined if not in state. */
export const selectNoteById = (noteId: string) =>
  createSelector(
    selectNotesMap,
    (notes): NoteRecord | undefined => notes[noteId],
  );

/** The active note ID (or null). */
export const selectActiveNoteId = createSelector(
  [selectNotesState],
  (slice) => slice.activeNoteId,
);

/** The full active note record (or undefined). */
export const selectActiveNote = createSelector(
  [selectNotesMap, selectActiveNoteId],
  (notes, activeId): NoteRecord | undefined =>
    activeId ? notes[activeId] : undefined,
);

// ---------------------------------------------------------------------------
// 2. List selectors
// ---------------------------------------------------------------------------

/** Array of all non-deleted notes, sorted by position then updated_at desc. */
export const selectAllNotesList = createSelector(
  [selectNotesMap],
  (notes): NoteRecord[] =>
    Object.values(notes)
      .filter((n) => !n.is_deleted)
      .sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        return b.updated_at.localeCompare(a.updated_at);
      }),
);

/** Unique folder names sorted with defaults first, then alphabetical. */
export const selectAllFolders = createSelector(
  [selectAllNotesList],
  (notes): string[] => {
    const folderSet = new Set<string>();
    for (const note of notes) {
      if (note.folder_name) folderSet.add(note.folder_name);
    }

    // Always include the default folders even if no notes exist in them
    for (const folder of DEFAULT_FOLDER_ORDER) {
      folderSet.add(folder);
    }

    const folders = Array.from(folderSet);
    return folders.sort((a, b) => {
      const aIdx = DEFAULT_FOLDER_ORDER.indexOf(a);
      const bIdx = DEFAULT_FOLDER_ORDER.indexOf(b);
      const aIsDefault = aIdx !== -1;
      const bIsDefault = bIdx !== -1;

      if (aIsDefault && bIsDefault) return aIdx - bIdx;
      if (aIsDefault) return -1;
      if (bIsDefault) return 1;
      return a.localeCompare(b);
    });
  },
);

/** Notes in a specific folder (curried). Returns sorted non-deleted notes. */
export const selectNotesByFolder = (folder: string) =>
  createSelector(selectAllNotesList, (notes): NoteRecord[] =>
    notes.filter((n) => n.folder_name === folder),
  );

/**
 * Filtered list of notes. All filters are optional.
 * - search: case-insensitive substring match against label, content, and tags
 * - folder: exact folder_name match
 * - tags: note must contain ALL specified tags
 */
export const selectFilteredNotes = (
  search?: string,
  folder?: string,
  tags?: string[],
) =>
  createSelector(selectAllNotesList, (notes): NoteRecord[] => {
    let result = notes;

    if (folder) {
      result = result.filter((n) => n.folder_name === folder);
    }

    if (tags && tags.length > 0) {
      result = result.filter((n) =>
        tags.every((tag) => n.tags.includes(tag)),
      );
    }

    if (search) {
      const query = search.toLowerCase();
      result = result.filter(
        (n) =>
          n.label.toLowerCase().includes(query) ||
          n.content.toLowerCase().includes(query) ||
          n.tags.some((t) => t.toLowerCase().includes(query)),
      );
    }

    return result;
  });

// ---------------------------------------------------------------------------
// 3. Tab selectors
// ---------------------------------------------------------------------------

/** Open tab IDs in order. */
export const selectOpenTabs = createSelector(
  [selectNotesState],
  (slice) => slice.openTabs,
);

/** Full note records for all open tabs (preserves tab order). */
export const selectOpenTabNotes = createSelector(
  [selectNotesMap, selectOpenTabs],
  (notes, tabIds): NoteRecord[] =>
    tabIds
      .map((id) => notes[id])
      .filter((record): record is NoteRecord => record !== undefined),
);

// ---------------------------------------------------------------------------
// 4. Undo/Redo selectors (per-note, curried)
// ---------------------------------------------------------------------------

/** Whether the note has undo history available. */
export const selectNoteCanUndo = (noteId: string) =>
  createSelector(selectNotesMap, (notes): boolean => {
    const record = notes[noteId];
    return record ? record._undoPast.length > 0 : false;
  });

/** Whether the note has redo history available. */
export const selectNoteCanRedo = (noteId: string) =>
  createSelector(selectNotesMap, (notes): boolean => {
    const record = notes[noteId];
    return record ? record._undoFuture.length > 0 : false;
  });

/** Number of undo steps available for the note. */
export const selectNoteUndoDepth = (noteId: string) =>
  createSelector(selectNotesMap, (notes): number => {
    const record = notes[noteId];
    return record ? record._undoPast.length : 0;
  });

/** Number of redo steps available for the note. */
export const selectNoteRedoDepth = (noteId: string) =>
  createSelector(selectNotesMap, (notes): number => {
    const record = notes[noteId];
    return record ? record._undoFuture.length : 0;
  });

// ---------------------------------------------------------------------------
// 5. Dirty / Save state (per-note, curried)
// ---------------------------------------------------------------------------

/** Whether the note has unsaved local changes. */
export const selectNoteIsDirty = (noteId: string) =>
  createSelector(selectNotesMap, (notes): boolean => {
    const record = notes[noteId];
    return record ? record._dirty : false;
  });

/** The set of dirty field names for the note. */
export const selectNoteDirtyFields = (noteId: string) =>
  createSelector(selectNotesMap, (notes): Set<string> => {
    const record = notes[noteId];
    return record ? record._dirtyFields : new Set();
  });

/**
 * Computed save state for a note:
 * - "conflict" — server changed while local edits exist
 * - "saving"   — save request in flight
 * - "dirty"    — local changes pending save
 * - "saved"    — no pending changes
 */
export const selectNoteSaveState = (noteId: string) =>
  createSelector(
    selectNotesMap,
    (notes): "saved" | "dirty" | "saving" | "conflict" => {
      const record = notes[noteId];
      if (!record) return "saved";
      if (record._error === "conflict") return "conflict";
      if (record._saving) return "saving";
      if (record._dirty) return "dirty";
      return "saved";
    },
  );

/** Whether the note is currently loading (individual fetch in progress). */
export const selectNoteIsLoading = (noteId: string) =>
  createSelector(selectNotesMap, (notes): boolean => {
    const record = notes[noteId];
    return record ? record._loading : false;
  });

/** The fetch status for the note: "list", "full", or null if not fetched. */
export const selectNoteFetchStatus = (noteId: string) =>
  createSelector(
    selectNotesMap,
    (notes): NoteFetchStatus | null => {
      const record = notes[noteId];
      return record ? record._fetchStatus : null;
    },
  );

// ---------------------------------------------------------------------------
// 6. Global selectors
// ---------------------------------------------------------------------------

/** Global list fetch status: "idle" | "loading" | "loaded" | "error". */
export const selectNotesListStatus = createSelector(
  [selectNotesState],
  (slice) => slice.listStatus,
);

/** Whether the realtime subscription channel is connected. */
export const selectRealtimeConnected = createSelector(
  [selectNotesState],
  (slice) => slice.realtimeConnected,
);

/** IDs of notes currently being saved (used for echo suppression). */
export const selectSavingNoteIds = createSelector(
  [selectNotesState],
  (slice) => slice._savingNoteIds,
);
