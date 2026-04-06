"use client";

// useNotesRedux — Drop-in replacement for useNotesContext().
// Returns the same API shape so consumer migration is a 2-line import swap.
// Backed by the notes Redux slice instead of React Context.

import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import type { Note, CreateNoteInput, UpdateNoteInput } from "../types";
import {
  setActiveNote as setActiveNoteAction,
  addTab,
  removeTab,
  reorderTabs as reorderTabsAction,
  resetNotesState,
  setNoteField,
} from "../redux/slice";
import {
  selectAllNotesList,
  selectActiveNote,
  selectOpenTabs,
  selectNotesListStatus,
  selectActiveNoteId,
} from "../redux/selectors";
import {
  fetchNotesList,
  fetchNoteContent,
  saveNote,
  createNewNote,
  deleteNote as deleteNoteThunk,
  copyNote as copyNoteThunk,
  findOrCreateEmptyNote as findOrCreateEmptyNoteThunk,
  saveNoteField,
} from "../redux/thunks";

/**
 * Drop-in replacement for useNotesContext().
 * Returns the identical API so consumer components need only change their import.
 */
export function useNotesRedux() {
  const dispatch = useAppDispatch();
  const notes = useAppSelector(selectAllNotesList);
  const activeNoteRecord = useAppSelector(selectActiveNote);
  const activeNoteId = useAppSelector(selectActiveNoteId);
  const openTabs = useAppSelector(selectOpenTabs);
  const listStatus = useAppSelector(selectNotesListStatus);

  const isLoading = listStatus === "loading" || listStatus === "idle";
  const error = listStatus === "error" ? new Error("Failed to load notes") : null;

  // Convert NoteRecord → Note (strip internal _ fields) for API compatibility
  const activeNote: Note | null = activeNoteRecord
    ? {
        id: activeNoteRecord.id,
        user_id: activeNoteRecord.user_id,
        label: activeNoteRecord.label,
        content: activeNoteRecord.content,
        folder_name: activeNoteRecord.folder_name,
        tags: activeNoteRecord.tags,
        metadata: activeNoteRecord.metadata,
        shared_with: activeNoteRecord.shared_with,
        is_deleted: activeNoteRecord.is_deleted,
        position: activeNoteRecord.position,
        created_at: activeNoteRecord.created_at,
        updated_at: activeNoteRecord.updated_at,
      }
    : null;

  // Fetch notes list on first use (if not already loaded)
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (!fetchedRef.current && listStatus === "idle") {
      fetchedRef.current = true;
      dispatch(fetchNotesList());
    }
  }, [dispatch, listStatus]);

  const setActiveNote = useCallback(
    (note: Note | null) => {
      dispatch(setActiveNoteAction(note?.id ?? null));
      if (note?.id) {
        // Fetch full content if we only have list data
        dispatch(fetchNoteContent(note.id));
      }
    },
    [dispatch],
  );

  const setActiveNoteDirty = useCallback(
    (_dirty: boolean) => {
      // In Redux, dirty state is tracked automatically by setNoteField.
      // This is a no-op for API compatibility.
    },
    [],
  );

  const createNote = useCallback(
    async (input: CreateNoteInput): Promise<Note> => {
      const result = await dispatch(createNewNote(input)).unwrap();
      return result;
    },
    [dispatch],
  );

  const updateNote = useCallback(
    async (id: string, updates: UpdateNoteInput): Promise<Note> => {
      // Apply each field update through Redux (triggers undo tracking)
      if (updates.content !== undefined) {
        dispatch(setNoteField({ id, field: "content", value: updates.content }));
      }
      if (updates.label !== undefined) {
        dispatch(setNoteField({ id, field: "label", value: updates.label }));
      }
      if (updates.folder_name !== undefined) {
        dispatch(setNoteField({ id, field: "folder_name", value: updates.folder_name }));
      }
      if (updates.tags !== undefined) {
        dispatch(setNoteField({ id, field: "tags", value: updates.tags }));
      }

      // Schedule save
      await dispatch(saveNote(id)).unwrap();

      // Return current note state (approximate — the real note is in Redux)
      const note = notes.find((n) => n.id === id);
      return note ? { ...note, ...updates } : ({ id, ...updates } as Note);
    },
    [dispatch, notes],
  );

  const deleteNoteFn = useCallback(
    async (id: string): Promise<void> => {
      await dispatch(deleteNoteThunk(id)).unwrap();
    },
    [dispatch],
  );

  const copyNoteFn = useCallback(
    async (id: string): Promise<Note> => {
      return await dispatch(copyNoteThunk(id)).unwrap();
    },
    [dispatch],
  );

  const refreshNotes = useCallback(async (): Promise<void> => {
    await dispatch(fetchNotesList()).unwrap();
  }, [dispatch]);

  const findOrCreateEmptyNote = useCallback(
    async (folderName?: string): Promise<Note> => {
      return await dispatch(
        findOrCreateEmptyNoteThunk(folderName ?? "Draft"),
      ).unwrap();
    },
    [dispatch],
  );

  const openNoteInTab = useCallback(
    (noteId: string) => {
      dispatch(addTab(noteId));
      dispatch(fetchNoteContent(noteId));
    },
    [dispatch],
  );

  const closeTab = useCallback(
    (noteId: string) => {
      dispatch(removeTab(noteId));
    },
    [dispatch],
  );

  const closeAllTabs = useCallback(() => {
    openTabs.forEach((id) => dispatch(removeTab(id)));
  }, [dispatch, openTabs]);

  const reorderTabs = useCallback(
    (newOrder: string[]) => {
      dispatch(reorderTabsAction(newOrder));
    },
    [dispatch],
  );

  return {
    notes,
    isLoading,
    error,
    activeNote,
    setActiveNote,
    setActiveNoteDirty,
    createNote,
    updateNote,
    deleteNote: deleteNoteFn,
    copyNote: copyNoteFn,
    refreshNotes,
    findOrCreateEmptyNote,
    openTabs,
    openNoteInTab,
    closeTab,
    closeAllTabs,
    reorderTabs,
  };
}
