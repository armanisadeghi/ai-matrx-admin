// features/notes/redux/slice.ts
// Redux slice for notes — follows the agent-definition pattern with
// per-note undo/redo, two-stage fetch, and dirty tracking.

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Note } from "../types";
import {
  type NoteRecord,
  type NoteUndoEntry,
  type NoteUndoableField,
  type NoteFetchStatus,
  type NoteFieldSnapshot,
  type NotesSliceState,
  NOTE_UNDO_MAX_ENTRIES,
  NOTE_UNDO_MAX_BYTES,
  NOTE_UNDO_COALESCE_MS,
  createBlankNoteRecord,
  createBlankNoteRecordFromPartial,
  shouldUpgradeNoteFetchStatus,
} from "./notes.types";

// ── Byte estimation ─────────────────────────────────────────────────────────

function estimateBytes(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "string") return value.length * 2;
  if (typeof value === "number" || typeof value === "boolean") return 8;
  try {
    return JSON.stringify(value).length * 2;
  } catch {
    return 256;
  }
}

function totalStackBytes(stack: NoteUndoEntry[]): number {
  let total = 0;
  for (const entry of stack) total += entry.byteEstimate;
  return total;
}

// ── Stack compression ───────────────────────────────────────────────────────

function compressStack(stack: NoteUndoEntry[]): NoteUndoEntry[] {
  if (
    stack.length <= NOTE_UNDO_MAX_ENTRIES &&
    totalStackBytes(stack) <= NOTE_UNDO_MAX_BYTES
  ) {
    return stack;
  }

  const protectedHead = 1;
  const protectedTail = Math.min(20, Math.floor(stack.length * 0.4));

  if (stack.length <= protectedHead + protectedTail) return stack;

  const head = stack.slice(0, protectedHead);
  const tail = stack.slice(-protectedTail);
  let middle = stack.slice(protectedHead, stack.length - protectedTail);

  // Phase 1: merge consecutive same-field entries (keep oldest value)
  const merged: NoteUndoEntry[] = [];
  for (const entry of middle) {
    const prev = merged[merged.length - 1];
    if (prev && prev.field === entry.field) continue;
    merged.push(entry);
  }
  middle = merged;

  // Phase 2: thin every other entry if still over count
  let result = [...head, ...middle, ...tail];
  if (result.length > NOTE_UNDO_MAX_ENTRIES) {
    const thinned: NoteUndoEntry[] = [];
    for (let i = 0; i < middle.length; i++) {
      if (i % 2 === 0) thinned.push(middle[i]);
    }
    result = [...head, ...thinned, ...tail];
  }

  // Phase 3: drop from oldest middle if still over byte budget
  while (
    result.length > protectedHead + protectedTail + 1 &&
    totalStackBytes(result) > NOTE_UNDO_MAX_BYTES
  ) {
    result.splice(protectedHead, 1);
  }

  return result;
}

// ── Undo entry push with coalescing ─────────────────────────────────────────

function pushUndoEntry(
  record: NoteRecord,
  field: NoteUndoableField,
  previousValue: Note[NoteUndoableField],
): void {
  const now = Date.now();
  const bytes = estimateBytes(previousValue);
  const top = record._undoPast[record._undoPast.length - 1];

  if (top && top.field === field && now - top.timestamp < NOTE_UNDO_COALESCE_MS) {
    top.timestamp = now;
  } else {
    record._undoPast.push({
      field,
      value: previousValue,
      timestamp: now,
      byteEstimate: bytes,
    });
  }

  record._undoFuture = [];
  record._undoPast = compressStack(record._undoPast);
}

// ── Apply field edit with dirty tracking ─────────────────────────────────────

function applyFieldEdit<K extends NoteUndoableField>(
  record: NoteRecord,
  field: K,
  value: Note[K],
): void {
  const previousValue = record[field] as Note[K];

  // Capture clean baseline once per field per clean cycle
  if (!record._dirtyFields.has(field)) {
    (record._fieldHistory as NoteFieldSnapshot)[field] = previousValue;
  }

  pushUndoEntry(record, field, previousValue);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (record as any)[field] = value;
  record._dirtyFields.add(field);
  record._dirty = true;
}

// ── Mark record clean ───────────────────────────────────────────────────────

function markRecordClean(record: NoteRecord): void {
  record._dirty = false;
  record._dirtyFields = new Set();
  record._fieldHistory = {};
  // Undo stacks are preserved across saves (user can still undo after save)
}

// ── Apply fetch status (never downgrades) ───────────────────────────────────

function applyFetchStatus(
  record: NoteRecord,
  status: NoteFetchStatus,
): void {
  if (shouldUpgradeNoteFetchStatus(record._fetchStatus, status)) {
    record._fetchStatus = status;
  }
}

// ── Initial state ───────────────────────────────────────────────────────────

const initialState: NotesSliceState = {
  notes: {},
  activeNoteId: null,
  openTabs: [],
  listStatus: "idle",
  listError: null,
  realtimeConnected: false,
  _savingNoteIds: [],
};

// ── Slice ───────────────────────────────────────────────────────────────────

const notesSlice = createSlice({
  name: "notes",
  initialState,
  reducers: {
    // ── Field edits (triggers undo) ───────────────────────────────────────

    /** Edit a single undoable field on a note. Pushes undo entry + marks dirty. */
    setNoteField(
      state,
      action: PayloadAction<{
        id: string;
        field: NoteUndoableField;
        value: Note[NoteUndoableField];
      }>,
    ) {
      const record = state.notes[action.payload.id];
      if (!record) return;
      applyFieldEdit(record, action.payload.field, action.payload.value);
    },

    /** Batch edit multiple fields at once. Each gets its own undo entry. */
    setNoteFields(
      state,
      action: PayloadAction<{
        id: string;
        updates: Partial<Pick<Note, NoteUndoableField>>;
      }>,
    ) {
      const record = state.notes[action.payload.id];
      if (!record) return;
      const { updates } = action.payload;
      for (const [field, value] of Object.entries(updates)) {
        if (value !== undefined) {
          applyFieldEdit(
            record,
            field as NoteUndoableField,
            value as Note[NoteUndoableField],
          );
        }
      }
    },

    // ── Undo / Redo ─────────────────────────────────────────────────────

    undoNoteEdit(state, action: PayloadAction<{ id: string }>) {
      const record = state.notes[action.payload.id];
      if (!record || record._undoPast.length === 0) return;

      const entry = record._undoPast.pop()!;
      const currentValue = record[entry.field] as Note[NoteUndoableField];
      record._undoFuture.push({
        field: entry.field,
        value: currentValue,
        timestamp: Date.now(),
        byteEstimate: estimateBytes(currentValue),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (record as any)[entry.field] = entry.value;

      // Recalculate dirty: compare against clean baseline
      const originalValue = record._fieldHistory[entry.field];
      if (originalValue !== undefined && entry.value === originalValue) {
        record._dirtyFields.delete(entry.field);
      } else if (!record._dirtyFields.has(entry.field)) {
        record._dirtyFields.add(entry.field);
      }
      record._dirty = record._dirtyFields.size > 0;
    },

    redoNoteEdit(state, action: PayloadAction<{ id: string }>) {
      const record = state.notes[action.payload.id];
      if (!record || record._undoFuture.length === 0) return;

      const entry = record._undoFuture.pop()!;
      const currentValue = record[entry.field] as Note[NoteUndoableField];
      record._undoPast.push({
        field: entry.field,
        value: currentValue,
        timestamp: Date.now(),
        byteEstimate: estimateBytes(currentValue),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (record as any)[entry.field] = entry.value;

      record._dirtyFields.add(entry.field);
      record._dirty = true;
    },

    clearNoteUndoHistory(state, action: PayloadAction<{ id: string }>) {
      const record = state.notes[action.payload.id];
      if (!record) return;
      record._undoPast = [];
      record._undoFuture = [];
    },

    // ── Note lifecycle ──────────────────────────────────────────────────

    /** Upsert a note from server data (list fetch or realtime event).
     *  Respects fetch status hierarchy and preserves local edits. */
    upsertNoteFromServer(
      state,
      action: PayloadAction<{
        note: Partial<Note> & { id: string };
        fetchStatus: NoteFetchStatus;
      }>,
    ) {
      const { note, fetchStatus } = action.payload;
      const existing = state.notes[note.id];

      if (!existing) {
        state.notes[note.id] = createBlankNoteRecordFromPartial(note, fetchStatus);
        return;
      }

      // Never downgrade fetch status
      applyFetchStatus(existing, fetchStatus);

      // If user has local edits, don't overwrite — mark conflict if content changed
      if (existing._dirty) {
        const serverContentChanged =
          note.content !== undefined && note.content !== existing.content;
        const serverLabelChanged =
          note.label !== undefined && note.label !== existing.label;
        if (serverContentChanged || serverLabelChanged) {
          // Store server data but keep local edits — saveState handled by consumers
          existing._error = "conflict";
        }
      }

      // Merge server fields (don't overwrite undoable fields if dirty)
      for (const [key, value] of Object.entries(note)) {
        if (key.startsWith("_")) continue;
        if (
          existing._dirty &&
          existing._dirtyFields.has(key as NoteUndoableField)
        ) {
          continue; // Preserve local edit
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (existing as any)[key] = value;
      }
    },

    /** Remove a note from state entirely */
    removeNote(state, action: PayloadAction<string>) {
      const noteId = action.payload;
      delete state.notes[noteId];
      state.openTabs = state.openTabs.filter((id) => id !== noteId);
      if (state.activeNoteId === noteId) {
        state.activeNoteId = state.openTabs[0] ?? null;
      }
    },

    // ── Save state ──────────────────────────────────────────────────────

    markNoteSaving(state, action: PayloadAction<string>) {
      const record = state.notes[action.payload];
      if (record) record._saving = true;
      if (!state._savingNoteIds.includes(action.payload)) {
        state._savingNoteIds.push(action.payload);
      }
    },

    markNoteSaved(
      state,
      action: PayloadAction<{ id: string; updatedAt?: string }>,
    ) {
      const record = state.notes[action.payload.id];
      if (!record) return;
      record._saving = false;
      record._error = null;
      if (action.payload.updatedAt) {
        record.updated_at = action.payload.updatedAt;
      }
      markRecordClean(record);
    },

    markNoteSaveError(
      state,
      action: PayloadAction<{ id: string; error: string }>,
    ) {
      const record = state.notes[action.payload.id];
      if (record) {
        record._saving = false;
        record._error = action.payload.error;
      }
    },

    clearSavingNoteId(state, action: PayloadAction<string>) {
      state._savingNoteIds = state._savingNoteIds.filter(
        (id) => id !== action.payload,
      );
    },

    // ── Active note & tabs ──────────────────────────────────────────────

    setActiveNote(state, action: PayloadAction<string | null>) {
      state.activeNoteId = action.payload;
    },

    addTab(state, action: PayloadAction<string>) {
      if (!state.openTabs.includes(action.payload)) {
        state.openTabs.push(action.payload);
      }
    },

    removeTab(state, action: PayloadAction<string>) {
      const noteId = action.payload;
      state.openTabs = state.openTabs.filter((id) => id !== noteId);
      if (state.activeNoteId === noteId) {
        state.activeNoteId = state.openTabs[0] ?? null;
      }
    },

    reorderTabs(state, action: PayloadAction<string[]>) {
      state.openTabs = action.payload;
    },

    // ── List fetch status ───────────────────────────────────────────────

    setListStatus(
      state,
      action: PayloadAction<NotesSliceState["listStatus"]>,
    ) {
      state.listStatus = action.payload;
    },

    setListError(state, action: PayloadAction<string | null>) {
      state.listError = action.payload;
    },

    // ── Realtime ────────────────────────────────────────────────────────

    setRealtimeConnected(state, action: PayloadAction<boolean>) {
      state.realtimeConnected = action.payload;
    },

    // ── Bulk operations ─────────────────────────────────────────────────

    /** Clear all notes and reset state (e.g., on logout) */
    resetNotesState() {
      return initialState;
    },
  },
});

export const {
  setNoteField,
  setNoteFields,
  undoNoteEdit,
  redoNoteEdit,
  clearNoteUndoHistory,
  upsertNoteFromServer,
  removeNote,
  markNoteSaving,
  markNoteSaved,
  markNoteSaveError,
  clearSavingNoteId,
  setActiveNote,
  addTab,
  removeTab,
  reorderTabs,
  setListStatus,
  setListError,
  setRealtimeConnected,
  resetNotesState,
} = notesSlice.actions;

export default notesSlice.reducer;
