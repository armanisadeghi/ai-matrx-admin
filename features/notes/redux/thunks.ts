/**
 * Notes — Redux Thunks
 *
 * Read thunks:
 *   fetchNotesList           — lightweight list for sidebar (id, label, folder_name, tags, updated_at, position)
 *   fetchNoteContent         — full note when tab opened
 *
 * Write thunks:
 *   saveNote                 — save dirty fields with concurrency check
 *   createNewNote            — create note in DB
 *   deleteNote               — soft delete
 *   copyNote                 — duplicate a note
 *   findOrCreateEmptyNote    — find existing empty note or create one
 *   moveNoteToFolder         — move note to a different folder
 *   saveNoteField            — quick single-field save + optimistic update
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "@/utils/supabase/client";
import type { RootState } from "@/lib/redux/store";
import type { Note, CreateNoteInput } from "../types";
import type { NoteRecord } from "./notes.types";
import {
  upsertNoteFromServer,
  removeNote,
  markNoteSaving,
  markNoteSaved,
  markNoteSaveError,
  clearSavingNoteId,
  setListStatus,
  setListError,
  setActiveNote,
  addTab,
  setNoteField,
} from "./slice";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUserId(getState: () => unknown): string {
  const state = getState() as RootState;
  const userId = state.user.id;
  if (!userId) throw new Error("User is not authenticated");
  return userId;
}

function dispatchCustomEvent(name: string, detail?: unknown): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
}

// Echo suppression timeout (ms)
const SAVING_NOTE_ID_TIMEOUT = 3000;

// ---------------------------------------------------------------------------
// 1. fetchNotesList
// ---------------------------------------------------------------------------

/**
 * Fetch basics for sidebar: id, label, folder_name, tags, updated_at, position.
 * Dispatches upsertNoteFromServer for each with fetchStatus "list".
 */
export const fetchNotesList = createAsyncThunk<void, void>(
  "notes/fetchNotesList",
  async (_, { dispatch, getState }) => {
    const userId = getUserId(getState);

    dispatch(setListStatus("loading"));

    const { data, error } = await supabase
      .from("notes")
      .select("id, label, folder_name, tags, updated_at, position")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    if (error) {
      dispatch(setListError(error.message));
      dispatch(setListStatus("error"));
      throw error;
    }

    const notes = data ?? [];

    for (const note of notes) {
      dispatch(
        upsertNoteFromServer({
          note: { ...note, user_id: userId },
          fetchStatus: "list",
        }),
      );
    }

    dispatch(setListStatus("loaded"));
  },
);

// ---------------------------------------------------------------------------
// 2. fetchNoteContent
// ---------------------------------------------------------------------------

/**
 * Fetch the full note when a tab is opened.
 * Dispatches upsertNoteFromServer with fetchStatus "full".
 */
export const fetchNoteContent = createAsyncThunk<Note | null, string>(
  "notes/fetchNoteContent",
  async (noteId, { dispatch, getState }) => {
    // Skip if we already have full content — never refetch unless forced
    const state = getState() as RootState;
    const existing = state.notes?.notes?.[noteId];
    if (existing?._fetchStatus === "full") {
      return null; // Already have it — no network call
    }

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .single();

    if (error) throw error;
    if (!data) throw new Error("Note not found");

    dispatch(
      upsertNoteFromServer({
        note: data,
        fetchStatus: "full",
      }),
    );

    return data as Note;
  },
);

// ---------------------------------------------------------------------------
// 3. saveNote
// ---------------------------------------------------------------------------

/**
 * Save dirty fields with concurrency check.
 * - Reads note from state, checks _dirty and _dirtyFields
 * - Builds update object from only dirty fields
 * - Concurrency check: fetch server updated_at, compare with local
 * - If conflict: dispatch error, don't save
 * - If ok: markNoteSaving → update → markNoteSaved
 * - Echo suppression: manage _savingNoteIds with 3s timeout
 * - Label change: dispatch custom event "notes:labelChange"
 */
export const saveNote = createAsyncThunk<void, string>(
  "notes/saveNote",
  async (noteId, { dispatch, getState }) => {
    const state = getState() as RootState;
    const record = state.notes.notes[noteId] as NoteRecord | undefined;

    if (!record || !record._dirty || record._dirtyFields.size === 0) {
      return;
    }

    // Build update object from only dirty fields
    const updates: Record<string, unknown> = {};
    const dirtyFields = Array.from(record._dirtyFields);
    const hasLabelChange = dirtyFields.includes("label");

    for (const field of dirtyFields) {
      updates[field] = record[field];
    }

    // Concurrency check: fetch server updated_at
    const { data: serverNote, error: fetchError } = await supabase
      .from("notes")
      .select("updated_at")
      .eq("id", noteId)
      .single();

    if (fetchError) {
      dispatch(markNoteSaveError({ id: noteId, error: fetchError.message }));
      throw fetchError;
    }

    if (serverNote && serverNote.updated_at !== record.updated_at) {
      const conflictMsg =
        "Conflict: note was modified on another device or tab. Please refresh.";
      dispatch(markNoteSaveError({ id: noteId, error: conflictMsg }));
      throw new Error(conflictMsg);
    }

    // Proceed with save
    dispatch(markNoteSaving(noteId));

    const { data, error } = await supabase
      .from("notes")
      .update(updates)
      .eq("id", noteId)
      .select("updated_at")
      .single();

    if (error) {
      dispatch(markNoteSaveError({ id: noteId, error: error.message }));
      throw error;
    }

    dispatch(
      markNoteSaved({
        id: noteId,
        updatedAt: data?.updated_at,
      }),
    );

    // Echo suppression: clear saving ID after timeout
    setTimeout(() => {
      dispatch(clearSavingNoteId(noteId));
    }, SAVING_NOTE_ID_TIMEOUT);

    // Dispatch label change event if label was dirty
    if (hasLabelChange) {
      dispatchCustomEvent("notes:labelChange", {
        noteId,
        label: record.label,
      });
    }
  },
);

// ---------------------------------------------------------------------------
// 4. createNewNote
// ---------------------------------------------------------------------------

/**
 * Create a new note in the database.
 * Dispatches upsertNoteFromServer with "full", addTab, setActiveNote.
 */
export const createNewNote = createAsyncThunk<
  Note,
  CreateNoteInput | undefined
>(
  "notes/createNewNote",
  async (input = {}, { dispatch, getState }) => {
    const userId = getUserId(getState);

    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: userId,
        label: input.label ?? "New Note",
        content: input.content ?? "",
        folder_name: input.folder_name ?? "Draft",
        tags: input.tags ?? [],
        metadata: {},
        position: 0,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error("Failed to create note");

    const note = data as Note;

    dispatch(
      upsertNoteFromServer({
        note,
        fetchStatus: "full",
      }),
    );

    dispatch(addTab(note.id));
    dispatch(setActiveNote(note.id));

    return note;
  },
);

// ---------------------------------------------------------------------------
// 5. deleteNote
// ---------------------------------------------------------------------------

/**
 * Soft delete a note (set is_deleted = true).
 * Dispatches removeNote and custom event "notes:deleted".
 */
export const deleteNote = createAsyncThunk<void, string>(
  "notes/deleteNote",
  async (noteId, { dispatch }) => {
    const { error } = await supabase
      .from("notes")
      .update({ is_deleted: true })
      .eq("id", noteId);

    if (error) throw error;

    dispatch(removeNote(noteId));
    dispatchCustomEvent("notes:deleted", { noteId });
  },
);

// ---------------------------------------------------------------------------
// 6. copyNote
// ---------------------------------------------------------------------------

/**
 * Duplicate a note. Creates a new note with the same content, tags, folder,
 * and label + " (Copy)". Opens the copy in a new tab.
 */
export const copyNote = createAsyncThunk<Note, string>(
  "notes/copyNote",
  async (noteId, { dispatch, getState }) => {
    const state = getState() as RootState;
    const record = state.notes.notes[noteId] as NoteRecord | undefined;
    const userId = getUserId(getState);

    if (!record) throw new Error("Note not found in state");

    const copyLabel =
      record.label.toLowerCase() === "new note"
        ? "New Note"
        : `${record.label} (Copy)`;

    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: userId,
        label: copyLabel,
        content: record.content,
        folder_name: record.folder_name,
        tags: record.tags ?? [],
        metadata: {},
        position: 0,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error("Failed to copy note");

    const note = data as Note;

    dispatch(
      upsertNoteFromServer({
        note,
        fetchStatus: "full",
      }),
    );

    dispatch(addTab(note.id));
    dispatch(setActiveNote(note.id));

    return note;
  },
);

// ---------------------------------------------------------------------------
// 7. findOrCreateEmptyNote
// ---------------------------------------------------------------------------

/**
 * Find an existing empty "New Note" in the given folder, or create one.
 * Returns the note and sets it active.
 */
export const findOrCreateEmptyNote = createAsyncThunk<
  Note,
  string | undefined
>(
  "notes/findOrCreateEmptyNote",
  async (folder = "Draft", { dispatch, getState }) => {
    const state = getState() as RootState;
    const allNotes = state.notes.notes;

    // Check state for existing "New Note" with empty content in the folder
    for (const record of Object.values(allNotes)) {
      if (
        record.label === "New Note" &&
        (!record.content || record.content.trim() === "") &&
        record.folder_name === folder &&
        !record.is_deleted
      ) {
        dispatch(addTab(record.id));
        dispatch(setActiveNote(record.id));
        return record as Note;
      }
    }

    // No existing empty note found — create one
    const result = await dispatch(
      createNewNote({ folder_name: folder }),
    ).unwrap();

    return result;
  },
);

// ---------------------------------------------------------------------------
// 8. moveNoteToFolder
// ---------------------------------------------------------------------------

/**
 * Move a note to a different folder. Optimistically updates state,
 * then schedules a save.
 */
export const moveNoteToFolder = createAsyncThunk<
  void,
  { noteId: string; folder: string }
>(
  "notes/moveNoteToFolder",
  async ({ noteId, folder }, { dispatch }) => {
    dispatch(
      setNoteField({
        id: noteId,
        field: "folder_name",
        value: folder,
      }),
    );

    await dispatch(saveNote(noteId)).unwrap();
  },
);

// ---------------------------------------------------------------------------
// 9. saveNoteField
// ---------------------------------------------------------------------------

/**
 * Quick single-field save with optimistic update.
 * Dispatches setNoteField (updates undo + state), then schedules saveNote.
 */
export const saveNoteField = createAsyncThunk<
  void,
  { noteId: string; field: "content" | "label" | "folder_name" | "tags"; value: Note["content"] | Note["label"] | Note["folder_name"] | Note["tags"] }
>(
  "notes/saveNoteField",
  async ({ noteId, field, value }, { dispatch }) => {
    dispatch(
      setNoteField({
        id: noteId,
        field,
        value,
      }),
    );

    await dispatch(saveNote(noteId)).unwrap();
  },
);
