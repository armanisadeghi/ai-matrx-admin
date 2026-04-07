// features/notes/redux/selectors.ts
// Memoized selectors for the notes Redux slice.

import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type {
  NoteRecord,
  NoteFetchStatus,
  NotesInstance,
  NotesSliceState,
} from "./notes.types";

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

/** The active note ID (or null) — derived from the first instance's activeTabId. */
export const selectActiveNoteId = createSelector(
  [selectNotesState],
  (slice): string | null => {
    const instances = Object.values(slice.instances);
    return instances.length > 0 ? (instances[0].activeTabId ?? null) : null;
  },
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
      result = result.filter((n) => tags.every((tag) => n.tags.includes(tag)));
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

/** Open tab IDs in order — derived from the first instance's openTabs. */
export const selectOpenTabs = createSelector(
  [selectNotesState],
  (slice): string[] => {
    const instances = Object.values(slice.instances);
    return instances.length > 0 ? instances[0].openTabs : [];
  },
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
  createSelector(selectNotesMap, (notes): NoteFetchStatus | null => {
    const record = notes[noteId];
    return record ? record._fetchStatus : null;
  });

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
  (slice) => slice._pendingDispatchIds,
);

// ---------------------------------------------------------------------------
// 7. Per-instance selectors
// ---------------------------------------------------------------------------

/** The instances record map. */
const selectInstancesMap = createSelector(
  [selectNotesState],
  (slice) => slice.instances,
);

/** Full instance by ID (curried). Returns undefined if not registered. */
export const selectInstance = (instanceId: string) =>
  createSelector(
    selectInstancesMap,
    (instances): NotesInstance | undefined => instances[instanceId],
  );

/** Open tab IDs for a specific instance (curried). Returns undefined if instance not registered. */
export const selectInstanceTabs = (instanceId: string) =>
  createSelector(
    selectInstancesMap,
    (instances): string[] | undefined => instances[instanceId]?.openTabs,
  );

/** Active tab ID for a specific instance (curried). Returns undefined if instance not registered. */
export const selectInstanceActiveTab = (instanceId: string) =>
  createSelector(
    selectInstancesMap,
    (instances): string | null | undefined =>
      instances[instanceId]?.activeTabId,
  );

/** Whether a given note is the active tab in an instance (curried). */
export const selectIsActiveTab = (instanceId: string, noteId: string) =>
  createSelector(
    selectInstancesMap,
    (instances): boolean => instances[instanceId]?.activeTabId === noteId,
  );

// ---------------------------------------------------------------------------
// 8. Per-note granular selectors (single fields)
// ---------------------------------------------------------------------------

/** Note content string by ID (curried). Returns the existing string ref from state. */
export const selectNoteContent = (noteId: string) =>
  createSelector(
    selectNotesMap,
    (notes): string | undefined => notes[noteId]?.content,
  );

/** Note label string by ID (curried). Returns the existing string ref from state. */
export const selectNoteLabel = (noteId: string) =>
  createSelector(
    selectNotesMap,
    (notes): string | undefined => notes[noteId]?.label,
  );

/** Note folder name by ID (curried). Returns the existing string ref from state. */
export const selectNoteFolder = (noteId: string) =>
  createSelector(
    selectNotesMap,
    (notes): string | undefined => notes[noteId]?.folder_name,
  );

/** Note tags array by ID (curried). Returns the existing array ref from state. */
export const selectNoteTags = (noteId: string) =>
  createSelector(
    selectNotesMap,
    (notes): string[] | undefined => notes[noteId]?.tags,
  );

/** Last editor mode from note metadata by ID (curried). */
export const selectNoteEditorMode = (noteId: string) =>
  createSelector(
    selectNotesMap,
    (notes): string | undefined =>
      (notes[noteId]?.metadata as Record<string, unknown>)?.lastEditorMode as
        | string
        | undefined,
  );

/** Whether a note is auto-generated (client-only) by ID (curried). */
export const selectNoteIsAutogenerated = (noteId: string) =>
  createSelector(
    selectNotesMap,
    (notes): boolean => notes[noteId]?._isAutogenerated ?? false,
  );

/** Whether a note is dirty by ID (curried). Primitive boolean — safe for useAppSelector. */
export const selectNoteIsDirtyById = (noteId: string) =>
  createSelector(
    selectNotesMap,
    (notes): boolean => notes[noteId]?._dirty ?? false,
  );

/** Whether a note is saving by ID (curried). Primitive boolean. */
export const selectNoteIsSavingById = (noteId: string) =>
  createSelector(
    selectNotesMap,
    (notes): boolean => notes[noteId]?._saving ?? false,
  );

/** Whether a note is the active tab in a given instance (primitive boolean). */
export const selectIsInstanceActiveTab =
  (instanceId: string, noteId: string) =>
  (state: RootState): boolean =>
    state.notes.instances?.[instanceId]?.activeTabId === noteId;

// ---------------------------------------------------------------------------
// 9. Presence selectors
// ---------------------------------------------------------------------------

/** Whether other users are currently active in the notes system. */
export const selectOtherUsersActive = createSelector(
  [selectNotesState],
  (slice): boolean => slice.otherUsersActive,
);

/** Whether the currently active note is being edited by another user. */
export const selectActiveNoteEditedByOthers = createSelector(
  [selectNotesState],
  (slice): boolean => slice.activeNoteEditedByOthers,
);

// ---------------------------------------------------------------------------
// 10. Auto-generated note check
// ---------------------------------------------------------------------------

/**
 * Find an auto-generated note with empty content in the given folder.
 * Returns the note ID or null if none found (curried).
 */
export const selectAutogeneratedEmptyNote = (folder: string) =>
  createSelector(selectNotesMap, (notes): string | null => {
    for (const [id, record] of Object.entries(notes)) {
      if (
        record._isAutogenerated &&
        record.content === "" &&
        record.folder_name === folder &&
        !record.is_deleted
      ) {
        return id;
      }
    }
    return null;
  });

// ---------------------------------------------------------------------------
// 11. Pending dispatch (echo suppression)
// ---------------------------------------------------------------------------

/** The full set of note IDs with a pending dispatch. */
export const selectPendingDispatchIds = createSelector(
  [selectNotesState],
  (slice): Set<string> => slice._pendingDispatchIds,
);

/** Whether a specific note has a pending dispatch (curried). */
export const selectIsPendingDispatch = (noteId: string) =>
  createSelector([selectNotesState], (slice): boolean =>
    slice._pendingDispatchIds.has(noteId),
  );
